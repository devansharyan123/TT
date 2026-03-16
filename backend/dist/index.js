"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const envCandidates = [
    node_path_1.default.resolve(process.cwd(), "backend/.env"),
    node_path_1.default.resolve(process.cwd(), ".env"),
    node_path_1.default.resolve(__dirname, "../.env"),
];
const envPath = envCandidates.find((candidate) => node_fs_1.default.existsSync(candidate));
dotenv_1.default.config(envPath ? { path: envPath } : undefined);
const taskRoutes = require("./routes/tasks").default;
const authRoutes = require("./routes/auth").default;
const { optionalAuth } = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const configuredOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (localhostOriginPattern.test(origin) || configuredOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Not allowed by CORS"));
    },
}));
app.use(express_1.default.json());
app.use(optionalAuth);
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
});
