"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  Briefcase,
  Camera,
  CheckCircle2,
  Edit2,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Star,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { fetchDoctor, updateDoctor, type Doctor } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";

// ── Local extended profile (localStorage) ────────────────────────────────

type DegreeEntry      = { degree: string; institution: string; year: string };
type MembershipEntry  = { organization: string; role: string; year: string };
type TrainingEntry    = { title: string; institution: string; year: string };

type ExtendedProfile = {
  photo: string;
  about: string;
  currentInstitution: string;
  currentPosition: string;
  institutionSince: string;
  education: DegreeEntry[];
  memberships: MembershipEntry[];
  trainings: TrainingEntry[];
};

const EMPTY_EXTENDED: ExtendedProfile = {
  photo: "", about: "", currentInstitution: "", currentPosition: "", institutionSince: "",
  education: [], memberships: [], trainings: [],
};

function profileKey(doctorId: string) { return `rx-doctor-profile-${doctorId}`; }

function loadExtended(doctorId: string): ExtendedProfile {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(profileKey(doctorId)) : null;
    return raw ? { ...EMPTY_EXTENDED, ...(JSON.parse(raw) as Partial<ExtendedProfile>) } : { ...EMPTY_EXTENDED };
  } catch { return { ...EMPTY_EXTENDED }; }
}

function saveExtended(doctorId: string, data: ExtendedProfile) {
  try { localStorage.setItem(profileKey(doctorId), JSON.stringify(data)); } catch {}
}

// ── Section wrapper ──────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────

function Field({ label, value, editing, onChange, placeholder, textarea }: {
  label: string; value: string; editing: boolean;
  onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {editing ? (
        textarea ? (
          <textarea
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        )
      ) : (
        <p className={cn("text-sm", value ? "text-foreground" : "italic text-muted-foreground/50")}>
          {value || `—`}
        </p>
      )}
    </div>
  );
}

// ── Dynamic list row ─────────────────────────────────────────────────────

