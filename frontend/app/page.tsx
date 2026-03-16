"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Plus, Zap, CheckCircle2, TrendingUp, Flame, Shield, TriangleAlert } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import { Task, DailySummary } from "@/lib/types";
import { fetchTasks, updateTask, deleteTask, createTask } from "@/lib/api";

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const todayISO = new Date().toISOString().split("T")[0];
const STREAK_STORAGE_KEY = "tt.streak.v1";
const DAILY_GOAL_PERCENT = 70;
const STREAK_SAVE_MILESTONE_DAYS = 15;

interface StreakDayRecord {
  completionPercent: number;
  success: boolean;
  saveUsed: boolean;
}

interface StreakState {
  current: number;
  best: number;
  streakSaves: number;
  consecutiveSuccessDays: number;
  lastSaveUsedDate?: string;
  history: Record<string, StreakDayRecord>;
}

const INITIAL_STREAK: StreakState = {
  current: 0,
  best: 0,
  streakSaves: 0,
  consecutiveSuccessDays: 0,
  history: {},
};

const LOST_QUOTES = [
  {
    author: "Marcus Aurelius",
    text: "Waste no more time arguing what a good man should be. Be one.",
  },
  {
    author: "Kobe Bryant",
    text: "Rest at the end, not in the middle.",
  },
];

const DANGER_QUOTES = [
  {
    author: "Marcus Aurelius",
    text: "You have power over your mind, not outside events.",
  },
  {
    author: "Kobe Bryant",
    text: "The moment you give up is the moment you let someone else win.",
  },
];

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getPastIsoDates(days: number): string[] {
  return Array.from({ length: days }, (_, i) => isoOffset(-i)).reverse();
}

function completionPercentForTasks(dayTasks: Task[]): number {
  if (dayTasks.length === 0) return 0;
  const completed = dayTasks.filter((t) => t.completed).length;
  return Math.min(100, Math.round((completed / dayTasks.length) * 100));
}

function sortByScheduledTime(items: Task[]): Task[] {
  return [...items].sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""));
}

function readStreakState(): StreakState {
  if (typeof window === "undefined") return INITIAL_STREAK;
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return INITIAL_STREAK;
    const parsed = JSON.parse(raw) as StreakState;
    return {
      ...INITIAL_STREAK,
      ...parsed,
      history: parsed.history ?? {},
    };
  } catch {
    return INITIAL_STREAK;
  }
}

function writeStreakState(state: StreakState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
}

function computeSummary(tasks: Task[]): DailySummary {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const raw = total > 0 ? Math.round((completed / total) * 100) : 0;
  return {
    date: todayISO,
    totalTasks: total,
    completedTasks: completed,
    completionPercent: Math.min(100, raw),
  };
}

function demoTasks(): Task[] {
  const id = () => crypto.randomUUID();
  return [
    { id: id(), title: "Deep Work Session", type: "timed", allocatedMinutes: 90, elapsedSeconds: 0, timerState: "idle", completed: false, date: todayISO },
    { id: id(), title: "Morning Run", type: "quantity", targetQuantity: 5, currentQuantity: 0, unit: "km", completed: false, date: todayISO },
    { id: id(), title: "Read & Research", type: "timed", allocatedMinutes: 45, elapsedSeconds: 0, timerState: "idle", completed: false, date: todayISO },
    { id: id(), title: "Water Intake", type: "quantity", targetQuantity: 8, currentQuantity: 0, unit: "glasses", completed: false, date: todayISO },
    { id: id(), title: "Coding Practice", type: "timed", allocatedMinutes: 60, elapsedSeconds: 0, timerState: "idle", completed: false, date: todayISO },
  ];
}

