"use client";

import { createPortal } from "react-dom";
import { type FormEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useSessionStore } from "@/stores/session-store";
import { createPatient, searchPatients, type Patient, type PatientGender } from "@/lib/api";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────

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

const initialForm: PatientFormState = {
  name: "", mobile: "", gender: "MALE", dateOfBirth: "",
  ageYears: "", ageMonths: "", ageDays: "",
  bloodGroup: "", occupation: "", createPrescription: false,
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const occupations = [
  "Service Holder", "Business", "Student", "Teacher",
  "Homemaker", "Farmer", "Retired", "Other",
];

// ── Helpers ────────────────────────────────────────────────────────────────

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
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString();
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

function formatInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildCalendarDays(month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + i);
    return { date };
  });
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

// ── DatePickerInput ────────────────────────────────────────────────────────

function DatePickerInput({ value, placeholder = "Pick a date", onChange, className }: {
  value: string; placeholder?: string; onChange: (v: string) => void; className?: string;
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
    setTextInput(initText); setTextError(false);
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceAbove = rect.top, spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceAbove >= 380 || spaceAbove > spaceBelow;
      setPopupStyle(placeAbove
        ? { position: "fixed", bottom: window.innerHeight - rect.top + 6, left: rect.left }
        : { position: "fixed", top: rect.bottom + 6, left: rect.left });
    }
    setOpen(true);
  }

  const calendarDays = buildCalendarDays(visibleMonth);
  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <>
      <button ref={btnRef} type="button" onClick={openPicker}
        className={cn("flex items-center gap-1.5 border bg-background text-sm text-left outline-none hover:border-primary focus:ring-1 focus:ring-primary transition", className ?? "rounded px-2 py-1.5 min-w-[130px]")}>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn("truncate", displayValue ? "text-foreground" : "text-muted-foreground")}>{displayValue || placeholder}</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onMouseDown={() => setOpen(false)} />
          <div className="z-[9999] w-72 rounded-xl border bg-card shadow-2xl" style={popupStyle} onMouseDown={e => e.stopPropagation()}>
            <div className="px-4 pt-3 pb-1">
              <input
                className={cn("mb-2 h-8 w-full rounded-lg border px-3 text-sm outline-none focus:ring-1 focus:ring-primary", textError && "border-destructive")}
                placeholder="DD-MM-YY"
                value={textInput}
                onChange={e => { setTextInput(e.target.value); setTextError(false); const iso = parseDateText(e.target.value); if (iso) { const d = new Date(`${iso}T00:00:00`); setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1)); } }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!textInput.trim()) { onChange(""); setOpen(false); return; } const iso = parseDateText(textInput); if (iso) { onChange(iso); setOpen(false); } else setTextError(true); } }}
              />
              <div className="mb-2 flex items-center justify-between">
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted" onClick={() => setVisibleMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
                <span className="text-sm font-semibold">{monthLabel}</span>
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted" onClick={() => setVisibleMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
              </div>
              <div className="mb-1 grid grid-cols-7 text-center">
                {DAYS.map(d => <span key={d} className="text-[10px] font-medium text-muted-foreground">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarDays.map(({ date }, i) => {
                  const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                  const iso = formatInputDate(date);
                  const isSelected = iso === value;
                  const isToday = iso === formatInputDate(new Date());
                  return (
                    <button key={i} type="button"
                      className={cn("h-7 w-full rounded-md text-xs transition-colors", isSelected ? "bg-primary text-primary-foreground font-bold" : isToday ? "border border-primary text-primary font-medium" : isCurrentMonth ? "hover:bg-muted text-foreground" : "text-muted-foreground/40 hover:bg-muted/50")}
                      onClick={() => { onChange(iso); setOpen(false); }}
                    >{date.getDate()}</button>
                  );
                })}
              </div>
              <div className="border-t mt-2 pt-2 pb-2 flex justify-end gap-2">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => { onChange(formatInputDate(new Date())); setOpen(false); }}>Today</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ── RegisterPatientDialog ─────────────────────────────────────────────────

