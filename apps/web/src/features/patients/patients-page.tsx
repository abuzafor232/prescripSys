"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Phone,
  Search,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import {
  fetchPatientProfile,
  fetchPatients,
  type Patient,
  type PatientProfile,
  type ProfilePrescription,
} from "@/lib/api";
import { RegisterPatientDialog } from "./register-patient-dialog";

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hrs   = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  const mos   = Math.floor(days / 30);
  const yrs   = Math.floor(days / 365);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days < 2)   return "Yesterday";
  if (days < 30)  return `${days} days ago`;
  if (mos  < 12)  return `${mos} month${mos > 1 ? "s" : ""} ago`;
  return `${yrs} year${yrs > 1 ? "s" : ""} ago`;
}

function formatAge(p: { ageYears?: number | null; ageMonths?: number | null; ageDays?: number | null }): string {
  const parts: string[] = [];
  if (p.ageYears)  parts.push(`${p.ageYears}Y`);
  if (p.ageMonths) parts.push(`${p.ageMonths}M`);
  if (p.ageDays)   parts.push(`${p.ageDays}D`);
  return parts.length ? parts.join(" ") : "—";
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function genderLabel(g?: string | null): string {
  if (!g) return "";
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

// ── Prescription History Card ──────────────────────────────────────────────

function RxHistoryCard({ rx, onFollowUp }: { rx: ProfilePrescription; onFollowUp?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const meds = rx.medicines ?? [];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header bar */}
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
          {onFollowUp && (
            <button
              onClick={onFollowUp}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <CalendarPlus className="h-3 w-3" />
              Follow Up
            </button>
          )}
        </div>
      </div>

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
              {(expanded ? meds : meds.slice(0, 2)).map((m, i) => (
                <div key={i} className="flex items-baseline gap-1.5 text-sm">
                  <span className="font-medium text-foreground">{m.brandName}</span>
                  {m.strength && <span className="text-xs text-muted-foreground">{m.strength}</span>}
                  <span className="text-xs text-muted-foreground">— {m.dose} · {m.duration}</span>
                </div>
              ))}
              {meds.length > 2 && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-xs text-primary hover:underline"
                >
                  {expanded ? "Show less" : `+${meds.length - 2} more`}
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

// ── Patient Profile Drawer ─────────────────────────────────────────────────

function PatientProfileDrawer({
  patientId,
  onClose,
  onFollowUp,
}: {
  patientId: string;
  onClose: () => void;
  onFollowUp: (patient: Patient, rx?: ProfilePrescription) => void;
}) {
  const token = useSessionStore((s) => s.accessToken) ?? "";

  const { data: profile, isLoading } = useQuery<PatientProfile>({
    queryKey: ["patient-profile", patientId],
    queryFn: () => fetchPatientProfile(patientId, token),
    enabled: !!token && !!patientId,
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rxs = profile?.prescriptions ?? [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative flex h-full w-full max-w-xl flex-col bg-background shadow-2xl">
        {/* ── Drawer header ── */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold text-foreground">Patient Profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : profile ? (
            <div className="p-5 space-y-5">

              {/* ── Patient info card ── */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{profile.name}</h3>
                      {profile.gender && profile.gender !== "UNKNOWN" && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                          {genderLabel(profile.gender)}
                        </span>
                      )}
                      {profile.bloodGroup && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                          {profile.bloodGroup}
                        </span>
                      )}
                    </div>
                    {profile.registrationNo && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        Reg # {profile.registrationNo}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  {profile.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {(profile.ageYears || profile.ageMonths || profile.ageDays) && (
                    <div className="text-muted-foreground">
                      Age: <span className="font-medium text-foreground">{formatAge(profile)}</span>
                    </div>
                  )}
                  {profile.dateOfBirth && (
                    <div className="text-muted-foreground">
                      DOB: <span className="font-medium text-foreground">{formatDate(profile.dateOfBirth)}</span>
                    </div>
                  )}
                  {profile.address && (
                    <div className="col-span-2 text-muted-foreground">
                      Address: <span className="text-foreground">{profile.address}</span>
                    </div>
                  )}
                  {profile.allergies && (
                    <div className="col-span-2 rounded-lg bg-orange-50 px-3 py-1.5 text-xs text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                      ⚠ Allergies: {profile.allergies}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Follow-up button ── */}
              <Button
                className="w-full gap-2"
                onClick={() => onFollowUp(profile, rxs[0])}
              >
                <CalendarPlus className="h-4 w-4" />
                Follow-Up
              </Button>

              {/* ── Prescription history ── */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    Prescription History
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({rxs.length})
                    </span>
                  </h4>
                </div>

                {rxs.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                    No prescriptions recorded yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rxs.map((rx) => (
                      <RxHistoryCard key={rx.id} rx={rx} onFollowUp={() => onFollowUp(profile!, rx)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Patient not found
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── PatientsPage ───────────────────────────────────────────────────────────

export function PatientsPage() {
  const token = useSessionStore((s) => s.accessToken) ?? "";
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [profilePatientId, setProfilePatientId] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Debounce search
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

  const handleFollowUp = useCallback((patient: Patient, rx?: ProfilePrescription) => {
    // Strip prescriptions array (PatientProfile superset) before storing
    const { prescriptions: _p, ...patientOnly } = patient as Patient & { prescriptions?: unknown };
    try { localStorage.setItem("rx-followup-patient", JSON.stringify(patientOnly)); } catch {}
    if (rx) {
      try { localStorage.setItem("rx-followup-rx", JSON.stringify(rx)); } catch {}
    }
    router.push("/prescriptions/new");
  }, [router]);

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, or reg no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button onClick={() => setRegistrationOpen(true)} className="shrink-0 gap-2">
          <UserPlus className="h-4 w-4" />
          Register New Patient
        </Button>

        {meta && (
          <span className="ml-auto text-sm text-muted-foreground">
            {meta.total} patient{meta.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

        {/* Header row */}
        <div
          className="grid border-b bg-muted/60 px-4 py-3 text-xs font-bold uppercase tracking-wide text-foreground"
          style={{ gridTemplateColumns: "1.4fr 2fr 1fr 1.5fr 1.5fr 1fr" }}
        >
          <span>Patient No.</span>
          <span>Patient&apos;s Name</span>
          <span>Age</span>
          <span>Phone Number</span>
          <span>Last Visit</span>
          <span className="text-center">View Profile</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {search ? "No patients match your search." : "No patients registered yet."}
          </div>
        ) : (
          patients.map((patient, idx) => (
            <div
              key={patient.id}
              className={cn(
                "grid items-center gap-4 border-b px-4 py-3.5 text-sm last:border-0 transition-colors hover:bg-muted/30",
                idx % 2 === 1 && "bg-muted/10"
              )}
              style={{ gridTemplateColumns: "1.4fr 2fr 1fr 1.5fr 1.5fr 1fr" }}
            >
              {/* Patient No */}
              <span className="font-mono text-xs text-muted-foreground">
                {patient.registrationNo ?? <span className="italic">Auto</span>}
              </span>

              {/* Name */}
              <span className="font-medium text-foreground truncate">{patient.name}</span>

              {/* Age */}
              <span className="text-muted-foreground">{formatAge(patient)}</span>

              {/* Phone */}
              <span className="text-muted-foreground">{patient.phone ?? "—"}</span>

              {/* Last Visit */}
              <span className="text-muted-foreground">
                {patient.lastVisitAt ? timeAgo(patient.lastVisitAt) : (
                  <span className="italic text-xs">No visit yet</span>
                )}
              </span>

              {/* View Profile */}
              <div className="flex justify-center">
                <button
                  onClick={() => setProfilePatientId(patient.id)}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Register Patient ── */}
      {mounted && registrationOpen && (
        <RegisterPatientDialog
          onClose={() => setRegistrationOpen(false)}
          onRegistered={() => setRegistrationOpen(false)}
        />
      )}

      {/* ── Patient Profile Drawer ── */}
      {mounted && profilePatientId && (
        <PatientProfileDrawer
          patientId={profilePatientId}
          onClose={() => setProfilePatientId(null)}
          onFollowUp={(patient) => { setProfilePatientId(null); handleFollowUp(patient); }}
        />
      )}
    </div>
  );
}
