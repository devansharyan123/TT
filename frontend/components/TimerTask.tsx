"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { Task, TimerState } from "@/lib/types";

const WORK_SECONDS = 45 * 60;
const BREAK_SECONDS = 5 * 60;

/** Plays a short beep using Web Audio API */
function playBeep(frequency = 880, duration = 0.4, repeats = 3) {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < repeats; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.5 + duration);
      osc.start(ctx.currentTime + i * 0.5);
      osc.stop(ctx.currentTime + i * 0.5 + duration);
    }
  } catch {
    // Audio not available
  }
}

interface TimerTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function TimerTask({ task, onUpdate }: TimerTaskProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef(task.elapsedSeconds ?? 0);
  const stateRef = useRef<TimerState>(task.timerState ?? "idle");

  const allocatedSeconds = (task.allocatedMinutes ?? 45) * 60;

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const saveProgress = useCallback(
    (elapsed: number, state: TimerState, completed = false) => {
      onUpdate({ elapsedSeconds: elapsed, timerState: state, completed });
    },
    [onUpdate]
  );

  const startTicking = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const elapsed = elapsedRef.current;

      // Check if allocated time reached
      if (elapsed >= allocatedSeconds) {
        stopInterval();
        playBeep(440, 0.5, 4);
        stateRef.current = "done";
        saveProgress(elapsed, "done", true);
        return;
      }

      // 45m work / 5m break cycle logic
      const cycleLength = WORK_SECONDS + BREAK_SECONDS;
      const posInCycle = elapsed % cycleLength;

      if (posInCycle === WORK_SECONDS && stateRef.current === "running") {
        // Work period ended → start break
        playBeep(660, 0.4, 3);
        stateRef.current = "break";
        saveProgress(elapsed, "break");
      } else if (posInCycle === 0 && stateRef.current === "break") {
        // Break ended → resume work
        playBeep(880, 0.3, 2);
        stateRef.current = "running";
        saveProgress(elapsed, "running");
      } else {
        saveProgress(elapsed, stateRef.current);
      }
    }, 1000);
  }, [stopInterval, saveProgress, allocatedSeconds]);

  useEffect(() => {
    elapsedRef.current = task.elapsedSeconds ?? 0;
    stateRef.current = task.timerState ?? "idle";
    if (task.timerState === "running" || task.timerState === "break") {
      startTicking();
    }
    return stopInterval;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    const state = stateRef.current;
    if (state === "running" || state === "break") {
      stopInterval();
      stateRef.current = "paused";
      saveProgress(elapsedRef.current, "paused");
    } else if (state === "idle" || state === "paused") {
      stateRef.current = "running";
      saveProgress(elapsedRef.current, "running");
      startTicking();
    }
  };

  const handleReset = () => {
    stopInterval();
    elapsedRef.current = 0;
    stateRef.current = "idle";
    saveProgress(0, "idle", false);
  };

  const elapsed = task.elapsedSeconds ?? 0;
  const timerState = task.timerState ?? "idle";
  const cycleLength = WORK_SECONDS + BREAK_SECONDS;
  const posInCycle = elapsed % cycleLength;
  const isBreak = timerState === "break";

  // Arc ring calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const segmentDuration = isBreak ? BREAK_SECONDS : WORK_SECONDS;
  const segmentPos = isBreak ? posInCycle - WORK_SECONDS : posInCycle;
  const segmentProgress = Math.min(1, segmentPos / segmentDuration);
  const totalProgress = Math.min(1, elapsed / allocatedSeconds);
  const strokeOffset = circumference * (1 - segmentProgress);

  const stateColors: Record<TimerState, string> = {
    idle: "rgba(148,163,184,0.6)",
    running: "rgba(96,165,250,0.9)",
    paused: "rgba(251,191,36,0.9)",
    break: "rgba(52,211,153,0.9)",
    done: "rgba(167,139,250,0.9)",
  };

  const ringColor = stateColors[timerState];
  const isActive = timerState === "running" || timerState === "break";
  const isDone = timerState === "done";

  // Time to show: remaining in current segment
  let displaySeconds: number;
  if (isBreak) {
    displaySeconds = BREAK_SECONDS - (posInCycle - WORK_SECONDS);
  } else {
    const remainingAllocated = allocatedSeconds - elapsed;
    const remainingInWork = WORK_SECONDS - posInCycle;
    displaySeconds = Math.min(remainingAllocated, remainingInWork);
  }

  return (
    <div className="flex items-center gap-5">
      {/* SVG Arc Ring */}
      <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Background track */}
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          {/* Total progress ring (dim) */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - totalProgress)}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
          />
          {/* Segment progress ring */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
            className="timer-ring"
            style={{ filter: `drop-shadow(0 0 6px ${ringColor})` }}
          />
        </svg>
        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={timerState}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: ringColor }}
            >
              {isDone ? "Done" : isBreak ? "Break" : timerState === "paused" ? "Paused" : timerState === "idle" ? "Ready" : "Focus"}
            </motion.span>
          </AnimatePresence>
          <span className="text-2xl font-mono font-bold text-white mt-0.5">
            {formatTime(Math.max(0, displaySeconds))}
          </span>
        </div>
      </div>

      {/* Controls & info */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">
            {Math.floor(elapsed / 60)}m / {task.allocatedMinutes}m used
          </span>
          {isBreak && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.15)", color: "rgba(52,211,153,0.9)" }}>
              Break time
            </span>
          )}
        </div>

        {/* Session dots: each dot = 1 cycle */}
        <div className="flex gap-1.5">
          {Array.from({ length: Math.ceil(allocatedSeconds / cycleLength) }).map((_, i) => {
            const cycleStart = i * cycleLength;
            const filled = elapsed >= cycleStart + cycleLength;
            const active = elapsed >= cycleStart && elapsed < cycleStart + cycleLength;
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: 8, height: 8,
                  background: filled
                    ? "rgba(96,165,250,0.9)"
                    : active
                    ? "rgba(96,165,250,0.4)"
                    : "rgba(255,255,255,0.1)",
                  boxShadow: active ? "0 0 6px rgba(96,165,250,0.5)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {!isDone && (
            <button
              onClick={handleToggle}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: isActive ? "rgba(251,191,36,0.15)" : "rgba(96,165,250,0.15)",
                border: `1px solid ${isActive ? "rgba(251,191,36,0.3)" : "rgba(96,165,250,0.3)"}`,
                color: isActive ? "rgba(251,191,36,0.9)" : "rgba(96,165,250,0.9)",
              }}
            >
              {isActive ? <Pause size={14} /> : <Play size={14} />}
              {isActive ? "Pause" : "Start"}
            </button>
          )}
          {elapsed > 0 && !isActive && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
