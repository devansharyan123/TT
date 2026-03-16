"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
import { TriangleAlert, Sparkles } from "lucide-react";
import { fetchTasks } from "@/lib/api";
import { Task } from "@/lib/types";

interface TaskAggregate {
  key: string;
  label: string;
  total: number;
  completed: number;
  completion: number;
}

interface DailyTaskTrend {
  day: string;
  completion: number;
}

function isoForOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function completionPercent(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

const MOTIVATION_QUOTES = [
  { author: "Marcus Aurelius", text: "The impediment to action advances action." },
  { author: "Kobe Bryant", text: "Those times when you get up early and work hard... that's the dream." },
];

const DISCIPLINE_QUOTES = [
  { author: "Marcus Aurelius", text: "If it is not right, do not do it; if it is not true, do not say it." },
  { author: "Kobe Bryant", text: "Great things come from hard work and perseverance." },
];

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [dateTasks, setDateTasks] = useState<Record<string, Task[]>>({});
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const dates = Array.from({ length: 14 }, (_, i) => isoForOffset(-(13 - i)));
      const result = await Promise.allSettled(dates.map((d) => fetchTasks(d)));
      const map: Record<string, Task[]> = {};
      dates.forEach((d, i) => {
        const r = result[i];
        map[d] = r.status === "fulfilled" ? r.value : [];
      });
      setDateTasks(map);
      setLoading(false);
    };
    void run();
  }, []);

  const overallPerformance = useMemo(() => {
    const all = Object.values(dateTasks).flat();
    return completionPercent(all);
  }, [dateTasks]);

  const taskAggregates = useMemo(() => {
    const grouped: Record<string, TaskAggregate> = {};
    for (const tasks of Object.values(dateTasks)) {
      for (const t of tasks) {
        const key = t.title.trim().toLowerCase();
        if (!grouped[key]) {
          grouped[key] = {
            key,
            label: t.title,
            total: 0,
            completed: 0,
            completion: 0,
          };
        }
        grouped[key].total += 1;
        if (t.completed) grouped[key].completed += 1;
      }
    }

    const values = Object.values(grouped).map((x) => ({
      ...x,
      completion: x.total > 0 ? Math.round((x.completed / x.total) * 100) : 0,
    }));

    return values.sort((a, b) => a.completion - b.completion);
  }, [dateTasks]);

  const underperformers = useMemo(
    () => taskAggregates.filter((x) => x.total >= 2 && x.completion < 70),
    [taskAggregates]
  );

  useEffect(() => {
    if (!selectedTaskKey && underperformers.length > 0) {
      setSelectedTaskKey(underperformers[0].key);
    }
  }, [underperformers, selectedTaskKey]);

  const selectedTrend = useMemo(() => {
    if (!selectedTaskKey) return [] as DailyTaskTrend[];
    const dates = Object.keys(dateTasks).sort();
    return dates.map((iso) => {
      const hits = (dateTasks[iso] ?? []).filter((t) => t.title.trim().toLowerCase() === selectedTaskKey);
      return {
        day: iso.slice(5),
        completion: completionPercent(hits),
      };
    });
  }, [dateTasks, selectedTaskKey]);

  const quote = useMemo(() => {
    const source = overallPerformance >= 70 ? MOTIVATION_QUOTES : DISCIPLINE_QUOTES;
    return source[overallPerformance % source.length];
  }, [overallPerformance]);

  return (
    <main className="min-h-screen px-3 sm:px-6 py-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-4"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Insights</p>
        <h1 className="text-3xl font-bold text-white">Underperformance Radar</h1>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-4">
        <section className="glass-strong rounded-2xl p-4 xl:col-span-2 h-[330px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-white/85">Task Completion Heat</p>
            <p className="text-xs text-white/45">14-day window</p>
          </div>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={underperformers.length > 0 ? underperformers : taskAggregates.slice(0, 6)}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} interval={0} angle={-14} textAnchor="end" height={56} />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
              <ReferenceLine y={70} stroke="rgba(251,191,36,0.9)" strokeDasharray="6 4" />
              <Bar dataKey="completion" fill="rgba(248,113,113,0.85)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-blue-200">
            <Sparkles size={14} />
            <p className="text-sm font-semibold">Leader Quote</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${quote.author}-${quote.text}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-sm text-white/90 leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
              <p className="text-xs text-blue-200/75 mt-2">{quote.author}</p>
              <p className="text-xs text-white/40 mt-3">
                {overallPerformance >= 70
                  ? "Performance is above threshold. Keep pressure high."
                  : "Performance is below threshold. Discipline mode engaged."}
              </p>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <section className="glass rounded-2xl p-4 h-[320px]">
          <p className="text-sm font-semibold text-white/80 mb-3">Selected Task Trend</p>
          <ResponsiveContainer width="100%" height="88%">
            <LineChart data={selectedTrend}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
              <ReferenceLine y={70} stroke="rgba(251,191,36,0.9)" strokeDasharray="6 4" />
              <Line type="monotone" dataKey="completion" stroke="rgba(56,189,248,1)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="glass rounded-2xl p-4">
          <p className="text-sm font-semibold text-white/80 mb-3">Underperforming Tasks</p>
          <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
            {(underperformers.length > 0 ? underperformers : taskAggregates.slice(0, 8)).map((task) => {
              const active = selectedTaskKey === task.key;
              return (
                <motion.button
                  key={task.key}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedTaskKey(task.key)}
                  className="w-full text-left rounded-xl p-3"
                  style={{
                    background: active ? "rgba(248,113,113,0.14)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{task.label}</p>
                    <span className="text-xs text-rose-200/90">{task.completion}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${task.completion}%` }}
                      className="h-full"
                      style={{ background: "rgba(248,113,113,0.95)" }}
                    />
                  </div>
                  <p className="text-[11px] text-white/45 mt-1">{task.completed}/{task.total} completions</p>
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>

      {!loading && underperformers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl px-4 py-3 text-xs text-emerald-200/90 flex items-center gap-2"
          style={{ borderLeft: "3px solid rgba(52,211,153,0.7)" }}
        >
          <Sparkles size={12} /> Strong run: no major underperformers detected.
        </motion.div>
      )}

      {underperformers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl px-4 py-3 text-xs text-amber-100/90 flex items-center gap-2"
          style={{ borderLeft: "3px solid rgba(245,158,11,0.7)" }}
        >
          <TriangleAlert size={12} /> {underperformers.length} task(s) are below 70% completion.
        </motion.div>
      )}
    </main>
  );
}
