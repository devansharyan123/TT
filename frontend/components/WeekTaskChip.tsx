"use client";

import { motion } from "framer-motion";
import { Clock, Hash, CheckCircle2 } from "lucide-react";
import { Task } from "@/lib/types";

interface WeekTaskChipProps {
  task: Task;
  onClick?: () => void;
}

export default function WeekTaskChip({ task, onClick }: WeekTaskChipProps) {
  const isTimed = task.type === "timed";
  const accent = isTimed ? "rgba(96,165,250,0.9)" : "rgba(167,139,250,0.9)";
  const accentBg = isTimed ? "rgba(96,165,250,0.08)" : "rgba(167,139,250,0.08)";
  const accentBorder = isTimed ? "rgba(96,165,250,0.2)" : "rgba(167,139,250,0.2)";

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      className="w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 group"
      style={{
        background: task.completed ? "rgba(255,255,255,0.02)" : accentBg,
        border: `1px solid ${task.completed ? "rgba(255,255,255,0.06)" : accentBorder}`,
        opacity: task.completed ? 0.55 : 1,
      }}
    >
      {/* Title row */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <div className="mt-0.5 flex-shrink-0">
          {task.completed ? (
            <CheckCircle2 size={11} className="text-emerald-400/70" />
          ) : isTimed ? (
            <Clock size={11} style={{ color: accent }} />
          ) : (
            <Hash size={11} style={{ color: accent }} />
          )}
        </div>
        <span
          className="text-[11px] sm:text-xs font-semibold leading-tight break-words"
          style={{
            color: task.completed ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)",
            textDecoration: task.completed ? "line-through" : "none",
            textDecorationStyle: "dashed",
          }}
        >
          {task.title}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        {task.scheduledTime && (
          <span className="text-[9px] sm:text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
            {task.endTime ? `${task.scheduledTime} - ${task.endTime}` : task.scheduledTime}
          </span>
        )}
        <span
          className="text-[10px] font-medium ml-auto"
          style={{ color: task.completed ? "rgba(255,255,255,0.2)" : accent }}
        >
          {isTimed ? `${task.allocatedMinutes}m` : `${task.currentQuantity ?? 0}/${task.targetQuantity} ${task.unit}`}
        </span>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-[9px] text-white/20">+{task.tags.length - 2}</span>
          )}
        </div>
      )}
    </motion.button>
  );
}
