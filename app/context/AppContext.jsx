import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  getCurrentUser,
  onAuthStateChange,
  authSignUp,
  authSignIn,
  authSignOut,
  isValidHandle,
} from "../storage/supabaseClient";
import * as DB from "../storage/supabaseService";
import { buildHabitColorMap } from "../utils/habitColors";

const AppContext = createContext(undefined);

const ACTIONS = {
  HYDRATE_STATE: "HYDRATE_STATE",
  SET_PROFILE: "SET_PROFILE",
  SET_DAILY_JOURNALS: "SET_DAILY_JOURNALS",
  ADD_DAILY_JOURNAL: "ADD_DAILY_JOURNAL",
  ADD_WEEKLY_REPORT: "ADD_WEEKLY_REPORT",
  ADD_INDIVIDUAL_ENTRY: "ADD_INDIVIDUAL_ENTRY",
  SET_INDIVIDUAL_ENTRIES: "SET_INDIVIDUAL_ENTRIES",
  UPDATE_HABITS: "UPDATE_HABITS",
  UPDATE_FRIENDS: "UPDATE_FRIENDS",
  UPDATE_DAILY_JOURNAL: "UPDATE_DAILY_JOURNAL",
  DELETE_DAILY_JOURNAL: "DELETE_DAILY_JOURNAL",
  UPDATE_WEEKLY_REPORT: "UPDATE_WEEKLY_REPORT",
  DELETE_WEEKLY_REPORT: "DELETE_WEEKLY_REPORT",
  RESET_STATE: "RESET_STATE",
};

const INITIAL_DATA = {
  userProfile: {
    id: null,
    email: "",
    handle: "",
    firstName: "",
    lastName: "",
    avatarUrl: null,
    habitsList: [],
    habitColors: {},
    friendsList: [],
    friendProfiles: [],
  },
  dailyJournals: [],
  weeklyReports: [],
  individualEntries: [],
  feedPosts: [],
};

const clampMood = (value) => Math.max(1, Math.min(7, value));

const toFeedProfile = (profile) => {
  if (Array.isArray(profile)) return profile[0] || null;
  return profile || null;
};

const buildFeedPost = (entry, kind, likedByCurrentUser = false) => {
  const profile = toFeedProfile(entry.profiles);
  const date =
    entry.entry_date || entry.week_start || entry.date || entry.created_at;

  const likeCount = Array.isArray(entry.daily_journal_likes)
    ? Number(entry.daily_journal_likes[0]?.count) || 0
    : Array.isArray(entry.weekly_report_likes)
      ? Number(entry.weekly_report_likes[0]?.count) || 0
      : 0;
  const commentCount = Array.isArray(entry.daily_journal_comments)
    ? Number(entry.daily_journal_comments[0]?.count) || 0
    : Array.isArray(entry.weekly_report_comments)
      ? Number(entry.weekly_report_comments[0]?.count) || 0
      : 0;

  return {
    id: entry.id,
    kind,
    author: profile?.handle || entry.handle || entry.username || "Friend",
    authorProfile: profile || null,
    mood: kind === "daily" ? entry.mood : undefined,
    highlight: entry.highlight,
    smile: entry.smile,
    grateful: entry.grateful,
    proudestMoment: entry.proudestMoment || entry.proudest_moment,
    habits: entry.habits || [],
    read: entry.read,
    eat: entry.eat,
    play: entry.play,
    obsess: entry.obsess,
    recommend: entry.recommend,
    treat: entry.treat,
    date,
    public: entry.is_public ?? entry.public ?? true,
    likeCount,
    commentCount,
    likedByCurrentUser,
    likes: [],
    comments: [],
  };
};

const normalizeDailyJournal = (entry, profileHandle) => {
  const date = entry.entry_date || entry.date || entry.created_at;
  return {
    ...entry,
    date,
    username: entry.username || entry.handle || profileHandle || null,
    proudestMoment: entry.proudestMoment || entry.proudest_moment || "",
    public: entry.is_public ?? entry.public ?? true,
    habits: entry.habits || [],
  };
};

const normalizeWeeklyReport = (entry, profileHandle) => {
  const date = entry.week_start || entry.date || entry.created_at;
  return {
    ...entry,
    date,
    username: entry.username || entry.handle || profileHandle || null,
    public: entry.is_public ?? entry.public ?? true,
  };
};

