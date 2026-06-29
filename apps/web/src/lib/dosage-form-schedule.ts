const KEY = "rx-dosage-form-schedule";

export type FormSchedule = {
  doseAmount: string; // e.g. "1"
  doseUnit: string;   // e.g. "Drop"
  frequency: string;  // e.g. "3"
};
export type FormSchedules = Record<string, FormSchedule>;

const UNIT_MAP: Record<string, string> = {
  "EYE DROP": "Drop", "EAR DROP": "Drop", "NOSE DROP": "Drop",
  "TAB": "Tab", "TABLET": "Tab", "CHEWABLE TABLET": "Tab",
  "CAP": "Cap", "CAPSULE": "Cap", "INHALATION CAPSULE": "Cap",
  "SYP": "Tsp", "SYRUP": "Tsp",
  "SUSPENSION": "Tsp", "SOLUTION": "ml",
  "INJ": "Inj", "INJECTION": "Inj",
  "CREAM": "App", "OINTMENT": "App", "OINT": "App",
  "GEL": "App", "LOTION": "App",
  "INHALER": "Puff", "SPRAY": "Spray",
  "INHALATION": "Puff",
  "SUPPOSITORY": "Supp",
  "POWDER": "Sachet",
  "SHAMPOO": "App",
};

export function defaultDoseUnit(form: string): string {
  const u = form.toUpperCase();
  for (const [key, val] of Object.entries(UNIT_MAP)) {
    if (u === key || u.includes(key)) return val;
  }
  return "Dose";
}

export function loadFormSchedules(): FormSchedules {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as FormSchedules; }
  catch { return {}; }
}

export function saveFormSchedules(s: FormSchedules) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function getFormSchedule(form: string): FormSchedule {
  const saved = loadFormSchedules();
  if (form in saved) return saved[form];
  return { doseAmount: "1", doseUnit: defaultDoseUnit(form), frequency: "" };
}
