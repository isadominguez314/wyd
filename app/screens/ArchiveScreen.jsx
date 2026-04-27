import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const ArchiveScreen = () => {
  const { state } = useAppContext();
  const currentUsername = state.userProfile.username;

  const journalsForUser = useMemo(
    () =>
      state.dailyJournals.filter((entry) => entry.username === currentUsername),
    [currentUsername, state.dailyJournals],
  );

  const moodByDay = useMemo(() => {
    const map = new Map();
    journalsForUser.forEach((entry) => {
      map.set(new Date(entry.date).toDateString(), entry.mood);
    });
    return map;
  }, [journalsForUser]);

  const days = useMemo(() => {
    return [...Array(84)].map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (83 - index));
      return date;
    });
  }, []);

  return (
    <ScreenContainer>
      <SectionCard
        title="Mood Archive"
        subtitle="Last 12 weeks. Darker = harder day, indigo = best day ever."
      >
        <View style={styles.grid}>
          {days.map((day) => {
            const mood = moodByDay.get(day.toDateString());
            return (
              <View
                key={day.toISOString()}
                style={[
                  styles.cell,
                  {
                    backgroundColor: mood ? theme.moodColors[mood] : "#FFFFFF",
                    borderColor: mood ? "transparent" : theme.colors.border,
                  },
                ]}
              />
            );
          })}
        </View>
      </SectionCard>
      <SectionCard title="Legend">
        <View style={styles.legendRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((mood) => (
            <View key={mood} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.moodColors[mood] },
                ]}
              />
              <Text style={styles.legendText}>{mood}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: theme.radius.pill,
  },
  legendText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
});

export default ArchiveScreen;
