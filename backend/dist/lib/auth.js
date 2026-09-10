"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.hashToken = hashToken;
exports.refreshTokenExpiryDate = refreshTokenExpiryDate;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function accessTokenExpirySeconds() {
    const numericSeconds = Number(process.env.JWT_ACCESS_EXPIRES_IN_SECONDS || "");
    if (Number.isFinite(numericSeconds) && numericSeconds > 0) {
        return Math.floor(numericSeconds);
    }
    const shorthand = process.env.JWT_ACCESS_EXPIRES_IN?.trim();
    if (shorthand) {
        const match = shorthand.match(/^(\d+)([smhd])$/i);
        if (match) {
            const amount = Number(match[1]);
            const unit = match[2].toLowerCase();
            if (unit === "s")
                return amount;
            if (unit === "m")
                return amount * 60;
            if (unit === "h")
                return amount * 60 * 60;
            if (unit === "d")
                return amount * 24 * 60 * 60;
        }
        const asNumber = Number(shorthand);
        if (Number.isFinite(asNumber) && asNumber > 0) {
            return Math.floor(asNumber);
        }
    }
    return 900;
}
function refreshTokenExpiryDays() {
    const raw = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || "7");
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 7;
}
function accessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret)
        throw new Error("Missing JWT_ACCESS_SECRET");
    return secret;
}
function refreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret)
        throw new Error("Missing JWT_REFRESH_SECRET");
    return secret;
}
function signAccessToken(userId, email) {
    const payload = { sub: userId, email, type: "access" };
    return jsonwebtoken_1.default.sign(payload, accessSecret(), {
        expiresIn: accessTokenExpirySeconds(),
    });
}
function signRefreshToken(userId) {
    const refreshDays = refreshTokenExpiryDays();
    const payload = { sub: userId, type: "refresh" };
    return jsonwebtoken_1.default.sign(payload, refreshSecret(), {
        expiresIn: refreshDays * 24 * 60 * 60,
    });
}
function verifyAccessToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, accessSecret());
    if (decoded.type !== "access")
        throw new Error("Invalid access token type");
    return decoded;
}
function verifyRefreshToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, refreshSecret());
    if (decoded.type !== "refresh")
        throw new Error("Invalid refresh token type");
    return decoded;
}
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function refreshTokenExpiryDate() {
    const refreshDays = refreshTokenExpiryDays();
    const d = new Date();
    d.setDate(d.getDate() + refreshDays);
    return d;
}
