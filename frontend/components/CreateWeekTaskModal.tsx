"use client";

import { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { X, Clock, Hash } from "lucide-react";
import { WeekTaskDraft, TaskType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface WeekCreationResult {
  entries: Array<{ dayIdx: number; draft: WeekTaskDraft }>;
}

interface Props {
  /** 0-based day index that was clicked (0=Mon…6=Sun) */
  startDayIdx?: number;
  weekDates: string[];             // [Mon ISO, …, Sun ISO]
  onConfirm: (result: WeekCreationResult) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState("");
  const commit = () => {
    const trimmed = val.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setVal("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
    if (e.key === "Backspace" && !val && tags.length) onChange(tags.slice(0, -1));
  };
  return (
    <div
      className="flex flex-wrap gap-1.5 items-center min-h-[38px] px-3 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium cursor-pointer"
          style={{ background: "rgba(96,165,250,0.12)", color: "rgba(96,165,250,0.9)", border: "1px solid rgba(96,165,250,0.2)" }}
          onClick={() => onChange(tags.filter((x) => x !== t))}
        >
          #{t} <X size={9} />
        </span>
      ))}
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={tags.length ? "" : "Add tags…"}
        className="flex-1 min-w-[80px] bg-transparent outline-none text-xs text-white placeholder:text-white/25"
      />
    </div>
  );
}

