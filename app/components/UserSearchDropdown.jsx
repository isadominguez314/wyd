import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import theme from "../theme";

const UserSearchDropdown = ({
  visible,
  results,
  onSelect,
  emptyText = "No users found.",
}) => {
  if (!visible) return null;

  return (
    <View style={styles.dropdown}>
      {results.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        results.map((user) => (
          <Pressable
            key={user.username}
            style={styles.item}
            onPress={() => onSelect(user)}
          >
            <Text style={styles.primary}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.secondary}>@{user.username}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdown: {
    marginTop: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  item: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  primary: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  secondary: {
    color: theme.colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    color: theme.colors.mutedText,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});

export default UserSearchDropdown;
