const KEY = "rx-dosage-form-position";

export type DosageFormPosition = "before" | "after";
export type DosageFormPositions = Record<string, DosageFormPosition>;

// Default positions matching the reference image (alternating pattern)
const IMAGE_DEFAULTS: DosageFormPositions = {
  "INHALER":           "before",
  "LOTION":            "after",
  "SYP":               "before",
  "GEL":               "after",
  "CAP":               "before",
  "SPRAY":             "after",
  "INJ":               "before",
  "SOLUTION":          "after",
  "TAB":               "before",
  "SHAMPOO":           "after",
  "OINTMENT":          "before",
  "CREAM":             "after",
  "SYRUP":             "before",
  "OINT":              "after",
  "SUPPOSITORY":       "before",
  "EYE DROP":          "after",
  "POWDER":            "before",
  "INHALATION CAPSULE":"after",
  "SUSPENSION":        "before",
  "CHEWABLE TABLET":   "after",
};

export function loadDosageFormPositions(): DosageFormPositions {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as DosageFormPositions; }
  catch { return {}; }
}

export function saveDosageFormPositions(pos: DosageFormPositions) {
  try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch {}
}

/** Reads user-saved position, falls back to image defaults, then "before". */
export function getDosageFormPosition(form: string | null | undefined): DosageFormPosition {
  if (!form) return "before";
  const saved = loadDosageFormPositions();
  if (form in saved) return saved[form];
  // Check image defaults (case-insensitive)
  const upper = form.toUpperCase();
  if (upper in IMAGE_DEFAULTS) return IMAGE_DEFAULTS[upper];
  return "before";
}

export { IMAGE_DEFAULTS };
