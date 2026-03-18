import { Router, Request, Response } from "express";
import { Prisma, TaskType, TimerState } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Task } from "../types";

const router = Router();

const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || "demo@tasktracker.local";
const DEFAULT_SECTION_NAME = "Work";

function toDayStart(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00.000Z`);
}

function toDayEndExclusive(dateIso: string): Date {
  const d = toDayStart(dateIso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function ensureDateIso(input?: string): string {
  if (!input) return new Date().toISOString().split("T")[0];
  return input;
}

function toTaskType(value?: string): TaskType {
  return value === "quantity" ? "quantity" : "timed";
}

function toTimerState(value?: string): TimerState {
  const allowed: TimerState[] = ["idle", "running", "paused", "break", "done"];
  return allowed.includes(value as TimerState) ? (value as TimerState) : "idle";
}

function serializeTask(task: Prisma.TaskGetPayload<{ include: { section: true } }>): Task {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    allocatedMinutes: task.allocatedMinutes ?? undefined,
    elapsedSeconds: task.elapsedSeconds,
    timerState: task.timerState,
    targetQuantity: task.targetQuantity ?? undefined,
    currentQuantity: task.currentQuantity,
    unit: task.unit ?? undefined,
    scheduledTime: task.scheduledTime ?? undefined,
    endTime: task.endTime ?? undefined,
    tags: task.tags,
    completed: task.completed,
    date: task.date.toISOString().split("T")[0],
    section: task.section.name,
  };
}

async function resolveUser(req: Request) {
  if (req.authUser?.userId) {
    const found = await prisma.user.findUnique({ where: { id: req.authUser.userId } });
    if (found) return found;
  }

  const headerUserId = req.header("x-user-id");
  const headerEmail = req.header("x-user-email");

  if (headerUserId) {
    const found = await prisma.user.findUnique({ where: { id: headerUserId } });
    if (found) return found;
  }

  const email = headerEmail || DEFAULT_USER_EMAIL;
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      displayName: email.split("@")[0],
    },
  });
}

async function resolveSection(userId: string, sectionName?: string) {
  const name = (sectionName || DEFAULT_SECTION_NAME).trim() || DEFAULT_SECTION_NAME;
  return prisma.taskSection.upsert({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
    update: {},
    create: {
      userId,
      name,
    },
  });
}

// GET /api/tasks?date=YYYY-MM-DD&section=Work
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const dateIso = ensureDateIso(req.query.date as string | undefined);
    const sectionName = (req.query.section as string | undefined) || DEFAULT_SECTION_NAME;
    const section = await resolveSection(user.id, sectionName);

    const dayTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        sectionId: section.id,
        date: {
          gte: toDayStart(dateIso),
          lt: toDayEndExclusive(dateIso),
        },
      },
      include: { section: true },
      orderBy: [{ scheduledTime: "asc" }, { createdAt: "asc" }],
    });

    res.json(dayTasks.map(serializeTask));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks", detail: String(error) });
  }
});

// POST /api/tasks/bulk
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const body = req.body as { tasks: Partial<Task>[] };
    if (!Array.isArray(body.tasks)) {
      res.status(400).json({ error: "Expected { tasks: [...] }" });
      return;
    }

    const user = await resolveUser(req);

    const created = await prisma.$transaction(async (tx) => {
      const rows: Prisma.TaskGetPayload<{ include: { section: true } }>[] = [];

      for (const t of body.tasks) {
        const dateIso = ensureDateIso(t.date);
        const section = await tx.taskSection.upsert({
          where: {
            userId_name: {
              userId: user.id,
              name: (t.section || DEFAULT_SECTION_NAME).trim() || DEFAULT_SECTION_NAME,
            },
          },
          update: {},
          create: {
            userId: user.id,
            name: (t.section || DEFAULT_SECTION_NAME).trim() || DEFAULT_SECTION_NAME,
          },
        });

        const row = await tx.task.create({
          data: {
            userId: user.id,
            sectionId: section.id,
            title: t.title || "Untitled Task",
            type: toTaskType(t.type),
            allocatedMinutes: t.allocatedMinutes ?? 45,
            elapsedSeconds: t.elapsedSeconds ?? 0,
            timerState: toTimerState(t.timerState),
            targetQuantity: t.targetQuantity ?? 1,
            currentQuantity: t.currentQuantity ?? 0,
            unit: t.unit ?? "",
            scheduledTime: t.scheduledTime,
            endTime: t.endTime,
            tags: t.tags ?? [],
            completed: t.completed ?? false,
            date: toDayStart(dateIso),
          },
          include: { section: true },
        });

        rows.push(row);
      }

      return rows;
    });

    res.status(201).json(created.map(serializeTask));
  } catch (error) {
    res.status(500).json({ error: "Failed to bulk-create tasks", detail: String(error) });
  }
});

// POST /api/tasks
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<Task>;
    const user = await resolveUser(req);
    const dateIso = ensureDateIso(body.date);
    const section = await resolveSection(user.id, body.section || DEFAULT_SECTION_NAME);

    const created = await prisma.task.create({
      data: {
        userId: user.id,
        sectionId: section.id,
        title: body.title || "Untitled Task",
        type: toTaskType(body.type),
        allocatedMinutes: body.allocatedMinutes ?? 45,
        elapsedSeconds: body.elapsedSeconds ?? 0,
        timerState: toTimerState(body.timerState),
        targetQuantity: body.targetQuantity ?? 1,
        currentQuantity: body.currentQuantity ?? 0,
        unit: body.unit ?? "",
        scheduledTime: body.scheduledTime,
        endTime: body.endTime,
        tags: body.tags ?? [],
        completed: body.completed ?? false,
        date: toDayStart(dateIso),
      },
      include: { section: true },
    });

    res.status(201).json(serializeTask(created));
  } catch (error) {
    res.status(500).json({ error: "Failed to create task", detail: String(error) });
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const taskId = String(req.params.id);
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const updates = req.body as Partial<Task>;

    let nextSectionId: string | undefined;
    if (updates.section) {
      const section = await resolveSection(user.id, updates.section);
      nextSectionId = section.id;
    }

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.type !== undefined ? { type: toTaskType(updates.type) } : {}),
        ...(updates.allocatedMinutes !== undefined ? { allocatedMinutes: updates.allocatedMinutes } : {}),
        ...(updates.elapsedSeconds !== undefined ? { elapsedSeconds: updates.elapsedSeconds } : {}),
        ...(updates.timerState !== undefined ? { timerState: toTimerState(updates.timerState) } : {}),
        ...(updates.targetQuantity !== undefined ? { targetQuantity: updates.targetQuantity } : {}),
        ...(updates.currentQuantity !== undefined ? { currentQuantity: updates.currentQuantity } : {}),
        ...(updates.unit !== undefined ? { unit: updates.unit } : {}),
        ...(updates.scheduledTime !== undefined ? { scheduledTime: updates.scheduledTime } : {}),
        ...(updates.endTime !== undefined ? { endTime: updates.endTime } : {}),
        ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
        ...(updates.completed !== undefined ? { completed: updates.completed } : {}),
        ...(updates.date !== undefined ? { date: toDayStart(updates.date) } : {}),
        ...(nextSectionId ? { sectionId: nextSectionId } : {}),
      },
      include: { section: true },
    });

    res.json(serializeTask(updated));
  } catch (error) {
    res.status(500).json({ error: "Failed to update task", detail: String(error) });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const taskId = String(req.params.id);
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    await prisma.task.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task", detail: String(error) });
  }
});

// GET /api/tasks/summary?date=YYYY-MM-DD&section=Work
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const dateIso = ensureDateIso(req.query.date as string | undefined);
    const sectionName = (req.query.section as string | undefined) || DEFAULT_SECTION_NAME;
    const section = await resolveSection(user.id, sectionName);

    const dayTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        sectionId: section.id,
        date: {
          gte: toDayStart(dateIso),
          lt: toDayEndExclusive(dateIso),
        },
      },
      select: {
        id: true,
        type: true,
        completed: true,
        allocatedMinutes: true,
        targetQuantity: true,
        currentQuantity: true,
      },
    });

    // Progress model:
    // - Timed work pool = sum of scheduled timed minutes
    // - Quantity pool = 20% of timed pool (shared across all quantity tasks)
    const timedTasks = dayTasks.filter((t) => t.type === "timed" && (t.allocatedMinutes ?? 0) > 0);
    const quantityTasks = dayTasks.filter((t) => t.type === "quantity");

    const timedMinutes = timedTasks.reduce((sum, t) => sum + (t.allocatedMinutes ?? 0), 0);
    const quantityPoolMinutes = quantityTasks.length > 0 ? timedMinutes * 0.2 : 0;
    const totalWorkMinutes = timedMinutes + quantityPoolMinutes;

    let totalWorkPercent = 0;
    const totalTasks = dayTasks.length;
    const completedTasks = dayTasks.filter((t) => t.completed).length;

    if (totalWorkMinutes > 0) {
      const timedCompletedMinutes = timedTasks.reduce((sum, t) => {
        return t.completed ? sum + (t.allocatedMinutes ?? 0) : sum;
      }, 0);
      totalWorkPercent += (timedCompletedMinutes / totalWorkMinutes) * 100;

      if (quantityTasks.length > 0 && quantityPoolMinutes > 0) {
        const quantityProgressSum = quantityTasks.reduce((sum, t) => {
          const target = Math.max(1, t.targetQuantity ?? 1);
          const ratio = Math.max(0, Math.min(1, (t.currentQuantity ?? 0) / target));
          return sum + ratio;
        }, 0);
        const quantityProgressRatio = quantityProgressSum / quantityTasks.length;
        totalWorkPercent += ((quantityPoolMinutes / totalWorkMinutes) * 100) * quantityProgressRatio;
      }
    }

    res.json({
      date: dateIso,
      totalTasks,
      completedTasks,
      completionPercent: Math.min(100, Math.round(totalWorkPercent)),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary", detail: String(error) });
  }
});

export default router;
