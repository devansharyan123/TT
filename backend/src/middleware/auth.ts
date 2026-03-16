import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/auth";

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    next();
    return;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    res.status(401).json({ error: "Invalid authorization header" });
    return;
  }

  try {
    const claims = verifyAccessToken(token);
    req.authUser = { userId: claims.sub, email: claims.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
