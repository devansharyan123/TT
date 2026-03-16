"use client";

import { useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Hash, Plus, Repeat2, FastForward, SkipForward, Check, ChevronRight } from "lucide-react";
import { WeekTaskDraft, TaskType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type DayAction = { type: "repeat" } | { type: "shift"; minutesDelta: number } | { type: "skip" };

export interface WeekCreationResult {
  draft: WeekTaskDraft;
  startDayIdx: number;             // 0 = Mon
  actions: Record<number, DayAction>; // keyed by dayIdx
}

interface Props {
  /** 0-based day index that was clicked (0=Mon…6=Sun) */
  startDayIdx?: number;
  weekDates: string[];             // [Mon ISO, …, Sun ISO]
  onConfirm: (result: WeekCreationResult) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function addMinutesToTime(time: string, delta: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + delta) % (24 * 60) + 24 * 60) % (24 * 60);
  const nh = Math.floor(total / 60).toString().padStart(2, "0");
  const nm = (total % 60).toString().padStart(2, "0");
  return `${nh}:${nm}`;
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
/*  Main modal                                                          */
/* ------------------------------------------------------------------ */

export default function CreateWeekTaskModal({ startDayIdx = 0, weekDates, onConfirm, onClose }: Props) {
  // ---- Step 1 state ------------------------------------------------
  const [step, setStep] = useState<"define" | "propagate" | "summary">("define");
  const [title, setTitle]     = useState("");
  const [type, setType]       = useState<TaskType>("timed");
  const [minutes, setMinutes] = useState(45);
  const [target, setTarget]   = useState(10);
  const [unit, setUnit]       = useState("reps");
  const [tags, setTags]       = useState<string[]>([]);
  const [time, setTime]       = useState("09:00");
  const [dayIdx, setDayIdx]   = useState(startDayIdx);

  // ---- Step 2 state ------------------------------------------------
  // Which days (after startDay) are we iterating over?
  const remainingDays = Array.from(
    { length: 7 - dayIdx - 1 },
    (_, i) => dayIdx + 1 + i
  );
  const [propagateStep, setPropagateStep] = useState(0); // index into remainingDays
  const [actions, setActions] = useState<Record<number, DayAction>>({});
  const [shiftDelta, setShiftDelta] = useState(0); // minutes delta for "shift"
  const [showShiftInput, setShowShiftInput] = useState(false);

  // ---- derived draft -----------------------------------------------
  const draft: WeekTaskDraft = {
    title: title.trim() || "Untitled Task",
    type,
    allocatedMinutes: minutes,
    targetQuantity: target,
    unit,
    scheduledTime: time,
    tags,
  };

  const currentPropagateDay = remainingDays[propagateStep];

  // ------------------------------------------------------------------
  //  Handlers
  // ------------------------------------------------------------------

  const goToPropagate = () => {
    if (!title.trim()) return;
    if (remainingDays.length === 0) {
      // Only one day selected — done immediately
      onConfirm({ draft, startDayIdx: dayIdx, actions });
    } else {
      setStep("propagate");
    }
  };

  const applyAction = (action: DayAction) => {
    const updated = { ...actions, [currentPropagateDay]: action };
    setActions(updated);
    setShowShiftInput(false);
    setShiftDelta(0);

    if (propagateStep + 1 >= remainingDays.length) {
      // Done iterating
      setActions(updated);
      setStep("summary");
    } else {
      setPropagateStep((p) => p + 1);
    }
  };

  const applyRepeatAll = () => {
    const updated = { ...actions };
    for (let i = propagateStep; i < remainingDays.length; i++) {
      updated[remainingDays[i]] = { type: "repeat" };
    }
    setActions(updated);
    setStep("summary");
  };

  const applySkipAll = () => {
    const updated = { ...actions };
    for (let i = propagateStep; i < remainingDays.length; i++) {
      updated[remainingDays[i]] = { type: "skip" };
    }
    setActions(updated);
    setStep("summary");
  };

  const handleConfirm = () => {
    onConfirm({ draft, startDayIdx: dayIdx, actions });
  };

  // ------------------------------------------------------------------
  //  Summary stats
  // ------------------------------------------------------------------

  const createdDays = [dayIdx, ...remainingDays.filter((d) => {
    const a = actions[d];
    return a && a.type !== "skip";
  })];

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
            style={{ background: "rgba(96,165,250,0.7)" }}
            animate={{
              width: step === "define" ? "33%" : step === "propagate"
                ? `${33 + (propagateStep / Math.max(remainingDays.length, 1)) * 34}%`
                : "100%",
            }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-white/35 uppercase tracking-widest mb-0.5">
                {step === "define" ? "Step 1 of 3" : step === "propagate" ? `Step 2 — Day ${propagateStep + 1} of ${remainingDays.length}` : "Done"}
              </p>
              <h2 className="text-lg font-bold text-white">
                {step === "define" ? "Define Task" : step === "propagate" ? `What about ${DAY_FULL[currentPropagateDay]}?` : "All Set!"}
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

          {/* ---- STEP 1: Define ---- */}
          <AnimatePresence mode="wait">
            {step === "define" && (
              <motion.div
                key="define"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Task name */}
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goToPropagate()}
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
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-transparent text-sm text-white outline-none"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                {/* Tags */}
                <TagInput tags={tags} onChange={setTags} />

                {/* Day selector */}
                <div>
                  <p className="text-xs text-white/35 mb-2">Starting day</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_LABELS.map((_, i) => (
                      <button key={i} onClick={() => setDayIdx(i)}>
                        <DayBadge idx={i} active={dayIdx === i} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={goToPropagate}
                  disabled={!title.trim()}
                  className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed active:scale-98"
                  style={{
                    background: "rgba(96,165,250,0.2)",
                    border: "1px solid rgba(96,165,250,0.4)",
                    color: "rgba(96,165,250,1)",
                  }}
                >
                  {remainingDays.length === 0 ? "Create Task" : "Next — Set Other Days"}
                  <ChevronRight size={15} />
                </button>
              </motion.div>
            )}

            {/* ---- STEP 2: Propagate ---- */}
            {step === "propagate" && (
              <motion.div
                key={`propagate-${propagateStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col gap-4"
              >
                {/* Task preview */}
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.18)" }}
                >
                  <p className="text-xs text-blue-300/60 mb-1 uppercase tracking-widest">Task added for {DAY_FULL[dayIdx]}</p>
                  <p className="text-sm font-semibold text-white">{draft.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {draft.type === "timed" ? `${draft.allocatedMinutes} min` : `${draft.targetQuantity} ${draft.unit}`}
                    {draft.scheduledTime && ` · ${draft.scheduledTime}`}
                  </p>
                </div>

                {/* Day timeline */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {[dayIdx, ...remainingDays].map((d, i) => {
                    const a = i === 0 ? undefined : actions[d];
                    const isCurrent = d === currentPropagateDay;
                    return (
                      <div key={d} className="flex items-center">
                        {i > 0 && <div className="w-3 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                            style={{
                              background: i === 0
                                ? "rgba(52,211,153,0.12)" : a?.type === "repeat" || a?.type === "shift"
                                ? "rgba(96,165,250,0.12)" : a?.type === "skip"
                                ? "rgba(255,255,255,0.04)" : isCurrent
                                ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
                              color: i === 0
                                ? "rgba(52,211,153,0.9)" : a?.type === "repeat" || a?.type === "shift"
                                ? "rgba(96,165,250,0.9)" : a?.type === "skip"
                                ? "rgba(255,255,255,0.2)" : isCurrent
                                ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.2)",
                              border: `1px solid ${isCurrent && !a ? "rgba(251,191,36,0.3)" : "transparent"}`,
                            }}
                          >
                            {DAY_LABELS[d]}
                          </div>
                          <span className="text-[9px] text-white/20">
                            {i === 0 ? "✓" : a?.type === "skip" ? "—" : a ? "✓" : isCurrent ? "?" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <ActionButton
                    icon={<Repeat2 size={15} />}
                    label={`Repeat for ${DAY_FULL[currentPropagateDay]}`}
                    desc="Same task · same time"
                    color="rgba(96,165,250"
                    onClick={() => applyAction({ type: "repeat" })}
                  />

                  <ActionButton
                    icon={<FastForward size={15} />}
                    label={`Shift to ${DAY_FULL[currentPropagateDay]}`}
                    desc={`Adjust time by${showShiftInput ? "" : " viewing offset"}`}
                    color="rgba(167,139,250"
                    onClick={() => setShowShiftInput((v) => !v)}
                    active={showShiftInput}
                  />

                  <AnimatePresence>
                    {showShiftInput && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-1"
                          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}
                        >
                          <span className="text-xs text-white/40 flex-1">Time offset (min)</span>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                              onClick={() => setShiftDelta((d) => d - 30)}
                            >−</button>
                            <span className="text-sm text-white font-mono w-14 text-center">
                              {shiftDelta >= 0 ? "+" : ""}{shiftDelta}m
                            </span>
                            <button
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                              onClick={() => setShiftDelta((d) => d + 30)}
                            >+</button>
                          </div>
                          <span className="text-xs text-purple-300/50 font-mono">
                            → {addMinutesToTime(draft.scheduledTime, shiftDelta)}
                          </span>
                          <button
                            onClick={() => applyAction({ type: "shift", minutesDelta: shiftDelta })}
                            className="ml-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                            style={{ background: "rgba(167,139,250,0.2)", color: "rgba(167,139,250,1)" }}
                          >
                            Apply
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <ActionButton
                    icon={<SkipForward size={15} />}
                    label={`Skip ${DAY_FULL[currentPropagateDay]}`}
                    desc="No task for this day"
                    color="rgba(255,255,255,0.4"
                    onClick={() => applyAction({ type: "skip" })}
                  />
                </div>

                {/* Bulk actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={applyRepeatAll}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", color: "rgba(52,211,153,0.8)" }}
                  >
                    Repeat all remaining
                  </button>
                  <button
                    onClick={applySkipAll}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                  >
                    Skip all remaining
                  </button>
                </div>
              </motion.div>
            )}

            {/* ---- STEP 3: Summary ---- */}
            {step === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
              >
                {/* Success icon */}
                <div className="flex justify-center py-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}
                  >
                    <Check size={28} className="text-emerald-400" />
                  </motion.div>
                </div>

                <div className="text-center">
                  <p className="text-lg font-bold text-white mb-1">
                    {createdDays.length} task{createdDays.length !== 1 ? "s" : ""} scheduled
                  </p>
                  <p className="text-sm text-white/40">
                    &ldquo;{draft.title}&rdquo; added to{" "}
                    {createdDays.map((d) => DAY_LABELS[d]).join(", ")}
                  </p>
                </div>

                {/* Day summary chips */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {DAY_LABELS.map((label, i) => {
                    const a = actions[i];
                    const isStart = i === dayIdx;
                    const included = isStart || (a && a.type !== "skip");
                    const skipped = !isStart && (!a || a.type === "skip");
                    return (
                      <div
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{
                          background: skipped ? "rgba(255,255,255,0.03)" : "rgba(52,211,153,0.1)",
                          color: skipped ? "rgba(255,255,255,0.2)" : "rgba(52,211,153,0.9)",
                          border: `1px solid ${skipped ? "rgba(255,255,255,0.06)" : "rgba(52,211,153,0.2)"}`,
                          textDecoration: skipped ? "line-through" : "none",
                        }}
                      >
                        {label}
                        {a?.type === "shift" ? " ⤴" : ""}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-98 mt-2"
                  style={{
                    background: "rgba(52,211,153,0.15)",
                    border: "1px solid rgba(52,211,153,0.35)",
                    color: "rgba(52,211,153,1)",
                  }}
                >
                  <Check size={15} />
                  Confirm & Add to Schedule
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action button helper                                                */
/* ------------------------------------------------------------------ */

function ActionButton({
  icon, label, desc, color, onClick, active = false,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
      style={{
        background: active ? `${color},0.15)` : `${color},0.06)`,
        border: `1px solid ${active ? `${color},0.35)` : `${color},0.15)`}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color},0.12)`, color: `${color},1)` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: `${color},0.95)` }}>{label}</p>
        <p className="text-xs" style={{ color: `${color},0.4)` }}>{desc}</p>
      </div>
      <ChevronRight size={14} style={{ color: `${color},0.3)`, opacity: active ? 1 : 0.5 }} />
    </motion.button>
  );
}
