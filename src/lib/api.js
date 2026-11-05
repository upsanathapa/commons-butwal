import { supabase } from "./supabase";

// Each browser gets a random ID saved on the device.
// It lets us allow only one confirmation per device per issue.
export function getDeviceId() {
  let id = localStorage.getItem("commons_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("commons_device_id", id);
  }
  return id;
}

// Load all issues, count their confirmations, and mark which ones this device confirmed
export async function fetchIssues() {
  const deviceId = getDeviceId();

  const { data: issues, error } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const { data: confs, error: confError } = await supabase
    .from("confirmations")
    .select("issue_id, device_id");
  if (confError) throw confError;

  return issues.map((issue) => {
    const forIssue = confs.filter((c) => c.issue_id === issue.id);
    return {
      ...issue,
      reporter: issue.reporter_name,
      confirmations: forIssue.length,
      confirmedByMe: forIssue.some((c) => c.device_id === deviceId),
    };
  });
}

// Save a new issue
export async function createIssue(details, position) {
  const { error } = await supabase.from("issues").insert({
    title: details.title.trim(),
    category: details.category,
    description: details.description,
    reporter_name: details.reporter || null,
    lat: position.lat,
    lng: position.lng,
  });
  if (error) throw error;
}

// Save a confirmation. Code 23505 means "already confirmed", which is fine.
export async function confirmIssue(issueId) {
  const { error } = await supabase
    .from("confirmations")
    .insert({ issue_id: issueId, device_id: getDeviceId() });
  if (error && error.code !== "23505") throw error;
}
