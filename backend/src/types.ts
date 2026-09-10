export type TaskType = "timed" | "quantity";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  // For timed tasks
  allocatedMinutes?: number;
  elapsedSeconds?: number;
  timerState?: "idle" | "running" | "paused" | "break" | "done";
  // For quantity tasks
  targetQuantity?: number;
  currentQuantity?: number;
  unit?: string;
  // Schedule fields
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
