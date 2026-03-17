"use client";

import { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { X, Clock, Hash } from "lucide-react";
import { WeekTaskDraft, TaskType } from "@/lib/types";

export interface WeekCreationResult {
  draft: WeekTaskDraft;
  selectedDayIdxs: number[];
}

interface Props {
  startDayIdx?: number;
  weekDates: string[];
  onConfirm: (result: WeekCreationResult) => void;
  onClose: () => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState("");
  const commit = () => {
    const trimmed = val.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setVal("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    }
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
          style={{
            background: "rgba(96,165,250,0.12)",
            color: "rgba(96,165,250,0.9)",
            border: "1px solid rgba(96,165,250,0.2)",
          }}
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

function DayBadge({ idx, active }: { idx: number; active: boolean }) {
  return (
    <div
      className="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: active ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? "rgba(96,165,250,0.35)" : "rgba(255,255,255,0.06)"}`,
        color: active ? "rgba(96,165,250,1)" : "rgba(255,255,255,0.25)",
      }}
    >
      {DAY_LABELS[idx]}
    </div>
  );
}

export default function CreateWeekTaskModal({ startDayIdx = 0, weekDates: _weekDates, onConfirm, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("timed");
  const [target, setTarget] = useState(10);
  const [unit, setUnit] = useState("reps");
  const [tags, setTags] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [selectedDayIdxs, setSelectedDayIdxs] = useState<number[]>([startDayIdx]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasValidRange = timeToMinutes(endTime) > timeToMinutes(startTime);
  const computedDuration = Math.max(1, timeToMinutes(endTime) - timeToMinutes(startTime));

  const toggleDay = (idx: number) => {
    setSelectedDayIdxs((prev) => {
      if (prev.includes(idx)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== idx);
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const handleConfirm = () => {
    if (!title.trim()) {
      setValidationError("Task name is required.");
      return;
    }
    if (!hasValidRange) {
      setValidationError("End time should be after scheduled time.");
      return;
    }
    if (selectedDayIdxs.length === 0) {
      setValidationError("Select at least one day.");
      return;
    }

    const draft: WeekTaskDraft = {
      title: title.trim(),
      type,
      allocatedMinutes: computedDuration,
      targetQuantity: target,
      unit,
      scheduledTime: startTime,
      endTime,
      tags,
    };

    setValidationError(null);
    onConfirm({ draft, selectedDayIdxs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 modal-backdrop"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md modal-surface rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/35 uppercase tracking-widest mb-0.5">Weekly task setup</p>
              <h2 className="text-lg font-bold text-white">Add Task</h2>
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
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            placeholder="Task name…"
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

          {type === "quantity" && (
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
            <p className="text-xs text-amber-300/80 -mt-2">End time should be after scheduled time.</p>
          )}

          {validationError && <p className="text-xs text-rose-300/80 -mt-2">{validationError}</p>}

          <TagInput tags={tags} onChange={setTags} />

          <div>
            <p className="text-xs text-white/35 mb-2">Repeat on days</p>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((_, i) => (
                <button key={i} onClick={() => toggleDay(i)}>
                  <DayBadge idx={i} active={selectedDayIdxs.includes(i)} />
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-98"
            style={{
              background: "rgba(96,165,250,0.2)",
              border: "1px solid rgba(96,165,250,0.4)",
              color: "rgba(96,165,250,1)",
            }}
          >
            Add Task
          </button>
        </div>
      </motion.div>
    </div>
  );
}
