import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppContext } from "../context/AppContext";
import AppNavigator from "./AppNavigator";
import theme from "../theme";
import UserSearchDropdown from "../components/UserSearchDropdown";

const RootStack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: "#FFFFFF",
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

const CenteredScreen = ({ title, subtitle, children, showLogo }) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        contentContainerStyle={styles.centeredContainer}
        keyboardShouldPersistTaps="handled"
      >
        {showLogo && (
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);

const AuthScreen = () => {
  const { auth, signIn, signUp, searchUsers } = useAppContext();
  const [mode, setMode] = React.useState(auth.hasAccount ? "signin" : "signup");
  // Refs for sign-in form
  const signInUsernameRef = React.useRef(null);
  const signInPasswordRef = React.useRef(null);

  // Refs for sign-up step 1 form
  const signUpFirstNameRef = React.useRef(null);
  const signUpLastNameRef = React.useRef(null);
  const signUpUsernameRef = React.useRef(null);
  const signUpPasswordRef = React.useRef(null);

  const [signupStep, setSignupStep] = React.useState(1);
  const [signupDraft, setSignupDraft] = React.useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    habitsList: [],
    friendsList: [],
  });
  const [habitInput, setHabitInput] = React.useState("");
  const [friendQuery, setFriendQuery] = React.useState("");

  const [signInForm, setSignInForm] = React.useState({
    username: "",
    password: "",
  });

  React.useEffect(() => {
    if (!auth.hasAccount) {
      setMode("signup");
    }
  }, [auth.hasAccount]);

  const handleSignIn = async () => {
    const result = await signIn(signInForm);
    if (!result.ok) {
      Alert.alert("Sign in failed", result.error);
    }
  };

  const validateSignupIdentity = () => {
    if (
      !signupDraft.firstName.trim() ||
      !signupDraft.lastName.trim() ||
      !signupDraft.username.trim() ||
      !signupDraft.password.trim()
    ) {
      Alert.alert("Missing fields", "Please complete all required fields.");
      return false;
    }

    return true;
  };

  const addHabit = () => {
    const nextHabit = habitInput.trim();
    if (!nextHabit) return;
    if (signupDraft.habitsList.includes(nextHabit)) return;

    setSignupDraft((prev) => ({
      ...prev,
      habitsList: [...prev.habitsList, nextHabit],
    }));
    setHabitInput("");
  };

  const addSuggestedHabit = (habit) => {
    const next = habit.trim();
    if (!next) return;
    if (signupDraft.habitsList.includes(next)) return;

    setSignupDraft((prev) => ({
      ...prev,
      habitsList: [...prev.habitsList, next],
    }));
  };

  const removeHabit = (habit) => {
    setSignupDraft((prev) => ({
      ...prev,
      habitsList: prev.habitsList.filter((item) => item !== habit),
    }));
  };

  const removeSignupFriend = (username) => {
    setSignupDraft((prev) => ({
      ...prev,
      friendsList: prev.friendsList.filter((friend) => friend !== username),
    }));
  };

  const friendResults = searchUsers({
    query: friendQuery,
    excludeUsernames: [
      signupDraft.username.trim().toLowerCase(),
      ...signupDraft.friendsList,
    ],
  });

  const addSignupFriend = (user) => {
    if (signupDraft.friendsList.includes(user.username)) return;

    setSignupDraft((prev) => ({
      ...prev,
      friendsList: [...prev.friendsList, user.username],
    }));
    setFriendQuery("");
  };

  const handleSignUp = async () => {
    const result = await signUp({
      firstName: signupDraft.firstName,
      lastName: signupDraft.lastName,
      username: signupDraft.username,
      password: signupDraft.password,
      habitsList: signupDraft.habitsList,
      friendsList: signupDraft.friendsList,
    });

    if (!result.ok) {
      Alert.alert("Sign up failed", result.error);
    }
  };

  const isSignIn = mode === "signin";

  const resetSignupFlow = () => {
    setSignupStep(1);
    setHabitInput("");
    setFriendQuery("");
    setSignupDraft({
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      habitsList: [],
      friendsList: [],
    });
  };

  return (
    <CenteredScreen
      title={isSignIn ? "Sign In" : "Create Account"}
      subtitle={
        isSignIn
          ? "Enter your username and password."
          : signupStep === 1
            ? "Step 1 of 3: Create your account."
            : signupStep === 2
              ? "Step 2 of 3: Add habits to track."
              : "Step 3 of 3: Find friends by name or username."
      }
      showLogo={true}
    >
      {isSignIn ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Username"
            autoCapitalize="none"
            value={signInForm.username}
            ref={signInUsernameRef}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => signInPasswordRef.current?.focus()}
            onChangeText={(text) =>
              setSignInForm((prev) => ({ ...prev, username: text }))
            }
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={signInForm.password}
            ref={signInPasswordRef}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={handleSignIn}
            onChangeText={(text) =>
              setSignInForm((prev) => ({ ...prev, password: text }))
            }
          />

          <Pressable style={styles.primaryButton} onPress={handleSignIn}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
        </>
      ) : (
        <>
          {signupStep === 1 ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="First name"
                value={signupDraft.firstName}
                ref={signUpFirstNameRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => signUpLastNameRef.current?.focus()}
                onChangeText={(text) =>
                  setSignupDraft((prev) => ({ ...prev, firstName: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Last name"
                value={signupDraft.lastName}
                ref={signUpLastNameRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => signUpUsernameRef.current?.focus()}
                onChangeText={(text) =>
                  setSignupDraft((prev) => ({ ...prev, lastName: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                autoCapitalize="none"
                value={signupDraft.username}
                ref={signUpUsernameRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => signUpPasswordRef.current?.focus()}
                onChangeText={(text) =>
                  setSignupDraft((prev) => ({ ...prev, username: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={signupDraft.password}
                ref={signUpPasswordRef}
                returnKeyType="done"
                blurOnSubmit={true}
                onChangeText={(text) =>
                  setSignupDraft((prev) => ({ ...prev, password: text }))
                }
              />
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  if (validateSignupIdentity()) {
                    setSignupStep(2);
                  }
                }}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </>
          ) : null}

          {signupStep === 2 ? (
            <>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Add habit"
                  value={habitInput}
                  onChangeText={setHabitInput}
                />
                <Pressable style={styles.smallButton} onPress={addHabit}>
                  <Text style={styles.smallButtonText}>Add</Text>
                </Pressable>
              </View>

              <PillList items={signupDraft.habitsList} onRemove={removeHabit} />

              <View style={styles.suggestionsWrap}>
                <Text style={styles.suggestionsLabel}>Suggestions</Text>
                <View style={styles.suggestionsRow}>
                  {[
                    "drink water",
                    "exercise",
                    "sleep 8 hours",
                    "read",
                    "journal",
                  ]
                    .filter((sugg) => !signupDraft.habitsList.includes(sugg))
                    .map((sugg, idx) => (
                      <Pressable
                        key={sugg}
                        style={styles.suggestionButton}
                        onPress={() => addSuggestedHabit(sugg)}
                      >
                        <Text style={styles.suggestionText}>{sugg}</Text>
                      </Pressable>
                    ))}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.smallButton, styles.secondaryButton]}
                  onPress={() => setSignupStep(1)}
                >
                  <Text style={styles.smallButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => setSignupStep(3)}
                >
                  <Text style={styles.smallButtonText}>Continue</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {signupStep === 3 ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Search by first, last, or username"
                value={friendQuery}
                onChangeText={setFriendQuery}
              />
              <UserSearchDropdown
                visible={friendQuery.trim().length > 0}
                results={friendResults}
                onSelect={addSignupFriend}
                emptyText="No matching users found."
                plainEmpty={true}
              />

              <PillList
                items={signupDraft.friendsList}
                onRemove={removeSignupFriend}
              />

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.smallButton, styles.secondaryButton]}
                  onPress={() => setSignupStep(2)}
                >
                  <Text style={styles.smallButtonText}>Back</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={handleSignUp}>
                  <Text style={styles.smallButtonText}>Finish Sign Up</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </>
      )}

      <Pressable
        style={styles.ghostButton}
        onPress={() => {
          setMode(isSignIn ? "signup" : "signin");
          if (!isSignIn) {
            resetSignupFlow();
          }
        }}
        disabled={!auth.hasAccount && isSignIn}
      >
        <Text style={styles.ghostButtonText}>
          {isSignIn
            ? "Need an account? Sign Up"
            : "Already have an account? Sign In"}
        </Text>
      </Pressable>
    </CenteredScreen>
  );
};

const pillColors = [
  theme.colors.pink,
  theme.colors.green,
  theme.colors.blue,
  theme.colors.purple,
  theme.colors.orange,
];

const PillList = ({ items, onRemove }) => (
  <View style={styles.pillWrap}>
    {items.length === 0 ? (
      <Text style={styles.muted}>None added yet.</Text>
    ) : (
      items.map((item, idx) => (
        <Pressable
          key={item}
          style={[
            styles.pill,
            { backgroundColor: pillColors[idx % pillColors.length] },
          ]}
          onPress={() => onRemove?.(item)}
          disabled={!onRemove}
        >
          <Text style={styles.pillText}>{onRemove ? `${item} ×` : item}</Text>
        </Pressable>
      ))
    )}
  </View>
);

const LoadingScreen = () => (
  <View style={styles.centeredContainer}>
    <ActivityIndicator size="large" color={theme.colors.text} />
  </View>
);

const RootNavigator = () => {
  const { auth, isHydrated } = useAppContext();

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        initialRouteName={auth.isAuthenticated ? "App" : "Auth"}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {!auth.isAuthenticated ? (
          <RootStack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ title: "Welcome" }}
          />
        ) : (
          <RootStack.Screen
            name="App"
            component={AppNavigator}
            options={{ headerShown: false }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: "center",
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.mutedText,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  input: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  ghostButton: {
    width: "100%",
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  ghostButtonText: {
    color: theme.colors.mutedText,
    fontSize: 15,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  flex: {
    flex: 1,
  },
  smallButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  smallButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  secondaryButton: {
    backgroundColor: theme.colors.primary,
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  pill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.pink,
  },
  pillText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  muted: {
    color: theme.colors.mutedText,
  },
  suggestionsWrap: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  suggestionsLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
  },
  suggestionsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
  suggestionButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  suggestionText: {
    color: theme.colors.mutedText,
    fontWeight: "600",
  },
});

export default RootNavigator;
