import { Task, DailySummary } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function fetchTasks(date?: string): Promise<Task[]> {
  const params = date ? `?date=${date}` : "";
  const res = await fetch(`${BASE}/tasks${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function fetchWeekTasks(dates: string[]): Promise<Task[]> {
  // Fetch all days in parallel
  const results = await Promise.allSettled(dates.map((d) => fetchTasks(d)));
  const tasks: Task[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") tasks.push(...r.value);
  }
  return tasks;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const res = await fetch(`${BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export async function createTasksBulk(tasks: Partial<Task>[]): Promise<Task[]> {
  const res = await fetch(`${BASE}/tasks/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks }),
  });
  if (!res.ok) throw new Error("Failed to bulk-create tasks");
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function fetchSummary(date?: string): Promise<DailySummary> {
  const params = date ? `?date=${date}` : "";
  const res = await fetch(`${BASE}/tasks/summary${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}