function DynamicRow({ children, onRemove, editing }: { children: React.ReactNode; onRemove: () => void; editing: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex-1 grid gap-2">{children}</div>
      {editing && (
        <button onClick={onRemove} className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Profile Page ─────────────────────────────────────────────────────────

export function ProfilePage() {
  const token       = useSessionStore((s) => s.accessToken) ?? "";
  const sessionUser = useSessionStore((s) => s.user);
  const queryClient = useQueryClient();
  const photoRef    = useRef<HTMLInputElement>(null);

  const doctorId = sessionUser?.doctorId ?? "";

  const { data: doctor, isLoading } = useQuery<Doctor>({
    queryKey: ["doctor", doctorId],
    queryFn:  () => fetchDoctor(doctorId, token),
    enabled:  !!token && !!doctorId,
  });

  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  // API fields
  const [displayName,    setDisplayName]    = useState("");
  const [bmdcNumber,     setBmdcNumber]     = useState("");
  const [specialization, setSpecialization] = useState("");
  const [designation,    setDesignation]    = useState("");
  const [qualifications, setQualifications] = useState("");

  // Extended (localStorage) fields
  const [photo,               setPhoto]               = useState("");
  const [about,               setAbout]               = useState("");
  const [currentInstitution,  setCurrentInstitution]  = useState("");
  const [currentPosition,     setCurrentPosition]     = useState("");
  const [institutionSince,    setInstitutionSince]    = useState("");
  const [education,           setEducation]           = useState<DegreeEntry[]>([]);
  const [memberships,         setMemberships]         = useState<MembershipEntry[]>([]);
  const [trainings,           setTrainings]           = useState<TrainingEntry[]>([]);

  // Load data on mount / doctor change
  useEffect(() => {
    if (!doctor) return;
    setDisplayName(doctor.displayName ?? "");
    setBmdcNumber(doctor.bmdcNumber ?? "");
    setSpecialization(doctor.specialization ?? "");
    setDesignation(doctor.designation ?? "");
    setQualifications(doctor.qualifications ?? "");

    const ext = loadExtended(doctorId);
    setPhoto(doctor.profileImageUrl ?? ext.photo);
    setAbout(ext.about);
    setCurrentInstitution(ext.currentInstitution);
    setCurrentPosition(ext.currentPosition);
    setInstitutionSince(ext.institutionSince);
    setEducation(ext.education);
    setMemberships(ext.memberships);
    setTrainings(ext.trainings);
  }, [doctor, doctorId]);

  const mutation = useMutation({
    mutationFn: () => updateDoctor(doctorId, { displayName, bmdcNumber, specialization, designation, qualifications, profileImageUrl: photo || undefined }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] });
      saveExtended(doctorId, { photo, about, currentInstitution, currentPosition, institutionSince, education, memberships, trainings });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  function handleSave() {
    setError("");
    mutation.mutate();
  }

  function handleCancel() {
    if (!doctor) return;
    setDisplayName(doctor.displayName ?? "");
    setBmdcNumber(doctor.bmdcNumber ?? "");
    setSpecialization(doctor.specialization ?? "");
    setDesignation(doctor.designation ?? "");
    setQualifications(doctor.qualifications ?? "");
    const ext = loadExtended(doctorId);
    setPhoto(doctor.profileImageUrl ?? ext.photo);
    setAbout(ext.about);
    setCurrentInstitution(ext.currentInstitution);
    setCurrentPosition(ext.currentPosition);
    setInstitutionSince(ext.institutionSince);
    setEducation(ext.education);
    setMemberships(ext.memberships);
    setTrainings(ext.trainings);
    setEditing(false);
    setError("");
  }

  function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (!doctorId) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No doctor profile linked to your account.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">My Profile</h1>
            <p className="text-xs text-muted-foreground">Manage your professional information</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={mutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Profile
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

        {/* ── Left: Photo + identity card ── */}
        <div className="space-y-4">
          {/* Photo */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center">
                {photo ? (
                  <img src={photo} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground/40" />
                )}
              </div>
              {editing && (
                <>
                  <button
                    onClick={() => photoRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  {photo && (
                    <button
                      onClick={() => setPhoto("")}
                      className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:opacity-90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
            </div>

            <div className="text-center space-y-0.5 w-full">
              {editing ? (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full text-center rounded-lg border border-input bg-background px-3 py-1.5 text-base font-bold outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <p className="text-base font-bold text-foreground">{displayName || "—"}</p>
              )}
              <p className="text-xs text-muted-foreground">{specialization || "—"}</p>
              {bmdcNumber && (
                <p className="text-[11px] text-muted-foreground/70">BMDC: {bmdcNumber}</p>
              )}
            </div>
          </div>

          {/* Quick info */}
          <Section icon={Stethoscope} title="Professional Info">
            <div className="space-y-3">
              <Field label="Specialization" value={specialization} editing={editing} onChange={setSpecialization} placeholder="e.g. Ophthalmology" />
              <Field label="Designation" value={designation} editing={editing} onChange={setDesignation} placeholder="e.g. Senior Consultant" />
              <Field label="BMDC Reg. No." value={bmdcNumber} editing={editing} onChange={setBmdcNumber} placeholder="BMDC number" />
              <Field label="Qualifications" value={qualifications} editing={editing} onChange={setQualifications} placeholder="e.g. MBBS, FCPS" />
            </div>
          </Section>
        </div>

        {/* ── Right: Sections ── */}
        <div className="space-y-4">

          {/* About */}
          <Section icon={User} title="About">
            <Field label="Bio" value={about} editing={editing} onChange={setAbout} placeholder="Write a short professional bio…" textarea />
          </Section>

          {/* Current Institution */}
          <Section icon={Briefcase} title="Current Working Institution">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Field label="Institution / Hospital" value={currentInstitution} editing={editing} onChange={setCurrentInstitution} placeholder="Institution name" />
              </div>
              <Field label="Since (Year)" value={institutionSince} editing={editing} onChange={setInstitutionSince} placeholder="2020" />
            </div>
            <Field label="Position / Role" value={currentPosition} editing={editing} onChange={setCurrentPosition} placeholder="e.g. Associate Professor" />
          </Section>

          {/* Education */}
          <Section icon={GraduationCap} title="Education / Degrees">
            <div className="space-y-2">
              {education.length === 0 && !editing && (
                <p className="text-sm italic text-muted-foreground/50">No degrees added yet.</p>
              )}
              {education.map((e, i) => (
                <DynamicRow key={i} editing={editing} onRemove={() => setEducation((prev) => prev.filter((_, idx) => idx !== i))}>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      {editing ? (
                        <input value={e.degree} onChange={(ev) => setEducation((prev) => prev.map((r, idx) => idx === i ? { ...r, degree: ev.target.value } : r))}
                          placeholder="Degree (e.g. MBBS, FCPS)" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      ) : <p className="text-sm font-medium text-foreground">{e.degree}</p>}
                    </div>
                    <div>
                      {editing ? (
                        <input value={e.year} onChange={(ev) => setEducation((prev) => prev.map((r, idx) => idx === i ? { ...r, year: ev.target.value } : r))}
                          placeholder="Year" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      ) : <p className="text-xs text-muted-foreground">{e.year}</p>}
                    </div>
                  </div>
                  <div>
                    {editing ? (
                      <input value={e.institution} onChange={(ev) => setEducation((prev) => prev.map((r, idx) => idx === i ? { ...r, institution: ev.target.value } : r))}
                        placeholder="Institution" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                    ) : <p className="text-xs text-muted-foreground">{e.institution}</p>}
                  </div>
                </DynamicRow>
              ))}
              {editing && (
                <button
                  onClick={() => setEducation((prev) => [...prev, { degree: "", institution: "", year: "" }])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Degree
                </button>
              )}
            </div>
          </Section>

          {/* Memberships */}
          <Section icon={Star} title="Memberships">
            <div className="space-y-2">
              {memberships.length === 0 && !editing && (
                <p className="text-sm italic text-muted-foreground/50">No memberships added yet.</p>
              )}
              {memberships.map((m, i) => (
                <DynamicRow key={i} editing={editing} onRemove={() => setMemberships((prev) => prev.filter((_, idx) => idx !== i))}>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      {editing ? (
                        <input value={m.organization} onChange={(ev) => setMemberships((prev) => prev.map((r, idx) => idx === i ? { ...r, organization: ev.target.value } : r))}
                          placeholder="Organization" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      ) : <p className="text-sm font-medium text-foreground">{m.organization}</p>}
                    </div>
                    <div>
                      {editing ? (
                        <input value={m.year} onChange={(ev) => setMemberships((prev) => prev.map((r, idx) => idx === i ? { ...r, year: ev.target.value } : r))}
                          placeholder="Year" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      ) : <p className="text-xs text-muted-foreground">{m.year}</p>}
                    </div>
                  </div>
                  <div>
                    {editing ? (
                      <input value={m.role} onChange={(ev) => setMemberships((prev) => prev.map((r, idx) => idx === i ? { ...r, role: ev.target.value } : r))}
                        placeholder="Role / Position" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                    ) : <p className="text-xs text-muted-foreground">{m.role}</p>}
                  </div>
                </DynamicRow>
              ))}
              {editing && (
                <button
                  onClick={() => setMemberships((prev) => [...prev, { organization: "", role: "", year: "" }])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Membership
                </button>
              )}
            </div>
          </Section>

          {/* Trainings & Certifications */}
          <Section icon={Award} title="Trainings & Certifications">
            <div className="space-y-2">
              {trainings.length === 0 && !editing && (
                <p className="text-sm italic text-muted-foreground/50">No trainings added yet.</p>
              )}
              {trainings.map((t, i) => (
                <DynamicRow key={i} editing={editing} onRemove={() => setTrainings((prev) => prev.filter((_, idx) => idx !== i))}>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      {editing ? (
                        <input value={t.title} onChange={(ev) => setTrainings((prev) => prev.map((r, idx) => idx === i ? { ...r, title: ev.target.value } : r))}
                          placeholder="Training / Certificate title" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      ) : <p className="text-sm font-medium text-foreground">{t.title}</p>}
                    </div>
                    <div>
                      {editing ? (
                        <input value={t.year} onChange={(ev) => setTrainings((prev) => prev.map((r, idx) => idx === i ? { ...r, year: ev.target.value } : r))}
                          placeholder="Year" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      ) : <p className="text-xs text-muted-foreground">{t.year}</p>}
                    </div>
                  </div>
                  <div>
                    {editing ? (
                      <input value={t.institution} onChange={(ev) => setTrainings((prev) => prev.map((r, idx) => idx === i ? { ...r, institution: ev.target.value } : r))}
                        placeholder="Issuing institution" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                    ) : <p className="text-xs text-muted-foreground">{t.institution}</p>}
                  </div>
                </DynamicRow>
              ))}
              {editing && (
                <button
                  onClick={() => setTrainings((prev) => [...prev, { title: "", institution: "", year: "" }])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Training / Certificate
                </button>
              )}
            </div>
          </Section>

          {/* Publications / Research — placeholder for future */}
          <Section icon={BookOpen} title="Publications & Research">
            <p className="text-sm italic text-muted-foreground/50">Coming soon — add your publications and research work.</p>
          </Section>

        </div>
      </div>
    </div>
  );
}
