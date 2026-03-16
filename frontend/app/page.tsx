"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, Sparkles, ShieldCheck } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { AUTH_EVENT, getStoredUser } from "@/lib/auth-client";

const highlights = [
  "Plan daily and weekly tasks in one workspace",
  "Track streaks, consistency, and completion insights",
  "Sync progress with secure account login",
];

export default function LandingPage() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const sync = () => setIsAuthed(!!getStoredUser());
    sync();
    window.addEventListener(AUTH_EVENT, sync);
    return () => window.removeEventListener(AUTH_EVENT, sync);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[420px] w-[900px] rounded-full bg-cyan-400/15 blur-[120px]" />
      <div className="absolute top-[45%] -right-32 h-72 w-72 rounded-full bg-amber-300/15 blur-[90px]" />

      <section className="relative max-w-5xl mx-auto px-5 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5"
        >
          <Sparkles size={14} className="text-cyan-300" />
          <span className="text-xs tracking-wide text-white/70">TaskTracker Productivity Hub</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-5 text-4xl sm:text-6xl font-black leading-tight text-white"
        >
          Build winning routines.
          <br />
          Keep your momentum.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-5 max-w-2xl text-white/65 text-base sm:text-lg"
        >
          Design your schedule, execute today's tasks, and review your progress with clear stats and insights. Start in seconds with email/password or Google login.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <button
            onClick={() => (isAuthed ? router.push("/today") : setAuthOpen(true))}
            className="rounded-xl px-5 py-3 text-sm font-semibold inline-flex items-center gap-2"
            style={{
              background: "rgba(96,165,250,0.25)",
              border: "1px solid rgba(96,165,250,0.36)",
              color: "rgba(191,219,254,1)",
            }}
          >
            {isAuthed ? "Open Dashboard" : "Get Started"}
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => router.push("/timetable")}
            className="rounded-xl px-5 py-3 text-sm font-semibold"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.16)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Preview Timetable
          </button>
        </motion.div>

        <div className="mt-10 grid sm:grid-cols-3 gap-3">
          {highlights.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35 + i * 0.08 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 text-cyan-300 mb-2">
                <CheckCircle2 size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Feature</span>
              </div>
              <p className="text-sm text-white/75">{item}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-4 flex items-start gap-3">
            <Clock3 className="text-amber-300 mt-0.5" size={16} />
            <p className="text-sm text-white/70">Smart weekly scheduling with section-based planning for Work, Gym, Diet, and custom goals.</p>
          </div>
          <div className="glass rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="text-emerald-300 mt-0.5" size={16} />
            <p className="text-sm text-white/70">Secure sessions with refresh tokens and one-click logout from your top-right profile menu.</p>
          </div>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthed={() => router.push("/today")} />
    </main>
  );
}
