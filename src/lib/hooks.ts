"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "./supabase/client";
import type { H7User, ActivityLog, WeekRecord, SocialPost, PostComment } from "./types";
import { computeStatus } from "./level-engine";
import type { SupabaseClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------
// Belt-progression helpers
// ----------------------------------------------------------------

/**
 * Record a belt promotion if the user has just reached a higher level than
 * any promotion already recorded for them. The unique (user_id, to_level)
 * constraint on belt_promotions keeps this safe against races — duplicate
 * inserts simply fail and are ignored.
 */
async function maybeRecordPromotion(
  supabase: SupabaseClient,
  userId: string,
  fromLevel: string,
  toLevel: string,
  promotedAt: Date,
) {
  if (fromLevel === toLevel) return;
  const { error } = await supabase.from("belt_promotions").insert({
    user_id: userId,
    from_level: fromLevel,
    to_level: toLevel,
    promoted_at: promotedAt.toISOString(),
  });
  // 23505 = unique_violation (already recorded for this to_level). Ignore it.
  if (error && error.code !== "23505") {
    console.error("Belt promotion insert:", error.message, error.code);
  }
}

// ============================================================
// Supabase data hooks — client-side (singleton client)
// ============================================================

/** Stable singleton — never changes between renders */
function useSupabase() {
  return useMemo(() => createClient(), []);
}

export function useUser() {
  const [user, setUser] = useState<H7User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? (await supabase.auth.getUser()).data.user;
      console.log("[H7] Auth:", authUser ? `user=${authUser.id}` : "no user");
      if (!authUser) { setLoading(false); return; }
      setUserId(authUser.id);
      const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      if (error) console.error("Profile fetch:", error.message, error.code, error.details);
      if (data) setUser(data as H7User);
    } catch (err) {
      console.error("useUser error:", err);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateUser = async (updates: Partial<H7User>) => {
    if (!userId) return;
    const updated = { ...user, ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("profiles").upsert(updated);
    if (error) console.error("Profile update:", error.message);
    else setUser(updated as H7User);
  };

  return { user, userId, loading, updateUser, refresh };
}

export function useActivities(userId: string | null) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (error) console.error("Activities fetch:", error.message, error.code);
      if (data) setActivities(data as ActivityLog[]);
    } catch (err) {
      console.error("useActivities error:", err);
    }
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const addActivity = async (log: Omit<ActivityLog, "id" | "created_at" | "user_level">) => {
    // Fetch this user's week records so computeStatus can see their full history.
    const { data: weekRecordsRaw } = await supabase
      .from("week_records")
      .select("*")
      .eq("user_id", log.user_id);
    const weekRecords = (weekRecordsRaw as WeekRecord[] | null) ?? [];

    // Level the user *held* entering this activity — stamped on the row for analytics.
    const before = computeStatus(activities, weekRecords);
    const levelBefore = before.currentLevel.displayName;

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: log.user_id,
        date: log.date,
        duration_minutes: log.duration_minutes,
        activity_type: log.activity_type,
        source: log.source,
        intensity: log.intensity,
        user_level: levelBefore,
      })
      .select()
      .single();
    if (error) {
      console.error("Add activity:", error.message, error.details, error.hint);
      return;
    }
    if (!data) return;

    const inserted = data as ActivityLog;
    setActivities((prev) => [inserted, ...prev]);

    // If this activity pushed the user up a level, record the promotion.
    const after = computeStatus([inserted, ...activities], weekRecords);
    const levelAfter = after.currentLevel.displayName;
    if (after.currentLevel.value > before.currentLevel.value) {
      await maybeRecordPromotion(supabase, log.user_id, levelBefore, levelAfter, new Date());
    }
  };

  const updateActivity = async (log: ActivityLog) => {
    const { error } = await supabase
      .from("activity_logs")
      .update({
        date: log.date,
        duration_minutes: log.duration_minutes,
        activity_type: log.activity_type,
        intensity: log.intensity,
      })
      .eq("id", log.id);
    if (error) console.error("Update activity:", error.message);
    else setActivities((prev) => prev.map((a) => (a.id === log.id ? log : a)));
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase.from("activity_logs").delete().eq("id", id);
    if (error) console.error("Delete activity:", error.message);
    else setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  return { activities, loading, refresh, addActivity, updateActivity, deleteActivity };
}

export function useWeekRecords(userId: string | null) {
  const [records, setRecords] = useState<WeekRecord[]>([]);
  const supabase = useSupabase();

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("week_records")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .then((result: { data: WeekRecord[] | null; error: unknown }) => {
        if (result.error) console.error("Week records fetch:", result.error);
        if (result.data) setRecords(result.data);
      });
  }, [userId, supabase]);

  return { records };
}

export function usePosts() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  const refresh = useCallback(async () => {
    try {
      await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) console.error("Posts fetch:", error.message, error.code, error.details, error.hint);
      if (data) setPosts(data as SocialPost[]);
    } catch (err) {
      console.error("usePosts error:", err);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const addPost = async (post: Omit<SocialPost, "id" | "created_at" | "likes_count" | "comments_count">) => {
    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        user_id: post.user_id,
        username: post.username,
        user_level: post.user_level,
        text: post.text,
        image_url: post.image_url,
      })
      .select()
      .single();
    if (error) console.error("Add post:", error.message, error.details, error.hint);
    if (data) setPosts((prev) => [data as SocialPost, ...prev]);
  };

  return { posts, loading, refresh, addPost };
}

export function useComments(postId: string | null) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const supabase = useSupabase();

  const refresh = useCallback(async () => {
    if (!postId) return;
    const { data, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) console.error("Comments fetch:", error.message);
    if (data) setComments(data as PostComment[]);
  }, [postId, supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const addComment = async (comment: Omit<PostComment, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: comment.post_id,
        user_id: comment.user_id,
        username: comment.username,
        text: comment.text,
        reply_to_username: comment.reply_to_username,
      })
      .select()
      .single();
    if (error) console.error("Add comment:", error.message);
    if (data) setComments((prev) => [...prev, data as PostComment]);
  };

  return { comments, refresh, addComment };
}

export function useLikes(userId: string | null) {
  const supabase = useSupabase();

  const likePost = async (postId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: userId,
    });
    if (error) console.error("Like:", error.message);
  };

  const unlikePost = async (postId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) console.error("Unlike:", error.message);
  };

  return { likePost, unlikePost };
}

export function useSignOut() {
  const supabase = useSupabase();
  return async () => {
    await supabase.auth.signOut();
    window.location.href = "/app/login";
  };
}