function SectionLabel({ label, count, muted = false }: { label: string; count: number; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`text-xs font-semibold tracking-widest uppercase ${muted ? "text-white/25" : "text-white/50"}`}>
        {label}
      </span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
        style={{
          background: muted ? "rgba(255,255,255,0.04)" : "rgba(96,165,250,0.1)",
          color: muted ? "rgba(255,255,255,0.3)" : "rgba(96,165,250,0.8)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs" style={{ color }}>
        {icon}
        <span className="text-white/40 text-xs">{label}</span>
      </div>
      <span className="text-xl font-bold text-white">{value}</span>
    </div>
  );
}

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakState>(INITIAL_STREAK);
  const [streakEvent, setStreakEvent] = useState<string | null>(null);
  const [dangerAlerts, setDangerAlerts] = useState<string[]>([]);
  const [lowConsistencyAlerts, setLowConsistencyAlerts] = useState<string[]>([]);
  const [quote, setQuote] = useState<{ author: string; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"timed" | "quantity">("timed");
  const [newMinutes, setNewMinutes] = useState(45);
  const [newTarget, setNewTarget] = useState(10);
  const [newUnit, setNewUnit] = useState("reps");

  const summary = computeSummary(tasks);

  const evaluateStreakSignals = useCallback(async (todayTasks: Task[]) => {
    const weekDates = getPastIsoDates(7);
    const weekResult = await Promise.allSettled(weekDates.map((d) => fetchTasks(d)));
    const weekByDate: Record<string, Task[]> = {};
    weekDates.forEach((d, idx) => {
      const v = weekResult[idx];
      weekByDate[d] = v.status === "fulfilled" ? v.value : [];
    });

    const todayPercent = completionPercentForTasks(todayTasks);
    const yesterdayIso = isoOffset(-1);
    const yesterdayPercent = completionPercentForTasks(weekByDate[yesterdayIso] ?? []);

    const warnings: string[] = [];
    if (todayPercent >= DAILY_GOAL_PERCENT && todayPercent < yesterdayPercent) {
      warnings.push(`Streak in Danger: ${todayPercent}% today is lower than yesterday's ${yesterdayPercent}%.`);
    }
    if (todayPercent >= DAILY_GOAL_PERCENT && todayPercent <= DAILY_GOAL_PERCENT + 4) {
      warnings.push("Streak in Danger: you're hovering close to the 70% floor.");
    }
    setDangerAlerts(warnings);

    const consistencyMap: Record<string, { total: number; completed: number; label: string }> = {};
    for (const dayTasks of Object.values(weekByDate)) {
      for (const t of dayTasks) {
        const key = t.title.trim().toLowerCase();
        if (!consistencyMap[key]) consistencyMap[key] = { total: 0, completed: 0, label: t.title };
        consistencyMap[key].total += 1;
        if (t.completed) consistencyMap[key].completed += 1;
      }
    }
    const consistencyAlerts = Object.values(consistencyMap)
      .map((x) => ({ ...x, pct: x.total > 0 ? Math.round((x.completed / x.total) * 100) : 0 }))
      .filter((x) => x.total >= 2 && x.pct < 20)
      .map((x) => `Consistency Alert: \"${x.label}\" is at ${x.pct}% this week.`);
    setLowConsistencyAlerts(consistencyAlerts);

    const currentState = readStreakState();
    if (currentState.history[todayISO]) {
      const updatedHistory = {
        ...currentState.history,
        [todayISO]: {
          ...currentState.history[todayISO],
          completionPercent: todayPercent,
        },
      };
      const updatedState = { ...currentState, history: updatedHistory };
      writeStreakState(updatedState);
      setStreak(updatedState);
      if (warnings.length > 0) {
        setQuote(DANGER_QUOTES[todayPercent % DANGER_QUOTES.length]);
      }
      return;
    }

    const successToday = todayPercent >= DAILY_GOAL_PERCENT;
    let next = { ...currentState, history: { ...currentState.history } };

    if (successToday) {
      next.current += 1;
      next.consecutiveSuccessDays += 1;
      next.best = Math.max(next.best, next.current);
      if (next.consecutiveSuccessDays % STREAK_SAVE_MILESTONE_DAYS === 0) {
        next.streakSaves += 1;
      }
      next.history[todayISO] = {
        completionPercent: todayPercent,
        success: true,
        saveUsed: false,
      };
      setStreakEvent(`Streak up: ${next.current} day${next.current === 1 ? "" : "s"}.`);
      if (warnings.length > 0) {
        setQuote(DANGER_QUOTES[todayPercent % DANGER_QUOTES.length]);
      } else {
        setQuote(null);
      }
    } else {
      const canUseSave = next.streakSaves > 0 && next.lastSaveUsedDate !== yesterdayIso;
      if (canUseSave) {
        next.streakSaves -= 1;
        next.lastSaveUsedDate = todayISO;
        next.history[todayISO] = {
          completionPercent: todayPercent,
          success: false,
          saveUsed: true,
        };
        setStreakEvent("Streak Save activated automatically.");
        setQuote(DANGER_QUOTES[todayPercent % DANGER_QUOTES.length]);
      } else {
        next.current = 0;
        next.consecutiveSuccessDays = 0;
        next.history[todayISO] = {
          completionPercent: todayPercent,
          success: false,
          saveUsed: false,
        };
        setStreakEvent("Streak lost. Reset to 0.");
        setQuote(LOST_QUOTES[todayPercent % LOST_QUOTES.length]);
      }
    }

    writeStreakState(next);
    setStreak(next);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks(todayISO);
      setTasks(sortByScheduledTime(data));
      await evaluateStreakSignals(data);
    } catch {
      setError("Could not connect to server — showing demo data.");
      const fallback = demoTasks();
      setTasks(sortByScheduledTime(fallback));
      await evaluateStreakSignals(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [evaluateStreakSignals]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleUpdate = async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      void evaluateStreakSignals(next);
      return next;
    });
    try {
      await updateTask(id, updates);
    } catch {
      // optimistic update already applied
    }
  };

  const handleDelete = async (id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      void evaluateStreakSignals(next);
      return next;
    });
    try {
      await deleteTask(id);
    } catch {
      // ignore
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const partial: Partial<Task> = {
      title: newTitle.trim(),
      type: newType,
      date: todayISO,
      ...(newType === "timed"
        ? { allocatedMinutes: newMinutes }
        : { targetQuantity: newTarget, currentQuantity: 0, unit: newUnit }),
    };
    setShowAddForm(false);
    setNewTitle("");
    try {
      const created = await createTask(partial);
      setTasks((prev) => {
        const next = sortByScheduledTime([...prev, created]);
        void evaluateStreakSignals(next);
        return next;
      });
    } catch {
      setTasks((prev) => {
        const next = sortByScheduledTime([...prev, { id: crypto.randomUUID(), ...partial, completed: false } as Task]);
        void evaluateStreakSignals(next);
        return next;
      });
    }
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const circumference = 2 * Math.PI * 26;

  return (
    <main className="min-h-screen px-4 py-10 max-w-xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mb-2">
          <CalendarDays size={12} />
          <span>{today}</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Today&apos;s Tasks</h1>

        <motion.div
          key={`streak-${streak.current}`}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="glass rounded-2xl p-4 mt-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-amber-300" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">Current Streak</p>
                <p className="text-xl font-bold text-white">{streak.current} day{streak.current === 1 ? "" : "s"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/35">Best: {streak.best}</p>
              <p className="text-xs text-emerald-300/90 flex items-center justify-end gap-1">
                <Shield size={12} /> Saves: {streak.streakSaves}
              </p>
            </div>
          </div>
          <AnimatePresence>
            {streakEvent && (
              <motion.p
                key={streakEvent}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-xs text-white/60 mt-3"
              >
                {streakEvent}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Daily summary card */}
        <motion.div
          className="glass-strong rounded-2xl p-4 mt-5 flex items-center gap-5"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="32" cy="32" r="26"
                fill="none"
                stroke={summary.completionPercent >= 100 ? "rgba(52,211,153,0.9)" : "rgba(96,165,250,0.9)"}
                strokeWidth="6"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - summary.completionPercent / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
                style={{ filter: "drop-shadow(0 0 4px rgba(96,165,250,0.4))" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{summary.completionPercent}%</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs text-white/40 mb-2">Daily Progress</p>
            <div className="flex items-center gap-5">
              <Stat icon={<Zap size={11} />} label="Active" value={activeTasks.length} color="rgba(96,165,250,0.9)" />
              <Stat icon={<CheckCircle2 size={11} />} label="Done" value={completedTasks.length} color="rgba(52,211,153,0.9)" />
              <Stat icon={<TrendingUp size={11} />} label="Total" value={summary.totalTasks} color="rgba(167,139,250,0.9)" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {dangerAlerts.length > 0 && (
          <motion.div
            key="danger-alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl px-4 py-3 mb-4 text-xs text-rose-200/90"
            style={{ borderLeft: "3px solid rgba(251,113,133,0.6)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <TriangleAlert size={12} className="flex-shrink-0" />
              <span className="font-semibold">Streak in Danger</span>
            </div>
            {dangerAlerts.map((alert) => (
              <p key={alert} className="text-rose-100/80">{alert}</p>
            ))}
          </motion.div>
        )}

        {lowConsistencyAlerts.length > 0 && (
          <motion.div
            key="consistency-alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl px-4 py-3 mb-4 text-xs text-amber-100/90"
            style={{ borderLeft: "3px solid rgba(251,191,36,0.6)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <TriangleAlert size={12} className="flex-shrink-0" />
              <span className="font-semibold">Task Consistency Risk</span>
            </div>
            {lowConsistencyAlerts.map((alert) => (
              <p key={alert} className="text-amber-100/80">{alert}</p>
            ))}
          </motion.div>
        )}

        {quote && (
          <motion.div
            key={`${quote.author}-${quote.text}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-strong rounded-2xl px-4 py-3 mb-4"
            style={{ border: "1px solid rgba(248,113,113,0.25)" }}
          >
            <p className="text-sm text-white/85 leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
            <p className="text-xs text-rose-200/75 mt-1">{quote.author}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl px-4 py-3 mb-4 text-xs text-amber-300/80 flex items-center gap-2"
            style={{ borderLeft: "3px solid rgba(251,191,36,0.5)" }}
          >
            <Zap size={11} className="flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      )}

      {/* Tasks */}
      {!isLoading && (
        <>
          {activeTasks.length > 0 && (
            <section className="mb-6">
              <SectionLabel label="In Progress" count={activeTasks.length} />
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {activeTasks.map((task, i) => (
                    <TaskCard key={task.id} task={task} index={i} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {completedTasks.length > 0 && (
            <section className="mb-6">
              <SectionLabel label="Completed" count={completedTasks.length} muted />
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {completedTasks.map((task, i) => (
                    <TaskCard key={task.id} task={task} index={i} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {tasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl p-10 text-center text-white/30 text-sm"
            >
              No tasks yet. Add one below.
            </motion.div>
          )}
        </>
      )}

      {/* Add task form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="glass-strong rounded-2xl p-5 mb-4"
          >
            <h3 className="text-sm font-semibold text-white/60 mb-4">New Task</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Task name..."
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-400/40 mb-4 transition-colors"
            />
            <div className="flex gap-2 mb-4">
              {(["timed", "quantity"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: newType === t ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${newType === t ? "rgba(96,165,250,0.35)" : "rgba(255,255,255,0.07)"}`,
                    color: newType === t ? "rgba(96,165,250,0.9)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {t === "timed" ? "⏱  Timed" : "#  Quantity"}
                </button>
              ))}
            </div>
            {newType === "timed" ? (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-white/40">Duration (min)</span>
                <input
                  type="number" value={newMinutes} min={5} max={480}
                  onChange={(e) => setNewMinutes(Number(e.target.value))}
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-400/40"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-white/40">Target</span>
                <input
                  type="number" value={newTarget} min={1}
                  onChange={(e) => setNewTarget(Number(e.target.value))}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-400/40"
                />
                <input
                  type="text" value={newUnit} placeholder="unit"
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-400/40"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.4)", color: "rgba(96,165,250,1)" }}
              >
                Add Task
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add button */}
      <motion.button
        onClick={() => setShowAddForm(!showAddForm)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
        style={{
          background: showAddForm ? "rgba(255,255,255,0.03)" : "rgba(96,165,250,0.1)",
          border: `1px solid ${showAddForm ? "rgba(255,255,255,0.07)" : "rgba(96,165,250,0.25)"}`,
          color: showAddForm ? "rgba(255,255,255,0.25)" : "rgba(96,165,250,1)",
        }}
      >
        <Plus size={16} className={`transition-transform duration-200 ${showAddForm ? "rotate-45" : ""}`} />
        {showAddForm ? "Cancel" : "Add Task"}
      </motion.button>
    </main>
  );
}
