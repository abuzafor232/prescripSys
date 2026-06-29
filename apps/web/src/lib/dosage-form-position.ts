const KEY = "rx-dosage-form-position";

export type DosageFormPosition = "before" | "after";
export type DosageFormPositions = Record<string, DosageFormPosition>;

export function loadDosageFormPositions(): DosageFormPositions {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as DosageFormPositions; }
  catch { return {}; }
}

export function saveDosageFormPositions(pos: DosageFormPositions) {
  try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch {}
}

/** Returns "before" by default — dosage form appears before the trade name. */
export function getDosageFormPosition(form: string | null | undefined): DosageFormPosition {
  if (!form) return "before";
  return loadDosageFormPositions()[form] ?? "before";
}
