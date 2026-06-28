"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Printer,
  Search,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import {
  fetchPrescriptions,
  type Prescription,
  type ProfilePrescription,
  type Patient,
} from "@/lib/api";
import { PrescriptionPrintSidebar } from "@/features/prescriptions/prescription-builder";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAge(p: { ageYears?: number | null; ageMonths?: number | null; ageDays?: number | null }): string {
  const parts: string[] = [];
  if (p.ageYears)  parts.push(`${p.ageYears}Y`);
  if (p.ageMonths) parts.push(`${p.ageMonths}M`);
  if (p.ageDays)   parts.push(`${p.ageDays}D`);
  return parts.length ? parts.join(" ") : "";
}

function genderShort(g?: string | null): string {
  if (!g || g === "UNKNOWN") return "";
  return g.charAt(0).toUpperCase();
}

function followUpStatus(iso?: string | null): "none" | "future" | "today" | "overdue" {
  if (!iso) return "none";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "today";
  if (d > today) return "future";
  return "overdue";
}

// ── DatePickerInput ────────────────────────────────────────────────────────

function DateInput({
  label, value, onChange, min,
}: { label: string; value: string; onChange: (v: string) => void; min?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

// ── AdvancedSearch ─────────────────────────────────────────────────────────

type AdvancedFilters = {
  patientName: string;
  phone: string;
  drug: string;
  diagnosis: string;
  complaint: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_ADV: AdvancedFilters = {
  patientName: "", phone: "", drug: "", diagnosis: "", complaint: "",
  dateFrom: "", dateTo: "",
};

function AdvancedSearch({
  open, filters, onChange,
}: { open: boolean; filters: AdvancedFilters; onChange: (f: AdvancedFilters) => void }) {
  if (!open) return null;
  const set = (key: keyof AdvancedFilters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Advanced Filters</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {([
          ["patientName", "Patient Name"],
          ["phone",       "Phone Number"],
          ["drug",        "Drug / Medicine"],
          ["diagnosis",   "Diagnosis"],
          ["complaint",   "Chief Complaint"],
        ] as [keyof AdvancedFilters, string][]).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
            <input
              type="text"
              value={filters[key]}
              onChange={set(key)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        ))}
        <DateInput label="Date From" value={filters.dateFrom} onChange={(v) => onChange({ ...filters, dateFrom: v })} />
        <DateInput label="Date To"   value={filters.dateTo}   onChange={(v) => onChange({ ...filters, dateTo: v })}   min={filters.dateFrom} />
      </div>
      <button
        type="button"
        onClick={() => onChange(EMPTY_ADV)}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        Clear all filters
      </button>
    </div>
  );
}

// ── Table header ──────────────────────────────────────────────────────────

const ROW_COLS = "2fr 1fr 1fr 1fr 1.8fr 1.8fr 1.2fr 1.6fr";

function RxTableHeader() {
  return (
    <div
      className="grid items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground"
      style={{ gridTemplateColumns: ROW_COLS }}
    >
      <span>Patient</span>
      <span>Rx No.</span>
      <span>Date</span>
      <span>Chamber</span>
      <span>Diagnosis</span>
      <span>Medicines</span>
      <span>Follow-Up</span>
      <span className="text-center">Actions</span>
    </div>
  );
}

// ── PrescriptionCard ───────────────────────────────────────────────────────

function PrescriptionCard({
  rx, idx,
  onPreview,
  onPrint,
  onFollowUp,
}: {
  rx: Prescription;
  idx: number;
  onPreview: () => void;
  onPrint: () => void;
  onFollowUp: () => void;
}) {
  const patient = rx.patient;
  const meds    = rx.medicines ?? [];
  const diags   = rx.diagnoses ?? [];

  const ageStr = formatAge(patient);
  const sexStr = genderShort(patient.gender);
  const ageSex = [ageStr, sexStr].filter(Boolean).join("/");

  const fuStatus = followUpStatus(rx.followUpDate);
  const fuClass  = {
    future:  "text-emerald-700 dark:text-emerald-400",
    today:   "text-amber-600 dark:text-amber-400",
    overdue: "text-red-600 dark:text-red-400",
    none:    "text-muted-foreground",
  }[fuStatus];

  return (
    <div
      className={cn(
        "grid items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0 transition-colors hover:bg-muted/30",
        idx % 2 === 1 && "bg-muted/10"
      )}
      style={{ gridTemplateColumns: ROW_COLS }}
    >
      {/* Patient */}
      <div className="min-w-0">
        <p className="font-semibold text-foreground truncate">{patient.name}</p>
        <p className="text-xs text-muted-foreground">
          {[ageSex, patient.phone].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* Rx No */}
      <span className="font-mono text-xs text-primary">#{rx.prescriptionNo}</span>

      {/* Date */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(rx.createdAt)}</span>

      {/* Chamber */}
      <span className="text-xs text-muted-foreground truncate">{rx.chamber.name}</span>

      {/* Diagnosis */}
      <div className="flex flex-wrap gap-1 min-w-0">
        {diags.length === 0 ? (
          <span className="text-xs text-muted-foreground/50 italic">—</span>
        ) : (
          <>
            {diags.slice(0, 2).map((d, i) => (
              <span key={i} className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 truncate max-w-[120px]">
                {d.name}
              </span>
            ))}
            {diags.length > 2 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">+{diags.length - 2}</span>
            )}
          </>
        )}
      </div>

      {/* Medicines */}
      <div className="min-w-0">
        {meds.length === 0 ? (
          <span className="text-xs text-muted-foreground/50 italic">—</span>
        ) : (
          <p className="text-xs text-muted-foreground truncate">
            {meds.slice(0, 2).map((m) => m.brandName).join(", ")}
            {meds.length > 2 && <span className="text-muted-foreground/60"> +{meds.length - 2}</span>}
          </p>
        )}
      </div>

      {/* Follow-up */}
      <div className={cn("text-xs font-medium whitespace-nowrap", fuClass)}>
        {fuStatus === "none" ? (
          <span className="text-muted-foreground/40 italic">—</span>
        ) : fuStatus === "today" ? (
          "Today"
        ) : (
          formatDate(rx.followUpDate)
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-1.5 flex-nowrap">
        <button
          type="button"
          onClick={onPreview}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" /> Preview
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <Printer className="h-3.5 w-3.5 shrink-0" /> Print
        </button>
        <button
          type="button"
          onClick={onFollowUp}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <CalendarPlus className="h-3.5 w-3.5 shrink-0" /> Follow-Up
        </button>
      </div>
    </div>
  );
}

// ── OldRxPage ──────────────────────────────────────────────────────────────

export function OldRxPage() {
  const token  = useSessionStore((s) => s.accessToken) ?? "";
  const router = useRouter();

  // Global search
  const [q,        setQ]        = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Advanced search panel
  const [advOpen,  setAdvOpen]  = useState(false);
  const [adv,      setAdv]      = useState<AdvancedFilters>(EMPTY_ADV);
  const [debouncedAdv, setDebouncedAdv] = useState<AdvancedFilters>(EMPTY_ADV);

  // Pagination
  const [page, setPage] = useState(1);

  // Preview sidebar
  const [sidebarRx,    setSidebarRx]    = useState<Prescription | null>(null);
  const [sidebarPrint, setSidebarPrint] = useState(false);

  // Debounce q
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // Debounce advanced filters
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedAdv(adv); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [adv]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [debouncedQ, debouncedAdv]);

  const advActive = Object.values(adv).some(Boolean);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["old-rx", debouncedQ, debouncedAdv, page],
    queryFn: () => fetchPrescriptions({
      q:           debouncedQ || undefined,
      patientName: debouncedAdv.patientName  || undefined,
      phone:       debouncedAdv.phone        || undefined,
      drug:        debouncedAdv.drug         || undefined,
      diagnosis:   debouncedAdv.diagnosis    || undefined,
      complaint:   debouncedAdv.complaint    || undefined,
      dateFrom:    debouncedAdv.dateFrom     || undefined,
      dateTo:      debouncedAdv.dateTo       || undefined,
      page,
      limit: 20,
    }, token),
    enabled: !!token,
    staleTime: 30_000,
  });

  const prescriptions = data?.data ?? [];
  const meta          = data?.meta;
  const totalPages    = meta?.totalPages ?? 1;

  function handleFollowUp(rx: Prescription) {
    const { prescriptions: _p, ...patientOnly } = rx.patient as typeof rx.patient & { prescriptions?: unknown };
    try { localStorage.setItem("rx-followup-patient", JSON.stringify(patientOnly)); } catch {}
    try {
      const rxForBuilder = {
        id: rx.id,
        prescriptionNo: rx.prescriptionNo,
        createdAt: rx.createdAt,
        status: rx.status,
        chiefComplaints: rx.chiefComplaints,
        examination: rx.examination,
        advice: rx.advice,
        followUpDate: rx.followUpDate,
        doctor: { displayName: rx.doctor?.displayName ?? "" },
        chamber: { name: rx.chamber?.name ?? "" },
        medicines: rx.medicines,
      };
      localStorage.setItem("rx-followup-rx", JSON.stringify(rxForBuilder));
    } catch {}
    router.push("/prescriptions/new");
  }

  return (
    <div className="space-y-4">

      {/* ── Search ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Main search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patient, diagnosis, medicine, complaint…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setAdvOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              advOpen || advActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {advOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Advanced{advActive ? " ●" : ""}
          </button>

          {/* Results count */}
          {meta && (
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              {isFetching
                ? "Loading…"
                : `Showing ${prescriptions.length} of ${meta.total} prescription${meta.total !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>

        <AdvancedSearch open={advOpen} filters={adv} onChange={setAdv} />
      </div>

      {/* ── Prescription list ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {(q || advActive) ? "No prescriptions match your search." : "No prescriptions recorded yet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <RxTableHeader />
          {prescriptions.map((rx, idx) => (
            <PrescriptionCard
              key={rx.id}
              rx={rx}
              idx={idx}
              onPreview={() => { setSidebarPrint(false); setSidebarRx(rx); }}
              onPrint={()   => { setSidebarPrint(true);  setSidebarRx(rx); }}
              onFollowUp={() => handleFollowUp(rx)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Print / Preview sidebar ── */}
      {sidebarRx && (
        <PrescriptionPrintSidebar
          prescription={sidebarRx}
          autoPrint={sidebarPrint}
          onClose={() => setSidebarRx(null)}
          onEdit={() => { setSidebarRx(null); handleFollowUp(sidebarRx); }}
        />
      )}
    </div>
  );
}
