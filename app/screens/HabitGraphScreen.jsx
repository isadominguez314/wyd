import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { LineChart } from "react-native-chart-kit";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const ranges = {
  "3mo": 90,
  "12mo": 365,
  all: null,
};

const rangeChipLabels = {
  "3mo": "3 Month",
  "12mo": "12 Month",
  all: "Overall",
};

const rangeAverageLabels = {
  "3mo": "3 Month Averages",
  "12mo": "12 Month Averages",
  all: "Overall Averages",
};

const width = Dimensions.get("window").width - 56;

const withAlpha = (hex, alpha) => {
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alphaHex}`;
};

const getWeekStart = (dateInput) => {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  const mondayBasedDay = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayBasedDay);
  return date;
};

const formatWeekLabel = (dateInput) => {
  const date = new Date(dateInput);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const HabitGraphScreen = () => {
  const { state } = useAppContext();
  const [range, setRange] = useState("3mo");
  const currentUsername = state.userProfile.username;
  const habits = state.userProfile.habitsList || [];
  const habitColors = state.userProfile.habitColors || {};

  const [visibleLines, setVisibleLines] = useState({ overall: true });

  useEffect(() => {
    setVisibleLines((previous) => {
      const next = { overall: previous.overall ?? true };
      habits.forEach((habit) => {
        next[habit] = previous[habit] ?? false;
      });
      return next;
    });
  }, [habits]);

  const journalsForUser = useMemo(
    () =>
      state.dailyJournals.filter((entry) => entry.username === currentUsername),
    [currentUsername, state.dailyJournals],
  );

  const filteredJournals = useMemo(() => {
    const daysLimit = ranges[range];
    const now = new Date();

    return journalsForUser
      .filter((entry) => {
        if (!daysLimit) return true;
        const diff = now.getTime() - new Date(entry.date).getTime();
        return diff <= daysLimit * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [journalsForUser, range]);

  const weeklyBuckets = useMemo(() => {
    const byWeek = new Map();

    filteredJournals.forEach((entry) => {
      const weekStart = getWeekStart(entry.date);
      const key = weekStart.toISOString();

      if (!byWeek.has(key)) {
        byWeek.set(key, { weekStart, entries: [] });
      }

      byWeek.get(key).entries.push(entry);
    });

    return Array.from(byWeek.values()).sort(
      (a, b) => a.weekStart.getTime() - b.weekStart.getTime(),
    );
  }, [filteredJournals]);

  const habitColorMap = useMemo(() => {
    const map = { overall: theme.colors.excellent };
    habits.forEach((habit, index) => {
      map[habit] = habitColors[habit] || theme.colors.success;
    });
    return map;
  }, [habitColors, habits]);

  const seriesByLine = useMemo(() => {
    const habitsCount = Math.max(habits.length, 1);

    const overall = weeklyBuckets.map((bucket) => {
      const completedTotal = bucket.entries.reduce(
        (sum, entry) => sum + (entry.habits || []).length,
        0,
      );

      return Math.round(
        (completedTotal / (bucket.entries.length * habitsCount)) * 100,
      );
    });

    const habitSeries = {};
    habits.forEach((habit) => {
      habitSeries[habit] = weeklyBuckets.map((bucket) => {
        const hitCount = bucket.entries.reduce(
          (sum, entry) => sum + ((entry.habits || []).includes(habit) ? 1 : 0),
          0,
        );

        return Math.round((hitCount / bucket.entries.length) * 100);
      });
    });

    return { overall, ...habitSeries };
  }, [habits, weeklyBuckets]);

  const labels = useMemo(() => {
    if (weeklyBuckets.length <= 6) {
      return weeklyBuckets.map((bucket) => formatWeekLabel(bucket.weekStart));
    }

    const step = Math.ceil(weeklyBuckets.length / 6);
    return weeklyBuckets.map((bucket, index) =>
      index % step === 0 ? formatWeekLabel(bucket.weekStart) : "",
    );
  }, [weeklyBuckets]);

  const datasets = useMemo(() => {
    const lineKeys = ["overall", ...habits];

    return lineKeys
      .filter((lineKey) => visibleLines[lineKey])
      .map((lineKey) => ({
        data: seriesByLine[lineKey] || [],
        color: () => habitColorMap[lineKey],
        strokeWidth: lineKey === "overall" ? 3 : 2,
      }));
  }, [habitColorMap, habits, seriesByLine, visibleLines]);

  const summary = useMemo(() => {
    if (filteredJournals.length === 0) {
      return {
        overall: 0,
        byHabit: habits.reduce((acc, habit) => ({ ...acc, [habit]: 0 }), {}),
      };
    }

    const habitsCount = Math.max(habits.length, 1);
    const completedTotal = filteredJournals.reduce(
      (sum, entry) => sum + (entry.habits || []).length,
      0,
    );

    const overall = Math.round(
      (completedTotal / (filteredJournals.length * habitsCount)) * 100,
    );

    const byHabit = {};
    habits.forEach((habit) => {
      const hitCount = filteredJournals.reduce(
        (sum, entry) => sum + ((entry.habits || []).includes(habit) ? 1 : 0),
        0,
      );
      byHabit[habit] = Math.round((hitCount / filteredJournals.length) * 100);
    });

    return { overall, byHabit };
  }, [filteredJournals, habits]);

  const toggleLine = (lineKey) => {
    setVisibleLines((previous) => ({
      ...previous,
      [lineKey]: !previous[lineKey],
    }));
  };

  const noEntries = weeklyBuckets.length === 0;
  const noVisibleLines = datasets.length === 0;

  return (
    <ScreenContainer>
      <SectionCard>
        <View style={styles.rangeRow}>
          {Object.keys(ranges).map((key) => (
            <Pressable
              key={key}
              onPress={() => setRange(key)}
              style={[
                styles.rangeButton,
                {
                  backgroundColor: range === key ? "#E5E7EB" : "#FFFFFF",
                  borderColor: "#D1D5DB",
                },
              ]}
            >
              <Text style={styles.rangeText}>{rangeChipLabels[key]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.legendWrap}>
          <LineToggle
            label="Overall"
            color={habitColorMap.overall}
            active={Boolean(visibleLines.overall)}
            onPress={() => toggleLine("overall")}
          />
          {habits.map((habit) => (
            <LineToggle
              key={habit}
              label={habit}
              color={habitColorMap[habit]}
              active={Boolean(visibleLines[habit])}
              onPress={() => toggleLine(habit)}
            />
          ))}
        </View>

        {noEntries ? (
          <Text style={styles.hint}>
            Add journal entries to populate this chart.
          </Text>
        ) : noVisibleLines ? (
          <Text style={styles.hint}>
            Toggle on at least one line to render the graph.
          </Text>
        ) : (
          <View style={styles.chartWrap}>
            <Text style={styles.graphTitle}>Habits Over Time</Text>
            <Text style={styles.axisYLabel}>Completion</Text>
            <LineChart
              data={{
                labels,
                datasets,
              }}
              width={width}
              height={220}
              yAxisSuffix="%"
              segments={2}
              withInnerLines
              fromZero
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 0,
                color: () => theme.colors.excellent,
                labelColor: () => theme.colors.mutedText,
                propsForDots: {
                  r: "3",
                  strokeWidth: "1",
                  stroke: theme.colors.excellent,
                },
              }}
              style={styles.chart}
            />
            <Text style={styles.axisXLabel}>Time</Text>
          </View>
        )}

        <Text style={styles.averagesHeading}>{rangeAverageLabels[range]}</Text>

        <View style={styles.summaryWrap}>
          <SummaryBox
            label="Overall"
            value={summary.overall}
            color={habitColorMap.overall}
          />
          {habits.map((habit) => (
            <SummaryBox
              key={habit}
              label={habit}
              value={summary.byHabit[habit] || 0}
              color={habitColorMap[habit]}
            />
          ))}
        </View>
      </SectionCard>
    </ScreenContainer>
  );
};

const LineToggle = ({ label, color, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.lineToggle,
      {
        borderColor: color,
        backgroundColor: active ? withAlpha(color, 0.2) : "#FFFFFF",
      },
    ]}
  >
    <View style={[styles.colorDot, { backgroundColor: color }]} />
    <Text style={styles.lineToggleText}>{label}</Text>
  </Pressable>
);

const SummaryBox = ({ label, value, color }) => (
  <View
    style={[
      styles.summaryBox,
      {
        borderColor: color,
        backgroundColor: withAlpha(color, 0.18),
      },
    ]}
  >
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}%</Text>
  </View>
);

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  rangeButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  rangeText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  hint: {
    color: theme.colors.mutedText,
  },
  legendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  lineToggle: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lineToggleText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  chart: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  chartWrap: {
    marginTop: theme.spacing.sm,
  },
  graphTitle: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  axisYLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    marginBottom: -theme.spacing.xs,
  },
  axisXLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  averagesHeading: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  summaryWrap: {
    marginTop: theme.spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  summaryBox: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 0,
  },
  summaryLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
});

export default HabitGraphScreen;
