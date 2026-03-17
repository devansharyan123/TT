"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  CalendarCheck2,
  BarChart3,
  Lightbulb,
  LayoutGrid,
  Briefcase,
  Dumbbell,
  Apple,
  Trash2,
  X,
} from "lucide-react";
import AuthMenu from "@/components/AuthMenu";
import {
  createSection,
  deleteSection,
  getSections,
  getSelectedSection,
  setSelectedSection,
  SECTION_EVENT,
} from "@/lib/sections";

const topLinks = [
  { href: "/today", label: "Daily Tasks", icon: CalendarCheck2 },
  { href: "/weekly-stats", label: "Weekly Stats", icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/timetable", label: "Timetable", icon: LayoutGrid },
];

function sectionIcon(label: string) {
  const x = label.toLowerCase();
  if (x.includes("work")) return Briefcase;
  if (x.includes("gym") || x.includes("fit")) return Dumbbell;
  if (x.includes("diet") || x.includes("food")) return Apple;
  return LayoutGrid;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMinimalShell = pathname === "/" || pathname.startsWith("/auth/");
  const [sections, setSections] = useState<string[]>(["Work", "Gym", "Diet"]);
  const [selected, setSelected] = useState("Work");
  const [showCreate, setShowCreate] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    setSections(getSections());
    setSelected(getSelectedSection());

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ section?: string }>;
      setSections(getSections());
      setSelected(custom.detail?.section ?? getSelectedSection());
    };

    window.addEventListener(SECTION_EVENT, handler);
    return () => window.removeEventListener(SECTION_EVENT, handler);
  }, []);

  const handleCreateSection = () => {
    const result = createSection(newSectionName);
    if (!result.ok) {
      setCreateError(result.error ?? "Failed to create section.");
      return;
    }
    setCreateError(null);
    setNewSectionName("");
    setShowCreate(false);
    setSections(result.sections ?? getSections());
    setSelected(getSelectedSection());
  };

  const handleConfirmDelete = () => {
    if (!deletingSection || confirmText !== deletingSection) return;
    const result = deleteSection(deletingSection);
    if (!result.ok) return;
    setSections(result.sections ?? getSections());
    setSelected(getSelectedSection());
    setDeletingSection(null);
    setConfirmText("");
  };

  if (isMinimalShell) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 px-3 sm:px-6 pt-4">
          <div className="glass rounded-2xl p-2.5 flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-white/85 px-2">
              TaskTracker
            </Link>
            <AuthMenu compact />
          </div>
        </header>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 p-4">
        <div className="glass-strong w-full rounded-3xl p-4 flex flex-col">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">Task Sections</p>

          <div className="space-y-2">
            {sections.map((label) => {
              const Icon = sectionIcon(label);
              const active = selected === label;
              return (
                <div
                  key={label}
                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{
                    background: active ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedSection(label);
                      setSelected(label);
                    }}
                    className="flex items-center gap-2.5 flex-1 text-left"
                  >
                    <Icon size={14} className={active ? "text-blue-300" : "text-white/50"} />
                    <span className={`text-sm ${active ? "text-blue-100" : "text-white/75"}`}>{label}</span>
                  </button>

                  <button
                    onClick={() => {
                      setDeletingSection(label);
                      setConfirmText("");
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.18)", color: "rgba(252,165,165,1)" }}
                    title="Delete section"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4">
            <button onClick={() => setShowCreate(true)} className="group inline-flex items-center">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="h-11 w-11 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(96,165,250,0.16)",
                  border: "1px solid rgba(96,165,250,0.32)",
                  color: "rgba(96,165,250,1)",
                }}
              >
                <Plus size={18} />
              </motion.div>
              <span className="ml-2 text-xs text-blue-300/80 opacity-0 group-hover:opacity-100 transition-opacity">
                Create Task Section
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-40 px-3 sm:px-6 pt-4">
          <div className="glass rounded-2xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
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

              <button onClick={() => setShowCreate(true)} className="md:hidden ml-auto">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="h-9 w-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(96,165,250,0.16)",
                    border: "1px solid rgba(96,165,250,0.32)",
                    color: "rgba(96,165,250,1)",
                  }}
                  title="Create Task Section"
                >
                  <Plus size={15} />
                </motion.div>
              </button>
            </div>

            <AuthMenu />
          </div>
        </header>

        <div className="px-0 pb-8">{children}</div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowCreate(false)} />
          <div className="relative modal-surface rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Create Task Section</p>
              <button onClick={() => setShowCreate(false)} className="text-white/40">
                <X size={15} />
              </button>
            </div>
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Section name (e.g. Study)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            />
            {createError && <p className="text-xs text-rose-300/80 mt-2">{createError}</p>}
            <button
              onClick={handleCreateSection}
              className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: "rgba(96,165,250,0.2)",
                border: "1px solid rgba(96,165,250,0.35)",
                color: "rgba(147,197,253,1)",
              }}
            >
              Create Section
            </button>
          </div>
        </div>
      )}

      {deletingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setDeletingSection(null)} />
          <div className="relative modal-surface rounded-2xl p-5 w-full max-w-sm">
            <p className="text-sm font-semibold text-white mb-2">Delete Section</p>
            <p className="text-xs text-white/55 mb-3">
              Type <span className="text-rose-200 font-semibold">{deletingSection}</span> to confirm deletion.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type section name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            />
            <button
              onClick={handleConfirmDelete}
              disabled={confirmText !== deletingSection}
              className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{
                background: "rgba(239,68,68,0.2)",
                border: "1px solid rgba(239,68,68,0.35)",
                color: "rgba(252,165,165,1)",
              }}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
