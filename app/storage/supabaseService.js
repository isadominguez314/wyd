import supabase from "./supabaseClient";

/**
 * ============================================
 * PROFILE OPERATIONS
 * ============================================
 */

export const createProfile = async (
  userId,
  { email, handle, firstName, lastName, avatarUrl = null },
) => {
  const { data, error } = await supabase
    .from("profiles")
    .insert([
      {
        id: userId,
        email,
        handle,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
};

export const getProfileByHandle = async (handle) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
  return data || null;
};

export const listProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, first_name, last_name, avatar_url")
    .order("handle", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const listProfilesByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, first_name, last_name, avatar_url")
    .in("id", ids);

  if (error) throw error;
  return data || [];
};

export const updateProfile = async (userId, updates) => {
  const mappedUpdates = {};
  if (updates.firstName) mappedUpdates.first_name = updates.firstName;
  if (updates.lastName) mappedUpdates.last_name = updates.lastName;
  if (updates.avatarUrl !== undefined)
    mappedUpdates.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .update(mappedUpdates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const searchProfiles = async (query, limit = 8) => {
  const normalizedQuery = `%${query.toLowerCase()}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, first_name, last_name, avatar_url")
    .or(
      `first_name.ilike.${normalizedQuery},last_name.ilike.${normalizedQuery},handle.ilike.${normalizedQuery}`,
    )
    .limit(limit);

  if (error) throw error;
  return data;
};

/**
 * ============================================
 * HABIT OPERATIONS
 * ============================================
 */

export const createHabit = async (
  userId,
  { name, color = null, sortOrder = 0 },
) => {
  const { data, error } = await supabase
    .from("user_habits")
    .insert([
      {
        user_id: userId,
        name,
        color,
        sort_order: sortOrder,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserHabits = async (userId) => {
  const { data, error } = await supabase
    .from("user_habits")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const updateHabit = async (habitId, updates) => {
  const mappedUpdates = {};
  if (updates.name !== undefined) mappedUpdates.name = updates.name;
  if (updates.color !== undefined) mappedUpdates.color = updates.color;
  if (updates.sortOrder !== undefined)
    mappedUpdates.sort_order = updates.sortOrder;
  if (updates.isActive !== undefined)
    mappedUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("user_habits")
    .update(mappedUpdates)
    .eq("id", habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteHabit = async (habitId) => {
  const { error } = await supabase
    .from("user_habits")
    .delete()
    .eq("id", habitId);

  if (error) throw error;
};

/**
 * ============================================
 * DAILY JOURNAL OPERATIONS
 * ============================================
 */

export const createDailyJournal = async (
  userId,
  {
    entryDate,
    date,
    mood,
    highlight,
    smile,
    grateful,
    proudestMoment,
    isPublic = true,
    public: publicFlag,
  },
) => {
  const resolvedEntryDate = entryDate || date;
  const resolvedIsPublic = publicFlag === undefined ? isPublic : publicFlag;

  const { data, error } = await supabase
    .from("daily_journals")
    .insert([
      {
        user_id: userId,
        entry_date: resolvedEntryDate,
        mood,
        highlight,
        smile,
        grateful,
        proudest_moment: proudestMoment,
        is_public: resolvedIsPublic,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getDailyJournal = async (journalId) => {
  const { data, error } = await supabase
    .from("daily_journals")
    .select("*")
    .eq("id", journalId)
    .single();

  if (error) throw error;
  return data;
};

export const getUserDailyJournals = async (userId) => {
  const { data, error } = await supabase
    .from("daily_journals")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getFriendsFeedJournals = async (userId) => {
  // Avoid nested relationship select (PostgREST schema cache errors).
  // Select the journal rows and aggregate counts, then hydrate author
  // profiles with a separate query to prevent PGRST200 relationship issues.
  const { data, error } = await supabase
    .from("daily_journals")
    .select("*, daily_journal_likes(count), daily_journal_comments(count)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const journals = data || [];
  const userIds = [...new Set(journals.map((j) => j.user_id).filter(Boolean))];
  const profiles = userIds.length > 0 ? await listProfilesByIds(userIds) : [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return journals.map((j) => ({
    ...j,
    profiles: profileById.get(j.user_id) || null,
  }));
};

export const updateDailyJournal = async (journalId, updates) => {
  const mappedUpdates = {};
  if (updates.mood !== undefined) mappedUpdates.mood = updates.mood;
  if (updates.entryDate !== undefined || updates.date !== undefined)
    mappedUpdates.entry_date = updates.entryDate ?? updates.date;
  if (updates.highlight !== undefined)
    mappedUpdates.highlight = updates.highlight;
  if (updates.smile !== undefined) mappedUpdates.smile = updates.smile;
  if (updates.grateful !== undefined) mappedUpdates.grateful = updates.grateful;
  if (updates.proudestMoment !== undefined)
    mappedUpdates.proudest_moment = updates.proudestMoment;
  if (updates.isPublic !== undefined)
    mappedUpdates.is_public = updates.isPublic;

  const { data, error } = await supabase
    .from("daily_journals")
    .update(mappedUpdates)
    .eq("id", journalId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDailyJournal = async (journalId) => {
  const { error } = await supabase
    .from("daily_journals")
    .delete()
    .eq("id", journalId);

  if (error) throw error;
};

/**
 * ============================================
 * DAILY JOURNAL HABITS (JUNCTION TABLE)
 * ============================================
 */

export const addHabitToJournal = async (journalId, habitId) => {
  const { error } = await supabase.from("daily_journal_habits").insert([
    {
      journal_id: journalId,
      habit_id: habitId,
    },
  ]);

  if (error) throw error;
};

export const getJournalHabits = async (journalId) => {
  const { data, error } = await supabase
    .from("daily_journal_habits")
    .select("habit_id, user_habits(*)")
    .eq("journal_id", journalId);

  if (error) throw error;
  return data?.map((item) => item.user_habits) || [];
};

export const removeHabitFromJournal = async (journalId, habitId) => {
  const { error } = await supabase
    .from("daily_journal_habits")
    .delete()
    .eq("journal_id", journalId)
    .eq("habit_id", habitId);

  if (error) throw error;
};

/**
 * ============================================
 * WEEKLY REPORT OPERATIONS
 * ============================================
 */

export const createWeeklyReport = async (
  userId,
  { weekStart, read, eat, play, obsess, recommend, treat, isPublic = true },
) => {
  const { data, error } = await supabase
    .from("weekly_reports")
    .insert([
      {
        user_id: userId,
        week_start: weekStart,
        read,
        eat,
        play,
        obsess,
        recommend,
        treat,
        is_public: isPublic,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getWeeklyReport = async (reportId) => {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error) throw error;
  return data;
};

export const getUserWeeklyReports = async (userId) => {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getFriendsFeedReports = async (userId) => {
  // Same approach as journals: avoid nested relationship selects and hydrate
  // profiles separately to prevent schema-cache lookup failures.
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*, weekly_report_likes(count), weekly_report_comments(count)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const reports = data || [];
  const userIds = [...new Set(reports.map((r) => r.user_id).filter(Boolean))];
  const profiles = userIds.length > 0 ? await listProfilesByIds(userIds) : [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return reports.map((r) => ({
    ...r,
    profiles: profileById.get(r.user_id) || null,
  }));
};

export const getUserDailyJournalLikeIds = async (userId) => {
  const { data, error } = await supabase
    .from("daily_journal_likes")
    .select("journal_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((row) => row.journal_id);
};

export const getUserWeeklyReportLikeIds = async (userId) => {
  const { data, error } = await supabase
    .from("weekly_report_likes")
    .select("report_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((row) => row.report_id);
};

export const updateWeeklyReport = async (reportId, updates) => {
  const mappedUpdates = {};
  if (updates.weekStart !== undefined || updates.week_start !== undefined)
    mappedUpdates.week_start = updates.weekStart ?? updates.week_start;
  if (updates.read !== undefined) mappedUpdates.read = updates.read;
  if (updates.eat !== undefined) mappedUpdates.eat = updates.eat;
  if (updates.play !== undefined) mappedUpdates.play = updates.play;
  if (updates.obsess !== undefined) mappedUpdates.obsess = updates.obsess;
  if (updates.recommend !== undefined)
    mappedUpdates.recommend = updates.recommend;
  if (updates.treat !== undefined) mappedUpdates.treat = updates.treat;
  if (updates.isPublic !== undefined)
    mappedUpdates.is_public = updates.isPublic;

  const { data, error } = await supabase
    .from("weekly_reports")
    .update(mappedUpdates)
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteWeeklyReport = async (reportId) => {
  const { error } = await supabase
    .from("weekly_reports")
    .delete()
    .eq("id", reportId);

  if (error) throw error;
};

/**
 * ============================================
 * INDIVIDUAL ENTRIES OPERATIONS
 * ============================================
 */

export const createIndividualEntry = async (
  userId,
  { entryType, type, content, entryDate, date, journalId = null },
) => {
  const resolvedEntryType = entryType || type;
  const resolvedEntryDate = entryDate || date;

  const { data, error } = await supabase
    .from("individual_entries")
    .insert([
      {
        user_id: userId,
        entry_type: resolvedEntryType,
        content,
        entry_date: resolvedEntryDate,
        journal_id: journalId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getIndividualEntry = async (entryId) => {
  const { data, error } = await supabase
    .from("individual_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (error) throw error;
  return data;
};

export const getUserIndividualEntries = async (userId) => {
  const { data, error } = await supabase
    .from("individual_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const updateIndividualEntry = async (entryId, updates) => {
  const mappedUpdates = {};
  if (updates.content !== undefined) mappedUpdates.content = updates.content;

  const { data, error } = await supabase
    .from("individual_entries")
    .update(mappedUpdates)
    .eq("id", entryId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteIndividualEntry = async (entryId) => {
  const { error } = await supabase
    .from("individual_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw error;
};

/**
 * ============================================
 * FRIEND REQUEST OPERATIONS
 * ============================================
 */

export const sendFriendRequest = async (requesterId, addresseeId) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .insert([
      {
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getIncomingFriendRequests = async (userId) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, requester_id, addressee_id, status, created_at, updated_at")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const requesterIds = [
    ...new Set((data || []).map((request) => request.requester_id)),
  ];
  const requesterProfiles =
    requesterIds.length > 0 ? await listProfilesByIds(requesterIds) : [];
  const requesterById = new Map(
    requesterProfiles.map((profile) => [profile.id, profile]),
  );

  return (data || []).map((request) => ({
    ...request,
    requester: requesterById.get(request.requester_id) || null,
  }));
};

export const getOutgoingFriendRequests = async (userId) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, requester_id, addressee_id, status, created_at, updated_at")
    .eq("requester_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const addresseeIds = [
    ...new Set((data || []).map((request) => request.addressee_id)),
  ];
  const addresseeProfiles =
    addresseeIds.length > 0 ? await listProfilesByIds(addresseeIds) : [];
  const addresseeById = new Map(
    addresseeProfiles.map((profile) => [profile.id, profile]),
  );

  return (data || []).map((request) => ({
    ...request,
    addressee: addresseeById.get(request.addressee_id) || null,
  }));
};

export const acceptFriendRequest = async (friendRequestId) => {
  const { data: request, error: fetchError } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("id", friendRequestId)
    .single();

  if (fetchError) throw fetchError;

  // Update friend request status
  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", friendRequestId);

  if (updateError) throw updateError;

  // Create friendship (ensure ordered pair with user_a_id < user_b_id)
  const [userId1, userId2] = [
    request.requester_id,
    request.addressee_id,
  ].sort();

  const { error: friendshipError } = await supabase.from("friendships").insert([
    {
      user_a_id: userId1,
      user_b_id: userId2,
    },
  ]);

  if (friendshipError) throw friendshipError;
};

export const declineFriendRequest = async (friendRequestId) => {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", friendRequestId);

  if (error) throw error;
};

export const cancelFriendRequest = async (friendRequestId) => {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "canceled" })
    .eq("id", friendRequestId);

  if (error) throw error;
};

/**
 * ============================================
 * FRIENDSHIP OPERATIONS
 * ============================================
 */

export const getFriends = async (userId) => {
  const { data: friendships, error: friendshipError } = await supabase
    .from("friendships")
    .select("user_a_id, user_b_id")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (friendshipError) throw friendshipError;

  const friendIds = friendships.map((f) =>
    f.user_a_id === userId ? f.user_b_id : f.user_a_id,
  );

  if (friendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, first_name, last_name, avatar_url")
    .in("id", friendIds);

  if (profileError) throw profileError;
  return profiles || [];
};

export const removeFriendship = async (userId1, userId2) => {
  // Ensure ordered pair
  const [userA, userB] = [userId1, userId2].sort();

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_a_id", userA)
    .eq("user_b_id", userB);

  if (error) throw error;
};

export const areFriends = async (userId1, userId2) => {
  const { data, error } = await supabase
    .from("friendships")
    .select("id")
    .or(
      `and(user_a_id.eq.${userId1},user_b_id.eq.${userId2}),and(user_a_id.eq.${userId2},user_b_id.eq.${userId1})`,
    )
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
  return !!data;
};

/**
 * ============================================
 * LIKES OPERATIONS
 * ============================================
 */

export const toggleDailyJournalLike = async (journalId, userId) => {
  // Check if already liked
  const { data: existing } = await supabase
    .from("daily_journal_likes")
    .select("*")
    .eq("journal_id", journalId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from("daily_journal_likes")
      .delete()
      .eq("journal_id", journalId)
      .eq("user_id", userId);

    if (error) throw error;
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase.from("daily_journal_likes").insert([
      {
        journal_id: journalId,
        user_id: userId,
      },
    ]);

    if (error) throw error;
    return { liked: true };
  }
};

export const toggleWeeklyReportLike = async (reportId, userId) => {
  // Check if already liked
  const { data: existing } = await supabase
    .from("weekly_report_likes")
    .select("*")
    .eq("report_id", reportId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from("weekly_report_likes")
      .delete()
      .eq("report_id", reportId)
      .eq("user_id", userId);

    if (error) throw error;
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase.from("weekly_report_likes").insert([
      {
        report_id: reportId,
        user_id: userId,
      },
    ]);

    if (error) throw error;
    return { liked: true };
  }
};

export const getDailyJournalLikes = async (journalId) => {
  const { data, error } = await supabase
    .from("daily_journal_likes")
    .select("user_id")
    .eq("journal_id", journalId);

  if (error) throw error;

  const likes = data || [];
  const userIds = [...new Set(likes.map((l) => l.user_id).filter(Boolean))];
  const profiles = userIds.length > 0 ? await listProfilesByIds(userIds) : [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return likes.map((l) => ({
    ...l,
    profiles: profileById.get(l.user_id) || null,
  }));
};

export const getWeeklyReportLikes = async (reportId) => {
  const { data, error } = await supabase
    .from("weekly_report_likes")
    .select("user_id")
    .eq("report_id", reportId);

  if (error) throw error;

  const likes = data || [];
  const userIds = [...new Set(likes.map((l) => l.user_id).filter(Boolean))];
  const profiles = userIds.length > 0 ? await listProfilesByIds(userIds) : [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return likes.map((l) => ({
    ...l,
    profiles: profileById.get(l.user_id) || null,
  }));
};

/**
 * ============================================
 * COMMENTS OPERATIONS
 * ============================================
 */

export const addDailyJournalComment = async (
  journalId,
  userId,
  commentText,
) => {
  const { data, error } = await supabase
    .from("daily_journal_comments")
    .insert([
      {
        journal_id: journalId,
        user_id: userId,
        comment_text: commentText,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getDailyJournalComments = async (journalId) => {
  const { data, error } = await supabase
    .from("daily_journal_comments")
    .select("*")
    .eq("journal_id", journalId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const comments = data || [];
  const userIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];
  const profiles = userIds.length > 0 ? await listProfilesByIds(userIds) : [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return comments.map((c) => ({
    ...c,
    profiles: profileById.get(c.user_id) || null,
  }));
};

export const updateDailyJournalComment = async (commentId, commentText) => {
  const { data, error } = await supabase
    .from("daily_journal_comments")
    .update({ comment_text: commentText })
    .eq("id", commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDailyJournalComment = async (commentId) => {
  const { error } = await supabase
    .from("daily_journal_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
};

export const addWeeklyReportComment = async (reportId, userId, commentText) => {
  const { data, error } = await supabase
    .from("weekly_report_comments")
    .insert([
      {
        report_id: reportId,
        user_id: userId,
        comment_text: commentText,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getWeeklyReportComments = async (reportId) => {
  const { data, error } = await supabase
    .from("weekly_report_comments")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const comments = data || [];
  const userIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];
  const profiles = userIds.length > 0 ? await listProfilesByIds(userIds) : [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return comments.map((c) => ({
    ...c,
    profiles: profileById.get(c.user_id) || null,
  }));
};

export const updateWeeklyReportComment = async (commentId, commentText) => {
  const { data, error } = await supabase
    .from("weekly_report_comments")
    .update({ comment_text: commentText })
    .eq("id", commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteWeeklyReportComment = async (commentId) => {
  const { error } = await supabase
    .from("weekly_report_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
};

/**
 * ============================================
 * REAL-TIME SUBSCRIPTIONS
 * ============================================
 */

export const subscribeToJournalComments = (journalId, callback) => {
  const subscription = supabase
    .channel(`journal-comments:${journalId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "daily_journal_comments",
        filter: `journal_id=eq.${journalId}`,
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

export const subscribeToReportComments = (reportId, callback) => {
  const subscription = supabase
    .channel(`report-comments:${reportId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "weekly_report_comments",
        filter: `report_id=eq.${reportId}`,
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

export const subscribeFriendsJournals = (userId, friendIds, callback) => {
  if (friendIds.length === 0) return () => {};

  const subscription = supabase
    .channel(`friends-journals:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "daily_journals",
      },
      (payload) => {
        if (
          payload.new.is_public &&
          (friendIds.includes(payload.new.user_id) ||
            payload.new.user_id === userId)
        ) {
          callback(payload);
        }
      },
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

export const subscribeFriendsReports = (userId, friendIds, callback) => {
  if (friendIds.length === 0) return () => {};

  const subscription = supabase
    .channel(`friends-reports:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "weekly_reports",
      },
      (payload) => {
        if (
          payload.new.is_public &&
          (friendIds.includes(payload.new.user_id) ||
            payload.new.user_id === userId)
        ) {
          callback(payload);
        }
      },
    )
    .subscribe();

  return () => subscription.unsubscribe();
};
