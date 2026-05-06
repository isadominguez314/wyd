import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";
import { moodLabels, moodOptions } from "../utils/moodLabels";
import { formatLocalDate } from "../utils/dateUtils";
import * as DB from "../storage/supabaseService";
import { useNavigation } from "@react-navigation/native";

const FILTERS = {
  ALL: "all",
  DAILY: "dailyJournals",
  WEEKLY: "weeklyReports",
  HIGHLIGHTS: "highlights",
  SMILES: "smiles",
  GRATITUDES: "gratitudes",
  PROUDEST: "proudestMoments",
};

const filterChips = [
  { key: FILTERS.ALL, label: "All" },
  { key: FILTERS.DAILY, label: "Daily Journals" },
  { key: FILTERS.WEEKLY, label: "Weekly Reports" },
  { key: FILTERS.HIGHLIGHTS, label: "Highlights" },
  { key: FILTERS.SMILES, label: "Smiles" },
  { key: FILTERS.GRATITUDES, label: "Gratitudes" },
  { key: FILTERS.PROUDEST, label: "Proudest Moments" },
];

const individualTypesForFilter = {
  [FILTERS.HIGHLIGHTS]: ["highlight"],
  [FILTERS.SMILES]: ["smile"],
  [FILTERS.GRATITUDES]: ["grateful"],
  [FILTERS.PROUDEST]: ["proudestMoment"],
};

const entryTypeLabels = {
  highlight: "Highlight",
  smile: "Smile",
  grateful: "Gratitude",
  proudestMoment: "Proudest Moment",
};

const getIndividualEntryType = (entry) => entry.type || entry.entry_type || "";

const dailyFields = ["highlight", "smile", "grateful", "proudestMoment"];
const weeklyFields = ["read", "eat", "play", "obsess", "recommend", "treat"];
const subEntryFilters = [
  FILTERS.HIGHLIGHTS,
  FILTERS.SMILES,
  FILTERS.GRATITUDES,
  FILTERS.PROUDEST,
];

const buildCardPreview = (fields, item) => {
  for (const field of fields) {
    const value = item[field]?.trim?.();
    if (value) return value;
  }
  return "No details yet.";
};

const getWeeklyFieldValue = (report, key) => {
  const legacyKeyMap = {
    read: "reading",
    eat: "eating",
    play: "playing",
    obsess: "obsessing",
    recommend: "recommending",
    treat: "treating",
  };

  return report[key] || report[legacyKeyMap[key]] || "";
};

const matchesAnyField = (item, fields, normalizedQuery) => {
  if (normalizedQuery.length === 0) return true;

  const dateText = formatLocalDate(item.date).toLowerCase();
  const joined = fields
    .map((field) => (item[field] || "").toLowerCase())
    .join(" ");

  return joined.includes(normalizedQuery) || dateText.includes(normalizedQuery);
};

