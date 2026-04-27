import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  INITIAL_DATA,
  clearAllStorage,
  loadInitialState,
  loadUsersDirectory,
  persistState,
  persistUsersDirectory,
} from "../storage/storage";
import { buildHabitColorMap } from "../utils/habitColors";

const AppContext = createContext(undefined);

const ACTIONS = {
  HYDRATE_STATE: "HYDRATE_STATE",
  SET_PROFILE: "SET_PROFILE",
  SET_DAILY_JOURNALS: "SET_DAILY_JOURNALS",
  ADD_DAILY_JOURNAL: "ADD_DAILY_JOURNAL",
  ADD_WEEKLY_REPORT: "ADD_WEEKLY_REPORT",
  ADD_INDIVIDUAL_ENTRY: "ADD_INDIVIDUAL_ENTRY",
  UPDATE_HABITS: "UPDATE_HABITS",
  UPDATE_FRIENDS: "UPDATE_FRIENDS",
  RESET_STATE: "RESET_STATE",
};

const normalizeUserRecord = (user) => ({
  ...user,
  habitsList: user.habitsList || [],
  habitColors: buildHabitColorMap(
    user.habitsList || [],
    user.habitColors || {},
  ),
  friendsList: user.friendsList || [],
  incomingFriendRequests: user.incomingFriendRequests || [],
  outgoingFriendRequests: user.outgoingFriendRequests || [],
});

const clampMood = (value) => Math.max(1, Math.min(7, value));

