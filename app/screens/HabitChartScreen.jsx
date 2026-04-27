import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const formatDay = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

const toLocalDateKey = (dateInput) => {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const HabitChartScreen = () => {
  const { state } = useAppContext();
  const currentUsername = state.userProfile.username;

  const journalsForUser = useMemo(
    () =>
      state.dailyJournals.filter((entry) => entry.username === currentUsername),
    [currentUsername, state.dailyJournals],
  );

  const days = useMemo(() => {
    return [...Array(7)].map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
  }, []);

  const completionMap = useMemo(() => {
    const map = new Map();

    journalsForUser.forEach((entry) => {
      const key = toLocalDateKey(entry.date);
      const previous = map.get(key);

      if (!previous || new Date(entry.date) > previous.timestamp) {
        map.set(key, {
          habits: entry.habits || [],
          timestamp: new Date(entry.date),
        });
      }
    });

    return map;
  }, [journalsForUser]);

  const habits = state.userProfile.habitsList || [];
  const habitColors = state.userProfile.habitColors || {};

  return (
    <ScreenContainer>
      <SectionCard
        title="Weekly Habit Grid"
        subtitle="Each check means the habit was completed that day."
      >
        {habits.length === 0 ? (
          <Text style={styles.hint}>
            No habits yet. Add habits in your profile.
          </Text>
        ) : (
          <View style={styles.gridWrap}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerText, styles.habitCol]}>Habit</Text>
              {days.map((day) => (
                <View key={day.toISOString()} style={styles.dayCol}>
                  <Text style={styles.headerText}>{formatDay(day)}</Text>
                </View>
              ))}
            </View>
            {habits.map((habit) => (
              <View key={habit} style={styles.dataRow}>
                <Text style={[styles.cellText, styles.habitCol]}>{habit}</Text>
                {days.map((day) => {
                  const key = toLocalDateKey(day);
                  const done = (completionMap.get(key)?.habits || []).includes(
                    habit,
                  );
                  return (
                    <View key={`${habit}-${key}`} style={styles.dayCol}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: done
                              ? habitColors[habit] || theme.colors.success
                              : theme.colors.neutral,
                          },
                        ]}
                      >
                        <Text style={styles.dotText}>{done ? "✓" : ""}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  hint: {
    color: theme.colors.mutedText,
  },
  gridWrap: {
    gap: theme.spacing.sm,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  habitCol: {
    width: "32%",
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 12,
    color: theme.colors.mutedText,
    width: "100%",
    textAlign: "center",
  },
  cellText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  dot: {
    width: "84%",
    maxWidth: 34,
    minWidth: 24,
    height: 28,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default HabitChartScreen;
