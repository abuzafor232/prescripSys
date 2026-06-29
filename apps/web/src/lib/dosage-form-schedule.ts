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
      if (v && typeof v === "object" && !Array.isArray(v) && "scheduleDoses" in (v as object))
        result[k] = v as FormSched;
    }
    return result;
  } catch { return {}; }
}

export function saveFormSchedules(s: FormSchedules) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

/** Returns saved schedule for a dosage form, or null if None/unset. */
export function getActiveSched(form: string | null | undefined): FormSched | null {
  if (!form) return null;
  const all = loadFormSchedules();
  const s = all[form];
  if (!s || s.schedule === "None") return null;
  return s;
}
