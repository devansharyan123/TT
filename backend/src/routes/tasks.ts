import { Router, Request, Response } from "express";
import { tasks } from "../data";
import { Task } from "../types";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /api/tasks?date=YYYY-MM-DD
router.get("/", (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const filtered = tasks.filter((t) => t.date === date);
  res.json(filtered);
});

// POST /api/tasks/bulk — before /:id
router.post("/bulk", (req: Request, res: Response) => {
  const body = req.body as { tasks: Partial<Task>[] };
  if (!Array.isArray(body.tasks)) {
    res.status(400).json({ error: "Expected { tasks: [...] }" });
    return;
  }
  const created: Task[] = body.tasks.map((t) => {
    const date = t.date || new Date().toISOString().split("T")[0];
    const task: Task = {
      id: uuidv4(),
      title: t.title || "Untitled Task",
      type: t.type || "timed",
      allocatedMinutes: t.allocatedMinutes ?? 45,
      elapsedSeconds: 0,
      timerState: "idle",
      targetQuantity: t.targetQuantity ?? 1,
      currentQuantity: 0,
      unit: t.unit ?? "",
      scheduledTime: t.scheduledTime,
      tags: t.tags ?? [],
      completed: false,
      date,
    };
    tasks.push(task);
    return task;
  });
  res.status(201).json(created);
});

// POST /api/tasks
router.post("/", (req: Request, res: Response) => {
  const body = req.body as Partial<Task>;
  const date = body.date || new Date().toISOString().split("T")[0];
  const newTask: Task = {
    id: uuidv4(),
    title: body.title || "Untitled Task",
    type: body.type || "timed",
    allocatedMinutes: body.allocatedMinutes ?? 45,
    elapsedSeconds: 0,
    timerState: "idle",
    targetQuantity: body.targetQuantity ?? 1,
    currentQuantity: 0,
    unit: body.unit ?? "",
    scheduledTime: body.scheduledTime,
    tags: body.tags ?? [],
    completed: false,
    date,
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// PATCH /api/tasks/:id
router.patch("/:id", (req: Request, res: Response) => {
  const idx = tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const updates = req.body as Partial<Task>;
  tasks[idx] = { ...tasks[idx], ...updates };
  res.json(tasks[idx]);
});

// DELETE /api/tasks/:id
router.delete("/:id", (req: Request, res: Response) => {
  const idx = tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  tasks.splice(idx, 1);
  res.json({ success: true });
});

// GET /api/tasks/summary?date=YYYY-MM-DD  — before /:id
router.get("/summary", (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const dayTasks = tasks.filter((t) => t.date === date);
  const total = dayTasks.length;
  const completed = dayTasks.filter((t) => t.completed).length;
  const raw = total > 0 ? Math.round((completed / total) * 100) : 0;
  res.json({
    date,
    totalTasks: total,
    completedTasks: completed,
    completionPercent: Math.min(100, raw),
  });
});

export default router;
