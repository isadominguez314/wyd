import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import PrimaryButton from "../components/PrimaryButton";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";
import { moodLabels, moodOptions } from "../utils/moodLabels";

const journalPrompts = [
  { key: "highlight", label: "Highlight" },
  { key: "smile", label: "Made me smile" },
  { key: "grateful", label: "Grateful for" },
  { key: "proudestMoment", label: "Proudest moment" },
];

const JournalScreen = ({ navigation }) => {
  const { state, addDailyJournal, addIndividualEntry } = useAppContext();
  const [mood, setMood] = useState(4);
  const [isPublic, setIsPublic] = useState(true);
  const moodScale = moodOptions || [1, 2, 3, 4, 5, 6, 7];
  const [form, setForm] = useState({
    highlight: "",
    smile: "",
    grateful: "",
    proudestMoment: "",
  });
  const [selectedHabits, setSelectedHabits] = useState([]);

  const habits = state.userProfile.habitsList || [];
  const habitColors = state.userProfile.habitColors || {};
  const today = useMemo(() => new Date().toISOString(), []);

  const toggleHabit = (habit) => {
    setSelectedHabits((prev) =>
      prev.includes(habit)
        ? prev.filter((item) => item !== habit)
        : [...prev, habit],
    );
  };

  const submit = () => {
    const payload = {
      mood,
      ...form,
      habits: selectedHabits,
      public: isPublic,
      date: today,
    };

    addDailyJournal(payload);

    journalPrompts.forEach((prompt) => {
      const content = form[prompt.key]?.trim();
      if (!content) return;
      addIndividualEntry({
        type: prompt.key,
        content,
        date: today,
      });
    });

    Alert.alert("Saved", "Your journal entry was added.");
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <SectionCard title="Mood" subtitle="How does today feel overall?">
        <View style={styles.moodRow}>
          {moodScale.map((value) => (
            <Pressable
              key={value}
              onPress={() => setMood(value)}
              style={[
                styles.moodChip,
                {
                  backgroundColor: theme.moodColors[value],
                  borderWidth: mood === value ? 2 : 1,
                  borderColor:
                    mood === value ? theme.colors.text : "transparent",
                },
              ]}
            >
              <Text style={styles.moodText}>{moodLabels[value] || value}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Journal prompts">
        {journalPrompts.map((prompt) => (
          <View key={prompt.key} style={styles.inputBlock}>
            <Text style={styles.label}>{prompt.label}</Text>
            <TextInput
              style={styles.input}
              value={form[prompt.key]}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, [prompt.key]: text }))
              }
              placeholder={`Write your ${prompt.label.toLowerCase()}...`}
              multiline
            />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Habits done today">
        <View style={styles.moodRow}>
          {habits.length === 0 ? (
            <Text style={styles.hint}>
              Add habits in Profile to track them here.
            </Text>
          ) : (
            habits.map((habit) => {
              const selected = selectedHabits.includes(habit);
              return (
                <Pressable
                  key={habit}
                  onPress={() => toggleHabit(habit)}
                  style={[
                    styles.habitChip,
                    {
                      backgroundColor: selected
                        ? habitColors[habit] || theme.colors.green
                        : "#FFFFFF",
                      borderColor: selected
                        ? habitColors[habit] || theme.colors.green
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={styles.habitText}>{habit}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      </SectionCard>

      <SectionCard title="Post settings">
        <View style={styles.switchRow}>
          <Text style={styles.label}>Share to friends feed</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>
      </SectionCard>

      <PrimaryButton label="Save Journal" onPress={submit} tone="green" />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  moodChip: {
    minHeight: 34,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  moodText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  inputBlock: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    minHeight: 70,
    textAlignVertical: "top",
  },
  habitChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  habitText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  hint: {
    color: theme.colors.mutedText,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

export default JournalScreen;
