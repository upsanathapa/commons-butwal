import { t } from "./i18n";

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

const KNOWN_STATUSES = ["reported", "confirmed", "sent", "fixed"];

export function statusLabel(key) {
  return KNOWN_STATUSES.includes(key) ? t(`status_${key}`) : key;
}

// 3 or more neighbours confirming upgrades "reported" to "confirmed"
export function statusKey(issue) {
  if (issue.status === "reported" && issue.confirmations >= 3)
    return "confirmed";
  return issue.status;
}

export function displayStatus(issue) {
  return statusLabel(statusKey(issue));
}

export function timeAgo(dateString) {
  if (!dateString) return "";
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return t("daysAgo", { n: days });
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return t("hoursAgo", { n: hours });
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 1) return t("minutesAgo", { n: minutes });
  return t("justNow");
}

// ---------- Follow-through helpers ----------

// How much a problem matters for safety, used in the priority score
const SAFETY_WEIGHT = {
  Streetlight: 6,
  "Pothole / Road": 5,
  Drainage: 4,
  Water: 4,
  Garbage: 2,
  Other: 1,
};

export function daysOpen(issue) {
  if (!issue.created_at) return 0;
  const ms = Date.now() - new Date(issue.created_at).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function daysOpenLabel(issue) {
  if (issue.status === "fixed") return t("status_fixed");
  const d = daysOpen(issue);
  if (d === 0) return t("openToday");
  return d === 1 ? t("openDay") : t("openDays", { n: d });
}

// Priority = confirmations x 2 + days open (max 30) + safety weight of the category
export function priorityScore(issue) {
  if (issue.status === "fixed") return -1;
  return (
    issue.confirmations * 2 +
    Math.min(daysOpen(issue), 30) +
    (SAFETY_WEIGHT[issue.category] ?? 1)
  );
}

export function priorityLevel(issue) {
  if (issue.status === "fixed") return null;
  const score = priorityScore(issue);
  if (score >= 15) return "high";
  if (score >= 8) return "medium";
  return "low";
}

export function priorityLabel(level) {
  return t(`prio_${level}`);
}

export const TIMELINE_KEYS = ["reported", "confirmed", "sent", "fixed"];
const STEP_INDEX = { reported: 0, confirmed: 1, sent: 2, fixed: 3 };

export function stepIndex(issue) {
  return STEP_INDEX[statusKey(issue)] ?? 0;
}

// Numbers for the neighbourhood report card
export function buildReport(issues) {
  const total = issues.length;
  const fixed = issues.filter((i) => i.status === "fixed");
  const open = issues.filter((i) => i.status !== "fixed");
  const avgDays = open.length
    ? Math.round(open.reduce((sum, i) => sum + daysOpen(i), 0) / open.length)
    : 0;

  const byCategory = {};
  issues.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  });
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const mostConfirmed =
    [...issues].sort((a, b) => b.confirmations - a.confirmations)[0] || null;
  const oldest = [...open].sort((a, b) => daysOpen(b) - daysOpen(a))[0] || null;

  return {
    total,
    fixedCount: fixed.length,
    openCount: open.length,
    percentFixed: total ? Math.round((fixed.length / total) * 100) : 0,
    avgDays,
    categories,
    mostConfirmed,
    oldest,
  };
}
