"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasks = void 0;
const uuid_1 = require("uuid");
const today = new Date().toISOString().split("T")[0];
exports.tasks = [
    {
        id: (0, uuid_1.v4)(),
        title: "Deep Work Session",
        type: "timed",
        allocatedMinutes: 90,
        elapsedSeconds: 0,
        timerState: "idle",
        completed: false,
        date: today,
    },
    {
        id: (0, uuid_1.v4)(),
        title: "Morning Run",
        type: "quantity",
        targetQuantity: 5,
        currentQuantity: 0,
        unit: "km",
        completed: false,
        date: today,
    },
    {
        id: (0, uuid_1.v4)(),
        title: "Read & Research",
        type: "timed",
        allocatedMinutes: 45,
        elapsedSeconds: 0,
        timerState: "idle",
        completed: false,
        date: today,
    },
    {
        id: (0, uuid_1.v4)(),
        title: "Water Intake",
        type: "quantity",
        targetQuantity: 8,
        currentQuantity: 0,
        unit: "glasses",
        completed: false,
        date: today,
    },
    {
        id: (0, uuid_1.v4)(),
        title: "Coding Practice",
        type: "timed",
        allocatedMinutes: 60,
        elapsedSeconds: 0,
        timerState: "idle",
        completed: false,
        date: today,
    },
];
