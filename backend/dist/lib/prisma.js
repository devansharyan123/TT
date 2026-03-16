"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const ws_1 = __importDefault(require("ws"));
const serverless_1 = require("@neondatabase/serverless");
const adapter_neon_1 = require("@prisma/adapter-neon");
const client_1 = require("@prisma/client");
// Required for WebSocket connections in Node.js
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
function createPrismaClient() {
    const adapter = new adapter_neon_1.PrismaNeon({ connectionString: process.env.DATABASE_URL });
    return new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
}
exports.prisma = global.__prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
    global.__prisma = exports.prisma;
}
