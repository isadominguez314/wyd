import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import theme from "../theme";
import HomeScreen from "../screens/HomeScreen";
import JournalScreen from "../screens/JournalScreen";
import WeeklyReportScreen from "../screens/WeeklyReportScreen";
import HabitChartScreen from "../screens/HabitChartScreen";
import HabitGraphScreen from "../screens/HabitGraphScreen";
import ArchiveScreen from "../screens/ArchiveScreen";
import SearchScreen from "../screens/SearchScreen";
import FeedScreen from "../screens/FeedScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { MaterialIcons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

const HomeStackNavigator = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: theme.colors.background },
    }}
  >
    <HomeStack.Screen
      name="HomeScreen"
      component={HomeScreen}
      options={{ title: "WYD" }}
    />
    <HomeStack.Screen
      name="JournalScreen"
      component={JournalScreen}
      options={{ title: "Journal" }}
    />
    <HomeStack.Screen
      name="WeeklyReportScreen"
      component={WeeklyReportScreen}
      options={{ title: "Weekly Report" }}
    />
    <HomeStack.Screen
      name="HabitChartScreen"
      component={HabitChartScreen}
      options={{ title: "Habit Chart" }}
    />
    <HomeStack.Screen
      name="HabitGraphScreen"
      component={HabitGraphScreen}
      options={{ title: "Habit Graph" }}
    />
    <HomeStack.Screen
      name="ArchiveScreen"
      component={ArchiveScreen}
      options={{ title: "Archive" }}
    />
    <HomeStack.Screen
      name="SearchScreen"
      component={SearchScreen}
      options={{ title: "Search" }}
    />
  </HomeStack.Navigator>
);

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.mutedText,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="question-answer" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, size }) => (
            <MaterialIcons
              name="person"
              size={size}
              color={focused ? theme.colors.text : theme.colors.mutedText}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
