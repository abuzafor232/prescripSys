"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  FileText,
  Eye,
  History,
  Loader2,
  Pencil,
  PenLine,
  Plus,
  Printer,
  UserCheck,
  UserCog,
  RotateCcw,
  Search,
  LayoutGrid,
  LogOut,
  Settings,
  Trash2,
  UserPlus,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  apiFetch,
  createPrescription,
  createPatient,
  updatePatient,
  fetchChambers,
  fetchDoctors,
  fetchPrescriptionById,
  fetchPatientPrescriptions,
  getApiErrorMessage,
  searchPatients,
  type CreatePrescriptionInput,
  type Prescription,
  type CreatePatientInput,
  type MedicineSearchResult,
  type Patient,
  type PatientGender
} from "@/lib/api";
import { DOSE_PATTERNS, MEAL_INSTRUCTIONS } from "@/lib/prescription-constants";
import { cn, toTitleCase } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchParams } from "next/navigation";
import { useSessionStore } from "@/stores/session-store";

type RxMedicine = {
  medicineId?: string;
  brandName: string;
  genericName?: string;
  strength?: string | null;
  dosageForm?: string | null;
  dose: string;
  duration: string;
  instruction: string;
  note?: string;
};

type PatientFormState = {
  name: string;
  mobile: string;
  gender: PatientGender;
  dateOfBirth: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  bloodGroup: string;
  occupation: string;
  createPrescription: boolean;
};

type PanelKey =
  | "complaint"
  | "history"
  | "findings"
  | "investigation"
  | "diagnosis"
  | "medication"
  | "vision"
  | "advice"
  | "followUp"
  | "referral";

type NoteKey =
  | "complaint"
  | "history"
  | "findings"
  | "investigation"
  | "diagnosis"
  | "advice"
  | "followUp"
  | "referral";

type GlassPrescriptionState = {
  right: EyePower;
  left: EyePower;
  add: string;
  ipd: string;
  glassFeatures: string[];
  lensType: string;
  iopRight: string;
  iopLeft: string;
  note: string;
};

type VisionState = GlassPrescriptionState & {
  secondaryGlass?: GlassPrescriptionState;
};

type EyePower = {
  sphere: string;
  cyl: string;
  axis: string;
  va: string;
};

type GlassPowerPickerTarget =
  | { kind: "eye"; side: "right" | "left"; field: keyof EyePower }
  | { kind: "add" };

type TriStateValue = "no" | "na" | "yes" | "";

type FindingsState = {
  bpSystolic: string;
  bpDiastolic: string;
  heightFeet: string;
  heightInch: string;
  heightCm: string;
  ofcCm: string;
  ofcInch: string;
  pulse: string;
  temperature: string;
  diabetes: TriStateValue;
  diabetesDetails: string;
  weight: string;
  pfr: string;
  respiratoryRate: string;
  rbs: string;
  fbs: string;
  twoHourAbf: string;
  spo2: string;
  ophthalmicVisualAcuityRight: string;
  ophthalmicVisualAcuityLeft: string;
  ophthalmicVisualAcuityRightNote: string;
  ophthalmicVisualAcuityLeftNote: string;
  ophthalmicVisualAcuityWithPhRight: string;
  ophthalmicVisualAcuityWithPhLeft: string;
  ophthalmicVisualAcuityWithPgpRight: string;
  ophthalmicVisualAcuityWithPgpLeft: string;
  ophthalmicOrbitAdnexaRight: string;
  ophthalmicOrbitAdnexaLeft: string;
  ophthalmicOrbitAdnexaRightNote: string;
  ophthalmicOrbitAdnexaLeftNote: string;
  ophthalmicPupilRight: string;
  ophthalmicPupilLeft: string;
  ophthalmicCdRight: string;
  ophthalmicCdLeft: string;
  ophthalmicCdRightNote: string;
  ophthalmicCdLeftNote: string;
  ophthalmicAntSegmentRight: string;
  ophthalmicAntSegmentLeft: string;
  ophthalmicAntSegmentRightNote: string;
  ophthalmicAntSegmentLeftNote: string;
  ophthalmicPostSegmentRight: string;
  ophthalmicPostSegmentLeft: string;
  ophthalmicPostSegmentRightNote: string;
  ophthalmicPostSegmentLeftNote: string;
  ophthalmicIopRight: string;
  ophthalmicIopLeft: string;
  ophthalmicIopRightNote: string;
  ophthalmicIopLeftNote: string;
  ophthalmicSptRight: string;
  ophthalmicSptLeft: string;
  ophthalmicSptRightNote: string;
  ophthalmicSptLeftNote: string;
  ophthalmicOthersRight: string;
  ophthalmicOthersLeft: string;
  ophthalmicVaRecordRightSphere: string;
  ophthalmicVaRecordRightCyl: string;
  ophthalmicVaRecordRightAxis: string;
  ophthalmicVaRecordRightVa: string;
  ophthalmicVaRecordLeftSphere: string;
  ophthalmicVaRecordLeftCyl: string;
  ophthalmicVaRecordLeftAxis: string;
  ophthalmicVaRecordLeftVa: string;
  ophthalmicPseudophakiaRight: string;
  ophthalmicPseudophakiaLeft: string;
  ophthalmicRemark: string;
  gynaeMenarche: string;
  gynaeLmp: string;
  gynaeMpFirst: string;
  gynaeMpSecond: string;
  gynaeMcFirst: string;
  gynaeMcSecond: string;
  gynaeFlow: string;
  gynaeDysmenorrhoea: string;
  gynaeMarriedYears: string;
  gynaeMarriedMonths: string;
  gynaeMarriedDays: string;
  gynaeMarriageDate: string;
  gynaePara: string;
  gynaeGravida: string;
  gynaeParaNote: string;
  gynaeAlcYears: string;
  gynaeAlcMonths: string;
  gynaeAlcDays: string;
  gynaeEdd: string;
  gynaeNad: string;
  gynaeTenderness: string;
  gynaeAbdominalNote: string;
};

type ReferralEntry = {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  additionalInfo: string;
  direction: "to" | "from";
};

type SavedReferralDoctor = {
  id: string;
  name: string;
  specialty: string;
  chamberAddress: string;
  contact: string;
};

type QueueAppointment = {
  id: string;
  date?: string;
  patientName: string;
  phone: string;
  time: string;
  appointmentType: string;
  status: string;
  ageYears?: string;
  ageMonths?: string;
  ageDays?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
};

type ComplaintEntry = {
  id: string;
  name: string;
  value: string;
  forType: "For" | "Since" | "On";
  forAmount: string;
  forUnit: "Day" | "Month" | "Week" | "Year" | "Hour";
  forDate: string;
  note: string;
};

type HistoryDuration = {
  type: "For" | "Since" | "On" | "Range";
  amount: string;
  unit: "Day" | "Week" | "Month" | "Year";
  text: string;
  rangeTo: string;
};

type HistoryEntry = {
  id: string;
  tab: HistoryTab;
  name: string;
  value: string;
  duration?: HistoryDuration;
  note: string;
};

type InvestigationEntry = { id: string; name: string; value: string; };
type DiagnosisEntry = { id: string; name: string; value: string; };

type RxDraft = {
  id: string;
  name: string;
  note?: string;
  tags?: string[];
  appointmentId?: string;
  serialNo?: number;
  savedAt: string;
  patient: Patient | null;
  notes: Record<NoteKey, string>;
  medicines: RxMedicine[];
  medicationNote: string;
  findings: FindingsState;
  vision: VisionState;
  referrals: ReferralEntry[];
  followUpDate: string;
  fees?: string;
  rxInvestigations: InvestigationEntry[];
  rxDiagnoses: DiagnosisEntry[];
};

type RxTemplate = {
  id: string;
  name: string;
  savedAt: string;
  notes: Record<NoteKey, string>;
  medicines: RxMedicine[];
  medicationNote: string;
  rxInvestigations: InvestigationEntry[];
  rxDiagnoses: DiagnosisEntry[];
};

const DRAFTS_STORAGE_KEY = "rx-drafts";
const TEMPLATES_STORAGE_KEY = "rx-templates";
const APPOINTMENTS_STORAGE_KEY = "rx-appointments";
const PATIENT_NOTES_STORAGE_KEY = "rx-patient-notes";
const REFERRAL_DOCTORS_STORAGE_KEY = "rx-referral-doctors";
const LAST_VISIT_KEY = "rx-last-visit";
const ADVICE_LIBRARY_KEY = "rx-advice-library";
const SUGG_COMPLAINT = "rx-sugg-complaint";
const SUGG_HISTORY = "rx-sugg-history";
const SUGG_INVESTIGATION = "rx-sugg-investigation";
const SUGG_DIAGNOSIS = "rx-sugg-diagnosis";

