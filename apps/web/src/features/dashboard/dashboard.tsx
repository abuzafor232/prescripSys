"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardSummary = {
  patients: number;
  appointments: number;
  prescriptions: number;
  income: number;
};

type ChartTab = "Daily" | "Weekly" | "Monthly";

interface ChartPoint {
  label: string;
  value: number;
}

// ─── Stat cards (Appointments → Patients → Prescriptions → Balance) ───────────

const statCards = [
  { key: "appointments",  label: "Appointments", icon: CalendarClock, tone: "text-amber-600"   },
  { key: "patients",      label: "Patients",     icon: UsersRound,    tone: "text-primary"     },
  { key: "prescriptions", label: "Prescriptions",icon: FileText,      tone: "text-rose-600"    },
  { key: "income",        label: "Balance",      icon: null,          tone: "text-emerald-600" },
] as const;

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_ABBREVS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateDisplay(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS_SHORT[Number(m) - 1] ?? ""} ${y}`;
}

function formatDisplayDate(value: string): string {
  return parseDateInput(value).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = parseDateInput(start);
  const last   = parseDateInput(end);
  while (cursor <= last && days.length < 366) {
    days.push(getDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatDayCount(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

// Week starts Saturday (getDay: 0=Sun…6=Sat). diff = days since last Saturday.
function getWeekStart(date: Date): Date {
  const d    = new Date(date);
  const day  = d.getDay();
  const diff = (day - 6 + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

function getDemoSummaryForDate(date: string): DashboardSummary {
  const seed = date
    .replaceAll("-", "")
    .split("")
    .reduce((t, digit, i) => t + Number(digit) * (i + 3), 0);
  const appointments  = 28 + (seed % 18);
  const prescriptions = 18 + ((seed * 3) % 14);
  return {
    patients:      22 + ((seed * 2) % 17),
    appointments,
    prescriptions,
    income: prescriptions * (500 + (seed % 5) * 100),
  };
}

function getRangeSummary(start: string, end: string): DashboardSummary {
  return getDaysInRange(start, end).reduce(
    (sum, date) => {
      const d = getDemoSummaryForDate(date);
      return {
        patients:      sum.patients      + d.patients,
        appointments:  sum.appointments  + d.appointments,
        prescriptions: sum.prescriptions + d.prescriptions,
        income:        sum.income        + d.income,
      };
    },
    { patients: 0, appointments: 0, prescriptions: 0, income: 0 },
  );
}

function formatStatValue(key: keyof DashboardSummary, value: number): string {
  if (key === "income") return `৳ ${value.toLocaleString("en-US")}`;
  return value.toLocaleString("en-US");
}

// ─── Chart data builders ──────────────────────────────────────────────────────

function buildDailyData(start: string, end: string): ChartPoint[] {
  return getDaysInRange(start, end).map((date) => ({
    label: DAY_ABBREVS[parseDateInput(date).getDay()],
    value: getDemoSummaryForDate(date).appointments,
  }));
}

// Week order: Sat(6) → Sun(0) → Mon(1) → Tue(2) → Wed(3) → Thu(4) → Fri(5)
const WEEK_DOW_ORDER  = [6, 0, 1, 2, 3, 4, 5];
const WEEK_DAY_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function buildWeeklyData(start: string, end: string): ChartPoint[] {
  const sums = new Array(7).fill(0) as number[];
  for (const day of getDaysInRange(start, end)) {
    const dow = parseDateInput(day).getDay();
    const idx = WEEK_DOW_ORDER.indexOf(dow);
    if (idx !== -1) sums[idx] += getDemoSummaryForDate(day).appointments;
  }
  return WEEK_DAY_LABELS.map((label, i) => ({ label, value: sums[i] }));
}

function buildMonthlyData(start: string, end: string): ChartPoint[] {
  // Always show a full 12-month window ending with the month of `end`
  const endDate  = parseDateInput(end);
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const map = new Map<string, number>(months.map((k) => [k, 0]));
  for (const day of getDaysInRange(start, end)) {
    const [y, m] = day.split("-");
    const key    = `${y}-${m}`;
    if (map.has(key)) map.set(key, map.get(key)! + getDemoSummaryForDate(day).appointments);
  }

  return months.map((k) => {
    const [y, m] = k.split("-");
    return { label: `${MONTHS_FULL[Number(m) - 1]}-${y.slice(2)}`, value: map.get(k) ?? 0 };
  });
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function buildYTicks(maxVal: number): number[] {
  // Always multiples of 10 (or 100 / 1000 for larger values)
  const step = maxVal <= 100 ? 10 : maxVal <= 1000 ? 100 : 1000;
  const top  = Math.ceil((maxVal || step) / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

const CHART_H   = 320;
const M_TOP     = 14;
const M_BOT     = 28;
const M_LEFT    = 42;   // wider to fit 3-digit y labels
const M_RIGHT   = 12;
const INNER_H   = CHART_H - M_TOP - M_BOT;
const BAR_RATIO = 0.55;

function ReportBarChart({
  data, label, yFixed, maxColW,
}: {
  data: ChartPoint[];
  label: string;
  yFixed?: number;   // force a fixed y-axis maximum
  maxColW?: number;  // cap column width so bars don't get too fat
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [svgW, setSvgW] = useState(600);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSvgW(entry.contentRect.width));
    ro.observe(el);
    setSvgW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const maxVal   = Math.max(...data.map((d) => d.value), 0);
  const ticks    = yFixed
    ? buildYTicks(yFixed)
    : buildYTicks(maxVal);
  const yMax     = yFixed ?? ticks[ticks.length - 1];
  const barCount = Math.max(data.length, 1);
  const innerW   = svgW - M_LEFT - M_RIGHT;
  const colW     = maxColW ? Math.min(innerW / barCount, maxColW) : innerW / barCount;
  const barW     = colW * BAR_RATIO;
  const barOff   = (colW - barW) / 2;

  return (
    <div className="w-full" ref={wrapRef}>
      {/* Legend */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="inline-block h-3 w-6 rounded-sm bg-primary/70" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>

      <svg width={svgW} height={CHART_H}>
        {/* Grid lines + Y labels */}
        {ticks.map((tick) => {
          const y = M_TOP + INNER_H - (tick / yMax) * INNER_H;
          return (
            <g key={tick}>
              <line
                x1={M_LEFT} y1={y}
                x2={svgW - M_RIGHT} y2={y}
                stroke="#e5e7eb" strokeWidth="1"
              />
              <text
                x={M_LEFT - 5} y={y + 4}
                textAnchor="end" fontSize="10" fill="#9ca3af"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = yMax > 0 ? (d.value / yMax) * INNER_H : 0;
          const bx   = M_LEFT + i * colW + barOff;
          const by   = M_TOP + INNER_H - barH;
          const cx   = bx + barW / 2;
          const labelInside = barH > 22;
          const labelY      = labelInside ? by + barH / 2 + 5 : by - 5;
          const labelFill   = labelInside ? "#ffffff" : "hsl(var(--primary))";

          return (
            <g key={i}>
              <rect
                x={bx}
                y={barH > 0 ? by : M_TOP + INNER_H - 2}
                width={barW}
                height={barH > 0 ? barH : 2}
                fill={barH > 0 ? "hsl(var(--primary) / 0.75)" : "#f3f4f6"}
                rx={3}
              />
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={barH > 0 ? labelFill : "#d1d5db"}
              >
                {d.value}
              </text>
              <text
                x={cx}
                y={CHART_H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#9ca3af"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Custom date picker (same calendar system as Complaint section) ───────────

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

function parseDateText(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? (Number(y) < 50 ? 2000 + Number(y) : 1900 + Number(y)) : Number(y);
  const date = new Date(year, Number(m) - 1, Number(d));
  if (isNaN(date.getTime()) || date.getMonth() !== Number(m) - 1) return null;
  return getDateInputValue(date);
}

function DatePickerCard({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [textInput,  setTextInput]  = useState("");
  const [textError,  setTextError]  = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  const parsed = value ? new Date(`${value}T00:00:00`) : null;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = parsed ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  function openPicker() {
    if (parsed) setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    const initText = parsed
      ? `${String(parsed.getDate()).padStart(2, "0")}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getFullYear()).slice(-2)}`
      : "";
    setTextInput(initText);
    setTextError(false);

    if (triggerRef.current) {
      const rect        = triggerRef.current.getBoundingClientRect();
      const popupHeight = 380;
      const spaceBelow  = window.innerHeight - rect.bottom;
      const placeAbove  = rect.top >= popupHeight || rect.top > spaceBelow;
      setPopupStyle(
        placeAbove
          ? { position: "fixed", bottom: window.innerHeight - rect.top + 6, left: rect.left }
          : { position: "fixed", top: rect.bottom + 6, left: rect.left },
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

  function handleDayClick(iso: string) {
    if (min && iso < min) return;
    onChange(iso);
    setOpen(false);
  }

  const calendarDays = buildCalendarDays(visibleMonth);
  const monthLabel   = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      {/* Trigger — full card is clickable */}
      <div className="grid gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <button
          ref={triggerRef}
          type="button"
          className="flex h-9 w-full cursor-pointer items-center overflow-hidden rounded-md border border-primary/30 bg-background transition hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onClick={openPicker}
        >
          <span className="flex flex-1 items-center px-3 text-sm font-medium text-foreground">
            {displayValue}
          </span>
          <span className="flex h-full w-9 shrink-0 items-center justify-center border-l bg-muted">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </span>
        </button>
      </div>

      {/* Calendar popup — portal to body, same as Complaint section */}
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onMouseDown={() => setOpen(false)} />
          <div
            className="z-[9999] w-72 rounded-xl border bg-card shadow-2xl"
            style={popupStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Text input row */}
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
                    if (e.key === "Escape") setOpen(false);
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

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-t px-2 text-center text-[10px] font-semibold text-muted-foreground">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 px-2 pb-3 text-center">
              {calendarDays.map((item) => {
                const iso        = getDateInputValue(item.date);
                const isSelected = iso === value;
                const isOutside  = item.date.getMonth() !== visibleMonth.getMonth();
                const isDisabled = !!min && iso < min;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isDisabled}
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs",
                      isSelected
                        ? "bg-primary font-bold text-white"
                        : isDisabled
                          ? "cursor-not-allowed text-muted-foreground/20"
                          : isOutside
                            ? "text-muted-foreground/30"
                            : "hover:bg-muted",
                    )}
                    onClick={() => handleDayClick(iso)}
                  >
                    {item.date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Clear button */}
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
        document.body,
      )}
    </>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

function getDefaultRange() {
  const today = getDateInputValue(new Date());
  return { start: today, end: today };
}

const defaultRange = getDefaultRange();

const actionLinkClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition";

const quickActions = [
  {
    href: "/appointments",
    label: "Appointment",
    icon: CalendarClock,
    className: "bg-muted hover:bg-muted/80",
  },
  {
    href: "/prescriptions/new",
    label: "New Prescription",
    icon: FileText,
    className: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
] as const;

// Demo chamber data — in production this comes from the selected chamber in the header
const chamberData = {
  name: "Personal/Remote Consultations",
  timePerPatient: 5 as number | null,
  newPatientFee:  null as number | null,
  followUpFee:    null as number | null,
  reportFee:      null as number | null,
};

const chamberRows: { label: string; value: number | null; unit: string }[] = [
  { label: "New Patient", value: chamberData.newPatientFee, unit: "৳" },
  { label: "Follow Up",   value: chamberData.followUpFee,   unit: "৳" },
  { label: "Report",      value: chamberData.reportFee,     unit: "৳" },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate,   setEndDate]   = useState(defaultRange.end);
  const [chartTab,  setChartTab]  = useState<ChartTab>("Daily");

  const selectedDays = getDaysInRange(startDate, endDate);
  const summary      = useMemo(() => getRangeSummary(startDate, endDate), [startDate, endDate]);
  const rangeLabel   = `${formatDisplayDate(startDate)} — ${formatDisplayDate(endDate)}`;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (chartTab === "Daily")  return buildDailyData(startDate, endDate);
    if (chartTab === "Weekly") return buildWeeklyData(startDate, endDate);
    return buildMonthlyData(startDate, endDate);
  }, [chartTab, startDate, endDate]);

  const chartLabel =
    chartTab === "Daily"   ? "Daily Count"   :
    chartTab === "Weekly"  ? "Weekly Count"  :
                             "Monthly Count";

  function handleStartDateChange(value: string) {
    const next = value || defaultRange.start;
    setStartDate(next);
    if (next > endDate) setEndDate(next);
  }

  function handleEndDateChange(value: string) {
    const next = value || defaultRange.end;
    setEndDate(next);
    if (next < startDate) setStartDate(next);
  }

  return (
    <div className="space-y-5">
      {/* ── Header + date range pickers ── */}
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {rangeLabel} · {formatDayCount(selectedDays.length)}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePickerCard
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
            />
            <DatePickerCard
              label="End Date"
              value={endDate}
              min={startDate}
              onChange={handleEndDateChange}
            />
          </div>

          <div className="flex gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`${actionLinkClass} ${action.className}`}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon  = stat.icon;
          const value = summary[stat.key];
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {formatStatValue(stat.key, value)}
                  </div>
                </div>
                {Icon
                  ? <Icon className={`h-6 w-6 ${stat.tone}`} />
                  : <span className={`text-2xl font-bold leading-none ${stat.tone}`}>৳</span>
                }
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Report chart + Chamber card side by side ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">

        {/* Report bar chart */}
        <Card>
          <CardHeader className="p-0">
            <div className="flex border-b">
              {(["Daily", "Weekly", "Monthly"] as ChartTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab)}
                  className={[
                    "px-6 py-3 text-sm font-medium transition-colors",
                    chartTab === tab
                      ? "border-b-2 border-primary bg-background text-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <ReportBarChart
            data={chartData}
            label={chartLabel}
            yFixed={chartTab === "Daily" ? 80 : undefined}
            maxColW={chartTab === "Daily" ? 55 : undefined}
          />
          </CardContent>
        </Card>

        {/* Chamber info card */}
        <Card className="xl:self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{chamberData.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {chamberRows.map(({ label, value, unit }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b px-6 py-3 last:border-b-0"
              >
                <span className="text-sm font-medium text-amber-600">{label}</span>
                <span className="text-sm text-foreground">
                  {value != null
                    ? unit === "min"
                      ? value
                      : `${unit}${value.toLocaleString("en-US")}`
                    : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
