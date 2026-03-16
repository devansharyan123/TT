import { Task } from "./types";
import { v4 as uuidv4 } from "uuid";

const today = new Date().toISOString().split("T")[0];

export let tasks: Task[] = [
  {
    id: uuidv4(),
    title: "Deep Work Session",
    type: "timed",
    allocatedMinutes: 90,
    elapsedSeconds: 0,
    timerState: "idle",
    completed: false,
    date: today,
  },
  {
    id: uuidv4(),
    title: "Morning Run",
    type: "quantity",
    targetQuantity: 5,
    currentQuantity: 0,
    unit: "km",
    completed: false,
    date: today,
  },
  {
    id: uuidv4(),
    title: "Read & Research",
    type: "timed",
    allocatedMinutes: 45,
    elapsedSeconds: 0,
    timerState: "idle",
    completed: false,
    date: today,
  },
  {
    id: uuidv4(),
    title: "Water Intake",
    type: "quantity",
    targetQuantity: 8,
    currentQuantity: 0,
    unit: "glasses",
    completed: false,
    date: today,
  },
  {
    id: uuidv4(),
    title: "Coding Practice",
    type: "timed",
    allocatedMinutes: 60,
    elapsedSeconds: 0,
    timerState: "idle",
    completed: false,
    date: today,
  },
];
