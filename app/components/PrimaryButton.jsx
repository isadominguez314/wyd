import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import theme from "../theme";

const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  tone = "primary",
}) => {
  const backgroundColor =
    tone === "green" ? theme.colors.green : theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
  },
  label: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default PrimaryButton;
