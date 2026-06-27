"use client";

import { createPortal } from "react-dom";
import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

const APPOINTMENTS_STORAGE_KEY = "rx-appointments";
const CHAMBERS_STORAGE_KEY     = "rx-chambers";
const SELECTED_CHAMBER_KEY     = "rx-selected-chamber";
const APPT_SCHEDULE_KEY        = "rx-appointment-schedule";

// Day-name → JS getDay() index (0=Sunday … 6=Saturday)
const DAY_NAME_TO_JS_DAY: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

type SchedTimeBlock  = { id: string; from: string; to: string; maxPatients: number };
type SchedWeek       = Record<string, SchedTimeBlock[]>;
type SchedLeave      = { id: string; from: string; to: string; comment: string };
type SchedData       = { phone: string; schedule: SchedWeek; leaves: SchedLeave[] };

function loadScheduleData(): SchedData {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(APPT_SCHEDULE_KEY) : null;
    if (!raw) return { phone: "", schedule: {}, leaves: [] };
    return JSON.parse(raw) as SchedData;
  } catch { return { phone: "", schedule: {}, leaves: [] }; }
}

// Returns Set of JS day indices (0–6) that have schedule blocks
function activeWeekdays(sched: SchedWeek): Set<number> | null {
  const days = Object.entries(sched).filter(([, blocks]) => blocks.length > 0);
  if (days.length === 0) return null; // no schedule → no restriction
  return new Set(days.map(([name]) => DAY_NAME_TO_JS_DAY[name]).filter((d) => d !== undefined));
}

// Returns Set of ISO dates ("YYYY-MM-DD") covered by leaves
function leaveISODates(leaves: SchedLeave[]): Set<string> {
  const out = new Set<string>();
  for (const lv of leaves) {
    if (!lv.from || !lv.to) continue;
    const cur = new Date(`${lv.from}T00:00:00`);
    const end = new Date(`${lv.to}T00:00:00`);
    while (cur <= end) {
      out.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return out;
}

import {
  CalendarDays,
  CalendarOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Plus,
  Printer,
  PlusCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchPrescriptionById, loginWithPassword, type Prescription } from "@/lib/api";
import { useSessionStore } from "@/stores/session-store";

// ── Types ──────────────────────────────────────────────────────────────────

type Chamber = { id: string; name: string };

const DEFAULT_CHAMBERS: Chamber[] = [
  { id: "default", name: "Dr. Abdullah Eye Care Center" },
];

function loadChambers(): Chamber[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(CHAMBERS_STORAGE_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as Chamber[]) : null;
    return parsed && parsed.length > 0 ? parsed : DEFAULT_CHAMBERS;
  } catch { return DEFAULT_CHAMBERS; }
}

function saveChambers(chambers: Chamber[]) {
  try { localStorage.setItem(CHAMBERS_STORAGE_KEY, JSON.stringify(chambers)); } catch {}
}

function loadSelectedChamber(chambers: Chamber[]): Chamber | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SELECTED_CHAMBER_KEY) : null;
    if (!raw) return chambers[0] ?? null;
    const saved = JSON.parse(raw) as Chamber;
    return chambers.find((c) => c.id === saved.id) ?? chambers[0] ?? null;
  } catch { return chambers[0] ?? null; }
}

function saveSelectedChamber(chamber: Chamber) {
  try { localStorage.setItem(SELECTED_CHAMBER_KEY, JSON.stringify(chamber)); } catch {}
}

type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

type Appointment = {
  id: string;
  date: string;
  patientName: string;
  phone: string;
  time: string;
  note: string;
  dateOfBirth: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  gender: "Male" | "Female" | "Other";
  appointmentType: "New" | "Follow-up" | "Report";
  status: AppointmentStatus;
  bloodGroup: string;
  bpSystolic: string;
  bpDiastolic: string;
  prescriptionId?: string;
  completedAt?: string;
};

type AppointmentFormState = {
  patientName: string;
  phone: string;
  time: string;
  note: string;
  dateOfBirth: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  gender: "Male" | "Female" | "Other";
  appointmentType: "New" | "Follow-up" | "Report";
  status: AppointmentStatus;
  bloodGroup: string;
  bpSystolic: string;
  bpDiastolic: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const emptyAppointmentForm: AppointmentFormState = {
  patientName: "", phone: "", time: "09:00 AM", note: "",
  dateOfBirth: "", ageYears: "", ageMonths: "", ageDays: "",
  gender: "Male", appointmentType: "New", status: "Pending",
  bloodGroup: "", bpSystolic: "", bpDiastolic: "",
};

const statusColumns: AppointmentStatus[] = ["Pending", "Confirmed", "Completed"];
const COMPLETED_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function completedTimeRemaining(completedAt?: string): string {
  if (!completedAt) return "";
  const remaining = COMPLETED_TTL_MS - (Date.now() - new Date(completedAt).getTime());
  if (remaining <= 0) return "Expiring…";
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  return h > 0 ? `Clears in ${h}h${m > 0 ? ` ${m}m` : ""}` : `Clears in ${m}m`;
}
const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MONTH_SHORT  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SLOT_SETTINGS_KEY = "rx-slot-settings";

type SlotSettings = {
  startHour: number;
  startMinute: number;
  intervalMinutes: number;
  totalSlots: number;
};

const DEFAULT_SLOT_SETTINGS: SlotSettings = {
  startHour: 9, startMinute: 0, intervalMinutes: 10, totalSlots: 30,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDOBDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDisplayDate(value: string) {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Select date";
  return date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateForInput(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y.slice(2)}`;
}

function parseDateText(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? (Number(y) < 50 ? 2000 + Number(y) : 1900 + Number(y)) : Number(y);
  const date = new Date(year, Number(m) - 1, Number(d));
  if (isNaN(date.getTime()) || date.getMonth() !== Number(m) - 1) return null;
  return formatISODate(date);
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

function generateTimeSlots(s: SlotSettings): string[] {
  const slots: string[] = [];
  let h = s.startHour, m = s.startMinute;
  for (let i = 0; i < s.totalSlots; i++) {
    if (h >= 24) break;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    slots.push(`${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    m += s.intervalMinutes;
    while (m >= 60) { m -= 60; h++; }
  }
  return slots;
}

function slotRangeLabel(slots: string[]): string {
  if (!slots.length) return "No slots configured";
  return slots.length === 1 ? slots[0] : `${slots[0]} – ${slots[slots.length - 1]}`;
}

// Builds a 42-cell (6-week) calendar grid starting from the Sunday before the month
function buildCalendarDays(month: Date) {
  const firstOfMonth  = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + i);
    return { date };
  });
}

