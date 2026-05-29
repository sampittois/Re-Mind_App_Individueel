import { supabase } from "./supabaseClient";

async function getCurrentUser() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  return user || null;
}

function toDateString(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

export async function fetchTodosForDays(dates = []) {
  const user = await getCurrentUser();
  if (!user) return { data: [], error: new Error("No user logged in") };

  const normalized = dates.map((d) => toDateString(d));
  const { data, error } = await supabase
    .from("workday_todos")
    .select("id, day, text, done, created_at, updated_at")
    .in("day", normalized)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return { data: data || [], error };
}

export async function createTodoForDay(day, text) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const payload = {
    user_id: user.id,
    day: toDateString(day),
    text,
  };

  const { data, error } = await supabase.from("workday_todos").insert([payload]).select().single();
  return { data, error };
}

export async function updateTodo(id, fields) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const { data, error } = await supabase
    .from("workday_todos")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .match({ id, user_id: user.id })
    .select()
    .single();

  return { data, error };
}

export async function deleteTodo(id) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const { data, error } = await supabase.from("workday_todos").delete().match({ id, user_id: user.id }).select().single();
  return { data, error };
}

export function formatIsoDate(date) {
  return toDateString(date);
}

export async function rolloverTodosToToday() {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const today = toDateString(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toDateString(tomorrowDate);

  // 1) Delete done tasks for today
  const { error: deleteError } = await supabase
    .from("workday_todos")
    .delete()
    .eq("day", today)
    .eq("done", true)
    .eq("user_id", user.id);

  if (deleteError) return { data: null, error: deleteError };

  // 2) Move tomorrow tasks to today
  const { data, error } = await supabase
    .from("workday_todos")
    .update({ day: today, updated_at: new Date().toISOString() })
    .match({ day: tomorrow, user_id: user.id })
    .select();

  return { data, error };
}

export async function moveUndoneTodayToTomorrow() {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error("No user logged in") };

  const today = toDateString(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toDateString(tomorrowDate);

  // Move undone today tasks to tomorrow
  const { data, error } = await supabase
    .from("workday_todos")
    .update({ day: tomorrow, updated_at: new Date().toISOString() })
    .match({ day: today, user_id: user.id })
    .neq("done", true)
    .select();

  return { data, error };
}


export default {
  fetchTodosForDays,
  createTodoForDay,
  updateTodo,
  deleteTodo,
  formatIsoDate,
};