const SearchScreen = ({ route }) => {
  const navigation = useNavigation();
  const { state, deleteDailyJournal, deleteWeeklyReport } = useAppContext();
  const currentUsername = state.userProfile?.username;
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState([FILTERS.ALL]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [interactionCache, setInteractionCache] = useState({});

  // Apply initial filter from navigation params (e.g., from HomeScreen)
  React.useEffect(() => {
    const initialFilter = route?.params?.initialFilter;
    if (initialFilter && initialFilter !== FILTERS.ALL) {
      setSelectedFilters([initialFilter]);
    }
  }, [route?.params?.initialFilter]);

  const hasAll = selectedFilters.includes(FILTERS.ALL);
  const hasDaily = selectedFilters.includes(FILTERS.DAILY) || hasAll;
  const hasWeekly = selectedFilters.includes(FILTERS.WEEKLY) || hasAll;
  const activeSubEntryFilters = selectedFilters.filter((filter) =>
    subEntryFilters.includes(filter),
  );
  const showSubEntries = !hasAll && activeSubEntryFilters.length > 0;
  const showMoodFilter = hasDaily;

  const chipDisabled = (chipKey) => {
    if (chipKey === FILTERS.ALL) return false;
    if (hasAll) return true;

    const hasSubEntriesSelected = activeSubEntryFilters.length > 0;

    if (chipKey === FILTERS.DAILY && hasSubEntriesSelected) {
      return true;
    }

    if (
      subEntryFilters.includes(chipKey) &&
      selectedFilters.includes(FILTERS.DAILY)
    ) {
      return true;
    }

    return false;
  };

  const toggleFilterChip = (chipKey) => {
    setExpandedCards({});

    if (chipKey === FILTERS.ALL) {
      setSelectedFilters((prev) =>
        prev.includes(FILTERS.ALL) ? [] : [FILTERS.ALL],
      );
      return;
    }

    setSelectedFilters((prev) => {
      let next = prev.filter((item) => item !== FILTERS.ALL);

      if (chipKey === FILTERS.DAILY) {
        next = next.filter((item) => !subEntryFilters.includes(item));
      }

      if (subEntryFilters.includes(chipKey)) {
        next = next.filter((item) => item !== FILTERS.DAILY);
      }

      if (next.includes(chipKey)) {
        return next.filter((item) => item !== chipKey);
      }

      return [...next, chipKey];
    });
  };

  const toggleMood = (value) => {
    setSelectedMoods((prev) =>
      prev.includes(value)
        ? prev.filter((mood) => mood !== value)
        : [...prev, value],
    );
  };

  const toggleExpanded = (cardId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const loadInteractions = async (result) => {
    if (!result?.sourceId || interactionCache[result.sourceId]) return;

    try {
      const [likes, comments] = result.isDailyJournal
        ? await Promise.all([
            DB.getDailyJournalLikes(result.sourceId),
            DB.getDailyJournalComments(result.sourceId),
          ])
        : await Promise.all([
            DB.getWeeklyReportLikes(result.sourceId),
            DB.getWeeklyReportComments(result.sourceId),
          ]);

      setInteractionCache((prev) => ({
        ...prev,
        [result.sourceId]: { likes, comments },
      }));
    } catch (error) {
      console.error("Error loading search interactions:", error);
    }
  };

  const toggleExpandedAndLoad = async (result) => {
    const nextExpanded = !expandedCards[result.id];
    toggleExpanded(result.id);

    if (nextExpanded) {
      await loadInteractions(result);
    }
  };

  const getInteractionData = (result) =>
    interactionCache[result.sourceId] || {
      likes: result.likes || [],
      comments: result.comments || [],
    };

  const openEditor = (result) => {
    if (result.isDailyJournal) {
      navigation.navigate("JournalScreen", {
        journal: result.sourceEntry || result,
      });
      return;
    }

    if (result.isWeeklyReport) {
      navigation.navigate("WeeklyReportScreen", {
        report: result.sourceEntry || result,
      });
    }
  };

  const confirmDelete = (result) => {
    const label = result.isDailyJournal ? "daily journal" : "weekly report";

    Alert.alert(
      "Delete entry?",
      `Delete this ${label}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const action = result.isDailyJournal
              ? deleteDailyJournal
              : deleteWeeklyReport;
            const deleteResult = await action(result.sourceId || result.id);

            if (!deleteResult?.ok) {
              Alert.alert(
                "Delete failed",
                deleteResult?.error || "Could not delete the entry.",
              );
            }
          },
        },
      ],
    );
  };

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const cards = [];

    if (hasDaily) {
      const filteredDaily = state.dailyJournals.filter((journal) => {
        const journalUsername = journal.username || currentUsername;
        if (journalUsername !== currentUsername) return false;

        const moodPass =
          selectedMoods.length === 0 || selectedMoods.includes(journal.mood);
        return moodPass && matchesAnyField(journal, dailyFields, normalized);
      });

      filteredDaily.forEach((journal, index) => {
        cards.push({
          id: `journal-${journal.date}-${index}`,
          sourceId: journal.id,
          sourceEntry: journal,
          category: "Daily Journal",
          isDailyJournal: true,
          date: journal.date,
          preview: buildCardPreview(dailyFields, journal),
          mood: journal.mood,
          likes: journal.likes || [],
          comments: journal.comments || [],
          details: [
            { label: "Highlight", value: journal.highlight },
            { label: "Smile", value: journal.smile },
            { label: "Grateful", value: journal.grateful },
            {
              label: "Proudest",
              value: journal.proudestMoment || journal.proudest_moment,
            },
          ],
        });
      });
    }

    if (hasWeekly) {
      const filteredWeekly = state.weeklyReports.filter((report) => {
        if (normalized.length === 0) return true;

        const dateText = formatLocalDate(report.date).toLowerCase();
        const weeklyText = weeklyFields
          .map((field) => getWeeklyFieldValue(report, field))
          .join(" ")
          .toLowerCase();

        return weeklyText.includes(normalized) || dateText.includes(normalized);
      });

      filteredWeekly.forEach((report, index) => {
        const weeklySummary = [
          { label: "Reading", value: getWeeklyFieldValue(report, "read") },
          { label: "Eating", value: getWeeklyFieldValue(report, "eat") },
          { label: "Playing", value: getWeeklyFieldValue(report, "play") },
          { label: "Obsessing", value: getWeeklyFieldValue(report, "obsess") },
          {
            label: "Recommending",
            value: getWeeklyFieldValue(report, "recommend"),
          },
          { label: "Treating", value: getWeeklyFieldValue(report, "treat") },
        ]
          .filter((item) => item.value && item.value.trim().length > 0)
          .map((item) => `${item.label}: ${item.value}`)
          .join("  ");

        cards.push({
          id: `weekly-${report.date}-${index}`,
          sourceId: report.id,
          sourceEntry: report,
          category: "Weekly Report",
          isWeeklyReport: true,
          date: report.date,
          preview: weeklySummary || "No details yet.",
          likes: report.likes || [],
          comments: report.comments || [],
          details: [
            { label: "R", value: getWeeklyFieldValue(report, "read") },
            { label: "E", value: getWeeklyFieldValue(report, "eat") },
            { label: "P", value: getWeeklyFieldValue(report, "play") },
            { label: "O", value: getWeeklyFieldValue(report, "obsess") },
            { label: "R", value: getWeeklyFieldValue(report, "recommend") },
            { label: "T", value: getWeeklyFieldValue(report, "treat") },
          ],
        });
      });
    }

    if (showSubEntries) {
      const allowedTypes = activeSubEntryFilters.flatMap(
        (filterKey) => individualTypesForFilter[filterKey],
      );

      const filteredEntries = state.individualEntries.filter((entry) => {
        const entryType = getIndividualEntryType(entry);
        const typePass = allowedTypes.includes(entryType);
        const queryPass =
          normalized.length === 0 ||
          entry.content.toLowerCase().includes(normalized) ||
          entryType.toLowerCase().includes(normalized);

        return typePass && queryPass;
      });

      filteredEntries.forEach((entry, index) => {
        const entryType = getIndividualEntryType(entry);
        cards.push({
          id: `entry-${entry.date}-${entryType}-${index}`,
          category: entryTypeLabels[entryType] || entryType,
          date: entry.date,
          preview: entry.content,
          details: [],
          isIndividualEntry: true,
        });
      });
    }

    return cards
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 60);
  }, [
    activeSubEntryFilters,
    hasDaily,
    hasWeekly,
    query,
    selectedMoods,
    showSubEntries,
    currentUsername,
    state.dailyJournals,
    state.individualEntries,
    state.weeklyReports,
  ]);

  return (
    <ScreenContainer>
      <SectionCard
        title="Search Entries"
        subtitle="Find moments by keyword, content type, and mood."
      >
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search journals and reports"
        />
        <View style={styles.filterRow}>
          {filterChips.map((chip) => {
            const selected = selectedFilters.includes(chip.key);
            const disabled = chipDisabled(chip.key);

            return (
              <Pressable
                key={chip.key}
                disabled={disabled}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primary
                      : "#FFFFFF",
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.border,
                    opacity: disabled ? 0.45 : 1,
                  },
                ]}
                onPress={() => toggleFilterChip(chip.key)}
              >
                <Text style={styles.filterText}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {showMoodFilter ? (
          <>
            <Text style={styles.moodFilterLabel}>
              Daily Journal mood filter
            </Text>
            <View style={styles.filterRow}>
              {moodOptions.map((mood) => {
                const selected = selectedMoods.includes(mood);
                return (
                  <Pressable
                    key={mood}
                    style={[
                      styles.moodChip,
                      {
                        backgroundColor: theme.moodColors[mood],
                        borderColor: selected
                          ? theme.colors.text
                          : "transparent",
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                    onPress={() => toggleMood(mood)}
                  >
                    <Text style={styles.moodChipText}>{moodLabels[mood]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title={`Results (${results.length})`}>
        {results.length === 0 ? (
          <Text style={styles.hint}>No matches yet.</Text>
        ) : (
          results.map((result) => {
            const expanded = Boolean(expandedCards[result.id]);

            return (
              <Pressable
                key={result.id}
                style={styles.resultRow}
                onPress={() =>
                  result.isIndividualEntry
                    ? null
                    : toggleExpandedAndLoad(result)
                }
              >
                <View style={styles.resultHeaderRow}>
                  <Text
                    style={[
                      styles.type,
                      result.isDailyJournal && result.mood
                        ? {
                            backgroundColor: theme.moodColors[result.mood],
                            color: theme.colors.text,
                          }
                        : styles.typeYellow,
                    ]}
                  >
                    {result.isWeeklyReport
                      ? `Weekly Report ${formatLocalDate(result.date)}`
                      : result.category}
                  </Text>
                  {result.isDailyJournal || result.isWeeklyReport ? (
                    <View style={styles.headerActions}>
                      <Pressable
                        style={styles.iconAction}
                        onPress={() => openEditor(result)}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={18}
                          color={theme.colors.mutedText}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.iconAction}
                        onPress={() => confirmDelete(result)}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={theme.colors.mutedText}
                        />
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                {result.isWeeklyReport ? (
                  <>
                    <Text style={styles.weeklyLine}>
                      {[
                        { label: "Reading", key: "read" },
                        { label: "Eating", key: "eat" },
                        { label: "Playing", key: "play" },
                        { label: "Obsessing", key: "obsess" },
                        { label: "Recommending", key: "recommend" },
                        { label: "Treating", key: "treat" },
                      ].map((item, index) => {
                        const detail = result.details[index]?.value?.trim?.();
                        if (!detail) return null;

                        return (
                          <Text key={`${result.id}-${item.key}`}>
                            <Text style={styles.weeklyLabel}>
                              {item.label}:
                            </Text>{" "}
                            {detail}
                            {"  "}
                          </Text>
                        );
                      })}
                    </Text>
                    <Text style={styles.date}>
                      {formatLocalDate(result.date)}
                      {expanded ? "  • Collapse" : "  • Expand"}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.content}>{result.preview}</Text>
                    <Text style={styles.date}>
                      {formatLocalDate(result.date)}
                      {result.isIndividualEntry
                        ? ""
                        : expanded
                          ? "  • Collapse"
                          : "  • Expand"}
                    </Text>
                  </>
                )}

                {!result.isIndividualEntry && expanded && result.isDailyJournal
                  ? result.details
                      .filter(
                        (item) => item.value && item.value.trim().length > 0,
                      )
                      .map((item, index) => (
                        <Text
                          key={`${result.id}-${item.label}-${index}`}
                          style={styles.inlineDetail}
                        >
                          <Text style={styles.inlineDetailLabel}>
                            {item.label}:
                          </Text>{" "}
                          {item.value}
                        </Text>
                      ))
                  : null}

                {!result.isIndividualEntry && expanded ? (
                  <View style={styles.interactionBlock}>
                    {(() => {
                      const interactionData = getInteractionData(result);
                      const likeNames = (interactionData.likes || [])
                        .map((like) => like.profiles?.handle)
                        .filter(Boolean);

                      return (
                        <>
                          <Text style={styles.interactionLine}>
                            <Text style={styles.interactionLabel}>Likes:</Text>{" "}
                            {likeNames.length}
                            {likeNames.length > 0
                              ? ` (${likeNames.join(", ")})`
                              : ""}
                          </Text>

                          <Text style={styles.interactionLabel}>Comments:</Text>
                          {(interactionData.comments || []).length === 0 ? (
                            <Text style={styles.interactionLine}>
                              No comments yet.
                            </Text>
                          ) : (
                            (interactionData.comments || []).map(
                              (comment, index) => (
                                <Text
                                  key={`${result.id}-comment-${index}`}
                                  style={styles.interactionLine}
                                >
                                  <Text style={styles.interactionCommentAuthor}>
                                    {comment.profiles?.handle || "Friend"}:
                                  </Text>{" "}
                                  {comment.comment_text || comment.text || ""}
                                </Text>
                              ),
                            )
                          )}
                        </>
                      );
                    })()}
                  </View>
                ) : null}

                {!result.isIndividualEntry &&
                expanded &&
                !result.isDailyJournal &&
                !result.isWeeklyReport
                  ? result.details
                      .filter(
                        (item) => item.value && item.value.trim().length > 0,
                      )
                      .map((item, index) => (
                        <View
                          key={`${result.id}-${item.label}-${index}`}
                          style={styles.detailRow}
                        >
                          <Text style={styles.detailValue}>
                            {item.label}: {item.value}
                          </Text>
                        </View>
                      ))
                  : null}
              </Pressable>
            );
          })
        )}
      </SectionCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  filterChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  filterText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  moodFilterLabel: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontWeight: "600",
  },
  moodChip: {
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  moodChipText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  resultRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  iconAction: {
    padding: 4,
  },
  type: {
    fontWeight: "700",
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  typeYellow: {
    color: theme.colors.text,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  content: {
    color: theme.colors.text,
  },
  date: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  detailRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    gap: 2,
  },
  detailValue: {
    color: theme.colors.text,
  },
  inlineDetail: {
    color: theme.colors.text,
    marginTop: 2,
    lineHeight: 18,
  },
  inlineDetailLabel: {
    fontWeight: "700",
  },
  weeklyLine: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  weeklyLabel: {
    fontWeight: "700",
  },
  managementActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "flex-end",
    marginTop: theme.spacing.xs,
  },
  managementButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  managementButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  managementButtonDanger: {
    borderWidth: 1,
    borderColor: "#F0B4B4",
    backgroundColor: "#FFF5F5",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  managementButtonDangerText: {
    color: "#A33A3A",
    fontWeight: "700",
  },
  interactionBlock: {
    marginTop: theme.spacing.xs,
    gap: 2,
  },
  interactionLabel: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  interactionLine: {
    color: theme.colors.text,
    lineHeight: 18,
  },
  interactionCommentAuthor: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  hint: {
    color: theme.colors.mutedText,
  },
});

export default SearchScreen;
