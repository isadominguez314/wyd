import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";
import { moodLabels, moodOptions } from "../utils/moodLabels";

const ranges = {
  "1mo": 30,
  "3mo": 90,
  year: null,
  all: null,
};

const rangeLabels = {
  "1mo": "1 Month",
  "3mo": "3 Month",
  year: "This Year",
  all: "Overall",
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toLocalDateKey = (dateInput) => {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const chunk = (items, size) => {
  const groups = [];
  for (let idx = 0; idx < items.length; idx += size) {
    groups.push(items.slice(idx, idx + size));
  }
  return groups;
};

const formatMonthLabel = (date, includeYear) =>
  includeYear
    ? `${date.toLocaleDateString(undefined, { month: "short" })}\n${date.getFullYear()}`
    : date.toLocaleDateString(undefined, { month: "short" });

const ArchiveScreen = () => {
  const { state } = useAppContext();
  const currentUsername = state.userProfile.username;
  const [range, setRange] = useState("3mo");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const moodScale = moodOptions || [1, 2, 3, 4, 5, 6, 7];

  const journalsForUser = useMemo(
    () =>
      state.dailyJournals.filter((entry) => entry.username === currentUsername),
    [currentUsername, state.dailyJournals],
  );

  const entryByDay = useMemo(() => {
    const map = new Map();

    journalsForUser.forEach((entry) => {
      const key = toLocalDateKey(entry.date);
      const previous = map.get(key);

      if (!previous || new Date(entry.date) > new Date(previous.date)) {
        map.set(key, entry);
      }
    });

    return map;
  }, [journalsForUser]);

  const calendarWeeks = useMemo(() => {
    if (journalsForUser.length === 0) {
      return [];
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const firstEntryDate = journalsForUser.reduce((acc, entry) => {
      const date = new Date(entry.date);
      date.setHours(0, 0, 0, 0);
      if (!acc || date < acc) return date;
      return acc;
    }, null);

    if (!firstEntryDate) {
      return [];
    }

    let rangeStart = new Date(firstEntryDate);

    if (range === "1mo" || range === "3mo") {
      const daysLimit = ranges[range];
      const limitedStart = new Date(now);
      limitedStart.setDate(now.getDate() - (daysLimit - 1));
      rangeStart =
        limitedStart > firstEntryDate ? limitedStart : firstEntryDate;
    }

    if (range === "year") {
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      rangeStart =
        thisYearStart > firstEntryDate ? thisYearStart : firstEntryDate;
    }

    const endDate = new Date(now);
    if (rangeStart > endDate) {
      return [];
    }

    const startDate = new Date(rangeStart);
    const endPaddingDate = new Date(endDate);

    startDate.setDate(startDate.getDate() - startDate.getDay());
    endPaddingDate.setDate(
      endPaddingDate.getDate() + (6 - endPaddingDate.getDay()),
    );

    const days = [];
    const cursor = new Date(startDate);

    while (cursor <= endPaddingDate) {
      const inRange = cursor >= rangeStart && cursor <= endDate;
      const date = new Date(cursor);
      const key = toLocalDateKey(date);

      days.push({
        key,
        date,
        inRange,
        entry: inRange ? entryByDay.get(key) || null : null,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const weeksAscending = chunk(days, 7);
    const includeYearInMonthLabel = range === "all";

    let lastRenderedMonthKey = null;

    return weeksAscending.map((week, idx) => {
      const representative = week.find((day) => day.inRange) || week[0];
      const monthKey = `${representative.date.getFullYear()}-${representative.date.getMonth()}`;
      const showMonthLabel = monthKey !== lastRenderedMonthKey;

      if (showMonthLabel) {
        lastRenderedMonthKey = monthKey;
      }

      return {
        key: `week-${idx}-${week[0].key}`,
        week,
        monthLabel: showMonthLabel
          ? formatMonthLabel(representative.date, includeYearInMonthLabel)
          : "",
      };
    });
  }, [entryByDay, journalsForUser, range]);

  return (
    <ScreenContainer>
      <SectionCard
        title="Daily Archive"
        subtitle="Tap any day to view that journal entry."
      >
        <View style={styles.rangeRow}>
          {Object.keys(ranges).map((key) => (
            <Pressable
              key={key}
              onPress={() => setRange(key)}
              style={[
                styles.rangeChip,
                {
                  backgroundColor: range === key ? "#E5E7EB" : "#FFFFFF",
                  borderColor: "#D1D5DB",
                },
              ]}
            >
              <Text style={styles.rangeChipText}>{rangeLabels[key]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.legendRow}>
          {moodScale.map((mood) => (
            <View key={mood} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.moodColors[mood] },
                ]}
              />
              <Text style={styles.legendText}>{moodLabels[mood] || mood}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarHeaderRow}>
          {weekdayLabels.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        {calendarWeeks.length === 0 ? (
          <Text style={styles.hint}>No journal entries available yet.</Text>
        ) : (
          <View style={styles.calendarRowsWrap}>
            {calendarWeeks.map((weekRow) => (
              <View key={weekRow.key} style={styles.weekRowWrap}>
                <View style={styles.monthLabelCol}>
                  <Text style={styles.monthLabel}>{weekRow.monthLabel}</Text>
                </View>

                <View style={styles.weekCellsRow}>
                  {weekRow.week.map((cell) => {
                    const mood = cell.entry?.mood;

                    return (
                      <Pressable
                        key={cell.key}
                        onPress={() =>
                          cell.entry && setSelectedEntry(cell.entry)
                        }
                        disabled={!cell.entry}
                        style={[
                          styles.dayCell,
                          {
                            backgroundColor: !cell.inRange
                              ? "transparent"
                              : mood
                                ? theme.moodColors[mood]
                                : "#FFFFFF",
                            borderColor: !cell.inRange
                              ? "transparent"
                              : mood
                                ? "transparent"
                                : theme.colors.border,
                            opacity: cell.entry ? 1 : 0.7,
                          },
                        ]}
                      >
                        {cell.inRange ? (
                          <Text
                            style={[
                              styles.dayLabel,
                              mood ? styles.dayLabelOnMood : null,
                            ]}
                          >
                            {cell.date.getDate()}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <Modal
        visible={Boolean(selectedEntry)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedEntry ? (
              <>
                <Text style={styles.modalTitle}>Daily Journal</Text>
                <Text style={styles.modalMeta}>
                  {new Date(selectedEntry.date).toLocaleDateString()} · Rating:{" "}
                  {moodLabels[selectedEntry.mood] || selectedEntry.mood}
                </Text>
                {selectedEntry.highlight ? (
                  <Text style={styles.modalBody}>
                    <Text style={styles.modalLabel}>Highlight: </Text>
                    {selectedEntry.highlight}
                  </Text>
                ) : null}
                {selectedEntry.smile ? (
                  <Text style={styles.modalBody}>
                    <Text style={styles.modalLabel}>Smile: </Text>
                    {selectedEntry.smile}
                  </Text>
                ) : null}
                {selectedEntry.grateful ? (
                  <Text style={styles.modalBody}>
                    <Text style={styles.modalLabel}>Gratitude: </Text>
                    {selectedEntry.grateful}
                  </Text>
                ) : null}
                {selectedEntry.proudestMoment ? (
                  <Text style={styles.modalBody}>
                    <Text style={styles.modalLabel}>Proudest Moment: </Text>
                    {selectedEntry.proudestMoment}
                  </Text>
                ) : null}
                <Text style={styles.modalBody}>
                  <Text style={styles.modalLabel}>Habits: </Text>
                  {(selectedEntry.habits || []).join(", ") || "None"}
                </Text>
              </>
            ) : null}

            <Pressable
              style={styles.closeButton}
              onPress={() => setSelectedEntry(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  rangeChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  rangeChipText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  calendarHeaderRow: {
    marginLeft: "12%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  weekdayLabel: {
    width: "13.5%",
    textAlign: "center",
    color: theme.colors.mutedText,
    fontWeight: "700",
    fontSize: 11,
  },
  calendarRowsWrap: {
    gap: 4,
  },
  weekRowWrap: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  monthLabelCol: {
    width: "12%",
    justifyContent: "center",
    alignItems: "center",
  },
  monthLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 12,
  },
  weekCellsRow: {
    width: "88%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCell: {
    width: "13.4%",
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 2,
  },
  dayLabel: {
    fontSize: 9,
    color: theme.colors.mutedText,
    fontWeight: "700",
  },
  dayLabelOnMood: {
    color: theme.colors.text,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
  hint: {
    color: theme.colors.mutedText,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  modalMeta: {
    color: theme.colors.mutedText,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
  },
  modalLabel: {
    fontWeight: "700",
    color: theme.colors.text,
  },
  modalBody: {
    color: theme.colors.text,
    fontSize: 14,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  closeButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
});

export default ArchiveScreen;
