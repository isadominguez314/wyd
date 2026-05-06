import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TextInput,
  View,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import PrimaryButton from "../components/PrimaryButton";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const getWeekStart = (dateInput) => {
  const date = new Date(dateInput);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

const fields = [
  { label: "Reading", key: "read" },
  { label: "Eating", key: "eat" },
  { label: "Playing", key: "play" },
  { label: "Obsessing Over", key: "obsess" },
  { label: "Recommending", key: "recommend" },
  { label: "Treating", key: "treat" },
];

const WeeklyReportScreen = ({ navigation, route }) => {
  const { addWeeklyReport, updateWeeklyReport } = useAppContext();
  const editingReport = route?.params?.report || null;
  const isEditing = Boolean(editingReport?.id);
  const [isPublic, setIsPublic] = useState(
    editingReport?.is_public ?? editingReport?.public ?? true,
  );
  // Refs for keyboard navigation
  const readRef = React.useRef(null);
  const eatRef = React.useRef(null);
  const playRef = React.useRef(null);
  const obsessRef = React.useRef(null);
  const recommendRef = React.useRef(null);
  const treatRef = React.useRef(null);

  const [form, setForm] = useState({
    read: editingReport?.read || "",
    eat: editingReport?.eat || "",
    play: editingReport?.play || "",
    obsess: editingReport?.obsess || "",
    recommend: editingReport?.recommend || "",
    treat: editingReport?.treat || "",
  });
  const submitLabel = isEditing ? "Update Weekly Report" : "Save Weekly Report";

  const submit = async () => {
    const weekStart =
      editingReport?.week_start ||
      editingReport?.date ||
      getWeekStart(new Date());
    const payload = {
      ...form,
      public: isPublic,
      weekStart,
      week_start: weekStart,
      date: weekStart,
    };

    const result = isEditing
      ? await updateWeeklyReport(editingReport.id, payload)
      : await addWeeklyReport(payload);

    if (!result?.ok) {
      Alert.alert(
        "Save failed",
        result?.error || "Could not save weekly report.",
      );
      return;
    }

    Alert.alert(
      "Saved",
      isEditing
        ? "Your weekly report was updated."
        : "Your weekly report was posted.",
    );
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScreenContainer contentContainerStyle={styles.contentContainer}>
        <SectionCard
          title="Weekly R.E.P.O.R.T."
          subtitle="Capture everything you've been into this week."
        >
          {fields.map((field) => (
            <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label.toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={form[field.key]}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, [field.key]: text }))
                }
                ref={
                  field.key === "read"
                    ? readRef
                    : field.key === "eat"
                      ? eatRef
                      : field.key === "play"
                        ? playRef
                        : field.key === "obsess"
                          ? obsessRef
                          : field.key === "recommend"
                            ? recommendRef
                            : treatRef
                }
                returnKeyType={field.key === "treat" ? "done" : "next"}
                blurOnSubmit={field.key === "treat"}
                onSubmitEditing={() => {
                  if (field.key === "read") eatRef.current?.focus();
                  else if (field.key === "eat") playRef.current?.focus();
                  else if (field.key === "play") obsessRef.current?.focus();
                  else if (field.key === "obsess")
                    recommendRef.current?.focus();
                  else if (field.key === "recommend") treatRef.current?.focus();
                }}
                placeholder={`What have you been ${field.label.toLowerCase()} this week?`}
              />
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Post settings">
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

        <PrimaryButton label={submitLabel} onPress={submit} tone="yellow" />
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl * 2,
  },
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default WeeklyReportScreen;
