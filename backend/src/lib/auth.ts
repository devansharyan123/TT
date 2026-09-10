import crypto from "crypto";
import jwt from "jsonwebtoken";

export interface AccessClaims {
  sub: string;
  email?: string;
  type: "access";
}

export interface RefreshClaims {
  sub: string;
  type: "refresh";
}

function accessTokenExpirySeconds(): number {
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
      if (unit === "s") return amount;
      if (unit === "m") return amount * 60;
      if (unit === "h") return amount * 60 * 60;
      if (unit === "d") return amount * 24 * 60 * 60;
    }

    const asNumber = Number(shorthand);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return Math.floor(asNumber);
    }
  }

  return 900;
}

function refreshTokenExpiryDays(): number {
  const raw = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || "7");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 7;
}

function accessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("Missing JWT_ACCESS_SECRET");
  return secret;
}

function refreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("Missing JWT_REFRESH_SECRET");
  return secret;
}

export function signAccessToken(userId: string, email?: string): string {
  const payload: AccessClaims = { sub: userId, email, type: "access" };
  return jwt.sign(payload, accessSecret(), {
    expiresIn: accessTokenExpirySeconds(),
  });
}

export function signRefreshToken(userId: string): string {
  const refreshDays = refreshTokenExpiryDays();
  const payload: RefreshClaims = { sub: userId, type: "refresh" };
  return jwt.sign(payload, refreshSecret(), {
    expiresIn: refreshDays * 24 * 60 * 60,
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  const decoded = jwt.verify(token, accessSecret()) as AccessClaims;
  if (decoded.type !== "access") throw new Error("Invalid access token type");
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  const decoded = jwt.verify(token, refreshSecret()) as RefreshClaims;
  if (decoded.type !== "refresh") throw new Error("Invalid refresh token type");
  return decoded;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiryDate(): Date {
  const refreshDays = refreshTokenExpiryDays();
  const d = new Date();
  d.setDate(d.getDate() + refreshDays);
  return d;
}
