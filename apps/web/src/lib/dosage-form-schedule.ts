const KEY = "rx-dosage-form-schedule";

export type FormSched = {
  schedule: string;
  scheduleDoses: string[];
  durationValue: string;
  durationUnit: string;
  continueMedicine: boolean;
  noneFields: [string, string, string, string];
};
export type FormSchedules = Record<string, FormSched>;

export function loadFormSchedules(): FormSchedules {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const result: FormSchedules = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === "object" && !Array.isArray(v))
        result[k] = v as FormSched;
    }
    return result;
  } catch { return {}; }
}

export function saveFormSchedules(s: FormSchedules) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

/** Normalise form name for matching: uppercase, strip trailing S, collapse spaces */
function normForm(f: string) {
  return f.toUpperCase().replace(/S$/, "").replace(/\s+/g, " ").trim();
}

/**
 * Returns the saved schedule for a dosage form, or null if None / not configured.
 * Matching is case-insensitive and treats Eye Drop / Eye Drops as the same.
 */
export function getActiveSched(form: string | null | undefined): FormSched | null {
  if (!form) return null;
  const all = loadFormSchedules();

  // 1. Exact match
  const exact = all[form];
  if (exact && exact.schedule !== "None") return exact;

  // 2. Normalised match (case-insensitive + singular/plural)
  const needle = normForm(form);
  for (const [key, val] of Object.entries(all)) {
    if (normForm(key) === needle && val.schedule !== "None") return val;
  }

  return null;
}

/** Returns the saved key that matches the given form name (for display purposes). */
export function getMatchingFormKey(form: string | null | undefined): string | null {
  if (!form) return null;
  const all = loadFormSchedules();
  if (all[form] && all[form].schedule !== "None") return form;
  const needle = normForm(form);
  for (const key of Object.keys(all)) {
    if (normForm(key) === needle && all[key].schedule !== "None") return key;
  }
  return null;
}
