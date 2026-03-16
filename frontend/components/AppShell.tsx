"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, CalendarCheck2, BarChart3, Lightbulb, LayoutGrid, Briefcase, Dumbbell, Apple } from "lucide-react";

const topLinks = [
  { href: "/", label: "Daily Tasks", icon: CalendarCheck2 },
  { href: "/weekly-stats", label: "Weekly Stats", icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/timetable", label: "Timetable", icon: LayoutGrid },
];

const sections = [
  { label: "Work", icon: Briefcase },
  { label: "Gym", icon: Dumbbell },
  { label: "Diet", icon: Apple },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 p-4">
        <div className="glass-strong w-full rounded-3xl p-4 flex flex-col">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">Task Sections</p>
          <div className="space-y-2">
            {sections.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Icon size={14} className="text-white/50" />
                <span className="text-sm text-white/75">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4">
            <Link href="/timetable" className="group inline-flex items-center">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="h-11 w-11 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(96,165,250,0.16)", border: "1px solid rgba(96,165,250,0.32)", color: "rgba(96,165,250,1)" }}
              >
                <Plus size={18} />
              </motion.div>
              <span className="ml-2 text-xs text-blue-300/80 opacity-0 group-hover:opacity-100 transition-opacity">
                Create Task
              </span>
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-40 px-3 sm:px-6 pt-4">
          <div className="glass rounded-2xl p-2.5 flex items-center gap-1.5 overflow-x-auto">
            {topLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href === "/timetable" && pathname === "/schedule");
              return (
                <Link key={href} href={href} className="shrink-0">
                  <div
                    className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2"
                    style={{
                      background: active ? "rgba(96,165,250,0.16)" : "transparent",
                      border: `1px solid ${active ? "rgba(96,165,250,0.34)" : "transparent"}`,
                      color: active ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.45)",
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </div>
                </Link>
              );
            })}

            <Link href="/timetable" className="md:hidden ml-auto">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(96,165,250,0.16)", border: "1px solid rgba(96,165,250,0.32)", color: "rgba(96,165,250,1)" }}
                title="Create Task"
              >
                <Plus size={15} />
              </motion.div>
            </Link>
          </div>
        </header>

        <div className="px-0 pb-8">{children}</div>
      </div>
    </div>
  );
}
