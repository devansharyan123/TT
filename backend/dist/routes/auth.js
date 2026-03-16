"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const argon2_1 = __importDefault(require("argon2"));
const google_auth_library_1 = require("google-auth-library");
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const auth_2 = require("../middleware/auth");
const router = (0, express_1.Router)();
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function oauthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callback = process.env.GOOGLE_CALLBACK_URL;
    if (!clientId || !clientSecret || !callback) {
        throw new Error("Google OAuth env vars missing");
    }
    return new google_auth_library_1.OAuth2Client(clientId, clientSecret, callback);
}
function parseOauthState(state) {
    if (!state)
        return {};
    try {
        const decoded = decodeURIComponent(state);
        const parsed = JSON.parse(decoded);
        return parsed;
    }
    catch {
        return {};
    }
}
function isSafeRedirectUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    catch {
        return false;
    }
}
async function issueSession(userId, email, req) {
    const accessToken = (0, auth_1.signAccessToken)(userId, email || undefined);
    const refreshToken = (0, auth_1.signRefreshToken)(userId);
    await prisma_1.prisma.refreshToken.create({
        data: {
            userId,
            tokenHash: (0, auth_1.hashToken)(refreshToken),
            expiresAt: (0, auth_1.refreshTokenExpiryDate)(),
            userAgent: req.header("user-agent") || undefined,
            ipAddress: req.ip,
        },
    });
    return { accessToken, refreshToken };
}
async function ensureDefaultSection(userId) {
    await prisma_1.prisma.taskSection.upsert({
        where: {
            userId_name: {
                userId,
                name: "Work",
            },
        },
        update: {},
        create: {
            userId,
            name: "Work",
        },
    });
}
router.post("/signup/email", async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ error: "Password must be at least 8 characters" });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const existingAccount = await prisma_1.prisma.authAccount.findUnique({
            where: {
                provider_providerUserId: {
                    provider: client_1.AuthProvider.email_password,
                    providerUserId: normalizedEmail,
                },
            },
        });
        if (existingAccount) {
            res.status(409).json({ error: "Email already registered" });
            return;
        }
        const passwordHash = await argon2_1.default.hash(password);
        const user = await prisma_1.prisma.user.upsert({
            where: { email: normalizedEmail },
            update: {
                displayName: displayName ?? undefined,
            },
            create: {
                email: normalizedEmail,
                displayName: displayName || normalizedEmail.split("@")[0],
            },
        });
        await prisma_1.prisma.authAccount.create({
            data: {
                userId: user.id,
                provider: client_1.AuthProvider.email_password,
                providerUserId: normalizedEmail,
                passwordHash,
                isVerified: true,
            },
        });
        await ensureDefaultSection(user.id);
        const session = await issueSession(user.id, user.email, req);
        res.status(201).json({
            user: { id: user.id, email: user.email, displayName: user.displayName },
            ...session,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Signup failed", detail: String(error) });
    }
});
router.post("/login/email", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const account = await prisma_1.prisma.authAccount.findUnique({
            where: {
                provider_providerUserId: {
                    provider: client_1.AuthProvider.email_password,
                    providerUserId: normalizedEmail,
                },
            },
            include: { user: true },
        });
        if (!account?.passwordHash) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const ok = await argon2_1.default.verify(account.passwordHash, password);
        if (!ok) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        await ensureDefaultSection(account.user.id);
        const session = await issueSession(account.user.id, account.user.email, req);
        res.json({
            user: {
                id: account.user.id,
                email: account.user.email,
                displayName: account.user.displayName,
            },
            ...session,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Login failed", detail: String(error) });
    }
});
router.get("/google/start", (req, res) => {
    try {
        const client = oauthClient();
        const state = req.query.state || "";
        const authUrl = client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: ["openid", "profile", "email"],
            state,
        });
        res.json({ authUrl });
    }
    catch (error) {
        res.status(500).json({ error: "Google OAuth not configured", detail: String(error) });
    }
});
router.get("/google/callback", async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            res.status(400).json({ error: "Missing code" });
            return;
        }
        const client = oauthClient();
        const { tokens } = await client.getToken(code);
        const idToken = tokens.id_token;
        if (!idToken) {
            res.status(400).json({ error: "Google did not return id_token" });
            return;
        }
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub) {
            res.status(400).json({ error: "Invalid Google token payload" });
            return;
        }
        const googleSubject = payload.sub;
        const email = payload.email ? normalizeEmail(payload.email) : null;
        const displayName = payload.name || undefined;
        const user = await prisma_1.prisma.$transaction(async (tx) => {
            const existingGoogle = await tx.authAccount.findUnique({
                where: {
                    provider_providerUserId: {
                        provider: client_1.AuthProvider.google,
                        providerUserId: googleSubject,
                    },
                },
                include: { user: true },
            });
            if (existingGoogle?.user)
                return existingGoogle.user;
            let baseUser = email
                ? await tx.user.findUnique({ where: { email } })
                : null;
            if (!baseUser) {
                baseUser = await tx.user.create({
                    data: {
                        email,
                        displayName,
                    },
                });
            }
            await tx.authAccount.create({
                data: {
                    userId: baseUser.id,
                    provider: client_1.AuthProvider.google,
                    providerUserId: googleSubject,
                    isVerified: !!payload.email_verified,
                    metadata: {
                        name: payload.name,
                        picture: payload.picture,
                        locale: payload.locale,
                    },
                },
            });
            return baseUser;
        });
        await ensureDefaultSection(user.id);
        const session = await issueSession(user.id, user.email, req);
        const stateRaw = req.query.state;
        const { redirectTo } = parseOauthState(stateRaw);
        if (redirectTo && isSafeRedirectUrl(redirectTo)) {
            const redirect = new URL(redirectTo);
            redirect.searchParams.set("accessToken", session.accessToken);
            redirect.searchParams.set("refreshToken", session.refreshToken);
            redirect.searchParams.set("uid", user.id);
            if (user.email)
                redirect.searchParams.set("email", user.email);
            if (user.displayName)
                redirect.searchParams.set("displayName", user.displayName);
            if (stateRaw)
                redirect.searchParams.set("state", stateRaw);
            res.redirect(redirect.toString());
            return;
        }
        res.json({
            user: { id: user.id, email: user.email, displayName: user.displayName },
            ...session,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Google login failed", detail: String(error) });
    }
});
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: "refreshToken is required" });
            return;
        }
        const claims = (0, auth_1.verifyRefreshToken)(refreshToken);
        const tokenHash = (0, auth_1.hashToken)(refreshToken);
        const dbToken = await prisma_1.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!dbToken || dbToken.revokedAt || dbToken.expiresAt < new Date()) {
            res.status(401).json({ error: "Invalid refresh token" });
            return;
        }
        if (dbToken.userId !== claims.sub) {
            res.status(401).json({ error: "Invalid refresh token" });
            return;
        }
        await prisma_1.prisma.refreshToken.update({
            where: { id: dbToken.id },
            data: { revokedAt: new Date() },
        });
        const session = await issueSession(dbToken.user.id, dbToken.user.email, req);
        res.json(session);
    }
    catch (error) {
        res.status(401).json({ error: "Refresh failed", detail: String(error) });
    }
});
router.post("/logout", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(204).send();
            return;
        }
        const tokenHash = (0, auth_1.hashToken)(refreshToken);
        await prisma_1.prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        res.status(204).send();
    }
    catch {
        res.status(204).send();
    }
});
router.get("/me", auth_2.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.authUser.userId } });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json({
            id: user.id,
            email: user.email,
            phone: user.phone,
            displayName: user.displayName,
            timezone: user.timezone,
            createdAt: user.createdAt,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch profile", detail: String(error) });
    }
});
exports.default = router;
