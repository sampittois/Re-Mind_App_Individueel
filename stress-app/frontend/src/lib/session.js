import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// Start a new work session for the current user and return the created session
export async function startSession() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const payload = {
    user_id: user.id,
    start_time: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("work_sessions")
    .insert([payload])
    .select()
    .single();

  return { data, error };
}

// Get the latest session for the current user
export async function getLatestSessionForUser() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const { data, error } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  return { data, error };
}

// Insert a stress check for the given session (or the latest session if sessionId omitted)
export async function addStressCheck(level, sessionId = null) {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await getLatestSessionForUser();
    if (latest.error) return { data: null, error: latest.error };
    session_id = latest.data?.id;
  }

  const { data, error } = await supabase
    .from("stress_checkins")
    .insert([
      {
        user_id: user.id,
        session_id,
        stress_level: level,
      },
    ]);

  return { data, error };
}

// Insert a break for the given session (or the latest session if sessionId omitted)
export async function addBreak({ type = "walk", duration_minutes = 5 } = {}, sessionId = null) {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await getLatestSessionForUser();
    if (latest.error) return { data: null, error: latest.error };
    session_id = latest.data?.id;
  }

  const { data, error } = await supabase.from("breaks").insert([
    {
      user_id: user.id,
      session_id,
      type,
      duration_minutes,
    },
  ]);

  return { data, error };
}

// React hook that keeps the latest session in state and exposes helpers
export function useCurrentSession() {
  const [session, setSession] = useState(null);

  const refreshSession = async () => {
    const { data, error } = await getLatestSessionForUser();
    if (error) {
      console.error("Failed to load latest session:", error);
      return { data: null, error };
    }
    setSession(data || null);
    return { data, error };
  };

  const start = async () => {
    const { data, error } = await startSession();
    if (!error) setSession(data);
    return { data, error };
  };

  useEffect(() => {
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    session,
    startSession: start,
    refreshSession,
  };
}
