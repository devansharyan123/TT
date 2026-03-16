"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Trophy } from "lucide-react";
import { fetchTasks } from "@/lib/api";
import { Task } from "@/lib/types";
import { getSelectedSection, SECTION_EVENT, getStreakStorageKey } from "@/lib/sections";

interface StreakState {
  current: number;
  best: number;
}

function isoForOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function startOfWeekMonday(): Date {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function completionPercent(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.completed).length;
  return Math.round((done / tasks.length) * 100);
}

function readStreak(section: string): StreakState {
  if (typeof window === "undefined") return { current: 0, best: 0 };
  try {
    const raw = localStorage.getItem(getStreakStorageKey(section));
    if (!raw) return { current: 0, best: 0 };
    const parsed = JSON.parse(raw) as { current?: number; best?: number };
    return { current: parsed.current ?? 0, best: parsed.best ?? 0 };
  } catch {
    return { current: 0, best: 0 };
  }
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_BUCKETS = [
  { key: "06-09", from: 6, to: 9 },
  { key: "09-12", from: 9, to: 12 },
  { key: "12-15", from: 12, to: 15 },
  { key: "15-18", from: 15, to: 18 },
  { key: "18-21", from: 18, to: 21 },
  { key: "21-24", from: 21, to: 24 },
];

export default function WeeklyStatsPage() {
  const [streak, setStreak] = useState<StreakState>({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("Work");
  const [weekByDate, setWeekByDate] = useState<Record<string, Task[]>>({});
  const [monthByDate, setMonthByDate] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    setSelectedSection(getSelectedSection());
    const listener = (e: Event) => {
      const custom = e as CustomEvent<{ section?: string }>;
      setSelectedSection(custom.detail?.section ?? getSelectedSection());
    };
    window.addEventListener(SECTION_EVENT, listener);
    return () => window.removeEventListener(SECTION_EVENT, listener);
  }, []);

  useEffect(() => {
    const run = async () => {
      setStreak(readStreak(selectedSection));

      const monday = startOfWeekMonday();
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return toIso(d);
      });

      const monthDates = Array.from({ length: 30 }, (_, i) => isoForOffset(-(29 - i)));

      const [weekResult, monthResult] = await Promise.all([
        Promise.allSettled(weekDates.map((d) => fetchTasks(d, selectedSection))),
        Promise.allSettled(monthDates.map((d) => fetchTasks(d, selectedSection))),
      ]);

      const weekMap: Record<string, Task[]> = {};
      weekDates.forEach((d, idx) => {
        const r = weekResult[idx];
        weekMap[d] = r.status === "fulfilled" ? r.value : [];
      });

      const monthMap: Record<string, Task[]> = {};
      monthDates.forEach((d, idx) => {
        const r = monthResult[idx];
        monthMap[d] = r.status === "fulfilled" ? r.value : [];
      });

      setWeekByDate(weekMap);
      setMonthByDate(monthMap);
      setLoading(false);
    };

    void run();
  }, [selectedSection]);

  const weekData = useMemo(() => {
    const monday = startOfWeekMonday();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = toIso(d);
      const tasks = weekByDate[iso] ?? [];
      const pct = completionPercent(tasks);
      return {
        day: DAY_SHORT[i],
        date: iso,
        completion: pct,
        total: tasks.length,
      };
    });
  }, [weekByDate]);

  const dailyTimeBars = useMemo(() => {
    const today = isoForOffset(0);
    const dayTasks = weekByDate[today] ?? [];

    return TIME_BUCKETS.map((bucket) => {
      const tasks = dayTasks.filter((t) => {
        if (!t.scheduledTime) return false;
        const hour = Number(t.scheduledTime.split(":")[0]);
        return hour >= bucket.from && hour < bucket.to;
      });
      return {
        slot: bucket.key,
        completion: completionPercent(tasks),
      };
    });
  }, [weekByDate]);

  const taskMiniCharts = useMemo(() => {
    const allWeekTasks = Object.values(weekByDate).flat();
    const grouped: Record<string, Task[]> = {};
    for (const t of allWeekTasks) {
      const key = t.title.trim().toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    }

    const top = Object.values(grouped)
      .sort((a, b) => b.length - a.length)
      .slice(0, 4);

    return top.map((items) => {
      const label = items[0]?.title ?? "Task";
      const series = weekData.map((d) => {
        const dayItems = (weekByDate[d.date] ?? []).filter(
          (x) => x.title.trim().toLowerCase() === label.trim().toLowerCase()
        );

        let perf = 0;
        if (dayItems.length > 0) {
          const scores = dayItems.map((task) => {
            if (task.type === "timed") {
              const allocated = task.allocatedMinutes ?? 0;
              const elapsedMinutes = Math.round((task.elapsedSeconds ?? 0) / 60);
              const raw = allocated > 0 ? Math.round((elapsedMinutes / allocated) * 100) : 0;
              return task.completed ? 100 : Math.min(100, raw);
            }
            const target = task.targetQuantity ?? 0;
            const current = task.currentQuantity ?? 0;
            const raw = target > 0 ? Math.round((current / target) * 100) : 0;
            return task.completed ? 100 : Math.min(100, raw);
          });
          perf = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }

        return { day: d.day, performance: perf };
      });

      return { label, series };
    });
  }, [weekByDate, weekData]);

  const monthOverview = useMemo(() => {
    const dates = Array.from({ length: 30 }, (_, i) => isoForOffset(-(29 - i)));
    return dates.map((iso) => {
      const tasks = monthByDate[iso] ?? [];
      return {
        day: iso.slice(5),
        completion: completionPercent(tasks),
      };
    });
  }, [monthByDate]);

  return (
    <main className="min-h-screen px-3 sm:px-6 py-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-4"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Weekly Stats</p>
        <h1 className="text-3xl font-bold text-white">Performance Command Center</h1>
        <p className="text-xs text-blue-200/70 mt-1">Section: {selectedSection}</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 text-orange-300 mb-2"><Flame size={15} /> Current Streak</div>
          <p className="text-5xl font-black text-white">{streak.current}</p>
          <p className="text-xs text-white/45 mt-1">days in a row above 70%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-strong rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 text-emerald-300 mb-2"><Trophy size={15} /> Longest Streak</div>
          <p className="text-5xl font-black text-white">{streak.best}</p>
          <p className="text-xs text-white/45 mt-1">all-time best consistency run</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <section className="glass rounded-2xl p-4 h-[320px]">
          <p className="text-sm font-semibold text-white/80 mb-3">Weekly Work vs Day</p>
          <ResponsiveContainer width="100%" height="88%">
            <LineChart data={weekData}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
              <ReferenceLine y={70} stroke="rgba(52,211,153,0.85)" strokeDasharray="6 4" />
              <Line type="monotone" dataKey="completion" stroke="rgba(96,165,250,1)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="glass rounded-2xl p-4 h-[320px]">
          <p className="text-sm font-semibold text-white/80 mb-3">Daily Work vs Time</p>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={dailyTimeBars}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="slot" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
              <ReferenceLine y={70} stroke="rgba(248,113,113,0.95)" strokeDasharray="6 4" />
              <Bar dataKey="completion" fill="rgba(59,130,246,0.85)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {(taskMiniCharts.length > 0 ? taskMiniCharts : Array.from({ length: 4 }, (_, i) => ({ label: `Task ${i + 1}`, series: weekData.map((d) => ({ day: d.day, performance: 0 })) }))).map((item, idx) => (
          <section key={item.label} className="glass rounded-2xl p-3 h-[220px]">
            <p className="text-xs font-semibold text-white/75 mb-2 truncate">{item.label}</p>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={item.series}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} />
                <ReferenceLine y={70} stroke="rgba(52,211,153,0.7)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="performance" stroke={idx % 2 === 0 ? "rgba(167,139,250,1)" : "rgba(56,189,248,1)"} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </section>
        ))}
      </div>

      <section className="glass-strong rounded-2xl p-4 h-[340px]">
        <p className="text-sm font-semibold text-white/80 mb-3">Last Month Performance Overview</p>
        <ResponsiveContainer width="100%" height="88%">
          <AreaChart data={monthOverview}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} minTickGap={20} />
            <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
            <ReferenceLine y={70} stroke="rgba(52,211,153,0.8)" strokeDasharray="6 4" />
            <Area type="monotone" dataKey="completion" stroke="rgba(34,197,94,0.95)" fill="rgba(34,197,94,0.2)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {loading && <p className="text-xs text-white/45 mt-3">Loading analytics…</p>}
    </main>
  );
}