const createSeededRandom = (seed) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const shuffle = (array, randomFn) => {
  const copy = [...array];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const pickFrom = (items, randomFn) =>
  items[Math.floor(randomFn() * items.length)];

const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.HYDRATE_STATE:
      return { ...state, ...action.payload };
    case ACTIONS.SET_PROFILE:
      return {
        ...state,
        userProfile: action.payload,
      };
    case ACTIONS.SET_DAILY_JOURNALS:
      return {
        ...state,
        dailyJournals: action.payload,
      };
    case ACTIONS.ADD_DAILY_JOURNAL:
      return {
        ...state,
        dailyJournals: [action.payload, ...state.dailyJournals],
      };
    case ACTIONS.ADD_WEEKLY_REPORT:
      return {
        ...state,
        weeklyReports: [action.payload, ...state.weeklyReports],
      };
    case ACTIONS.ADD_INDIVIDUAL_ENTRY:
      return {
        ...state,
        individualEntries: [action.payload, ...state.individualEntries],
      };
    case ACTIONS.UPDATE_HABITS: {
      const payload = Array.isArray(action.payload)
        ? {
            habitsList: action.payload,
            habitColors: buildHabitColorMap(
              action.payload,
              state.userProfile.habitColors || {},
            ),
          }
        : action.payload;

      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          habitsList: payload.habitsList,
          habitColors: payload.habitColors,
        },
      };
    }
    case ACTIONS.UPDATE_FRIENDS:
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          friendsList: action.payload,
        },
      };
    case ACTIONS.RESET_STATE:
      return INITIAL_DATA;
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_DATA);
  const [isHydrated, setIsHydrated] = useState(false);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [friendRequests, setFriendRequests] = useState({
    incoming: [],
    outgoing: [],
  });
  const [auth, setAuth] = useState({
    hasAccount: false,
    isAuthenticated: false,
    currentUsername: null,
  });

  const syncCurrentUserView = (directory, currentUsername) => {
    if (!currentUsername) return;

    const currentUser = directory.find(
      (user) => user.username === currentUsername,
    );
    if (!currentUser) return;

    dispatch({
      type: ACTIONS.SET_PROFILE,
      payload: {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        username: currentUser.username,
        habitsList: currentUser.habitsList,
        habitColors: buildHabitColorMap(
          currentUser.habitsList,
          currentUser.habitColors,
        ),
        friendsList: currentUser.friendsList,
      },
    });

    setFriendRequests({
      incoming: currentUser.incomingFriendRequests,
      outgoing: currentUser.outgoingFriendRequests,
    });
  };

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const [loadedState, loadedUsersDirectory] = await Promise.all([
        loadInitialState(),
        loadUsersDirectory(),
      ]);
      if (!isMounted) return;

      const normalizedDirectory = loadedUsersDirectory.map(normalizeUserRecord);
      const normalizedProfile = {
        ...loadedState.userProfile,
        habitColors: buildHabitColorMap(
          loadedState.userProfile?.habitsList || [],
          loadedState.userProfile?.habitColors || {},
        ),
      };

      dispatch({
        type: ACTIONS.HYDRATE_STATE,
        payload: { ...loadedState, userProfile: normalizedProfile },
      });
      setUsersDirectory(normalizedDirectory);
      setAuth({
        hasAccount: normalizedDirectory.length > 0,
        isAuthenticated: false,
        currentUsername: null,
      });
      setIsHydrated(true);

      if (normalizedDirectory.length !== loadedUsersDirectory.length) {
        await persistUsersDirectory(normalizedDirectory);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    persistState(state);
  }, [isHydrated, state]);

  const publicUsers = useMemo(
    () =>
      usersDirectory.map((user) => ({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      })),
    [usersDirectory],
  );

  const searchUsers = ({ query, excludeUsernames = [] }) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const excludeSet = new Set(
      excludeUsernames.map((name) => name.toLowerCase()),
    );

    return publicUsers
      .filter((user) => {
        if (excludeSet.has(user.username)) return false;

        const first = user.firstName.toLowerCase();
        const last = user.lastName.toLowerCase();
        const username = user.username.toLowerCase();

        return (
          first.includes(normalizedQuery) ||
          last.includes(normalizedQuery) ||
          username.includes(normalizedQuery)
        );
      })
      .slice(0, 8);
  };

  const updateCurrentUserInDirectory = async (partialProfile) => {
    const currentUsername = auth.currentUsername;
    if (!currentUsername) return;

    const nextUsersDirectory = usersDirectory.map((user) =>
      user.username === currentUsername ? { ...user, ...partialProfile } : user,
    );

    setUsersDirectory(nextUsersDirectory);
    await persistUsersDirectory(nextUsersDirectory);
  };

  const actions = useMemo(
    () => ({
      addDailyJournal: (payload) => {
        const username = auth.currentUsername || state.userProfile.username;
        dispatch({
          type: ACTIONS.ADD_DAILY_JOURNAL,
          payload: { ...payload, username },
        });
      },
      addWeeklyReport: (payload) =>
        dispatch({ type: ACTIONS.ADD_WEEKLY_REPORT, payload }),
      addIndividualEntry: (payload) =>
        dispatch({ type: ACTIONS.ADD_INDIVIDUAL_ENTRY, payload }),
      updateHabits: async (payload) => {
        const habitColors = buildHabitColorMap(
          payload,
          state.userProfile.habitColors || {},
        );

        dispatch({
          type: ACTIONS.UPDATE_HABITS,
          payload: { habitsList: payload, habitColors },
        });
        await updateCurrentUserInDirectory({
          habitsList: payload,
          habitColors,
        });
      },
      updateFriends: async (payload) => {
        const currentUsername = auth.currentUsername;
        const previousFriends = state.userProfile.friendsList;
        const removedFriends = previousFriends.filter(
          (friend) => !payload.includes(friend),
        );

        let nextUsersDirectory = usersDirectory.map((user) => {
          if (user.username === currentUsername) {
            return { ...user, friendsList: payload };
          }

          if (removedFriends.includes(user.username)) {
            return {
              ...user,
              friendsList: user.friendsList.filter(
                (friend) => friend !== currentUsername,
              ),
            };
          }

          return user;
        });

        setUsersDirectory(nextUsersDirectory);
        await persistUsersDirectory(nextUsersDirectory);
        dispatch({ type: ACTIONS.UPDATE_FRIENDS, payload });
      },
      addFriendByUsername: async (friendUsernameInput) => {
        const friendUsername = friendUsernameInput.trim().toLowerCase();
        const currentUsername = state.userProfile.username;

        if (!friendUsername) {
          return { ok: false, error: "Enter a username." };
        }

        if (friendUsername === currentUsername) {
          return { ok: false, error: "You cannot add yourself as a friend." };
        }

        const currentUser = usersDirectory.find(
          (user) => user.username === currentUsername,
        );
        const friendUser = usersDirectory.find(
          (user) => user.username === friendUsername,
        );

        if (!friendUser) {
          return {
            ok: false,
            error: "That user does not exist in WYD yet.",
          };
        }

        if (currentUser?.friendsList.includes(friendUsername)) {
          return { ok: false, error: "You are already friends." };
        }

        if (currentUser?.outgoingFriendRequests.includes(friendUsername)) {
          return { ok: false, error: "Friend request already sent." };
        }

        if (currentUser?.incomingFriendRequests.includes(friendUsername)) {
          return {
            ok: false,
            error: "This user already requested you. Approve it below.",
          };
        }

        const nextUsersDirectory = usersDirectory.map((user) => {
          if (user.username === currentUsername) {
            return {
              ...user,
              outgoingFriendRequests: [
                ...user.outgoingFriendRequests,
                friendUsername,
              ],
            };
          }

          if (user.username === friendUsername) {
            return {
              ...user,
              incomingFriendRequests: [
                ...user.incomingFriendRequests,
                currentUsername,
              ],
            };
          }

          return user;
        });

        setUsersDirectory(nextUsersDirectory);
        await persistUsersDirectory(nextUsersDirectory);
        syncCurrentUserView(nextUsersDirectory, currentUsername);
        return { ok: true };
      },
      approveFriendRequest: async (requesterUsername) => {
        const currentUsername = state.userProfile.username;
        const requester = requesterUsername.trim().toLowerCase();

        const nextUsersDirectory = usersDirectory.map((user) => {
          if (user.username === currentUsername) {
            return {
              ...user,
              incomingFriendRequests: user.incomingFriendRequests.filter(
                (name) => name !== requester,
              ),
              friendsList: user.friendsList.includes(requester)
                ? user.friendsList
                : [...user.friendsList, requester],
            };
          }

          if (user.username === requester) {
            return {
              ...user,
              outgoingFriendRequests: user.outgoingFriendRequests.filter(
                (name) => name !== currentUsername,
              ),
              friendsList: user.friendsList.includes(currentUsername)
                ? user.friendsList
                : [...user.friendsList, currentUsername],
            };
          }

          return user;
        });

        setUsersDirectory(nextUsersDirectory);
        await persistUsersDirectory(nextUsersDirectory);
        syncCurrentUserView(nextUsersDirectory, currentUsername);
        return { ok: true };
      },
      declineFriendRequest: async (requesterUsername) => {
        const currentUsername = state.userProfile.username;
        const requester = requesterUsername.trim().toLowerCase();

        const nextUsersDirectory = usersDirectory.map((user) => {
          if (user.username === currentUsername) {
            return {
              ...user,
              incomingFriendRequests: user.incomingFriendRequests.filter(
                (name) => name !== requester,
              ),
            };
          }

          if (user.username === requester) {
            return {
              ...user,
              outgoingFriendRequests: user.outgoingFriendRequests.filter(
                (name) => name !== currentUsername,
              ),
            };
          }

          return user;
        });

        setUsersDirectory(nextUsersDirectory);
        await persistUsersDirectory(nextUsersDirectory);
        syncCurrentUserView(nextUsersDirectory, currentUsername);
        return { ok: true };
      },
      clearAppData: async () => {
        await clearAllStorage();
        dispatch({ type: ACTIONS.RESET_STATE });
        setUsersDirectory([]);
        setFriendRequests({ incoming: [], outgoing: [] });
        setAuth({
          hasAccount: false,
          isAuthenticated: false,
          currentUsername: null,
        });
      },
      signUp: async ({
        firstName,
        lastName,
        username,
        password,
        habitsList,
        friendsList,
      }) => {
        const normalizedUsername = username.trim().toLowerCase();
        const normalizedPassword = password.trim();
        const normalizedFirstName = firstName.trim();
        const normalizedLastName = lastName.trim();
        const normalizedHabits = [
          ...new Set(habitsList.map((item) => item.trim()).filter(Boolean)),
        ];
        const normalizedFriends = [
          ...new Set(
            friendsList
              .map((item) => item.trim().toLowerCase())
              .filter(Boolean),
          ),
        ];

        if (
          !normalizedFirstName ||
          !normalizedLastName ||
          !normalizedUsername ||
          !normalizedPassword
        ) {
          return { ok: false, error: "Please complete all required fields." };
        }

        if (
          usersDirectory.some((user) => user.username === normalizedUsername)
        ) {
          return {
            ok: false,
            error: "Username already exists. Please choose another one.",
          };
        }

        if (normalizedFriends.includes(normalizedUsername)) {
          return { ok: false, error: "You cannot add yourself as a friend." };
        }

        const existingUsernames = new Set(
          usersDirectory.map((user) => user.username),
        );
        const missingFriends = normalizedFriends.filter(
          (friendUsername) => !existingUsernames.has(friendUsername),
        );

        if (missingFriends.length > 0) {
          return {
            ok: false,
            error: `These users do not exist yet: ${missingFriends.join(", ")}.`,
          };
        }

        const newUser = normalizeUserRecord({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          username: normalizedUsername,
          password: normalizedPassword,
          habitsList: normalizedHabits,
          friendsList: [],
          incomingFriendRequests: [],
          outgoingFriendRequests: normalizedFriends,
        });

        const nextUsersDirectory = [...usersDirectory, newUser].map((user) => {
          if (normalizedFriends.includes(user.username)) {
            return {
              ...user,
              incomingFriendRequests: [
                ...new Set([
                  ...user.incomingFriendRequests,
                  normalizedUsername,
                ]),
              ],
            };
          }

          return user;
        });

        await persistUsersDirectory(nextUsersDirectory);
        setUsersDirectory(nextUsersDirectory);

        dispatch({
          type: ACTIONS.SET_PROFILE,
          payload: {
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            username: normalizedUsername,
            habitsList: normalizedHabits,
            habitColors: buildHabitColorMap(normalizedHabits),
            friendsList: [],
          },
        });

        setFriendRequests({
          incoming: [],
          outgoing: normalizedFriends,
        });

        setAuth({
          hasAccount: true,
          isAuthenticated: true,
          currentUsername: normalizedUsername,
        });
        return { ok: true };
      },
      signIn: async ({ username, password }) => {
        const normalizedUsername = username.trim().toLowerCase();
        const normalizedPassword = password.trim();

        if (usersDirectory.length === 0) {
          return {
            ok: false,
            error: "No account found. Please sign up first.",
          };
        }

        const matchedUser = usersDirectory.find(
          (user) =>
            user.username === normalizedUsername &&
            user.password === normalizedPassword,
        );

        if (!matchedUser) {
          return { ok: false, error: "Invalid username or password." };
        }

        syncCurrentUserView(usersDirectory, matchedUser.username);

        setAuth({
          hasAccount: true,
          isAuthenticated: true,
          currentUsername: matchedUser.username,
        });
        return { ok: true };
      },
      signOut: () => {
        setAuth((prev) => ({
          ...prev,
          isAuthenticated: false,
          currentUsername: null,
        }));
        setFriendRequests({ incoming: [], outgoing: [] });
      },
      seedTest3ChartData: async () => {
        const targetUsername = "test3";
        const targetUser = usersDirectory.find(
          (user) => user.username === targetUsername,
        );

        if (!targetUser) {
          return {
            ok: false,
            error: "User test3 does not exist. Create/sign up test3 first.",
          };
        }

        const random = createSeededRandom(3007);
        const now = new Date();
        const candidateOffsets = [...Array(120)].map((_, index) => index);
        const selectedOffsets = shuffle(candidateOffsets, random)
          .slice(0, 100)
          .sort((a, b) => a - b);

        const highlightOptions = [
          "Wrapped up a feature branch and felt focused.",
          "Had a good workout after work.",
          "Cooked dinner and called a friend.",
          "Made progress on a long pending task.",
          "Went on a long walk and cleared my head.",
        ];
        const smileOptions = [
          "A friend sent a hilarious meme.",
          "Barista remembered my order.",
          "Saw a dog doing zoomies in the park.",
          "Finished chores earlier than expected.",
          "Found an old photo that made me laugh.",
        ];
        const gratefulOptions = [
          "Good health and energy.",
          "Supportive people around me.",
          "Time to rest in the evening.",
          "A calm morning with coffee.",
          "Steady progress, even if small.",
        ];
        const proudOptions = [
          "Stayed consistent with habits.",
          "Handled stress better than usual.",
          "Finished what I planned for the day.",
          "Reached out and checked in on someone.",
          "Showed up even when motivation was low.",
        ];

        const baseHabits =
          targetUser.habitsList.length > 0
            ? targetUser.habitsList
            : ["Read", "Workout", "Hydrate", "Meditate", "Walk"];
        const baseHabitColors = buildHabitColorMap(
          baseHabits,
          targetUser.habitColors || {},
        );

        const generatedEntries = selectedOffsets.map((offset, index) => {
          const date = new Date(now);
          date.setHours(20, 0, 0, 0);
          date.setDate(now.getDate() - offset);

          const seasonalWave = Math.sin(index / 9) * 1.2;
          const randomDrift = (random() - 0.5) * 2.4;
          const mood = clampMood(Math.round(4 + seasonalWave + randomDrift));
          const completionRate = Math.max(
            0.2,
            Math.min(0.95, mood / 7 + random() * 0.25),
          );
          const habits = baseHabits.filter(() => random() < completionRate);

          return {
            username: targetUsername,
            mood,
            highlight: pickFrom(highlightOptions, random),
            smile: pickFrom(smileOptions, random),
            grateful: pickFrom(gratefulOptions, random),
            proudestMoment: pickFrom(proudOptions, random),
            habits,
            public: random() > 0.28,
            date: date.toISOString(),
          };
        });

        const nonTest3Entries = state.dailyJournals.filter(
          (entry) => entry.username !== targetUsername,
        );

        const nextDailyJournals = [
          ...generatedEntries,
          ...nonTest3Entries,
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        dispatch({
          type: ACTIONS.SET_DAILY_JOURNALS,
          payload: nextDailyJournals,
        });

        const shouldSyncUserRecord =
          targetUser.habitsList.length === 0 ||
          Object.keys(targetUser.habitColors || {}).length !==
            baseHabits.length;

        let nextUsersDirectory = usersDirectory;
        if (shouldSyncUserRecord) {
          nextUsersDirectory = usersDirectory.map((user) =>
            user.username === targetUsername
              ? {
                  ...user,
                  habitsList: baseHabits,
                  habitColors: baseHabitColors,
                }
              : user,
          );

          setUsersDirectory(nextUsersDirectory);
          await persistUsersDirectory(nextUsersDirectory);
        }

        if (auth.currentUsername === targetUsername) {
          dispatch({
            type: ACTIONS.SET_PROFILE,
            payload: {
              firstName: targetUser.firstName,
              lastName: targetUser.lastName,
              username: targetUser.username,
              habitsList: baseHabits,
              habitColors: baseHabitColors,
              friendsList: targetUser.friendsList,
            },
          });
        }

        return {
          ok: true,
          count: generatedEntries.length,
          daysWindow: 120,
          skippedDays: 20,
        };
      },
    }),
    [
      auth.currentUsername,
      state.dailyJournals,
      state.userProfile.friendsList,
      state.userProfile.habitColors,
      state.userProfile.username,
      usersDirectory,
    ],
  );

  const value = useMemo(
    () => ({
      state,
      isHydrated,
      auth,
      friendRequests,
      existingUsernames: usersDirectory.map((user) => user.username),
      searchUsers,
      ...actions,
    }),
    [actions, auth, friendRequests, isHydrated, state, usersDirectory],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
