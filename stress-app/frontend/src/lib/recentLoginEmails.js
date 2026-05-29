const RECENT_EMAILS_STORAGE_KEY = "remind.recentLoginEmails";

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function loadRecentLoginEmails() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_EMAILS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((email) => typeof email === "string" && email.trim()).slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentLoginEmails(emails) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RECENT_EMAILS_STORAGE_KEY, JSON.stringify(emails));
  } catch {
    // Ignore storage failures.
  }
}

function removeRecentLoginEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return [];

  const nextEmails = loadRecentLoginEmails().filter((savedEmail) => normalizeEmail(savedEmail) !== normalizedEmail);
  saveRecentLoginEmails(nextEmails);
  return nextEmails;
}

export { loadRecentLoginEmails, normalizeEmail, removeRecentLoginEmail, saveRecentLoginEmails };