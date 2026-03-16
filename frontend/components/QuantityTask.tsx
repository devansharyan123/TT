"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import NumberPicker from "./NumberPicker";
import { Task } from "@/lib/types";

interface QuantityTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function QuantityTask({ task, onUpdate }: QuantityTaskProps) {
  const [showPicker, setShowPicker] = useState(false);
  const current = task.currentQuantity ?? 0;
  const target = task.targetQuantity ?? 1;
  const progress = Math.min(1, current / target);
  const percent = Math.round(progress * 100);

  const handleChange = (val: number) => {
    const completed = val >= target;
    onUpdate({ currentQuantity: val, completed });
  };

  const barColor =
    percent >= 100
      ? "rgba(52,211,153,0.9)"
      : percent >= 60
      ? "rgba(96,165,250,0.9)"
      : "rgba(251,191,36,0.8)";

  return (
    <div className="flex items-center gap-4">
      {/* Progress bar section */}
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">
            <span className="text-white font-semibold text-lg">{current}</span>
            <span className="text-white/40 mx-1">/</span>
            <span className="text-white/50">{target} {task.unit}</span>
          </span>
          <span
            className="font-semibold text-xs px-2 py-0.5 rounded-full"
            style={{
              color: barColor,
              background: `${barColor}18`,
              border: `1px solid ${barColor}40`,
            }}
          >
            {percent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ background: barColor, boxShadow: `0 0 8px ${barColor}` }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Quick +/- buttons */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => handleChange(Math.max(0, current - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            disabled={current <= 0}
          >
            <ChevronDown size={14} className="text-white/60" />
          </button>
          <button
            onClick={() => handleChange(Math.min(target * 2, current + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90"
            style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", color: "rgba(96,165,250,0.9)" }}
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="px-3 h-8 text-xs rounded-lg transition-all"
            style={{
              background: showPicker ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${showPicker ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: showPicker ? "rgba(96,165,250,0.9)" : "rgba(255,255,255,0.4)",
            }}
          >
            Set exact
          </button>
        </div>
      </div>

      {/* Scrollable picker panel */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, scale: 0.9, x: 12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-xs text-white/40 mb-1">{task.unit}</span>
            <NumberPicker
              value={current}
              min={0}
              max={Math.max(target * 3, 50)}
              onChange={(val) => handleChange(val)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
