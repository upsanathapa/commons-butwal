import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
import { uploadPhoto } from "./storage";

// Each browser gets a random ID saved on the device as a fallback.
export function getDeviceId() {
  let id = localStorage.getItem("commons_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("commons_device_id", id);
  }
  return id;
}

// Helper to get current authenticated user ID if signed in
async function getCurrentUserId() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

export async function fetchIssues() {
  const deviceId = getDeviceId();
  const userId = await getCurrentUserId();

  const { data: issues, error } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const { data: confs, error: confError } = await supabase
    .from("confirmations")
    .select("issue_id, device_id, user_id");
  if (confError) throw confError;

  let votes = [];
  try {
    const { data, error: voteError } = await supabase
      .from("fix_votes")
      .select("issue_id, device_id, user_id, vote");
    if (!voteError && data) votes = data;
  } catch {
    votes = [];
  }

  return issues.map((issue) => {
    const forIssue = confs.filter((c) => c.issue_id === issue.id);
    const votesForIssue = votes.filter((v) => v.issue_id === issue.id);
    return {
      ...issue,
      reporter: issue.reporter_name,
      confirmations: forIssue.length,
      confirmedByMe: userId
        ? forIssue.some((c) => c.user_id === userId)
        : forIssue.some((c) => c.device_id === deviceId),
      fixedVotes: votesForIssue.filter((v) => v.vote === "fixed").length,
      brokenVotes: votesForIssue.filter((v) => v.vote === "broken").length,
      myVote: userId
        ? votesForIssue.find((v) => v.user_id === userId)?.vote || null
        : votesForIssue.find((v) => v.device_id === deviceId)?.vote || null,
    };
  });
}

// Save a new issue with optional user_id
export async function createIssue(details, position) {
  let photoUrl = null;
  let photoFailed = false;
  const userId = await getCurrentUserId();

  if (details.photo) {
    try {
      photoUrl = await uploadPhoto(details.photo);
    } catch (e) {
      console.error("Photo upload failed", e);
      photoFailed = true;
    }
  }

  const { error } = await supabase.from("issues").insert({
    title: details.title.trim(),
    category: details.category,
    description: details.description,
    reporter_name: details.reporter || null,
    photo_url: photoUrl,
    lat: position.lat,
    lng: position.lng,
    user_id: userId,
  });
  if (error) throw error;

  return { photoFailed };
}
async function requireUser() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("sign_in_required");
}
export async function confirmIssue(issueId) {
  await requireUser();
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("confirmations").insert({
    issue_id: issueId,
    device_id: getDeviceId(),
    user_id: userId,
  });
  if (error && error.code !== "23505") throw error;
}

export async function castFixVote(issueId, vote) {
  await requireUser();
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("fix_votes").insert({
    issue_id: issueId,
    device_id: getDeviceId(),
    user_id: userId,
    vote,
  });
  if (error && error.code !== "23505") throw error;
}

export async function fetchFlagCounts() {
  const { data, error } = await supabase.from("flags").select("issue_id");
  if (error || !data) return {};
  const counts = {};
  data.forEach((f) => {
    counts[f.issue_id] = (counts[f.issue_id] || 0) + 1;
  });
  return counts;
}

export async function flagIssue(issueId) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("sign_in_required");
  const { error } = await supabase.from("flags").insert({ issue_id: issueId });
  if (error && error.code !== "23505") throw error;
}

export async function isAdmin() {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return false;
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", s.session.user.id)
    .maybeSingle();
  return !!data;
}

export async function setIssueStatus(issueId, status) {
  const { data, error } = await supabase
    .from("issues")
    .update({ status })
    .eq("id", issueId)
    .select();
  if (error || !data || data.length === 0)
    throw error || new Error("not_allowed");
}

// Find possible duplicate issues near a new report.
export async function checkDuplicateIssues(details, position) {
  const SEARCH_RADIUS_METERS = 150;

  // Convert distance in metres to approximate latitude/longitude ranges.
  const latRange = SEARCH_RADIUS_METERS / 111320;
  const lngRange =
    SEARCH_RADIUS_METERS / (111320 * Math.cos((position.lat * Math.PI) / 180));

  const { data: issues, error } = await supabase
    .from("issues")
    .select("id, title, description, category, lat, lng, status, created_at")
    .eq("category", details.category)
    .gte("lat", position.lat - latRange)
    .lte("lat", position.lat + latRange)
    .gte("lng", position.lng - lngRange)
    .lte("lng", position.lng + lngRange)
    .limit(50);

  if (error) throw error;

  // Calculate actual distance between two coordinates.
  function distanceInMeters(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371000;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Compare meaningful words in the titles and descriptions.
  function textSimilarity(text1, text2) {
    const getWords = (text) =>
      new Set(
        (text || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((word) => word.length > 2),
      );

    const words1 = getWords(text1);
    const words2 = getWords(text2);

    if (!words1.size || !words2.size) return 0;

    const common = [...words1].filter((word) => words2.has(word));

    return common.length / Math.max(words1.size, words2.size);
  }

  const newText = `${details.title} ${details.description || ""}`;

  return issues
    .filter((issue) => {
      // Ignore issues already marked as resolved or closed.
      const status = (issue.status || "").toLowerCase();

      if (["resolved", "fixed", "closed", "completed"].includes(status)) {
        return false;
      }

      const distance = distanceInMeters(
        position.lat,
        position.lng,
        Number(issue.lat),
        Number(issue.lng),
      );

      const similarity = textSimilarity(
        newText,
        `${issue.title} ${issue.description || ""}`,
      );

      return (
        distance <= SEARCH_RADIUS_METERS &&
        (similarity >= 0.25 || distance <= 40)
      );
    })
    .map((issue) => ({
      ...issue,
      distance: Math.round(
        distanceInMeters(
          position.lat,
          position.lng,
          Number(issue.lat),
          Number(issue.lng),
        ),
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

// Submit photographic proof that an issue has been resolved.
export async function submitResolutionProof(issueId, photo, note = "") {
  await requireUser();

  if (!photo) {
    throw new Error("A resolution photo is required.");
  }

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("sign_in_required");

  // Upload the after-photo using the existing Storage bucket.
  const photoUrl = await uploadPhoto(photo);

  const { data, error } = await supabase
    .from("resolution_proofs")
    .insert({
      issue_id: issueId,
      photo_url: photoUrl,
      note: note.trim() || null,
      submitted_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Retrieve proof submissions for a particular issue.
export async function fetchResolutionProofs(issueId) {
  const { data, error } = await supabase
    .from("resolution_proofs")
    .select("*")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Admin review: approve or reject a proof.

export async function reviewResolutionProof(proofId, decision) {
  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid review decision.");
  }

  await requireUser();

  const { error } = await supabase.rpc("review_resolution_proof", {
    p_proof_id: proofId,
    p_decision: decision,
  });

  if (error) throw error;
}
