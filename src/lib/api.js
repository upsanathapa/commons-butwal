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
