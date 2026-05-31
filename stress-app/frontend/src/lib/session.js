import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

async function getCurrentUser(explicitUserId = null) {
  if (explicitUserId) {
    return { id: explicitUserId };
  }

  const { data: { user } = {} } = await supabase.auth.getUser();
  return user || null;
}

// Start a new work session for the current user and return the created session
export async function startSession(explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
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
export async function getLatestSessionForUser(explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
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

export async function ensureCurrentSessionForUser(explicitUserId = null) {
  const latest = await getLatestSessionForUser(explicitUserId);
  if (latest.error) return { data: null, error: latest.error };

  if (latest.data) {
    return latest;
  }

  return startSession(explicitUserId);
}

// Insert a stress check for the given session (or the latest session if sessionId omitted)
export async function addStressCheck(level, sessionId = null, explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await ensureCurrentSessionForUser(explicitUserId);
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
export async function addEnergyCheck(level, sessionId = null, explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await ensureCurrentSessionForUser(explicitUserId);
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
export async function addBreak({ type = "walk", duration_minutes = 5 } = {}, sessionId = null, explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  let session_id = sessionId;
  if (!session_id) {
    const latest = await ensureCurrentSessionForUser(explicitUserId);
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

export async function addBreakReminderDecision(action, sessionId = null, explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  if (!["taken", "skipped"].includes(action)) {
    return { data: null, error: new Error("Invalid reminder action") };
  }

  let session_id = sessionId;
  if (!session_id) {
    const latest = await ensureCurrentSessionForUser(explicitUserId);
    if (latest.error) return { data: null, error: latest.error };
    session_id = latest.data?.id;
  }

  const { data, error } = await supabase.from("break_reminder_events").insert([
    {
      user_id: user.id,
      session_id,
      action,
    },
  ]);

  return { data, error };
}

function isMissingReminderEventsTableError(error) {
  if (!error) return false;

  const code = String(error.code || "").toLowerCase();
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("break_reminder_events")
  );
}

export async function loadLatestWellbeingSnapshot(explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  const sessionResult = await getLatestSessionForUser(explicitUserId);
  if (sessionResult.error) return { data: null, error: sessionResult.error };

  const session = sessionResult.data;
  if (!session?.id) {
    return { data: null, error: null };
  }

  const [stressResult, energyResult, breakResult, reminderResult] = await Promise.all([
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
    supabase
      .from("break_reminder_events")
      .select("action, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: false }),
  ]);

  const reminderTableMissing = isMissingReminderEventsTableError(reminderResult.error);
  const firstError = stressResult.error || energyResult.error || breakResult.error || (!reminderTableMissing ? reminderResult.error : null);
  if (firstError) {
    return { data: null, error: firstError };
  }

  const stressCheckins = stressResult.data || [];
  const energyCheckins = energyResult.data || [];
  const breaks = breakResult.data || [];
  const reminderEvents = reminderTableMissing ? [] : reminderResult.data || [];
  const latestStress = stressCheckins[0]?.stress_level ?? 3;
  const latestEnergy = energyCheckins[0]?.energy_level ?? 2;
  const pauseSuggestions =
    stressCheckins.filter((entry) => entry.stress_level >= 4).length +
    energyCheckins.filter((entry) => entry.energy_level <= 2).length;
  const remindersTaken = reminderEvents.filter((entry) => entry.action === "taken").length;
  const remindersSkipped = reminderEvents.filter((entry) => entry.action === "skipped").length;

  return {
    data: {
      session,
      stressLevel: latestStress,
      energyLevel: latestEnergy,
      pausesTaken: reminderEvents.length ? remindersTaken : breaks.length,
      pausesSkipped: reminderEvents.length ? remindersSkipped : Math.max(pauseSuggestions - breaks.length, 0),
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

function getTodayRangeIso(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getCurrentWeekRangeIso(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysSinceMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function average(values, fallback = 0) {
  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getLocalDateKey(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromLocalDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function groupByCreatedDate(rows) {
  return rows.reduce((groups, row) => {
    const dateKey = getLocalDateKey(row.created_at);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }

    groups.get(dateKey).push(row);
    return groups;
  }, new Map());
}

export async function loadLatestSessionTimeline(explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  const sessionResult = await getLatestSessionForUser(explicitUserId);
  if (sessionResult.error) return { data: null, error: sessionResult.error };

  const session = sessionResult.data;
  if (!session?.id) {
    return { data: null, error: null };
  }

  const [stressResult, energyResult, breakResult, reminderResult] = await Promise.all([
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
    supabase
      .from("break_reminder_events")
      .select("id, action, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
  ]);

  const reminderTableMissing = isMissingReminderEventsTableError(reminderResult.error);
  const firstError = stressResult.error || energyResult.error || breakResult.error || (!reminderTableMissing ? reminderResult.error : null);
  if (firstError) {
    return { data: null, error: firstError };
  }

  const stressCheckins = stressResult.data || [];
  const energyCheckins = energyResult.data || [];
  const breaks = breakResult.data || [];
  const reminderEvents = reminderTableMissing ? [] : reminderResult.data || [];

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
    ...reminderEvents.map((entry) => ({
      id: `reminder-${entry.id}`,
      createdAt: entry.created_at,
      type: "reminder",
      title: "Pauzeherinnering",
      value: entry.action,
      detail: entry.action === "taken" ? "Herinnering: pauze genomen" : "Herinnering: doorgewerkt",
      iconType: entry.action === "taken" ? "break" : "warning",
    })),
  ].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    .map((entry) => ({
      ...entry,
      time: formatTimeLabel(entry.createdAt),
    }));

  const pauseSuggestions =
    stressCheckins.filter((entry) => entry.stress_level >= 4).length +
    energyCheckins.filter((entry) => entry.energy_level <= 2).length;
  const remindersTaken = reminderEvents.filter((entry) => entry.action === "taken").length;
  const remindersSkipped = reminderEvents.filter((entry) => entry.action === "skipped").length;

  return {
    data: {
      session,
      timeline: events,
      stressLevel: stressCheckins[stressCheckins.length - 1]?.stress_level ?? 3,
      energyLevel: energyCheckins[energyCheckins.length - 1]?.energy_level ?? 2,
      pausesTaken: reminderEvents.length ? remindersTaken : breaks.length,
      pausesSkipped: reminderEvents.length ? remindersSkipped : Math.max(pauseSuggestions - breaks.length, 0),
    },
    error: null,
  };
}

export async function loadCurrentDayTimeline(explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  const { startIso, endIso } = getTodayRangeIso();

  const [sessionResult, stressResult, energyResult, breakResult, reminderResult] = await Promise.all([
    supabase
      .from("work_sessions")
      .select("id, start_time")
      .eq("user_id", user.id)
      .gte("start_time", startIso)
      .lt("start_time", endIso)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("stress_checkins")
      .select("id, stress_level, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("energy_checkins")
      .select("id, energy_level, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("breaks")
      .select("id, type, duration_minutes, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("break_reminder_events")
      .select("id, action, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
  ]);

  const reminderTableMissing = isMissingReminderEventsTableError(reminderResult.error);
  const firstError = sessionResult.error || stressResult.error || energyResult.error || breakResult.error || (!reminderTableMissing ? reminderResult.error : null);
  if (firstError) {
    return { data: null, error: firstError };
  }

  const stressCheckins = stressResult.data || [];
  const energyCheckins = energyResult.data || [];
  const breaks = breakResult.data || [];
  const reminderEvents = reminderTableMissing ? [] : reminderResult.data || [];

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
    ...reminderEvents.map((entry) => ({
      id: `reminder-${entry.id}`,
      createdAt: entry.created_at,
      type: "reminder",
      title: "Pauzeherinnering",
      value: entry.action,
      detail: entry.action === "taken" ? "Herinnering: pauze genomen" : "Herinnering: doorgewerkt",
      iconType: entry.action === "taken" ? "break" : "warning",
    })),
  ]
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    .map((entry) => ({
      ...entry,
      time: formatTimeLabel(entry.createdAt),
    }));

  const pauseSuggestions =
    stressCheckins.filter((entry) => entry.stress_level >= 4).length +
    energyCheckins.filter((entry) => entry.energy_level <= 2).length;
  const remindersTaken = reminderEvents.filter((entry) => entry.action === "taken").length;
  const remindersSkipped = reminderEvents.filter((entry) => entry.action === "skipped").length;

  return {
    data: {
      session: sessionResult.data || null,
      timeline: events,
      stressLevel: stressCheckins[stressCheckins.length - 1]?.stress_level ?? 3,
      energyLevel: energyCheckins[energyCheckins.length - 1]?.energy_level ?? 2,
      pausesTaken: reminderEvents.length ? remindersTaken : breaks.length,
      pausesSkipped: reminderEvents.length ? remindersSkipped : Math.max(pauseSuggestions - breaks.length, 0),
    },
    error: null,
  };
}

export async function loadWeeklyWellbeingReport(explicitUserId = null) {
  const user = await getCurrentUser(explicitUserId);
  if (!user) return { data: null, error: new Error("No user logged in") };

  const { startIso, endIso } = getCurrentWeekRangeIso();

  const [stressResult, energyResult, breakResult, reminderResult] = await Promise.all([
    supabase
      .from("stress_checkins")
      .select("stress_level, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("energy_checkins")
      .select("energy_level, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("breaks")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("break_reminder_events")
      .select("action, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true }),
  ]);

  const reminderTableMissing = isMissingReminderEventsTableError(reminderResult.error);
  const firstError = stressResult.error || energyResult.error || breakResult.error || (!reminderTableMissing ? reminderResult.error : null);
  if (firstError) {
    return { data: null, error: firstError };
  }

  const stressCheckins = stressResult.data || [];
  const energyCheckins = energyResult.data || [];
  const breaks = breakResult.data || [];
  const reminderEvents = reminderTableMissing ? [] : reminderResult.data || [];

  const stressByDay = groupByCreatedDate(stressCheckins);
  const energyByDay = groupByCreatedDate(energyCheckins);
  const breaksByDay = groupByCreatedDate(breaks);
  const remindersByDay = groupByCreatedDate(reminderEvents);

  const dayKeys = Array.from(new Set([
    ...stressByDay.keys(),
    ...energyByDay.keys(),
    ...breaksByDay.keys(),
    ...remindersByDay.keys(),
  ])).sort();

  if (!dayKeys.length) {
    return { data: { weekTimeline: [], pauseBehaviorData: [], stressEnergyData: [], stressLevel: 3, energyLevel: 2, pausesTaken: 0, pausesSkipped: 0 }, error: null };
  }

  const weeklyRows = dayKeys.map((dateKey) => {
    const date = dateFromLocalDateKey(dateKey);
    const stressRows = stressByDay.get(dateKey) || [];
    const energyRows = energyByDay.get(dateKey) || [];
    const breakRows = breaksByDay.get(dateKey) || [];
    const reminderRows = remindersByDay.get(dateKey) || [];
    const suggestedCount =
      stressRows.filter((entry) => entry.stress_level >= 4).length +
      energyRows.filter((entry) => entry.energy_level <= 2).length;
    const reminderTakenCount = reminderRows.filter((entry) => entry.action === "taken").length;
    const reminderSkippedCount = reminderRows.filter((entry) => entry.action === "skipped").length;
    const hasReminderRows = reminderRows.length > 0;
    const takenCount = hasReminderRows ? reminderTakenCount : breakRows.length;
    const missedCount = hasReminderRows ? reminderSkippedCount : Math.max(suggestedCount - breakRows.length, 0);
    const totalSuggestions = hasReminderRows ? takenCount + missedCount : suggestedCount;

    return {
      id: dateKey,
      day: formatShortDayLabel(date),
      fullDay: formatLongDayLabel(date),
      stress: average(stressRows.map((entry) => entry.stress_level), 3),
      energy: average(energyRows.map((entry) => entry.energy_level), 2),
      taken: takenCount,
      suggested: totalSuggestions,
      missed: missedCount,
    };
  });

  const weekTimeline = weeklyRows.slice().reverse().map((row) => {
    const stressDescriptor = row.stress >= 4 ? "je stress lag hoog" : row.stress >= 3 ? "je stress bleef gemiddeld" : "je stress bleef laag";
    const energyDescriptor = row.energy >= 4 ? "je energie was sterk" : row.energy >= 3 ? "je energie bleef stabiel" : "je energie zakte weg";
    const pauseDescriptor = row.taken > 0 ? `${row.taken} pauze${row.taken === 1 ? "" : "s"} werden genomen` : "er werden geen pauzes genomen";
    const missedDescriptor = row.missed > 0 ? `en ${row.missed} pauze${row.missed === 1 ? "" : "s"} werden gemist` : "en geen pauzes werden gemist";

    return {
      id: row.id,
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
      stressLevel: average(stressCheckins.map((entry) => entry.stress_level), 3),
      energyLevel: average(energyCheckins.map((entry) => entry.energy_level), 2),
      pausesTaken: weeklyRows.reduce((total, row) => total + row.taken, 0),
      pausesSkipped: weeklyRows.reduce((total, row) => total + row.missed, 0),
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
    let active = true;

    getLatestSessionForUser().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        console.error("Failed to load latest session:", error);
        return;
      }

      setSession(data || null);
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    session,
    startSession: start,
    refreshSession,
  };
}
