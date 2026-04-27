import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";

const FeedScreen = () => {
  const { state } = useAppContext();
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});

  const posts = useMemo(() => {
    const friends = state.userProfile.friendsList || [];

    const dailyPosts = state.dailyJournals
      .filter((entry) => entry.public)
      .map((entry, index) => ({
        id: `daily-${entry.date}-${index}`,
        kind: "Daily",
        author: friends[index % Math.max(friends.length, 1)] || "Friend",
        body: entry.highlight || entry.grateful || "Shared a daily check-in",
        mood: entry.mood,
        date: entry.date,
      }));

    const weeklyPosts = state.weeklyReports
      .filter((entry) => entry.public)
      .map((entry, index) => ({
        id: `weekly-${entry.date}-${index}`,
        kind: "Weekly",
        author: friends[index % Math.max(friends.length, 1)] || "Friend",
        body: entry.recommend || entry.read || "Shared their weekly report",
        date: entry.date,
      }));

    return [...dailyPosts, ...weeklyPosts].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
  }, [state.dailyJournals, state.userProfile.friendsList, state.weeklyReports]);

  const toggleLike = (postId) => {
    setLikes((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <ScreenContainer>
      <SectionCard
        title="Friends Feed"
        subtitle="Public posts from your friend network."
      >
        {posts.length === 0 ? (
          <Text style={styles.hint}>
            No public posts yet. Share one from Journal or Weekly.
          </Text>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.post}>
              <Text style={styles.author}>{post.author}</Text>
              <Text style={styles.meta}>
                {post.kind} · {new Date(post.date).toLocaleDateString()}
              </Text>
              <Text style={styles.body}>{post.body}</Text>
              {post.mood ? (
                <Text style={styles.meta}>Mood: {post.mood}/7</Text>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => toggleLike(post.id)}
                >
                  <Text style={styles.actionText}>
                    {likes[post.id] ? "Liked" : "Like"}
                  </Text>
                </Pressable>
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment"
                value={comments[post.id] || ""}
                onChangeText={(text) =>
                  setComments((prev) => ({
                    ...prev,
                    [post.id]: text,
                  }))
                }
              />
            </View>
          ))
        )}
      </SectionCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  hint: {
    color: theme.colors.mutedText,
  },
  post: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: 4,
  },
  author: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  meta: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  body: {
    color: theme.colors.text,
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionButton: {
    backgroundColor: theme.colors.pink,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  actionText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  commentInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});

export default FeedScreen;