export function RegisterPatientDialog({
  onClose,
  onRegistered,
}: {
  onClose: () => void;
  onRegistered?: (patient: Patient) => void;
}) {
  const token = useSessionStore((s) => s.accessToken) ?? "";
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState<PatientFormState>(initialForm);
  const [error, setError] = useState("");

  function update(patch: Partial<PatientFormState>) {
    setForm(cur => ({ ...cur, ...patch }));
    setError("");
  }

  // Phone-based patient search
  const [phoneSearchDismissed, setPhoneSearchDismissed] = useState(false);
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

  function fillFromPatient(p: Patient) {
    update({
      name: p.name,
      mobile: p.phone?.replace(/^\+88/, "") ?? form.mobile,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth ?? "",
      ageYears: p.ageYears != null ? String(p.ageYears) : "",
      ageMonths: p.ageMonths != null ? String(p.ageMonths) : "",
      ageDays: p.ageDays != null ? String(p.ageDays) : "",
      bloodGroup: p.bloodGroup ?? "",
    });
    setPhoneSearchDismissed(true);
  }

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createPatient>[0]) => createPatient(input, token),
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      onRegistered?.(patient);
      if (form.createPrescription) {
        try { localStorage.setItem("rx-followup-patient", JSON.stringify(patient)); } catch {}
        router.push("/prescriptions/new");
      }
      onClose();
    },
    onError: (e: unknown) => {
      setError(typeof e === "object" && e !== null && "error" in e
        ? String((e as { error: unknown }).error)
        : "Failed to register patient. Please try again.");
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = form.name.trim();
    const mobile = form.mobile.trim();
    if (!name) { setError("Patient name is required."); return; }
    if (!mobile) { setError("Mobile number is required."); return; }
    const dateOfBirth = parsePatientDate(form.dateOfBirth.trim());
    if (form.dateOfBirth.trim() && !dateOfBirth) { setError("Use DD/MM/YYYY for date of birth."); return; }
    const ageYears = parseOptionalInteger(form.ageYears);
    const ageMonths = parseOptionalInteger(form.ageMonths);
    const ageDays = parseOptionalInteger(form.ageDays);
    if (!ageYears && !ageMonths && !ageDays) { setError("Enter patient age."); return; }

    mutation.mutate({
      name,
      phone: `+88${mobile}`,
      gender: form.gender,
      dateOfBirth: dateOfBirth ?? undefined,
      ageYears, ageMonths, ageDays,
      bloodGroup: form.bloodGroup || undefined,
    });
  }

  const genderLabels = ["Male", "Female", "Other"] as const;
  const genderValues: PatientGender[] = ["MALE", "FEMALE", "OTHER"];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      {/* Sidebar */}
      <form
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-card shadow-2xl"
        style={{ animation: "slideInFromRight 0.25s ease-out" }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b bg-primary/5 px-5 py-3">
          <h2 className="text-base font-semibold text-primary">Register New Patient</h2>
          <button aria-label="Close" type="button" onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground">Patient Information</p>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}

          {/* Name */}
          <label className="block space-y-0.5">
            <span className="text-sm font-medium"><span className="text-destructive">*</span> Patient&apos;s Name</span>
            <Input autoFocus className="h-9 rounded-xl" placeholder="Type patient's name here"
              value={form.name} onChange={e => update({ name: e.target.value })} />
          </label>

          {/* Phone */}
          <div className="relative space-y-0.5">
            <span className="text-sm font-medium"><span className="text-destructive">*</span> Mobile Number</span>
            <div className="flex overflow-hidden rounded-xl border focus-within:ring-1 focus-within:ring-primary">
              <span className="inline-flex items-center border-r bg-muted px-3 text-sm text-muted-foreground">+88</span>
              <input className="h-9 flex-1 bg-background px-3 text-sm outline-none" inputMode="tel" maxLength={11}
                placeholder="01XXXXXXXXX" value={form.mobile}
                onChange={e => update({ mobile: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
              <span className={cn("flex items-center pr-3 text-xs tabular-nums", form.mobile.length === 11 ? "text-primary font-medium" : "text-muted-foreground")}>
                {phoneSearchQuery.isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>{form.mobile.length}/11</span>}
              </span>
            </div>

            {showPhoneDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b px-3 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {phoneResults.length} patient{phoneResults.length > 1 ? "s" : ""} found — select to fill form
                  </span>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setPhoneSearchDismissed(true)}>✕</button>
                </div>
                {phoneResults.map(p => (
                  <button key={p.id} type="button" onClick={() => fillFromPatient(p)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.ageYears != null ? `${p.ageYears}Y` : "", p.gender === "MALE" ? "Male" : p.gender === "FEMALE" ? "Female" : "Other", p.phone?.replace(/^\+88/, "")].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-primary">Select</span>
                  </button>
                ))}
                <button type="button" onClick={() => setPhoneSearchDismissed(true)}
                  className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted">
                  + Register as new patient with this number
                </button>
              </div>
            )}
          </div>

          {/* DOB + Age */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Date of Birth</span>
              <DatePickerInput className="h-9 w-full rounded-xl px-3" placeholder="dd/mm/yyyy"
                value={form.dateOfBirth} onChange={iso => update({ dateOfBirth: iso, ...calcAgeFromDOB(iso) })} />
            </div>
            <div className="space-y-0.5">
              <span className="text-sm font-medium"><span className="text-destructive">*</span> Age</span>
              <div className="grid grid-cols-3 gap-1">
                <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Yr"
                  value={form.ageYears} onChange={e => update({ ageYears: e.target.value.replace(/\D/g, "") })} />
                <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Mo"
                  value={form.ageMonths} onChange={e => update({ ageMonths: e.target.value.replace(/\D/g, "") })} />
                <Input className="h-9 rounded-lg px-2 text-xs" inputMode="numeric" placeholder="Dy"
                  value={form.ageDays} onChange={e => update({ ageDays: e.target.value.replace(/\D/g, "") })} />
              </div>
              <p className="text-[10px] text-muted-foreground">At least one field required</p>
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-0.5">
            <span className="text-sm font-medium"><span className="text-destructive">*</span> Gender</span>
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border">
              {genderLabels.map((label, i) => (
                <button key={label} type="button"
                  className={cn("h-9 border-r text-sm font-medium last:border-r-0 transition-colors",
                    form.gender === genderValues[i] ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                  onClick={() => update({ gender: genderValues[i] })}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Blood Group */}
          <div className="space-y-0.5">
            <span className="text-sm font-medium">Blood Group</span>
            <div className="grid grid-cols-8 overflow-hidden rounded-xl border">
              {bloodGroups.map(bg => (
                <button key={bg} type="button"
                  className={cn("h-9 border-r text-xs font-medium last:border-r-0 transition-colors",
                    form.bloodGroup === bg ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                  onClick={() => update({ bloodGroup: form.bloodGroup === bg ? "" : bg })}>
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Occupation */}
          <div className="space-y-0.5">
            <span className="text-sm font-medium">Occupation</span>
            <select className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
              value={form.occupation} onChange={e => update({ occupation: e.target.value })}>
              <option value="">Select Occupation</option>
              {occupations.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Create prescription toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/40 px-4 py-2.5 text-sm">
            <input checked={form.createPrescription} className="h-4 w-4 accent-primary" type="checkbox"
              onChange={e => update({ createPrescription: e.target.checked })} />
            <span>Create prescription after registration</span>
          </label>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-card px-5 py-3">
          <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
            <Button className="h-9 rounded-xl text-sm" type="button" variant="outline"
              onClick={() => setForm(initialForm)}>
              Reset
            </Button>
            <Button className="h-9 rounded-xl text-sm" disabled={mutation.isPending} type="submit">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Register Patient
            </Button>
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
