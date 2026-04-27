import React, { useState } from "react";
import { Text, StyleSheet, TextInput, View, Switch, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import PrimaryButton from "../components/PrimaryButton";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const fields = ["read", "eat", "play", "obsess", "recommend", "treat"];

const WeeklyReportScreen = ({ navigation }) => {
  const { addWeeklyReport } = useAppContext();
  const [isPublic, setIsPublic] = useState(true);
  const [form, setForm] = useState({
    read: "",
    eat: "",
    play: "",
    obsess: "",
    recommend: "",
    treat: "",
  });

  const submit = () => {
    addWeeklyReport({
      ...form,
      public: isPublic,
      date: new Date().toISOString(),
    });

    Alert.alert("Saved", "Your weekly report was posted.");
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <SectionCard
        title="This week"
        subtitle="Capture your best recs and moments in one post."
      >
        {fields.map((field) => (
          <View key={field} style={styles.field}>
            <Text style={styles.label}>{field.toUpperCase()}</Text>
            <TextInput
              style={styles.input}
              value={form[field]}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, [field]: text }))
              }
              placeholder={`What did you ${field} this week?`}
            />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Post settings">
        <View style={styles.switchRow}>
          <Text style={styles.label}>Share to friends feed</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>
      </SectionCard>

      <PrimaryButton label="Save Weekly Report" onPress={submit} tone="green" />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