const normalizeIndividualEntry = (entry, profileHandle) => ({
  ...entry,
  type: entry.type || entry.entry_type || "",
  entry_type: entry.entry_type || entry.type || "",
  date: entry.entry_date || entry.date || entry.created_at,
  username: entry.username || entry.handle || profileHandle || null,
});

const normalizeHabitNames = (habits) =>
  (Array.isArray(habits) ? habits : [])
    .map((habit) => (typeof habit === "string" ? habit : habit?.name))
    .filter(Boolean);

const hydrateDailyJournalsWithHabits = async (journals, profileHandle) => {
  const hydratedJournals = await Promise.all(
    (journals || []).map(async (journal) => {
      try {
        const journalHabits = await DB.getJournalHabits(journal.id);
        return normalizeDailyJournal(
          { ...journal, habits: normalizeHabitNames(journalHabits) },
          profileHandle,
        );
      } catch (error) {
        console.error("Error loading journal habits:", error);
        return normalizeDailyJournal(journal, profileHandle);
      }
    }),
  );

  return hydratedJournals;
};

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
    case ACTIONS.SET_INDIVIDUAL_ENTRIES:
      return {
        ...state,
        individualEntries: action.payload,
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
    case ACTIONS.UPDATE_DAILY_JOURNAL: {
      const { id, updates } = action.payload;
      return {
        ...state,
        dailyJournals: state.dailyJournals.map((journal) =>
          journal.id === id ? { ...journal, ...updates } : journal,
        ),
      };
    }
    case ACTIONS.DELETE_DAILY_JOURNAL: {
      const { id } = action.payload;
      return {
        ...state,
        dailyJournals: state.dailyJournals.filter(
          (journal) => journal.id !== id,
        ),
      };
    }
    case ACTIONS.UPDATE_WEEKLY_REPORT: {
      const { id, updates } = action.payload;
      return {
        ...state,
        weeklyReports: state.weeklyReports.map((report) =>
          report.id === id ? { ...report, ...updates } : report,
        ),
      };
    }
    case ACTIONS.DELETE_WEEKLY_REPORT: {
      const { id } = action.payload;
      return {
        ...state,
        weeklyReports: state.weeklyReports.filter((report) => report.id !== id),
      };
    }
    case ACTIONS.RESET_STATE:
      return INITIAL_DATA;
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_DATA);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [publicUsers, setPublicUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState({
    incoming: [],
    outgoing: [],
  });
  const [auth, setAuth] = useState({
    user: null,
    isAuthenticated: false,
    hasAccount: false,
    currentUsername: null,
  });

  const resolveDailyJournalId = (journalKey) => {
    if (!journalKey) return journalKey;

    const journal = state.dailyJournals.find(
      (entry) =>
        entry.id === journalKey ||
        entry.entry_date === journalKey ||
        entry.date === journalKey,
    );

    return journal?.id || journalKey;
  };

  const resolveWeeklyReportId = (reportKey) => {
    if (!reportKey) return reportKey;

    const report = state.weeklyReports.find(
      (entry) =>
        entry.id === reportKey ||
        entry.week_start === reportKey ||
        entry.date === reportKey,
    );

    return report?.id || reportKey;
  };

  const loadFeedPosts = async (userId) => {
    try {
      const [dailyFeed, weeklyFeed, likedDailyIds, likedWeeklyIds] =
        await Promise.all([
          DB.getFriendsFeedJournals(userId),
          DB.getFriendsFeedReports(userId),
          DB.getUserDailyJournalLikeIds(userId),
          DB.getUserWeeklyReportLikeIds(userId),
        ]);

      const likedDailySet = new Set(likedDailyIds);
      const likedWeeklySet = new Set(likedWeeklyIds);

      return [
        ...dailyFeed.map((entry) =>
          buildFeedPost(entry, "daily", likedDailySet.has(entry.id)),
        ),
        ...weeklyFeed.map((entry) =>
          buildFeedPost(entry, "weekly", likedWeeklySet.has(entry.id)),
        ),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error("Error loading feed posts:", error);
      return [];
    }
  };

  const refreshFeedPosts = async (userId) => {
    const feedPosts = await loadFeedPosts(userId);
    dispatch({
      type: ACTIONS.HYDRATE_STATE,
      payload: { feedPosts },
    });
    return feedPosts;
  };

  const refreshFriendRequests = async (userId) => {
    try {
      const [incomingRequests, outgoingRequests] = await Promise.all([
        DB.getIncomingFriendRequests(userId),
        DB.getOutgoingFriendRequests(userId),
      ]);
      setFriendRequests({
        incoming: incomingRequests,
        outgoing: outgoingRequests,
      });
    } catch (error) {
      console.error("Error refreshing friend requests:", error);
    }
  };

  // Monitor auth state changes and hydrate user data
  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        // Check if user is already logged in
        let currentUser = null;
        try {
          currentUser = await getCurrentUser();
        } catch (authError) {
          // No active session - user is not logged in
          currentUser = null;
        }
        const loadedUsers = await DB.listProfiles();

        if (!isMounted) return;

        setPublicUsers(
          loadedUsers.map((profile) => ({
            handle: profile.handle,
            firstName: profile.first_name,
            lastName: profile.last_name,
            username: profile.handle,
          })),
        );

        if (currentUser) {
          setAuth({
            user: currentUser,
            isAuthenticated: true,
            hasAccount: true,
            currentUsername: null,
          });

          // Fetch user profile, habits, journals
          try {
            const [
              profile,
              habits,
              journals,
              reports,
              entries,
              incomingRequests,
              outgoingRequests,
            ] = await Promise.all([
              DB.getProfile(currentUser.id),
              DB.getUserHabits(currentUser.id),
              DB.getUserDailyJournals(currentUser.id),
              DB.getUserWeeklyReports(currentUser.id),
              DB.getUserIndividualEntries(currentUser.id),
              DB.getIncomingFriendRequests(currentUser.id),
              DB.getOutgoingFriendRequests(currentUser.id),
            ]);

            if (!isMounted) return;

            // Get friends list
            const friends = await DB.getFriends(currentUser.id);
            const friendIds = friends.map((f) => f.id);

            const habitColors = buildHabitColorMap(
              habits.map((h) => h.name),
              {},
            );

            const hydratedJournals = await hydrateDailyJournalsWithHabits(
              journals,
              profile.handle,
            );

            dispatch({
              type: ACTIONS.HYDRATE_STATE,
              payload: {
                userProfile: {
                  id: currentUser.id,
                  email: profile.email,
                  handle: profile.handle,
                  username: profile.handle,
                  firstName: profile.first_name,
                  lastName: profile.last_name,
                  avatarUrl: profile.avatar_url,
                  habitsList: habits.map((h) => h.name),
                  habitColors,
                  friendsList: friendIds,
                  friendProfiles: friends,
                },
                dailyJournals: hydratedJournals,
                weeklyReports: reports.map((r) =>
                  normalizeWeeklyReport(r, profile.handle),
                ),
                individualEntries: entries.map((e) => ({
                  ...e,
                  date: e.entry_date || e.date || e.created_at,
                  username: e.username || e.handle || profile.handle,
                })),
                feedPosts: [],
              },
            });

            setFriendRequests({
              incoming: incomingRequests,
              outgoing: outgoingRequests,
            });

            void refreshFeedPosts(currentUser.id);
          } catch (error) {
            console.error("Error loading user data:", error);
          }
        } else {
          setAuth({
            user: null,
            isAuthenticated: false,
            hasAccount: loadedUsers.length > 0,
            currentUsername: null,
          });
        }

        setIsHydrated(true);
      } catch (error) {
        console.error("Error during hydration:", error);
        setIsHydrated(true);
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();

    // Subscribe to auth state changes
    const subscription = onAuthStateChange((user) => {
      if (isMounted) {
        if (user) {
          setAuth({
            user,
            isAuthenticated: true,
            hasAccount: true,
            currentUsername: null,
          });
          // Reload data when user changes
          hydrate();
        } else {
          setAuth({
            user: null,
            isAuthenticated: false,
            hasAccount: publicUsers.length > 0,
            currentUsername: null,
          });
          dispatch({ type: ACTIONS.RESET_STATE });
          setFriendRequests({ incoming: [], outgoing: [] });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const actions = useMemo(
    () => ({
      /**
       * ============================================
       * AUTHENTICATION ACTIONS
       * ============================================
       */
      signUp: async ({
        email,
        password,
        firstName,
        lastName,
        handle,
        habitsList = [],
        friendsList = [],
      }) => {
        try {
          if (!email || !password || !firstName || !lastName || !handle) {
            return { ok: false, error: "Please complete all required fields." };
          }

          if (!isValidHandle(handle)) {
            return {
              ok: false,
              error:
                "Handle must be 3-30 characters, containing only lowercase letters, numbers, and underscores.",
            };
          }

          // Check if handle is already taken
          const existingProfile = await DB.getProfileByHandle(handle);
          if (existingProfile) {
            return { ok: false, error: "This handle is already taken." };
          }

          // Sign up with Supabase Auth
          const signedUpUser = await authSignUp({
            email,
            password,
            firstName,
            lastName,
            handle: handle.toLowerCase(),
          });

          // Immediately sign in to ensure the client has an authenticated session
          // so subsequent DB writes (habits, friend requests) succeed under RLS.
          let user;
          try {
            user = await authSignIn({ email, password });
          } catch (signinErr) {
            // If sign-in fails, fall back to the signed up user object
            user = signedUpUser;
          }

          // Create habits if provided (now that client is signed in)
          let habitsList_processed = [];
          if (habitsList.length > 0) {
            habitsList_processed = await Promise.all(
              habitsList.map((habitName) =>
                DB.createHabit(user.id, { name: habitName.trim() }),
              ),
            );
          }

          setAuth({
            user,
            isAuthenticated: true,
            hasAccount: true,
            currentUsername: handle.toLowerCase(),
          });

          const habitColors = buildHabitColorMap(
            habitsList_processed.map((h) => h.name),
            {},
          );

          dispatch({
            type: ACTIONS.SET_PROFILE,
            payload: {
              id: user.id,
              email: user.email,
              handle: handle.toLowerCase(),
              username: handle.toLowerCase(),
              firstName,
              lastName,
              avatarUrl: null,
              habitsList: habitsList_processed.map((h) => h.name),
              habitColors,
              friendsList: [],
              friendProfiles: [],
            },
          });

          setFriendRequests({
            incoming: [],
            outgoing: [],
          });

          // Send friend requests if any were selected during signup
          if (friendsList.length > 0) {
            try {
              console.log("[signUp] Sending friend requests to:", friendsList);
              const outgoingRequests = await Promise.all(
                friendsList.map(async (friendHandle) => {
                  try {
                    // Look up the friend's user ID from their handle
                    const friendProfile =
                      await DB.getProfileByHandle(friendHandle);
                    if (!friendProfile) {
                      console.warn("[signUp] Friend not found:", friendHandle);
                      return null;
                    }
                    console.log(
                      "[signUp] Sending request to",
                      friendHandle,
                      "with ID",
                      friendProfile.id,
                    );
                    const request = await DB.sendFriendRequest(
                      user.id,
                      friendProfile.id,
                    );
                    console.log("[signUp] Friend request sent:", request);
                    return request;
                  } catch (error) {
                    console.error(
                      "[signUp] Error sending request to",
                      friendHandle,
                      ":",
                      error,
                    );
                    return null;
                  }
                }),
              );
              const validRequests = outgoingRequests.filter(Boolean);
              console.log(
                "[signUp] Total friend requests sent:",
                validRequests.length,
              );
              setFriendRequests({
                incoming: [],
                outgoing: validRequests,
              });
              // Refresh friend requests from DB to ensure real-time sync
              void refreshFriendRequests(user.id);
            } catch (error) {
              console.error(
                "[signUp] Error in friend requests process:",
                error,
              );
            }
          }

          void refreshFeedPosts(user.id);

          return { ok: true };
        } catch (error) {
          console.error("Sign up error:", error);
          return {
            ok: false,
            error: error.message || "Sign up failed. Please try again.",
          };
        }
      },

      signIn: async ({ email, password }) => {
        try {
          if (!email || !password) {
            return { ok: false, error: "Please enter email and password." };
          }

          const user = await authSignIn({ email, password });

          // Fetch user data
          const [
            profile,
            habits,
            journals,
            reports,
            entries,
            incomingRequests,
            outgoingRequests,
          ] = await Promise.all([
            DB.getProfile(user.id),
            DB.getUserHabits(user.id),
            DB.getUserDailyJournals(user.id),
            DB.getUserWeeklyReports(user.id),
            DB.getUserIndividualEntries(user.id),
            DB.getIncomingFriendRequests(user.id),
            DB.getOutgoingFriendRequests(user.id),
          ]);

          const friends = await DB.getFriends(user.id);
          const friendIds = friends.map((f) => f.id);

          const habitColors = buildHabitColorMap(
            habits.map((h) => h.name),
            {},
          );

          const hydratedJournals = await hydrateDailyJournalsWithHabits(
            journals,
            profile.handle,
          );

          dispatch({
            type: ACTIONS.HYDRATE_STATE,
            payload: {
              userProfile: {
                id: user.id,
                email: profile.email,
                handle: profile.handle,
                username: profile.handle,
                firstName: profile.first_name,
                lastName: profile.last_name,
                avatarUrl: profile.avatar_url,
                habitsList: habits.map((h) => h.name),
                habitColors,
                friendsList: friendIds,
                friendProfiles: friends,
              },
              dailyJournals: hydratedJournals,
              weeklyReports: reports.map((r) =>
                normalizeWeeklyReport(r, profile.handle),
              ),
              individualEntries: entries.map((e) =>
                normalizeIndividualEntry(e, profile.handle),
              ),
              feedPosts: [],
            },
          });

          setFriendRequests({
            incoming: incomingRequests,
            outgoing: outgoingRequests,
          });

          setAuth({
            user,
            isAuthenticated: true,
            hasAccount: true,
            currentUsername: profile.handle,
          });

          void refreshFeedPosts(user.id);

          return { ok: true };
        } catch (error) {
          console.error("Sign in error:", error);
          return {
            ok: false,
            error: error.message || "Invalid email or password.",
          };
        }
      },

      signOut: async () => {
        try {
          await authSignOut();
          setAuth({
            user: null,
            isAuthenticated: false,
            hasAccount: publicUsers.length > 0,
            currentUsername: null,
          });
          dispatch({ type: ACTIONS.RESET_STATE });
          setFriendRequests({ incoming: [], outgoing: [] });
          return { ok: true };
        } catch (error) {
          console.error("Sign out error:", error);
          return { ok: false, error: error.message };
        }
      },

      /**
       * ============================================
       * JOURNAL ACTIONS
       * ============================================
       */
      addDailyJournal: async ({
        entryDate,
        date,
        mood,
        highlight,
        smile,
        grateful,
        proudestMoment,
        habits = [],
        isPublic = true,
        public: publicFlag,
      }) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          const resolvedEntryDate = entryDate || date;
          const resolvedIsPublic =
            publicFlag === undefined ? isPublic : publicFlag;

          const journal = await DB.createDailyJournal(auth.user.id, {
            entryDate: resolvedEntryDate,
            mood: clampMood(mood),
            highlight,
            smile,
            grateful,
            proudestMoment,
            isPublic: resolvedIsPublic,
          });

          const userHabits = await DB.getUserHabits(auth.user.id);
          const habitIdByName = new Map(
            userHabits.map((habit) => [habit.name, habit.id]),
          );

          await Promise.all(
            normalizeHabitNames(habits)
              .map((habitName) => habitIdByName.get(habitName))
              .filter(Boolean)
              .map((habitId) => DB.addHabitToJournal(journal.id, habitId)),
          );

          dispatch({
            type: ACTIONS.ADD_DAILY_JOURNAL,
            payload: normalizeDailyJournal(
              { ...journal, habits },
              state.userProfile.username || state.userProfile.handle,
            ),
          });

          return { ok: true, data: journal };
        } catch (error) {
          console.error("Add daily journal error:", error);
          return { ok: false, error: error.message };
        }
      },

      updateDailyJournal: async (journalId, updates) => {
        try {
          const updated = await DB.updateDailyJournal(journalId, updates);

          if (updates?.habits) {
            const userHabits = await DB.getUserHabits(auth.user.id);
            const habitIdByName = new Map(
              userHabits.map((habit) => [habit.name, habit.id]),
            );
            const selectedHabitIds = normalizeHabitNames(updates.habits)
              .map((habitName) => habitIdByName.get(habitName))
              .filter(Boolean);
            const currentJournalHabits = await DB.getJournalHabits(journalId);
            const currentHabitIds = new Set(
              currentJournalHabits.map((habit) => habit?.id).filter(Boolean),
            );

            await Promise.all(
              [...currentHabitIds]
                .filter((habitId) => !selectedHabitIds.includes(habitId))
                .map((habitId) =>
                  DB.removeHabitFromJournal(journalId, habitId),
                ),
            );

            await Promise.all(
              selectedHabitIds
                .filter((habitId) => !currentHabitIds.has(habitId))
                .map((habitId) => DB.addHabitToJournal(journalId, habitId)),
            );
          }

          dispatch({
            type: ACTIONS.UPDATE_DAILY_JOURNAL,
            payload: {
              id: journalId,
              updates: normalizeDailyJournal(
                {
                  ...updated,
                  habits: normalizeHabitNames(updates.habits),
                },
                state.userProfile.username || state.userProfile.handle,
              ),
            },
          });

          void refreshFeedPosts(auth.user.id);

          return { ok: true, data: updated };
        } catch (error) {
          console.error("Update daily journal error:", error);
          return { ok: false, error: error.message };
        }
      },

      deleteDailyJournal: async (journalId) => {
        try {
          await DB.deleteDailyJournal(journalId);
          dispatch({
            type: ACTIONS.DELETE_DAILY_JOURNAL,
            payload: { id: journalId },
          });
          void refreshFeedPosts(auth.user.id);
          return { ok: true };
        } catch (error) {
          console.error("Delete daily journal error:", error);
          return { ok: false, error: error.message };
        }
      },

      addWeeklyReport: async (payload) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          const resolvedWeekStart =
            payload?.weekStart ||
            payload?.week_start ||
            payload?.date ||
            payload?.entryDate ||
            payload?.entry_date ||
            null;

          const read = payload?.read;
          const eat = payload?.eat;
          const play = payload?.play;
          const obsess = payload?.obsess;
          const recommend = payload?.recommend;
          const treat = payload?.treat;
          const isPublic = payload?.isPublic ?? payload?.public ?? true;

          const report = await DB.createWeeklyReport(auth.user.id, {
            weekStart: resolvedWeekStart,
            read,
            eat,
            play,
            obsess,
            recommend,
            treat,
            isPublic,
          });

          dispatch({
            type: ACTIONS.ADD_WEEKLY_REPORT,
            payload: normalizeWeeklyReport(
              report,
              state.userProfile.username || state.userProfile.handle,
            ),
          });

          void refreshFeedPosts(auth.user.id);

          return { ok: true, data: report };
        } catch (error) {
          console.error("Add weekly report error:", error);
          return { ok: false, error: error.message };
        }
      },

      updateWeeklyReport: async (reportId, updates) => {
        try {
          const updated = await DB.updateWeeklyReport(reportId, updates);

          dispatch({
            type: ACTIONS.UPDATE_WEEKLY_REPORT,
            payload: { id: reportId, updates: updated },
          });

          void refreshFeedPosts(auth.user.id);

          return { ok: true, data: updated };
        } catch (error) {
          console.error("Update weekly report error:", error);
          return { ok: false, error: error.message };
        }
      },

      deleteWeeklyReport: async (reportId) => {
        try {
          await DB.deleteWeeklyReport(reportId);
          dispatch({
            type: ACTIONS.DELETE_WEEKLY_REPORT,
            payload: { id: reportId },
          });
          void refreshFeedPosts(auth.user.id);
          return { ok: true };
        } catch (error) {
          console.error("Delete weekly report error:", error);
          return { ok: false, error: error.message };
        }
      },

      addIndividualEntry: async ({
        entryType,
        type,
        content,
        entryDate,
        date,
        journalId = null,
      }) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          const resolvedEntryType = entryType || type;
          const resolvedEntryDate = entryDate || date;

          const entry = await DB.createIndividualEntry(auth.user.id, {
            entryType: resolvedEntryType,
            content,
            entryDate: resolvedEntryDate,
            journalId,
          });

          dispatch({
            type: ACTIONS.ADD_INDIVIDUAL_ENTRY,
            payload: normalizeIndividualEntry(
              entry,
              state.userProfile.username,
            ),
          });

          return { ok: true, data: entry };
        } catch (error) {
          console.error("Add individual entry error:", error);
          return { ok: false, error: error.message };
        }
      },

      /**
       * ============================================
       * HABITS ACTIONS
       * ============================================
       */
      updateHabits: async (habitsList) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          // For now, we'll just update the UI state
          // In a real implementation, you'd update habits in Supabase
          const habitColors = buildHabitColorMap(
            habitsList,
            state.userProfile.habitColors || {},
          );

          dispatch({
            type: ACTIONS.UPDATE_HABITS,
            payload: { habitsList, habitColors },
          });

          return { ok: true };
        } catch (error) {
          console.error("Update habits error:", error);
          return { ok: false, error: error.message };
        }
      },

      addFriendByUsername: async (friendHandle) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          const normalizedHandle = friendHandle.trim().toLowerCase();

          if (normalizedHandle === state.userProfile.handle) {
            return { ok: false, error: "You cannot add yourself as a friend." };
          }

          const friendProfile = await DB.getProfileByHandle(normalizedHandle);
          if (!friendProfile) {
            return { ok: false, error: "User not found." };
          }

          const isFriends = await DB.areFriends(auth.user.id, friendProfile.id);
          if (isFriends) {
            return { ok: false, error: "You are already friends." };
          }

          const request = await DB.sendFriendRequest(
            auth.user.id,
            friendProfile.id,
          );

          // Refresh friend requests in real-time
          await refreshFriendRequests(auth.user.id);

          return { ok: true };
        } catch (error) {
          console.error("Add friend error:", error);
          return { ok: false, error: error.message };
        }
      },

      /**
       * ============================================
       * FRIENDS ACTIONS
       * ============================================
       */
      addFriendByHandle: async (friendHandle) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          const normalizedHandle = friendHandle.trim().toLowerCase();

          if (normalizedHandle === state.userProfile.handle) {
            return { ok: false, error: "You cannot add yourself as a friend." };
          }

          const friendProfile = await DB.getProfileByHandle(normalizedHandle);
          if (!friendProfile) {
            return { ok: false, error: "User not found." };
          }

          // Check if already friends
          const isFriends = await DB.areFriends(auth.user.id, friendProfile.id);
          if (isFriends) {
            return { ok: false, error: "You are already friends." };
          }

          // Send friend request
          const request = await DB.sendFriendRequest(
            auth.user.id,
            friendProfile.id,
          );

          // Refresh friend requests in real-time
          await refreshFriendRequests(auth.user.id);

          return { ok: true };
        } catch (error) {
          console.error("Add friend error:", error);
          return { ok: false, error: error.message };
        }
      },

      approveFriendRequest: async (friendRequestId) => {
        try {
          await DB.acceptFriendRequest(friendRequestId);

          // Reload friends
          const friends = await DB.getFriends(auth.user.id);
          const friendIds = friends.map((f) => f.id);

          dispatch({
            type: ACTIONS.UPDATE_FRIENDS,
            payload: friendIds,
          });

          dispatch({
            type: ACTIONS.HYDRATE_STATE,
            payload: {
              userProfile: {
                ...state.userProfile,
                friendsList: friendIds,
                friendProfiles: friends,
              },
            },
          });

          // Reload all friend requests in real-time
          await refreshFriendRequests(auth.user.id);

          return { ok: true };
        } catch (error) {
          console.error("Approve friend request error:", error);
          return { ok: false, error: error.message };
        }
      },

      declineFriendRequest: async (friendRequestId) => {
        try {
          await DB.declineFriendRequest(friendRequestId);

          // Reload all friend requests in real-time
          await refreshFriendRequests(auth.user.id);

          return { ok: true };
        } catch (error) {
          console.error("Decline friend request error:", error);
          return { ok: false, error: error.message };
        }
      },

      /**
       * ============================================
       * LIKES & COMMENTS ACTIONS
       * ============================================
       */
      toggleLikeOnDailyJournal: async (journalId) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          await DB.toggleDailyJournalLike(
            resolveDailyJournalId(journalId),
            auth.user.id,
          );
          await refreshFeedPosts(auth.user.id);
          return { ok: true };
        } catch (error) {
          console.error("Toggle like error:", error);
          return { ok: false, error: error.message };
        }
      },

      toggleLikeOnWeeklyReport: async (reportId) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          await DB.toggleWeeklyReportLike(
            resolveWeeklyReportId(reportId),
            auth.user.id,
          );
          await refreshFeedPosts(auth.user.id);
          return { ok: true };
        } catch (error) {
          console.error("Toggle like error:", error);
          return { ok: false, error: error.message };
        }
      },

      addCommentOnDailyJournal: async (journalId, commentText) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          const comment = await DB.addDailyJournalComment(
            resolveDailyJournalId(journalId),
            auth.user.id,
            commentText,
          );
          await refreshFeedPosts(auth.user.id);
          return { ok: true, data: comment };
        } catch (error) {
          console.error("Add comment error:", error);
          return { ok: false, error: error.message };
        }
      },

      addCommentOnWeeklyReport: async (reportId, commentText) => {
        try {
          if (!auth.user) {
            return { ok: false, error: "User not authenticated" };
          }

          const comment = await DB.addWeeklyReportComment(
            resolveWeeklyReportId(reportId),
            auth.user.id,
            commentText,
          );
          await refreshFeedPosts(auth.user.id);
          return { ok: true, data: comment };
        } catch (error) {
          console.error("Add comment error:", error);
          return { ok: false, error: error.message };
        }
      },

      /**
       * ============================================
       * UTILITY ACTIONS
       * ============================================
       */
      clearAppData: async () => {
        try {
          await authSignOut();
          setAuth({
            user: null,
            isAuthenticated: false,
          });
          dispatch({ type: ACTIONS.RESET_STATE });
          setFriendRequests({ incoming: [], outgoing: [] });
          return { ok: true };
        } catch (error) {
          console.error("Clear app data error:", error);
          return { ok: false, error: error.message };
        }
      },

      searchUsers: async (input) => {
        const query = typeof input === "string" ? input : input?.query || "";
        const excludeUsernames =
          typeof input === "object" && input !== null
            ? input.excludeUsernames || []
            : [];

        if (!query || query.trim().length === 0) {
          return [];
        }

        try {
          // Query database directly for fresh results
          const profiles = await DB.searchProfiles(query, 8);
          console.log(
            "[searchUsers] DB query returned:",
            profiles.length,
            "profiles",
          );
          const normalizedExclude = excludeUsernames.map((name) =>
            (name || "").toLowerCase(),
          );

          const filtered = profiles
            .map((profile) => ({
              handle: profile.handle,
              firstName: profile.first_name,
              lastName: profile.last_name,
              username: profile.handle,
            }))
            .filter(
              (user) =>
                !normalizedExclude.includes((user.handle || "").toLowerCase()),
            )
            .slice(0, 8);

          console.log(
            "[searchUsers] After filtering, returning:",
            filtered.length,
            "results",
          );
          return filtered;
        } catch (error) {
          console.error(
            "[searchUsers] DB error, falling back to publicUsers:",
            error,
          );
          // Fallback to publicUsers
          const normalizedQuery = query.trim().toLowerCase();
          console.log("[searchUsers] publicUsers count:", publicUsers.length);
          const fallbackResults = publicUsers
            .filter((user) => {
              const firstName = (user.firstName || "").toLowerCase();
              const lastName = (user.lastName || "").toLowerCase();
              const handle = (user.handle || user.username || "").toLowerCase();
              const excluded = excludeUsernames.some(
                (name) => (name || "").toLowerCase() === handle,
              );

              if (excluded) return false;

              return (
                firstName.includes(normalizedQuery) ||
                lastName.includes(normalizedQuery) ||
                handle.includes(normalizedQuery)
              );
            })
            .slice(0, 8);

          console.log(
            "[searchUsers] Fallback returning:",
            fallbackResults.length,
            "results",
          );
          return fallbackResults;
        }
      },
    }),
    [publicUsers, state.userProfile],
  );

  const value = useMemo(
    () => ({
      state,
      isHydrated,
      isLoading,
      auth,
      friendRequests,
      ...actions,
    }),
    [actions, auth, friendRequests, isHydrated, isLoading, state],
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
