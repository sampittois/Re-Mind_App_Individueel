import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

async function getCurrentUser() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  return user || null;
}

// Start a new work session for the current user and return the created session
export async function startSession() {
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const { data, error } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function ensureCurrentSessionForUser() {
  const latest = await getLatestSessionForUser();
  if (latest.error) return { data: null, error: latest.error };

  if (latest.data) {
    return latest;
  }

  return startSession();
}

// Insert a stress check for the given session (or the latest session if sessionId omitted)
export async function addStressCheck(level, sessionId = null) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await ensureCurrentSessionForUser();
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

// Insert an energy check for the given session (or the latest session if sessionId omitted)
export async function addEnergyCheck(level, sessionId = null) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await ensureCurrentSessionForUser();
    if (latest.error) return { data: null, error: latest.error };
    session_id = latest.data?.id;
  }

  const { data, error } = await supabase
    .from("energy_checkins")
    .insert([
      {
        user_id: user.id,
        session_id,
        energy_level: level,
      },
    ]);

  return { data, error };
}

// Insert a break for the given session (or the latest session if sessionId omitted)
export async function addBreak({ type = "walk", duration_minutes = 5 } = {}, sessionId = null) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await ensureCurrentSessionForUser();
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

export async function loadLatestWellbeingSnapshot() {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const sessionResult = await getLatestSessionForUser();
  if (sessionResult.error) return { data: null, error: sessionResult.error };

  const session = sessionResult.data;
  if (!session?.id) {
    return { data: null, error: null };
  }

  const [stressResult, energyResult, breakResult] = await Promise.all([
    supabase
      .from("stress_checkins")
      .select("stress_level, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("energy_checkins")
      .select("energy_level, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("breaks")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = stressResult.error || energyResult.error || breakResult.error;
  if (firstError) {
    return { data: null, error: firstError };
  }

  const stressCheckins = stressResult.data || [];
  const energyCheckins = energyResult.data || [];
  const breaks = breakResult.data || [];
  const latestStress = stressCheckins[0]?.stress_level ?? 3;
  const latestEnergy = energyCheckins[0]?.energy_level ?? 2;
  const pauseSuggestions =
    stressCheckins.filter((entry) => entry.stress_level >= 4).length +
    energyCheckins.filter((entry) => entry.energy_level <= 2).length;

  return {
    data: {
      session,
      stressLevel: latestStress,
      energyLevel: latestEnergy,
      pausesTaken: breaks.length,
      pausesSkipped: Math.max(pauseSuggestions - breaks.length, 0),
    },
    error: null,
  };
}

function capitalizeLabel(label) {
  if (!label) return "";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatShortDayLabel(dateValue) {
  return capitalizeLabel(
    new Intl.DateTimeFormat("nl-NL", { weekday: "short" })
      .format(new Date(dateValue))
      .replace(".", ""),
  );
}

function formatLongDayLabel(dateValue) {
  return capitalizeLabel(
    new Intl.DateTimeFormat("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(dateValue)),
  );
}

function formatTimeLabel(dateValue) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function average(values, fallback = 0) {
  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupBySessionId(rows) {
  return rows.reduce((groups, row) => {
    if (!groups.has(row.session_id)) {
      groups.set(row.session_id, []);
    }

    groups.get(row.session_id).push(row);
    return groups;
  }, new Map());
}

export async function loadLatestSessionTimeline() {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const sessionResult = await getLatestSessionForUser();
  if (sessionResult.error) return { data: null, error: sessionResult.error };

  const session = sessionResult.data;
  if (!session?.id) {
    return { data: null, error: null };
  }

  const [stressResult, energyResult, breakResult] = await Promise.all([
    supabase
      .from("stress_checkins")
      .select("id, stress_level, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("energy_checkins")
      .select("id, energy_level, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("breaks")
      .select("id, type, duration_minutes, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
  ]);

  const firstError = stressResult.error || energyResult.error || breakResult.error;
  if (firstError) {
    return { data: null, error: firstError };
  }

  const stressCheckins = stressResult.data || [];
  const energyCheckins = energyResult.data || [];
  const breaks = breakResult.data || [];

  const events = [
    ...stressCheckins.map((entry) => ({
      id: `stress-${entry.id}`,
      createdAt: entry.created_at,
      type: "stress",
      title: "Stress",
      value: entry.stress_level,
      detail: `Stresscheck-in opgeslagen: ${entry.stress_level}/5`,
      iconType: entry.stress_level >= 4 ? "highStress" : entry.stress_level <= 2 ? "highEnergy" : "warning",
    })),
    ...energyCheckins.map((entry) => ({
      id: `energy-${entry.id}`,
      createdAt: entry.created_at,
      type: "energy",
      title: "Energie",
      value: entry.energy_level,
      detail: `Energiecheck-in opgeslagen: ${entry.energy_level}/5`,
      iconType: entry.energy_level >= 4 ? "highEnergy" : entry.energy_level <= 2 ? "highStress" : "warning",
    })),
    ...breaks.map((entry) => ({
      id: `break-${entry.id}`,
      createdAt: entry.created_at,
      type: "break",
      title: "Pauze",
      value: entry.duration_minutes,
      detail: `Pauze genomen: ${entry.duration_minutes} min`,
      iconType: "break",
    })),
  ].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    .map((entry) => ({
      ...entry,
      time: formatTimeLabel(entry.createdAt),
    }));

  const pauseSuggestions =
    stressCheckins.filter((entry) => entry.stress_level >= 4).length +
    energyCheckins.filter((entry) => entry.energy_level <= 2).length;

  return {
    data: {
      session,
      timeline: events,
      stressLevel: stressCheckins[stressCheckins.length - 1]?.stress_level ?? 3,
      energyLevel: energyCheckins[energyCheckins.length - 1]?.energy_level ?? 2,
      pausesTaken: breaks.length,
      pausesSkipped: Math.max(pauseSuggestions - breaks.length, 0),
    },
    error: null,
  };
}

export async function loadWeeklyWellbeingReport() {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const { data: sessions, error: sessionError } = await supabase
    .from("work_sessions")
    .select("id, start_time")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false })
    .limit(7);

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  const sessionList = (sessions || []).slice().reverse();
  if (!sessionList.length) {
    return { data: { weekTimeline: [], pauseBehaviorData: [], stressEnergyData: [], stressLevel: 3, energyLevel: 2, pausesTaken: 0, pausesSkipped: 0 }, error: null };
  }

  const sessionIds = sessionList.map((session) => session.id);

  const [stressResult, energyResult, breakResult] = await Promise.all([
    supabase
      .from("stress_checkins")
      .select("session_id, stress_level, created_at")
      .eq("user_id", user.id)
      .in("session_id", sessionIds),
    supabase
      .from("energy_checkins")
      .select("session_id, energy_level, created_at")
      .eq("user_id", user.id)
      .in("session_id", sessionIds),
    supabase
      .from("breaks")
      .select("session_id, created_at")
      .eq("user_id", user.id)
      .in("session_id", sessionIds),
  ]);

  const firstError = stressResult.error || energyResult.error || breakResult.error;
  if (firstError) {
    return { data: null, error: firstError };
  }

  const stressBySession = groupBySessionId(stressResult.data || []);
  const energyBySession = groupBySessionId(energyResult.data || []);
  const breaksBySession = groupBySessionId(breakResult.data || []);

  const weeklyRows = sessionList.map((session) => {
    const stressRows = stressBySession.get(session.id) || [];
    const energyRows = energyBySession.get(session.id) || [];
    const breakRows = breaksBySession.get(session.id) || [];
    const suggestedCount =
      stressRows.filter((entry) => entry.stress_level >= 4).length +
      energyRows.filter((entry) => entry.energy_level <= 2).length;
    const missedCount = Math.max(suggestedCount - breakRows.length, 0);

    return {
      day: formatShortDayLabel(session.start_time),
      fullDay: formatLongDayLabel(session.start_time),
      stress: average(stressRows.map((entry) => entry.stress_level), 3),
      energy: average(energyRows.map((entry) => entry.energy_level), 2),
      taken: breakRows.length,
      suggested: suggestedCount,
      missed: missedCount,
    };
  });

  const latestRow = weeklyRows[weeklyRows.length - 1];
  const weekTimeline = weeklyRows.map((row) => {
    const stressDescriptor = row.stress >= 4 ? "je stress lag hoog" : row.stress >= 3 ? "je stress bleef gemiddeld" : "je stress bleef laag";
    const energyDescriptor = row.energy >= 4 ? "je energie was sterk" : row.energy >= 3 ? "je energie bleef stabiel" : "je energie zakte weg";
    const pauseDescriptor = row.taken > 0 ? `${row.taken} pauze${row.taken === 1 ? "" : "s"} werden genomen` : "er werden geen pauzes genomen";
    const missedDescriptor = row.missed > 0 ? `en ${row.missed} pauze${row.missed === 1 ? "" : "s"} werden gemist` : "en geen pauzes werden gemist";

    return {
      day: row.fullDay,
      icon: row.taken > row.missed && row.taken > 0 ? "break" : row.stress >= 4 ? "highStress" : row.energy >= 4 ? "highEnergy" : "warning",
      summary: `Op ${row.fullDay} ${stressDescriptor}, ${energyDescriptor}, ${pauseDescriptor} ${missedDescriptor}.`,
    };
  });

  return {
    data: {
      weekTimeline,
      pauseBehaviorData: weeklyRows.map((row) => ({
        day: row.day,
        taken: row.taken,
        suggested: row.suggested,
        missed: row.missed,
      })),
      stressEnergyData: weeklyRows.map((row) => ({
        day: row.day,
        stress: row.stress,
        energy: row.energy,
      })),
      stressLevel: latestRow?.stress ?? 3,
      energyLevel: latestRow?.energy ?? 2,
      pausesTaken: latestRow?.taken ?? 0,
      pausesSkipped: latestRow?.missed ?? 0,
    },
    error: null,
  };
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
