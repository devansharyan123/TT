"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getStoredSession, saveSession } from "@/lib/auth-client";

function decodeState(state: string | null): { redirectTo?: string; next?: string } {
  if (!state) return {};
  try {
    const decoded = decodeURIComponent(state);
    return JSON.parse(decoded) as { redirectTo?: string; next?: string };
  } catch {
    return {};
  }
}

function resolvePostAuthPath(state: string | null): string {
  const parsedState = decodeState(state);
  const candidate = (parsedState.next || parsedState.redirectTo || "").trim();
  if (!candidate) return "/today";
  if (candidate.startsWith("/auth/callback")) return "/today";
  if (!candidate.startsWith("/")) return "/today";
  return candidate;
}

function GoogleAuthCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();

  const payload = useMemo(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const id = params.get("uid");
    const email = params.get("email");
    const displayName = params.get("displayName");
    const state = params.get("state");
    return { accessToken, refreshToken, id, email, displayName, state };
  }, [params]);

  useEffect(() => {
    if (!payload.accessToken || !payload.refreshToken || !payload.id) {
      const existingSession = getStoredSession();
      if (existingSession?.accessToken && existingSession?.refreshToken && existingSession.user?.id) {
        router.replace(resolvePostAuthPath(payload.state));
        return;
      }

      // Handle stale callback links gracefully.
      router.replace("/today");
      return;
    }

    saveSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: {
        id: payload.id,
        email: payload.email,
        displayName: payload.displayName,
      },
    });

    router.replace(resolvePostAuthPath(payload.state));
  }, [payload, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-5 max-w-md w-full">
        <p className="text-lg font-semibold text-white">Signing you in...</p>
        <p className="text-sm text-white/55 mt-1">Please wait while we complete Google authentication.</p>
      </div>
    </main>
  );
}

export default function GoogleAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="glass-strong rounded-2xl p-5 max-w-md w-full">
            <p className="text-lg font-semibold text-white">Signing you in...</p>
          </div>
        </main>
      }
    >
      <GoogleAuthCallbackInner />
    </Suspense>
  );
}
