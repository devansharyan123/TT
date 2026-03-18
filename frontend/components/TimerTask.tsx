"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, RotateCcw, Target } from "lucide-react";
import { Task } from "@/lib/types";

interface TimerTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function TimerTask({ task, onUpdate }: TimerTaskProps) {
  const [showChoices, setShowChoices] = useState(false);

  const allocatedMinutes = task.allocatedMinutes ?? 45;
  const allocatedSeconds = allocatedMinutes * 60;
  const elapsedSeconds = task.elapsedSeconds ?? 0;

  const progress = useMemo(() => {
    if (task.completed) return 1;
    return elapsedSeconds >= allocatedSeconds * 0.5 ? 0.5 : 0;
  }, [allocatedSeconds, elapsedSeconds, task.completed]);

  const statusText = progress === 1 ? "Complete" : progress === 0.5 ? "Partial" : "Not started";
  const progressPercent = progress * 100;

  const applyPartial = () => {
    onUpdate({
      elapsedSeconds: Math.round(allocatedSeconds * 0.5),
      timerState: "paused",
      completed: false,
    });
    setShowChoices(false);
  };

  const applyComplete = () => {
    onUpdate({
      elapsedSeconds: allocatedSeconds,
      timerState: "done",
      completed: true,
    });
    setShowChoices(false);
  };

  const clearStatus = () => {
    onUpdate({
      elapsedSeconds: 0,
      timerState: "idle",
      completed: false,
    });
    setShowChoices(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: progress === 1 ? "rgba(52,211,153,0.15)" : progress === 0.5 ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
              border: progress === 1 ? "1px solid rgba(52,211,153,0.4)" : progress === 0.5 ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {progress === 1 ? (
              <CheckCircle2 size={15} className="text-emerald-400" />
            ) : (
              <CircleDashed size={15} className="text-white/55" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-white/45 uppercase tracking-wider">Timed Task</span>
            <span className="text-sm font-semibold text-white">{statusText}</span>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "rgba(96,165,250,0.12)", color: "rgba(96,165,250,0.9)", border: "1px solid rgba(96,165,250,0.28)" }}>
          {progressPercent}%
        </span>
      </div>

      <div>
        <p className="text-xs text-white/45 mb-2">Target duration: {allocatedMinutes} minutes</p>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              background: progress === 1 ? "rgba(52,211,153,0.9)" : progress === 0.5 ? "rgba(251,191,36,0.9)" : "rgba(96,165,250,0.6)",
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setShowChoices((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95"
          style={{
            background: "rgba(96,165,250,0.15)",
            border: "1px solid rgba(96,165,250,0.3)",
            color: "rgba(96,165,250,0.9)",
          }}
        >
          <Target size={14} />
          Completed
        </button>
        {(progress > 0 || task.completed) && (
          <button
            onClick={clearStatus}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </div>

      {showChoices && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={applyPartial}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-left transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "rgba(251,191,36,0.14)",
              border: "1px solid rgba(251,191,36,0.35)",
              color: "rgba(251,191,36,0.95)",
            }}
          >
            Partial (50%)
          </button>
          <button
            onClick={applyComplete}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-left transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "rgba(52,211,153,0.14)",
              border: "1px solid rgba(52,211,153,0.35)",
              color: "rgba(52,211,153,0.95)",
            }}
          >
            Complete (100%)
          </button>
        </div>
      )}
    </div>
  );
}
