"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserCircle2 } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { AUTH_EVENT, fetchMe, getStoredUser, logout } from "@/lib/auth-client";

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AuthMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser());
  const containerRef = useRef<HTMLDivElement | null>(null);

  const label = useMemo(() => {
    const name = user?.displayName?.trim();
    if (name) return name;
    const email = user?.email?.trim();
    if (email) return email;
    return "User";
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchMe().then((latest) => {
      if (latest) {
        setUser({ id: latest.id, email: latest.email, displayName: latest.displayName });
      }
    });
  }, [user?.id]);

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push("/");
  };

  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAuthMode("login");
              setAuthOpen(true);
            }}
            className={compact ? "rounded-lg px-3 py-1.5 text-xs" : "rounded-xl px-3.5 py-2 text-sm font-semibold"}
            style={{
              background: "rgba(96,165,250,0.18)",
              border: "1px solid rgba(96,165,250,0.3)",
              color: "rgba(147,197,253,1)",
            }}
          >
            Login
          </button>

          {!compact && (
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthOpen(true);
              }}
              className="rounded-xl px-3.5 py-2 text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              Sign up
            </button>
          )}
        </div>
        <AuthModal
          open={authOpen}
          defaultMode={authMode}
          onClose={() => setAuthOpen(false)}
          onAuthed={() => router.push("/today")}
        />
      </>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          title={label}
        >
          <span
            className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: "linear-gradient(135deg, rgba(96,165,250,0.9), rgba(59,130,246,0.85))",
              color: "#f8fbff",
            }}
          >
            {initials(label)}
          </span>
          {!compact && <span className="text-xs text-white/80 max-w-[120px] truncate">{label}</span>}
          <ChevronDown size={14} className="text-white/50" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-xl glass-strong p-1.5 z-50">
            <Link href="/today" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-white/80 hover:bg-white/10">
              <UserCircle2 size={14} />
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-200 hover:bg-rose-400/10"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        )}
      </div>
    </>
  );
}
