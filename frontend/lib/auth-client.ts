function normalizeApiBase(raw: string | undefined): string {
  const fallback = "http://localhost:4000/api";
  const value = (raw || fallback).trim().replace(/\/+$/, "");
  if (/\/api$/i.test(value)) return value;
  return `${value}/api`;
}

const BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

export const AUTH_EVENT = "tt:auth-changed";

const SESSION_KEY = "tt.auth.session.v1";

export interface AuthUser {
  id: string;
  email?: string | null;
  displayName?: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

function parseStoredSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  return parseStoredSession(window.localStorage.getItem(SESSION_KEY));
}

export function getStoredUser(): AuthUser | null {
  return getStoredSession()?.user ?? null;
}

export function getAccessToken(): string | null {
  return getStoredSession()?.accessToken ?? null;
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { user: session.user } }));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { user: null } }));
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; detail?: string };
    return body.error || body.detail || "Request failed";
  } catch {
    return `Request failed (${res.status})`;
  }
}

function asNetworkError(err: unknown): Error {
  if (err instanceof TypeError) {
    return new Error(`Cannot reach API at ${BASE}. Check backend server and CORS settings.`);
  }
  return err instanceof Error ? err : new Error("Network request failed");
}

async function refreshAccessToken(): Promise<string | null> {
  const existing = getStoredSession();
  if (!existing?.refreshToken) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: existing.refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    return null;
  }

  const refreshed = (await res.json()) as { accessToken: string; refreshToken: string };
  const merged: AuthSession = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    user: existing.user,
  };
  saveSession(merged);
  return merged.accessToken;
}

export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const initialHeaders = new Headers(init?.headers || {});
  const token = getAccessToken();
  if (token) {
    initialHeaders.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(input, { ...init, headers: initialHeaders });
  if (res.status !== 401) return res;

  const nextToken = await refreshAccessToken();
  if (!nextToken) return res;

  const retryHeaders = new Headers(init?.headers || {});
  retryHeaders.set("Authorization", `Bearer ${nextToken}`);
  res = await fetch(input, { ...init, headers: retryHeaders });
  return res;
}

async function postAuth(path: string, body: Record<string, unknown>): Promise<AuthSession> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw asNetworkError(err);
  }

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as AuthResult;
  const session: AuthSession = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
  saveSession(session);
  return session;
}

export function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  return postAuth("/auth/login/email", { email, password });
}

export function signupWithEmail(email: string, password: string, displayName?: string): Promise<AuthSession> {
  return postAuth("/auth/signup/email", { email, password, displayName });
}

export async function getGoogleAuthUrl(redirectTo: string): Promise<string> {
  const state = encodeURIComponent(JSON.stringify({ redirectTo }));
  let res: Response;
  try {
    res = await fetch(`${BASE}/auth/google/start?state=${state}`);
  } catch (err) {
    throw asNetworkError(err);
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { authUrl: string };
  return data.authUrl;
}

export async function exchangeGoogleCallback(code: string, state?: string): Promise<AuthSession> {
  const query = new URLSearchParams();
  query.set("code", code);
  if (state) query.set("state", state);
  let res: Response;
  try {
    res = await fetch(`${BASE}/auth/google/callback?${query.toString()}`);
  } catch (err) {
    throw asNetworkError(err);
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as AuthResult;
  const session: AuthSession = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
  saveSession(session);
  return session;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await authFetch(`${BASE}/auth/me`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as AuthUser;
  const existing = getStoredSession();
  if (existing) {
    saveSession({ ...existing, user: { id: data.id, email: data.email, displayName: data.displayName } });
  }
  return data;
}

export async function logout(): Promise<void> {
  const existing = getStoredSession();
  if (!existing?.refreshToken) {
    clearSession();
    return;
  }

  await fetch(`${BASE}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: existing.refreshToken }),
  }).catch(() => null);

  clearSession();
}
