import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { token: null, error };

  const token = data?.session?.access_token || null;
  if (!token) return { token: null, error: new Error("No active session") };

  return { token, error: null };
}

async function requestCalendar(path, options = {}) {
  const { token, error } = await getAccessToken();
  if (error) return { data: null, error };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    return { data: null, error: new Error(payload?.error || "Calendar request failed") };
  }

  return { data: payload, error: null };
}

export async function startCalendarLink(provider) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  return requestCalendar(`/calendar/connect-url?provider=${encodeURIComponent(normalizedProvider || "google")}`);
}

export async function fetchCalendarEventsForDay(day) {
  const date = day instanceof Date ? day.toISOString().slice(0, 10) : String(day || "");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Brussels";

  return requestCalendar(`/calendar/events?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`);
}

export async function fetchCalendarConnections() {
  return requestCalendar("/calendar/connections");
}