// ── Shared calendar popup (Complaint-section style) ─────────────────────────

function CalendarPopup({
  style,
  value,
  visibleMonth,
  onMonthChange,
  onSelect,
  onClose,
  activeWeekdaySet,
  leaveDateSet,
}: {
  style: CSSProperties;
  value: string;
  visibleMonth: Date;
  onMonthChange: (m: Date) => void;
  onSelect: (iso: string) => void;
  onClose: () => void;
  activeWeekdaySet?: Set<number> | null;
  leaveDateSet?: Set<string>;
}) {
  const [textInput, setTextInput] = useState(() => formatDateForInput(value));
  const [textError, setTextError] = useState(false);
  const calendarDays = buildCalendarDays(visibleMonth);
  const monthLabel   = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function handleTextChange(raw: string) {
    setTextInput(raw);
    setTextError(false);
    const iso = parseDateText(raw);
    if (iso) {
      const d = new Date(`${iso}T00:00:00`);
      onMonthChange(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  function handleTextConfirm() {
    if (!textInput.trim()) { onSelect(""); return; }
    const iso = parseDateText(textInput);
    if (iso) onSelect(iso);
    else setTextError(true);
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onMouseDown={onClose} />
      <div
        className="z-[9999] w-72 rounded-xl border bg-card shadow-2xl"
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Text input + Set */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex gap-2">
            <input
              autoFocus
              className={cn(
                "flex-1 rounded border px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary",
                textError ? "border-destructive" : "border-border",
              )}
              placeholder="DD-MM-YY"
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  handleTextConfirm();
                if (e.key === "Escape") onClose();
              }}
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

        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            type="button"
            onClick={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            type="button"
            onClick={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-t px-2 text-center text-[10px] font-semibold text-muted-foreground">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 px-2 pb-3 text-center">
          {calendarDays.map((item) => {
            const iso        = formatISODate(item.date);
            const isSel      = iso === value;
            const isOutside  = item.date.getMonth() !== visibleMonth.getMonth();
            const jsDay      = item.date.getDay();
            const isLeave    = leaveDateSet?.has(iso) ?? false;
            const isOffDay   = activeWeekdaySet != null && !activeWeekdaySet.has(jsDay);
            const isDisabled = isLeave || isOffDay;
            return (
              <button
                key={iso}
                type="button"
                disabled={isDisabled}
                title={isLeave ? "Leave / Holiday" : isOffDay ? "No schedule this day" : undefined}
                className={cn(
                  "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                  isSel        ? "bg-primary font-bold text-white"
                  : isDisabled ? "cursor-not-allowed text-muted-foreground/30 line-through"
                  : isOutside  ? "text-muted-foreground/30"
                               : "hover:bg-muted",
                )}
                onClick={() => !isDisabled && onSelect(iso)}
              >
                {item.date.getDate()}
                {isLeave && !isSel && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-destructive/60" />
                )}
              </button>
            );
          })}
        </div>

        {/* Clear */}
        {value && (
          <div className="border-t px-4 py-2 text-right">
            <button
              className="text-xs text-muted-foreground hover:text-destructive"
              type="button"
              onClick={() => onSelect("")}
            >
              Clear date
            </button>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}

// ── CustomDateControl — full-card trigger + Complaint-section calendar ──────

function CustomDateControl({
  value,
  fullWidth = false,
  compact = false,
  onChange,
  activeWeekdaySet,
  leaveDateSet,
}: {
  value: string;
  fullWidth?: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  activeWeekdaySet?: Set<number> | null;
  leaveDateSet?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const btnRef = useRef<HTMLButtonElement>(null);

  function openPicker() {
    if (value) {
      const d = new Date(`${value}T00:00:00`);
      if (!isNaN(d.getTime())) setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    if (btnRef.current) {
      const rect    = btnRef.current.getBoundingClientRect();
      const popupH  = 390;
      const placeUp = rect.top >= popupH || rect.top > window.innerHeight - rect.bottom;
      setPopupStyle(
        placeUp
          ? { position: "fixed", bottom: window.innerHeight - rect.top + 6, left: rect.left }
          : { position: "fixed", top: rect.bottom + 6, left: rect.left },
      );
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={cn(
          compact
            ? "flex h-full min-h-[28px] cursor-pointer overflow-hidden rounded-md border border-primary/30 bg-card transition hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            : "flex h-14 cursor-pointer overflow-hidden rounded-md border border-primary/30 bg-card transition hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
          fullWidth ? "w-full" : "w-full sm:w-auto",
        )}
        onClick={openPicker}
      >
        <span className="flex flex-1 items-center justify-center px-4 text-sm font-semibold sm:text-base">
          {formatDisplayDate(value)}
        </span>
        <span className="flex w-12 items-center justify-center border-l bg-muted">
          <CalendarDays className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <CalendarPopup
          style={popupStyle}
          value={value}
          visibleMonth={visibleMonth}
          onMonthChange={setVisibleMonth}
          onSelect={(iso) => { if (iso) onChange(iso); setOpen(false); }}
          onClose={() => setOpen(false)}
          activeWeekdaySet={activeWeekdaySet}
          leaveDateSet={leaveDateSet}
        />
      )}
    </>
  );
}

// ── DatePickerInput — compact trigger + same calendar popup ────────────────

function DatePickerInput({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const btnRef = useRef<HTMLButtonElement>(null);

  const parsed = value ? new Date(`${value}T00:00:00`) : null;
  const displayValue = parsed
    ? parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  function openPicker() {
    if (parsed) setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    if (btnRef.current) {
      const rect    = btnRef.current.getBoundingClientRect();
      const popupH  = 390;
      const placeUp = rect.top >= popupH || rect.top > window.innerHeight - rect.bottom;
      setPopupStyle(
        placeUp
          ? { position: "fixed", bottom: window.innerHeight - rect.top + 6, left: rect.left }
          : { position: "fixed", top: rect.bottom + 6, left: rect.left },
      );
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-xl border bg-background px-3 text-left outline-none transition hover:border-primary focus:ring-1 focus:ring-primary"
        onClick={openPicker}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn("text-sm", displayValue ? "text-foreground" : "text-muted-foreground")}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <CalendarPopup
          style={popupStyle}
          value={value}
          visibleMonth={visibleMonth}
          onMonthChange={setVisibleMonth}
          onSelect={(iso) => { onChange(iso); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── AppointmentBoard ───────────────────────────────────────────────────────

export function AppointmentBoard() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const [selectedDate, setSelectedDate] = useState(formatISODate(new Date()));

  // Schedule constraints for the date picker
  const [schedData, setBoardSchedData] = useState<SchedData>(() => loadScheduleData());
  const boardActiveDays = activeWeekdays(schedData.schedule);
  const boardLeaveDates = leaveISODates(schedData.leaves);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === APPT_SCHEDULE_KEY && e.newValue) {
        try { setBoardSchedData(JSON.parse(e.newValue) as SchedData); } catch {}
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [showList, setShowList] = useState(false);
  const [previewPrescriptionId, setPreviewPrescriptionId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(APPOINTMENTS_STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as Appointment[]) : [];
    } catch { return []; }
  });
  const [form, setForm] = useState<AppointmentFormState>(emptyAppointmentForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [chambers, setChambers] = useState<Chamber[]>(() => loadChambers());
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(() => loadSelectedChamber(loadChambers()));
  const [chamberDropdownOpen, setChamberDropdownOpen] = useState(false);
  const [chamberSettingsOpen, setChamberSettingsOpen] = useState(false);
  const chamberBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments)); } catch {}
  }, [appointments]);

  // Purge completed appointments older than 24 h — runs on mount and every minute
  useEffect(() => {
    function purge() {
      setAppointments((cur) => {
        const next = cur.filter((a) => {
          if (a.status !== "Completed" || !a.completedAt) return true;
          return Date.now() - new Date(a.completedAt).getTime() < COMPLETED_TTL_MS;
        });
        return next.length !== cur.length ? next : cur;
      });
    }
    purge();
    const interval = setInterval(purge, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss status messages after 4 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Close chamber dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (chamberBtnRef.current && !chamberBtnRef.current.contains(e.target as Node)) {
        setChamberDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const groupedAppointments = useMemo(
    () => ({
      Pending:   appointments.filter((a) => a.status === "Pending"),
      Confirmed: appointments.filter((a) => a.status === "Confirmed"),
      Completed: appointments.filter((a) => {
        if (a.status !== "Completed") return false;
        if (!a.completedAt) return true; // legacy entries without timestamp
        return Date.now() - new Date(a.completedAt).getTime() < COMPLETED_TTL_MS;
      }),
    }),
    [appointments],
  );

  function updateForm(patch: Partial<AppointmentFormState>) {
    setForm((cur) => ({ ...cur, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChamber) {
      setStatusMessage("Please select a chamber before booking.");
      return;
    }
    const patientName = form.patientName.trim();
    if (!patientName) { setStatusMessage("Patient name is required."); return; }
    if (!form.ageYears.trim() && !form.ageMonths.trim() && !form.ageDays.trim()) {
      setStatusMessage("Age is required — enter at least years, months, or days.");
      return;
    }
    setAppointments((cur) => [
      ...cur,
      {
        id: `${Date.now()}-${cur.length}`,
        date: selectedDate,
        patientName,
        phone: form.phone.trim(),
        time: form.time,
        note: form.note.trim(),
        dateOfBirth: form.dateOfBirth,
        ageYears: form.ageYears.trim(),
        ageMonths: form.ageMonths.trim(),
        ageDays: form.ageDays.trim(),
        gender: form.gender,
        appointmentType: form.appointmentType,
        status: form.status,
        bloodGroup: form.bloodGroup,
        bpSystolic: form.bpSystolic.trim(),
        bpDiastolic: form.bpDiastolic.trim(),
      },
    ]);
    setForm(emptyAppointmentForm);
    setAppointmentOpen(false);
    setStatusMessage("Appointment added.");
  }

  function moveAppointment(id: string, status: AppointmentStatus) {
    setAppointments((cur) => cur.map((a) =>
      a.id !== id ? a : {
        ...a,
        status,
        ...(status === "Completed" ? { completedAt: new Date().toISOString() } : {}),
      }
    ));
  }

  function attendAppointment(apt: Appointment) {
    try { localStorage.setItem("rx-attend-apt", apt.id); } catch {}
    router.push(`/prescriptions/new?attend=${encodeURIComponent(apt.id)}`);
  }

  function handleSelectChamber(chamber: Chamber) {
    setSelectedChamber(chamber);
    saveSelectedChamber(chamber);
    setChamberDropdownOpen(false);
  }

  function handleUpdateChambers(updated: Chamber[]) {
    const withDefault = updated.length === 0 ? DEFAULT_CHAMBERS : updated;
    setChambers(withDefault);
    saveChambers(withDefault);
    if (!updated.find((c) => c.id === selectedChamber?.id)) {
      const first = withDefault[0] ?? null;
      setSelectedChamber(first);
      if (first) saveSelectedChamber(first);
    }
  }

  return (
    <>
      <div className="space-y-2 pb-6">
        {/* Header row — all controls in one line */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date control */}
          <div className="h-7">
            <CustomDateControl value={selectedDate} onChange={setSelectedDate} compact fullWidth={false}
              activeWeekdaySet={boardActiveDays} leaveDateSet={boardLeaveDates} />
          </div>
          <Button size="sm" type="button" onClick={() => setAppointmentOpen(true)}>
            Book Appointment
            <PlusCircle className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={() => setStatusMessage("Board refreshed.")}>
            Refresh
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={() => setShowList(true)}>
            <Printer className="h-3.5 w-3.5" />
            Appointment List
          </Button>
        </div>

        {statusMessage ? (
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary">
            {statusMessage}
          </div>
        ) : null}

        {/* Full-width board */}
        <div className="grid gap-3 lg:grid-cols-3">

          {/* ── Pending ── */}
          <div className="min-w-0">
            <div className="rounded-md bg-muted px-4 py-2 text-sm font-semibold">
              Pending
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({groupedAppointments["Pending"].length})
              </span>
            </div>
            <div className="mt-2 overflow-x-auto rounded-md border">
              {groupedAppointments["Pending"].length ? (
                <table className="w-full min-w-[320px] text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="w-7 py-1.5 pl-3 text-left font-medium">#</th>
                      <th className="py-1.5 pr-2 text-left font-medium">Patient</th>
                      <th className="py-1.5 pr-2 text-left font-medium">Phone</th>
                      <th className="py-1.5 pr-2 text-left font-medium">Age</th>
                      <th className="py-1.5 pr-3 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAppointments["Pending"].map((apt, i) => (
                      <tr key={apt.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pl-3 tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2 font-medium">{apt.patientName}</td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">{apt.phone || "—"}</td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {[apt.ageYears ? `${apt.ageYears}Y` : "", apt.ageMonths ? `${apt.ageMonths}M` : ""].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                              type="button"
                              onClick={() => moveAppointment(apt.id, "Confirmed")}
                            >
                              Confirm
                            </button>
                            <button
                              className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              type="button"
                              onClick={() => moveAppointment(apt.id, "Cancelled")}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No pending appointments</div>
              )}
            </div>
          </div>

          {/* ── Confirmed ── */}
          <div className="min-w-0">
            <div className="rounded-md bg-muted px-4 py-2 text-sm font-semibold">
              Confirmed
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({groupedAppointments["Confirmed"].length})
              </span>
            </div>
            <div className="mt-2 overflow-x-auto rounded-md border">
              {groupedAppointments["Confirmed"].length ? (
                <table className="w-full min-w-[280px] text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="w-7 py-1.5 pl-3 text-left font-medium">#</th>
                      <th className="py-1.5 pr-2 text-left font-medium">Patient Name</th>
                      <th className="py-1.5 pr-3 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAppointments["Confirmed"].map((apt, i) => (
                      <tr key={apt.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pl-3 tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2 font-medium">{apt.patientName}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500 hover:text-white"
                              type="button"
                              onClick={() => attendAppointment(apt)}
                            >
                              Attend
                            </button>
                            <button
                              className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              type="button"
                              onClick={() => moveAppointment(apt.id, "Cancelled")}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No confirmed appointments</div>
              )}
            </div>
          </div>

          {/* ── Completed ── */}
          <div className="min-w-0">
            <div className="rounded-md bg-muted px-4 py-2 text-sm font-semibold">
              Completed
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({groupedAppointments["Completed"].length})
              </span>
              <span className="ml-2 text-[10px] font-normal text-muted-foreground">· clears after 24h</span>
            </div>
            <div className="mt-2 space-y-2">
              {groupedAppointments["Completed"].length ? (
                groupedAppointments["Completed"].map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onMove={moveAppointment}
                    onShowPrescription={(id) => setPreviewPrescriptionId(id)}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Completed prescriptions appear here for 24 hours
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {chamberSettingsOpen && (
        <ChamberSettingsDialog
          chambers={chambers}
          userEmail={user?.email ?? ""}
          onClose={() => setChamberSettingsOpen(false)}
          onUpdate={handleUpdateChambers}
        />
      )}

      {appointmentOpen && (
        <BookAppointmentDialog
          appointments={appointments}
          date={selectedDate}
          form={form}
          onClose={() => setAppointmentOpen(false)}
          onDateChange={setSelectedDate}
          onReset={() => setForm(emptyAppointmentForm)}
          onSubmit={handleSubmit}
          onUpdate={updateForm}
        />
      )}

      {showList && (
        <AppointmentListModal
          date={selectedDate}
          appointments={appointments}
          doctorName={user?.fullName ?? ""}
          chamberName={selectedChamber?.name ?? "Dr. Abdullah Eye Care Center"}
          onClose={() => setShowList(false)}
        />
      )}

      {previewPrescriptionId && (
        <PrescriptionPreviewModal
          prescriptionId={previewPrescriptionId}
          onClose={() => setPreviewPrescriptionId(null)}
        />
      )}
    </>
  );
}

// ── AppointmentCard ────────────────────────────────────────────────────────

function AppointmentCard({
  appointment,
  compact = false,
  onMove,
  onShowPrescription,
}: {
  appointment: Appointment;
  compact?: boolean;
  onMove: (id: string, status: AppointmentStatus) => void;
  onShowPrescription?: (prescriptionId: string) => void;
}) {
  return (
    <article className="rounded-md border bg-card px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{appointment.patientName}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {appointment.time || "No time set"}
          </div>
          {appointment.phone && (
            <div className="text-xs text-muted-foreground">{appointment.phone}</div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">{appointment.status}</span>
          {appointment.status === "Completed" && appointment.completedAt && (
            <span className="text-[9px] text-muted-foreground">
              {completedTimeRemaining(appointment.completedAt)}
            </span>
          )}
        </div>
      </div>

      {!compact && appointment.note && (
        <p className="mt-1.5 text-xs text-muted-foreground">{appointment.note}</p>
      )}

      {!compact && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {appointment.status === "Completed" ? (
            appointment.prescriptionId ? (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onShowPrescription?.(appointment.prescriptionId!)}
              >
                <Eye className="h-3.5 w-3.5" />
                Show Prescription
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic">No prescription linked</span>
            )
          ) : appointment.status === "Pending" ? (
            <Button size="sm" type="button" variant="outline" onClick={() => onMove(appointment.id, "Confirmed")}>
              Confirm
            </Button>
          ) : (
            statusColumns
              .filter((s) => s !== appointment.status)
              .map((s) => (
                <Button key={s} size="sm" type="button" variant="outline" onClick={() => onMove(appointment.id, s)}>
                  Move to {s}
                </Button>
              ))
          )}
        </div>
      )}
    </article>
  );
}

// ── PrescriptionPreviewModal ───────────────────────────────────────────────

function PrescriptionPreviewModal({
  prescriptionId,
  onClose,
}: {
  prescriptionId: string;
  onClose: () => void;
}) {
  const accessToken = useSessionStore((s) => s.accessToken) ?? "";

  const { data: rx, isLoading, isError } = useQuery({
    queryKey: ["prescription-preview", prescriptionId],
    queryFn: () => fetchPrescriptionById(prescriptionId, accessToken),
    enabled: !!prescriptionId && !!accessToken,
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
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${m.instruction ?? ""}</td>
      </tr>`
    ).join("");

    const win = window.open("", "_blank", "width=860,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Prescription ${rx.prescriptionNo}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 20px 30px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
        .section { margin-bottom: 14px; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: .05em; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; color: #888; padding: 4px 8px; border-bottom: 2px solid #ddd; }
        .divider { border: none; border-top: 1px solid #eee; margin: 16px 0; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>
      <h1>${rx.chamber?.name ?? "Prescription"}</h1>
      <div class="meta">
        Dr. ${rx.doctor?.displayName ?? "—"} &nbsp;|&nbsp;
        Rx# ${rx.prescriptionNo}${rx.followUpDate ? ` &nbsp;|&nbsp; Follow-up: ${new Date(rx.followUpDate).toLocaleDateString()}` : ""}
      </div>
      <div class="section">
        <div class="section-title">Patient</div>
        <strong>${rx.patient.name}</strong> &nbsp; ${age}${rx.patient.gender ? ` · ${rx.patient.gender.charAt(0).toUpperCase() + rx.patient.gender.slice(1).toLowerCase()}` : ""}${rx.patient.phone ? ` &nbsp;|&nbsp; ${rx.patient.phone}` : ""}
      </div>
      <hr class="divider" />
      ${rx.chiefComplaints ? `<div class="section"><div class="section-title">Chief Complaints</div>${rx.chiefComplaints}</div>` : ""}
      ${rx.examination ? `<div class="section"><div class="section-title">Examination</div>${rx.examination}</div>` : ""}
      ${rx.diagnoses?.length ? `<div class="section"><div class="section-title">Diagnoses</div>${rx.diagnoses.map(d => d.name + (d.note ? ` (${d.note})` : "")).join(", ")}</div>` : ""}
      ${rx.medicines?.length ? `<div class="section">
        <div class="section-title">Medicines</div>
        <table><thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Duration</th><th>Instruction</th></tr></thead>
        <tbody>${medicineRows}</tbody></table>
      </div>` : ""}
      ${rx.investigations?.length ? `<div class="section"><div class="section-title">Investigations</div>${rx.investigations.map(inv => inv.name + (inv.note ? ` (${inv.note})` : "")).join(", ")}</div>` : ""}
      ${rx.advice ? `<div class="section"><div class="section-title">Advice</div>${rx.advice}</div>` : ""}
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`);
    win.document.close();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl">
        {/* Header */}
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

        {/* Body */}
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading prescription…
            </div>
          )}
          {isError && (
            <div className="py-12 text-center text-sm text-destructive">
              Failed to load prescription.
            </div>
          )}
          {rx && (
            <div className="space-y-4 text-sm">
              {/* Patient + Doctor row */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Patient</p>
                  <p className="font-semibold">{rx.patient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      rx.patient.ageYears != null ? `${rx.patient.ageYears}Y` : null,
                      rx.patient.ageMonths != null ? `${rx.patient.ageMonths}M` : null,
                    ].filter(Boolean).join(" ") || null}
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

              {/* Complaints */}
              {rx.chiefComplaints && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Chief Complaints</p>
                  <p className="text-sm whitespace-pre-wrap">{rx.chiefComplaints}</p>
                </div>
              )}

              {/* Examination */}
              {rx.examination && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Examination</p>
                  <p className="text-sm whitespace-pre-wrap">{rx.examination}</p>
                </div>
              )}

              {/* Diagnoses */}
              {rx.diagnoses?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Diagnoses</p>
                  <p className="text-sm">{rx.diagnoses.map((d) => d.name + (d.note ? ` (${d.note})` : "")).join(", ")}</p>
                </div>
              )}

              {/* Medicines */}
              {rx.medicines?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Medicines</p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold">#</th>
                          <th className="px-2 py-1.5 text-left font-semibold">Medicine</th>
                          <th className="px-2 py-1.5 text-left font-semibold">Dose</th>
                          <th className="px-2 py-1.5 text-left font-semibold">Duration</th>
                          <th className="px-2 py-1.5 text-left font-semibold">Instruction</th>
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

              {/* Investigations */}
              {rx.investigations?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Investigations</p>
                  <p className="text-sm">{rx.investigations.map((inv) => inv.name + (inv.note ? ` (${inv.note})` : "")).join(", ")}</p>
                </div>
              )}

              {/* Advice */}
              {rx.advice && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Advice</p>
                  <p className="text-sm whitespace-pre-wrap">{rx.advice}</p>
                </div>
              )}

              {/* Follow-up */}
              {rx.followUpDate && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                  <span className="text-xs font-semibold text-primary">Follow-up: </span>
                  <span className="text-xs">{new Date(rx.followUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
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

// ── BookAppointmentDialog ──────────────────────────────────────────────────

function BookAppointmentDialog({
  appointments, date, form, onClose, onDateChange, onReset, onSubmit, onUpdate,
}: {
  appointments: Appointment[];
  date: string;
  form: AppointmentFormState;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (patch: Partial<AppointmentFormState>) => void;
}) {
  const [commentOpen,    setCommentOpen]    = useState(false);
  const [phoneDismissed, setPhoneDismissed] = useState(false);
  const [slotSettings, setSlotSettings] = useState<SlotSettings>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(SLOT_SETTINGS_KEY) : null;
      return raw ? { ...DEFAULT_SLOT_SETTINGS, ...(JSON.parse(raw) as Partial<SlotSettings>) } : DEFAULT_SLOT_SETTINGS;
    } catch { return DEFAULT_SLOT_SETTINGS; }
  });
  const slots = generateTimeSlots(slotSettings);

  // Schedule & leave data for the date picker
  const [schedData, setSchedData] = useState<SchedData>(() => loadScheduleData());
  const activeDays  = activeWeekdays(schedData.schedule);
  const leaveDates  = leaveISODates(schedData.leaves);

  // React to slot / schedule settings changed from topbar Appointment Settings
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === SLOT_SETTINGS_KEY && e.newValue) {
        try { setSlotSettings({ ...DEFAULT_SLOT_SETTINGS, ...(JSON.parse(e.newValue) as Partial<SlotSettings>) }); } catch {}
      }
      if (e.key === APPT_SCHEDULE_KEY && e.newValue) {
        try { setSchedData(JSON.parse(e.newValue) as SchedData); } catch {}
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Slots already booked on this date (excludes Cancelled)
  const bookedSlots = useMemo(() => {
    const s = new Set<string>();
    appointments.forEach((a) => {
      if (a.date === date && a.status !== "Cancelled" && a.time) s.add(a.time);
    });
    return s;
  }, [appointments, date]);

  // All unique patients matching the current 11-digit phone (deduped by name+DOB)
  const phoneMatches = useMemo(() => {
    if (form.phone.length !== 11) return [];
    const seen = new Set<string>();
    return appointments.filter((a) => {
      if (a.phone !== form.phone || !a.patientName) return false;
      const key = `${a.patientName}|${a.dateOfBirth}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [form.phone, appointments]);

  // Reset dismiss when phone number changes
  const prevPhoneRef = useRef(form.phone);
  if (form.phone !== prevPhoneRef.current) {
    prevPhoneRef.current = form.phone;
    if (phoneDismissed) setPhoneDismissed(false);
  }

  function handlePhoneChange(raw: string) {
    // digits only, max 11
    onUpdate({ phone: raw.replace(/\D/g, "").slice(0, 11) });
  }

  function handleDobChange(dob: string) {
    onUpdate({ dateOfBirth: dob, ...calcAgeFromDOB(dob) });
  }

  function fillFromHistory(apt: Appointment) {
    onUpdate({
      patientName: apt.patientName,
      phone:       apt.phone,
      dateOfBirth: apt.dateOfBirth,
      ageYears:    apt.ageYears,
      ageMonths:   apt.ageMonths,
      ageDays:     apt.ageDays,
      gender:      apt.gender,
      bloodGroup:  apt.bloodGroup,
      bpSystolic:  apt.bpSystolic,
      bpDiastolic: apt.bpDiastolic,
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative flex min-h-full items-start justify-center p-3 py-4">
        <form
          className="relative w-full max-w-5xl rounded-2xl bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onSubmit={onSubmit}
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl border-b bg-primary/5 px-5 py-2.5">
            <h2 className="text-base font-semibold text-primary">Appointment Booking</h2>
            <button
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
              type="button"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Two-column body */}
          <div className="grid md:grid-cols-2 md:divide-x">

            {/* ── LEFT: Slot selection ── */}
            <div className="space-y-2 px-4 py-3">
              {/* Slots header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Select a Time Slot</span>
              </div>

              {/* Time slots */}
              <div className="grid grid-cols-6 gap-1">
                {slots.map((slot) => {
                  const booked   = bookedSlots.has(slot);
                  const selected = form.time === slot;
                  return (
                    <button
                      key={slot}
                      disabled={booked}
                      title={slot}
                      className={cn(
                        "flex h-8 w-full flex-col items-center justify-center rounded-md transition-colors",
                        booked   ? "cursor-not-allowed bg-muted text-muted-foreground opacity-40" :
                        selected ? "bg-primary text-primary-foreground shadow" :
                                   "bg-primary/10 text-primary hover:bg-primary/25",
                      )}
                      type="button"
                      onClick={() => { if (!booked) onUpdate({ time: selected ? "" : slot }); }}
                    >
                      <span className="tabular-nums text-[10px] font-semibold leading-none">
                        {slot.replace(/ (AM|PM)$/i, "")}
                      </span>
                      <span className="text-[8px] leading-none opacity-70">
                        {/AM$/i.test(slot) ? "AM" : "PM"}
                      </span>
                    </button>
                  );
                })}
                {slots.length === 0 && (
                  <p className="col-span-6 text-sm text-muted-foreground">No slots. Open settings to configure.</p>
                )}
              </div>

              {form.time && (
                <p className="text-center text-xs font-semibold text-primary">
                  Selected: {form.time}
                </p>
              )}
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <LegendItem label="Available" tone="available" />
                <LegendItem label="Selected"  tone="selected"  />
                <LegendItem label="Booked"    tone="booked"    />
              </div>
            </div>

            {/* ── RIGHT: Patient information ── */}
            <div className="space-y-1.5 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">Patient Information</p>

              {/* Name */}
              <label className="block space-y-0.5">
                <RequiredText>Patient&apos;s Name</RequiredText>
                <Input className="h-9 rounded-xl" placeholder="Type patient's name here"
                  value={form.patientName} onChange={(e) => onUpdate({ patientName: e.target.value })} />
              </label>

              {/* Phone — 11-digit search */}
              <div className="relative space-y-0.5">
                <RequiredText>Phone Number</RequiredText>
                <div className="flex overflow-hidden rounded-xl border focus-within:ring-1 focus-within:ring-primary">
                  <span className="inline-flex items-center border-r bg-muted px-3 text-sm text-muted-foreground">
                    +88
                  </span>
                  <input
                    className="h-9 flex-1 bg-background px-3 text-sm outline-none"
                    inputMode="tel"
                    maxLength={11}
                    placeholder="01XXXXXXXXX"
                    value={form.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                  />
                  <span className={cn(
                    "flex items-center pr-3 text-xs tabular-nums",
                    form.phone.length === 11 ? "text-primary font-medium" : "text-muted-foreground",
                  )}>
                    {form.phone.length}/11
                  </span>
                </div>

                {/* Auto-search popup */}
                {phoneMatches.length > 0 && !phoneDismissed && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-card shadow-xl">
                    <div className="flex items-center justify-between border-b px-3 py-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {phoneMatches.length} previous patient{phoneMatches.length > 1 ? "s" : ""} — select to fill, or register new below
                      </span>
                      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setPhoneDismissed(true)}>✕</button>
                    </div>
                    {phoneMatches.map((apt) => (
                      <button
                        key={`${apt.patientName}|${apt.dateOfBirth}`}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                        onClick={() => { fillFromHistory(apt); setPhoneDismissed(true); }}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {apt.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{apt.patientName}</div>
                          <div className="text-xs text-muted-foreground">
                            {[apt.ageYears ? `${apt.ageYears}Y` : "", apt.ageMonths ? `${apt.ageMonths}M` : "", apt.gender].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs font-medium text-primary hover:bg-muted"
                      onClick={() => setPhoneDismissed(true)}
                    >
                      + Register as new patient with this number
                    </button>
                  </div>
                )}
              </div>

              {/* DOB + Age in one row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Date of Birth</span>
                  <DatePickerInput value={form.dateOfBirth} onChange={handleDobChange} placeholder="dd/mm/yyyy" />
                </div>
                <div className="space-y-0.5">
                  <RequiredText>Age</RequiredText>
                  <div className="grid grid-cols-3 gap-1">
                    <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Yr"
                      value={form.ageYears} onChange={(e) => onUpdate({ ageYears: e.target.value.replace(/\D/g, "") })} />
                    <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Mo"
                      value={form.ageMonths} onChange={(e) => onUpdate({ ageMonths: e.target.value.replace(/\D/g, "") })} />
                    <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Dy"
                      value={form.ageDays} onChange={(e) => onUpdate({ ageDays: e.target.value.replace(/\D/g, "") })} />
                  </div>
                </div>
              </div>

              <SegmentedBookingField label="Gender" options={["Male", "Female", "Other"]} required
                value={form.gender} onChange={(v) => onUpdate({ gender: v as AppointmentFormState["gender"] })} />

              <SegmentedBookingField label="Type" options={["New", "Follow-up", "Report"]} required
                value={form.appointmentType}
                onChange={(v) => onUpdate({ appointmentType: v as AppointmentFormState["appointmentType"] })} />

              <div className="flex items-center justify-between">
                <button className="text-xs text-primary underline-offset-2 hover:underline"
                  type="button" onClick={() => setCommentOpen((c) => !c)}>
                  {commentOpen ? "− remove comment" : "+ add comment"}
                </button>
              </div>

              {commentOpen && (
                <label className="block space-y-0.5">
                  <span className="text-sm font-medium">Comment</span>
                  <Textarea className="min-h-16 rounded-xl" value={form.note}
                    onChange={(e) => onUpdate({ note: e.target.value })} />
                </label>
              )}

              {/* Actions */}
              <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
                <Button className="h-9 rounded-xl text-sm" type="button" variant="outline"
                  onClick={() => { onReset(); setCommentOpen(false); }}>
                  Reset
                </Button>
                <Button className="h-9 rounded-xl bg-emerald-600 text-sm hover:bg-emerald-700" type="submit">
                  Book Appointment
                </Button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

// ── ChamberSettingsDialog ──────────────────────────────────────────────────

function ChamberSettingsDialog({
  chambers,
  userEmail,
  onClose,
  onUpdate,
}: {
  chambers: Chamber[];
  userEmail: string;
  onClose: () => void;
  onUpdate: (chambers: Chamber[]) => void;
}) {
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState("");
  const [localChambers, setLocalChambers] = useState<Chamber[]>(chambers);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

  async function handleVerify() {
    if (!password.trim()) { setAuthError("Enter your login password."); return; }
    setVerifying(true);
    setAuthError("");
    try {
      await loginWithPassword(userEmail, password);
      setVerified(true);
    } catch {
      setAuthError("Incorrect password. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) { setAddError("Chamber name cannot be empty."); return; }
    if (localChambers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setAddError("A chamber with this name already exists.");
      return;
    }
    setLocalChambers((cur) => [...cur, { id: `ch-${Date.now()}`, name }]);
    setNewName("");
    setAddError("");
  }

  function handleRemove(id: string) {
    setLocalChambers((cur) => cur.filter((c) => c.id !== id));
  }

  function handleSave() {
    onUpdate(localChambers);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold">Chamber Settings</h2>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {!verified ? (
            /* Password verification step */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your login password to manage chambers.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Login Password</label>
                <input
                  autoFocus
                  type="password"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleVerify(); }}
                />
              </div>
              {authError && <p className="text-xs text-destructive">{authError}</p>}
              <Button className="w-full" disabled={verifying} onClick={() => void handleVerify()}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify &amp; Continue
              </Button>
            </div>
          ) : (
            /* Chamber management step */
            <div className="space-y-4">
              {/* Existing chambers */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Active Chambers</p>
                {localChambers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No chambers. Add one below.</p>
                ) : (
                  <div className="divide-y rounded-md border">
                    {localChambers.map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm font-medium">{c.name}</span>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(c.id)}
                          title="Remove chamber"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new chamber */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Add Chamber</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Chamber name"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                  />
                  <Button type="button" variant="outline" onClick={handleAdd}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
              </div>

              <div className="flex gap-2 border-t pt-3">
                <button className="flex-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" type="button" onClick={onClose}>Cancel</button>
                <Button className="flex-1" onClick={handleSave}>Save Changes</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── RegisterNewPatientDialog ───────────────────────────────────────────────

function RegisterNewPatientDialog({
  appointments, form, onClose, onReset, onSubmit, onUpdate,
}: {
  appointments: Appointment[];
  form: AppointmentFormState;
  onClose: () => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (patch: Partial<AppointmentFormState>) => void;
}) {
  const [commentOpen,    setCommentOpen]    = useState(false);
  const [phoneDismissed, setPhoneDismissed] = useState(false);

  const phoneMatches = useMemo(() => {
    if (form.phone.length !== 11) return [];
    const seen = new Set<string>();
    return appointments.filter((a) => {
      if (a.phone !== form.phone || !a.patientName) return false;
      const key = `${a.patientName}|${a.dateOfBirth}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [form.phone, appointments]);

  const prevPhoneRef = useRef(form.phone);
  if (form.phone !== prevPhoneRef.current) {
    prevPhoneRef.current = form.phone;
    if (phoneDismissed) setPhoneDismissed(false);
  }

  function handlePhoneChange(raw: string) {
    onUpdate({ phone: raw.replace(/\D/g, "").slice(0, 11) });
  }

  function handleDobChange(dob: string) {
    onUpdate({ dateOfBirth: dob, ...calcAgeFromDOB(dob) });
  }

  function fillFromHistory(apt: Appointment) {
    onUpdate({
      patientName: apt.patientName,
      phone:       apt.phone,
      dateOfBirth: apt.dateOfBirth,
      ageYears:    apt.ageYears,
      ageMonths:   apt.ageMonths,
      ageDays:     apt.ageDays,
      gender:      apt.gender,
      bloodGroup:  apt.bloodGroup,
      bpSystolic:  apt.bpSystolic,
      bpDiastolic: apt.bpDiastolic,
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      {/* Left sidebar — full screen on mobile, 50% on md+ */}
      <form
        className="fixed left-0 top-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl sm:w-3/4 md:w-1/2"
        style={{ animation: "slideInFromLeft 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b bg-primary/5 px-5 py-3">
          <h2 className="text-base font-semibold text-primary">Register New Patient</h2>
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
          <p className="text-xs font-semibold text-muted-foreground">Patient Information</p>

          {/* Name */}
          <label className="block space-y-0.5">
            <RequiredText>Patient&apos;s Name</RequiredText>
            <Input className="h-9 rounded-xl" placeholder="Type patient's name here"
              value={form.patientName} onChange={(e) => onUpdate({ patientName: e.target.value })} />
          </label>

          {/* Phone — 11-digit search */}
          <div className="relative space-y-0.5">
            <RequiredText>Phone Number</RequiredText>
            <div className="flex overflow-hidden rounded-xl border focus-within:ring-1 focus-within:ring-primary">
              <span className="inline-flex items-center border-r bg-muted px-3 text-sm text-muted-foreground">
                +88
              </span>
              <input
                className="h-9 flex-1 bg-background px-3 text-sm outline-none"
                inputMode="tel"
                maxLength={11}
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
              <span className={cn(
                "flex items-center pr-3 text-xs tabular-nums",
                form.phone.length === 11 ? "text-primary font-medium" : "text-muted-foreground",
              )}>
                {form.phone.length}/11
              </span>
            </div>

            {/* Auto-search popup */}
            {phoneMatches.length > 0 && !phoneDismissed && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b px-3 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {phoneMatches.length} existing patient{phoneMatches.length > 1 ? "s" : ""} — select to fill, or register new below
                  </span>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setPhoneDismissed(true)}>✕</button>
                </div>
                {phoneMatches.map((apt) => (
                  <button
                    key={`${apt.patientName}|${apt.dateOfBirth}`}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                    onClick={() => { fillFromHistory(apt); setPhoneDismissed(true); }}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {apt.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{apt.patientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {[apt.ageYears ? `${apt.ageYears}Y` : "", apt.ageMonths ? `${apt.ageMonths}M` : "", apt.gender].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs font-medium text-primary hover:bg-muted"
                  onClick={() => setPhoneDismissed(true)}
                >
                  + Register as new patient with this number
                </button>
              </div>
            )}
          </div>

          {/* DOB + Age in one row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Date of Birth</span>
              <DatePickerInput value={form.dateOfBirth} onChange={handleDobChange} placeholder="dd/mm/yyyy" />
            </div>
            <div className="space-y-0.5">
              <RequiredText>Age</RequiredText>
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

          <SegmentedBookingField label="Gender" options={["Male", "Female", "Other"]} required
            value={form.gender} onChange={(v) => onUpdate({ gender: v as AppointmentFormState["gender"] })} />

          <SegmentedBookingField label="Type" options={["New", "Follow-up", "Report"]} required
            value={form.appointmentType}
            onChange={(v) => onUpdate({ appointmentType: v as AppointmentFormState["appointmentType"] })} />

          <div className="flex items-center justify-between">
            <button className="text-xs text-primary underline-offset-2 hover:underline"
              type="button" onClick={() => setCommentOpen((c) => !c)}>
              {commentOpen ? "− remove comment" : "+ add comment"}
            </button>
          </div>

          {commentOpen && (
            <label className="block space-y-0.5">
              <span className="text-sm font-medium">Comment</span>
              <Textarea className="min-h-16 rounded-xl" value={form.note}
                onChange={(e) => onUpdate({ note: e.target.value })} />
            </label>
          )}
        </div>

        {/* Sticky footer actions */}
        <div className="shrink-0 border-t bg-card px-5 py-3">
          <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
            <Button className="h-9 rounded-xl text-sm" type="button" variant="outline"
              onClick={() => { onReset(); setCommentOpen(false); }}>
              Reset
            </Button>
            <Button className="h-9 rounded-xl text-sm" type="submit">
              Register Patient
            </Button>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// ── AppointmentListModal ───────────────────────────────────────────────────

function AppointmentListModal({
  date,
  appointments,
  doctorName,
  chamberName,
  onClose,
}: {
  date: string;
  appointments: Appointment[];
  doctorName: string;
  chamberName: string;
  onClose: () => void;
}) {
  const dateObj      = new Date(`${date}T00:00:00`);
  const dayName      = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const filteredAppointments = appointments.filter((a) => a.date === date);

  function formatAge(apt: Appointment): string {
    const parts = [
      apt.ageYears  ? `${apt.ageYears}Y`  : "",
      apt.ageMonths ? `${apt.ageMonths}M` : "",
    ].filter(Boolean);
    return parts.length ? parts.join(" ") : "—";
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative flex min-h-full items-start justify-center p-4 py-10">
        <div
          className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl dark:bg-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b px-6 py-3 print:hidden">
            <span className="font-semibold text-foreground">Appointment List</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                type="button"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Printable content */}
          <div className="px-8 py-6">
            {/* Report header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="space-y-0.5">
                <p className="text-base font-bold text-foreground">{doctorName || "Doctor"}</p>
                <p className="text-sm text-muted-foreground">MBBS, BCS, FCPS, MCPS</p>
                <p className="text-sm text-muted-foreground">Ophthalmology, General Physician</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-base font-bold text-foreground">{chamberName}</p>
                <p className="text-sm text-muted-foreground">Appointment List</p>
                <p className="text-sm text-muted-foreground">Date: {formattedDate}</p>
                <p className="text-sm text-muted-foreground">Day: {dayName}</p>
              </div>
            </div>

            {/* Appointments table */}
            <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Patient Name</th>
                  <th className="py-2 pr-3">Age</th>
                  <th className="py-2 pr-3">Gender</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length ? (
                  filteredAppointments.map((apt, i) => (
                    <tr key={apt.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 pr-3 font-medium">{apt.patientName}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{formatAge(apt)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{apt.gender}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{apt.phone || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <span className={cn("rounded px-2 py-0.5 text-xs font-medium",
                          apt.appointmentType === "New"       && "bg-emerald-100 text-emerald-700",
                          apt.appointmentType === "Follow-up" && "bg-amber-100 text-amber-700",
                          apt.appointmentType === "Report"    && "bg-sky-100 text-sky-700",
                        )}>
                          {apt.appointmentType}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{apt.time}</td>
                      <td className="py-2.5">
                        <span className={cn("rounded px-2 py-0.5 text-xs font-medium",
                          apt.status === "Pending"   && "bg-yellow-100 text-yellow-700",
                          apt.status === "Confirmed" && "bg-blue-100 text-blue-700",
                          apt.status === "Completed" && "bg-green-100 text-green-700",
                        )}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      No appointments booked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            {appointments.length > 0 && (
              <p className="mt-4 text-right text-xs text-muted-foreground">
                Total: {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small presentational components ───────────────────────────────────────

function LegendItem({ label, tone }: { label: string; tone: "available" | "selected" | "booked" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full",
        tone === "available" && "border border-primary/30 bg-primary/10",
        tone === "selected"  && "bg-primary",
        tone === "booked"    && "bg-muted-foreground",
      )} />
      <span className="text-sm">{label}</span>
    </span>
  );
}

function RequiredText({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium">
      {children}
      <span className="text-destructive">*</span>
    </span>
  );
}

function SegmentedBookingField({
  label, options, required = false, value, onChange,
}: {
  label: string;
  options: string[];
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      <div className="grid overflow-hidden rounded-xl border sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option}
            className={cn(
              "h-9 border-b border-r text-xs font-semibold last:border-r-0 sm:border-b-0",
              value === option ? "bg-blue-500 text-white" : "bg-background text-muted-foreground hover:bg-muted",
            )}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
