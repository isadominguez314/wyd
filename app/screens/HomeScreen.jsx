import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

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
  const latestMood = state.dailyJournals[0]?.mood;

  return (
    <ScreenContainer>
      <SectionCard title="Today" subtitle="Jump into your check-in flow.">
        <PrimaryRow
          label="Latest mood"
          value={latestMood ? `${latestMood}/7` : "No entry"}
        />
        <PrimaryRow
          label="Journal entries"
          value={`${state.dailyJournals.length}`}
        />
        <PrimaryRow
          label="Weekly reports"
          value={`${state.weeklyReports.length}`}
        />
      </SectionCard>

      <SectionCard title="Create">
        <View style={styles.grid}>
          <NavTile
            label="Journal"
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

      <SectionCard title="Insights">
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
            label="Archive"
            color={theme.colors.orange}
            onPress={() => navigation.navigate("ArchiveScreen")}
          />
          <NavTile
            label="Search"
            color={theme.colors.primary}
            onPress={() => navigation.navigate("SearchScreen")}
          />
        </View>
      </SectionCard>
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
});

export default HomeScreen;
