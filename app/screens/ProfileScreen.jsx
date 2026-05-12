import React, { useState, useEffect } from "react";
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
    deleteAccount,
  } = useAppContext();

  const [habitInput, setHabitInput] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [selectedFriendHandle, setSelectedFriendHandle] = useState("");
  const [selectedFriendDisplay, setSelectedFriendDisplay] = useState("");
  const [friendResults, setFriendResults] = useState([]);
  const habitColors = state.userProfile.habitColors || {};

  const addHabit = () => {
    const next = habitInput.trim();
    if (!next) return;
    if (state.userProfile.habitsList.includes(next)) return;
    updateHabits([...state.userProfile.habitsList, next]);
    setHabitInput("");
  };

  const addFriend = async () => {
    const next = selectedFriendHandle || friendQuery.trim().toLowerCase();
    if (!next) return;

    const result = await addFriendByUsername(next);
    if (!result.ok) {
      Alert.alert("Cannot add friend", result.error);
      return;
    }

    setFriendQuery("");
    setSelectedFriendHandle("");
  };

  useEffect(() => {
    console.log("[ProfileScreen] Component mounted/updated");
    console.log("[ProfileScreen] Outgoing requests:", friendRequests.outgoing);
    console.log("[ProfileScreen] Incoming requests:", friendRequests.incoming);
    console.log("[ProfileScreen] Friends list:", state.userProfile.friendsList);
  }, [state.userProfile.friendsList, friendRequests]);

  useEffect(() => {
    if (!friendQuery.trim()) {
      setFriendResults([]);
      return;
    }

    const fetchFriendResults = async () => {
      try {
        console.log("[PROFILE DEBUG] Searching for friends:", friendQuery);
        const results = await searchUsers({
          query: friendQuery,
          excludeUsernames: [
            state.userProfile.handle,
            ...state.userProfile.friendsList,
            ...friendRequests.outgoing.map(
              (request) => request.addressee?.handle || "",
            ),
            ...friendRequests.incoming.map(
              (request) => request.requester?.handle || "",
            ),
          ],
        });
        console.log("[PROFILE DEBUG] Search results:", results);
        setFriendResults(results || []);
      } catch (error) {
        console.error("[PROFILE DEBUG] Error fetching friend results:", error);
        setFriendResults([]);
      }
    };

    fetchFriendResults();
  }, [
    friendQuery,
    state.userProfile.handle,
    state.userProfile.friendsList,
    friendRequests,
  ]);

  return (
    <ScreenContainer>
      <SectionCard
        title={`${state.userProfile.firstName} ${state.userProfile.lastName}`}
        subtitle={`@${state.userProfile.handle}`}
      ></SectionCard>

      <SectionCard title="Habits">
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={habitInput}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={addHabit}
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
            value={
              selectedFriendHandle
                ? `${selectedFriendDisplay} (@${selectedFriendHandle})`
                : friendQuery
            }
            onChangeText={(text) => {
              setFriendQuery(text);
              if (selectedFriendHandle) {
                setSelectedFriendHandle("");
                setSelectedFriendDisplay("");
              }
            }}
            placeholder="Search first name, last name, email, or handle"
          />
        </View>
        <UserSearchDropdown
          visible={friendQuery.trim().length > 0 && !selectedFriendHandle}
          results={friendResults}
          onSelect={(user) => {
            setSelectedFriendHandle(user.handle || user.username);
            setSelectedFriendDisplay(
              `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            );
            setFriendQuery("");
            setFriendResults([]);
          }}
          emptyText="No matching users found."
          plainEmpty={true}
        />
        <Pressable style={styles.smallButton} onPress={addFriend}>
          <Text style={styles.smallButtonText}>Send Request</Text>
        </Pressable>
        <FriendList friends={state.userProfile.friendProfiles || []} />
      </SectionCard>

      <SectionCard title="Incoming Requests">
        {friendRequests.incoming.length === 0 ? (
          <Text style={styles.hint}>No incoming requests.</Text>
        ) : (
          friendRequests.incoming.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Text style={styles.requestName}>
                @{request.requester?.handle || request.requester_id}
              </Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={[styles.smallButton, styles.approveButton]}
                  onPress={() => approveFriendRequest(request.id)}
                >
                  <Text style={styles.smallButtonText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, styles.declineButton]}
                  onPress={() => declineFriendRequest(request.id)}
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
          <PillList
            items={friendRequests.outgoing.map(
              (request) => request.addressee?.handle || request.addressee_id,
            )}
          />
        )}
      </SectionCard>

      <PrimaryButton label="Sign Out" onPress={signOut} />
      <PrimaryButton
        label="Delete Account"
        onPress={() => {
          Alert.alert(
            "Delete account",
            "This will permanently delete your account and all associated data. This action cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    const res = await deleteAccount();
                    if (!res?.ok) {
                      Alert.alert(
                        "Error",
                        res?.error || "Unable to delete account.",
                      );
                      return;
                    }
                    Alert.alert(
                      "Deleted",
                      "Your account and data have been deleted.",
                    );
                  } catch (err) {
                    console.error("Delete account error:", err);
                    Alert.alert("Error", "Unable to delete account.");
                  }
                },
              },
            ],
          );
        }}
      />
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

const FriendList = ({ friends }) => (
  <View style={styles.pillWrap}>
    {friends.length === 0 ? (
      <Text style={styles.hint}>No friends yet.</Text>
    ) : (
      friends.map((friend, idx) => (
        <View
          key={friend.id || friend.handle || idx}
          style={[
            styles.pill,
            { backgroundColor: pillColors[idx % pillColors.length] },
          ]}
        >
          <Text style={styles.pillText}>@{friend.handle}</Text>
        </View>
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
