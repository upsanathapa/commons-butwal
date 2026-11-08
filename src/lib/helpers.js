export const CATEGORIES = {
  Streetlight: { color: "#f59e0b", emoji: "💡" },
  Garbage: { color: "#16a34a", emoji: "🗑️" },
  "Pothole / Road": { color: "#dc2626", emoji: "🚧" },
  Drainage: { color: "#0891b2", emoji: "💧" },
  Water: { color: "#2563eb", emoji: "🚰" },
  Other: { color: "#7c3aed", emoji: "📍" },
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

export function categoryInfo(name) {
  return CATEGORIES[name] || CATEGORIES.Other;
}

const STATUS_LABELS = {
  reported: "Reported",
  confirmed: "Confirmed",
  sent: "Sent to ward",
  fixed: "Fixed",
};

// 3 or more neighbours confirming upgrades "reported" to "confirmed"
export function statusKey(issue) {
  if (issue.status === "reported" && issue.confirmations >= 3)
    return "confirmed";
  return issue.status;
}

export function displayStatus(issue) {
  const key = statusKey(issue);
  return STATUS_LABELS[key] || key;
}

export function timeAgo(dateString) {
  if (!dateString) return "";
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );
  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [name, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
