import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";
import { moodLabels } from "../utils/moodLabels";

const NavTile = ({ label, onPress, color }) => (
  <Pressable
    style={[styles.tile, { backgroundColor: color }]}
    onPress={onPress}
  >
    <Text style={styles.tileLabel}>{label}</Text>
  </Pressable>
);

const HomeScreen = ({ navigation }) => {
  const { state } = useAppContext();
  const currentUsername = state.userProfile?.username;
  const firstName = state.userProfile?.firstName || "Friend";
  const myDailyJournals = state.dailyJournals.filter(
    (entry) => entry.username === currentUsername,
  );
  const myWeeklyReports = state.weeklyReports.filter(
    (entry) => entry.username === currentUsername,
  );
  const latestMood = myDailyJournals[0]?.mood;

  // Format today's date: "Monday, April 27"
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedDate = dateFormatter.format(today);

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.greeting}>Hi, {firstName}!</Text>
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      <SectionCard title="Create New ...">
        <View style={styles.grid}>
          <NavTile
            label="Daily Journal"
            color={theme.colors.pink}
            onPress={() => navigation.navigate("JournalScreen")}
          />
          <NavTile
            label="Weekly Report"
            color={theme.colors.green}
            onPress={() => navigation.navigate("WeeklyReportScreen")}
          />
        </View>
      </SectionCard>

      <SectionCard title="View Insights">
        <View style={styles.grid}>
          <NavTile
            label="Habit Chart"
            color={theme.colors.blue}
            onPress={() => navigation.navigate("HabitChartScreen")}
          />
          <NavTile
            label="Habit Graph"
            color={theme.colors.purple}
            onPress={() => navigation.navigate("HabitGraphScreen")}
          />
          <NavTile
            label="Ratings Archive"
            color={theme.colors.orange}
            onPress={() => navigation.navigate("ArchiveScreen")}
          />
          <NavTile
            label="Journal Search"
            color={theme.colors.primary}
            onPress={() => navigation.navigate("SearchScreen")}
          />
        </View>
      </SectionCard>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Daily Journal Entries</Text>
          <Text style={styles.statValue}>{myDailyJournals.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Weekly R.E.P.O.R.T. Entries</Text>
          <Text style={styles.statValue}>{myWeeklyReports.length}</Text>
        </View>
      </View>
    </ScreenContainer>
  );
};

const PrimaryRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  rowLabel: {
    color: theme.colors.mutedText,
    fontSize: 14,
  },
  rowValue: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  tile: {
    minWidth: "48%",
    flexGrow: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  tileLabel: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: theme.spacing.lg,
  },
  headerBlock: {
    gap: 2,
  },
  greeting: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 0,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.mutedText,
    textAlign: "center",
    marginBottom: 0,
  },
  statsGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default HomeScreen;
