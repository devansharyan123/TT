"use client";

import { motion } from "framer-motion";
import { Timer, Hash, Check, Trash2 } from "lucide-react";
import { Task } from "@/lib/types";
import TimerTask from "./TimerTask";
import QuantityTask from "./QuantityTask";

interface TaskCardProps {
  task: Task;
  index: number;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, index, onUpdate, onDelete }: TaskCardProps) {
  const isTimed = task.type === "timed";
  const isCompleted = task.completed;

  const accentColor = isTimed
    ? "rgba(96,165,250,0.9)"
    : "rgba(167,139,250,0.9)";

  const accentBg = isTimed
    ? "rgba(96,165,250,0.08)"
    : "rgba(167,139,250,0.08)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl p-5 transition-all duration-300 ${isCompleted ? "task-completed" : ""}`}
      style={{
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: isCompleted
          ? "0 4px 20px rgba(0,0,0,0.3)"
          : `0 4px 24px rgba(0,0,0,0.35), 0 0 0 0 ${accentColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: accentBg, border: `1px solid ${accentColor}30` }}
          >
            {isTimed ? (
              <Timer size={15} style={{ color: accentColor }} />
            ) : (
              <Hash size={15} style={{ color: accentColor }} />
            )}
          </div>
          <h3
            className={`task-title font-semibold text-base leading-snug ${
              isCompleted ? "text-white/40" : "text-white"
            }`}
          >
            {task.title}
          </h3>
          {isCompleted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.4)" }}
            >
              <Check size={11} className="text-emerald-400" />
            </motion.div>
          )}
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 active:scale-90"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Task body */}
      {!isCompleted || isTimed ? (
        <div className={isCompleted ? "pointer-events-none" : ""}>
          {isTimed ? (
            <TimerTask
              task={task}
              onUpdate={(updates) => onUpdate(task.id, updates)}
            />
          ) : (
            <QuantityTask
              task={task}
              onUpdate={(updates) => onUpdate(task.id, updates)}
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-white/30">
          {!isTimed &&
            `${task.currentQuantity} / ${task.targetQuantity} ${task.unit} completed`}
        </p>
      )}
    </motion.div>
  );
}
