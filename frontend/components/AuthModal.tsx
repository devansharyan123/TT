"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Mail, Lock, UserRound } from "lucide-react";
import { getGoogleAuthUrl, loginWithEmail, signupWithEmail } from "@/lib/auth-client";

type Mode = "login" | "signup";

export default function AuthModal({
  open,
  onClose,
  defaultMode = "login",
  onAuthed,
}: {
  open: boolean;
  onClose: () => void;
  defaultMode?: Mode;
  onAuthed?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setError(null);
  }, [defaultMode, open]);

  if (!open) return null;

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await loginWithEmail(email.trim(), password);
      } else {
        await signupWithEmail(email.trim(), password, displayName.trim() || undefined);
      }
      onAuthed?.();
      onClose();
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsBusy(false);
    }
  };

  const googleSignIn = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const authUrl = await getGoogleAuthUrl(callbackUrl, "/today");
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto modal-surface rounded-3xl p-6"
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{mode === "login" ? "Welcome Back" : "Create Account"}</p>
          <button onClick={onClose} className="text-white/45 hover:text-white/75">
            <X size={16} />
          </button>
        </div>

        <p className="mt-1 text-sm text-white/50">
          {mode === "login"
            ? "Login with email/password or continue with Google."
            : "Sign up to sync tasks across devices."}
        </p>

        <div className="mt-4 p-1 rounded-xl bg-white/5 border border-white/10 inline-flex">
          <button
            onClick={() => setMode("login")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: mode === "login" ? "rgba(96,165,250,0.2)" : "transparent",
              color: mode === "login" ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.55)",
            }}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: mode === "signup" ? "rgba(96,165,250,0.2)" : "transparent",
              color: mode === "signup" ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.55)",
            }}
          >
            Sign Up
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {mode === "signup" && (
            <label className="block">
              <span className="text-[11px] uppercase tracking-widest text-white/35">Display Name</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <UserRound size={14} className="text-white/40" />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Devansh"
                  className="w-full bg-transparent outline-none text-sm text-white"
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-white/35">Email</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <Mail size={14} className="text-white/40" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="w-full bg-transparent outline-none text-sm text-white"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-white/35">Password</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <Lock size={14} className="text-white/40" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="At least 8 characters"
                className="w-full bg-transparent outline-none text-sm text-white"
              />
            </div>
          </label>
        </div>

        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

        <button
          onClick={submit}
          disabled={isBusy}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{
            background: "rgba(96,165,250,0.22)",
            border: "1px solid rgba(96,165,250,0.35)",
            color: "rgba(147,197,253,1)",
          }}
        >
          {isBusy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>

        <button
          onClick={googleSignIn}
          disabled={isBusy}
          className="mt-2.5 w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
}
