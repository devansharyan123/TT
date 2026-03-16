"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = optionalAuth;
exports.requireAuth = requireAuth;
const auth_1 = require("../lib/auth");
function optionalAuth(req, res, next) {
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
        const claims = (0, auth_1.verifyAccessToken)(token);
        req.authUser = { userId: claims.sub, email: claims.email };
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
function requireAuth(req, res, next) {
    if (!req.authUser?.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    next();
}
