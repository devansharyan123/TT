import { Task, DailySummary } from "./types";
import { authFetch } from "./auth-client";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function fetchTasks(date?: string, section?: string): Promise<Task[]> {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  if (section) query.set("section", section);
  const params = query.toString() ? `?${query.toString()}` : "";
  const res = await authFetch(`${BASE}/tasks${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function fetchWeekTasks(dates: string[], section?: string): Promise<Task[]> {
  // Fetch all days in parallel
  const results = await Promise.allSettled(dates.map((d) => fetchTasks(d, section)));
  const tasks: Task[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") tasks.push(...r.value);
  }
  return tasks;
}

export async function fetchTimetableTasks(dates: string[], section?: string): Promise<Task[]> {
  const query = new URLSearchParams({ dates: dates.join(",") });
  if (section) query.set("section", section);
  const res = await authFetch(`${BASE}/tasks/timetable?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch timetable");
  return res.json();
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const res = await authFetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const res = await authFetch(`${BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export async function createTasksBulk(tasks: Partial<Task>[]): Promise<Task[]> {
  const res = await authFetch(`${BASE}/tasks/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks }),
  });
  if (!res.ok) throw new Error("Failed to bulk-create tasks");
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function fetchSummary(date?: string, section?: string): Promise<DailySummary> {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  if (section) query.set("section", section);
  const params = query.toString() ? `?${query.toString()}` : "";
  const res = await authFetch(`${BASE}/tasks/summary${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}
