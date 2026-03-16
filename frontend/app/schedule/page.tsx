"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CalendarRange, Zap, X, Clock, Hash } from "lucide-react";
import WeekTaskChip from "@/components/WeekTaskChip";
import CreateWeekTaskModal, { WeekCreationResult } from "@/components/CreateWeekTaskModal";
import { Task } from "@/lib/types";
import { fetchWeekTasks, createTasksBulk, deleteTask, updateTask } from "@/lib/api";

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
/*  Edit modal                                                         */
/* ------------------------------------------------------------------ */

function EditWeekTaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [type, setType] = useState<Task["type"]>(task.type);
  const [allocatedMinutes, setAllocatedMinutes] = useState(task.allocatedMinutes ?? 45);
  const [targetQuantity, setTargetQuantity] = useState(task.targetQuantity ?? 1);
  const [unit, setUnit] = useState(task.unit ?? "reps");
  const [scheduledTime, setScheduledTime] = useState(task.scheduledTime ?? "09:00");
  const [endTime, setEndTime] = useState(task.endTime ?? "10:00");
  const [tagsText, setTagsText] = useState((task.tags ?? []).join(", "));

  const handleSave = () => {
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      title: title.trim() || "Untitled Task",
      type,
      allocatedMinutes: type === "timed" ? allocatedMinutes : undefined,
      targetQuantity: type === "quantity" ? targetQuantity : undefined,
      unit: type === "quantity" ? unit : "",
      scheduledTime,
      endTime,
      tags,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md glass-strong rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/35 uppercase tracking-widest mb-0.5">Weekly Task</p>
              <h2 className="text-lg font-bold text-white">Edit Task</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <X size={16} />
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task name..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-400/40 transition-colors"
          />

          <div className="flex gap-2">
            {(["timed", "quantity"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: type === t ? (t === "timed" ? "rgba(96,165,250,0.15)" : "rgba(167,139,250,0.15)") : "rgba(255,255,255,0.04)",
                  border: `1px solid ${type === t ? (t === "timed" ? "rgba(96,165,250,0.35)" : "rgba(167,139,250,0.35)") : "rgba(255,255,255,0.07)"}`,
                  color: type === t ? (t === "timed" ? "rgba(96,165,250,1)" : "rgba(167,139,250,1)") : "rgba(255,255,255,0.35)",
                }}
              >
                {t === "timed" ? <Clock size={13} /> : <Hash size={13} />}
                {t === "timed" ? "Timed" : "Quantity"}
              </button>
            ))}
          </div>

          {type === "timed" ? (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Clock size={14} className="text-blue-400/60" />
              <span className="text-xs text-white/40 flex-1">Duration</span>
              <input
                type="number"
                value={allocatedMinutes}
                min={5}
                max={480}
                onChange={(e) => setAllocatedMinutes(Number(e.target.value))}
                className="w-16 bg-transparent text-sm text-white text-right outline-none"
              />
              <span className="text-xs text-white/35">min</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Hash size={14} className="text-purple-400/60" />
              <span className="text-xs text-white/40">Target</span>
              <input
                type="number"
                value={targetQuantity}
                min={1}
                onChange={(e) => setTargetQuantity(Number(e.target.value))}
                className="w-14 bg-transparent text-sm text-white text-right outline-none"
              />
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit"
                className="w-20 bg-white/8 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/25 outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <Clock size={14} className="text-white/30" />
            <span className="text-xs text-white/40 flex-1">Scheduled time</span>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-transparent text-sm text-white outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <Clock size={14} className="text-white/30" />
            <span className="text-xs text-white/40 flex-1">End time</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-transparent text-sm text-white outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>

          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-400/40 transition-colors"
          />

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.4)", color: "rgba(96,165,250,1)" }}
            >
              Save Changes
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.35)", color: "rgba(248,113,113,1)" }}
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
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
  const [editingTask, setEditingTask] = useState<{ task: Task; date: string } | null>(null);
  const [extraRows, setExtraRows] = useState(0);
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
    const { entries } = result;

    if (entries.length === 0) return;

    const payload = entries.map(({ dayIdx, draft }) => ({
      title: draft.title,
      type: draft.type,
      allocatedMinutes: draft.allocatedMinutes,
      targetQuantity: draft.targetQuantity,
      unit: draft.unit,
      scheduledTime: draft.scheduledTime,
      endTime: draft.endTime,
      tags: draft.tags,
      date: WEEK_DATES[dayIdx],
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

  const handleSaveTaskEdits = async (id: string, date: string, updates: Partial<Task>) => {
    setTasksByDay((prev) => ({
      ...prev,
      [date]: prev[date]
        .map((t) => (t.id === id ? { ...t, ...updates } : t))
        .sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "")),
    }));
    setEditingTask(null);
    try {
      await updateTask(id, updates);
    } catch {
      // Optimistic update already shown.
    }
  };

  /* ---- Grid dimensions ---- */

  const maxRows = Math.max(1, ...WEEK_DATES.map((d) => tasksByDay[d]?.length ?? 0));
  const gridRows = Math.max(7, maxRows + extraRows);

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
          <h1 className="text-3xl font-bold text-white tracking-tight">Timetable</h1>
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
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "52px repeat(7, minmax(0, 1fr))" }}>
            <div className="glass rounded-2xl flex items-center justify-center text-[11px] text-white/40 font-semibold">#</div>
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
            <div className="grid gap-2" style={{ gridTemplateColumns: "52px repeat(7, minmax(0, 1fr))" }}>
              {Array.from({ length: 8 * 3 }).map((_, i) => (
                <div key={i} className="glass rounded-xl h-14 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: gridRows }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "52px repeat(7, minmax(0, 1fr))" }}
                >
                  <div className="glass rounded-xl min-h-[56px] flex items-center justify-center text-xs text-white/35 font-semibold">
                    {rowIdx + 1}
                  </div>
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
                                onClick={() => setEditingTask({ task, date })}
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

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setExtraRows((r) => r + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: "rgba(96,165,250,0.14)",
                    border: "1px solid rgba(96,165,250,0.28)",
                    color: "rgba(147,197,253,1)",
                  }}
                >
                  Add Row
                </button>
              </div>
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
        {editingTask && (
          <EditWeekTaskModal
            key={`edit-${editingTask.task.id}`}
            task={editingTask.task}
            onClose={() => setEditingTask(null)}
            onSave={(updates) => handleSaveTaskEdits(editingTask.task.id, editingTask.date, updates)}
            onDelete={async () => {
              await handleDeleteTask(editingTask.task.id, editingTask.date);
              setEditingTask(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