function loadSuggestions(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function persistSuggestion(key: string, name: string) {
  if (!name.trim()) return;
  const list = loadSuggestions(key);
  if (list.some((s: string) => s.toLowerCase() === name.trim().toLowerCase())) return;
  localStorage.setItem(key, JSON.stringify([name.trim(), ...list].slice(0, 200)));
}
function deleteSuggestion(key: string, name: string) {
  const list = loadSuggestions(key);
  localStorage.setItem(key, JSON.stringify(list.filter((s: string) => s !== name)));
}

function formatTimeAgo(dateStr: string): string {
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return "";
  const now = new Date();
  let y = now.getFullYear() - then.getFullYear();
  let mo = now.getMonth() - then.getMonth();
  let d = now.getDate() - then.getDate();
  if (d < 0) { mo--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (mo < 0) { y--; mo += 12; }
  if (y === 0 && mo === 0 && d === 0) return "Today";
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} Year${y !== 1 ? "s" : ""}`);
  if (mo > 0) parts.push(`${mo} Month${mo !== 1 ? "s" : ""}`);
  if (d > 0) parts.push(`${d} Day${d !== 1 ? "s" : ""}`);
  return parts.join(" ") + " Ago";
}

function storeLastVisit(patientId: string, phone?: string | null) {
  try {
    const store = JSON.parse(localStorage.getItem(LAST_VISIT_KEY) ?? "{}") as Record<string, string>;
    const now = new Date().toISOString();
    store[patientId] = now;
    if (phone) store[`p:${phone}`] = now;
    localStorage.setItem(LAST_VISIT_KEY, JSON.stringify(store));
  } catch {}
}

function getLastVisit(patientId?: string | null, phone?: string | null): string | null {
  try {
    const store = JSON.parse(localStorage.getItem(LAST_VISIT_KEY) ?? "{}") as Record<string, string>;
    if (patientId && store[patientId]) return store[patientId];
    if (phone && store[`p:${phone}`]) return store[`p:${phone}`];
    return null;
  } catch { return null; }
}

function formatHistoryDuration(d: HistoryDuration): string {
  if (d.type === "For") return d.amount ? `For ${d.amount} ${d.unit}${Number(d.amount) !== 1 ? "s" : ""}` : "";
  if (d.type === "Since") return d.text ? `Since ${d.text}` : "";
  if (d.type === "On") return d.text ? `On ${d.text}` : "";
  if (d.type === "Range") return d.text || d.rangeTo ? `From ${d.text} to ${d.rangeTo}` : "";
  return "";
}

function loadFromStorage<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

const initialPatientForm: PatientFormState = {
  name: "",
  mobile: "",
  gender: "MALE",
  dateOfBirth: "",
  ageYears: "",
  ageMonths: "",
  ageDays: "",
  bloodGroup: "",
  occupation: "",
  createPrescription: true
};

const initialNotes: Record<NoteKey, string> = {
  complaint: "",
  history: "",
  findings: "",
  investigation: "CBC\nS. Creatinine",
  diagnosis: "Acute URTI",
  advice: "Drink adequate water\nReview if fever persists",
  followUp: "",
  referral: ""
};

const emptyEyePower: EyePower = {
  sphere: "",
  cyl: "",
  axis: "",
  va: ""
};

function createInitialGlassPrescription(): GlassPrescriptionState {
  return {
    right: { ...emptyEyePower },
    left: { ...emptyEyePower },
    add: "",
    ipd: "",
    glassFeatures: [],
    lensType: "",
    iopRight: "",
    iopLeft: "",
    note: ""
  };
}

function createInitialVision(): VisionState {
  return {
    ...createInitialGlassPrescription()
  };
}

const initialFindings: FindingsState = {
  bpSystolic: "",
  bpDiastolic: "",
  heightFeet: "",
  heightInch: "",
  heightCm: "",
  ofcCm: "",
  ofcInch: "",
  pulse: "",
  temperature: "",
  diabetes: "",
  diabetesDetails: "",
  weight: "",
  pfr: "",
  respiratoryRate: "",
  rbs: "",
  fbs: "",
  twoHourAbf: "",
  spo2: "",
  ophthalmicVisualAcuityRight: "",
  ophthalmicVisualAcuityLeft: "",
  ophthalmicVisualAcuityRightNote: "",
  ophthalmicVisualAcuityLeftNote: "",
  ophthalmicVisualAcuityWithPhRight: "",
  ophthalmicVisualAcuityWithPhLeft: "",
  ophthalmicVisualAcuityWithPgpRight: "",
  ophthalmicVisualAcuityWithPgpLeft: "",
  ophthalmicOrbitAdnexaRight: "",
  ophthalmicOrbitAdnexaLeft: "",
  ophthalmicOrbitAdnexaRightNote: "",
  ophthalmicOrbitAdnexaLeftNote: "",
  ophthalmicPupilRight: "",
  ophthalmicPupilLeft: "",
  ophthalmicCdRight: "",
  ophthalmicCdLeft: "",
  ophthalmicCdRightNote: "",
  ophthalmicCdLeftNote: "",
  ophthalmicAntSegmentRight: "",
  ophthalmicAntSegmentLeft: "",
  ophthalmicAntSegmentRightNote: "",
  ophthalmicAntSegmentLeftNote: "",
  ophthalmicPostSegmentRight: "",
  ophthalmicPostSegmentLeft: "",
  ophthalmicPostSegmentRightNote: "",
  ophthalmicPostSegmentLeftNote: "",
  ophthalmicIopRight: "",
  ophthalmicIopLeft: "",
  ophthalmicIopRightNote: "",
  ophthalmicIopLeftNote: "",
  ophthalmicSptRight: "",
  ophthalmicSptLeft: "",
  ophthalmicSptRightNote: "",
  ophthalmicSptLeftNote: "",
  ophthalmicOthersRight: "",
  ophthalmicOthersLeft: "",
  ophthalmicVaRecordRightSphere: "",
  ophthalmicVaRecordRightCyl: "",
  ophthalmicVaRecordRightAxis: "",
  ophthalmicVaRecordRightVa: "",
  ophthalmicVaRecordLeftSphere: "",
  ophthalmicVaRecordLeftCyl: "",
  ophthalmicVaRecordLeftAxis: "",
  ophthalmicVaRecordLeftVa: "",
  ophthalmicPseudophakiaRight: "",
  ophthalmicPseudophakiaLeft: "",
  ophthalmicRemark: "",
  gynaeMenarche: "",
  gynaeLmp: "",
  gynaeMpFirst: "",
  gynaeMpSecond: "",
  gynaeMcFirst: "",
  gynaeMcSecond: "",
  gynaeFlow: "",
  gynaeDysmenorrhoea: "",
  gynaeMarriedYears: "",
  gynaeMarriedMonths: "",
  gynaeMarriedDays: "",
  gynaeMarriageDate: "",
  gynaePara: "",
  gynaeGravida: "",
  gynaeParaNote: "",
  gynaeAlcYears: "",
  gynaeAlcMonths: "",
  gynaeAlcDays: "",
  gynaeEdd: "",
  gynaeNad: "",
  gynaeTenderness: "",
  gynaeAbdominalNote: ""
};

const ophthalmicFindingRows: Array<{
  label: string;
  rightKey: keyof FindingsState;
  leftKey: keyof FindingsState;
  rightNoteKey?: keyof FindingsState;
  leftNoteKey?: keyof FindingsState;
  rightWithPhKey?: keyof FindingsState;
  leftWithPhKey?: keyof FindingsState;
  rightWithPgpKey?: keyof FindingsState;
  leftWithPgpKey?: keyof FindingsState;
  inputType?: "select" | "freetext" | "checkbox" | "varecord";
  multiSelect?: boolean;
  unit?: string;
  options?: string[];
}> = [
  {
    label: "Visual Acuity",
    rightKey: "ophthalmicVisualAcuityRight",
    leftKey: "ophthalmicVisualAcuityLeft",
    rightNoteKey: "ophthalmicVisualAcuityRightNote",
    leftNoteKey: "ophthalmicVisualAcuityLeftNote",
    rightWithPhKey: "ophthalmicVisualAcuityWithPhRight",
    leftWithPhKey: "ophthalmicVisualAcuityWithPhLeft",
    rightWithPgpKey: "ophthalmicVisualAcuityWithPgpRight",
    leftWithPgpKey: "ophthalmicVisualAcuityWithPgpLeft",
    inputType: "select",
    options: ["6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "4/60", "3/60", "<6/60", "CF-2ft", "CF-1ft", "HM", "PL"]
  },
  { label: "VA Record", rightKey: "ophthalmicOthersRight", leftKey: "ophthalmicOthersLeft", inputType: "varecord" },
  { label: "Orbit & Adnexa", rightKey: "ophthalmicOrbitAdnexaRight", leftKey: "ophthalmicOrbitAdnexaLeft", rightNoteKey: "ophthalmicOrbitAdnexaRightNote", leftNoteKey: "ophthalmicOrbitAdnexaLeftNote", inputType: "select", options: [] },
  { label: "Pupil", rightKey: "ophthalmicPupilRight", leftKey: "ophthalmicPupilLeft" },
  {
    label: "Pseudophakia",
    rightKey: "ophthalmicPseudophakiaRight",
    leftKey: "ophthalmicPseudophakiaLeft",
    inputType: "checkbox"
  },
  { label: "Ant. Segment", rightKey: "ophthalmicAntSegmentRight", leftKey: "ophthalmicAntSegmentLeft", rightNoteKey: "ophthalmicAntSegmentRightNote", leftNoteKey: "ophthalmicAntSegmentLeftNote", inputType: "select", options: [] },
  { label: "CD", rightKey: "ophthalmicCdRight", leftKey: "ophthalmicCdLeft", rightNoteKey: "ophthalmicCdRightNote", leftNoteKey: "ophthalmicCdLeftNote", inputType: "select", options: [] },
  { label: "Post. Segment", rightKey: "ophthalmicPostSegmentRight", leftKey: "ophthalmicPostSegmentLeft", rightNoteKey: "ophthalmicPostSegmentRightNote", leftNoteKey: "ophthalmicPostSegmentLeftNote", inputType: "select", options: [] },
  { label: "IOP", rightKey: "ophthalmicIopRight", leftKey: "ophthalmicIopLeft", rightNoteKey: "ophthalmicIopRightNote", leftNoteKey: "ophthalmicIopLeftNote", inputType: "select", unit: "mmHg", options: [] },
  {
    label: "SPT",
    rightKey: "ophthalmicSptRight",
    leftKey: "ophthalmicSptLeft",
    rightNoteKey: "ophthalmicSptRightNote",
    leftNoteKey: "ophthalmicSptLeftNote",
    inputType: "select",
    multiSelect: true,
    options: ["Patent", "Partially Patent", "Blocked", "Canalicular Obstruction"]
  }
];

const panelTitles: Record<PanelKey, string> = {
  complaint: "Complaint",
  history: "History",
  findings: "Findings",
  investigation: "Investigation",
  diagnosis: "Diagnosis",
  medication: "Medication",
  vision: "Glass Prescription",
  advice: "Advice",
  followUp: "Follow-Up",
  referral: "Referral"
};

const leftPanels: PanelKey[] = [
  "complaint",
  "history",
  "findings",
  "investigation",
  "diagnosis"
];

const rightPanels: PanelKey[] = [
  "medication",
  "vision",
  "advice",
  "followUp",
  "referral"
];

const genderOptions: Array<{ label: string; value: PatientGender }> = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" }
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const occupations = [
  "Service Holder",
  "Business",
  "Student",
  "Teacher",
  "Homemaker",
  "Farmer",
  "Retired",
  "Other"
];

const glassFeatureOptions = ["White", "Anti Reflective", "PhotoSun", "Blue Cut"];
const lensTypeOptions = ["Unifocal", "Bifocal", "Progressive/Verilux"];
const glassPowerStepOptions = Array.from(
  { length: 40 },
  (_, index) => ((index + 1) * 0.25).toFixed(2)
);
const positiveGlassPowerOptions = [
  "Plano",
  ...glassPowerStepOptions.map((value) => `+${value}`)
];
const negativeGlassPowerOptions = [
  "Plano",
  ...glassPowerStepOptions.map((value) => `-${value}`)
];
const glassAxisPickerOptions = ["005", "015", "030", "045", "090", "105", "115", "165", "180"];
const glassVisualAcuityPickerOptions = [
  "6/6",
  "6/9",
  "6/12",
  "6/18",
  "6/24",
  "6/36",
  "6/60",
  "CF 1'",
  "CF 2'",
  "CF 3'",
  "HM 1'",
  "HM 2'",
  "HM 3'",
  "PL",
  "NPL"
];
const glassAddPickerOptions = [
  "+0.75",
  "+1.00",
  "+1.25",
  "+1.50",
  "+1.75",
  "+2.00",
  "+2.25",
  "+2.50",
  "+2.75",
  "+3.00"
];

const historyTabs = [
  "Medical",
  "Investigation",
  "Drug",
  "Surgery",
  "Family",
  "Personal"
] as const;

type HistoryTab = (typeof historyTabs)[number];

type CustomMedicineFormState = {
  medicineType: string;
  brandName: string;
  schedule: string;
  scheduleDoses: string[];
  doseAmount: string;
  mealTiming: string;
  frequency: string;
  customText: string;
  spoon: string;
  unitType: string;
  unit: string;
  quantity: string;
  dropsCount: string;
  dailyFrequency: string;
  continueMedicine: boolean;
  durationValue: string;
  durationUnit: string;
  instructionTags: string[];
  remarks: string;
};

const medicineSearchTypeOptions = ["Trade", "Generic", "Strength"];
const customMedicineTypeOptions = [
  "Tab.",
  "Cap.",
  "Syp.",
  "Inj.",
  "Eye Drop",
  "Eye Gel",
  "Cream",
  "Ointment",
  "Lotion",
  "Nebulizer",
  "Suppository"
];
const customMedicineScheduleOptions = ["None", "1", "2", "3", "4", "5", "6"];
const medicationUnitOptions = [
  "n/a",
  "tablet",
  "capsule",
  "tsp",
  "spoon",
  "apply",
  "take",
  "use",
  "drop",
  "unit",
  "spray",
  "vapour",
  "ml",
  "injection",
  "suspension",
  "suppositor",
  "ointment",
  "lotion",
  "cream",
  "shampoo",
  "gel",
  "scrub",
  "inhaler",
  "sachet"
];
const medicationInstructionChips = [
  "ঘুমানোর আগে",
  "প্রয়োজনে",
  "খাওয়ার পরে",
  "জ্বর হলে",
  "কাশি/শ্বাসকষ্ট হলে",
  "চলবে",
  "৫ দিন",
  "১ মাস",
  "১ ফোঁটা করে দিনে ৪ বার",
  "১ ফোঁটা করে দিনে ৩ বার",
  "১৫ দিন",
  "১ সপ্তাহ",
  "মাথা ব্যাথা হলে",
  "২ চোখে",
  "বাম চোখে",
  "ডান চোখে",
  "খাওয়ার ৩০ মিঃ আগে"
];
const tabletCapsuleDoseOptions = ["None", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const mealTimingOptions = ["Before Meal", "After Meal"];
const syrupSpoonOptions = ["1/2 Spoon", "1 Spoon", "2 Spoon", "3 Spoon", "4 Spoon"];
const injectionUnitOptions = ["Vial", "ML", "CC"];
const eyeDropCountOptions = ["1 Drop", "2 Drops", "3 Drops"];
const customMedicineDurationUnitOptions = ["Day", "Month", "Year"];

const initialCustomMedicineForm: CustomMedicineFormState = {
  medicineType: "Tab.",
  brandName: "",
  schedule: "3",
  scheduleDoses: ["1", "1", "1"],
  doseAmount: "1",
  mealTiming: "After Meal",
  frequency: "1+0+1",
  customText: "",
  spoon: "1 Spoon",
  unitType: "Vial",
  unit: "n/a",
  quantity: "1",
  dropsCount: "1 Drop",
  dailyFrequency: "2",
  continueMedicine: false,
  durationValue: "0",
  durationUnit: "Day",
  instructionTags: [],
  remarks: ""
};

function customMedicineDefaultsForType(
  medicineType: string,
  brandName = ""
): CustomMedicineFormState {
  const base = { ...initialCustomMedicineForm, medicineType, brandName };

  if (medicineType === "Syp.") {
    return { ...base, unit: "spoon", frequency: "3", durationValue: "5" };
  }

  if (medicineType === "Inj.") {
    return { ...base, unit: "injection", frequency: "IM Stat", durationValue: "" };
  }

  if (medicineType === "Eye Drop") {
    return { ...base, unit: "drop", frequency: "4" };
  }

  if (medicineType === "Eye Gel") {
    return { ...base, unit: "gel", dailyFrequency: "2" };
  }

  if (["Cream", "Ointment", "Lotion"].includes(medicineType)) {
    return {
      ...base,
      unit: medicineType.toLowerCase(),
      customText: "Apply",
      frequency: "2 Times Daily"
    };
  }

  if (medicineType === "Nebulizer") {
    return { ...base, unit: "vapour", quantity: "1", frequency: "3 Times Daily" };
  }

  if (medicineType === "Suppository") {
    return { ...base, unit: "suppositor", quantity: "1", frequency: "Once Daily" };
  }

  return base;
}

export function PrescriptionBuilder() {
  const searchParams = useSearchParams();
  const token = useSessionStore((state) => state.accessToken);
  const sessionUser = useSessionStore((state) => state.user);
  const attendAptIdRef = useRef<string | null>(null);
  const queueSerialRef = useRef<number | null>(null);
  const pendingLoadRef = useRef<{ type: "draft"; item: RxDraft } | { type: "template"; item: RxTemplate } | null>(null);
  const forceSelectAfterRegisterRef = useRef(false);
  const clearAfterSaveRef = useRef(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientEditOpen, setPatientEditOpen] = useState(false);
  const [draftPopupOpen, setDraftPopupOpen] = useState(false);
  const [draftPopupName, setDraftPopupName] = useState("");
  const [draftPopupNote, setDraftPopupNote] = useState("");
  const [draftPopupTags, setDraftPopupTags] = useState<string[]>([]);
  const [draftPopupEditId, setDraftPopupEditId] = useState<string | null>(null);
  const [templateNamePopupOpen, setTemplateNamePopupOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [loadConflict, setLoadConflict] = useState<{ type: "draft"; item: RxDraft } | { type: "template"; item: RxTemplate } | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [patientForm, setPatientForm] = useState<PatientFormState>(initialPatientForm);
  const [patientFormError, setPatientFormError] = useState("");
  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicationNote, setMedicationNote] = useState("");
  const [medicines, setMedicines] = useState<RxMedicine[]>([]);
  const [complaints, setComplaints] = useState<ComplaintEntry[]>([]);
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
  const [rxInvestigations, setRxInvestigations] = useState<InvestigationEntry[]>([]);
  const [rxDiagnoses, setRxDiagnoses] = useState<DiagnosisEntry[]>([]);
  const [notes, setNotes] = useState<Record<NoteKey, string>>(initialNotes);
  const [findings, setFindings] = useState<FindingsState>(initialFindings);
  const [vision, setVision] = useState<VisionState>(() => createInitialVision());
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [savedReferralDoctors, setSavedReferralDoctors] = useState<SavedReferralDoctor[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(REFERRAL_DOCTORS_STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as SavedReferralDoctor[]) : [];
    } catch { return []; }
  });
  const [followUpDate, setFollowUpDate] = useState("");
  const [fees, setFees] = useState("");
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [paperType, setPaperType] = useState<"default" | "alternate">("default");
  const [paperMenuOpen, setPaperMenuOpen] = useState(false);
  const [lastSavedPrescription, setLastSavedPrescription] = useState<Prescription | null>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [drafts, setDrafts] = useState<RxDraft[]>(() => loadFromStorage<RxDraft>(DRAFTS_STORAGE_KEY));
  const [templates, setTemplates] = useState<RxTemplate[]>(() => loadFromStorage<RxTemplate>(TEMPLATES_STORAGE_KEY));
  const [queueAppointments, setQueueAppointments] = useState<QueueAppointment[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(APPOINTMENTS_STORAGE_KEY) : null;
      const all: QueueAppointment[] = raw ? JSON.parse(raw) : [];
      return all.filter((a) => a.status === "Confirmed");
    } catch { return []; }
  });
  const [patientNote, setPatientNote] = useState("");
  const [noteEditing, setNoteEditing] = useState(false);
  const [prevRxOpen, setPrevRxOpen] = useState(false);
  const [prevRxPreviewId, setPrevRxPreviewId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    tone: "success" | "warning";
    text: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rawPatientQuery = patientQuery.trim();
  // Short numeric queries are registration IDs — strip leading zeros so "0042" finds patient "00042".
  // Longer numbers (phone numbers are 11 digits in BD) are sent as-is.
  const normalizedPatientQuery = /^\d{1,6}$/.test(rawPatientQuery)
    ? String(parseInt(rawPatientQuery, 10))
    : rawPatientQuery;
  const debouncedPatientQuery = useDebounce(normalizedPatientQuery);
  const debouncedQuery = useDebounce(medicineQuery);
  const debouncedMedicineQuery = debouncedQuery.trim();
  const currentMedicineQuery = medicineQuery.trim();
  const showSearchPanel = currentMedicineQuery.length > 1 && Boolean(token);
  const waitingForDebounce = currentMedicineQuery !== debouncedMedicineQuery;

  const patientSearch = useQuery({
    queryKey: ["patient-search", debouncedPatientQuery, token],
    enabled: patientSearchOpen && rawPatientQuery.length > 1 && Boolean(token),
    queryFn: () => searchPatients(debouncedPatientQuery, token!)
  });

  const patientRxQuery = useQuery({
    queryKey: ["patient-rx", selectedPatient?.id, token],
    enabled: !!selectedPatient?.id && !!token,
    queryFn: () => fetchPatientPrescriptions(selectedPatient!.id, token!),
    staleTime: 60_000,
  });

  const medicineSearch = useQuery({
    queryKey: ["medicine-search", debouncedMedicineQuery, token],
    enabled: debouncedMedicineQuery.length > 1 && Boolean(token),
    queryFn: () =>
      apiFetch<MedicineSearchResult[]>(
        `/medicines/search?q=${encodeURIComponent(debouncedMedicineQuery)}&limit=8`,
        { token }
      )
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors", token],
    enabled: Boolean(token),
    queryFn: () => fetchDoctors(token!)
  });

  const chambersQuery = useQuery({
    queryKey: ["chambers", token],
    enabled: Boolean(token),
    queryFn: () => fetchChambers(token!)
  });

  const searchResults = useMemo(() => {
    if (!showSearchPanel || waitingForDebounce) return [];
    return medicineSearch.data ?? [];
  }, [medicineSearch.data, showSearchPanel, waitingForDebounce]);
  const searchPending = showSearchPanel && (waitingForDebounce || medicineSearch.isFetching);

  const currentDoctor = useMemo(() => {
    const doctors = doctorsQuery.data ?? [];
    return doctors.find((doctor) => doctor.id === sessionUser?.doctorId) ?? doctors[0] ?? null;
  }, [doctorsQuery.data, sessionUser?.doctorId]);

  const currentChamber = useMemo(() => {
    const defaultChamber = currentDoctor?.chambers?.find((item) => item.isDefault)?.chamber;
    return defaultChamber ?? currentDoctor?.chambers?.[0]?.chamber ?? chambersQuery.data?.[0] ?? null;
  }, [chambersQuery.data, currentDoctor]);

  const registerPatient = useMutation({
    mutationFn: (input: CreatePatientInput) => {
      if (!token) throw new Error("Please sign in before registering a patient.");
      return createPatient(input, token);
    },
    onSuccess: (patient) => {
      if (patientForm.createPrescription || forceSelectAfterRegisterRef.current) {
        setSelectedPatient(patient);
      }
      forceSelectAfterRegisterRef.current = false;
      setPatientQuery("");
      setPatientSearchOpen(false);
      setRegistrationOpen(false);
      setPatientForm(initialPatientForm);
      setPatientFormError("");
    }
  });

  const updatePatientMutation = useMutation({
    mutationFn: (input: Partial<CreatePatientInput>) => {
      if (!token) throw new Error("Please sign in.");
      if (!selectedPatient) throw new Error("No patient selected.");
      return updatePatient(selectedPatient.id, input, token);
    },
    onSuccess: (patient) => {
      setSelectedPatient(patient);
      setPatientEditOpen(false);
      setPatientForm(initialPatientForm);
      setPatientFormError("");
      showStatus("success", "Patient updated");
    }
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: ({
      input
    }: {
      input: CreatePrescriptionInput;
      printAfterSave: boolean;
      clearAfterSave: boolean;
    }) => {
      if (!token) throw new Error("Please sign in before saving a prescription.");
      return createPrescription(input, token);
    },
    onSuccess: (prescription, variables) => {
      setLastSavedPrescription(prescription);
      storeLastVisit(prescription.patientId, selectedPatient?.phone);
      completeAttendedAppointment(prescription.id);
      showStatus("success", `Prescription ${prescription.prescriptionNo} saved.`);
      if (variables.printAfterSave) {
        window.setTimeout(() => window.print(), 0);
      }
      if (variables.clearAfterSave) {
        clearPrescriptionPad();
      }
    },
    onError: (error) => {
      showStatus("warning", getApiErrorMessage(error));
    }
  });

  const patientSearchResults = patientSearch.data?.data ?? [];
  const isSavingPrescription = createPrescriptionMutation.isPending;

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setPatientQuery("");
    setPatientSearchOpen(false);
    showStatus("success", `${patient.name} selected`);
  }

  function updatePatientForm(patch: Partial<PatientFormState>) {
    setPatientForm((current) => ({ ...current, ...patch }));
    setPatientFormError("");
  }

  function updateNote(key: NoteKey, value: string) {
    setNotes((current) => ({ ...current, [key]: value }));
  }

  function appendNote(key: NoteKey, value: string) {
    const text = value.trim();
    if (!text) return;

    setNotes((current) => {
      const existing = current[key].trim();
      return {
        ...current,
        [key]: existing ? `${existing}\n${text}` : text
      };
    });
  }

  function handlePatientRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = patientForm.name.trim();
    const mobile = patientForm.mobile.trim();
    const dateOfBirth = parsePatientDate(patientForm.dateOfBirth.trim());
    const ageYears = parseOptionalInteger(patientForm.ageYears);
    const ageMonths = parseOptionalInteger(patientForm.ageMonths);
    const ageDays = parseOptionalInteger(patientForm.ageDays);

    if (!name) {
      setPatientFormError("Patient name is required.");
      return;
    }

    if (!mobile) {
      setPatientFormError("Patient mobile is required.");
      return;
    }

    if (patientForm.dateOfBirth.trim() && !dateOfBirth) {
      setPatientFormError("Use DD/MM/YYYY for date of birth.");
      return;
    }

    if (ageYears === undefined && ageMonths === undefined && ageDays === undefined) {
      setPatientFormError("Enter patient age.");
      return;
    }

    registerPatient.mutate({
      name,
      phone: mobile.startsWith("+88") ? mobile : `+88${mobile}`,
      gender: patientForm.gender,
      dateOfBirth,
      ageYears,
      ageMonths,
      ageDays,
      bloodGroup: patientForm.bloodGroup || undefined
    });
  }

  function openPatientEdit() {
    if (!selectedPatient) return;
    setPatientForm({
      name: selectedPatient.name,
      mobile: selectedPatient.phone?.replace(/^\+88/, "") ?? "",
      gender: selectedPatient.gender,
      dateOfBirth: selectedPatient.dateOfBirth ?? "",
      ageYears: selectedPatient.ageYears?.toString() ?? "",
      ageMonths: selectedPatient.ageMonths?.toString() ?? "",
      ageDays: selectedPatient.ageDays?.toString() ?? "",
      bloodGroup: selectedPatient.bloodGroup ?? "",
      occupation: "",
      createPrescription: false
    });
    setPatientFormError("");
    setPatientEditOpen(true);
  }

  function handlePatientEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = patientForm.name.trim();
    const mobile = patientForm.mobile.trim();
    const dateOfBirth = parsePatientDate(patientForm.dateOfBirth.trim());
    const ageYears = parseOptionalInteger(patientForm.ageYears);
    const ageMonths = parseOptionalInteger(patientForm.ageMonths);
    const ageDays = parseOptionalInteger(patientForm.ageDays);
    if (!name) { setPatientFormError("Patient name is required."); return; }
    if (!mobile) { setPatientFormError("Patient mobile is required."); return; }
    if (patientForm.dateOfBirth.trim() && !dateOfBirth) { setPatientFormError("Use DD/MM/YYYY for date of birth."); return; }
    updatePatientMutation.mutate({
      name,
      phone: mobile.startsWith("+88") ? mobile : `+88${mobile}`,
      gender: patientForm.gender,
      dateOfBirth,
      ageYears,
      ageMonths,
      ageDays,
      bloodGroup: patientForm.bloodGroup || undefined
    });
  }

  function addMedicine(item: MedicineSearchResult) {
    setMedicines((current) => [
      ...current,
      {
        medicineId: item.id.startsWith("demo-") ? undefined : item.id,
        brandName: item.brandName,
        genericName: item.genericName,
        strength: item.strength,
        dosageForm: item.dosageForm,
        dose: "1+0+1",
        duration: "5 Days",
        instruction: "After Meal"
      }
    ]);
    setMedicineQuery("");
    searchInputRef.current?.focus();
  }

  function updateMedicine(index: number, patch: Partial<RxMedicine>) {
    setMedicines((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function addCustomMedicine(medicine: RxMedicine) {
    const brandName = medicine.brandName.trim();
    if (!brandName) return;

    setMedicines((current) => [
      ...current,
      {
        ...medicine,
        brandName,
        genericName: trimOrUndefined(medicine.genericName ?? ""),
        instruction: medicine.instruction.trim(),
        note: trimOrUndefined(medicine.note ?? "")
      }
    ]);
    setMedicineQuery("");
  }

  function updateGlassEye(
    target: "primary" | "secondary",
    side: "right" | "left",
    field: keyof EyePower,
    value: string
  ) {
    setVision((current) => {
      if (target === "primary") {
        return {
          ...current,
          [side]: { ...current[side], [field]: value }
        };
      }

      const secondaryGlass = current.secondaryGlass ?? createInitialGlassPrescription();
      return {
        ...current,
        secondaryGlass: {
          ...secondaryGlass,
          [side]: { ...secondaryGlass[side], [field]: value }
        }
      };
    });
  }

  function updateGlassPrescription(
    target: "primary" | "secondary",
    patch: Partial<Omit<GlassPrescriptionState, "right" | "left">>
  ) {
    setVision((current) => {
      if (target === "primary") {
        return { ...current, ...patch };
      }

      return {
        ...current,
        secondaryGlass: {
          ...(current.secondaryGlass ?? createInitialGlassPrescription()),
          ...patch
        }
      };
    });
  }

  function addSecondaryGlassPrescription() {
    setVision((current) =>
      current.secondaryGlass
        ? current
        : { ...current, secondaryGlass: createInitialGlassPrescription() }
    );
  }

  function removeSecondaryGlassPrescription() {
    setVision((current) => {
      const { secondaryGlass, ...primaryGlass } = current;
      return primaryGlass;
    });
  }

  function updateFindings(patch: Partial<FindingsState>) {
    setFindings((current) => ({ ...current, ...patch }));
  }

  function addSavedDoctor(doc: Omit<SavedReferralDoctor, "id">) {
    const newDoc: SavedReferralDoctor = { ...doc, id: `rd-${Date.now()}` };
    const updated = [...savedReferralDoctors, newDoc];
    setSavedReferralDoctors(updated);
    try { localStorage.setItem(REFERRAL_DOCTORS_STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }

  function updateSavedDoctor(id: string, patch: Partial<Omit<SavedReferralDoctor, "id">>) {
    const updated = savedReferralDoctors.map((d) => d.id === id ? { ...d, ...patch } : d);
    setSavedReferralDoctors(updated);
    try { localStorage.setItem(REFERRAL_DOCTORS_STORAGE_KEY, JSON.stringify(updated)); } catch {}
    const oldDoc = savedReferralDoctors.find((d) => d.id === id);
    if (oldDoc) {
      setReferrals((prev) =>
        prev.map((r) =>
          r.name === oldDoc.name && r.specialty === oldDoc.specialty
            ? { ...r, name: patch.name ?? r.name, specialty: patch.specialty ?? r.specialty, additionalInfo: patch.chamberAddress ?? r.additionalInfo, phone: patch.contact ?? r.phone }
            : r
        )
      );
    }
  }

  function deleteSavedDoctor(id: string) {
    const doc = savedReferralDoctors.find((d) => d.id === id);
    const updated = savedReferralDoctors.filter((d) => d.id !== id);
    setSavedReferralDoctors(updated);
    try { localStorage.setItem(REFERRAL_DOCTORS_STORAGE_KEY, JSON.stringify(updated)); } catch {}
    if (doc) setReferrals((prev) => prev.filter((r) => !(r.name === doc.name && r.specialty === doc.specialty)));
  }

  function toggleReferralDoctor(doc: SavedReferralDoctor) {
    const isSelected = referrals.some((r) => r.name === doc.name && r.specialty === doc.specialty);
    if (isSelected) {
      setReferrals((prev) => prev.filter((r) => !(r.name === doc.name && r.specialty === doc.specialty)));
    } else {
      setReferrals((prev) => [
        ...prev,
        { id: `ref-${Date.now()}`, name: doc.name, phone: doc.contact, specialty: doc.specialty, additionalInfo: doc.chamberAddress, direction: "to" as const }
      ]);
    }
  }

  function clearPanel(panel: PanelKey) {
    if (panel === "medication") {
      setMedicines([]);
      setMedicationNote("");
      setMedicineQuery("");
    } else if (panel === "vision") {
      setVision(createInitialVision());
    } else if (panel === "findings") {
      setFindings(initialFindings);
      updateNote("findings", "");
    } else if (panel === "referral") {
      setReferrals([]);
      updateNote("referral", "");
    } else if (panel === "complaint") {
      setComplaints([]);
      updateNote("complaint", "");
    } else if (panel === "history") {
      setHistories([]);
      updateNote("history", "");
    } else {
      updateNote(panel, "");
      if (panel === "followUp") { setFollowUpDate(""); setFees(""); }
    }
    showStatus("success", `${panelTitles[panel]} cleared`);
  }

  function clearAll() {
    setNotes({
      complaint: "",
      history: "",
      findings: "",
      investigation: "",
      diagnosis: "",
      advice: "",
      followUp: "",
      referral: ""
    });
    setMedicines([]);
    setComplaints([]);
    setHistories([]);
    setMedicationNote("");
    setFindings(initialFindings);
    setVision(createInitialVision());
    setReferrals([]);
    setFollowUpDate("");
    setFees("");
    setRxInvestigations([]);
    setRxDiagnoses([]);
    showStatus("success", "Prescription pad cleared");
  }

  function completeAttendedAppointment(prescriptionId: string) {
    const aptId = attendAptIdRef.current;
    if (!aptId) return;
    attendAptIdRef.current = null;
    try {
      const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (!raw) return;
      const all = JSON.parse(raw) as Array<{ id: string; status: string; prescriptionId?: string }>;
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(
        all.map((a) => a.id === aptId ? { ...a, status: "Completed", prescriptionId } : a)
      ));
    } catch {}
  }

  function attendFromQueue(appt: QueueAppointment) {
    const genderMap: Record<string, PatientGender> = { Male: "MALE", Female: "FEMALE", Other: "OTHER" };
    const mappedGender = genderMap[appt.gender ?? ""] ?? "UNKNOWN";
    const toNum = (v?: string) => { if (!v) return undefined; const n = parseInt(v, 10); return isNaN(n) ? undefined : n; };
    const serial = queueAppointments.findIndex((a) => a.id === appt.id) + 1;
    queueSerialRef.current = serial > 0 ? serial : null;
    forceSelectAfterRegisterRef.current = true;
    attendAptIdRef.current = appt.id;
    setSelectedPatient({
      id: appt.id,
      tenantId: sessionUser?.tenantId ?? "",
      name: appt.patientName,
      phone: appt.phone || null,
      gender: mappedGender,
      dateOfBirth: appt.dateOfBirth || null,
      ageYears: toNum(appt.ageYears) ?? null,
      ageMonths: toNum(appt.ageMonths) ?? null,
      ageDays: toNum(appt.ageDays) ?? null,
      bloodGroup: appt.bloodGroup || null,
    });
    registerPatient.mutate({
      name: appt.patientName,
      phone: appt.phone || undefined,
      gender: mappedGender,
      dateOfBirth: appt.dateOfBirth || undefined,
      ageYears: toNum(appt.ageYears),
      ageMonths: toNum(appt.ageMonths),
      ageDays: toNum(appt.ageDays),
      bloodGroup: appt.bloodGroup || undefined,
    });
  }

  function clearPrescriptionPad() {
    setSelectedPatient(null);
    setPatientQuery("");
    setNotes(initialNotes);
    setMedicines([]);
    setComplaints([]);
    setHistories([]);
    setRxInvestigations([]);
    setRxDiagnoses([]);
    setMedicationNote("");
    setFindings(initialFindings);
    setVision(createInitialVision());
    setReferrals([]);
    setFollowUpDate("");
    setPatientNote("");
    setNoteEditing(false);
    setPrevRxOpen(false);
    setActivePanel(null);
    setDraftPopupOpen(false);
    setDraftPopupName("");
    setDraftPopupNote("");
    setDraftPopupTags([]);
    setDraftPopupEditId(null);
    attendAptIdRef.current = null;
    queueSerialRef.current = null;
  }

  function saveDraft(name: string, note?: string, tags?: string[]) {
    const aptId = attendAptIdRef.current ?? undefined;
    const draft: RxDraft = {
      id: crypto.randomUUID(),
      name: name.trim() || `Draft ${new Date().toLocaleString()}`,
      note: note?.trim() || undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
      appointmentId: aptId,
      serialNo: queueSerialRef.current ?? undefined,
      savedAt: new Date().toISOString(),
      patient: selectedPatient,
      notes,
      medicines,
      medicationNote,
      findings,
      vision,
      referrals,
      followUpDate,
      fees,
      rxInvestigations,
      rxDiagnoses
    };
    const updated = [draft, ...drafts];
    setDrafts(updated);
    saveToStorage(DRAFTS_STORAGE_KEY, updated);
    // Mark the appointment as "Draft" in localStorage so it doesn't reappear in the queue
    if (aptId) {
      try {
        const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
        const all: QueueAppointment[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(
          APPOINTMENTS_STORAGE_KEY,
          JSON.stringify(all.map((a) => a.id === aptId ? { ...a, status: "Draft" } : a))
        );
      } catch {}
    }
    showStatus("success", `Draft "${draft.name}" saved`);
    clearPrescriptionPad();
    // If user chose "Save to Draft & Load", execute the pending load now
    const pending = pendingLoadRef.current;
    pendingLoadRef.current = null;
    if (pending) {
      window.setTimeout(() => {
        if (pending.type === "draft") loadDraft(pending.item);
        else loadTemplate(pending.item);
      }, 50);
    }
  }

  function updateDraft(id: string, patch: Partial<Pick<RxDraft, "name" | "note" | "tags">>) {
    const updated = drafts.map((d) => (d.id === id ? { ...d, ...patch } : d));
    setDrafts(updated);
    saveToStorage(DRAFTS_STORAGE_KEY, updated);
  }

  function openDraftPopup() {
    setDraftPopupName(selectedPatient?.name ?? "");
    setDraftPopupNote("");
    setDraftPopupTags([]);
    setDraftPopupEditId(null);
    setDraftPopupOpen(true);
  }

  function editDraftFromSidebar(draft: RxDraft) {
    setDraftPopupName(draft.name);
    setDraftPopupNote(draft.note ?? "");
    setDraftPopupTags(draft.tags ?? []);
    setDraftPopupEditId(draft.id);
    setDraftDialogOpen(false);
    setDraftPopupOpen(true);
  }

  function handleDraftPopupSave() {
    if (draftPopupEditId) {
      updateDraft(draftPopupEditId, {
        name: draftPopupName.trim() || undefined,
        note: draftPopupNote.trim() || undefined,
        tags: draftPopupTags.length > 0 ? draftPopupTags : undefined
      });
      showStatus("success", "Draft updated");
      setDraftPopupOpen(false);
      setDraftPopupEditId(null);
      setDraftPopupName("");
      setDraftPopupNote("");
      setDraftPopupTags([]);
    } else {
      saveDraft(draftPopupName, draftPopupNote, draftPopupTags);
    }
  }

  function hasPadContent() {
    const notesChanged = Object.entries(notes).some(
      ([key, v]) => v.trim() !== (initialNotes[key as NoteKey] ?? "").trim()
    );
    return Boolean(selectedPatient) || medicines.length > 0 || complaints.length > 0 || histories.length > 0 || rxInvestigations.length > 0 || rxDiagnoses.length > 0 || notesChanged;
  }

  function loadDraft(draft: RxDraft) {
    if (hasPadContent()) {
      setLoadConflict({ type: "draft", item: draft });
      setDraftDialogOpen(false);
      return;
    }
    if (draft.patient) setSelectedPatient(draft.patient);
    setNotes(draft.notes);
    setMedicines(draft.medicines);
    setMedicationNote(draft.medicationNote);
    setFindings(draft.findings);
    setVision(draft.vision);
    setReferrals(draft.referrals);
    setFollowUpDate(draft.followUpDate);
    setFees(draft.fees ?? "");
    setRxInvestigations(draft.rxInvestigations ?? []);
    setRxDiagnoses((draft.rxDiagnoses ?? []).map((d) => ({ ...d, value: d.value ?? "" })));
    attendAptIdRef.current = draft.appointmentId ?? null;
    setDraftDialogOpen(false);
    showStatus("success", `Draft "${draft.name}" loaded`);
  }

  function deleteDraft(id: string) {
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    saveToStorage(DRAFTS_STORAGE_KEY, updated);
  }

  function saveTemplate(name: string) {
    const template: RxTemplate = {
      id: crypto.randomUUID(),
      name: name.trim() || `Template ${new Date().toLocaleString()}`,
      savedAt: new Date().toISOString(),
      notes,
      medicines,
      medicationNote,
      rxInvestigations,
      rxDiagnoses
    };
    const updated = [template, ...templates];
    setTemplates(updated);
    saveToStorage(TEMPLATES_STORAGE_KEY, updated);
    showStatus("success", `Template "${template.name}" saved`);
  }

  function loadTemplate(template: RxTemplate) {
    if (hasPadContent()) {
      setLoadConflict({ type: "template", item: template });
      setTemplateDialogOpen(false);
      return;
    }
    setNotes((prev) => ({ ...prev, ...template.notes }));
    setMedicines(template.medicines);
    setMedicationNote(template.medicationNote);
    setRxInvestigations(template.rxInvestigations ?? []);
    setRxDiagnoses((template.rxDiagnoses ?? []).map((d) => ({ ...d, value: d.value ?? "" })));
    setTemplateDialogOpen(false);
    showStatus("success", `Template "${template.name}" loaded`);
  }

  function deleteTemplate(id: string) {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveToStorage(TEMPLATES_STORAGE_KEY, updated);
  }

  function updateTemplate(id: string, name: string) {
    const updated = templates.map((t) => (t.id === id ? { ...t, name: name.trim() || t.name } : t));
    setTemplates(updated);
    saveToStorage(TEMPLATES_STORAGE_KEY, updated);
  }

  function mergeTemplate(template: RxTemplate) {
    setNotes((prev) => {
      const merged = { ...prev };
      for (const key of Object.keys(template.notes) as (keyof typeof template.notes)[]) {
        if (template.notes[key]) {
          merged[key] = prev[key] ? `${prev[key]}\n${template.notes[key]}` : template.notes[key];
        }
      }
      return merged;
    });
    setMedicines((prev) => {
      const existing = new Set(prev.map((m) => m.brandName.toLowerCase()));
      const newMeds = template.medicines.filter((m) => !existing.has(m.brandName.toLowerCase()));
      return [...prev, ...newMeds];
    });
    if (template.rxInvestigations?.length) {
      setRxInvestigations((prev) => {
        const existing = new Set(prev.map((i) => i.name.toLowerCase()));
        return [...prev, ...template.rxInvestigations.filter((i) => !existing.has(i.name.toLowerCase()))];
      });
    }
    if (template.rxDiagnoses?.length) {
      setRxDiagnoses((prev) => {
        const existing = new Set(prev.map((d) => d.name.toLowerCase()));
        return [...prev, ...template.rxDiagnoses.filter((d) => !existing.has(d.name.toLowerCase())).map((d) => ({ ...d, value: d.value ?? "" }))];
      });
    }
    setTemplateDialogOpen(false);
    showStatus("success", `Template "${template.name}" merged`);
  }

  function buildPrescriptionPayload(chamberId: string, doctorId?: string): CreatePrescriptionInput {
    const examination = buildFindingsText(findings, notes.findings);

    return {
      patientId: selectedPatient!.id,
      doctorId,
      chamberId,
      chiefComplaints: trimOrUndefined(
        complaints.length
          ? complaints
              .map((c) => {
                const parts = [c.name];
                if (c.value) parts.push(c.value);
                if (c.forType === "For" && c.forAmount) parts.push(`for ${c.forAmount} ${c.forUnit}`);
                else if (c.forType === "Since" && c.forAmount) parts.push(`since ${c.forAmount} ${c.forUnit}`);
                else if (c.forType === "On" && c.forDate) parts.push(`on ${c.forDate}`);
                if (c.note) parts.push(`(${c.note})`);
                return parts.join(" ");
              })
              .join("\n")
          : notes.complaint
      ),
      examination: trimOrUndefined(examination),
      diagnoses: rxDiagnoses.length ? rxDiagnoses.map((d) => d.name) : splitTextLines(notes.diagnosis),
      investigations: rxInvestigations.length ? rxInvestigations.map((i) => i.name) : splitTextLines(notes.investigation),
      medicines: medicines.map((item, index) => ({
        medicineId: item.medicineId,
        brandName: item.brandName,
        genericName: trimOrUndefined(item.genericName ?? ""),
        strength: item.strength,
        dosageForm: item.dosageForm,
        dose: item.dose,
        duration: item.duration,
        instruction: trimOrUndefined(item.instruction),
        note: trimOrUndefined(item.note ?? ""),
        sortOrder: index
      })),
      advice: trimOrUndefined(notes.advice),
      followUpDate: followUpDate || undefined,
      metadata: {
        source: "prescription-builder",
        paperType,
        rawSections: {
          history: histories.length
            ? histories.map((h) => {
                const dur = h.duration ? formatHistoryDuration(h.duration) : "";
                return `${h.name}${h.value ? `: ${h.value}` : ""}${dur ? `\n• ${dur}` : ""}${h.note ? `\n  ${h.note}` : ""}`;
              }).join("\n")
            : notes.history,
          findings: notes.findings,
          investigation: notes.investigation,
          diagnosis: notes.diagnosis,
          medicationNote,
          followUp: notes.followUp,
          referral: notes.referral
        },
        findings,
        vision,
        referrals: referrals.filter(referralHasContent)
      }
    };
  }

  function persistPrescription(printAfterSave: boolean) {
    if (!token) {
      showStatus("warning", "Sign in before saving this prescription.");
      return;
    }

    if (!selectedPatient) {
      showStatus("warning", "Select a patient before saving this prescription.");
      return;
    }

    if (registerPatient.isPending) {
      showStatus("warning", "Registering patient, please wait a moment…");
      return;
    }

    if (!currentChamber) {
      showStatus("warning", "No chamber found for this account.");
      return;
    }

    const doctorId = currentDoctor?.id ?? sessionUser?.doctorId;
    if (!doctorId) {
      showStatus("warning", "No doctor profile found for this account.");
      return;
    }

    createPrescriptionMutation.mutate({
      input: buildPrescriptionPayload(currentChamber.id, doctorId),
      printAfterSave,
      clearAfterSave: clearAfterSaveRef.current
    });
    clearAfterSaveRef.current = false;
  }

  function saveAction(action: "save-only" | "save-print" | "save-exit") {
    if (action === "save-exit") {
      clearAfterSaveRef.current = true;
      persistPrescription(false);
      return;
    }
    if (action === "save-only") {
      persistPrescription(false);
      return;
    }
    persistPrescription(true);
  }

  function copyRx() {
    const text = buildPrescriptionText(
      selectedPatient,
      notes,
      medicines,
      medicationNote,
      findings,
      followUpDate,
      vision,
      referrals,
      rxInvestigations,
      rxDiagnoses
    );
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    showStatus("success", "Prescription content copied.");
  }

  function showStatus(tone: "success" | "warning", text: string) {
    setStatusMessage({ tone, text });
    window.setTimeout(() => setStatusMessage(null), 3000);
  }

  function renderPanelBody(panel: PanelKey, mode: "pad" | "dialog" = "pad") {
    const textareaClass = cn(
      "border-0 bg-transparent shadow-none focus-visible:ring-1",
      mode === "dialog" ? "min-h-64" : "min-h-24"
    );

    if (panel === "medication") {
      return (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              className="bg-white pl-9 dark:bg-background"
              placeholder="Search brand or generic"
              value={medicineQuery}
              onChange={(event) => setMedicineQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  event.preventDefault();
                  addMedicine(searchResults[0]);
                }
              }}
            />
            {showSearchPanel ? (
              <div className="absolute z-30 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                {searchPending ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching medicines
                  </div>
                ) : null}

                {!searchPending && medicineSearch.isError ? (
                  <div className="px-3 py-2 text-sm text-destructive">
                    {getApiErrorMessage(medicineSearch.error)}
                  </div>
                ) : null}

                {!searchPending && !medicineSearch.isError && searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No medicines found
                  </div>
                ) : null}

                {!searchPending && !medicineSearch.isError
                  ? searchResults.map((item) => (
                      <button
                        key={item.id}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => addMedicine(item)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item.brandName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.genericName} {item.strength}
                          </span>
                        </span>
                        <Plus className="h-4 w-4 flex-none" />
                      </button>
                    ))
                  : null}
              </div>
            ) : currentMedicineQuery.length > 1 ? (
              <div className="absolute z-30 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Sign in to search medicines
                </div>
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[1.2fr_108px_108px_132px_40px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                <span>Medicine</span>
                <span>Dose</span>
                <span>Duration</span>
                <span>Instruction</span>
                <span />
              </div>
              <div className="space-y-2 pt-2">
                {medicines.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                    No medicine added
                  </div>
                ) : null}
                {medicines.map((item, index) => (
                  <div
                    key={`${item.brandName}-${index}`}
                    className="grid grid-cols-[1.2fr_108px_108px_132px_40px] items-center gap-2"
                  >
                    <div className="min-h-9 rounded-md border bg-background px-3 py-2 text-sm">
                      <div className="font-medium">{formatMedicineTitle(item)}</div>
                      {item.genericName ? (
                        <div className="text-xs text-muted-foreground">{item.genericName}</div>
                      ) : null}
                      {item.note ? (
                        <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
                      ) : null}
                    </div>
                    <Input
                      value={item.dose}
                      list="dose-patterns"
                      onChange={(event) => updateMedicine(index, { dose: event.target.value })}
                    />
                    <Input
                      value={item.duration}
                      onChange={(event) =>
                        updateMedicine(index, { duration: event.target.value })
                      }
                    />
                    <Input
                      value={item.instruction}
                      list="meal-instructions"
                      onChange={(event) =>
                        updateMedicine(index, { instruction: event.target.value })
                      }
                    />
                    <Button
                      aria-label="Remove medicine"
                      title="Remove medicine"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setMedicines((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (panel === "vision") {
      return (
        <div className="space-y-4">
          <GlassPrescriptionForm
            prescription={vision}
            title="Glass Prescription"
            onChange={(patch) => updateGlassPrescription("primary", patch)}
            onEyeChange={(side, field, value) =>
              updateGlassEye("primary", side, field, value)
            }
          />

          {!vision.secondaryGlass ? (
            <Button type="button" variant="outline" onClick={addSecondaryGlassPrescription}>
              <Plus className="h-4 w-4" />
              Add Secondary Glass
            </Button>
          ) : null}

          {vision.secondaryGlass ? (
            <GlassPrescriptionForm
              prescription={vision.secondaryGlass}
              title="Secondary Glass Prescription"
              onChange={(patch) => updateGlassPrescription("secondary", patch)}
              onEyeChange={(side, field, value) =>
                updateGlassEye("secondary", side, field, value)
              }
              onRemove={removeSecondaryGlassPrescription}
              sphereExtraOptions={["Frosted Glass"]}
            />
          ) : null}
        </div>
      );
    }

    if (panel === "followUp") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <Input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
            />
          </div>
          <Textarea
            className={textareaClass}
            placeholder="Follow-up note"
            value={notes.followUp}
            onChange={(event) => updateNote("followUp", event.target.value)}
          />
        </div>
      );
    }

    return (
      <Textarea
        className={textareaClass}
        placeholder={`Type ${panelTitles[panel].toLowerCase()}...`}
        value={notes[panel]}
        onChange={(event) => updateNote(panel, event.target.value)}
      />
    );
  }

  function renderPanelPreview(panel: PanelKey) {
    if (panel === "medication") {
      return medicines.length ? (
        <div className="mt-0.5 max-h-12 overflow-hidden text-xs text-slate-700">
          {medicines.map((item) => item.brandName).join(", ")}
        </div>
      ) : null;
    }

    if (panel === "vision") {
      function renderGlassBlock(p: GlassPrescriptionState) {
        if (!glassPrescriptionHasContent(p)) return null;
        const hasEyeData = (["right", "left"] as const).some(
          (side) => p[side].sphere || p[side].cyl || p[side].axis || p[side].va
        );
        return (
          <div className="space-y-1">
            {hasEyeData && (
              <div className="overflow-hidden rounded border text-[10px]">
                <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr] border-b bg-muted/60 text-center font-semibold text-muted-foreground">
                  <div className="border-r py-0.5" />
                  <div className="border-r py-0.5">Sph</div>
                  <div className="border-r py-0.5">CYL</div>
                  <div className="border-r py-0.5">Axis</div>
                  <div className="py-0.5">VA</div>
                </div>
                {(["right", "left"] as const).map((side) => (
                  <div key={side} className="grid grid-cols-[60px_1fr_1fr_1fr_1fr] border-b last:border-b-0 text-center">
                    <div className="border-r py-0.5 font-semibold text-muted-foreground">
                      {side === "right" ? "Right Eye" : "Left Eye"}
                    </div>
                    {(["sphere", "cyl", "axis", "va"] as const).map((f) => (
                      <div key={f} className="border-r py-0.5 last:border-r-0 text-slate-700">
                        {p[side][f] || <span className="text-muted-foreground/30">—</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {(p.add || p.ipd || p.glassFeatures.length > 0 || p.lensType || p.note) && (
              <div className="space-y-px text-[10px]">
                {(p.add || p.ipd) && (
                  <div className="flex gap-3">
                    {p.add && <div><span className="font-medium text-muted-foreground">Near Add </span><span className="text-slate-700">{p.add} DS</span></div>}
                    {p.ipd && <div><span className="font-medium text-muted-foreground">IPD </span><span className="text-slate-700">{p.ipd} mm</span></div>}
                  </div>
                )}
                {(p.glassFeatures.length > 0 || p.lensType) && (
                  <div>
                    <span className="font-medium text-muted-foreground">Glass Type: </span>
                    <span className="text-slate-700">
                      {[...p.glassFeatures, p.lensType].filter(Boolean).join(" - ")}
                    </span>
                  </div>
                )}
                {p.note && (
                  <div>
                    <span className="font-medium text-muted-foreground">Remarks </span>
                    <span className="text-slate-700">{p.note}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
      const primary = glassPrescriptionHasContent(vision) ? renderGlassBlock(vision) : null;
      const secondary = vision.secondaryGlass ? renderGlassBlock(vision.secondaryGlass) : null;
      return (primary || secondary) ? (
        <div className="mt-1 space-y-2">
          {primary}
          {secondary}
        </div>
      ) : null;
    }

    if (panel === "followUp") {
      const value = [followUpDate, notes.followUp].filter(Boolean).join(" ");
      return value ? <div className="mt-0.5 line-clamp-2 text-xs text-slate-700">{value}</div> : null;
    }

    if (panel === "complaint" && complaints.length > 0) {
      return (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {complaints.map((c) => {
            const dur = c.forType === "For" && c.forAmount
              ? `for ${c.forAmount} ${c.forUnit}${Number(c.forAmount) !== 1 ? "s" : ""}`
              : c.forType === "Since" && c.forAmount
              ? `since ${c.forAmount} ${c.forUnit}${Number(c.forAmount) !== 1 ? "s" : ""}`
              : c.forType === "On" && c.forDate ? `on ${c.forDate}` : "";
            return (
              <span key={c.id} className="group inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs font-semibold text-primary">
                {c.name}
                {dur && <span className="font-normal text-muted-foreground">· {dur}</span>}
                {c.value && <span className="font-normal text-muted-foreground">· {c.value}</span>}
                <button className="no-print ml-0.5 rounded text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 transition-opacity"
                  type="button" title="Delete"
                  onClick={(e) => { e.stopPropagation(); setComplaints((prev) => prev.filter((x) => x.id !== c.id)); }}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      );
    }

    if (panel === "history" && histories.length > 0) {
      const groups = historyTabs
        .map((t) => ({ tab: t, entries: histories.filter((h) => h.tab === t) }))
        .filter((g) => g.entries.length > 0);
      return (
        <div className="mt-1 space-y-1.5 text-foreground">
          {groups.map((group) => (
            <div key={group.tab}>
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.tab}</div>
              <div className="flex flex-wrap gap-1">
                {group.entries.map((h) => {
                  const dur = h.duration ? formatHistoryDuration(h.duration) : "";
                  return (
                    <span key={h.id} className="group inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs font-semibold text-primary">
                      {h.name}
                      {h.value && <span className="font-normal text-muted-foreground">: {h.value}</span>}
                      {dur && <span className="font-normal text-muted-foreground">· {dur}</span>}
                      <button className="no-print ml-0.5 rounded opacity-0 hover:text-destructive group-hover:opacity-100 transition-opacity"
                        type="button" title="Delete"
                        onClick={(e) => { e.stopPropagation(); setHistories((prev) => prev.filter((x) => x.id !== h.id)); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (panel === "findings") {
      const rows: { label: string; value: string; clear: () => void }[] = [
        { label: "Blood Pressure", value: findings.bpSystolic || findings.bpDiastolic ? `${findings.bpSystolic || "-"} / ${findings.bpDiastolic || "-"} mmHg` : "", clear: () => updateFindings({ bpSystolic: "", bpDiastolic: "" }) },
        { label: "Temperature", value: findings.temperature ? `${findings.temperature} °F` : "", clear: () => updateFindings({ temperature: "" }) },
        { label: "Weight", value: findings.weight ? `${findings.weight} kg` : "", clear: () => updateFindings({ weight: "" }) },
        { label: "Height", value: [findings.heightFeet && `${findings.heightFeet} ft`, findings.heightInch && `${findings.heightInch} in`, findings.heightCm && `${findings.heightCm} cm`].filter(Boolean).join(" "), clear: () => updateFindings({ heightFeet: "", heightInch: "", heightCm: "" }) },
        { label: "Pulse", value: findings.pulse ? `${findings.pulse} bpm` : "", clear: () => updateFindings({ pulse: "" }) },
        { label: "SpO2", value: findings.spo2 ? `${findings.spo2}%` : "", clear: () => updateFindings({ spo2: "" }) },
        { label: "RBS", value: findings.rbs ? `${findings.rbs} mmol/l` : "", clear: () => updateFindings({ rbs: "" }) },
        { label: "FBS", value: findings.fbs ? `${findings.fbs} mmol/l` : "", clear: () => updateFindings({ fbs: "" }) },
        { label: "Respiratory Rate", value: findings.respiratoryRate ?? "", clear: () => updateFindings({ respiratoryRate: "" }) },
      ].filter((r) => r.value);

      // Build ophthalmic rows with individual clear buttons
      const ophthalmicRows: { label: string; value: string; clear: () => void }[] = [];
      for (const row of ophthalmicFindingRows) {
        if (row.inputType === "varecord") {
          const r = { sphere: findings.ophthalmicVaRecordRightSphere.trim(), cyl: findings.ophthalmicVaRecordRightCyl.trim(), axis: findings.ophthalmicVaRecordRightAxis.trim(), va: findings.ophthalmicVaRecordRightVa.trim() };
          const l = { sphere: findings.ophthalmicVaRecordLeftSphere.trim(), cyl: findings.ophthalmicVaRecordLeftCyl.trim(), axis: findings.ophthalmicVaRecordLeftAxis.trim(), va: findings.ophthalmicVaRecordLeftVa.trim() };
          const fmt = (e: typeof r) => [e.sphere && `Sph ${e.sphere}`, e.cyl && `CYL ${e.cyl}`, e.axis && `Axis ${e.axis}`, e.va && `VA ${e.va}`].filter(Boolean).join(" / ");
          const rt = fmt(r); const lt = fmt(l);
          if (rt || lt) ophthalmicRows.push({ label: row.label, value: [rt && `RE: ${rt}`, lt && `LE: ${lt}`].filter(Boolean).join(", "), clear: () => updateFindings({ ophthalmicVaRecordRightSphere: "", ophthalmicVaRecordRightCyl: "", ophthalmicVaRecordRightAxis: "", ophthalmicVaRecordRightVa: "", ophthalmicVaRecordLeftSphere: "", ophthalmicVaRecordLeftCyl: "", ophthalmicVaRecordLeftAxis: "", ophthalmicVaRecordLeftVa: "" }) });
          continue;
        }
        if (row.inputType === "checkbox") {
          const rc = String(findings[row.rightKey] ?? "") === "yes";
          const lc = String(findings[row.leftKey] ?? "") === "yes";
          if (rc || lc) ophthalmicRows.push({ label: row.label, value: rc && lc ? "BE" : rc ? "RE" : "LE", clear: () => updateFindings({ [row.rightKey]: "", [row.leftKey]: "" } as Partial<FindingsState>) });
          continue;
        }
        const rv = String(findings[row.rightKey] ?? "").trim();
        const lv = String(findings[row.leftKey] ?? "").trim();
        const rn = row.rightNoteKey ? String(findings[row.rightNoteKey] ?? "").trim() : "";
        const ln = row.leftNoteKey ? String(findings[row.leftNoteKey] ?? "").trim() : "";
        const rph = row.rightWithPhKey ? String(findings[row.rightWithPhKey] ?? "").trim() : "";
        const lph = row.leftWithPhKey ? String(findings[row.leftWithPhKey] ?? "").trim() : "";
        const rpgp = row.rightWithPgpKey ? String(findings[row.rightWithPgpKey] ?? "").trim() : "";
        const lpgp = row.leftWithPgpKey ? String(findings[row.leftWithPgpKey] ?? "").trim() : "";
        const unit = row.unit ? ` ${row.unit}` : "";
        const hasPhField = Boolean(row.rightWithPhKey);
        const rtMain = hasPhField ? [rv && `Unaided ${rv}`, rph && `With PH ${rph}`, rpgp && `W/PGP ${rpgp}`].filter(Boolean).join(" : ") : rv ? `${rv}${unit}` : "";
        const ltMain = hasPhField ? [lv && `Unaided ${lv}`, lph && `With PH ${lph}`, lpgp && `W/PGP ${lpgp}`].filter(Boolean).join(" : ") : lv ? `${lv}${unit}` : "";
        const rtRaw = [rtMain, rn].filter(Boolean).join(" : ");
        const ltRaw = [ltMain, ln].filter(Boolean).join(" : ");
        const rt = row.unit && rtRaw && !rtMain ? `${rtRaw}${unit}` : rtRaw;
        const lt = row.unit && ltRaw && !ltMain ? `${ltRaw}${unit}` : ltRaw;
        if (rt || lt) {
          ophthalmicRows.push({
            label: row.label,
            value: [rt && `RE: ${rt}`, lt && `LE: ${lt}`].filter(Boolean).join(", "),
            clear: () => {
              const patch: Partial<FindingsState> = { [row.rightKey]: "", [row.leftKey]: "" };
              if (row.rightNoteKey) patch[row.rightNoteKey as keyof FindingsState] = "" as never;
              if (row.leftNoteKey) patch[row.leftNoteKey as keyof FindingsState] = "" as never;
              if (row.rightWithPhKey) patch[row.rightWithPhKey as keyof FindingsState] = "" as never;
              if (row.leftWithPhKey) patch[row.leftWithPhKey as keyof FindingsState] = "" as never;
              if (row.rightWithPgpKey) patch[row.rightWithPgpKey as keyof FindingsState] = "" as never;
              if (row.leftWithPgpKey) patch[row.leftWithPgpKey as keyof FindingsState] = "" as never;
              updateFindings(patch);
            }
          });
        }
      }

      const allRows = [...rows, ...ophthalmicRows];
      if (!allRows.length) return null;
      return (
        <div className="mt-0.5 space-y-0 text-sm text-foreground">
          {allRows.map((r) => (
            <div key={r.label} className="group flex w-full items-center gap-1">
              <span className="font-bold whitespace-nowrap">{r.label}:</span>
              <span className="text-muted-foreground whitespace-nowrap">{r.value}</span>
              <span className="flex-1 border-b border-dotted border-muted-foreground/30 mb-0.5 min-w-[12px]" />
              <button
                className="no-print shrink-0 rounded p-1 font-bold text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 transition-opacity"
                title="Clear"
                type="button"
                onClick={(e) => { e.stopPropagation(); r.clear(); }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          ))}
        </div>
      );
    }

    if (panel === "investigation" && rxInvestigations.length > 0) {
      return (
        <ol className="mt-1 space-y-0.5 pl-0">
          {rxInvestigations.map((inv, idx) => (
            <li key={inv.id} className="group flex items-center gap-1 text-xs text-foreground">
              <span className="shrink-0 font-semibold text-primary">{idx + 1}.</span>
              <span className="font-medium">{inv.name}</span>
              {inv.value && <span className="text-muted-foreground">: {inv.value}</span>}
              <button className="no-print ml-auto rounded opacity-0 hover:text-destructive group-hover:opacity-100 transition-opacity"
                type="button" title="Delete"
                onClick={(e) => { e.stopPropagation(); setRxInvestigations((prev) => prev.filter((x) => x.id !== inv.id)); }}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ol>
      );
    }

    if (panel === "diagnosis" && rxDiagnoses.length > 0) {
      return (
        <ol className="mt-1 space-y-0.5 pl-0">
          {rxDiagnoses.map((d, idx) => (
            <li key={d.id} className="group flex items-center gap-1 text-xs text-foreground">
              <span className="shrink-0 font-semibold text-primary">{idx + 1}.</span>
              <span className="font-medium">{d.name}</span>
              {d.value && <span className="text-muted-foreground">: {d.value}</span>}
              <button className="no-print ml-auto rounded opacity-0 hover:text-destructive group-hover:opacity-100 transition-opacity"
                type="button" title="Delete"
                onClick={(e) => { e.stopPropagation(); setRxDiagnoses((prev) => prev.filter((x) => x.id !== d.id)); }}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ol>
      );
    }

    const value = notes[panel];
    return value ? (
      <div className="mt-0.5 whitespace-pre-line text-xs leading-4 text-slate-700">
        {value}
      </div>
    ) : null;
  }

  function panelHasContent(panel: PanelKey) {
    if (panel === "medication") return medicines.length > 0 || Boolean(medicationNote.trim());

    if (panel === "findings") {
      return findingsHasContent(findings) || Boolean(notes.findings.trim());
    }

    if (panel === "vision") {
      return glassPrescriptionHasContent(vision)
        || (vision.secondaryGlass ? glassPrescriptionHasContent(vision.secondaryGlass) : false);
    }

    if (panel === "followUp") {
      return Boolean(followUpDate || notes.followUp.trim());
    }

    if (panel === "referral") {
      return referrals.some(referralHasContent) || Boolean(notes.referral.trim());
    }

    if (panel === "complaint") return complaints.length > 0 || Boolean(notes.complaint.trim());
    if (panel === "history") return histories.length > 0 || Boolean(notes.history.trim());
    if (panel === "investigation") return rxInvestigations.length > 0 || Boolean(notes.investigation.trim());
    if (panel === "diagnosis") return rxDiagnoses.length > 0 || Boolean(notes.diagnosis.trim());

    return Boolean(notes[panel].trim());
  }

  // On every mount: clear the pad first, then — if arriving via "Attend" — immediately
  // load that patient. Both happen in the same effect so the final setSelectedPatient
  // (the patient) always overwrites the null from clearPrescriptionPad().
  useEffect(() => {
    clearPrescriptionPad();

    // Prefer the URL param; fall back to the localStorage relay written by attendAppointment()
    const aptId =
      searchParams.get("attend") ??
      (typeof window !== "undefined" ? localStorage.getItem("rx-attend-apt") : null);

    if (!aptId) return;
    if (typeof window !== "undefined") localStorage.removeItem("rx-attend-apt");

    try {
      const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (!raw) return;
      const all = JSON.parse(raw) as Array<{
        id: string; patientName: string; phone: string;
        gender: string; dateOfBirth: string;
        ageYears: string; ageMonths: string; ageDays: string; bloodGroup: string;
      }>;

      const apt = all.find((a) => a.id === aptId);
      if (!apt) return;

      const genderMap: Record<string, PatientGender> = { Male: "MALE", Female: "FEMALE", Other: "OTHER" };
      const mappedGender = genderMap[apt.gender] ?? "UNKNOWN";
      const toInt = (v: string) => { const n = parseInt(v, 10); return isNaN(n) ? undefined : n; };

      forceSelectAfterRegisterRef.current = true;
      attendAptIdRef.current = apt.id;

      // Load patient into the bar immediately from local data
      setSelectedPatient({
        id: apt.id,
        tenantId: sessionUser?.tenantId ?? "",
        name: apt.patientName,
        phone: apt.phone || null,
        gender: mappedGender,
        dateOfBirth: apt.dateOfBirth || null,
        ageYears: toInt(apt.ageYears) ?? null,
        ageMonths: toInt(apt.ageMonths) ?? null,
        ageDays: toInt(apt.ageDays) ?? null,
        bloodGroup: apt.bloodGroup || null,
      });

      // Register in the backend in the background; onSuccess replaces the local patient with the real one
      registerPatient.mutate({
        name: apt.patientName,
        phone: apt.phone || undefined,
        gender: mappedGender,
        dateOfBirth: apt.dateOfBirth || undefined,
        ageYears: toInt(apt.ageYears),
        ageMonths: toInt(apt.ageMonths),
        ageDays: toInt(apt.ageDays),
        bloodGroup: apt.bloodGroup || undefined,
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function loadQueue() {
      try {
        const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
        const all: QueueAppointment[] = raw ? JSON.parse(raw) : [];
        const confirmed = all
          .filter((a) => a.status === "Confirmed")
          .sort((a, b) => {
            const toMin = (t: string) => {
              const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
              if (!m) return 0;
              let h = parseInt(m[1], 10);
              const min = parseInt(m[2], 10);
              if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
              if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
              return h * 60 + min;
            };
            return toMin(a.time) - toMin(b.time);
          });
        setQueueAppointments(confirmed);
      } catch {}
    }
    loadQueue();
    window.addEventListener("storage", loadQueue);
    return () => window.removeEventListener("storage", loadQueue);
  }, []);

  useEffect(() => {
    setNoteEditing(false);
    setPrevRxOpen(false);
    setPrevRxPreviewId(null);
    if (!selectedPatient) { setPatientNote(""); return; }
    try {
      const stored = JSON.parse(localStorage.getItem(PATIENT_NOTES_STORAGE_KEY) ?? "{}") as Record<string, string>;
      setPatientNote(stored[selectedPatient.id] ?? "");
    } catch { setPatientNote(""); }
  }, [selectedPatient]);

  function savePatientNote(note: string) {
    setPatientNote(note);
    if (!selectedPatient) return;
    try {
      const stored = JSON.parse(localStorage.getItem(PATIENT_NOTES_STORAGE_KEY) ?? "{}") as Record<string, string>;
      stored[selectedPatient.id] = note;
      localStorage.setItem(PATIENT_NOTES_STORAGE_KEY, JSON.stringify(stored));
    } catch {}
  }

  return (
    <>
      <div className="flex h-[calc(100vh-40px)] -mt-2 -mb-3 flex-col lg:-ml-[38px]">
        <div className="flex flex-1 min-h-0 gap-[5px]">

        {/* Left sidebar: Patient Queue only */}
        <div className="no-print hidden lg:flex w-[200px] xl:w-[230px] shrink-0 self-start flex-col gap-3 overflow-y-auto py-[5px]">

          {/* Patient Queue */}
          <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Patient Queue</span>
              {queueAppointments.length > 0 && (
                <span className="ml-auto text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {queueAppointments.length}
                </span>
              )}
            </div>
            {queueAppointments.length > 0 ? (
              <div className="divide-y max-h-72 overflow-y-auto">
                {queueAppointments.map((appt, idx) => {
                  const age = [
                    appt.ageYears ? `${appt.ageYears}Y` : null,
                    appt.ageMonths ? `${appt.ageMonths}M` : null,
                  ].filter(Boolean).join(" ");
                  const lastVisit = getLastVisit(null, appt.phone);
                  return (
                    <div key={appt.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 transition-colors">
                      <span className="w-5 shrink-0 text-center text-[10px] font-bold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-semibold leading-tight">{appt.patientName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {[age, lastVisit ? formatTimeAgo(lastVisit) : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        onClick={() => attendFromQueue(appt)}
                      >
                        <UserCheck className="h-3 w-3" />
                        Attend
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs font-semibold text-muted-foreground">No appointment today</p>
              </div>
            )}
          </div>
        </div>

        {/* Main prescription content */}
        <div className="flex flex-1 min-h-0 min-w-0 flex-col">

        <section className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-md border bg-card shadow-soft">
          <div className="shrink-0 border-b bg-primary/5 px-3 py-2">
            {selectedPatient ? (
              /* ── Patient selected: highlighted info bar ── */
              <div className="space-y-2">
                {/* Main row */}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex-1 min-w-0 text-sm font-bold leading-snug text-foreground">
                    {selectedPatient.name}
                    {selectedPatient.registrationNo && (
                      <span className="ml-1.5 font-semibold text-primary">#{selectedPatient.registrationNo}</span>
                    )}
                    <span className="ml-1.5 font-medium text-muted-foreground">
                      ({formatPatientAge(selectedPatient)},{" "}
                      {selectedPatient.gender
                        ? selectedPatient.gender.charAt(0).toUpperCase() + selectedPatient.gender.slice(1).toLowerCase()
                        : "Unknown"}
                      {selectedPatient.phone ? `, ${selectedPatient.phone}` : ""})
                    </span>
                    {(() => {
                      const lv =
                        (patientRxQuery.data && patientRxQuery.data.length > 0
                          ? patientRxQuery.data[0]?.createdAt
                          : null) ??
                        getLastVisit(selectedPatient.id, selectedPatient.phone);
                      return lv ? (
                        <span className="ml-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                          · {formatTimeAgo(lv)}
                        </span>
                      ) : null;
                    })()}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Add Note — transforms into textbox on click */}
                    {noteEditing ? (
                      <textarea
                        autoFocus
                        rows={1}
                        className="h-8 w-44 resize-none rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Add note…"
                        value={patientNote}
                        onChange={(e) => {
                          const { selectionStart, selectionEnd } = e.target;
                          const transformed = toTitleCase(e.target.value);
                          e.target.value = transformed;
                          const el = e.target;
                          requestAnimationFrame(() => {
                            try { el.setSelectionRange(selectionStart, selectionEnd); } catch {}
                          });
                          savePatientNote(transformed);
                        }}
                        onBlur={() => setNoteEditing(false)}
                      />
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant={patientNote ? "secondary" : "outline"}
                        className="h-8 max-w-[11rem] gap-1.5"
                        onClick={() => setNoteEditing(true)}
                      >
                        {patientNote ? <Pencil className="h-3.5 w-3.5 shrink-0" /> : <Plus className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{patientNote || "Add Note"}</span>
                      </Button>
                    )}
                    {/* Previous Prescriptions */}
                    <Button
                      type="button"
                      size="sm"
                      variant={prevRxOpen ? "secondary" : "outline"}
                      className="h-8 gap-1.5"
                      onClick={() => setPrevRxOpen((o) => !o)}
                    >
                      <History className="h-3.5 w-3.5" />
                      Prev. Rx
                      {patientRxQuery.isSuccess && (patientRxQuery.data?.length ?? 0) > 0 && (
                        <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {patientRxQuery.data!.length}
                        </span>
                      )}
                    </Button>
                    {/* Edit Patient */}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 gap-1.5 font-semibold"
                      onClick={openPatientEdit}
                    >
                      <UserCog className="h-4 w-4" />
                      Edit Patient
                    </Button>
                    {/* Patient Search */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={openDraftPopup}
                    >
                      <Search className="h-3.5 w-3.5" />
                      Patient Search
                    </Button>
                    {/* Remove */}
                    <button
                      type="button"
                      title="Remove patient"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                      onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Previous Prescriptions list */}
                {prevRxOpen && (
                  <div className="overflow-hidden rounded-md border bg-background">
                    {patientRxQuery.isFetching ? (
                      <div className="flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading…
                      </div>
                    ) : !patientRxQuery.data?.length ? (
                      <p className="py-3 text-center text-xs text-muted-foreground">No previous prescriptions</p>
                    ) : (
                      <div className="divide-y max-h-48 overflow-y-auto">
                        {patientRxQuery.data.map((rx) => (
                          <div key={rx.id} className="flex items-center gap-2 px-2 py-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{rx.prescriptionNo}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {rx.createdAt ? formatTimeAgo(rx.createdAt) : `${rx.medicines?.length ?? 0} med${rx.medicines?.length !== 1 ? "s" : ""}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium transition-colors hover:bg-muted/60"
                              onClick={() => setPrevRxPreviewId(rx.id)}
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ── No patient: search + register ── */
              <div className="flex gap-2 items-start">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Patient Search"
                    value={patientQuery}
                    onChange={(event) => {
                      setPatientQuery(event.target.value);
                      setPatientSearchOpen(true);
                    }}
                    onFocus={() => setPatientSearchOpen(true)}
                  />
                  {patientSearchOpen && patientQuery.trim().length > 1 ? (
                    <div className="absolute z-40 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                      {patientSearch.isFetching ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching patients
                        </div>
                      ) : null}
                      {!patientSearch.isFetching && patientSearch.isError ? (
                        <div className="px-3 py-2 text-sm text-destructive">
                          {getApiErrorMessage(patientSearch.error)}
                        </div>
                      ) : null}
                      {!patientSearch.isFetching && !patientSearch.isError && patientSearchResults.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No patient found</div>
                      ) : null}
                      {!patientSearch.isFetching && !patientSearch.isError
                        ? patientSearchResults.map((patient) => {
                            const lv = getLastVisit(patient.id, patient.phone);
                            return (
                              <button
                                key={patient.id}
                                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => selectPatient(patient)}
                                type="button"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">{patient.name}</span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {patient.phone ?? patient.registrationNo}
                                    {lv && <span className="ml-1 text-amber-600 dark:text-amber-400">· {formatTimeAgo(lv)}</span>}
                                  </span>
                                </span>
                                <Check className="h-4 w-4 flex-none" />
                              </button>
                            );
                          })
                        : null}
                    </div>
                  ) : null}
                </div>
                <Button type="button" className="shrink-0" onClick={() => setRegistrationOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Register New Patient
                </Button>
              </div>
            )}
          </div>

          {statusMessage ? (
            <div
              className={cn(
                "shrink-0 border-b px-4 py-2 text-sm",
                statusMessage.tone === "warning"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary"
              )}
            >
              {statusMessage.text}
            </div>
          ) : null}

          <div
            className="flex-1 relative p-4 min-h-0 flex flex-col overflow-y-auto"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "22px 22px"
            }}
          >
            <div className="no-print absolute right-6 top-6 hidden w-11 flex-col overflow-hidden rounded-md border bg-card shadow-soft md:flex">
              <FloatingPadButton title="All Draft" onClick={() => setDraftDialogOpen(true)}>
                <FileText className="h-4 w-4" />
              </FloatingPadButton>
              <FloatingPadButton title="All Templates" onClick={() => setTemplateDialogOpen(true)}>
                <LayoutGrid className="h-4 w-4" />
              </FloatingPadButton>
              <FloatingPadButton title="Clear All" onClick={clearAll}>
                <Eraser className="h-4 w-4" />
              </FloatingPadButton>
            </div>

            <div
              className={cn(
                "grid gap-4 md:pl-16 min-h-full",
                leftPanelCollapsed
                  ? "md:grid-cols-[64px_minmax(0,1fr)]"
                  : "md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:pr-16"
              )}
            >
              <div className={cn("flex flex-col h-full md:border-r", leftPanelCollapsed ? "md:pr-2" : "md:pr-4")}>

                {leftPanelCollapsed ? (
                  <div className="grid grid-cols-5 gap-1 md:grid-cols-1">
                    {leftPanels.map((panel) => (
                      <CollapsedPanelButton
                        key={panel}
                        panel={panel}
                        title={panelTitles[panel]}
                        hasContent={panelHasContent(panel)}
                        onOpen={() => setActivePanel(panel)}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    {leftPanels.map((panel) => (
                      <PrescriptionOptionTile
                        key={panel}
                        className="md:flex-1"
                        title={panelTitles[panel]}
                        hasContent={panelHasContent(panel)}
                        preview={renderPanelPreview(panel)}
                        onClear={() => clearPanel(panel)}
                        onOpen={() => setActivePanel(panel)}
                      />
                    ))}
                    {fees && (
                      <div className="shrink-0 border-t px-3 pb-2 pt-3 text-sm text-slate-600">{fees}</div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col h-full">
                {rightPanels.map((panel) => (
                  <PrescriptionOptionTile
                    key={panel}
                    className="md:flex-1"
                    title={panelTitles[panel]}
                    hasContent={panelHasContent(panel)}
                    preview={renderPanelPreview(panel)}
                    onClear={() => clearPanel(panel)}
                    onOpen={() => setActivePanel(panel)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <datalist id="dose-patterns">
          {DOSE_PATTERNS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="meal-instructions">
          {MEAL_INSTRUCTIONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>{/* end flex-1 main content */}
        </div>{/* end inner row */}
        <nav className="no-print shrink-0 z-30 border-t bg-background/95 px-4 py-2 shadow-soft backdrop-blur">
          <div className="flex flex-wrap justify-end gap-2 md:flex-row md:items-center">
            <Button variant="outline" onClick={() => showStatus("success", "Settings option selected.")}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" onClick={openDraftPopup}>
              <FileText className="h-4 w-4" />
              Add to Draft
            </Button>
            <Button variant="outline" onClick={() => { setTemplateNameInput(""); setTemplateNamePopupOpen(true); }}>
              <LayoutGrid className="h-4 w-4" />
              Make Template
            </Button>
            <Button
              variant="outline"
              disabled={isSavingPrescription}
              onClick={() => saveAction("save-exit")}
            >
              <LogOut className="h-4 w-4" />
              Save & Exit
            </Button>
            <div className="relative flex">
              <Button
                className="rounded-r-none"
                disabled={isSavingPrescription}
                onClick={() => saveAction("save-print")}
              >
                {isSavingPrescription ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Save & Print
              </Button>
              <Button
                aria-label="Save print options"
                title="Save print options"
                className="rounded-l-none border-l border-primary-foreground/30 px-2"
                disabled={isSavingPrescription}
                onClick={() => setPaperMenuOpen((current) => !current)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>

              {paperMenuOpen ? (
                <div className="absolute bottom-full right-0 mb-2 w-56 rounded-md border bg-card p-2 shadow-soft">
                  <button
                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    disabled={isSavingPrescription}
                    type="button"
                    onClick={() => {
                      saveAction("save-only");
                      setPaperMenuOpen(false);
                    }}
                  >
                    Save Only
                  </button>
                  <div className="my-1 border-t" />
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                    <input
                      checked={paperType === "default"}
                      className="accent-primary"
                      name="paperType"
                      type="radio"
                      onChange={() => setPaperType("default")}
                    />
                    Default Paper
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                    <input
                      checked={paperType === "alternate"}
                      className="accent-primary"
                      name="paperType"
                      type="radio"
                      onChange={() => setPaperType("alternate")}
                    />
                    Alternate Paper
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </nav>
      </div>{/* end outer flex-col */}

      {activePanel === "complaint" ? (
        <ComplaintSidebar
          complaints={complaints}
          onClose={() => setActivePanel(null)}
          onSetComplaints={setComplaints}
        />
      ) : activePanel === "history" ? (
        <HistorySidebar
          histories={histories}
          onClose={() => setActivePanel(null)}
          onSetHistories={setHistories}
        />
      ) : activePanel === "findings" ? (
        <FindingsSidebar
          findings={findings}
          note={notes.findings}
          onChange={updateFindings}
          onClear={() => clearPanel("findings")}
          onClose={() => setActivePanel(null)}
          onNoteChange={(value) => updateNote("findings", value)}
        />
      ) : activePanel === "medication" ? (
        <MedicationSidebar
          medicines={medicines}
          query={medicineQuery}
          searchPending={searchPending}
          searchResults={searchResults}
          showSearchPanel={showSearchPanel}
          value={medicationNote}
          waitingForDebounce={waitingForDebounce}
          onAddMedicine={addMedicine}
          onAddCustomMedicine={addCustomMedicine}
          onChange={setMedicationNote}
          onClear={() => clearPanel("medication")}
          onClose={() => setActivePanel(null)}
          onQueryChange={setMedicineQuery}
          onStatus={showStatus}
        />
      ) : activePanel === "advice" ? (
        <AdviceSidebar
          value={notes.advice}
          onChange={(value) => updateNote("advice", value)}
          onClear={() => clearPanel("advice")}
          onClose={() => setActivePanel(null)}
          onStatus={showStatus}
        />
      ) : activePanel === "investigation" ? (
        <InvestigationSidebar
          investigations={rxInvestigations}
          onClose={() => setActivePanel(null)}
          onSetInvestigations={setRxInvestigations}
        />
      ) : activePanel === "diagnosis" ? (
        <DiagnosisSidebar
          diagnoses={rxDiagnoses}
          onClose={() => setActivePanel(null)}
          onSetDiagnoses={setRxDiagnoses}
        />
      ) : activePanel === "followUp" ? (
        <FollowUpSidebar
          date={followUpDate}
          note={notes.followUp}
          fees={fees}
          onClose={() => setActivePanel(null)}
          onDateChange={setFollowUpDate}
          onNoteChange={(value) => updateNote("followUp", value)}
          onFeesChange={setFees}
        />
      ) : activePanel === "referral" ? (
        <ReferralSidebar
          referrals={referrals}
          savedDoctors={savedReferralDoctors}
          onClose={() => setActivePanel(null)}
          onAddDoctor={addSavedDoctor}
          onUpdateDoctor={updateSavedDoctor}
          onDeleteDoctor={deleteSavedDoctor}
          onToggleDoctor={toggleReferralDoctor}
        />
      ) : activePanel === "vision" ? (
        <VisionSidebar
          vision={vision}
          onClose={() => setActivePanel(null)}
          onPrimaryChange={(patch) => updateGlassPrescription("primary", patch)}
          onPrimaryEyeChange={(side, field, value) => updateGlassEye("primary", side, field, value)}
          onSecondaryChange={(patch) => updateGlassPrescription("secondary", patch)}
          onSecondaryEyeChange={(side, field, value) => updateGlassEye("secondary", side, field, value)}
          onAddSecondary={addSecondaryGlassPrescription}
          onRemoveSecondary={removeSecondaryGlassPrescription}
        />
      ) : activePanel ? (
        <PanelDialog
          size="default"
          title={panelTitles[activePanel]}
          onClose={() => setActivePanel(null)}
        >
          {renderPanelBody(activePanel, "dialog")}
        </PanelDialog>
      ) : null}

      {draftDialogOpen ? (
        <DraftSidebar
          drafts={drafts}
          onClose={() => setDraftDialogOpen(false)}
          onDelete={deleteDraft}
          onEdit={editDraftFromSidebar}
          onLoad={loadDraft}
          onUpdate={updateDraft}
        />
      ) : null}

      {templateDialogOpen ? (
        <TemplateSidebar
          templates={templates}
          onClose={() => setTemplateDialogOpen(false)}
          onDelete={deleteTemplate}
          onLoad={loadTemplate}
          onMerge={mergeTemplate}
          onUpdate={updateTemplate}
        />
      ) : null}

      {registrationOpen ? (
        <PatientRegistrationDialog
          asSidebar
          error={patientFormError || (registerPatient.isError ? getApiErrorMessage(registerPatient.error) : "")}
          form={patientForm}
          isSaving={registerPatient.isPending}
          onClose={() => setRegistrationOpen(false)}
          onSubmit={handlePatientRegistration}
          onUpdate={updatePatientForm}
        />
      ) : null}

      {draftPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-base font-semibold">
                {draftPopupEditId ? "Edit Draft" : "Save to Draft"}
              </h2>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                onClick={() => { setDraftPopupOpen(false); setDraftPopupEditId(null); }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              {/* Non-editable patient name */}
              {(selectedPatient || draftPopupEditId) && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">Patient:</span>
                  <span className="text-sm font-semibold truncate">
                    {selectedPatient?.name ?? drafts.find(d => d.id === draftPopupEditId)?.patient?.name ?? "—"}
                  </span>
                </div>
              )}
              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  placeholder="Add notes about this draft…"
                  rows={2}
                  value={draftPopupNote}
                  onChange={(e) => setDraftPopupNote(e.target.value)}
                />
              </div>
              {/* Multi-select tags */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {["Dilate", "IOP", "SPT", "BP", "RBS", "Refraction"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        draftPopupTags.includes(tag)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
                      )}
                      onClick={() =>
                        setDraftPopupTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" type="button" onClick={() => { setDraftPopupOpen(false); setDraftPopupEditId(null); }}>Cancel</button>
              <Button type="button" onClick={handleDraftPopupSave}>
                <FileText className="h-4 w-4" />
                {draftPopupEditId ? "Update Draft" : "Save to Draft"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loadConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-base font-semibold text-destructive">Prescription Already Loaded</h2>
              <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                onClick={() => setLoadConflict(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-muted-foreground">
              A prescription is already loaded
              {selectedPatient && <span className="font-semibold text-foreground"> for {selectedPatient.name}</span>}.
              Save it to draft before loading another?
            </div>
            <div className="flex flex-col gap-2 border-t px-5 py-3">
              <Button type="button" className="w-full" onClick={() => {
                pendingLoadRef.current = loadConflict;
                setLoadConflict(null);
                openDraftPopup();
              }}>
                <FileText className="h-4 w-4" />
                Save to Draft &amp; Load
              </Button>
              <Button type="button" variant="outline" className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => {
                  const pending = loadConflict;
                  setLoadConflict(null);
                  clearPrescriptionPad();
                  window.setTimeout(() => {
                    if (pending.type === "draft") loadDraft(pending.item);
                    else loadTemplate(pending.item);
                  }, 50);
                }}>
                Discard &amp; Load
              </Button>
              <button className="w-full rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" type="button" onClick={() => setLoadConflict(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {templateNamePopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-base font-semibold">Save as Template</h2>
              <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                onClick={() => setTemplateNamePopupOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                autoFocus
                className="mt-1.5"
                placeholder="e.g. Cataract Post-op, Glaucoma…"
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { saveTemplate(templateNameInput); setTemplateNamePopupOpen(false); } }}
              />
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" type="button" onClick={() => setTemplateNamePopupOpen(false)}>Cancel</button>
              <Button type="button" onClick={() => { saveTemplate(templateNameInput); setTemplateNamePopupOpen(false); }}>
                <LayoutGrid className="h-4 w-4" />
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {patientEditOpen ? (
        <PatientRegistrationDialog
          title="Edit Patient"
          submitLabel="Save Changes"
          error={patientFormError || (updatePatientMutation.isError ? getApiErrorMessage(updatePatientMutation.error) : "")}
          form={patientForm}
          isSaving={updatePatientMutation.isPending}
          onClose={() => { setPatientEditOpen(false); setPatientForm(initialPatientForm); setPatientFormError(""); }}
          onSubmit={handlePatientEdit}
          onUpdate={updatePatientForm}
        />
      ) : null}

      {prevRxPreviewId && (
        <RxPreviewModal
          prescriptionId={prevRxPreviewId}
          onClose={() => setPrevRxPreviewId(null)}
        />
      )}
    </>
  );
}

// ── RxGlassBlock ──────────────────────────────────────────────────────────

function RxGlassBlock({ p, title }: { p: GlassPrescriptionState; title?: string }) {
  const hasEyeData = (["right", "left"] as const).some(
    (side) => p[side].sphere || p[side].cyl || p[side].axis || p[side].va
  );
  return (
    <div className="space-y-1 text-sm">
      {title && <p className="text-xs font-semibold text-muted-foreground">{title}</p>}
      {hasEyeData && (
        <div className="overflow-hidden rounded border text-xs">
          <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] border-b bg-muted/60 text-center font-semibold text-muted-foreground">
            <div className="border-r py-1" />
            <div className="border-r py-1">Sph</div>
            <div className="border-r py-1">CYL</div>
            <div className="border-r py-1">Axis</div>
            <div className="py-1">VA</div>
          </div>
          {(["right", "left"] as const).map((side) => (
            <div key={side} className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] border-b last:border-b-0 text-center">
              <div className="border-r py-1 font-semibold text-muted-foreground">{side === "right" ? "Right Eye" : "Left Eye"}</div>
              {(["sphere", "cyl", "axis", "va"] as const).map((f) => (
                <div key={f} className="border-r py-1 last:border-r-0">
                  {p[side][f] || <span className="text-muted-foreground/30">—</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {(p.add || p.ipd || p.glassFeatures.length > 0 || p.lensType || p.note) && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          {p.add && <span><span className="text-muted-foreground">Near Add </span>{p.add} DS</span>}
          {p.ipd && <span><span className="text-muted-foreground">IPD </span>{p.ipd} mm</span>}
          {p.glassFeatures.length > 0 && <span><span className="text-muted-foreground">Coating </span>{p.glassFeatures.join(" + ")}</span>}
          {p.lensType && <span><span className="text-muted-foreground">Lens </span>{p.lensType}</span>}
          {p.note && <span><span className="text-muted-foreground">Remarks </span>{p.note}</span>}
        </div>
      )}
    </div>
  );
}

function glassBlockHtml(p: GlassPrescriptionState, label?: string): string {
  const hasEyeData = (["right", "left"] as const).some(
    (side) => p[side].sphere || p[side].cyl || p[side].axis || p[side].va
  );
  const eyeTable = hasEyeData ? `
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <thead><tr style="background:#f5f5f5">
        <th style="width:36px;border:1px solid #ddd;padding:2px 4px"></th>
        <th style="border:1px solid #ddd;padding:2px 4px;text-align:center">Sph</th>
        <th style="border:1px solid #ddd;padding:2px 4px;text-align:center">CYL</th>
        <th style="border:1px solid #ddd;padding:2px 4px;text-align:center">Axis</th>
        <th style="border:1px solid #ddd;padding:2px 4px;text-align:center">VA</th>
      </tr></thead>
      <tbody>
        ${(["right", "left"] as const).map((side) => `
        <tr>
          <td style="border:1px solid #ddd;padding:2px 4px;font-weight:600;text-align:center">${side === "right" ? "Right Eye" : "Left Eye"}</td>
          ${(["sphere", "cyl", "axis", "va"] as const).map((f) => `<td style="border:1px solid #ddd;padding:2px 4px;text-align:center">${p[side][f] || "—"}</td>`).join("")}
        </tr>`).join("")}
      </tbody>
    </table>` : "";
  const extras = [
    p.add ? `Near Add: ${p.add} DS` : "",
    p.ipd ? `IPD: ${p.ipd} mm` : "",
    p.glassFeatures.length ? `Coating: ${p.glassFeatures.join(" + ")}` : "",
    p.lensType ? `Lens: ${p.lensType}` : "",
    p.note ? `Remarks: ${p.note}` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");
  return `${label ? `<p style="font-weight:600;font-size:11px;margin:0 0 4px">${label}</p>` : ""}${eyeTable}${extras ? `<p style="font-size:11px;margin:2px 0 0">${extras}</p>` : ""}`;
}

// ── RxPreviewModal ─────────────────────────────────────────────────────────

function RxPreviewModal({ prescriptionId, onClose }: { prescriptionId: string; onClose: () => void }) {
  const token = useSessionStore((s) => s.accessToken) ?? "";

  const { data: rx, isFetching, isError } = useQuery({
    queryKey: ["rx-preview", prescriptionId, token],
    queryFn: () => fetchPrescriptionById(prescriptionId, token),
    enabled: !!token,
  });

  function handlePrint() {
    if (!rx) return;
    const age = [
      rx.patient.ageYears != null ? `${rx.patient.ageYears}Y` : null,
      rx.patient.ageMonths != null ? `${rx.patient.ageMonths}M` : null,
    ].filter(Boolean).join(" ") || "—";

    const medicineRows = rx.medicines.map((m, i) =>
      `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${i + 1}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee"><strong>${m.brandName}</strong>${m.genericName ? ` <small>(${m.genericName})</small>` : ""}${m.strength ? ` ${m.strength}` : ""}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${m.dose}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${m.duration}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${m.instruction ?? "—"}</td>
      </tr>`
    ).join("");

    const win = window.open("", "_blank", "width=860,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Prescription ${rx.prescriptionNo}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:0;padding:20px 30px}
        h1{font-size:18px;margin:0 0 4px}
        .meta{color:#555;font-size:12px;margin-bottom:16px}
        .section{margin-bottom:14px}
        .section-title{font-size:11px;font-weight:bold;text-transform:uppercase;color:#888;margin-bottom:4px;letter-spacing:.05em}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:11px;color:#888;padding:4px 8px;border-bottom:2px solid #ddd}
        .divider{border:none;border-top:1px solid #eee;margin:16px 0}
        @media print{body{padding:10px}}
      </style></head><body>
      <h1>${rx.chamber?.name ?? "Prescription"}</h1>
      <div class="meta">Dr. ${rx.doctor?.displayName ?? "—"} &nbsp;|&nbsp; Rx# ${rx.prescriptionNo}${rx.followUpDate ? ` &nbsp;|&nbsp; Follow-up: ${new Date(rx.followUpDate).toLocaleDateString()}` : ""}</div>
      <div class="section"><div class="section-title">Patient</div>
        <strong>${rx.patient.name}</strong> &nbsp; ${age}${rx.patient.gender ? ` · ${rx.patient.gender.charAt(0).toUpperCase() + rx.patient.gender.slice(1).toLowerCase()}` : ""}${rx.patient.phone ? ` &nbsp;|&nbsp; ${rx.patient.phone}` : ""}
      </div>
      <hr class="divider"/>
      ${rx.chiefComplaints ? `<div class="section"><div class="section-title">Chief Complaints</div>${rx.chiefComplaints}</div>` : ""}
      ${rx.examination ? `<div class="section"><div class="section-title">Examination</div>${rx.examination}</div>` : ""}
      ${rx.diagnoses?.length ? `<div class="section"><div class="section-title">Diagnoses</div><ol style="margin:4px 0 0;padding-left:18px">${rx.diagnoses.map(d => `<li>${d.name}${d.note ? ` (${d.note})` : ""}</li>`).join("")}</ol></div>` : ""}
      ${rx.medicines?.length ? `<div class="section"><div class="section-title">Medicines</div><table><thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Duration</th><th>Instruction</th></tr></thead><tbody>${medicineRows}</tbody></table></div>` : ""}
      ${rx.investigations?.length ? `<div class="section"><div class="section-title">Investigations</div><ol style="margin:4px 0 0;padding-left:18px">${rx.investigations.map(inv => `<li>${inv.name}${inv.note ? ` (${inv.note})` : ""}</li>`).join("")}</ol></div>` : ""}
      ${(() => {
        const v = rx.metadata?.vision as VisionState | undefined;
        if (!v || !glassPrescriptionHasContent(v)) return "";
        const primary = glassBlockHtml(v);
        const secondary = v.secondaryGlass && glassPrescriptionHasContent(v.secondaryGlass)
          ? glassBlockHtml(v.secondaryGlass, "Secondary Glass")
          : "";
        return `<div class="section"><div class="section-title">Glass Prescription</div>${primary}${secondary ? `<div style="margin-top:8px">${secondary}</div>` : ""}</div>`;
      })()}
      ${rx.advice ? `<div class="section"><div class="section-title">Advice</div>${rx.advice}</div>` : ""}
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    win.document.close();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">Prescription Preview</p>
            {rx && <p className="text-xs text-muted-foreground">{rx.prescriptionNo}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={!rx}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading prescription…
            </div>
          )}
          {isError && (
            <p className="py-12 text-center text-sm text-destructive">Failed to load prescription.</p>
          )}
          {rx && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Patient</p>
                  <p className="font-semibold">{rx.patient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[rx.patient.ageYears != null ? `${rx.patient.ageYears}Y` : null, rx.patient.ageMonths != null ? `${rx.patient.ageMonths}M` : null].filter(Boolean).join(" ")}
                    {rx.patient.gender ? ` · ${rx.patient.gender.charAt(0).toUpperCase() + rx.patient.gender.slice(1).toLowerCase()}` : ""}
                    {rx.patient.phone ? ` · ${rx.patient.phone}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Doctor</p>
                  <p className="font-medium">{rx.doctor?.displayName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{rx.chamber?.name ?? "—"}</p>
                </div>
              </div>
              <div className="border-t" />
              {rx.chiefComplaints && <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Chief Complaints</p><p className="whitespace-pre-wrap">{rx.chiefComplaints}</p></div>}
              {rx.examination && <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Examination</p><p className="whitespace-pre-wrap">{rx.examination}</p></div>}
              {rx.diagnoses?.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Diagnoses</p><ol className="ml-4 space-y-0.5 list-decimal">{rx.diagnoses.map((d, i) => <li key={i}>{d.name}{d.note ? ` (${d.note})` : ""}</li>)}</ol></div>}
              {rx.medicines?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Medicines</p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          {["#","Medicine","Dose","Duration","Instruction"].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rx.medicines.map((m, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-2 py-1.5 font-medium">
                              {m.brandName}
                              {m.genericName && <span className="ml-1 font-normal text-muted-foreground">({m.genericName})</span>}
                              {m.strength && <span className="ml-1 text-muted-foreground">{m.strength}</span>}
                            </td>
                            <td className="px-2 py-1.5">{m.dose}</td>
                            <td className="px-2 py-1.5">{m.duration}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{m.instruction ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {rx.investigations?.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Investigations</p><ol className="ml-4 space-y-0.5 list-decimal">{rx.investigations.map((inv, i) => <li key={i}>{inv.name}{inv.note ? ` (${inv.note})` : ""}</li>)}</ol></div>}
              {(() => {
                const v = rx.metadata?.vision as VisionState | undefined;
                if (!v || !glassPrescriptionHasContent(v)) return null;
                return (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Glass Prescription</p>
                    <div className="space-y-3">
                      <RxGlassBlock p={v} />
                      {v.secondaryGlass && glassPrescriptionHasContent(v.secondaryGlass) && (
                        <RxGlassBlock p={v.secondaryGlass} title="Secondary Glass" />
                      )}
                    </div>
                  </div>
                );
              })()}
              {rx.advice && <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Advice</p><p className="whitespace-pre-wrap">{rx.advice}</p></div>}
              {rx.followUpDate && (
                <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <span className="text-xs font-semibold text-primary">Follow-up: </span>
                  <span className="text-xs">{new Date(rx.followUpDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ComplaintSidebar({
  complaints,
  onClose,
  onSetComplaints
}: {
  complaints: ComplaintEntry[];
  onClose: () => void;
  onSetComplaints: (items: ComplaintEntry[]) => void;
}) {
  function addComplaint(name: string) {
    onSetComplaints([
      ...complaints,
      { id: crypto.randomUUID(), name, value: "", forType: "For", forAmount: "", forUnit: "Day", forDate: "", note: "" }
    ]);
    // SuggestionInput already calls persistSuggestion
  }

  function updateComplaint(id: string, patch: Partial<Omit<ComplaintEntry, "id">>) {
    onSetComplaints(complaints.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function deleteComplaint(id: string) {
    onSetComplaints(complaints.filter((c) => c.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">Complaint</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              aria-label="Close complaint"
              size="icon"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <SuggestionInput suggKey={SUGG_COMPLAINT} placeholder="Type complaint name and press Enter…" onAdd={addComplaint} autoFocus />
          </div>

          {complaints.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2 w-10 text-center">Edit</th>
                    <th className="px-3 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                          id={`complaint-name-${c.id}`}
                          placeholder="Name"
                          value={c.name}
                          onChange={(e) => updateComplaint(c.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Value"
                          value={c.value}
                          onChange={(e) => updateComplaint(c.id, { value: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            className="rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={c.forType}
                            onChange={(e) => updateComplaint(c.id, { forType: e.target.value as ComplaintEntry["forType"] })}
                          >
                            <option>For</option>
                            <option>Since</option>
                            <option>On</option>
                          </select>

                          {c.forType === "For" && (
                            <>
                              <input
                                className="w-14 rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                min="0"
                                placeholder="0"
                                type="number"
                                value={c.forAmount}
                                onChange={(e) => updateComplaint(c.id, { forAmount: e.target.value })}
                              />
                              <select
                                className="rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={c.forUnit}
                                onChange={(e) => updateComplaint(c.id, { forUnit: e.target.value as ComplaintEntry["forUnit"] })}
                              >
                                <option>Day</option>
                                <option>Week</option>
                                <option>Month</option>
                                <option>Year</option>
                                <option>Hour</option>
                              </select>
                            </>
                          )}

                          {c.forType === "Since" && (
                            <>
                              <input
                                className="w-14 rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                min="0"
                                placeholder="0"
                                type="number"
                                value={c.forAmount}
                                onChange={(e) => updateComplaint(c.id, { forAmount: e.target.value })}
                              />
                              <select
                                className="rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={c.forUnit}
                                onChange={(e) => updateComplaint(c.id, { forUnit: e.target.value as ComplaintEntry["forUnit"] })}
                              >
                                <option>Day</option>
                                <option>Week</option>
                                <option>Month</option>
                                <option>Year</option>
                                <option>Hour</option>
                              </select>
                            </>
                          )}

                          {c.forType === "On" && (
                            <DatePickerInput
                              placeholder="Select date"
                              value={c.forDate}
                              onChange={(v) => updateComplaint(c.id, { forDate: v })}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                          title="Edit"
                          type="button"
                          onClick={() => {
                            const row = document.getElementById(`complaint-name-${c.id}`);
                            row?.focus();
                          }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                          type="button"
                          onClick={() => deleteComplaint(c.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {complaints.length === 0 && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              No complaints added yet. Type a name above and press Enter.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function HistorySidebar({
  histories,
  onClose,
  onSetHistories
}: {
  histories: HistoryEntry[];
  onClose: () => void;
  onSetHistories: (items: HistoryEntry[]) => void;
}) {
  const [tab, setTab] = useState<HistoryTab>("Medical");

  const tabEntries = histories.filter((h) => h.tab === tab);

  function addEntry(name: string) {
    onSetHistories([
      ...histories,
      {
        id: crypto.randomUUID(),
        tab,
        name,
        value: "",
        note: "",
        duration: { type: (tab === "Investigation" || tab === "Surgery") ? "On" : "For", amount: "", unit: "Day", text: "", rangeTo: "" }
      }
    ]);
    // SuggestionInput already calls persistSuggestion with the per-tab key
  }

  function updateEntry(id: string, patch: Partial<Omit<HistoryEntry, "id">>) {
    onSetHistories(histories.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  function deleteEntry(id: string) {
    onSetHistories(histories.filter((h) => h.id !== id));
  }

  function goToNextTab() {
    const i = historyTabs.indexOf(tab);
    setTab(historyTabs[(i + 1) % historyTabs.length]);
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">History</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button aria-label="Close" size="icon" type="button" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="flex items-center border-b">
          <div className="flex min-w-0 flex-1 overflow-x-auto">
            {historyTabs.map((item) => (
              <TabButton key={item} active={tab === item} onClick={() => setTab(item)}>
                {item}
                {histories.filter((h) => h.tab === item).length > 0 && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                    {histories.filter((h) => h.tab === item).length}
                  </span>
                )}
              </TabButton>
            ))}
          </div>
          <button
            className="flex h-16 w-12 flex-none items-center justify-center border-l text-primary hover:bg-muted"
            type="button"
            onClick={goToNextTab}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <SuggestionInput suggKey={`${SUGG_HISTORY}-${tab}`} placeholder={`Type ${tab.toLowerCase()} history and press Enter…`} onAdd={addEntry} autoFocus />
          </div>

          {tabEntries.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              No {tab.toLowerCase()} history added yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Name</th>
                    {(tab === "Medical" || tab === "Investigation" || tab === "Drug" || tab === "Surgery") && (
                      <th className="px-3 py-2">Value</th>
                    )}
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {tabEntries.map((h) => (
                    <tr key={h.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Name"
                          value={h.name}
                          onChange={(e) => updateEntry(h.id, { name: e.target.value })}
                        />
                      </td>

                      {(tab === "Medical" || tab === "Investigation" || tab === "Drug" || tab === "Surgery") && (
                        <td className="px-2 py-1.5">
                          <input
                            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                            placeholder={tab === "Investigation" ? "Result" : "Value"}
                            value={h.value}
                            onChange={(e) => updateEntry(h.id, { value: e.target.value })}
                          />
                        </td>
                      )}

                      <td className="px-2 py-1.5">
                        {h.duration && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <select
                              className="rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                              value={h.duration.type}
                              onChange={(e) =>
                                updateEntry(h.id, { duration: { ...h.duration!, type: e.target.value as HistoryDuration["type"] } })
                              }
                            >
                              <option>For</option>
                              <option>Since</option>
                              <option>On</option>
                              <option>Range</option>
                            </select>

                            {h.duration.type === "For" && (
                              <>
                                <input
                                  className="w-14 rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                  min="0"
                                  placeholder="0"
                                  type="number"
                                  value={h.duration.amount}
                                  onChange={(e) =>
                                    updateEntry(h.id, { duration: { ...h.duration!, amount: e.target.value } })
                                  }
                                />
                                <select
                                  className="rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                  value={h.duration.unit}
                                  onChange={(e) =>
                                    updateEntry(h.id, { duration: { ...h.duration!, unit: e.target.value as HistoryDuration["unit"] } })
                                  }
                                >
                                  <option>Day</option>
                                  <option>Week</option>
                                  <option>Month</option>
                                  <option>Year</option>
                                </select>
                              </>
                            )}

                            {(h.duration.type === "Since" || h.duration.type === "On") && (
                              <DatePickerInput
                                placeholder={h.duration.type === "Since" ? "Since date" : "Select date"}
                                value={h.duration.text}
                                onChange={(v) =>
                                  updateEntry(h.id, { duration: { ...h.duration!, text: v } })
                                }
                              />
                            )}

                            {h.duration.type === "Range" && (
                              <>
                                <DatePickerInput
                                  placeholder="From"
                                  value={h.duration.text}
                                  onChange={(v) =>
                                    updateEntry(h.id, { duration: { ...h.duration!, text: v } })
                                  }
                                />
                                <span className="text-xs text-muted-foreground">to</span>
                                <DatePickerInput
                                  placeholder="To"
                                  value={h.duration.rangeTo}
                                  onChange={(v) =>
                                    updateEntry(h.id, { duration: { ...h.duration!, rangeTo: v } })
                                  }
                                />
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-1.5 text-center">
                        <button
                          className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                          type="button"
                          onClick={() => deleteEntry(h.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

type FindingsSidebarProps = {
  findings: FindingsState;
  note: string;
  onChange: (patch: Partial<FindingsState>) => void;
  onClear: () => void;
  onClose: () => void;
  onNoteChange: (value: string) => void;
};

function FindingsSidebar({
  findings,
  note,
  onChange,
  onClear,
  onClose,
  onNoteChange
}: FindingsSidebarProps) {
  const [tab, setTab] = useState<"Basic" | "Other" | "Gynae & Obs">("Basic");

  return (
    <RightDrawer title="Findings" onClose={onClose}>
      <div className="space-y-0">
        <div className="border-b">
          <div className="flex min-w-0 overflow-x-auto">
            {(["Basic", "Other", "Gynae & Obs"] as const).map((item) => (
              <TabButton key={item} active={tab === item} onClick={() => setTab(item)}>
                {item}
              </TabButton>
            ))}
          </div>
        </div>

        {tab === "Basic" ? (
          <div className="overflow-hidden rounded-xl border-2 border-border/70 bg-card shadow-md">
            <section className="border-b p-2 last:border-b-0">
              <div className="grid gap-4 grid-cols-[1.2fr_0.85fr_0.95fr_1.8fr_0.85fr]">
                <div className="space-y-1">
                  <FieldLabel>Blood Pressure</FieldLabel>
                  <div className="grid grid-cols-2 overflow-hidden rounded-md border">
                    <Input
                      className="rounded-none border-0 border-r text-xs"
                      placeholder="Sys"
                      value={findings.bpSystolic}
                      onChange={(event) => onChange({ bpSystolic: event.target.value })}
                    />
                    <Input
                      className="rounded-none border-0 text-xs"
                      placeholder="Dias"
                      value={findings.bpDiastolic}
                      onChange={(event) => onChange({ bpDiastolic: event.target.value })}
                    />
                  </div>
                </div>
                <FindingInput
                  label="Temperature"
                  value={findings.temperature}
                  onChange={(value) => onChange({ temperature: value })}
                  className="text-xs"
                />
                <FindingInput
                  label="Weight (kg)"
                  value={findings.weight}
                  onChange={(value) => onChange({ weight: value })}
                  className="text-xs"
                />
                <div className="space-y-1">
                  <FieldLabel>Height</FieldLabel>
                  <div className="grid grid-cols-[1fr_1fr_auto_1fr] items-center gap-2">
                    <Input
                      className="text-xs"
                      placeholder="feet"
                      value={findings.heightFeet}
                      onChange={(event) => onChange({ heightFeet: event.target.value })}
                    />
                    <Input
                      className="text-xs"
                      placeholder="inch"
                      value={findings.heightInch}
                      onChange={(event) => onChange({ heightInch: event.target.value })}
                    />
                    <span className="text-lg font-semibold">/</span>
                    <Input
                      className="text-xs"
                      placeholder="cm"
                      value={findings.heightCm}
                      onChange={(event) => onChange({ heightCm: event.target.value })}
                    />
                  </div>
                </div>
                <FindingInput
                  label="RBS"
                  value={findings.rbs}
                  onChange={(value) => onChange({ rbs: value })}
                  className="text-xs"
                />
              </div>
            </section>
            <section className="border-b p-2 last:border-b-0">
              <OphthalmicFindingsTable findings={findings} onChange={onChange} />
            </section>
          </div>
        ) : tab === "Gynae & Obs" ? (
          <GynaeObsForm findings={findings} onChange={onChange} />
        ) : (
          <div className="overflow-hidden rounded-xl border-2 border-border/70 bg-card shadow-md">
            <FindingsSection title="Other">
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-1">
                    <FieldLabel>OFC</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="cm"
                        value={findings.ofcCm}
                        onChange={(event) => onChange({ ofcCm: event.target.value })}
                      />
                      <Input
                        placeholder="inch"
                        value={findings.ofcInch}
                        onChange={(event) => onChange({ ofcInch: event.target.value })}
                      />
                    </div>
                  </div>
                  <FindingInput
                    label="Pulse (bpm)"
                    value={findings.pulse}
                    onChange={(value) => onChange({ pulse: value })}
                  />
                  <FindingInput
                    label="PFR (L/min.)"
                    value={findings.pfr}
                    onChange={(value) => onChange({ pfr: value })}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-1">
                    <FieldLabel>Diabetes</FieldLabel>
                    <div className="flex gap-2">
                      <TriStateControl
                        value={findings.diabetes}
                        onChange={(value) => onChange({ diabetes: value })}
                      />
                      <Input
                        value={findings.diabetesDetails}
                        onChange={(event) => onChange({ diabetesDetails: event.target.value })}
                      />
                    </div>
                  </div>
                  <FindingInput
                    label="Respiratory Rate"
                    value={findings.respiratoryRate}
                    onChange={(value) => onChange({ respiratoryRate: value })}
                  />
                  <FindingInput
                    label="FBS (mmol/l)"
                    value={findings.fbs}
                    onChange={(value) => onChange({ fbs: value })}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <FindingInput
                    label="2-Hrs-ABF (mmol/l)"
                    value={findings.twoHourAbf}
                    onChange={(value) => onChange({ twoHourAbf: value })}
                  />
                  <FindingInput
                    label="SpO2 (%)"
                    value={findings.spo2}
                    onChange={(value) => onChange({ spo2: value })}
                  />
                </div>
              </div>
            </FindingsSection>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onClear}>
            <RotateCcw className="h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>
    </RightDrawer>
  );
}

const OPHTHALMIC_CUSTOM_OPTS_KEY = "rx-ophthalmic-custom-opts";

function EyeSelectField({
  ariaLabel, value, placeholder = "Select", className, multiSelect = false, suffix, presetOptions, customOptions, onChange, onRemove, onAdd
}: {
  ariaLabel: string;
  value: string;
  placeholder?: string;
  className?: string;
  multiSelect?: boolean;
  suffix?: string;
  presetOptions: string[];
  customOptions: string[];
  onChange: (v: string) => void;
  onRemove: (opt: string) => void;
  onAdd: (opt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setAddValue("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function commit() {
    const v = addValue.trim();
    if (v) onAdd(v);
    setAddValue("");
    setAdding(false);
  }

  const selectedSet = multiSelect
    ? new Set(value.split(",").map((s) => s.trim()).filter(Boolean))
    : null;
  const displayText = multiSelect
    ? (selectedSet!.size > 0 ? [...selectedSet!].join(", ") : placeholder)
    : (value || placeholder);

  function toggleOption(opt: string) {
    if (!multiSelect) {
      onChange(opt === value ? "" : opt);
      setOpen(false);
      return;
    }
    const next = new Set(selectedSet!);
    if (next.has(opt)) next.delete(opt); else next.add(opt);
    onChange([...next].join(", "));
  }

  const triggerButton = (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "flex h-8 items-center justify-between border border-border/70 bg-card px-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-primary",
        suffix ? "rounded-l-md" : "w-full rounded-md"
      )}
      onClick={() => setOpen((o) => !o)}
    >
      <span className={cn("truncate", value ? "" : "text-muted-foreground")}>{displayText}</span>
      <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
    </button>
  );

  return (
    <div ref={ref} className={cn("relative", className)}>
      {suffix ? (
        <div className="flex items-stretch">
          {triggerButton}
          <span className="inline-flex h-8 shrink-0 items-center rounded-r-md border border-l-0 bg-muted px-2 text-xs text-muted-foreground">
            {suffix}
          </span>
        </div>
      ) : (
        triggerButton
      )}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] w-max rounded-md border bg-card shadow-md max-h-64 overflow-y-auto">
          <div>
          {presetOptions.map((opt) => (
            <div
              key={opt}
              className="flex cursor-pointer items-center px-2 py-1 text-xs hover:bg-muted"
              onClick={() => toggleOption(opt)}
            >
              <span className="flex-1">{opt}</span>
              {(multiSelect ? selectedSet!.has(opt) : opt === value) && <Check className="h-3 w-3 text-primary" />}
            </div>
          ))}
          {customOptions.map((opt) => (
            <div key={opt} className="flex cursor-pointer items-center px-2 py-1 text-xs hover:bg-muted">
              <span className="flex-1" onClick={() => toggleOption(opt)}>{opt}</span>
              {(multiSelect ? selectedSet!.has(opt) : opt === value) && <Check className="h-3 w-3 text-primary mr-1" />}
              <button
                type="button"
                aria-label={`Remove ${opt}`}
                className="ml-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                onClick={(e) => { e.stopPropagation(); onRemove(opt); }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          </div>
          {adding ? (
            <div className="shrink-0 border-t px-2 py-1">
              <input
                autoFocus
                className="w-full rounded border border-primary/50 bg-background px-1 py-0.5 text-xs outline-none"
                placeholder="New value…"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commit(); }
                  if (e.key === "Escape") { setAdding(false); setAddValue(""); }
                }}
                onBlur={commit}
              />
            </div>
          ) : (
            <div
              className="shrink-0 cursor-pointer border-t px-2 py-1 text-xs text-primary hover:bg-muted"
              onClick={() => setAdding(true)}
            >
              + Add value
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OphthalmicFindingsTable({
  findings,
  onChange
}: {
  findings: FindingsState;
  onChange: (patch: Partial<FindingsState>) => void;
}) {
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem(OPHTHALMIC_CUSTOM_OPTS_KEY) ?? "{}"); } catch { return {}; }
  });
  const [vaPickerTarget, setVaPickerTarget] = useState<{ side: "right" | "left"; field: "sphere" | "cyl" | "va" } | null>(null);
  const vaRecordRightRef = useRef<HTMLDivElement>(null);
  const vaRecordLeftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vaPickerTarget) return;
    function close(e: PointerEvent) {
      const t = e.target as Node;
      if (vaRecordRightRef.current?.contains(t) || vaRecordLeftRef.current?.contains(t)) return;
      setVaPickerTarget(null);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [vaPickerTarget]);

  function updateField(key: keyof FindingsState, value: string) {
    onChange({ [key]: value } as Partial<FindingsState>);
  }

  function addCustomOption(rowLabel: string, val: string) {
    if (!val.trim()) return;
    const updated = { ...customOptions, [rowLabel]: [...(customOptions[rowLabel] ?? []), val.trim()] };
    setCustomOptions(updated);
    try { localStorage.setItem(OPHTHALMIC_CUSTOM_OPTS_KEY, JSON.stringify(updated)); } catch {}
  }

  function removeCustomOption(rowLabel: string, val: string) {
    const updated = { ...customOptions, [rowLabel]: (customOptions[rowLabel] ?? []).filter((o) => o !== val) };
    setCustomOptions(updated);
    try { localStorage.setItem(OPHTHALMIC_CUSTOM_OPTS_KEY, JSON.stringify(updated)); } catch {}
  }

  function renderEyeField(
    row: (typeof ophthalmicFindingRows)[number],
    side: "right" | "left"
  ) {
    const key = side === "right" ? row.rightKey : row.leftKey;
    const noteKey = side === "right" ? row.rightNoteKey : row.leftNoteKey;
    const ariaLabel = `${row.label} ${side} eye`;

    if (row.inputType === "checkbox") {
      const checked = String(findings[key] ?? "") === "yes";
      return (
        <label className="flex h-full w-full cursor-pointer items-center justify-center p-2">
          <input
            type="checkbox"
            aria-label={ariaLabel}
            className="h-4 w-4 cursor-pointer accent-primary"
            checked={checked}
            onChange={(e) => updateField(key, e.target.checked ? "yes" : "")}
          />
        </label>
      );
    }

    if (row.inputType === "freetext") {
      return (
        <textarea
          aria-label={ariaLabel}
          rows={1}
          className="w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-1 py-1 text-sm leading-tight outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={String(findings[key] ?? "")}
          ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
          onChange={(event) => {
            updateField(key, event.target.value);
            const el = event.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
        />
      );
    }

    if (row.inputType === "varecord") {
      const prefix = side === "right" ? "ophthalmicVaRecordRight" : "ophthalmicVaRecordLeft";
      const cellRef = side === "right" ? vaRecordRightRef : vaRecordLeftRef;
      const fields: { label: string; key: keyof FindingsState; pickerField?: "sphere" | "cyl" | "va" }[] = [
        { label: "Sphere", key: `${prefix}Sphere` as keyof FindingsState, pickerField: "sphere" },
        { label: "CYL",    key: `${prefix}Cyl`    as keyof FindingsState, pickerField: "cyl" },
        { label: "Axis",   key: `${prefix}Axis`   as keyof FindingsState },
        { label: "VA",     key: `${prefix}Va`     as keyof FindingsState, pickerField: "va" },
      ];
      const isPickerOpen = vaPickerTarget?.side === side;
      return (
        <div ref={cellRef} className="relative">
          <div className="grid grid-cols-4 divide-x">
            {fields.map((f) => (
              <input
                key={f.key}
                aria-label={`${ariaLabel} ${f.label}`}
                placeholder={f.label}
                className={cn(
                  "w-full bg-transparent px-1 py-1 text-center text-xs outline-none placeholder:text-muted-foreground",
                  isPickerOpen && vaPickerTarget?.field === f.pickerField
                    ? "ring-2 ring-inset ring-primary"
                    : "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                )}
                value={String(findings[f.key] ?? "")}
                onChange={(e) => updateField(f.key, e.target.value)}
                onClick={() => { if (f.pickerField) setVaPickerTarget({ side, field: f.pickerField }); }}
                onFocus={() => { if (f.pickerField) setVaPickerTarget({ side, field: f.pickerField }); else setVaPickerTarget(null); }}
              />
            ))}
          </div>
          {isPickerOpen && (() => {
            const fieldLabel = vaPickerTarget!.field === "sphere" ? "Sphere" : vaPickerTarget!.field === "cyl" ? "CYL" : "VA";
            const targetLabel = `${side === "right" ? "Right" : "Left"} Eye ${fieldLabel}`;
            const placement = cn("top-full max-w-[calc(100vw-2rem)]", side === "right" ? "left-0" : "right-0");
            const onSelect = (v: string) => {
              const k = vaPickerTarget!.field === "sphere"
                ? `${prefix}Sphere` as keyof FindingsState
                : vaPickerTarget!.field === "cyl"
                  ? `${prefix}Cyl` as keyof FindingsState
                  : `${prefix}Va` as keyof FindingsState;
              updateField(k, v);
              setVaPickerTarget(null);
            };
            if (vaPickerTarget!.field === "va") {
              return (
                <GlassOptionsPicker
                  options={glassVisualAcuityPickerOptions}
                  placementClassName={cn(placement, "w-[400px]")}
                  targetLabel={targetLabel}
                  onClose={() => setVaPickerTarget(null)}
                  onSelect={onSelect}
                />
              );
            }
            return (
              <GlassPowerPicker
                placementClassName={cn(placement, "w-[656px]")}
                targetLabel={targetLabel}
                onClose={() => setVaPickerTarget(null)}
                onSelect={onSelect}
              />
            );
          })()}
        </div>
      );
    }

    if (row.inputType === "select") {
      const withPhKey = side === "right" ? row.rightWithPhKey : row.leftWithPhKey;
      const withPhCustomLabel = `${row.label} (With PH)`;
      const withPgpKey = side === "right" ? row.rightWithPgpKey : row.leftWithPgpKey;
      const withPgpCustomLabel = `${row.label} (With PGP/Existing)`;
      return (
        <div className="flex items-start gap-1 p-1">
          <EyeSelectField
            ariaLabel={ariaLabel}
            value={String(findings[key] ?? "")}
            placeholder={withPhKey ? "Unaided" : "Select"}
            className="w-fit shrink-0"
            multiSelect={row.multiSelect}
            presetOptions={row.options ?? []}
            customOptions={customOptions[row.label] ?? []}
            onChange={(v) => updateField(key, v)}
            onRemove={(opt) => removeCustomOption(row.label, opt)}
            onAdd={(opt) => addCustomOption(row.label, opt)}
          />
          {withPhKey && (
            <EyeSelectField
              ariaLabel={`${ariaLabel} with PH`}
              value={String(findings[withPhKey] ?? "")}
              placeholder="With PH"
              className="w-fit shrink-0"
              presetOptions={row.options ?? []}
              customOptions={customOptions[withPhCustomLabel] ?? []}
              onChange={(v) => updateField(withPhKey, v)}
              onRemove={(opt) => removeCustomOption(withPhCustomLabel, opt)}
              onAdd={(opt) => addCustomOption(withPhCustomLabel, opt)}
            />
          )}
          {withPgpKey && (
            <EyeSelectField
              ariaLabel={`${ariaLabel} with PGP/Existing`}
              value={String(findings[withPgpKey] ?? "")}
              placeholder="W/PGP"
              className="w-fit shrink-0"
              presetOptions={row.options ?? []}
              customOptions={customOptions[withPgpCustomLabel] ?? []}
              onChange={(v) => updateField(withPgpKey, v)}
              onRemove={(opt) => removeCustomOption(withPgpCustomLabel, opt)}
              onAdd={(opt) => addCustomOption(withPgpCustomLabel, opt)}
            />
          )}
          {noteKey ? (
            <div className="flex min-w-0 flex-1 items-center">
              <textarea
                aria-label={`${ariaLabel} note`}
                rows={1}
                className="min-w-0 flex-1 resize-none overflow-hidden rounded-none border-0 bg-transparent px-1 py-1 text-sm leading-tight outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Note"
                value={String(findings[noteKey] ?? "")}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                onChange={(event) => {
                  updateField(noteKey, event.target.value);
                  const el = event.currentTarget;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
              />
              {row.unit && (
                <span className="shrink-0 pr-1 text-xs text-muted-foreground">{row.unit}</span>
              )}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <textarea
        aria-label={ariaLabel}
        rows={1}
        className="w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-1 py-1 text-sm leading-tight outline-none focus-visible:ring-2 focus-visible:ring-primary"
        value={String(findings[key] ?? "")}
        ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
        onChange={(event) => {
          updateField(key, event.target.value);
          const el = event.currentTarget;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <table className="w-full table-fixed rounded-md border bg-background text-left">
          <colgroup>
            <col style={{ width: "120px" }} />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b bg-card text-sm font-semibold text-primary">
              <th className="border-r px-2 pb-1.5 pt-0 font-semibold whitespace-nowrap">Ophthalmic Findings</th>
              <th className="border-r px-2 pb-1.5 pt-0 text-center font-semibold">Right Eye</th>
              <th className="px-2 pb-1.5 pt-0 text-center font-semibold">Left Eye</th>
            </tr>
          </thead>
          <tbody>
            {ophthalmicFindingRows.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0">
                <td className="border-r px-2 py-1.5 align-middle text-sm font-medium whitespace-nowrap w-px">
                  {row.label}
                </td>
                <td className="border-r p-0 align-top cursor-text" onClick={(e) => { if (!(e.target as HTMLElement).closest("textarea, input, button, select")) (e.currentTarget.querySelector("textarea, input") as HTMLElement)?.focus(); }}>{renderEyeField(row, "right")}</td>
                <td className="p-0 align-top cursor-text" onClick={(e) => { if (!(e.target as HTMLElement).closest("textarea, input, button, select")) (e.currentTarget.querySelector("textarea, input") as HTMLElement)?.focus(); }}>{renderEyeField(row, "left")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1">
        <FieldLabel>Remark</FieldLabel>
        <Textarea
          className="min-h-20 bg-background text-xs"
          placeholder="Type ophthalmic remarks..."
          value={findings.ophthalmicRemark}
          onChange={(event) => updateField("ophthalmicRemark", event.target.value)}
        />
      </div>
    </div>
  );
}

function GlassPrescriptionForm({
  prescription,
  title,
  onChange,
  onEyeChange,
  onRemove,
  sphereExtraOptions
}: {
  prescription: GlassPrescriptionState;
  title: string;
  onChange: (patch: Partial<Omit<GlassPrescriptionState, "right" | "left">>) => void;
  onEyeChange: (side: "right" | "left", field: keyof EyePower, value: string) => void;
  onRemove?: () => void;
  sphereExtraOptions?: string[];
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [powerPickerTarget, setPowerPickerTarget] = useState<GlassPowerPickerTarget | null>(null);
  const powerPickerLabel = powerPickerTarget
    ? powerPickerTarget.kind === "add"
      ? "Near Add"
      : `${powerPickerTarget.side === "right" ? "Right Eye" : "Left Eye"} ${
          powerPickerTarget.field === "sphere"
            ? "Sphere"
            : powerPickerTarget.field === "cyl"
              ? "CYL"
              : powerPickerTarget.field === "axis"
                ? "Axis"
                : "VA"
        }`
    : "";

  useEffect(() => {
    if (!powerPickerTarget) return;

    function closePickerOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (pickerRef.current?.contains(target)) return;
      setPowerPickerTarget(null);
    }

    document.addEventListener("pointerdown", closePickerOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closePickerOnOutsideClick);
  }, [powerPickerTarget]);

  function selectPowerValue(value: string) {
    if (!powerPickerTarget) return;

    if (powerPickerTarget.kind === "add") {
      onChange({ add: value });
    } else {
      onEyeChange(powerPickerTarget.side, powerPickerTarget.field, value);
    }

    setPowerPickerTarget(null);
  }

  function isActivePickerTarget(side: "right" | "left", field: keyof EyePower) {
    return Boolean(
      powerPickerTarget?.kind === "eye"
        && powerPickerTarget.side === side
        && powerPickerTarget.field === field
    );
  }

  return (
    <div className="relative space-y-3 rounded-xl border-2 border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onRemove ? (
          <Button type="button" variant="ghost" onClick={onRemove}>
            <X className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[340px] rounded-md border-2 border-border/50 bg-background">
          <div className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))] border-b text-center text-xs font-semibold">
            <div className="border-r px-1 py-1">##</div>
            <div className="border-r px-1 py-1">Sphere</div>
            <div className="border-r px-1 py-1">CYL</div>
            <div className="border-r px-1 py-1">Axis</div>
            <div className="px-1 py-1">VA</div>
          </div>
          {(["right", "left"] as const).map((side) => (
            <div
              key={side}
              className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))] border-b last:border-b-0"
            >
              <div className="flex items-center justify-center border-r px-1 py-1 text-xs">
                {side === "right" ? "Right Eye" : "Left Eye"}
              </div>
              {(["sphere", "cyl", "axis", "va"] as const).map((field) => (
                <div key={field} className="border-r p-1 last:border-r-0">
                  <Input
                    aria-label={`${side === "right" ? "Right Eye" : "Left Eye"} ${field}`}
                    className={cn(
                      "h-8 bg-background text-center text-xs",
                      isActivePickerTarget(side, field) ? "ring-2 ring-primary" : ""
                    )}
                    value={prescription[side][field]}
                    onClick={() => { if (field !== "axis") setPowerPickerTarget({ kind: "eye", side, field }); }}
                    onChange={(event) => onEyeChange(side, field, event.target.value)}
                    onFocus={() => { if (field !== "axis") setPowerPickerTarget({ kind: "eye", side, field }); else setPowerPickerTarget(null); }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center gap-1">
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Near Add</span>
          <div className="flex">
            <Input
              className={cn("h-8 w-14 rounded-r-none bg-background text-xs", powerPickerTarget?.kind === "add" ? "ring-2 ring-primary" : "")}
              value={prescription.add}
              onClick={() => setPowerPickerTarget({ kind: "add" })}
              onChange={(event) => onChange({ add: event.target.value })}
              onFocus={() => setPowerPickerTarget({ kind: "add" })}
            />
            <span className="inline-flex h-8 items-center rounded-r-md border border-l-0 bg-muted px-1.5 text-xs">DS</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">IPD</span>
          <div className="flex">
            <Input
              className="h-8 w-14 rounded-r-none text-xs"
              value={prescription.ipd}
              onChange={(event) => onChange({ ipd: event.target.value })}
              onFocus={() => setPowerPickerTarget(null)}
            />
            <span className="inline-flex h-8 items-center rounded-r-md border border-l-0 bg-muted px-1.5 text-xs">mm</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Glass Coating</span>
          <GlassFeaturesMultiSelect
            value={prescription.glassFeatures}
            onChange={(value) => onChange({ glassFeatures: value })}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Lens Type</span>
          <select
            className="h-8 w-28 rounded-md border bg-background px-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
            value={prescription.lensType}
            onChange={(event) => onChange({ lensType: event.target.value })}
            onFocus={() => setPowerPickerTarget(null)}
          >
            <option value="">Select</option>
            {lensTypeOptions.map((lensType) => (
              <option key={lensType} value={lensType}>{lensType}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Remarks</span>
        <Input
          className="h-8 bg-background text-xs"
          placeholder="Type additional information..."
          value={prescription.note}
          onChange={(event) => onChange({ note: event.target.value })}
          onFocus={() => setPowerPickerTarget(null)}
        />
      </div>

      {powerPickerTarget ? (
        <div ref={pickerRef}>
          <GlassPrescriptionPicker
            target={powerPickerTarget}
            targetLabel={powerPickerLabel}
            onClose={() => setPowerPickerTarget(null)}
            onSelect={selectPowerValue}
            sphereExtraOptions={sphereExtraOptions}
          />
        </div>
      ) : null}
    </div>
  );
}

function GlassPrescriptionPicker({
  target,
  targetLabel,
  onClose,
  onSelect,
  sphereExtraOptions
}: {
  target: GlassPowerPickerTarget;
  targetLabel: string;
  onClose: () => void;
  onSelect: (value: string) => void;
  sphereExtraOptions?: string[];
}) {
  if (target.kind === "add") {
    return (
      <GlassOptionsPicker
        options={glassAddPickerOptions}
        placementClassName="left-16 top-[226px] w-[716px] max-w-[calc(100vw-3rem)]"
        targetLabel={targetLabel}
        onClose={onClose}
        onSelect={onSelect}
      />
    );
  }

  if (target.field === "axis") {
    return (
      <GlassOptionsPicker
        options={glassAxisPickerOptions}
        placementClassName={cn(
          "right-[154px] w-[596px] max-w-[calc(100vw-3rem)]",
          target.side === "right" ? "top-[106px]" : "top-[184px]"
        )}
        targetLabel={targetLabel}
        onClose={onClose}
        onSelect={onSelect}
      />
    );
  }

  if (target.field === "va") {
    return (
      <GlassOptionsPicker
        options={glassVisualAcuityPickerOptions}
        placementClassName={cn(
          "right-6 w-[568px] max-w-[calc(100vw-3rem)]",
          target.side === "right" ? "top-[106px]" : "top-[184px]"
        )}
        targetLabel={targetLabel}
        onClose={onClose}
        onSelect={onSelect}
      />
    );
  }

  return (
    <GlassPowerPicker
      placementClassName={cn(
        "left-1/2 w-[656px] max-w-[calc(100vw-3rem)] -translate-x-1/2",
        target.side === "right" ? "top-[106px]" : "top-[184px]"
      )}
      targetLabel={targetLabel}
      onClose={onClose}
      onSelect={onSelect}
      extraOptions={target.field === "sphere" ? sphereExtraOptions : undefined}
    />
  );
}

function GlassOptionsPicker({
  options,
  placementClassName,
  targetLabel,
  onClose,
  onSelect
}: {
  options: string[];
  placementClassName: string;
  targetLabel: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div
      aria-label={`${targetLabel} picker`}
      className={cn(
        "absolute z-50 rounded-md border bg-card px-5 py-4 shadow-soft",
        placementClassName
      )}
    >
      <GlassPickerCloseButton onClose={onClose} />
      <div className="flex flex-wrap justify-center gap-1.5">
        {options.map((option) => (
          <GlassPickerOptionButton key={option} option={option} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function GlassPowerPicker({
  placementClassName,
  targetLabel,
  onClose,
  onSelect,
  extraOptions
}: {
  placementClassName: string;
  targetLabel: string;
  onClose: () => void;
  onSelect: (value: string) => void;
  extraOptions?: string[];
}) {
  const [mode, setMode] = useState<"positive" | "negative">("positive");
  const baseOptions = mode === "positive" ? positiveGlassPowerOptions : negativeGlassPowerOptions;
  const options = extraOptions?.length ? [...extraOptions, ...baseOptions] : baseOptions;

  return (
    <div
      aria-label={`${targetLabel} power picker`}
      className={cn(
        "absolute z-50 rounded-md border bg-card px-5 pb-5 pt-4 shadow-soft",
        placementClassName
      )}
    >
      <GlassPickerCloseButton onClose={onClose} />

      <div className="mb-3 flex items-center justify-center gap-8 text-base font-medium text-primary">
        {(["positive", "negative"] as const).map((item) => (
          <button
            key={item}
            className={cn(
              "border-b-2 pb-1 transition",
              mode === item
                ? "border-primary text-primary"
                : "border-transparent text-primary/80 hover:text-primary"
            )}
            type="button"
            onClick={() => setMode(item)}
          >
            {item === "positive" ? "Positive" : "Negative"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {options.map((option) => (
          <GlassPickerOptionButton key={option} option={option} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function GlassPickerCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="Close picker"
      className="absolute -right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft hover:text-destructive"
      type="button"
      onClick={onClose}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

function GlassPickerOptionButton({
  option,
  onSelect
}: {
  option: string;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      className="h-10 min-w-16 rounded-sm bg-teal-600 px-3 text-sm font-medium text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      type="button"
      onClick={() => onSelect(option)}
    >
      {option}
    </button>
  );
}

function GlassFieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-2 text-sm md:grid-cols-[120px_minmax(0,1fr)] md:items-start">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function GlassFeaturesMultiSelect({
  value,
  onChange
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  function toggle(option: string) {
    const current = valueRef.current;
    onChange(
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    );
  }

  const label = value.length === 0 ? "Select..." : value.join(", ");

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between rounded-md border bg-background px-2 text-xs outline-none transition hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown className={cn("ml-1 h-3 w-3 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full rounded-md border bg-popover shadow-md">
          {glassFeatureOptions.map((option) => {
            const checked = value.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={checked}
                  onChange={() => toggle(option)}
                />
                {option}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GynaeObsForm({
  findings,
  onChange
}: {
  findings: FindingsState;
  onChange: (patch: Partial<FindingsState>) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <FindingsSection title="A. Menstrual History">
          <div className="grid gap-6 md:grid-cols-2">
            <FindingInput
              label="Menarche (years)"
              value={findings.gynaeMenarche}
              onChange={(value) => onChange({ gynaeMenarche: value })}
            />
            <DateTextInput
              label="LMP"
              value={findings.gynaeLmp}
              onChange={(value) => onChange({ gynaeLmp: value })}
            />
            <SplitInputGroup
              label="Mp"
              separator="+/-"
              values={[findings.gynaeMpFirst, findings.gynaeMpSecond]}
              onChange={(index, value) =>
                onChange(index === 0 ? { gynaeMpFirst: value } : { gynaeMpSecond: value })
              }
            />
            <SplitInputGroup
              label="Mc"
              separator="+/-"
              values={[findings.gynaeMcFirst, findings.gynaeMcSecond]}
              onChange={(index, value) =>
                onChange(index === 0 ? { gynaeMcFirst: value } : { gynaeMcSecond: value })
              }
            />
            <SegmentedField
              label="Flow"
              options={["N/A", "Average", "Less", "More"]}
              value={findings.gynaeFlow}
              onChange={(value) => onChange({ gynaeFlow: value })}
            />
            <SegmentedField
              label="Dysmenorrhoea"
              options={["-", "N/A", "+", "++", "+++"]}
              value={findings.gynaeDysmenorrhoea}
              onChange={(value) => onChange({ gynaeDysmenorrhoea: value })}
            />
          </div>
        </FindingsSection>
      </div>

      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <FindingsSection title="B. Obstetrics History">
          <div className="grid gap-6 md:grid-cols-2">
            <DurationInputGroup
              label="Married for"
              values={[
                findings.gynaeMarriedYears,
                findings.gynaeMarriedMonths,
                findings.gynaeMarriedDays
              ]}
              onChange={(index, value) => {
                if (index === 0) onChange({ gynaeMarriedYears: value });
                if (index === 1) onChange({ gynaeMarriedMonths: value });
                if (index === 2) onChange({ gynaeMarriedDays: value });
              }}
            />
            <DateTextInput
              label="Marriage Date"
              value={findings.gynaeMarriageDate}
              onChange={(value) => onChange({ gynaeMarriageDate: value })}
            />
            <div className="space-y-1">
              <FindingInput
                label="Para"
                value={findings.gynaePara}
                onChange={(value) => onChange({ gynaePara: value })}
              />
              <p className="text-xs text-muted-foreground">
                Enter a valid value for para like &quot;1+1-1&quot;
              </p>
            </div>
            <FindingInput
              label="Gravida"
              value={findings.gynaeGravida}
              onChange={(value) => onChange({ gynaeGravida: value })}
            />
            <label className="space-y-1 md:col-span-2">
              <FieldLabel>Note for Para</FieldLabel>
              <Textarea
                className="min-h-20 bg-background"
                placeholder="Type here..."
                value={findings.gynaeParaNote}
                onChange={(event) => onChange({ gynaeParaNote: event.target.value })}
              />
            </label>
            <DurationInputGroup
              label="ALC"
              values={[findings.gynaeAlcYears, findings.gynaeAlcMonths, findings.gynaeAlcDays]}
              onChange={(index, value) => {
                if (index === 0) onChange({ gynaeAlcYears: value });
                if (index === 1) onChange({ gynaeAlcMonths: value });
                if (index === 2) onChange({ gynaeAlcDays: value });
              }}
            />
            <DateTextInput
              label="EDD"
              value={findings.gynaeEdd}
              onChange={(value) => onChange({ gynaeEdd: value })}
            />
          </div>
        </FindingsSection>
      </div>

      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <FindingsSection title="C. Per Abdominal (Gynae)">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>NAD</FieldLabel>
              <button
                className={cn(
                  "inline-flex h-10 items-center gap-3 rounded-md px-4 text-sm font-semibold",
                  findings.gynaeNad
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background text-muted-foreground hover:bg-muted"
                )}
                type="button"
                onClick={() => onChange({ gynaeNad: findings.gynaeNad ? "" : "NAD" })}
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-sm border bg-background",
                    findings.gynaeNad ? "border-primary-foreground" : "border-muted-foreground"
                  )}
                />
                NAD
              </button>
            </div>
            <SegmentedField
              label="Tenderness"
              options={["N/A", "Mild", "Moderate", "Severe"]}
              value={findings.gynaeTenderness}
              onChange={(value) => onChange({ gynaeTenderness: value })}
            />
            <label className="space-y-1 md:col-span-2">
              <FieldLabel>Note:</FieldLabel>
              <Textarea
                className="min-h-24 bg-background"
                placeholder="Type here..."
                value={findings.gynaeAbdominalNote}
                onChange={(event) => onChange({ gynaeAbdominalNote: event.target.value })}
              />
            </label>
          </div>
        </FindingsSection>
      </div>
    </div>
  );
}

type MedicationSidebarProps = {
  medicines: RxMedicine[];
  query: string;
  searchPending: boolean;
  searchResults: MedicineSearchResult[];
  showSearchPanel: boolean;
  value: string;
  waitingForDebounce: boolean;
  onAddMedicine: (item: MedicineSearchResult) => void;
  onAddCustomMedicine: (medicine: RxMedicine) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onStatus: (tone: "success" | "warning", text: string) => void;
};

function MedicationSidebar({
  medicines,
  query,
  searchPending,
  searchResults,
  showSearchPanel,
  value,
  waitingForDebounce,
  onAddMedicine,
  onAddCustomMedicine,
  onChange,
  onClear,
  onClose,
  onQueryChange,
  onStatus
}: MedicationSidebarProps) {
  const [searchType, setSearchType] = useState("Trade");
  const [customFormOpen, setCustomFormOpen] = useState(true);
  const [customMedicineExpanded, setCustomMedicineExpanded] = useState(true);
  const [customMedicine, setCustomMedicine] =
    useState<CustomMedicineFormState>(initialCustomMedicineForm);

  function updateCustomMedicine(patch: Partial<CustomMedicineFormState>) {
    setCustomMedicine((current) => ({ ...current, ...patch }));
  }

  function addCurrentQuery() {
    const text = query.trim();
    if (!text) {
      onStatus("warning", "Type a medicine name first.");
      return;
    }
    updateCustomMedicine({ brandName: text });
    onQueryChange("");
    onStatus("success", "Medicine name added to the custom form.");
  }

  function updateCustomMedicineSchedule(schedule: string) {
    const count = schedule === "None" ? 0 : Number.parseInt(schedule, 10);
    setCustomMedicine((current) => ({
      ...current,
      schedule,
      scheduleDoses: Array.from({ length: Number.isNaN(count) ? 0 : count }, (_, index) =>
        current.scheduleDoses[index] ?? ""
      )
    }));
  }

  function updateScheduleDose(index: number, value: string) {
    const nextValue = value.replace(/[^\d.]/g, "");
    setCustomMedicine((current) => {
      const nextDoses = [...current.scheduleDoses];
      nextDoses[index] = nextValue;
      return { ...current, scheduleDoses: nextDoses };
    });
  }

  function toggleInstructionTag(tag: string) {
    setCustomMedicine((current) => ({
      ...current,
      instructionTags: current.instructionTags.includes(tag)
        ? current.instructionTags.filter((item) => item !== tag)
        : [...current.instructionTags, tag]
    }));
  }

  function resetCustomMedicine() {
    setCustomMedicine(customMedicineDefaultsForType(customMedicine.medicineType));
  }

  function closeCustomMedicineForm() {
    resetCustomMedicine();
    setCustomMedicineExpanded(true);
    setCustomFormOpen(false);
  }

  function changeCustomMedicineType(medicineType: string) {
    setCustomMedicine((current) =>
      customMedicineDefaultsForType(medicineType, current.brandName)
    );
  }

  function submitCustomMedicine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const brandName = customMedicine.brandName.trim();
    if (!brandName) {
      onStatus("warning", "Type a medicine name first.");
      return;
    }

    const medicineType = customMedicine.medicineType;
    const duration = formatCustomMedicineDuration(customMedicine);
    const scheduleDose = customMedicine.schedule === "None"
      ? ""
      : customMedicine.scheduleDoses.map((dose) => dose.trim() || "0").join("+");
    const unit = customMedicine.unit === "n/a" ? "" : customMedicine.unit;
    const dose = scheduleDose;
    const instruction = [
      unit,
      customMedicine.customText.trim(),
      ...customMedicine.instructionTags
    ].filter(Boolean).join("\n");

    onAddCustomMedicine({
      brandName,
      dosageForm: medicineType,
      dose,
      duration,
      instruction,
      note: customMedicine.remarks.trim()
    });
    resetCustomMedicine();
    onStatus("success", "Custom medicine added.");
  }

  const selectedMedicineType = customMedicine.medicineType;
  const scheduleCount = customMedicine.schedule === "None"
    ? 0
    : Number.parseInt(customMedicine.schedule, 10);

  return (
    <RightDrawer title="Medication" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex gap-0">
          <div className="relative flex-1">
            <Input
              autoFocus
              className="h-14 rounded-r-none border-primary/50 text-lg focus-visible:ring-primary"
              placeholder="Search..."
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (searchResults[0]) onAddMedicine(searchResults[0]);
                  else addCurrentQuery();
                }
              }}
            />
            {showSearchPanel && (searchPending || searchResults.length > 0 || waitingForDebounce) ? (
              <div className="absolute z-30 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                {searchPending ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching medicines
                  </div>
                ) : null}
                {!searchPending && searchResults.map((item) => (
                  <button
                    key={item.id}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    type="button"
                    onClick={() => onAddMedicine(item)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.brandName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.genericName} {item.strength}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 flex-none" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <select
            className="h-14 w-28 rounded-r-md border border-l-0 bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
          >
            {medicineSearchTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            form={customFormOpen ? "custom-medicine-form" : undefined}
            type={customFormOpen ? "submit" : "button"}
            onClick={() => {
              if (!customFormOpen) setCustomFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Custom Medicine
          </button>
        </div>

        {customFormOpen ? (
          <form
            className="overflow-hidden border bg-[#eeeeee]"
            id="custom-medicine-form"
            onSubmit={submitCustomMedicine}
          >
            <div className="relative p-2">
              <div className="flex flex-wrap items-center gap-3 pr-10">
                <button
                  aria-label="Medicine details"
                  className="inline-flex h-7 w-7 items-center justify-center text-teal-600"
                  type="button"
                  onClick={() => setCustomMedicineExpanded((current) => !current)}
                >
                  <ChevronDown
                    className={cn("h-4 w-4 transition", customMedicineExpanded ? "" : "-rotate-90")}
                  />
                </button>
                <Input
                  className="h-11 w-[238px] max-w-full flex-none rounded-sm bg-background text-base"
                  placeholder="Drug name"
                  value={customMedicine.brandName}
                  onChange={(event) => updateCustomMedicine({ brandName: event.target.value })}
                />
                <select
                  aria-label="Medicine Type"
                  className="sr-only"
                  value={selectedMedicineType}
                  onChange={(event) => changeCustomMedicineType(event.target.value)}
                >
                  {customMedicineTypeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button
                  className="ml-auto h-9 rounded-sm bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
                  type="button"
                  onClick={() => updateCustomMedicine({ customText: "Interval dose" })}
                >
                  Add Interval Dose
                </button>
              </div>
              <Button
                aria-label="Reset custom medicine"
                className="absolute right-2 top-4 h-8 w-8 text-slate-700"
                size="icon"
                type="button"
                variant="ghost"
                onClick={closeCustomMedicineForm}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {customMedicineExpanded ? (
              <div className="space-y-2 px-4 pb-0">
                <div className="flex flex-wrap items-end gap-x-2 gap-y-2">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span>1.Schedule</span>
                      <select
                        className="h-9 w-16 rounded-sm border bg-background px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                        value={customMedicine.schedule}
                        onChange={(event) => updateCustomMedicineSchedule(event.target.value)}
                      >
                        {customMedicineScheduleOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                      {Array.from({ length: Number.isNaN(scheduleCount) ? 0 : scheduleCount }, (_, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <Input
                            className="h-8 w-16 rounded-sm bg-background px-2 text-center font-semibold text-red-600"
                            inputMode="decimal"
                            min="0"
                            type="number"
                            value={customMedicine.scheduleDoses[index] ?? ""}
                            onChange={(event) => updateScheduleDose(index, event.target.value)}
                          />
                          {index < scheduleCount - 1 ? (
                            <button
                              aria-label={`Add interval after dose ${index + 1}`}
                              className="h-8 px-1 text-primary hover:underline"
                              type="button"
                              onClick={() => updateCustomMedicine({ customText: "Interval dose" })}
                            >
                              +
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {customMedicine.schedule === "None" ? (
                        <span className="text-sm text-muted-foreground">No scheduled dose</span>
                      ) : null}
                  </div>

                  <div className="flex flex-col items-start">
                    <span className="text-lg font-semibold leading-5">Continue</span>
                    <input
                      className="mt-1 h-4 w-4 accent-primary"
                      type="checkbox"
                      checked={customMedicine.continueMedicine}
                      onChange={(event) =>
                        updateCustomMedicine({ continueMedicine: event.target.checked })
                      }
                    />
                  </div>

                  <label className="space-y-1 text-xs font-medium">
                    <span className="sr-only">Unit</span>
                      <select
                        className="h-9 w-20 rounded-sm border bg-background px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                        value={customMedicine.unit}
                        onChange={(event) => updateCustomMedicine({ unit: event.target.value })}
                      >
                        {medicationUnitOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                  </label>

                  <div className="flex items-end gap-2">
                    <span className="pb-2 text-sm">for</span>
                    <Input
                      className="h-8 w-16 rounded-sm bg-background px-2 text-center font-semibold text-red-600"
                      min="0"
                      type="number"
                      value={customMedicine.durationValue}
                      onChange={(event) =>
                        updateCustomMedicine({ durationValue: event.target.value })
                      }
                    />
                    <select
                      className="h-9 w-20 rounded-sm border bg-background px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                      value={customMedicine.durationUnit}
                      onChange={(event) => updateCustomMedicine({ durationUnit: event.target.value })}
                    >
                      {customMedicineDurationUnitOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="space-y-1 text-xs font-medium">
                  <span className="sr-only">Custom Instruction</span>
                  <Input
                    className="sr-only"
                    placeholder="Type additional dose instruction..."
                    value={customMedicine.customText}
                    onChange={(event) =>
                      updateCustomMedicine({ customText: event.target.value })
                    }
                  />
                </label>

                <div className="flex flex-wrap gap-1">
                  {medicationInstructionChips.map((tag) => {
                    const selected = customMedicine.instructionTags.includes(tag);

                    return (
                      <button
                        key={tag}
                        className={cn(
                          "rounded-sm px-3 py-1 text-sm transition",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-zinc-300 text-foreground hover:bg-zinc-400"
                        )}
                        type="button"
                        onClick={() => toggleInstructionTag(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <Textarea
                  className="min-h-14 rounded-none border-x-0 border-b-0 bg-amber-50"
                  placeholder="Remarks..."
                  value={customMedicine.remarks}
                  onChange={(event) => updateCustomMedicine({ remarks: event.target.value })}
                />
              </div>
            ) : null}
          </form>
        ) : null}

        {medicines.length ? (
          <div className="rounded-md border">
            <div className="border-b bg-muted px-3 py-2 text-sm font-medium">Selected Medicines</div>
            <div className="divide-y">
              {medicines.map((item, index) => (
                <div key={`${item.brandName}-${index}`} className="px-3 py-2 text-sm">
                  <div className="font-medium">{formatMedicineTitle(item)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatMedicineSummary(item)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <MedicationNoteArea
          value={value}
          onChange={onChange}
          onClearAll={onClear}
        />
      </div>
    </RightDrawer>
  );
}

function MedicationNoteArea({
  value,
  onChange,
  onClearAll
}: {
  value: string;
  onChange: (value: string) => void;
  onClearAll: () => void;
}) {
  return (
    <div className="space-y-3 border-t pt-4">
      <Textarea
        className="min-h-28 resize-y bg-background"
        placeholder="Type here..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          className="inline-flex items-center gap-1 text-primary hover:underline"
          type="button"
          onClick={() => onChange("")}
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </button>
      </div>
      <div className="flex justify-end border-t pt-3">
        <Button size="sm" variant="outline" type="button" onClick={onClearAll}>
          <RotateCcw className="h-4 w-4" />
          Clear All
        </Button>
      </div>
    </div>
  );
}

function SuggestionInput({
  suggKey,
  placeholder,
  onAdd,
  autoFocus
}: {
  suggKey: string;
  placeholder: string;
  onAdd: (name: string) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Only show matches when the user has typed something
  const filtered = query.trim().length > 0
    ? suggestions.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  function handleFocus() {
    // Always read fresh from localStorage so recently-saved items appear immediately
    if (typeof window !== "undefined") setSuggestions(loadSuggestions(suggKey));
    setOpen(true);
  }

  function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    persistSuggestion(suggKey, trimmed);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          autoFocus={autoFocus}
          className="h-10 border-primary/50 focus-visible:ring-primary"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={handleFocus}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(query); } }}
        />
        <Button type="button" onClick={() => handleAdd(query)}>Add</Button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-20 z-30 mt-1 max-h-52 overflow-y-auto rounded-md border bg-card shadow-lg p-2">
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((s) => (
              <div
                key={s}
                className="group flex items-center gap-0.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs cursor-pointer hover:border-primary/50 hover:bg-primary/10"
                onMouseDown={(e) => { e.preventDefault(); handleAdd(s); }}
              >
                <span className="group-hover:text-primary">{s}</span>
                <button
                  type="button"
                  className="ml-0.5 shrink-0 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  title="Remove from saved suggestions"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteSuggestion(suggKey, s);
                    setSuggestions((prev) => prev.filter((x) => x !== s));
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvestigationSidebar({
  investigations,
  onClose,
  onSetInvestigations
}: {
  investigations: InvestigationEntry[];
  onClose: () => void;
  onSetInvestigations: (items: InvestigationEntry[]) => void;
}) {
  function addEntry(name: string) {
    onSetInvestigations([...investigations, { id: crypto.randomUUID(), name, value: "" }]);
  }
  function updateEntry(id: string, patch: Partial<InvestigationEntry>) {
    onSetInvestigations(investigations.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function deleteEntry(id: string) {
    onSetInvestigations(investigations.filter((i) => i.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">Investigation</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}><Check className="h-4 w-4" />Done</Button>
            <Button aria-label="Close" size="icon" type="button" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <SuggestionInput suggKey={SUGG_INVESTIGATION} placeholder="Type investigation and press Enter…" onAdd={addEntry} autoFocus />
          </div>
          {investigations.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">No investigations added yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Result / Value</th>
                    <th className="px-3 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {investigations.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-2 py-1.5">
                        <input className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Name" value={inv.name} onChange={(e) => updateEntry(inv.id, { name: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Result" value={inv.value} onChange={(e) => updateEntry(inv.id, { value: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button type="button" className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteEntry(inv.id)}><Trash2 className="h-3 w-3" />Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DiagnosisSidebar({
  diagnoses,
  onClose,
  onSetDiagnoses
}: {
  diagnoses: DiagnosisEntry[];
  onClose: () => void;
  onSetDiagnoses: (items: DiagnosisEntry[]) => void;
}) {
  function addEntry(name: string) {
    onSetDiagnoses([...diagnoses, { id: crypto.randomUUID(), name, value: "" }]);
  }
  function updateEntry(id: string, patch: Partial<DiagnosisEntry>) {
    onSetDiagnoses(diagnoses.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function deleteEntry(id: string) {
    onSetDiagnoses(diagnoses.filter((d) => d.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">Diagnosis</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}><Check className="h-4 w-4" />Done</Button>
            <Button aria-label="Close" size="icon" type="button" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <SuggestionInput suggKey={SUGG_DIAGNOSIS} placeholder="Type diagnosis and press Enter…" onAdd={addEntry} autoFocus />
          </div>
          {diagnoses.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">No diagnoses added yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Diagnosis Name</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {diagnoses.map((d) => (
                    <tr key={d.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-2 py-1.5">
                        <input className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Name" value={d.name} onChange={(e) => updateEntry(d.id, { name: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Value" value={d.value ?? ""} onChange={(e) => updateEntry(d.id, { value: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button type="button" className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteEntry(d.id)}><Trash2 className="h-3 w-3" />Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

type SavedAdvice = { id: string; name: string; text: string };

function loadAdviceLibrary(): SavedAdvice[] {
  try { return JSON.parse(localStorage.getItem(ADVICE_LIBRARY_KEY) ?? "[]"); } catch { return []; }
}

function saveAdviceLibrary(items: SavedAdvice[]) {
  localStorage.setItem(ADVICE_LIBRARY_KEY, JSON.stringify(items));
}

function AdviceSidebar({
  value,
  onChange,
  onClear,
  onClose,
  onStatus
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onStatus: (tone: "success" | "warning", text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [library, setLibrary] = useState<SavedAdvice[]>(() => loadAdviceLibrary());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localText, setLocalText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editText, setEditText] = useState("");
  const valueTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = valueTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [localText]);

  const trimmedQuery = query.trim();
  const filtered = trimmedQuery.length > 0
    ? library.filter((a) => a.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : [];

  function saveNew() {
    const name = newName.trim();
    const text = newText.trim();
    if (!name) { onStatus("warning", "Enter a name for the advice."); return; }
    if (!text) { onStatus("warning", "Enter the advice text."); return; }
    const item: SavedAdvice = { id: Date.now().toString(), name, text };
    const updated = [item, ...library];
    setLibrary(updated);
    saveAdviceLibrary(updated);
    setNewName("");
    setNewText("");
    setAdding(false);
    onStatus("success", "Advice saved.");
  }

  function deleteItem(id: string) {
    const updated = library.filter((a) => a.id !== id);
    setLibrary(updated);
    saveAdviceLibrary(updated);
    if (selectedId === id) setSelectedId(null);
    onStatus("success", "Advice deleted.");
  }

  function saveEdit(id: string) {
    const name = editName.trim();
    const text = editText.trim();
    if (!name) { onStatus("warning", "Enter a name for the advice."); return; }
    if (!text) { onStatus("warning", "Enter the advice text."); return; }
    const updated = library.map((a) => a.id === id ? { ...a, name, text } : a);
    setLibrary(updated);
    saveAdviceLibrary(updated);
    setEditingId(null);
    onStatus("success", "Advice updated.");
  }

  function insertAdvice(text: string) {
    onChange(value ? `${value}\n${text}` : text);
  }

  const selected = selectedId ? library.find((a) => a.id === selectedId) ?? null : null;
  const editing = editingId ? library.find((a) => a.id === editingId) ?? null : null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">Advice</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}><Check className="h-4 w-4" />Done</Button>
            <Button aria-label="Close" size="icon" type="button" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 relative">
            <div className="flex gap-2">
              <Input
                autoFocus
                className="h-10 border-primary/50 focus-visible:ring-primary"
                placeholder="Search advice by name..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); setSelectedId(null); setEditingId(null); }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => window.setTimeout(() => setDropdownOpen(false), 150)}
              />
              <Button type="button" onClick={() => { setAdding((v) => !v); setNewName(""); setNewText(""); }}>
                <Plus className="h-4 w-4" />
                Add Advice
              </Button>
            </div>
            {dropdownOpen && filtered.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-md border bg-card p-2 shadow-lg">
                <div className="flex flex-wrap gap-1.5">
                  {filtered.map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer rounded-full border border-border bg-muted px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      onMouseDown={(e) => { e.preventDefault(); insertAdvice(item.text); setSelectedId(item.id); setLocalText(item.text); setQuery(""); setDropdownOpen(false); }}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dropdownOpen && trimmedQuery && filtered.length === 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1 rounded-md border bg-card p-3 shadow-lg">
                <p className="text-center text-sm text-muted-foreground">No advice found.</p>
              </div>
            )}
          </div>

          {adding && (
            <div className="mb-4 space-y-2 rounded-md border bg-background p-3">
              <Input
                autoFocus
                placeholder="Advice name (e.g. Post-Op Care)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("advice-new-text")?.focus(); } }}
              />
              <textarea
                id="advice-new-text"
                className="w-full resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Advice text..."
                rows={1}
                value={newText}
                onChange={(e) => { setNewText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
              />
              <div className="flex justify-end gap-2">
                <button className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" type="button" onClick={() => { setAdding(false); setNewName(""); setNewText(""); }}>Cancel</button>
                <Button type="button" onClick={saveNew}>Save</Button>
              </div>
            </div>
          )}

          {selected && !editing && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="shrink-0 pt-1.5 text-sm font-semibold">{selected.name}</span>
              <textarea
                ref={valueTextareaRef}
                className="min-h-0 flex-1 resize-none overflow-hidden rounded-md border bg-background px-2 py-1.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                rows={1}
                value={localText}
                onChange={(e) => {
                  setLocalText(e.target.value);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => { setEditingId(selected.id); setEditName(selected.name); setEditText(selected.text); }}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {editing && (
            <div className="space-y-2 rounded-md border border-primary/30 bg-background p-3">
              <Input autoFocus placeholder="Advice name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <textarea
                className="w-full resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Advice text..." rows={1} value={editText}
                onChange={(e) => { setEditText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
              />
              <div className="flex justify-end gap-2">
                <button className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                <Button type="button" onClick={() => saveEdit(editingId!)}>Save</Button>
              </div>
            </div>
          )}

        </div>
      </aside>
    </div>
  );
}

type TagNoteSidebarProps = {
  addCustomLabel?: string;
  title: string;
  value: string;
  onAddTag: (tag: string) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onStatus: (tone: "success" | "warning", text: string) => void;
};

function TagNoteSidebar({
  addCustomLabel,
  title,
  value,
  onAddTag,
  onChange,
  onClear,
  onClose,
  onStatus
}: TagNoteSidebarProps) {
  const [query, setQuery] = useState("");

  function addCustom() {
    const text = query.trim();
    if (!text) {
      onStatus("warning", `Type a ${title.toLowerCase()} item first.`);
      return;
    }
    onAddTag(text);
    setQuery("");
  }

  return (
    <RightDrawer title={title} onClose={onClose}>
      <div className="space-y-5">
        <Input
          autoFocus
          className="h-14 border-primary/50 text-lg focus-visible:ring-primary"
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
        />

        {addCustomLabel ? (
          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-1 text-primary hover:underline"
              type="button"
              onClick={addCustom}
            >
              <Plus className="h-4 w-4" />
              {addCustomLabel}
            </button>
          </div>
        ) : null}

        <NoteTextArea
          placeholder="Type here..."
          value={value}
          onChange={onChange}
          onClear={onClear}
        />
      </div>
    </RightDrawer>
  );
}

type FollowUpSidebarProps = {
  date: string;
  note: string;
  fees: string;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onFeesChange: (value: string) => void;
};

function FollowUpSidebar({
  date,
  note,
  fees,
  onClose,
  onDateChange,
  onNoteChange,
  onFeesChange
}: FollowUpSidebarProps) {
  const selectedDate = date ? new Date(`${date}T00:00:00`) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const calendarDays = buildCalendarDays(visibleMonth);
  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
  const todayIso = formatInputDate(new Date());

  useEffect(() => {
    if (date && date < todayIso) onDateChange("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDateFromDays(days: number) {
    const next = new Date();
    next.setDate(next.getDate() + days);
    onDateChange(formatInputDate(next));
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  function moveMonth(direction: -1 | 1) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <RightDrawer title="Follow-Up" onClose={onClose} widthClass="md:w-1/2">
      <div className="flex h-full flex-col gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-foreground">Fees</span>
          <Input
            className="h-8 rounded-full bg-background px-4 text-sm"
            placeholder="Enter fees..."
            value={fees}
            onChange={(event) => onFeesChange(event.target.value)}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
          <div className="flex h-12 shrink-0 items-center justify-between bg-muted px-3">
            <button
              aria-label="Previous month"
              className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-primary"
              type="button"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-base font-medium">{monthLabel}</div>
            <button
              aria-label="Next month"
              className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-primary"
              type="button"
              onClick={() => moveMonth(1)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid shrink-0 grid-cols-7 border-t text-center text-sm font-medium text-muted-foreground">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((item) => (
              <div key={item} className="py-2">
                {item}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 text-center text-sm [grid-auto-rows:1fr]">
            {calendarDays.map((item) => {
              const inputDate = formatInputDate(item.date);
              const isSelected = inputDate === date;
              const isOutside = item.date.getMonth() !== visibleMonth.getMonth();
              const isPast = inputDate < todayIso;

              return (
                <div key={inputDate} className="flex items-center justify-center p-0.5">
                  <button
                    disabled={isPast}
                    className={cn(
                      "flex h-full w-full items-center justify-center rounded text-sm",
                      isPast
                        ? "cursor-not-allowed text-muted-foreground/30 line-through"
                        : isSelected
                          ? "bg-muted-foreground text-background"
                          : isOutside
                            ? "text-muted-foreground/25 hover:bg-muted"
                            : "text-foreground hover:bg-muted"
                    )}
                    type="button"
                    onClick={() => onDateChange(inputDate)}
                  >
                    {item.date.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-0">
          {[
            ["3 days", 3],
            ["5 days", 5],
            ["7 days", 7],
            ["15 days", 15],
            ["1 month", 30],
            ["1.5 months", 45],
            ["2 months", 60],
            ["3 months", 90],
            ["6 months", 180],
            ["1 Year", 365]
          ].map(([label, days]) => (
            <button
              key={label}
              className="border px-2.5 py-1.5 text-xs hover:bg-muted"
              type="button"
              onClick={() => setDateFromDays(days as number)}
            >
              {label}
            </button>
          ))}
        </div>

        <Textarea
          className="shrink-0 min-h-16 bg-background"
          placeholder="Follow-up note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </div>
    </RightDrawer>
  );
}

type ReferralSidebarProps = {
  referrals: ReferralEntry[];
  savedDoctors: SavedReferralDoctor[];
  onClose: () => void;
  onAddDoctor: (doc: Omit<SavedReferralDoctor, "id">) => void;
  onUpdateDoctor: (id: string, patch: Partial<Omit<SavedReferralDoctor, "id">>) => void;
  onDeleteDoctor: (id: string) => void;
  onToggleDoctor: (doc: SavedReferralDoctor) => void;
};

function ReferralSidebar({
  referrals,
  savedDoctors,
  onClose,
  onAddDoctor,
  onUpdateDoctor,
  onDeleteDoctor,
  onToggleDoctor,
}: ReferralSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<SavedReferralDoctor | null>(null);
  const [formName, setFormName] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formChamberAddress, setFormChamberAddress] = useState("");
  const [formContact, setFormContact] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  function openAddDialog() {
    setEditingDoctor(null);
    setFormName(""); setFormSpecialty(""); setFormChamberAddress(""); setFormContact("");
    setDialogOpen(true);
  }

  function openEditDialog(doc: SavedReferralDoctor) {
    setEditingDoctor(doc);
    setFormName(doc.name); setFormSpecialty(doc.specialty);
    setFormChamberAddress(doc.chamberAddress); setFormContact(doc.contact);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formName.trim()) return;
    if (editingDoctor) {
      onUpdateDoctor(editingDoctor.id, {
        name: formName.trim(), specialty: formSpecialty.trim(),
        chamberAddress: formChamberAddress.trim(), contact: formContact.trim(),
      });
    } else {
      onAddDoctor({
        name: formName.trim(), specialty: formSpecialty.trim(),
        chamberAddress: formChamberAddress.trim(), contact: formContact.trim(),
      });
    }
    setDialogOpen(false);
  }

  function isDoctorSelected(doc: SavedReferralDoctor) {
    return referrals.some((r) => r.name === doc.name && r.specialty === doc.specialty);
  }

  const filteredDoctors = searchQuery.trim()
    ? savedDoctors.filter((doc) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : savedDoctors;

  return (
    <RightDrawer title="Referral" onClose={onClose}>
      <div className="space-y-4 pt-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8 text-sm"
              placeholder="Search doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="button" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {savedDoctors.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No referral doctors saved. Click "Add" to add one.
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No doctors match &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredDoctors.map((doc) => {
              const selected = isDoctorSelected(doc);
              return (
                <button
                  key={doc.id}
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition hover:border-primary/40",
                    selected ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                  )}
                  onClick={() => onToggleDoctor(doc)}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                    )}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold leading-tight">{doc.name}</p>
                    {doc.specialty && <p className="truncate text-[10px] text-muted-foreground">{doc.specialty}</p>}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <span
                      role="button"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(doc); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                    <span
                      role="button"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); onDeleteDoctor(doc.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {dialogOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-base font-semibold">
                {editingDoctor ? "Edit Referral Doctor" : "Add Referral Doctor"}
              </h2>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Doctor&apos;s Name <span className="text-destructive">*</span>
                </label>
                <Input
                  autoFocus
                  placeholder="e.g. Dr. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Speciality</label>
                <Input
                  placeholder="e.g. Cardiologist"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Chamber Address</label>
                <Input
                  placeholder="Chamber / clinic address"
                  value={formChamberAddress}
                  onChange={(e) => setFormChamberAddress(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Contact</label>
                <Input
                  placeholder="Phone or contact info"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                />
              </div>
              <div className="flex gap-2 border-t pt-3">
                <button className="flex-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" type="button" onClick={() => setDialogOpen(false)}>Cancel</button>
                <Button type="button" className="flex-1" disabled={!formName.trim()} onClick={handleSubmit}>
                  {editingDoctor ? "Save Changes" : "Add Doctor"}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </RightDrawer>
  );
}

function VisionSidebar({
  vision,
  onClose,
  onPrimaryChange,
  onPrimaryEyeChange,
  onSecondaryChange,
  onSecondaryEyeChange,
  onAddSecondary,
  onRemoveSecondary,
}: {
  vision: VisionState;
  onClose: () => void;
  onPrimaryChange: (patch: Partial<Omit<GlassPrescriptionState, "right" | "left">>) => void;
  onPrimaryEyeChange: (side: "right" | "left", field: keyof EyePower, value: string) => void;
  onSecondaryChange: (patch: Partial<Omit<GlassPrescriptionState, "right" | "left">>) => void;
  onSecondaryEyeChange: (side: "right" | "left", field: keyof EyePower, value: string) => void;
  onAddSecondary: () => void;
  onRemoveSecondary: () => void;
}) {
  return (
    <RightDrawer title="Glass Prescription" onClose={onClose} widthClass="md:w-1/2">
      <div className="space-y-4 py-3">
        <GlassPrescriptionForm
          prescription={vision}
          title="Primary Glass Prescription"
          onChange={onPrimaryChange}
          onEyeChange={onPrimaryEyeChange}
        />
        {!vision.secondaryGlass ? (
          <Button type="button" variant="outline" onClick={onAddSecondary}>
            <Plus className="h-4 w-4" />
            Add Secondary Glass
          </Button>
        ) : null}
        {vision.secondaryGlass ? (
          <GlassPrescriptionForm
            prescription={vision.secondaryGlass}
            title="Secondary Glass Prescription"
            onChange={onSecondaryChange}
            onEyeChange={onSecondaryEyeChange}
            onRemove={onRemoveSecondary}
            sphereExtraOptions={["Frosted Glass"]}
          />
        ) : null}
      </div>
    </RightDrawer>
  );
}

function ReferralTableInput({
  ariaLabel,
  value,
  onChange
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-r p-1">
      <input
        aria-label={ariaLabel}
        className="h-9 w-full rounded-sm border-0 bg-transparent px-2 text-sm outline-none focus:bg-background focus:ring-2 focus:ring-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function RightDrawer({
  title,
  children,
  onClose,
  widthClass = "md:w-[60%]"
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  widthClass?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className={cn("ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft", widthClass)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              aria-label={`Close ${title}`}
              type="button"
              variant="destructive"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-[10px] pb-[10px] pt-0">{children}</div>
      </aside>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-8 border-b-2 px-5 text-base font-semibold",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FindingsSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b last:border-b-0">
      <h3 className="border-b-2 border-border/60 bg-muted/60 px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-foreground dark:bg-muted/40">{title}</h3>
      <div className="p-3">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function FindingInput({
  label,
  value,
  onChange,
  className
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <Input className={className} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DateTextInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex">
        <Input
          className="rounded-r-none"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          aria-label={`${label} calendar`}
          className="inline-flex h-9 w-11 items-center justify-center rounded-r-md border border-l-0 bg-primary text-primary-foreground"
          title={`${label} calendar`}
          type="button"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}

function SplitInputGroup({
  label,
  separator,
  values,
  onChange
}: {
  label: string;
  separator: string;
  values: [string, string];
  onChange: (index: 0 | 1, value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Input value={values[0]} onChange={(event) => onChange(0, event.target.value)} />
        <span className="text-lg font-semibold text-foreground">{separator}</span>
        <Input value={values[1]} onChange={(event) => onChange(1, event.target.value)} />
      </div>
    </label>
  );
}

function DurationInputGroup({
  label,
  values,
  onChange
}: {
  label: string;
  values: [string, string, string];
  onChange: (index: 0 | 1 | 2, value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-3 overflow-hidden rounded-md border">
        {(["Y", "M", "D"] as const).map((placeholder, index) => (
          <Input
            key={placeholder}
            className="rounded-none border-0 border-r last:border-r-0"
            placeholder={placeholder}
            value={values[index]}
            onChange={(event) => onChange(index as 0 | 1 | 2, event.target.value)}
          />
        ))}
      </div>
    </label>
  );
}

function SegmentedField({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap overflow-hidden rounded-md border">
        {options.map((option) => (
          <button
            key={option}
            className={cn(
              "min-h-9 border-r px-4 text-sm font-medium last:border-r-0",
              value === option
                ? "bg-muted-foreground text-background"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
            type="button"
            onClick={() => onChange(value === option ? "" : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function TriStateControl({
  value,
  onChange
}: {
  value: TriStateValue;
  onChange: (value: TriStateValue) => void;
}) {
  const options: Array<{ label: string; value: TriStateValue; icon?: ReactNode }> = [
    { label: "No", value: "no", icon: <Ban className="h-4 w-4" /> },
    { label: "N/A", value: "na" },
    { label: "Yes", value: "yes", icon: <Check className="h-4 w-4" /> }
  ];

  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border">
      {options.map((option) => (
        <button
          key={option.value}
          aria-label={option.label}
          className={cn(
            "flex h-10 min-w-11 items-center justify-center border-r px-3 text-sm font-semibold last:border-r-0",
            value === option.value
              ? "bg-muted-foreground text-background"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
          title={option.label}
          type="button"
          onClick={() => onChange(value === option.value ? "" : option.value)}
        >
          {option.icon ?? option.label}
        </button>
      ))}
    </div>
  );
}

function NoteTextArea({
  placeholder,
  value,
  onChange,
  onClear
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <Textarea
        className="min-h-28 resize-y bg-background"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3 border-b pb-2 text-sm">
        <button
          className="inline-flex items-center gap-1 text-primary hover:underline"
          type="button"
          onClick={onClear}
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}

type PrescriptionOptionTileProps = {
  title: string;
  hasContent: boolean;
  preview?: ReactNode;
  onClear: () => void;
  onOpen: () => void;
  className?: string;
};

function CollapsedPanelButton({
  panel,
  title,
  hasContent,
  onOpen
}: {
  panel: PanelKey;
  title: string;
  hasContent: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      aria-label={`Open ${title}`}
      className="relative flex h-12 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted hover:text-primary"
      title={title}
      type="button"
      onClick={onOpen}
    >
      <PanelGlyph panel={panel} />
      {hasContent ? (
        <span
          aria-label="Has details"
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary"
          title="Has details"
        />
      ) : null}
    </button>
  );
}

function PanelGlyph({ panel }: { panel: PanelKey }) {
  if (panel === "history" || panel === "followUp") return <CalendarDays className="h-4 w-4" />;
  if (panel === "findings" || panel === "investigation") return <Search className="h-4 w-4" />;
  if (panel === "diagnosis") return <Check className="h-4 w-4" />;
  if (panel === "medication") return <Plus className="h-4 w-4" />;
  if (panel === "vision") return <Settings className="h-4 w-4" />;
  if (panel === "referral") return <UserPlus className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function PrescriptionOptionTile({
  title,
  hasContent,
  preview,
  onClear,
  onOpen,
  className
}: PrescriptionOptionTileProps) {
  return (
    <section
      aria-label={`Open ${title}`}
      className={cn("cursor-pointer border-b border-border/70 px-4 py-2 outline-none last:border-b-0 hover:bg-background/45 focus-visible:ring-2 focus-visible:ring-primary", className)}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-semibold uppercase text-muted-foreground">
            {title}
            {hasContent ? (
              <span
                aria-label="Has details"
                className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle"
                title="Has details"
              />
            ) : null}
          </h2>
          {preview}
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <PanelIconButton title="Clear All" onClick={onClear}>
            <RotateCcw className="h-4 w-4" />
          </PanelIconButton>
        </div>
      </div>
    </section>
  );
}

function PanelIconButton({
  title,
  children,
  onClick
}: {
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-primary"
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FloatingPadButton({
  title,
  children,
  onClick
}: {
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={title}
      className="group relative flex h-11 items-center justify-center border-b text-muted-foreground last:border-b-0 hover:bg-muted hover:text-primary"
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
      <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-md border bg-card px-2 py-1 text-xs text-foreground shadow-soft group-hover:block">
        {title}
      </span>
    </button>
  );
}

function PanelDialog({
  title,
  children,
  size = "default",
  onClose
}: {
  title: string;
  children: ReactNode;
  size?: "default" | "wide";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className={cn(
          "ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft",
          size === "wide" ? "md:w-[50%]" : "md:w-[60%]"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              aria-label="Close dialog"
              size="icon"
              title="Close dialog"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 rounded-md border bg-background p-2 text-sm md:grid-cols-[110px_minmax(0,1fr)] md:items-center">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PatientSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

type PatientRegistrationDialogProps = {
  asSidebar?: boolean;
  error: string;
  form: PatientFormState;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (patch: Partial<PatientFormState>) => void;
  title?: string;
  submitLabel?: string;
};

function PatientRegistrationDialog({
  asSidebar = false,
  error,
  form,
  isSaving,
  onClose,
  onSubmit,
  onUpdate,
  title = "Register New Patient",
  submitLabel = "Register Patient"
}: PatientRegistrationDialogProps) {
  const genderLabels = ["Male", "Female", "Other"] as const;
  const genderValues = ["MALE", "FEMALE", "OTHER"] as const;

  // ── Phone search ────────────────────────────────────────────────────────
  const token = useSessionStore((s) => s.accessToken) ?? "";
  const [phoneSearchDismissed, setPhoneSearchDismissed] = useState(false);

  // Reset dismissal whenever the mobile number changes
  const prevMobileRef = useRef(form.mobile);
  if (form.mobile !== prevMobileRef.current) {
    prevMobileRef.current = form.mobile;
    if (phoneSearchDismissed) setPhoneSearchDismissed(false);
  }

  const debouncedMobile = useDebounce(form.mobile, 350);
  const phoneSearchQuery = useQuery({
    queryKey: ["reg-phone-search", debouncedMobile],
    queryFn: () => searchPatients(debouncedMobile, token),
    enabled: debouncedMobile.length >= 4 && !!token,
    staleTime: 30_000,
  });
  const phoneResults = phoneSearchQuery.data?.data ?? [];
  const showPhoneDropdown = phoneResults.length > 0 && !phoneSearchDismissed && debouncedMobile.length >= 4;

  function fillFromPatient(patient: Patient) {
    onUpdate({
      name: patient.name,
      mobile: patient.phone?.replace(/^\+88/, "") ?? form.mobile,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth ?? "",
      ageYears: patient.ageYears != null ? String(patient.ageYears) : "",
      ageMonths: patient.ageMonths != null ? String(patient.ageMonths) : "",
      ageDays: patient.ageDays != null ? String(patient.ageDays) : "",
      bloodGroup: patient.bloodGroup ?? "",
    });
    setPhoneSearchDismissed(true);
  }
  // ────────────────────────────────────────────────────────────────────────

  const formFields = (
    <>
      <p className="text-xs font-semibold text-muted-foreground">Patient Information</p>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Name */}
      <label className="block space-y-0.5">
        <span className="text-sm font-medium"><span className="text-destructive">*</span> Patient&apos;s Name</span>
        <Input
          autoFocus
          className="h-9 rounded-xl"
          placeholder="Type patient's name here"
          value={form.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </label>

      {/* Phone — search box */}
      <div className="relative space-y-0.5">
        <span className="text-sm font-medium"><span className="text-destructive">*</span> Mobile Number</span>
        <div className="flex overflow-hidden rounded-xl border focus-within:ring-1 focus-within:ring-primary">
          <span className="inline-flex items-center border-r bg-muted px-3 text-sm text-muted-foreground">+88</span>
          <input
            className="h-9 flex-1 bg-background px-3 text-sm outline-none"
            inputMode="tel"
            maxLength={11}
            placeholder="01XXXXXXXXX"
            value={form.mobile}
            onChange={(e) => onUpdate({ mobile: e.target.value.replace(/\D/g, "").slice(0, 11) })}
          />
          <span className={cn(
            "flex items-center pr-3 text-xs tabular-nums",
            form.mobile.length === 11 ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {phoneSearchQuery.isFetching
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <span>{form.mobile.length}/11</span>
            }
          </span>
        </div>

        {/* Search results dropdown */}
        {showPhoneDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {phoneResults.length} patient{phoneResults.length > 1 ? "s" : ""} found — select to fill form
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setPhoneSearchDismissed(true)}
              >
                ✕
              </button>
            </div>
            {phoneResults.map((patient) => {
              const ageParts = [
                patient.ageYears != null ? `${patient.ageYears}Y` : "",
                patient.ageMonths != null ? `${patient.ageMonths}M` : "",
              ].filter(Boolean);
              const genderLabel = patient.gender === "MALE" ? "Male" : patient.gender === "FEMALE" ? "Female" : "Other";
              return (
                <button
                  key={patient.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted"
                  onClick={() => fillFromPatient(patient)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{patient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[ageParts.join(" "), genderLabel, patient.phone?.replace(/^\+88/, "")].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-primary">Select</span>
                </button>
              );
            })}
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted"
              onClick={() => setPhoneSearchDismissed(true)}
            >
              + Register as new patient with this number
            </button>
          </div>
        )}
      </div>

      {/* DOB + Age */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <span className="text-sm font-medium">Date of Birth</span>
          <DatePickerInput
            className="h-9 w-full rounded-xl px-3"
            placeholder="dd/mm/yyyy"
            value={form.dateOfBirth}
            onChange={(iso) => onUpdate({ dateOfBirth: iso, ...calcAgeFromDOB(iso) })}
          />
        </div>
        <div className="space-y-0.5">
          <span className="text-sm font-medium"><span className="text-destructive">*</span> Age</span>
          <div className="grid grid-cols-3 gap-1">
            <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Yr"
              value={form.ageYears} onChange={(e) => onUpdate({ ageYears: e.target.value.replace(/\D/g, "") })} />
            <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Mo"
              value={form.ageMonths} onChange={(e) => onUpdate({ ageMonths: e.target.value.replace(/\D/g, "") })} />
            <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Dy"
              value={form.ageDays} onChange={(e) => onUpdate({ ageDays: e.target.value.replace(/\D/g, "") })} />
          </div>
          <p className="text-[10px] text-muted-foreground">At least one field required</p>
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-0.5">
        <span className="text-sm font-medium"><span className="text-destructive">*</span> Gender</span>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border">
          {genderLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              className={cn(
                "h-9 border-r text-sm font-medium last:border-r-0 transition-colors",
                form.gender === genderValues[i]
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
              onClick={() => onUpdate({ gender: genderValues[i] })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Blood Group */}
      <div className="space-y-0.5">
        <span className="text-sm font-medium">Blood Group</span>
        <div className="grid grid-cols-8 overflow-hidden rounded-xl border">
          {bloodGroups.map((bg) => (
            <button
              key={bg}
              type="button"
              className={cn(
                "h-9 border-r text-xs font-medium last:border-r-0 transition-colors",
                form.bloodGroup === bg
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
              onClick={() => onUpdate({ bloodGroup: form.bloodGroup === bg ? "" : bg })}
            >
              {bg}
            </button>
          ))}
        </div>
      </div>

      {/* Occupation */}
      <div className="space-y-0.5">
        <span className="text-sm font-medium">Occupation</span>
        <select
          className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          value={form.occupation}
          onChange={(e) => onUpdate({ occupation: e.target.value })}
        >
          <option value="">Select Occupation</option>
          {occupations.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Create prescription toggle */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/40 px-4 py-2.5 text-sm">
        <input
          checked={form.createPrescription}
          className="h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(e) => onUpdate({ createPrescription: e.target.checked })}
        />
        <span>Create prescription after registration</span>
      </label>
    </>
  );

  const resetBtn = (
    <Button
      className="h-9 rounded-xl text-sm"
      type="button"
      variant="outline"
      onClick={() => onUpdate({
        name: "", mobile: "", gender: "MALE", dateOfBirth: "",
        ageYears: "", ageMonths: "", ageDays: "",
        bloodGroup: "", occupation: "", createPrescription: false
      })}
    >
      Reset
    </Button>
  );

  const submitBtn = (
    <Button className="h-9 rounded-xl text-sm" disabled={isSaving} type="submit">
      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {submitLabel}
    </Button>
  );

  if (asSidebar) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

        {/* Right sidebar — 50% of screen */}
        <form
          className="fixed right-0 top-0 z-50 flex h-full w-1/2 flex-col bg-card shadow-2xl"
          style={{ animation: "slideInFromRight 0.25s ease-out" }}
          onClick={(e) => e.stopPropagation()}
          onSubmit={onSubmit}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b bg-primary/5 px-5 py-3">
            <h2 className="text-base font-semibold text-primary">{title}</h2>
            <button
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
              type="button"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
            {formFields}
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t bg-card px-5 py-3">
            <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
              {resetBtn}
              {submitBtn}
            </div>
          </div>
        </form>

        <style>{`
          @keyframes slideInFromRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative flex min-h-full items-start justify-center p-3 py-4">
        <form
          className="relative w-full max-w-lg rounded-2xl bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onSubmit={onSubmit}
        >
          <div className="flex items-center justify-between rounded-t-2xl border-b bg-primary/5 px-5 py-2.5">
            <h2 className="text-base font-semibold text-primary">{title}</h2>
            <button
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
              type="button"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-1.5 px-4 py-3">
            {formFields}
            <div className="grid gap-2 pt-1 sm:grid-cols-[72px_minmax(0,1fr)]">
              {resetBtn}
              {submitBtn}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequiredLabel({
  children,
  htmlFor
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="text-sm font-medium" htmlFor={htmlFor}>
      <span className="text-destructive">*</span>
      {children}
    </label>
  );
}

function AgeInput({
  label,
  placeholder,
  required = false,
  value,
  onChange
}: {
  label: string;
  placeholder: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {required ? <span className="text-destructive">*</span> : null}
        {label}
      </label>
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
      />
    </div>
  );
}

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function splitTextLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCustomMedicineDuration(medicine: CustomMedicineFormState) {
  const value = medicine.durationValue.trim();
  const duration = value
    ? `${value} ${Number(value) === 1 ? medicine.durationUnit : `${medicine.durationUnit}s`}`
    : "";

  return [duration, medicine.continueMedicine ? "Continue" : ""].filter(Boolean).join("\n");
}

function formatMedicineTitle(item: RxMedicine) {
  return [item.dosageForm, item.brandName, item.strength]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMedicineDetailLines(item: RxMedicine) {
  const dose = item.dose.trim();
  const instruction = item.instruction.trim();
  const duration = item.duration.trim();
  const note = item.note?.trim();

  if (item.dosageForm === "Eye Drop") {
    const doseLine = [dose, instruction, duration].filter(Boolean).join(" x ");
    return [doseLine, note ? `Remarks: ${note}` : ""].filter(Boolean);
  }

  if (item.dosageForm === "Eye Gel") {
    const durationText = duration ? `for ${duration}` : "";
    const doseLine = [dose, instruction, durationText].filter(Boolean).join(" ");
    return [doseLine, note ? `Remarks: ${note}` : ""].filter(Boolean);
  }

  if (item.dosageForm === "Inj.") {
    const doseLine = [dose, instruction, duration].filter(Boolean).join(" ");
    return [doseLine, note ? `Remarks: ${note}` : ""].filter(Boolean);
  }

  return [
    dose,
    ...instruction.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    ...duration.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    note ? `Remarks: ${note}` : ""
  ].filter(Boolean);
}

function formatMedicineSummary(item: RxMedicine) {
  return getMedicineDetailLines(item).join(" - ");
}

function referralHasContent(referral: ReferralEntry) {
  return Boolean(
    referral.name.trim() ||
      referral.phone.trim() ||
      referral.specialty.trim() ||
      referral.additionalInfo.trim()
  );
}

function glassPrescriptionHasContent(prescription: GlassPrescriptionState) {
  return Object.values(prescription.right).some(Boolean)
    || Object.values(prescription.left).some(Boolean)
    || Boolean(prescription.add)
    || Boolean(prescription.ipd)
    || prescription.glassFeatures.length > 0
    || Boolean(prescription.lensType)
    || Boolean(prescription.note.trim());
}

function getGlassPrescriptionPreview(prescription: GlassPrescriptionState) {
  return [
    prescription.right.sphere,
    prescription.right.cyl,
    prescription.left.sphere,
    prescription.left.cyl,
    prescription.add ? `Near Add: ${prescription.add} DS` : "",
    prescription.glassFeatures.length ? `Glass Coating: ${prescription.glassFeatures.join(" + ")}` : "",
    prescription.lensType,
    prescription.note
  ]
    .filter(Boolean)
    .join(" / ");
}

function buildGlassPrescriptionText(vision: VisionState) {
  const sections = [
    formatGlassPrescriptionBlock("Primary Glass Prescription", vision),
    vision.secondaryGlass
      ? formatGlassPrescriptionBlock("Secondary Glass Prescription", vision.secondaryGlass)
      : ""
  ].filter(Boolean);

  return sections.join("\n\n");
}

function formatGlassPrescriptionBlock(title: string, prescription: GlassPrescriptionState) {
  if (!glassPrescriptionHasContent(prescription)) return "";

  return [
    title,
    formatEyePowerLine("Right Eye", prescription.right),
    formatEyePowerLine("Left Eye", prescription.left),
    prescription.add ? `Near Add: ${prescription.add} DS` : "",
    prescription.ipd ? `IPD: ${prescription.ipd} mm` : "",
    prescription.glassFeatures.length
      ? `Glass Coating: ${prescription.glassFeatures.join(" + ")}`
      : "",
    prescription.lensType ? `Lens Type: ${prescription.lensType}` : "",
    prescription.note ? `Remarks: ${prescription.note}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEyePowerLine(label: string, eye: EyePower) {
  const values = [
    eye.sphere ? `Sphere ${eye.sphere}` : "",
    eye.cyl ? `CYL ${eye.cyl}` : "",
    eye.axis ? `Axis ${eye.axis}` : "",
    eye.va ? `VA ${eye.va}` : ""
  ].filter(Boolean);

  return values.length ? `${label}: ${values.join(", ")}` : "";
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parsePatientDate(value: string) {
  if (!value) return undefined;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date.toISOString();
}

function formatPatientAge(patient: Patient) {
  const parts = [
    patient.ageYears != null ? `${patient.ageYears}Y` : null,
    patient.ageMonths != null ? `${patient.ageMonths}M` : null,
    patient.ageDays != null ? `${patient.ageDays}D` : null
  ].filter(Boolean);

  if (parts.length) return parts.join(" ");
  if (!patient.dateOfBirth) return "Not set";

  const birthDate = new Date(patient.dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "Not set";

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hadBirthday) years -= 1;
  return `${Math.max(years, 0)}Y`;
}

function findingsHasContent(findings: FindingsState) {
  return Object.values(findings).some((value) => value.trim().length > 0);
}

function buildCalendarDays(month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return { date };
  });
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysFromToday(value: string) {
  if (!value) return "";

  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return "";

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - todayStart.getTime()) / 86_400_000);
  return String(Math.max(diff, 0));
}

function calcAgeFromDOB(dob: string): { ageYears: string; ageMonths: string; ageDays: string } {
  if (!dob) return { ageYears: "", ageMonths: "", ageDays: "" };
  const birth = new Date(`${dob}T00:00:00`);
  if (isNaN(birth.getTime())) return { ageYears: "", ageMonths: "", ageDays: "" };
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return { ageYears: String(Math.max(0, years)), ageMonths: String(Math.max(0, months)), ageDays: String(Math.max(0, days)) };
}

function parseDateText(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? (Number(y) < 50 ? 2000 + Number(y) : 1900 + Number(y)) : Number(y);
  const date = new Date(year, Number(m) - 1, Number(d));
  if (isNaN(date.getTime()) || date.getMonth() !== Number(m) - 1) return null;
  return formatInputDate(date);
}

function DatePickerInput({
  value,
  placeholder = "Pick a date",
  onChange,
  className
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textError, setTextError] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  const parsed = value ? new Date(`${value}T00:00:00`) : null;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = parsed ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  function openPicker() {
    if (parsed) setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    const initText = parsed
      ? `${String(parsed.getDate()).padStart(2, "0")}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getFullYear()).slice(-2)}`
      : "";
    setTextInput(initText);
    setTextError(false);

    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popupHeight = 380;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceAbove >= popupHeight || spaceAbove > spaceBelow;
      setPopupStyle(
        placeAbove
          ? { position: "fixed", bottom: window.innerHeight - rect.top + 6, left: rect.left }
          : { position: "fixed", top: rect.bottom + 6, left: rect.left }
      );
    }

    setOpen(true);
  }

  function handleTextChange(raw: string) {
    setTextInput(raw);
    setTextError(false);
    const iso = parseDateText(raw);
    if (iso) {
      const d = new Date(`${iso}T00:00:00`);
      setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  function handleTextConfirm() {
    if (!textInput.trim()) { onChange(""); setOpen(false); return; }
    const iso = parseDateText(textInput);
    if (iso) { onChange(iso); setOpen(false); }
    else setTextError(true);
  }

  const calendarDays = buildCalendarDays(visibleMonth);
  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <button
        ref={btnRef}
        className={cn(
          "flex items-center gap-1.5 border bg-background text-sm text-left outline-none hover:border-primary focus:ring-1 focus:ring-primary transition",
          className ?? "rounded px-2 py-1.5 min-w-[130px]"
        )}
        type="button"
        onClick={openPicker}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn("truncate", displayValue ? "text-foreground" : "text-muted-foreground")}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onMouseDown={() => setOpen(false)}
          />
          <div
            className="z-[9999] w-72 rounded-xl border bg-card shadow-2xl"
            style={popupStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-3 pb-1">
              <div className="flex gap-2">
                <input
                  autoFocus
                  className={cn(
                    "flex-1 rounded border px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary",
                    textError ? "border-destructive" : "border-border"
                  )}
                  placeholder="DD-MM-YY"
                  value={textInput}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTextConfirm(); if (e.key === "Escape") setOpen(false); }}
                />
                <button
                  className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
                  type="button"
                  onClick={handleTextConfirm}
                >
                  Set
                </button>
              </div>
              {textError && (
                <p className="mt-1 text-xs text-destructive">Invalid — use DD-MM-YY (e.g. 10-05-26)</p>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-2">
              <button
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                type="button"
                onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <button
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                type="button"
                onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 border-t px-2 text-center text-[10px] font-semibold text-muted-foreground">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-2 pb-3 text-center">
              {calendarDays.map((item) => {
                const iso = formatInputDate(item.date);
                const isSelected = iso === value;
                const isOutside = item.date.getMonth() !== visibleMonth.getMonth();
                return (
                  <button
                    key={iso}
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs",
                      isSelected
                        ? "bg-primary font-bold text-white"
                        : isOutside
                          ? "text-muted-foreground/30"
                          : "hover:bg-muted"
                    )}
                    type="button"
                    onClick={() => { onChange(iso); setOpen(false); }}
                  >
                    {item.date.getDate()}
                  </button>
                );
              })}
            </div>

            {value && (
              <div className="border-t px-4 py-2 text-right">
                <button
                  className="text-xs text-muted-foreground hover:text-destructive"
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); }}
                >
                  Clear date
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function formatTriState(value: TriStateValue) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "na") return "N/A";
  return "";
}

function buildOphthalmicFindingLines(findings: FindingsState) {
  const result: string[] = [];

  for (const row of ophthalmicFindingRows) {
    if (row.inputType === "varecord") {
      const r = { sphere: findings.ophthalmicVaRecordRightSphere.trim(), cyl: findings.ophthalmicVaRecordRightCyl.trim(), axis: findings.ophthalmicVaRecordRightAxis.trim(), va: findings.ophthalmicVaRecordRightVa.trim() };
      const l = { sphere: findings.ophthalmicVaRecordLeftSphere.trim(), cyl: findings.ophthalmicVaRecordLeftCyl.trim(), axis: findings.ophthalmicVaRecordLeftAxis.trim(), va: findings.ophthalmicVaRecordLeftVa.trim() };
      const fmt = (e: typeof r) => [e.sphere && `Sph ${e.sphere}`, e.cyl && `CYL ${e.cyl}`, e.axis && `Axis ${e.axis}`, e.va && `VA ${e.va}`].filter(Boolean).join(" / ");
      const rightText = fmt(r);
      const leftText = fmt(l);
      if (rightText || leftText) {
        result.push(`${row.label}:`);
        if (rightText) result.push(`  RE: ${rightText}`);
        if (leftText) result.push(`  LE: ${leftText}`);
      }
      continue;
    }

    if (row.inputType === "checkbox") {
      const rightChecked = String(findings[row.rightKey] ?? "") === "yes";
      const leftChecked = String(findings[row.leftKey] ?? "") === "yes";
      if (rightChecked || leftChecked) {
        const eye = rightChecked && leftChecked ? "BE" : rightChecked ? "RE" : "LE";
        result.push(`${row.label}: ${eye}`);
      }
      continue;
    }

    const rightValue = String(findings[row.rightKey] ?? "").trim();
    const leftValue = String(findings[row.leftKey] ?? "").trim();
    const rightWithPh = row.rightWithPhKey ? String(findings[row.rightWithPhKey] ?? "").trim() : "";
    const leftWithPh = row.leftWithPhKey ? String(findings[row.leftWithPhKey] ?? "").trim() : "";
    const rightWithPgp = row.rightWithPgpKey ? String(findings[row.rightWithPgpKey] ?? "").trim() : "";
    const leftWithPgp = row.leftWithPgpKey ? String(findings[row.leftWithPgpKey] ?? "").trim() : "";
    const rightNote = row.rightNoteKey ? String(findings[row.rightNoteKey] ?? "").trim() : "";
    const leftNote = row.leftNoteKey ? String(findings[row.leftNoteKey] ?? "").trim() : "";
    const hasPhField = Boolean(row.rightWithPhKey);
    const unit = row.unit ? ` ${row.unit}` : "";
    const rightMain = hasPhField
      ? [rightValue ? `Unaided ${rightValue}` : "", rightWithPh ? `With PH ${rightWithPh}` : "", rightWithPgp ? `With PGP/Existing ${rightWithPgp}` : ""].filter(Boolean).join(" : ")
      : rightValue ? `${rightValue}${unit}` : "";
    const leftMain = hasPhField
      ? [leftValue ? `Unaided ${leftValue}` : "", leftWithPh ? `With PH ${leftWithPh}` : "", leftWithPgp ? `With PGP/Existing ${leftWithPgp}` : ""].filter(Boolean).join(" : ")
      : leftValue ? `${leftValue}${unit}` : "";
    const rightRaw = [rightMain, rightNote].filter(Boolean).join(" : ");
    const leftRaw = [leftMain, leftNote].filter(Boolean).join(" : ");
    const rightText = row.unit && rightRaw && !rightMain ? `${rightRaw}${unit}` : rightRaw;
    const leftText = row.unit && leftRaw && !leftMain ? `${leftRaw}${unit}` : leftRaw;

    if (rightText || leftText) {
      result.push(`${row.label}:`);
      if (rightText) result.push(`  RE: ${rightText}`);
      if (leftText) result.push(`  LE: ${leftText}`);
    }
  }

  if (findings.ophthalmicRemark.trim()) {
    result.push(`Ophthalmic Remark: ${findings.ophthalmicRemark.trim()}`);
  }

  return result;
}

function buildFindingsText(findings: FindingsState, note: string) {
  const lines = [
    findings.bpSystolic || findings.bpDiastolic
      ? `BP: ${findings.bpSystolic || "-"} / ${findings.bpDiastolic || "-"}`
      : "",
    findings.heightFeet || findings.heightInch || findings.heightCm
      ? `Height: ${[findings.heightFeet && `${findings.heightFeet} ft`, findings.heightInch && `${findings.heightInch} in`, findings.heightCm && `${findings.heightCm} cm`].filter(Boolean).join(" / ")}`
      : "",
    findings.ofcCm || findings.ofcInch
      ? `OFC: ${[findings.ofcCm && `${findings.ofcCm} cm`, findings.ofcInch && `${findings.ofcInch} in`].filter(Boolean).join(" / ")}`
      : "",
    findings.pulse ? `Pulse: ${findings.pulse} bpm` : "",
    findings.temperature ? `Temperature: ${findings.temperature} F` : "",
    findings.weight ? `Weight: ${findings.weight} Kg` : "",
    findings.pfr ? `PFR: ${findings.pfr} L/min` : "",
    findings.respiratoryRate ? `Respiratory Rate: ${findings.respiratoryRate}` : "",
    findings.rbs ? `RBS: ${findings.rbs} mmol/l` : "",
    findings.fbs ? `FBS: ${findings.fbs} mmol/l` : "",
    findings.twoHourAbf ? `2-Hrs-ABF: ${findings.twoHourAbf} mmol/l` : "",
    findings.spo2 ? `SpO2: ${findings.spo2}%` : "",
    formatTriState(findings.diabetes)
      ? `Diabetes: ${formatTriState(findings.diabetes)} ${findings.diabetesDetails}`.trim()
      : "",
    ...buildOphthalmicFindingLines(findings),
    findings.gynaeMenarche ? `Menarche: ${findings.gynaeMenarche} years` : "",
    findings.gynaeLmp ? `LMP: ${findings.gynaeLmp}` : "",
    findings.gynaeMpFirst || findings.gynaeMpSecond
      ? `MP: ${[findings.gynaeMpFirst, findings.gynaeMpSecond].filter(Boolean).join(" +/- ")}`
      : "",
    findings.gynaeMcFirst || findings.gynaeMcSecond
      ? `MC: ${[findings.gynaeMcFirst, findings.gynaeMcSecond].filter(Boolean).join(" +/- ")}`
      : "",
    findings.gynaeFlow ? `Flow: ${findings.gynaeFlow}` : "",
    findings.gynaeDysmenorrhoea ? `Dysmenorrhoea: ${findings.gynaeDysmenorrhoea}` : "",
    findings.gynaeMarriedYears || findings.gynaeMarriedMonths || findings.gynaeMarriedDays
      ? `Married for: ${[
          findings.gynaeMarriedYears && `${findings.gynaeMarriedYears}Y`,
          findings.gynaeMarriedMonths && `${findings.gynaeMarriedMonths}M`,
          findings.gynaeMarriedDays && `${findings.gynaeMarriedDays}D`
        ].filter(Boolean).join(" ")}`
      : "",
    findings.gynaeMarriageDate ? `Marriage Date: ${findings.gynaeMarriageDate}` : "",
    findings.gynaePara ? `Para: ${findings.gynaePara}` : "",
    findings.gynaeGravida ? `Gravida: ${findings.gynaeGravida}` : "",
    findings.gynaeParaNote ? `Note for Para: ${findings.gynaeParaNote}` : "",
    findings.gynaeAlcYears || findings.gynaeAlcMonths || findings.gynaeAlcDays
      ? `ALC: ${[
          findings.gynaeAlcYears && `${findings.gynaeAlcYears}Y`,
          findings.gynaeAlcMonths && `${findings.gynaeAlcMonths}M`,
          findings.gynaeAlcDays && `${findings.gynaeAlcDays}D`
        ].filter(Boolean).join(" ")}`
      : "",
    findings.gynaeEdd ? `EDD: ${findings.gynaeEdd}` : "",
    findings.gynaeNad ? `Per Abdominal: ${findings.gynaeNad}` : "",
    findings.gynaeTenderness ? `Tenderness: ${findings.gynaeTenderness}` : "",
    findings.gynaeAbdominalNote ? `Gynae Note: ${findings.gynaeAbdominalNote}` : "",
    note ? `Notes: ${note}` : ""
  ].filter(Boolean);

  return lines.join("\n");
}

function buildPrescriptionText(
  patient: Patient | null,
  notes: Record<NoteKey, string>,
  medicines: RxMedicine[],
  medicationNote: string,
  findings: FindingsState,
  followUpDate: string,
  vision: VisionState,
  referrals: ReferralEntry[],
  rxInvestigations: InvestigationEntry[] = [],
  rxDiagnoses: DiagnosisEntry[] = []
) {
  const medicineLines = medicines.map(
    (item, index) => {
      const detailLines = getMedicineDetailLines(item);
      return `${index + 1}. ${formatMedicineTitle(item)}${
        detailLines.length ? `\n${detailLines.join("\n")}` : ""
      }`;
    }
  );
  const findingsText = buildFindingsText(findings, notes.findings);
  const glassPrescriptionText = buildGlassPrescriptionText(vision);
  const referralLines = referrals
    .filter(referralHasContent)
    .map(
      (item, index) =>
        `${index + 1}. ${item.direction === "to" ? "Refer To" : "Referred From"}: ${[
          item.name,
          item.phone,
          item.specialty,
          item.additionalInfo
        ].filter(Boolean).join(" - ")}`
    );

  return [
    `Patient: ${patient?.name ?? "No patient selected"}`,
    notes.complaint ? `Complaint:\n${notes.complaint}` : "",
    notes.history ? `History:\n${notes.history}` : "",
    findingsText ? `Findings:\n${findingsText}` : "",
    rxInvestigations.length ? `Investigation:\n${rxInvestigations.map((i) => i.name + (i.value ? `: ${i.value}` : "")).join("\n")}` : notes.investigation ? `Investigation:\n${notes.investigation}` : "",
    rxDiagnoses.length ? `Diagnosis:\n${rxDiagnoses.map((d) => d.name + (d.value ? `: ${d.value}` : "")).join("\n")}` : notes.diagnosis ? `Diagnosis:\n${notes.diagnosis}` : "",
    medicineLines.length || medicationNote
      ? `Medication:\n${[medicineLines.join("\n"), medicationNote].filter(Boolean).join("\n")}`
      : "",
    glassPrescriptionText ? `Glass Prescription:\n${glassPrescriptionText}` : "",
    notes.advice ? `Advice:\n${notes.advice}` : "",
    followUpDate || notes.followUp
      ? `Follow-Up:\n${[followUpDate, notes.followUp].filter(Boolean).join("\n")}`
      : "",
    referralLines.length || notes.referral
      ? `Referral:\n${[referralLines.join("\n"), notes.referral].filter(Boolean).join("\n")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function DraftSidebar({
  drafts,
  onClose,
  onDelete,
  onEdit,
  onLoad,
  onUpdate
}: {
  drafts: RxDraft[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (draft: RxDraft) => void;
  onLoad: (draft: RxDraft) => void;
  onUpdate: (id: string, patch: Partial<Pick<RxDraft, "name" | "note" | "tags">>) => void;
}) {
  // Build serial numbers: drafts with serialNo keep their queue position; others get sequential numbers after the max
  const maxQueueSerial = drafts.reduce((max, d) => (d.serialNo && d.serialNo > max ? d.serialNo : max), 0);
  let autoCounter = maxQueueSerial;
  const serialMap = new Map<string, number>();
  for (const draft of drafts) {
    if (draft.serialNo) {
      serialMap.set(draft.id, draft.serialNo);
    } else {
      autoCounter += 1;
      serialMap.set(draft.id, autoCounter);
    }
  }

  return (
    <RightDrawer title="All Drafts" onClose={onClose} widthClass="md:w-[50%]">
      {drafts.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          No drafts saved yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="border-r px-3 py-2 text-center w-10">#</th>
                <th className="border-r px-3 py-2 w-36">Patient</th>
                <th className="border-r px-3 py-2">Note</th>
                <th className="border-r px-3 py-2 w-36">Tags</th>
                <th className="border-r px-3 py-2 w-28">Saved</th>
                <th className="px-3 py-2 w-40 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drafts.map((draft) => (
                <tr key={draft.id} className="hover:bg-muted/30">
                  <td className="border-r px-3 py-2 text-center">
                    <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      draft.serialNo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {serialMap.get(draft.id)}
                    </span>
                  </td>
                  <td className="border-r px-3 py-2">
                    <p className="font-semibold text-xs leading-tight">{draft.patient?.name ?? "—"}</p>
                    {draft.patient?.registrationNo && (
                      <p className="text-[10px] text-primary">#{draft.patient.registrationNo}</p>
                    )}
                  </td>
                  <td className="border-r px-2 py-1.5">
                    <textarea
                      className="w-full resize-none rounded border-0 bg-transparent px-1 py-1 text-xs outline-none focus:bg-background focus:ring-1 focus:ring-primary"
                      rows={2}
                      defaultValue={draft.note ?? ""}
                      placeholder="Add note…"
                      onBlur={(e) => onUpdate(draft.id, { note: e.target.value.trim() || undefined })}
                    />
                  </td>
                  <td className="border-r px-3 py-2">
                    {draft.tags && draft.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {draft.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="border-r px-3 py-2 text-[10px] text-muted-foreground">
                    {new Date(draft.savedAt).toLocaleDateString()}<br />
                    {new Date(draft.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" type="button" className="h-7 text-xs" onClick={() => onLoad(draft)}>
                        Load
                      </Button>
                      <Button size="sm" type="button" variant="secondary" className="h-7 text-xs" onClick={() => onEdit(draft)}>
                        Edit
                      </Button>
                      <Button size="sm" type="button" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => onDelete(draft.id)}>
                        Discard
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RightDrawer>
  );
}

function TemplateSidebar({
  templates,
  onClose,
  onDelete,
  onLoad,
  onMerge,
  onUpdate
}: {
  templates: RxTemplate[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onLoad: (template: RxTemplate) => void;
  onMerge: (template: RxTemplate) => void;
  onUpdate: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const filtered = search.trim()
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.medicines.some((m) => m.brandName.toLowerCase().includes(search.toLowerCase()))
      )
    : templates;

  function startEdit(template: RxTemplate) {
    setEditingId(template.id);
    setEditingName(template.name);
  }

  function commitEdit(id: string) {
    if (editingName.trim()) onUpdate(id, editingName.trim());
    setEditingId(null);
    setEditingName("");
  }

  return (
    <RightDrawer title="All Templates" onClose={onClose} widthClass="md:w-[50%]">
      {/* Search bar */}
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by name or medicine…"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          {templates.length === 0 ? "No templates saved yet." : "No templates match your search."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="border-r px-3 py-2 text-center w-10">#</th>
                <th className="border-r px-3 py-2">Template Name</th>
                <th className="border-r px-3 py-2">Medication</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((template, idx) => (
                <tr key={template.id} className="hover:bg-muted/30">
                  <td className="border-r px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="border-r px-3 py-2 w-44">
                    {editingId === template.id ? (
                      <input
                        autoFocus
                        className="w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => commitEdit(template.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitEdit(template.id); if (e.key === "Escape") setEditingId(null); }}
                      />
                    ) : (
                      <>
                        <p className="font-semibold text-xs leading-tight">{template.name}</p>
                        {template.notes.diagnosis && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {template.notes.diagnosis.split("\n")[0]}
                          </p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="border-r px-3 py-2 text-xs text-muted-foreground">
                    {template.medicines.length > 0 ? (
                      <>
                        {template.medicines.slice(0, 2).map((m) => m.brandName).join(", ")}
                        {template.medicines.length > 2 && (
                          <span className="text-primary"> +{template.medicines.length - 2}</span>
                        )}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <Button size="sm" type="button" className="h-7 text-xs" title="Replace current prescription with this template" onClick={() => onLoad(template)}>
                        Load to Rx
                      </Button>
                      <Button size="sm" type="button" variant="secondary" className="h-7 text-xs" title="Add medicines & notes to current prescription" onClick={() => onMerge(template)}>
                        Merge
                      </Button>
                      <Button size="sm" type="button" variant="outline" className="h-7 text-xs" onClick={() => startEdit(template)}>
                        Edit
                      </Button>
                      <Button size="sm" type="button" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => onDelete(template.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RightDrawer>
  );
}
