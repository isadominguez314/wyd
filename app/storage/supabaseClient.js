import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as DatabaseService from "./supabaseService";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * ============================================
 * AUTHENTICATION HELPERS
 * ============================================
 */

/**
 * Validates that a handle follows the format:
 * lowercase letters, numbers, and underscores, 3-30 characters
 */
export const isValidHandle = (handle) => {
  const handleRegex = /^[a-z0-9_]{3,30}$/;
  return handleRegex.test(handle);
};

/**
 * Sign up a new user
 * @param {Object} params - { email, password, firstName, lastName, handle }
 */
export const authSignUp = async ({
  email,
  password,
  firstName,
  lastName,
  handle,
}) => {
  // Validate handle format
  const normalizedHandle = handle.trim().toLowerCase();
  if (!isValidHandle(normalizedHandle)) {
    throw new Error(
      "Handle must be 3-30 characters, containing only lowercase letters, numbers, and underscores.",
    );
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Failed to create user");

  // Create profile in database
  try {
    await DatabaseService.createProfile(authData.user.id, {
      email,
      handle: normalizedHandle,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  } catch (profileError) {
    // Clean up auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw profileError;
  }

  return authData.user;
};

/**
 * Sign in user with email and password
 * @param {Object} params - { email, password }
 */
export const authSignIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error("Failed to sign in");

  return data.user;
};

/**
 * Sign out current user
 */
export const authSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get currently authenticated user
 */
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session;
};

/**
 * Listen to auth state changes
 * @param {Function} callback - Called with (user, error) when auth state changes
 */
export const onAuthStateChange = (callback) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, null);
  });

  return subscription;
};

export default supabase;
