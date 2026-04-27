import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Alert,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import PrimaryButton from "../components/PrimaryButton";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";
import { moodLabels, moodOptions } from "../utils/moodLabels";

const journalPrompts = [
  { key: "highlight", label: "What was the highlight of your day?" },
  { key: "smile", label: "What made you smile today?" },
  { key: "grateful", label: "What are you grateful for?" },
  { key: "proudestMoment", label: "What was your proudest moment today?" },
];
// Helper function to render label with highlighted keywords
const renderHighlightedLabel = (text) => {
  const keywords = ["highlight", "smile", "grateful", "proudest moment"];
  const parts = [];
  let lastIndex = 0;

  const lowerText = text.toLowerCase();
  const keywordMatches = [];

  keywords.forEach((keyword) => {
    let index = lowerText.indexOf(keyword);
    while (index !== -1) {
      keywordMatches.push({ index, length: keyword.length });
      index = lowerText.indexOf(keyword, index + 1);
    }
  });

  // Sort matches by index
  keywordMatches.sort((a, b) => a.index - b.index);

  keywordMatches.forEach((match) => {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        highlight: false,
      });
    }
    parts.push({
      text: text.substring(match.index, match.index + match.length),
      highlight: true,
    });
    lastIndex = match.index + match.length;
  });

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlight: false });
  }

  return parts;
};

const JournalScreen = ({ navigation }) => {
  const { state, addDailyJournal, addIndividualEntry } = useAppContext();
  const [mood, setMood] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const moodScale = moodOptions || [1, 2, 3, 4, 5, 6, 7];
  // Refs for keyboard navigation
  const highlightRef = React.useRef(null);
  const smileRef = React.useRef(null);
  const gratefulRef = React.useRef(null);
  const proudestMomentRef = React.useRef(null);

  const [form, setForm] = useState({
    highlight: "",
    smile: "",
    grateful: "",
    proudestMoment: "",
  });
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const habits = state.userProfile.habitsList || [];
  const habitColors = state.userProfile.habitColors || {};

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleHabit = (habit) => {
    setSelectedHabits((prev) =>
      prev.includes(habit)
        ? prev.filter((item) => item !== habit)
        : [...prev, habit],
    );
  };

  const submit = () => {
    const dateString = selectedDate.toISOString();
    // Trim text fields to remove accidental whitespace/newlines
    const trimmedForm = {
      highlight: form.highlight?.trim() || "",
      smile: form.smile?.trim() || "",
      grateful: form.grateful?.trim() || "",
      proudestMoment: form.proudestMoment?.trim() || "",
    };

    const payload = {
      mood: mood ?? null,
      ...trimmedForm,
      habits: selectedHabits,
      public: isPublic,
      date: dateString,
    };

    addDailyJournal(payload);

    journalPrompts.forEach((prompt) => {
      const content = trimmedForm[prompt.key]?.trim();
      if (!content) return;
      addIndividualEntry({
        type: prompt.key,
        content,
        date: dateString,
      });
    });

    Alert.alert("Saved", "Your journal entry was added.");
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <SectionCard title="Date" subtitle="Which day are you journaling about?">
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
        </Pressable>
      </SectionCard>

      {showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                maximumDate={new Date()}
                textColor={theme.colors.text}
                accentColor={theme.colors.text}
              />
            </View>
          </View>
        </Modal>
      )}

      <SectionCard title="Mood" subtitle="How was your day overall?">
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
                    mood === value ? theme.colors.text : theme.colors.border,
                  opacity: mood === value ? 1 : 0.6,
                },
              ]}
            >
              <Text style={styles.moodText}>{moodLabels[value] || value}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Journal Prompts">
        {journalPrompts.map((prompt) => (
          <View key={prompt.key} style={styles.inputBlock}>
            <Text style={styles.label}>
              {renderHighlightedLabel(prompt.label).map((part, index) => (
                <Text
                  key={index}
                  style={
                    part.highlight
                      ? styles.highlightedKeyword
                      : styles.normalText
                  }
                >
                  {part.text}
                </Text>
              ))}
            </Text>
            <TextInput
              style={styles.input}
              value={form[prompt.key]}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, [prompt.key]: text }))
              }
              ref={
                prompt.key === "highlight"
                  ? highlightRef
                  : prompt.key === "smile"
                    ? smileRef
                    : prompt.key === "grateful"
                      ? gratefulRef
                      : proudestMomentRef
              }
              returnKeyType={prompt.key === "proudestMoment" ? "done" : "next"}
              blurOnSubmit={prompt.key === "proudestMoment"}
              onSubmitEditing={() => {
                if (prompt.key === "highlight") smileRef.current?.focus();
                else if (prompt.key === "smile") gratefulRef.current?.focus();
                else if (prompt.key === "grateful")
                  proudestMomentRef.current?.focus();
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Enter") {
                  if (prompt.key === "highlight") smileRef.current?.focus();
                  else if (prompt.key === "smile") gratefulRef.current?.focus();
                  else if (prompt.key === "grateful")
                    proudestMomentRef.current?.focus();
                }
              }}
              multiline
            />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Daily Habits Completed">
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

      <SectionCard title="Post Privacy Settings">
        <View style={styles.switchRow}>
          <Text style={styles.label}>Share to friends feed</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={isPublic ? "#FFFFFF" : theme.colors.text}
          />
        </View>
      </SectionCard>

      <PrimaryButton label="Save Journal" onPress={submit} tone="yellow" />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: theme.spacing.lg,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickerDone: {
    color: "#e8c500",
    fontWeight: "700",
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  dateButtonText: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 16,
  },
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
  highlightedKeyword: {
    color: "#e8c500",
    fontWeight: "700",
  },
  normalText: {
    color: theme.colors.text,
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