function DayBadge({ idx, active, today }: { idx: number; active: boolean; today?: boolean }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: active ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? "rgba(96,165,250,0.35)" : today ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
        color: active ? "rgba(96,165,250,1)" : today ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
      }}
    >
      {DAY_LABELS[idx]}
      {today && <span className="w-1 h-1 rounded-full bg-current" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main modal                                                        */
/* ------------------------------------------------------------------ */

export default function CreateWeekTaskModal({ startDayIdx = 0, weekDates: _weekDates, onConfirm, onClose }: Props) {
  const [title, setTitle]     = useState("");
  const [type, setType]       = useState<TaskType>("timed");
  const [minutes, setMinutes] = useState(45);
  const [target, setTarget]   = useState(10);
  const [unit, setUnit]       = useState("reps");
  const [tags, setTags]       = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [currentDayIdx, setCurrentDayIdx] = useState(startDayIdx);
  const [entriesByDay, setEntriesByDay] = useState<Record<number, WeekTaskDraft[]>>({});
  const [currentDayDrafts, setCurrentDayDrafts] = useState<WeekTaskDraft[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasValidRange = timeToMinutes(endTime) > timeToMinutes(startTime);

  const resetForm = () => {
    setTitle("");
    setType("timed");
    setMinutes(45);
    setTarget(10);
    setUnit("reps");
    setTags([]);
    setStartTime("09:00");
    setEndTime("10:00");
  };

  const buildDraft = (requireTitle = true): WeekTaskDraft | null => {
    if (!title.trim()) {
      if (requireTitle) setValidationError("Task name is required.");
      return null;
    }
    if (!hasValidRange) {
      setValidationError("End time should be after scheduled time.");
      return null;
    }
    setValidationError(null);
    return {
      title: title.trim(),
      type,
      allocatedMinutes: minutes,
      targetQuantity: target,
      unit,
      scheduledTime: startTime,
      endTime,
      tags,
    };
  };

  const collectDayDrafts = (): WeekTaskDraft[] | null => {
    const list = [...currentDayDrafts];
    const pending = buildDraft(false);
    if (pending) list.push(pending);
    if (list.length === 0) {
      setValidationError("Add at least one task or Skip this day.");
      return null;
    }
    return list;
  };

  const finalize = (finalEntries: Record<number, WeekTaskDraft[]>) => {
    const entries = Object.entries(finalEntries)
      .flatMap(([dayIdx, drafts]) => drafts.map((draft) => ({ dayIdx: Number(dayIdx), draft })))
      .sort((a, b) => a.dayIdx - b.dayIdx);
    onConfirm({ entries });
  };

  const moveOrFinalize = (nextDayIdx: number, updated: Record<number, WeekTaskDraft[]>) => {
    if (nextDayIdx > 6) {
      finalize(updated);
      return;
    }
    setEntriesByDay(updated);
    setCurrentDayIdx(nextDayIdx);
    setCurrentDayDrafts([]);
    setValidationError(null);
    resetForm();
  };

  const handleAddAnotherTask = () => {
    const draft = buildDraft(true);
    if (!draft) return;
    setCurrentDayDrafts((prev) => [...prev, draft]);
    setValidationError(null);
    resetForm();
  };

  const removeDraft = (idx: number) => {
    setCurrentDayDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNextDay = () => {
    const drafts = collectDayDrafts();
    if (!drafts) return;
    const updated = { ...entriesByDay, [currentDayIdx]: drafts };
    moveOrFinalize(currentDayIdx + 1, updated);
  };

  const handleRepeatNextDay = () => {
    const drafts = collectDayDrafts();
    if (!drafts) return;
    const nextDayIdx = currentDayIdx + 1;
    if (nextDayIdx > 6) {
      const updated = { ...entriesByDay, [currentDayIdx]: drafts };
      finalize(updated);
      return;
    }
    const updated = {
      ...entriesByDay,
      [currentDayIdx]: drafts,
      [nextDayIdx]: drafts,
    };
    moveOrFinalize(nextDayIdx + 1, updated);
  };

  const handleSkip = () => {
    const updated = { ...entriesByDay };
    delete updated[currentDayIdx];
    setCurrentDayDrafts([]);
    moveOrFinalize(currentDayIdx + 1, updated);
  };

  // ------------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      {/* Backdrop */}
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
        {/* Progress bar */}
        <div className="h-0.5 w-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <motion.div
            className="h-full"
            style={{ background: "rgba(96,165,250,0.7)", width: "100%" }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-white/35 uppercase tracking-widest mb-0.5">
                Weekly task setup
              </p>
              <h2 className="text-lg font-bold text-white">
                {DAY_FULL[currentDayIdx]}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <X size={16} />
            </button>
          </div>

          <motion.div
            key="define"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
                {/* Task name */}
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNextDay()}
                  placeholder="Task name…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-400/40 transition-colors"
                />

                {/* Type toggle */}
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

                {/* Value */}
                {type === "timed" ? (
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <Clock size={14} className="text-blue-400/60" />
                    <span className="text-xs text-white/40 flex-1">Duration</span>
                    <input
                      type="number"
                      value={minutes}
                      min={5} max={480}
                      onChange={(e) => setMinutes(Number(e.target.value))}
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
                      value={target}
                      min={1}
                      onChange={(e) => setTarget(Number(e.target.value))}
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

                {/* Scheduled time */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <Clock size={14} className="text-white/30" />
                  <span className="text-xs text-white/40 flex-1">Scheduled time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-transparent text-sm text-white outline-none"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                {/* End time */}
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

                {!hasValidRange && (
                  <p className="text-xs text-amber-300/80 -mt-2">
                    End time should be after scheduled time.
                  </p>
                )}

                {validationError && (
                  <p className="text-xs text-rose-300/80 -mt-2">{validationError}</p>
                )}

                {/* Tags */}
                <TagInput tags={tags} onChange={setTags} />

                {/* Day progress */}
                <div>
                  <p className="text-xs text-white/35 mb-2">Schedule progress</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_LABELS.map((_, i) => (
                      <DayBadge key={i} idx={i} active={i === currentDayIdx || (entriesByDay[i]?.length ?? 0) > 0} />
                    ))}
                  </div>
                </div>

                {currentDayDrafts.length > 0 && (
                  <div>
                    <p className="text-xs text-white/35 mb-2">Added for {DAY_FULL[currentDayIdx]}</p>
                    <div className="flex flex-col gap-1.5 max-h-28 overflow-auto pr-1">
                      {currentDayDrafts.map((d, idx) => (
                        <div
                          key={`${d.title}-${idx}`}
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <p className="text-xs text-white/75 truncate">{d.title}</p>
                          <button
                            onClick={() => removeDraft(idx)}
                            className="text-[10px] px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(239,68,68,0.18)", color: "rgba(252,165,165,1)" }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleAddAnotherTask}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: "rgba(167,139,250,0.16)",
                      border: "1px solid rgba(167,139,250,0.35)",
                      color: "rgba(196,181,253,1)",
                    }}
                  >
                    Add Another Task
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: "rgba(96,165,250,0.18)",
                      border: "1px solid rgba(96,165,250,0.38)",
                      color: "rgba(147,197,253,1)",
                    }}
                  >
                    Next Day
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleRepeatNextDay}
                    disabled={currentDayIdx >= 6}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{
                      background: "rgba(52,211,153,0.14)",
                      border: "1px solid rgba(52,211,153,0.35)",
                      color: "rgba(110,231,183,1)",
                    }}
                  >
                    {currentDayIdx < 6 ? `Repeat for ${DAY_FULL[currentDayIdx + 1]}` : "Repeat"}
                  </button>
                  <button
                    onClick={handleSkip}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    Skip
                  </button>
                </div>
              </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
