import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  USERS_DIRECTORY: "wyd:usersDirectory",
  USER_PROFILE: "wyd:userProfile",
  DAILY_JOURNALS: "wyd:dailyJournals",
  WEEKLY_REPORTS: "wyd:weeklyReports",
  INDIVIDUAL_ENTRIES: "wyd:individualEntries",
};

const INITIAL_DATA = {
  userProfile: {
    firstName: "",
    lastName: "",
    username: "",
    habitsList: [],
    habitColors: {},
    friendsList: [],
  },
  dailyJournals: [],
  weeklyReports: [],
  individualEntries: [],
};

const parseJSON = (raw, fallback) => {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const loadInitialState = async () => {
  const [
    userProfileRaw,
    dailyJournalsRaw,
    weeklyReportsRaw,
    individualEntriesRaw,
  ] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
    AsyncStorage.getItem(STORAGE_KEYS.DAILY_JOURNALS),
    AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_REPORTS),
    AsyncStorage.getItem(STORAGE_KEYS.INDIVIDUAL_ENTRIES),
  ]);

  return {
    userProfile: parseJSON(userProfileRaw, INITIAL_DATA.userProfile),
    dailyJournals: parseJSON(dailyJournalsRaw, INITIAL_DATA.dailyJournals),
    weeklyReports: parseJSON(weeklyReportsRaw, INITIAL_DATA.weeklyReports),
    individualEntries: parseJSON(
      individualEntriesRaw,
      INITIAL_DATA.individualEntries,
    ),
  };
};

export const persistState = async (state) => {
  await Promise.all([
    AsyncStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(state.userProfile),
    ),
    AsyncStorage.setItem(
      STORAGE_KEYS.DAILY_JOURNALS,
      JSON.stringify(state.dailyJournals),
    ),
    AsyncStorage.setItem(
      STORAGE_KEYS.WEEKLY_REPORTS,
      JSON.stringify(state.weeklyReports),
    ),
    AsyncStorage.setItem(
      STORAGE_KEYS.INDIVIDUAL_ENTRIES,
      JSON.stringify(state.individualEntries),
    ),
  ]);
};

export const loadUsersDirectory = async () => {
  const usersRaw = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DIRECTORY);
  return parseJSON(usersRaw, []);
};

export const persistUsersDirectory = async (usersDirectory) => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.USERS_DIRECTORY,
    JSON.stringify(usersDirectory),
  );
};

export const clearAllStorage = async () => {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
};

export { INITIAL_DATA, STORAGE_KEYS };
