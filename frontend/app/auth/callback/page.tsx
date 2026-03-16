"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSession } from "@/lib/auth-client";

function decodeState(state: string | null): { redirectTo?: string } {
  if (!state) return {};
  try {
    const decoded = decodeURIComponent(state);
    return JSON.parse(decoded) as { redirectTo?: string };
  } catch {
    return {};
  }
}

function GoogleAuthCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

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
      setError("Missing Google auth payload. Please try again.");
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

    const parsedState = decodeState(payload.state);
    router.replace(parsedState.redirectTo || "/today");
  }, [payload, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-5 max-w-md w-full">
        <p className="text-lg font-semibold text-white">Signing you in...</p>
        <p className="text-sm text-white/55 mt-1">Please wait while we complete Google authentication.</p>
        {error && <p className="text-xs text-rose-300 mt-3">{error}</p>}
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
