"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  History,
  Loader2,
  Phone,
  Search,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import {
  fetchPatientProfile,
  fetchPatients,
  type Patient,
  type PatientProfile,
  type ProfilePrescription,
} from "@/lib/api";

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
  return parts.length ? parts.join(" ") : "—";
}

// ── Rx Card ────────────────────────────────────────────────────────────────

function RxCard({ rx, onLoad }: { rx: ProfilePrescription; onLoad: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const meds = rx.medicines ?? [];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary font-mono">
            #{rx.prescriptionNo}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(rx.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{rx.doctor.displayName}</span>
            <span className="text-border">·</span>
            <span>{rx.chamber.name}</span>
          </div>
          <button
            onClick={onLoad}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <CalendarPlus className="h-3 w-3" />
            Load into Rx
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {rx.chiefComplaints && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chief Complaints</span>
            <p className="text-sm text-foreground mt-0.5 leading-snug">{rx.chiefComplaints}</p>
          </div>
        )}

        {meds.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Medicines ({meds.length})
            </span>
            <div className="mt-1 space-y-1">
              {(expanded ? meds : meds.slice(0, 3)).map((m, i) => (
                <div key={i} className="flex items-baseline gap-1.5 text-sm">
                  <span className="font-medium text-foreground">{m.brandName}</span>
                  {m.strength && <span className="text-xs text-muted-foreground">{m.strength}</span>}
                  <span className="text-xs text-muted-foreground">— {m.dose} · {m.duration}</span>
                </div>
              ))}
              {meds.length > 3 && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-xs text-primary hover:underline"
                >
                  {expanded ? "Show less" : `+${meds.length - 3} more`}
                </button>
              )}
            </div>
          </div>
        )}

        {rx.advice && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Advice</span>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{rx.advice}</p>
          </div>
        )}

        {rx.followUpDate && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-1.5 w-fit">
            <Clock className="h-3 w-3 shrink-0" />
            Follow-up: {formatDate(rx.followUpDate)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient Rx Drawer ──────────────────────────────────────────────────────

function PatientRxDrawer({
  patientId,
  onClose,
  onLoad,
}: {
  patientId: string;
  onClose: () => void;
  onLoad: (patient: Patient, rx: ProfilePrescription) => void;
}) {
  const token = useSessionStore((s) => s.accessToken) ?? "";

  const { data: profile, isLoading } = useQuery<PatientProfile>({
    queryKey: ["patient-profile", patientId],
    queryFn: () => fetchPatientProfile(patientId, token),
    enabled: !!token && !!patientId,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rxs = profile?.prescriptions ?? [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Old Rx</h2>
            {profile && (
              <span className="text-sm text-muted-foreground">— {profile.name}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Patient info strip */}
        {profile && (
          <div className="shrink-0 border-b bg-muted/20 px-5 py-3 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{profile.name}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>{profile.phone}</span>
              </div>
            )}
            {(profile.ageYears || profile.ageMonths || profile.ageDays) && (
              <span>Age: <span className="text-foreground font-medium">{formatAge(profile)}</span></span>
            )}
            {profile.registrationNo && (
              <span className="font-mono text-xs">{profile.registrationNo}</span>
            )}
          </div>
        )}

        {/* Scrollable prescription list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rxs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm">No prescriptions found for this patient</p>
            </div>
          ) : (
            rxs.map((rx) => (
              <RxCard
                key={rx.id}
                rx={rx}
                onLoad={() => onLoad(profile!, rx)}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Old Rx Page ────────────────────────────────────────────────────────────

export function OldRxPage() {
  const token = useSessionStore((s) => s.accessToken) ?? "";
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerPatientId, setDrawerPatientId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", debouncedSearch, page],
    queryFn: () => fetchPatients({ q: debouncedSearch || undefined, page, limit: 20 }, token),
    enabled: !!token,
    staleTime: 30_000,
  });

  const patients = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const handleLoad = useCallback((patient: Patient, rx: ProfilePrescription) => {
    const { prescriptions: _p, ...patientOnly } = patient as Patient & { prescriptions?: unknown };
    try { localStorage.setItem("rx-followup-patient", JSON.stringify(patientOnly)); } catch {}
    try { localStorage.setItem("rx-followup-rx", JSON.stringify(rx)); } catch {}
    router.push("/prescriptions/new");
  }, [router]);

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Old Rx</h1>
          <p className="text-xs text-muted-foreground">Browse &amp; reload previous prescriptions</p>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search patient by name, phone, reg no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ── Patient list ── */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm">No patients found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Reg No.</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Last Visit</th>
                <th className="px-4 py-3 text-right">Old Rx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.registrationNo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatAge(p)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.lastVisitAt ? formatDate(p.lastVisitAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDrawerPatientId(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <History className="h-3.5 w-3.5" />
                      View Old Rx
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors",
              page <= 1 ? "cursor-not-allowed opacity-40" : "hover:bg-muted"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors",
              page >= totalPages ? "cursor-not-allowed opacity-40" : "hover:bg-muted"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Drawer ── */}
      {mounted && drawerPatientId && (
        <PatientRxDrawer
          patientId={drawerPatientId}
          onClose={() => setDrawerPatientId(null)}
          onLoad={handleLoad}
        />
      )}
    </div>
  );
}
