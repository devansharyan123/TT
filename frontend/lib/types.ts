export type TaskType = "timed" | "quantity";
export type TimerState = "idle" | "running" | "paused" | "break" | "done";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  // Timed
  allocatedMinutes?: number;
  elapsedSeconds?: number;
  timerState?: TimerState;
  // Quantity
  targetQuantity?: number;
  currentQuantity?: number;
  unit?: string;
  // Schedule
  scheduledTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  tags?: string[];
  // Shared
  completed: boolean;
  date: string; // YYYY-MM-DD
  isRecurring?: boolean;
  weekday?: number;
  section?: string;
}

export interface DailySummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionPercent: number; // capped at 100
}

/** Result of the multi-step weekly creation flow */
export interface WeekTaskDraft {
  title: string;
  type: TaskType;
  allocatedMinutes: number;
  targetQuantity: number;
  unit: string;
  scheduledTime: string;
  endTime: string;
  tags: string[];
}
