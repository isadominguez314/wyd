import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import PrimaryButton from "../components/PrimaryButton";
import UserSearchDropdown from "../components/UserSearchDropdown";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const pillColors = [
  theme.colors.pink,
  theme.colors.green,
  theme.colors.blue,
  theme.colors.purple,
  theme.colors.orange,
];

const ProfileScreen = () => {
  const {
    state,
    updateHabits,
    updateFriends,
    addFriendByUsername,
    approveFriendRequest,
    declineFriendRequest,
    friendRequests,
    searchUsers,
    signOut,
    seedTest3ChartData,
    clearAppData,
  } = useAppContext();

  const [habitInput, setHabitInput] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [selectedFriendUsername, setSelectedFriendUsername] = useState("");
  const habitColors = state.userProfile.habitColors || {};

  const addHabit = () => {
    const next = habitInput.trim();
    if (!next) return;
    if (state.userProfile.habitsList.includes(next)) return;
    updateHabits([...state.userProfile.habitsList, next]);
    setHabitInput("");
  };

  const addFriend = async () => {
    const next = selectedFriendUsername || friendQuery.trim().toLowerCase();
    if (!next) return;

    const result = await addFriendByUsername(next);
    if (!result.ok) {
      Alert.alert("Cannot add friend", result.error);
      return;
    }

    setFriendQuery("");
    setSelectedFriendUsername("");
  };

  const friendResults = searchUsers({
    query: friendQuery,
    excludeUsernames: [
      state.userProfile.username,
      ...state.userProfile.friendsList,
      ...friendRequests.outgoing,
      ...friendRequests.incoming,
    ],
  });

  const confirmReset = () => {
    Alert.alert("Reset app data?", "This clears all local WYD entries.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await clearAppData();
          Alert.alert("Done", "Local data was cleared.");
        },
      },
    ]);
  };

  const handleSeedTestData = async () => {
    const result = await seedTest3ChartData();
    if (!result.ok) {
      Alert.alert("Seed failed", result.error);
      return;
    }

    Alert.alert(
      "Seed complete",
      `Generated ${result.count} daily journals for test3 across ${result.daysWindow} days with ${result.skippedDays} skipped days.`,
    );
  };

  return (
    <ScreenContainer>
      <SectionCard title="Profile">
        <ReadOnlyRow label="First name" value={state.userProfile.firstName} />
        <ReadOnlyRow label="Last name" value={state.userProfile.lastName} />
        <ReadOnlyRow label="Username" value={state.userProfile.username} />
      </SectionCard>

      <SectionCard title="Habits">
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={habitInput}
            onChangeText={setHabitInput}
            placeholder="Add habit"
          />
          <Pressable style={styles.smallButton} onPress={addHabit}>
            <Text style={styles.smallButtonText}>Add</Text>
          </Pressable>
        </View>
        <PillList
          items={state.userProfile.habitsList}
          colorMap={habitColors}
          onRemove={(item) =>
            updateHabits(
              state.userProfile.habitsList.filter((habit) => habit !== item),
            )
          }
        />
      </SectionCard>

      <SectionCard title="Friends">
        <Text style={styles.hint}>
          Sending a request does not grant access until the other person
          approves.
        </Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={friendQuery}
            onChangeText={(text) => {
              setFriendQuery(text);
              setSelectedFriendUsername("");
            }}
            placeholder="Search first name, last name, or username"
          />
        </View>
        <UserSearchDropdown
          visible={friendQuery.trim().length > 0}
          results={friendResults}
          onSelect={(user) => {
            setFriendQuery(
              `${user.firstName} ${user.lastName} (@${user.username})`,
            );
            setSelectedFriendUsername(user.username);
          }}
          emptyText="No matching users found."
        />
        <Pressable style={styles.smallButton} onPress={addFriend}>
          <Text style={styles.smallButtonText}>Send Request</Text>
        </Pressable>
        <PillList
          items={state.userProfile.friendsList}
          onRemove={(item) =>
            updateFriends(
              state.userProfile.friendsList.filter((friend) => friend !== item),
            )
          }
        />
      </SectionCard>

      <SectionCard title="Incoming Requests">
        {friendRequests.incoming.length === 0 ? (
          <Text style={styles.hint}>No incoming requests.</Text>
        ) : (
          friendRequests.incoming.map((username) => (
            <View key={username} style={styles.requestRow}>
              <Text style={styles.requestName}>{username}</Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={[styles.smallButton, styles.approveButton]}
                  onPress={() => approveFriendRequest(username)}
                >
                  <Text style={styles.smallButtonText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, styles.declineButton]}
                  onPress={() => declineFriendRequest(username)}
                >
                  <Text style={styles.smallButtonText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Outgoing Requests">
        {friendRequests.outgoing.length === 0 ? (
          <Text style={styles.hint}>No outgoing requests.</Text>
        ) : (
          <PillList items={friendRequests.outgoing} />
        )}
      </SectionCard>

      <PrimaryButton label="Sign Out" onPress={signOut} />

      <PrimaryButton
        label="Generate test3 chart data"
        onPress={handleSeedTestData}
      />

      <PrimaryButton label="Reset Local Data" onPress={confirmReset} />
    </ScreenContainer>
  );
};

const ReadOnlyRow = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.readOnlyValueBox}>
      <Text style={styles.readOnlyValueText}>{value || "-"}</Text>
    </View>
  </View>
);

const PillList = ({ items, onRemove, colorMap }) => (
  <View style={styles.pillWrap}>
    {items.length === 0 ? (
      <Text style={styles.hint}>Nothing added yet.</Text>
    ) : (
      items.map((item, idx) => (
        <Pressable
          key={item}
          onPress={() => onRemove?.(item)}
          disabled={!onRemove}
          style={[
            styles.pill,
            {
              backgroundColor:
                colorMap?.[item] || pillColors[idx % pillColors.length],
            },
          ]}
        >
          <Text style={styles.pillText}>{onRemove ? `${item} ×` : item}</Text>
        </Pressable>
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  flex: {
    flex: 1,
  },
  smallButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  smallButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  pill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  pillText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  hint: {
    color: theme.colors.mutedText,
  },
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  requestName: {
    color: theme.colors.text,
    fontWeight: "600",
    flex: 1,
  },
  requestActions: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  approveButton: {
    backgroundColor: theme.colors.green,
  },
  declineButton: {
    backgroundColor: theme.colors.pink,
  },
  readOnlyValueBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  readOnlyValueText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
});

export default ProfileScreen;
