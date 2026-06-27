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
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { fetchDoctor, updateDoctor, getApiErrorMessage, type Doctor } from "@/lib/api";

// ── Local extended profile (localStorage) ────────────────────────────────

type DegreeEntry     = { degree: string; institution: string; year: string };
type ExperienceEntry = { role: string; organization: string; from: string; to: string; current: boolean };
type MembershipEntry = { organization: string; role: string; year: string };
type TrainingEntry   = { title: string; institution: string; year: string };

type ExtendedProfile = {
  photo: string;
  about: string;
  currentInstitution: string;
  currentPosition: string;
  institutionSince: string;
  education: DegreeEntry[];
  experience: ExperienceEntry[];
  memberships: MembershipEntry[];
  trainings: TrainingEntry[];
};

const EMPTY_EXTENDED: ExtendedProfile = {
  photo: "", about: "", currentInstitution: "", currentPosition: "", institutionSince: "",
  education: [], experience: [], memberships: [], trainings: [],
};

function profileKey(id: string) { return `rx-doctor-profile-${id}`; }

function loadExtended(id: string): ExtendedProfile {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(profileKey(id)) : null;
    return raw ? { ...EMPTY_EXTENDED, ...(JSON.parse(raw) as Partial<ExtendedProfile>) } : { ...EMPTY_EXTENDED };
  } catch { return { ...EMPTY_EXTENDED }; }
}

function saveExtended(id: string, data: ExtendedProfile) {
  try { localStorage.setItem(profileKey(id), JSON.stringify(data)); } catch {}
}

// ── Shared UI pieces ─────────────────────────────────────────────────────

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

