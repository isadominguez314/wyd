import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import theme from "../theme";
import { useAppContext } from "../context/AppContext";
import { moodLabels } from "../utils/moodLabels";

const weeklyFieldMap = [
  { label: "Reading", key: "read" },
  { label: "Eating", key: "eat" },
  { label: "Playing", key: "play" },
  { label: "Obsessing", key: "obsess" },
  { label: "Recommending", key: "recommend" },
  { label: "Treating", key: "treat" },
];

const interactionSummary = (likes = [], comments = []) => ({
  likeCount: likes.length,
  commentCount: comments.length,
});

const getWeeklyFieldValue = (report, key) => {
  const legacyKeyMap = {
    read: "reading",
    eat: "eating",
    play: "playing",
    obsess: "obsessing",
    recommend: "recommending",
    treat: "treating",
  };

  return report[key] || report[legacyKeyMap[key]] || "";
};

const DailyJournalCard = ({
  post,
  isOwnPost,
  isLiked,
  onToggleLike,
  onCommentPress,
}) => {
  const moodColor = theme.moodColors[post.mood] || theme.colors.border;
  const { likeCount, commentCount } = interactionSummary(
    post.likes,
    post.comments,
  );

  return (
    <View style={[styles.card, { borderColor: moodColor, borderWidth: 2 }]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>
          <Text style={styles.cardUsername}>{post.author}</Text>
          {"'s Daily Journal"}
        </Text>
        {isOwnPost ? <Text style={styles.ownPostBadge}>Your post</Text> : null}
      </View>

      <Text style={styles.cardMeta}>
        {new Date(post.date).toLocaleDateString()} · Rating:{" "}
        {moodLabels[post.mood] || post.mood}
      </Text>

      {post.highlight ? (
        <Text style={styles.cardBody}>
          <Text style={styles.cardLabel}>Highlight: </Text>
          {post.highlight}
        </Text>
      ) : null}
      {post.smile ? (
        <Text style={styles.cardBody}>
          <Text style={styles.cardLabel}>Smile: </Text>
          {post.smile}
        </Text>
      ) : null}
      {post.grateful ? (
        <Text style={styles.cardBody}>
          <Text style={styles.cardLabel}>Gratitude: </Text>
          {post.grateful}
        </Text>
      ) : null}
      {post.proudestMoment ? (
        <Text style={styles.cardBody}>
          <Text style={styles.cardLabel}>Proudest Moment: </Text>
          {post.proudestMoment}
        </Text>
      ) : null}
      <Text style={styles.cardBody}>
        <Text style={styles.cardLabel}>Habits: </Text>
        {(post.habits || []).join(", ") || "None"}
      </Text>

      <View style={styles.cardActions}>
        <Pressable style={styles.actionButton} onPress={onToggleLike}>
          <MaterialCommunityIcons
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? "#F8C8C8" : theme.colors.mutedText}
          />
          <Text style={styles.actionText}>{likeCount}</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onCommentPress}>
          <MaterialCommunityIcons
            name="comment-outline"
            size={20}
            color={theme.colors.mutedText}
          />
          <Text style={styles.actionText}>{commentCount}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const WeeklyReportCard = ({
  post,
  isOwnPost,
  isLiked,
  onToggleLike,
  onCommentPress,
}) => {
  const filledFields = weeklyFieldMap.filter((field) => {
    const value = getWeeklyFieldValue(post, field.key);
    return value && value.trim().length > 0;
  });
  const { likeCount, commentCount } = interactionSummary(
    post.likes,
    post.comments,
  );

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.colors.border, borderWidth: 1 },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>
          <Text style={styles.cardUsername}>{post.author}</Text>
          {"'s Weekly R.E.P.O.R.T."}
        </Text>
        {isOwnPost ? <Text style={styles.ownPostBadge}>Your post</Text> : null}
      </View>

      <Text style={styles.cardMeta}>
        {new Date(post.date).toLocaleDateString()}
      </Text>

      {filledFields.length === 0 ? (
        <Text style={styles.cardHint}>No details shared.</Text>
      ) : (
        <Text style={styles.weeklyLine}>
          {filledFields.map((field, index) => {
            const value = getWeeklyFieldValue(post, field.key);

            return (
              <Text key={field.key}>
                <Text style={styles.cardLabel}>{field.label}:</Text> {value}
                {index < filledFields.length - 1 ? "   " : ""}
              </Text>
            );
          })}
        </Text>
      )}

      <View style={styles.cardActions}>
        <Pressable style={styles.actionButton} onPress={onToggleLike}>
          <MaterialCommunityIcons
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? "#F8C8C8" : theme.colors.mutedText}
          />
          <Text style={styles.actionText}>{likeCount}</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onCommentPress}>
          <MaterialCommunityIcons
            name="comment-outline"
            size={20}
            color={theme.colors.mutedText}
          />
          <Text style={styles.actionText}>{commentCount}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const FeedScreen = () => {
  const {
    state,
    auth,
    toggleLikeOnDailyJournal,
    toggleLikeOnWeeklyReport,
    addCommentOnDailyJournal,
    addCommentOnWeeklyReport,
  } = useAppContext();

  const [searchText, setSearchText] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedFriendFilters, setSelectedFriendFilters] = useState(["all"]);

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState(null);
  const [commentingPostKind, setCommentingPostKind] = useState(null);
  const [commentText, setCommentText] = useState("");

  const currentUsername = auth.currentUsername || state.userProfile.username;
  const friendSet = new Set([
    currentUsername,
    ...(state.userProfile.friendsList || []),
  ]);

  const posts = useMemo(() => {
    const dailyPosts = state.dailyJournals
      .filter((entry) => entry.public)
      .map((entry, index) => ({
        id: `daily-${entry.date}-${index}`,
        kind: "daily",
        author: entry.username || currentUsername || "Friend",
        mood: entry.mood,
        highlight: entry.highlight,
        smile: entry.smile,
        grateful: entry.grateful,
        proudestMoment: entry.proudestMoment,
        habits: entry.habits,
        date: entry.date,
        likes: entry.likes || [],
        comments: entry.comments || [],
      }));

    const weeklyPosts = state.weeklyReports
      .filter((entry) => entry.public)
      .map((entry, index) => ({
        id: `weekly-${entry.date}-${index}`,
        kind: "weekly",
        author: entry.username || currentUsername || "Friend",
        read: getWeeklyFieldValue(entry, "read"),
        eat: getWeeklyFieldValue(entry, "eat"),
        play: getWeeklyFieldValue(entry, "play"),
        obsess: getWeeklyFieldValue(entry, "obsess"),
        recommend: getWeeklyFieldValue(entry, "recommend"),
        treat: getWeeklyFieldValue(entry, "treat"),
        date: entry.date,
        likes: entry.likes || [],
        comments: entry.comments || [],
      }));

    return [...dailyPosts, ...weeklyPosts]
      .filter((post) => friendSet.has(post.author))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [
    currentUsername,
    friendSet,
    state.dailyJournals,
    state.userProfile.friendsList,
    state.weeklyReports,
  ]);

  const uniqueFriends = useMemo(() => {
    const friendSet = new Set(posts.map((post) => post.author));
    return Array.from(friendSet).sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let filtered = posts;

    if (selectedTypeFilter !== "all") {
      filtered =
        selectedTypeFilter === "daily"
          ? filtered.filter((post) => post.kind === "daily")
          : filtered.filter((post) => post.kind === "weekly");
    }

    if (!selectedFriendFilters.includes("all")) {
      filtered = filtered.filter((post) =>
        selectedFriendFilters.includes(post.author),
      );
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((post) => {
        const searchableText = [
          post.author,
          post.highlight,
          post.smile,
          post.grateful,
          post.proudestMoment,
          post.read,
          post.eat,
          post.play,
          post.obsess,
          post.recommend,
          post.treat,
          (post.habits || []).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    return filtered;
  }, [posts, selectedTypeFilter, selectedFriendFilters, searchText]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === commentingPostId) || null,
    [posts, commentingPostId],
  );

  const closeComments = () => {
    setShowCommentModal(false);
    setCommentingPostId(null);
    setCommentingPostKind(null);
    setCommentText("");
  };

  const toggleLike = (post) => {
    if (post.kind === "daily") {
      toggleLikeOnDailyJournal(post.date, currentUsername);
      return;
    }

    toggleLikeOnWeeklyReport(post.date, currentUsername);
  };

  const toggleFriendFilter = (friend) => {
    setSelectedFriendFilters((prev) => {
      if (friend === "all") return ["all"];

      const withoutAll = prev.filter((item) => item !== "all");
      if (withoutAll.includes(friend)) {
        const next = withoutAll.filter((item) => item !== friend);
        return next.length === 0 ? ["all"] : next;
      }

      return [...withoutAll, friend];
    });
  };

  const openCommentModal = (post) => {
    setCommentingPostId(post.id);
    setCommentingPostKind(post.kind);
    setShowCommentModal(true);
  };

  const addComment = () => {
    const text = commentText.trim();
    if (!text || !selectedPost) return;

    if (commentingPostKind === "daily") {
      addCommentOnDailyJournal(selectedPost.date, currentUsername, text);
    } else {
      addCommentOnWeeklyReport(selectedPost.date, currentUsername, text);
    }

    setCommentText("");
  };

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Friends Feed</Text>
        <Text style={styles.screenSubtitle}>
          Public posts from your friend network.
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={theme.colors.mutedText}
        />
      </View>

      <View style={styles.dropdownRow}>
        <View style={styles.dropdownWrap}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => {
              setShowTypeDropdown((prev) => !prev);
              setShowFriendsDropdown(false);
            }}
          >
            <Text style={styles.dropdownLabel}>Post Type</Text>
            <Text style={styles.dropdownValue}>
              {selectedTypeFilter === "all"
                ? "All"
                : selectedTypeFilter === "daily"
                  ? "Daily"
                  : "Weekly"}
            </Text>
          </Pressable>
          {showTypeDropdown ? (
            <View style={styles.dropdownMenu}>
              {[
                { key: "all", label: "All" },
                { key: "daily", label: "Daily Journal" },
                { key: "weekly", label: "Weekly R.E.P.O.R.T." },
              ].map((option) => (
                <Pressable
                  key={option.key}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedTypeFilter(option.key);
                    setShowTypeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{option.label}</Text>
                  {selectedTypeFilter === option.key ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={theme.colors.text}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.dropdownWrap}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => {
              setShowFriendsDropdown((prev) => !prev);
              setShowTypeDropdown(false);
            }}
          >
            <Text style={styles.dropdownLabel}>People</Text>
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {selectedFriendFilters.includes("all")
                ? "All"
                : `${selectedFriendFilters.length} selected`}
            </Text>
          </Pressable>
          {showFriendsDropdown ? (
            <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
              <Pressable
                style={styles.dropdownItem}
                onPress={() => toggleFriendFilter("all")}
              >
                <Text style={styles.dropdownItemText}>All</Text>
                {selectedFriendFilters.includes("all") ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={theme.colors.text}
                  />
                ) : null}
              </Pressable>
              {uniqueFriends.map((friend) => (
                <Pressable
                  key={friend}
                  style={styles.dropdownItem}
                  onPress={() => toggleFriendFilter(friend)}
                >
                  <Text style={styles.dropdownItemText}>{friend}</Text>
                  {selectedFriendFilters.includes(friend) ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={theme.colors.text}
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>

      {filteredPosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.hint}>
            {searchText
              ? "No posts match your search."
              : "No public posts yet."}
          </Text>
        </View>
      ) : (
        filteredPosts.map((post) =>
          post.kind === "daily" ? (
            <DailyJournalCard
              key={post.id}
              post={post}
              isOwnPost={post.author === currentUsername}
              isLiked={(post.likes || []).includes(currentUsername)}
              onToggleLike={() => toggleLike(post)}
              onCommentPress={() => openCommentModal(post)}
            />
          ) : (
            <WeeklyReportCard
              key={post.id}
              post={post}
              isOwnPost={post.author === currentUsername}
              isLiked={(post.likes || []).includes(currentUsername)}
              onToggleLike={() => toggleLike(post)}
              onCommentPress={() => openCommentModal(post)}
            />
          ),
        )
      )}

      <Modal
        visible={showCommentModal}
        transparent
        animationType="fade"
        onRequestClose={closeComments}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          style={styles.commentModalOverlay}
        >
          <View style={styles.commentModalContent}>
            <View style={styles.commentModalHeader}>
              <Text style={styles.commentModalTitle}>Comments</Text>
              <Pressable onPress={closeComments}>
                <Text style={styles.commentModalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.commentList}
              contentContainerStyle={styles.commentListContent}
              keyboardShouldPersistTaps="handled"
            >
              {selectedPost?.comments?.length ? (
                selectedPost.comments.map((comment, index) => (
                  <View
                    key={`${comment.username}-${comment.date}-${index}`}
                    style={styles.commentBubble}
                  >
                    <Text style={styles.commentAuthor}>{comment.username}</Text>
                    <Text style={styles.commentBody}>{comment.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.commentEmpty}>No comments yet.</Text>
              )}
            </ScrollView>

            <TextInput
              style={styles.commentInput}
              placeholder="Write your comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              placeholderTextColor={theme.colors.mutedText}
              autoFocus
            />

            <View style={styles.commentModalFooter}>
              <Pressable
                style={styles.commentCancelButton}
                onPress={closeComments}
              >
                <Text style={styles.commentCancelButtonText}>Close</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.commentSubmitButton,
                  !commentText.trim() && styles.commentSubmitButtonDisabled,
                ]}
                onPress={addComment}
                disabled={!commentText.trim()}
              >
                <Text style={styles.commentSubmitButtonText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    gap: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  screenSubtitle: {
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 14,
  },
  dropdownRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    zIndex: 10,
  },
  dropdownWrap: {
    flex: 1,
    position: "relative",
  },
  dropdownTrigger: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 52,
    justifyContent: "center",
  },
  dropdownLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: "600",
  },
  dropdownValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  dropdownMenu: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    maxHeight: 230,
    zIndex: 30,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F2E4",
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  ownPostBadge: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  actionText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: "600",
    flexShrink: 1,
  },
  cardUsername: {
    fontWeight: "700",
    color: theme.colors.text,
  },
  cardMeta: {
    color: theme.colors.mutedText,
    fontSize: 12,
    marginBottom: 2,
  },
  cardBody: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  cardLabel: {
    fontWeight: "700",
    color: theme.colors.text,
  },
  cardHint: {
    color: theme.colors.mutedText,
    fontSize: 13,
  },
  weeklyLine: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hint: {
    color: theme.colors.mutedText,
  },
  commentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  commentModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    maxHeight: "75%",
  },
  commentModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  commentModalClose: {
    fontSize: 24,
    color: theme.colors.mutedText,
  },
  commentList: {
    maxHeight: 240,
    marginBottom: theme.spacing.md,
  },
  commentListContent: {
    gap: theme.spacing.sm,
  },
  commentBubble: {
    backgroundColor: "#FFFDF7",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  commentAuthor: {
    color: theme.colors.text,
    fontWeight: "700",
    marginBottom: 2,
  },
  commentBody: {
    color: theme.colors.text,
    lineHeight: 18,
  },
  commentEmpty: {
    color: theme.colors.mutedText,
  },
  commentInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 86,
    textAlignVertical: "top",
    marginBottom: theme.spacing.md,
  },
  commentModalFooter: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  commentCancelButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  commentCancelButtonText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  commentSubmitButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  commentSubmitButtonDisabled: {
    opacity: 0.5,
  },
  commentSubmitButtonText: {
    color: "#2E2A2A",
    fontWeight: "700",
  },
});

export default FeedScreen;
