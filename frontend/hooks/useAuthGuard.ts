"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, AUTH_EVENT } from "@/lib/auth-client";

/**
 * Redirect to "/" if no session exists. Also re-checks whenever the auth
 * state changes (e.g. after logout).
 */
export function useAuthGuard(): void {
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      if (!getStoredSession()) {
        router.replace("/");
      }
    };

    check();
    window.addEventListener(AUTH_EVENT, check);
    return () => window.removeEventListener(AUTH_EVENT, check);
  }, [router]);
}
