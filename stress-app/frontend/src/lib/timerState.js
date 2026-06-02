import { supabase } from "./supabaseClient";

const TIMER_CLIENT_ID_STORAGE_KEY = "remind.timerClientId";

function getTimerClientId() {
  if (typeof window === "undefined") {
    return "unknown-client";
  }

  try {
    const existing = window.localStorage.getItem(TIMER_CLIENT_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const nextId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(TIMER_CLIENT_ID_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return "unknown-client";
  }
}

function isMissingTimerStatesTableError(error) {
  if (!error) return false;

  const code = String(error.code || "").toLowerCase();
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();

  return code === "42p01" || code === "pgrst205" || message.includes("timer_states");
}

export async function loadRemoteTimerState(userId) {
  if (!userId) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("timer_states")
    .select("state, updated_at, updated_by")
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingTimerStatesTableError(error)) {
    return { data: null, error: null };
  }

  if (error) {
    return { data: null, error };
  }

  return { data: data || null, error: null };
}

export async function saveRemoteTimerState(userId, state) {
  if (!userId || !state) {
    return { data: null, error: null };
  }

  const payload = {
    user_id: userId,
    state,
    updated_by: getTimerClientId(),
  };

  const { data, error } = await supabase
    .from("timer_states")
    .upsert(payload, { onConflict: "user_id" })
    .select("state, updated_at, updated_by")
    .single();

  if (isMissingTimerStatesTableError(error)) {
    return { data: null, error: null };
  }

  return { data: data || null, error };
}