function Field({ label, value, editing, onChange, placeholder, textarea }: {
  label: string; value: string; editing: boolean;
  onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {editing ? (
        textarea ? (
          <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none" />
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        )
      ) : (
        <p className={cn("text-sm", value ? "text-foreground" : "italic text-muted-foreground/40")}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function InlineInput({ value, onChange, placeholder, className, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; disabled?: boolean;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      disabled={disabled}
      className={cn("w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50", className)} />
  );
}

function DynamicRow({ children, onRemove, editing }: { children: React.ReactNode; onRemove: () => void; editing: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex-1 space-y-2">{children}</div>
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

  // API-backed fields
  const [displayName,    setDisplayName]    = useState("");
  const [bmdcNumber,     setBmdcNumber]     = useState("");
  const [specialization, setSpecialization] = useState("");
  const [designation,    setDesignation]    = useState("");
  const [qualifications, setQualifications] = useState("");

  // localStorage-only fields
  const [photo,              setPhoto]              = useState("");
  const [about,              setAbout]              = useState("");
  const [currentInstitution, setCurrentInstitution] = useState("");
  const [currentPosition,    setCurrentPosition]    = useState("");
  const [institutionSince,   setInstitutionSince]   = useState("");
  const [education,          setEducation]          = useState<DegreeEntry[]>([]);
  const [experience,         setExperience]         = useState<ExperienceEntry[]>([]);
  const [memberships,        setMemberships]        = useState<MembershipEntry[]>([]);
  const [trainings,          setTrainings]          = useState<TrainingEntry[]>([]);

  // Load on mount / doctor fetch
  useEffect(() => {
    if (!doctor) return;
    setDisplayName(doctor.displayName ?? "");
    setBmdcNumber(doctor.bmdcNumber ?? "");
    setSpecialization(doctor.specialization ?? "");
    setDesignation(doctor.designation ?? "");
    setQualifications(doctor.qualifications ?? "");

    const ext = loadExtended(doctorId);
    // photo: prefer localStorage (API might not store full base64)
    setPhoto(ext.photo || doctor.profileImageUrl || "");
    setAbout(ext.about);
    setCurrentInstitution(ext.currentInstitution);
    setCurrentPosition(ext.currentPosition);
    setInstitutionSince(ext.institutionSince);
    setEducation(ext.education);
    setExperience(ext.experience ?? []);
    setMemberships(ext.memberships);
    setTrainings(ext.trainings);
  }, [doctor, doctorId]);

  function buildExtended(): ExtendedProfile {
    return { photo, about, currentInstitution, currentPosition, institutionSince, education, experience, memberships, trainings };
  }

  const mutation = useMutation({
    // Only send text fields to API — photo stays local (base64 can be >100kb)
    mutationFn: () => updateDoctor(
      doctorId,
      { displayName: displayName || undefined, bmdcNumber: bmdcNumber || undefined, specialization: specialization || undefined, designation: designation || undefined, qualifications: qualifications || undefined },
      token
    ),
    onSuccess: () => {
      // Always save extended data to localStorage on success
      saveExtended(doctorId, buildExtended());
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] });
      setEditing(false);
      setError("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e) => {
      setError(getApiErrorMessage(e));
    },
  });

  function handleSave() {
    setError("");
    if (!doctorId) {
      // No doctor linked — just save extended data locally
      saveExtended(doctorId, buildExtended());
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }
    mutation.mutate();
  }

  function handleCancel() {
    if (!doctor) { setEditing(false); return; }
    setDisplayName(doctor.displayName ?? "");
    setBmdcNumber(doctor.bmdcNumber ?? "");
    setSpecialization(doctor.specialization ?? "");
    setDesignation(doctor.designation ?? "");
    setQualifications(doctor.qualifications ?? "");
    const ext = loadExtended(doctorId);
    setPhoto(ext.photo || doctor.profileImageUrl || "");
    setAbout(ext.about);
    setCurrentInstitution(ext.currentInstitution);
    setCurrentPosition(ext.currentPosition);
    setInstitutionSince(ext.institutionSince);
    setEducation(ext.education);
    setExperience(ext.experience ?? []);
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

  if (isLoading && doctorId) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      {/* ── Top bar ── */}
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
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully
            </span>
          )}
          {editing ? (
            <>
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button onClick={handleSave} disabled={mutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Profile
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Edit2 className="h-3.5 w-3.5" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

        {/* ── Left: Photo + identity ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col items-center gap-4">
            {/* Photo */}
            <div className="relative">
              <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center">
                {photo
                  ? <img src={photo} alt="Profile" className="h-full w-full object-cover" />
                  : <User className="h-12 w-12 text-muted-foreground/30" />}
              </div>
              {editing && (
                <>
                  <button onClick={() => photoRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  {photo && (
                    <button onClick={() => setPhoto("")}
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:opacity-90">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
            </div>

            {/* Name */}
            {editing ? (
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full Name"
                className="w-full text-center rounded-lg border border-input bg-background px-3 py-1.5 text-base font-bold outline-none focus:ring-2 focus:ring-primary" />
            ) : (
              <div className="text-center space-y-0.5">
                <p className="text-base font-bold text-foreground">{displayName || sessionUser?.fullName || "—"}</p>
                <p className="text-xs text-primary font-medium">{specialization || "—"}</p>
                <p className="text-xs text-muted-foreground">{designation || ""}</p>
                {bmdcNumber && <p className="text-[11px] text-muted-foreground/60 font-mono">BMDC: {bmdcNumber}</p>}
              </div>
            )}
          </div>

          {/* Professional Info */}
          <Section icon={Stethoscope} title="Professional Info">
            <div className="space-y-3">
              <Field label="Specialization"  value={specialization}  editing={editing} onChange={setSpecialization}  placeholder="e.g. Ophthalmology" />
              <Field label="Designation"     value={designation}     editing={editing} onChange={setDesignation}     placeholder="e.g. Senior Consultant" />
              <Field label="BMDC Reg. No."   value={bmdcNumber}      editing={editing} onChange={setBmdcNumber}      placeholder="BMDC number" />
              <Field label="Qualifications"  value={qualifications}  editing={editing} onChange={setQualifications}  placeholder="e.g. MBBS, FCPS" />
            </div>
          </Section>
        </div>

        {/* ── Right: sections ── */}
        <div className="space-y-4">

          {/* About */}
          <Section icon={User} title="About">
            <Field label="Bio" value={about} editing={editing} onChange={setAbout}
              placeholder="Write a short professional bio…" textarea />
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

          {/* Experience */}
          <Section icon={TrendingUp} title="Experience">
            <div className="space-y-2">
              {experience.length === 0 && !editing && (
                <p className="text-sm italic text-muted-foreground/40">No experience entries added yet.</p>
              )}
              {experience.map((ex, i) => {
                function update(patch: Partial<ExperienceEntry>) {
                  setExperience((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
                }
                return (
                  <DynamicRow key={i} editing={editing} onRemove={() => setExperience((prev) => prev.filter((_, idx) => idx !== i))}>
                    {editing ? (
                      <>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <InlineInput value={ex.role} onChange={(v) => update({ role: v })} placeholder="Role / Position" />
                          <InlineInput value={ex.organization} onChange={(v) => update({ organization: v })} placeholder="Organization / Hospital" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <InlineInput value={ex.from} onChange={(v) => update({ from: v })} placeholder="From (Year)" />
                          <InlineInput value={ex.current ? "Present" : ex.to} onChange={(v) => update({ to: v, current: false })} placeholder="To (Year)" disabled={ex.current} />
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={ex.current} onChange={(e) => update({ current: e.target.checked, to: "" })} className="rounded" />
                            Currently here
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">{ex.role}</p>
                        <p className="text-xs text-muted-foreground">{ex.organization}</p>
                        <p className="text-xs text-muted-foreground/70">{ex.from}{ex.from && " — "}{ex.current ? "Present" : ex.to}</p>
                      </>
                    )}
                  </DynamicRow>
                );
              })}
              {editing && (
                <button onClick={() => setExperience((prev) => [...prev, { role: "", organization: "", from: "", to: "", current: false }])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add Experience
                </button>
              )}
            </div>
          </Section>

          {/* Education */}
          <Section icon={GraduationCap} title="Education / Degrees">
            <div className="space-y-2">
              {education.length === 0 && !editing && (
                <p className="text-sm italic text-muted-foreground/40">No degrees added yet.</p>
              )}
              {education.map((e, i) => {
                function update(patch: Partial<DegreeEntry>) {
                  setEducation((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
                }
                return (
                  <DynamicRow key={i} editing={editing} onRemove={() => setEducation((prev) => prev.filter((_, idx) => idx !== i))}>
                    {editing ? (
                      <>
                        <div className="grid sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <InlineInput value={e.degree} onChange={(v) => update({ degree: v })} placeholder="Degree (e.g. MBBS, FCPS)" />
                          </div>
                          <InlineInput value={e.year} onChange={(v) => update({ year: v })} placeholder="Year" />
                        </div>
                        <InlineInput value={e.institution} onChange={(v) => update({ institution: v })} placeholder="Institution" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium text-foreground">{e.degree}</p>
                          {e.year && <span className="text-xs text-muted-foreground/70">{e.year}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{e.institution}</p>
                      </>
                    )}
                  </DynamicRow>
                );
              })}
              {editing && (
                <button onClick={() => setEducation((prev) => [...prev, { degree: "", institution: "", year: "" }])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add Degree
                </button>
              )}
            </div>
          </Section>

          {/* Memberships */}
          <Section icon={Star} title="Memberships">
            <div className="space-y-2">
              {memberships.length === 0 && !editing && (
                <p className="text-sm italic text-muted-foreground/40">No memberships added yet.</p>
              )}
              {memberships.map((m, i) => {
                function update(patch: Partial<MembershipEntry>) {
                  setMemberships((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
                }
                return (
                  <DynamicRow key={i} editing={editing} onRemove={() => setMemberships((prev) => prev.filter((_, idx) => idx !== i))}>
                    {editing ? (
                      <>
                        <div className="grid sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <InlineInput value={m.organization} onChange={(v) => update({ organization: v })} placeholder="Organization" />
                          </div>
                          <InlineInput value={m.year} onChange={(v) => update({ year: v })} placeholder="Year" />
                        </div>
                        <InlineInput value={m.role} onChange={(v) => update({ role: v })} placeholder="Role / Position" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium text-foreground">{m.organization}</p>
                          {m.year && <span className="text-xs text-muted-foreground/70">{m.year}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.role}</p>
                      </>
                    )}
                  </DynamicRow>
                );
              })}
              {editing && (
                <button onClick={() => setMemberships((prev) => [...prev, { organization: "", role: "", year: "" }])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add Membership
                </button>
              )}
            </div>
          </Section>

          {/* Trainings & Certifications */}
          <Section icon={Award} title="Trainings & Certifications">
            <div className="space-y-2">
              {trainings.length === 0 && !editing && (
                <p className="text-sm italic text-muted-foreground/40">No trainings added yet.</p>
              )}
              {trainings.map((t, i) => {
                function update(patch: Partial<TrainingEntry>) {
                  setTrainings((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
                }
                return (
                  <DynamicRow key={i} editing={editing} onRemove={() => setTrainings((prev) => prev.filter((_, idx) => idx !== i))}>
                    {editing ? (
                      <>
                        <div className="grid sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <InlineInput value={t.title} onChange={(v) => update({ title: v })} placeholder="Training / Certificate title" />
                          </div>
                          <InlineInput value={t.year} onChange={(v) => update({ year: v })} placeholder="Year" />
                        </div>
                        <InlineInput value={t.institution} onChange={(v) => update({ institution: v })} placeholder="Issuing institution" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium text-foreground">{t.title}</p>
                          {t.year && <span className="text-xs text-muted-foreground/70">{t.year}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{t.institution}</p>
                      </>
                    )}
                  </DynamicRow>
                );
              })}
              {editing && (
                <button onClick={() => setTrainings((prev) => [...prev, { title: "", institution: "", year: "" }])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add Training / Certificate
                </button>
              )}
            </div>
          </Section>

          {/* Publications placeholder */}
          <Section icon={BookOpen} title="Publications & Research">
            <p className="text-sm italic text-muted-foreground/40">Coming soon — add your publications and research work.</p>
          </Section>

        </div>
      </div>
    </div>
  );
}
