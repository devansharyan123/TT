import { Router, Request, Response } from "express";
import argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";
import { AuthProvider } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  hashToken,
  refreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function oauthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callback = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !clientSecret || !callback) {
    throw new Error("Google OAuth env vars missing");
  }
  return new OAuth2Client(clientId, clientSecret, callback);
}

function parseOauthState(state?: string): { redirectTo?: string } {
  if (!state) return {};
  try {
    const decoded = decodeURIComponent(state);
    const parsed = JSON.parse(decoded) as { redirectTo?: string };
    return parsed;
  } catch {
    return {};
  }
}

function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function issueSession(userId: string, email: string | null | undefined, req: Request) {
  const accessToken = signAccessToken(userId, email || undefined);
  const refreshToken = signRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiryDate(),
      userAgent: req.header("user-agent") || undefined,
      ipAddress: req.ip,
    },
  });

  return { accessToken, refreshToken };
}

async function ensureDefaultSection(userId: string) {
  await prisma.taskSection.upsert({
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

router.post("/signup/email", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const existingAccount = await prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.email_password,
          providerUserId: normalizedEmail,
        },
      },
    });

    if (existingAccount) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        displayName: displayName ?? undefined,
      },
      create: {
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split("@")[0],
      },
    });

    await prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: AuthProvider.email_password,
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
  } catch (error) {
    res.status(500).json({ error: "Signup failed", detail: String(error) });
  }
});

router.post("/login/email", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const account = await prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.email_password,
          providerUserId: normalizedEmail,
        },
      },
      include: { user: true },
    });

    if (!account?.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await argon2.verify(account.passwordHash, password);
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
  } catch (error) {
    res.status(500).json({ error: "Login failed", detail: String(error) });
  }
});

router.get("/google/start", (req: Request, res: Response) => {
  try {
    const client = oauthClient();
    const state = (req.query.state as string | undefined) || "";
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "profile", "email"],
      state,
    });

    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: "Google OAuth not configured", detail: String(error) });
  }
});

router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
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

    const user = await prisma.$transaction(async (tx) => {
      const existingGoogle = await tx.authAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: AuthProvider.google,
            providerUserId: googleSubject,
          },
        },
        include: { user: true },
      });

      if (existingGoogle?.user) return existingGoogle.user;

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
          provider: AuthProvider.google,
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

    const stateRaw = req.query.state as string | undefined;
    const { redirectTo } = parseOauthState(stateRaw);

    if (redirectTo && isSafeRedirectUrl(redirectTo)) {
      const redirect = new URL(redirectTo);
      redirect.searchParams.set("accessToken", session.accessToken);
      redirect.searchParams.set("refreshToken", session.refreshToken);
      redirect.searchParams.set("uid", user.id);
      if (user.email) redirect.searchParams.set("email", user.email);
      if (user.displayName) redirect.searchParams.set("displayName", user.displayName);
      if (stateRaw) redirect.searchParams.set("state", stateRaw);
      res.redirect(redirect.toString());
      return;
    }

    res.json({
      user: { id: user.id, email: user.email, displayName: user.displayName },
      ...session,
    });
  } catch (error) {
    res.status(500).json({ error: "Google login failed", detail: String(error) });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ error: "refreshToken is required" });
      return;
    }

    const claims = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const dbToken = await prisma.refreshToken.findUnique({
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

    await prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revokedAt: new Date() },
    });

    const session = await issueSession(dbToken.user.id, dbToken.user.email, req);
    res.json(session);
  } catch (error) {
    res.status(401).json({ error: "Refresh failed", detail: String(error) });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(204).send();
      return;
    }

    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.status(204).send();
  } catch {
    res.status(204).send();
  }
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.userId } });
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile", detail: String(error) });
  }
});

export default router;
