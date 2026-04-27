import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const entryTypes = ["all", "highlight", "smile", "grateful", "proudestMoment"];

const SearchScreen = () => {
  const { state } = useAppContext();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return state.individualEntries.filter((entry) => {
      const typePass = type === "all" || entry.type === type;
      const queryPass =
        normalized.length === 0 ||
        entry.content.toLowerCase().includes(normalized) ||
        entry.type.toLowerCase().includes(normalized);
      return typePass && queryPass;
    });
  }, [query, state.individualEntries, type]);

  return (
    <ScreenContainer>
      <SectionCard
        title="Search Entries"
        subtitle="Find moments by keyword or type."
      >
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search your entries"
        />
        <View style={styles.filterRow}>
          {entryTypes.map((entryType) => (
            <Pressable
              key={entryType}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    type === entryType ? theme.colors.blue : "#FFFFFF",
                },
              ]}
              onPress={() => setType(entryType)}
            >
              <Text style={styles.filterText}>{entryType}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title={`Results (${results.length})`}>
        {results.length === 0 ? (
          <Text style={styles.hint}>No matches yet.</Text>
        ) : (
          results.slice(0, 30).map((entry, index) => (
            <View key={`${entry.date}-${index}`} style={styles.resultRow}>
              <Text style={styles.type}>{entry.type}</Text>
              <Text style={styles.content}>{entry.content}</Text>
              <Text style={styles.date}>
                {new Date(entry.date).toLocaleDateString()}
              </Text>
            </View>
          ))
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
    textTransform: "capitalize",
  },
  resultRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    gap: 2,
  },
  type: {
    color: theme.colors.excellent,
    textTransform: "capitalize",
    fontWeight: "700",
  },
  content: {
    color: theme.colors.text,
  },
  date: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  hint: {
    color: theme.colors.mutedText,
  },
});

export default SearchScreen;
