export const SECTIONS_STORAGE_KEY = "tt.sections.v1";
export const SELECTED_SECTION_STORAGE_KEY = "tt.section.selected.v1";
export const SECTION_EVENT = "tt-section-updated";

const DEFAULT_SECTIONS = ["Work", "Gym", "Diet"];

function normalize(name: string): string {
  return name.trim();
}

export function getSections(): string[] {
  if (typeof window === "undefined") return DEFAULT_SECTIONS;
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SECTIONS;
    return Array.from(new Set(parsed.map(normalize).filter(Boolean)));
  } catch {
    return DEFAULT_SECTIONS;
  }
}

export function saveSections(sections: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(sections));
}

export function getSelectedSection(): string {
  if (typeof window === "undefined") return DEFAULT_SECTIONS[0];
  const selected = localStorage.getItem(SELECTED_SECTION_STORAGE_KEY);
  const sections = getSections();
  if (selected && sections.includes(selected)) return selected;
  return sections[0] ?? DEFAULT_SECTIONS[0];
}

export function setSelectedSection(section: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELECTED_SECTION_STORAGE_KEY, section);
  window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail: { section } }));
}

export function createSection(name: string): { ok: boolean; error?: string; sections?: string[] } {
  const label = normalize(name);
  if (!label) return { ok: false, error: "Section name is required." };
  const sections = getSections();
  if (sections.some((s) => s.toLowerCase() === label.toLowerCase())) {
    return { ok: false, error: "Section already exists." };
  }
  const next = [...sections, label];
  saveSections(next);
  setSelectedSection(label);
  return { ok: true, sections: next };
}

export function deleteSection(name: string): { ok: boolean; error?: string; sections?: string[] } {
  const sections = getSections();
  if (sections.length <= 1) {
    return { ok: false, error: "At least one section must exist." };
  }
  const idx = sections.findIndex((s) => s === name);
  if (idx === -1) return { ok: false, error: "Section not found." };
  const next = sections.filter((s) => s !== name);
  saveSections(next);
  const selected = getSelectedSection();
  if (selected === name) setSelectedSection(next[0]);
  else window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail: { section: selected } }));
  return { ok: true, sections: next };
}

export function getStreakStorageKey(section: string): string {
  return `tt.streak.v1.${section.toLowerCase()}`;
}
