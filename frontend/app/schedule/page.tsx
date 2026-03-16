"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CalendarRange, Zap } from "lucide-react";
import WeekTaskChip from "@/components/WeekTaskChip";
import CreateWeekTaskModal, { WeekCreationResult } from "@/components/CreateWeekTaskModal";
import { Task } from "@/lib/types";
import { fetchWeekTasks, createTasksBulk, deleteTask } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Utilities                                                           */
/* ------------------------------------------------------------------ */

function getWeekDates(): string[] {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const WEEK_DATES = getWeekDates();

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function addMinutesToTime(time: string, delta: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + delta) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

/* ------------------------------------------------------------------ */
/*  Day header                                                          */
/* ------------------------------------------------------------------ */

function DayHeader({
  dayIdx,
  date,
  tasks,
  isToday,
  onAdd,
}: {
  dayIdx: number;
  date: string;
  tasks: Task[];
  isToday: boolean;
  onAdd: () => void;
}) {
  const total = tasks.length;
  const done  = tasks.filter((t) => t.completed).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const r = 14, c = 2 * Math.PI * r;
  const dateLabel = new Date(date + "T00:00:00").getDate();

  return (
    <div
      className={`flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${
        isToday ? "glass-strong" : "glass"
      }`}
      style={{
        borderBottom: isToday ? "1px solid rgba(96,165,250,0.25)" : undefined,
      }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: isToday ? "rgba(96,165,250,0.9)" : "rgba(255,255,255,0.35)" }}
      >
        {DAY_SHORT[dayIdx]}
      </span>

      {/* Mini ring */}
      <div className="relative" style={{ width: 36, height: 36 }}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          {total > 0 && (
            <circle
              cx="18" cy="18" r={r}
              fill="none"
              stroke={pct >= 100 ? "rgba(52,211,153,0.8)" : isToday ? "rgba(96,165,250,0.8)" : "rgba(255,255,255,0.3)"}
              strokeWidth="3"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct / 100)}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[11px] font-bold"
            style={{ color: isToday ? "white" : "rgba(255,255,255,0.5)" }}
          >
            {dateLabel}
          </span>
        </div>
      </div>

      {total > 0 && (
        <span className="text-[9px] text-white/25">{done}/{total}</span>
      )}

      {/* Add button */}
      <button
        onClick={onAdd}
        className="group flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:bg-white/8 active:scale-90"
        style={{ color: "rgba(255,255,255,0.25)" }}
        title={`Add task to ${DAY_LONG[dayIdx]}`}
      >
        <Plus size={10} />
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">Task</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty cell                                                          */
/* ------------------------------------------------------------------ */

function EmptyCell({ onAdd }: { onAdd: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onAdd}
      whileTap={{ scale: 0.96 }}
      className="w-full rounded-xl flex items-center justify-center transition-all"
      style={{
        minHeight: 56,
        border: `1px dashed ${hovered ? "rgba(96,165,250,0.35)" : "rgba(255,255,255,0.06)"}`,
        background: hovered ? "rgba(96,165,250,0.04)" : "transparent",
      }}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "rgba(96,165,250,0.7)" }}
          >
            <Plus size={12} />
            <span>Create Task</span>
          </motion.div>
        )}
        {!hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-white/15"
          >
            <Plus size={12} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function SchedulePage() {
  const [tasksByDay, setTasksByDay] = useState<Record<string, Task[]>>(
    Object.fromEntries(WEEK_DATES.map((d) => [d, []]))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalDay, setModalDay] = useState<number | null>(null); // null = closed
  const today = isoToday();

  /* ---- Load ---- */

  const loadAll = useCallback(async () => {
    try {
      const all = await fetchWeekTasks(WEEK_DATES);
      const byDay: Record<string, Task[]> = Object.fromEntries(WEEK_DATES.map((d) => [d, []]));
      for (const t of all) {
        if (byDay[t.date]) byDay[t.date].push(t);
      }
      // Sort each day by scheduledTime
      for (const d of WEEK_DATES) {
        byDay[d].sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""));
      }
      setTasksByDay(byDay);
    } catch {
      setError("Could not reach server — showing local state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ---- Handle modal result ---- */

  const handleModalConfirm = async (result: WeekCreationResult) => {
    setModalDay(null);
    const { draft, startDayIdx, actions } = result;

    // Build list of (date, scheduledTime) pairs to create
    const toCreate: { date: string; time: string }[] = [
      { date: WEEK_DATES[startDayIdx], time: draft.scheduledTime },
    ];

    for (const [dayIdxStr, action] of Object.entries(actions)) {
      const di = Number(dayIdxStr);
      if (action.type === "skip") continue;
      const adjustedTime =
        action.type === "shift"
          ? addMinutesToTime(draft.scheduledTime, action.minutesDelta)
          : draft.scheduledTime;
      toCreate.push({ date: WEEK_DATES[di], time: adjustedTime });
    }

    const payload = toCreate.map(({ date, time }) => ({
      title: draft.title,
      type: draft.type,
      allocatedMinutes: draft.allocatedMinutes,
      targetQuantity: draft.targetQuantity,
      unit: draft.unit,
      scheduledTime: time,
      tags: draft.tags,
      date,
      ...(draft.type === "quantity" ? { currentQuantity: 0 } : {}),
    }));

    // Optimistic update
    const optimistic: Record<string, Task[]> = { ...tasksByDay };
    for (const item of payload) {
      const tempTask: Task = {
        id: crypto.randomUUID(),
        ...item,
        completed: false,
        elapsedSeconds: 0,
        timerState: "idle",
        currentQuantity: 0,
      } as Task;
      if (!optimistic[item.date]) optimistic[item.date] = [];
      optimistic[item.date] = [...optimistic[item.date], tempTask].sort(
        (a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "")
      );
    }
    setTasksByDay(optimistic);

    try {
      const created = await createTasksBulk(payload);
      // Replace temp IDs with real ones
      await loadAll();
      void created;
    } catch {
      // Optimistic update already shown
    }
  };

  const handleDeleteTask = async (id: string, date: string) => {
    setTasksByDay((prev) => ({
      ...prev,
      [date]: prev[date].filter((t) => t.id !== id),
    }));
    try {
      await deleteTask(id);
    } catch {
      // ignore
    }
  };

  /* ---- Grid dimensions ---- */

  const maxRows = Math.max(1, ...WEEK_DATES.map((d) => tasksByDay[d]?.length ?? 0));
  const gridRows = maxRows + 1; // always one trailing empty row

  /* ---- Render ---- */

  return (
    <main className="min-h-screen px-3 sm:px-6 py-8 max-w-7xl mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex items-end justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-white/35 text-xs uppercase tracking-widest mb-1.5">
            <CalendarRange size={12} />
            <span>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Weekly Schedule</h1>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalDay(WEEK_DATES.indexOf(today) >= 0 ? WEEK_DATES.indexOf(today) : 0)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: "rgba(96,165,250,0.12)",
            border: "1px solid rgba(96,165,250,0.28)",
            color: "rgba(96,165,250,1)",
          }}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add Task</span>
        </motion.button>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl px-4 py-3 mb-4 text-xs text-amber-300/80 flex items-center gap-2"
            style={{ borderLeft: "3px solid rgba(251,191,36,0.5)" }}
          >
            <Zap size={11} className="flex-shrink-0" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid outer wrapper — horizontal scroll on small screens */}
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-4">
        <div style={{ minWidth: 560 }}>
          {/* Day headers */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {WEEK_DATES.map((date, i) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <DayHeader
                  dayIdx={i}
                  date={date}
                  tasks={tasksByDay[date] ?? []}
                  isToday={date === today}
                  onAdd={() => setModalDay(i)}
                />
              </motion.div>
            ))}
          </div>

          {/* Task grid rows */}
          {loading ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              {Array.from({ length: 7 * 3 }).map((_, i) => (
                <div key={i} className="glass rounded-xl h-14 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: gridRows }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
                >
                  {WEEK_DATES.map((date, colIdx) => {
                    const dayTasks = tasksByDay[date] ?? [];
                    const task = dayTasks[rowIdx];
                    const isLastRow = rowIdx === gridRows - 1;
                    const hasTask = !!task;

                    return (
                      <div key={date}>
                        <AnimatePresence mode="popLayout">
                          {hasTask ? (
                            <motion.div
                              key={task.id}
                              layout
                              initial={{ opacity: 0, scale: 0.92, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.88, y: -8 }}
                              transition={{ duration: 0.25, delay: colIdx * 0.03 }}
                            >
                              <WeekTaskChip
                                task={task}
                                onClick={() => handleDeleteTask(task.id, date)}
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              key={`empty-${date}-${rowIdx}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <EmptyCell onAdd={() => setModalDay(colIdx)} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalDay !== null && (
          <CreateWeekTaskModal
            key="week-modal"
            startDayIdx={modalDay}
            weekDates={WEEK_DATES}
            onConfirm={handleModalConfirm}
            onClose={() => setModalDay(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
