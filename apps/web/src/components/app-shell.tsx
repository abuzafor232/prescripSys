"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  FilePlus2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Microscope,
  Pill,
  Printer,
  Plus,
  Settings,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { fetchCurrentUser, logoutSession, refreshAccessToken, loginWithPassword } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSessionHydrated, useSessionStore } from "@/stores/session-store";

const nav: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/",                  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/appointments",      label: "Appointments", icon: CalendarClock   },
  { href: "/prescriptions/new", label: "Prescription", icon: FilePlus2       },
  { href: "/patients",          label: "Patients",     icon: UsersRound      },
  { href: "/medicines",         label: "Drugs",        icon: Pill            },
  { href: "/research",          label: "Research",     icon: Microscope      },
];

type Chamber = { id: string; name: string };
const DEFAULT_CHAMBERS: Chamber[] = [{ id: "default", name: "Dr. Abdullah Eye Care Center" }];

// ─── Prescription Pad Settings ──────────────────────────────────────────────

const PAD_SETTINGS_KEY = "rx-pad-settings";

type PadSettings = {
  pageSize: "A4" | "A5" | "Letter" | "Custom";
  customWidth: string;
  customHeight: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  headerLogoUrl: string;
  headerClinicName: string;
  headerSubtitle: string;
  headerDoctorName: string;
  headerDegrees: string;
  headerSpecialty: string;
  headerAddress: string;
  headerPhone: string;
  headerEmail: string;
  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
  footerShowDivider: boolean;
};

const DEFAULT_PAD: PadSettings = {
  pageSize: "A4",
  customWidth: "210", customHeight: "297",
  marginTop: "20", marginBottom: "20", marginLeft: "20", marginRight: "20",
  headerLogoUrl: "", headerClinicName: "", headerSubtitle: "",
  headerDoctorName: "", headerDegrees: "", headerSpecialty: "",
  headerAddress: "", headerPhone: "", headerEmail: "",
  footerLine1: "", footerLine2: "", footerLine3: "",
  footerShowDivider: true,
};

function loadPadSettings(): PadSettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(PAD_SETTINGS_KEY) : null;
    return raw ? { ...DEFAULT_PAD, ...(JSON.parse(raw) as Partial<PadSettings>) } : { ...DEFAULT_PAD };
  } catch { return { ...DEFAULT_PAD }; }
}

function savePadSettings(s: PadSettings) {
  try { localStorage.setItem(PAD_SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Pad Preview ────────────────────────────────────────────────────────────

const PAGE_MM: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
};

function PadPreview({ pad }: { pad: PadSettings }) {
  const { w, h } = pad.pageSize === "Custom"
    ? { w: Number(pad.customWidth) || 210, h: Number(pad.customHeight) || 297 }
    : PAGE_MM[pad.pageSize];

  const PREVIEW_W = 260;
  const px = PREVIEW_W / w;
  const PREVIEW_H = Math.round(h * px);

  const ml = (Number(pad.marginLeft) || 20) * px;
  const mr = (Number(pad.marginRight) || 20) * px;
  const mt = (Number(pad.marginTop) || 20) * px;
  const mb = (Number(pad.marginBottom) || 20) * px;

  const hasHeader = pad.headerClinicName || pad.headerDoctorName || pad.headerAddress || pad.headerPhone || pad.headerLogoUrl;
  const hasFooter = pad.footerLine1 || pad.footerLine2 || pad.footerLine3;

  return (
    <div style={{ width: PREVIEW_W, height: PREVIEW_H, background: "white", boxShadow: "0 2px 12px rgba(0,0,0,.18)", borderRadius: 4, position: "relative", overflow: "hidden", flexShrink: 0 }}>
      {/* Margin box */}
      <div style={{ position: "absolute", top: mt, left: ml, right: mr, bottom: mb, border: "1px dashed #d1d5db", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "absolute", top: mt, left: ml, right: mr }}>
        {pad.headerLogoUrl && (
          <img src={pad.headerLogoUrl} alt="logo" style={{ maxHeight: 28, maxWidth: "100%", display: "block", margin: "0 auto 3px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
        {pad.headerClinicName && (
          <div style={{ fontSize: 9, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{pad.headerClinicName}</div>
        )}
        {pad.headerSubtitle && (
          <div style={{ fontSize: 7, textAlign: "center", color: "#555", lineHeight: 1.3 }}>{pad.headerSubtitle}</div>
        )}
        {pad.headerDoctorName && (
          <div style={{ fontSize: 8, fontWeight: 600, textAlign: "center", marginTop: 2, lineHeight: 1.3 }}>{pad.headerDoctorName}</div>
        )}
        {(pad.headerDegrees || pad.headerSpecialty) && (
          <div style={{ fontSize: 7, textAlign: "center", color: "#666", lineHeight: 1.3 }}>
            {[pad.headerDegrees, pad.headerSpecialty].filter(Boolean).join(" · ")}
          </div>
        )}
        {(pad.headerAddress || pad.headerPhone || pad.headerEmail) && (
          <div style={{ fontSize: 6.5, textAlign: "center", color: "#888", marginTop: 2, lineHeight: 1.3 }}>
            {[pad.headerAddress, pad.headerPhone, pad.headerEmail].filter(Boolean).join("  |  ")}
          </div>
        )}
        {hasHeader && <div style={{ borderBottom: "1px solid #ccc", marginTop: 4 }} />}
        {!hasHeader && (
          <div style={{ fontSize: 7, color: "#aaa", textAlign: "center", padding: "6px 0" }}>Header content will appear here</div>
        )}
      </div>

      {/* Dotted content lines */}
      <div style={{ position: "absolute", top: mt + (hasHeader ? 52 : 18), left: ml, right: mr, bottom: mb + (hasFooter ? 28 : 8) }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ borderBottom: "1px dotted #e5e7eb", marginBottom: 7, height: 8 }} />
        ))}
      </div>

      {/* Footer */}
      {(hasFooter || pad.footerShowDivider) && (
        <div style={{ position: "absolute", bottom: mb, left: ml, right: mr, fontSize: 6.5, textAlign: "center", color: "#777", lineHeight: 1.5 }}>
          {pad.footerShowDivider && <div style={{ borderTop: "1px solid #ccc", marginBottom: 3 }} />}
          {pad.footerLine1 && <div>{pad.footerLine1}</div>}
          {pad.footerLine2 && <div>{pad.footerLine2}</div>}
          {pad.footerLine3 && <div>{pad.footerLine3}</div>}
          {!hasFooter && <div style={{ color: "#aaa" }}>Footer content will appear here</div>}
        </div>
      )}
    </div>
  );
}

// ─── Settings field helper ───────────────────────────────────────────────────

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function SettingInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── Pad Settings Panel ──────────────────────────────────────────────────────

function PadSettingsPanel({ pad, updatePad }: { pad: PadSettings; updatePad: (p: Partial<PadSettings>) => void }) {
  const [section, setSection] = useState<"page" | "header" | "footer">("header");

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Settings column */}
      <div className="flex w-72 shrink-0 flex-col border-r overflow-hidden">
        <div className="flex shrink-0 border-b">
          {(["header", "footer", "page"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={cn("flex-1 py-2 text-xs font-medium capitalize transition", section === s ? "border-b-2 border-primary bg-background text-primary" : "text-muted-foreground hover:bg-muted/50")}
              onClick={() => setSection(s)}
            >{s}</button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {section === "page" && (
            <>
              <SettingField label="Page Size">
                <div className="grid grid-cols-2 gap-1.5">
                  {(["A4", "A5", "Letter", "Custom"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={cn("rounded-md border px-3 py-1.5 text-xs font-medium transition", pad.pageSize === sz ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}
                      onClick={() => updatePad({ pageSize: sz })}
                    >{sz}</button>
                  ))}
                </div>
              </SettingField>
              {pad.pageSize === "Custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <SettingField label="Width (mm)">
                    <SettingInput value={pad.customWidth} onChange={(v) => updatePad({ customWidth: v })} placeholder="210" />
                  </SettingField>
                  <SettingField label="Height (mm)">
                    <SettingInput value={pad.customHeight} onChange={(v) => updatePad({ customHeight: v })} placeholder="297" />
                  </SettingField>
                </div>
              )}
              <div className="pt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Margins (mm)</div>
              <div className="grid grid-cols-2 gap-2">
                {(["marginTop", "marginRight", "marginBottom", "marginLeft"] as const).map((k) => (
                  <SettingField key={k} label={k.replace("margin", "")}>
                    <SettingInput value={pad[k]} onChange={(v) => updatePad({ [k]: v })} placeholder="20" />
                  </SettingField>
                ))}
              </div>
            </>
          )}

          {section === "header" && (
            <>
              <SettingField label="Logo URL">
                <SettingInput value={pad.headerLogoUrl} onChange={(v) => updatePad({ headerLogoUrl: v })} placeholder="https://..." />
              </SettingField>
              <SettingField label="Clinic / Chamber Name">
                <SettingInput value={pad.headerClinicName} onChange={(v) => updatePad({ headerClinicName: v })} placeholder="Eye Care Center" />
              </SettingField>
              <SettingField label="Subtitle / Tagline">
                <SettingInput value={pad.headerSubtitle} onChange={(v) => updatePad({ headerSubtitle: v })} placeholder="A Complete Eye Care Solution" />
              </SettingField>
              <SettingField label="Doctor Name">
                <SettingInput value={pad.headerDoctorName} onChange={(v) => updatePad({ headerDoctorName: v })} placeholder="Dr. Mohammad Abdullah" />
              </SettingField>
              <SettingField label="Degrees / Qualifications">
                <SettingInput value={pad.headerDegrees} onChange={(v) => updatePad({ headerDegrees: v })} placeholder="MBBS, MS (Ophthalmology)" />
              </SettingField>
              <SettingField label="Specialty">
                <SettingInput value={pad.headerSpecialty} onChange={(v) => updatePad({ headerSpecialty: v })} placeholder="Consultant Ophthalmologist" />
              </SettingField>
              <SettingField label="Address">
                <SettingInput value={pad.headerAddress} onChange={(v) => updatePad({ headerAddress: v })} placeholder="123 Main Street, Dhaka" />
              </SettingField>
              <SettingField label="Phone">
                <SettingInput value={pad.headerPhone} onChange={(v) => updatePad({ headerPhone: v })} placeholder="+880 1700-000000" />
              </SettingField>
              <SettingField label="Email">
                <SettingInput value={pad.headerEmail} onChange={(v) => updatePad({ headerEmail: v })} placeholder="doctor@example.com" />
              </SettingField>
            </>
          )}

          {section === "footer" && (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={pad.footerShowDivider}
                  onChange={(e) => updatePad({ footerShowDivider: e.target.checked })}
                />
                Show divider line above footer
              </label>
              <SettingField label="Footer Line 1">
                <SettingInput value={pad.footerLine1} onChange={(v) => updatePad({ footerLine1: v })} placeholder="Visiting hours: Sat–Thu, 6–9 PM" />
              </SettingField>
              <SettingField label="Footer Line 2">
                <SettingInput value={pad.footerLine2} onChange={(v) => updatePad({ footerLine2: v })} placeholder="123 Main Street, Dhaka | +880 1700-000000" />
              </SettingField>
              <SettingField label="Footer Line 3">
                <SettingInput value={pad.footerLine3} onChange={(v) => updatePad({ footerLine3: v })} placeholder="www.eyecarebd.com" />
              </SettingField>
            </>
          )}
        </div>

        <div className="shrink-0 border-t px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground">Changes are saved automatically</p>
        </div>
      </div>

      {/* Preview column */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto bg-muted/20 p-6 gap-3">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live Preview</p>
        <PadPreview pad={pad} />
        <p className="text-[10px] text-muted-foreground text-center max-w-[260px]">
          This preview shows how your prescription pad header and footer will look when printed.
        </p>
      </div>
    </div>
  );
}

// ─── Redesigned Chamber Settings Dialog ─────────────────────────────────────

function AppShellChamberSettingsDialog({
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
  const [activeTab, setActiveTab] = useState<"pad" | "chambers">("pad");

  // Pad settings
  const [pad, setPad] = useState<PadSettings>(() => loadPadSettings());
  function updatePad(patch: Partial<PadSettings>) {
    setPad((prev) => { const next = { ...prev, ...patch }; savePadSettings(next); return next; });
  }

  // Chambers tab
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState("");
  const [localChambers, setLocalChambers] = useState<Chamber[]>(chambers);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

  async function handleVerify() {
    if (!password.trim()) { setAuthError("Enter your login password."); return; }
    setVerifying(true); setAuthError("");
    try { await loginWithPassword(userEmail, password); setVerified(true); }
    catch { setAuthError("Incorrect password. Please try again."); }
    finally { setVerifying(false); }
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) { setAddError("Chamber name cannot be empty."); return; }
    if (localChambers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setAddError("A chamber with this name already exists."); return;
    }
    setLocalChambers((cur) => [...cur, { id: `ch-${Date.now()}`, name }]);
    setNewName(""); setAddError("");
  }

  const tabs = [
    { key: "pad" as const, label: "Prescription Pad", icon: Printer },
    { key: "chambers" as const, label: "Chambers", icon: Briefcase },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div className="flex h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border bg-card shadow-2xl">
        {/* Left sidebar */}
        <div className="flex w-44 shrink-0 flex-col border-r bg-muted/30">
          <div className="border-b px-4 py-3.5">
            <h2 className="text-sm font-bold leading-none">Chamber Settings</h2>
          </div>
          <nav className="flex flex-col py-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition",
                  activeTab === key
                    ? "border-r-2 border-primary bg-background font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                onClick={() => setActiveTab(key)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Content header */}
          <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
            <h3 className="font-semibold">
              {activeTab === "pad" ? "Prescription Pad" : "Manage Chambers"}
            </h3>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "pad" ? (
            <PadSettingsPanel pad={pad} updatePad={updatePad} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-5">
                {!verified ? (
                  <div className="space-y-3 max-w-sm">
                    <p className="text-sm text-muted-foreground">Enter your login password to manage chambers.</p>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Login Password</label>
                      <input autoFocus type="password"
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Enter your password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleVerify(); }} />
                    </div>
                    {authError && <p className="text-xs text-destructive">{authError}</p>}
                    <button
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                      disabled={verifying} onClick={() => void handleVerify()}>
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Verify &amp; Continue
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Active Chambers</p>
                      {localChambers.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground">No chambers. Add one below.</p>
                      ) : (
                        <div className="divide-y rounded-md border">
                          {localChambers.map((c) => (
                            <div key={c.id} className="flex items-center justify-between px-3 py-2">
                              <span className="text-sm font-medium">{c.name}</span>
                              <button type="button"
                                className="flex h-6 w-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                                onClick={() => setLocalChambers((cur) => cur.filter((x) => x.id !== c.id))}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Add Chamber</p>
                      <div className="flex gap-2">
                        <input type="text"
                          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Chamber name" value={newName}
                          onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
                        <button type="button"
                          className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                          onClick={handleAdd}>
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      </div>
                      {addError && <p className="text-xs text-destructive">{addError}</p>}
                    </div>
                    <div className="flex gap-2 border-t pt-3">
                      <button type="button" className="flex-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={onClose}>Cancel</button>
                      <button type="button"
                        className="flex-1 h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        onClick={() => { onUpdate(localChambers); onClose(); }}>Save Changes</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"checking" | "ready">("checking");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [chambers, setChambers] = useState<Chamber[]>(DEFAULT_CHAMBERS);
  const [selectedChamber, setSelectedChamber] = useState<Chamber>(DEFAULT_CHAMBERS[0]);
  const [chamberOpen, setChamberOpen] = useState(false);
  const [chamberSettingsOpen, setChamberSettingsOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const chamberRef = useRef<HTMLDivElement>(null);
  const hydrated = useSessionHydrated();
  const accessToken = useSessionStore((state) => state.accessToken);
  const refreshToken = useSessionStore((state) => state.refreshToken);
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clear);
  const setAccessToken = useSessionStore((state) => state.setAccessToken);
  const setUser = useSessionStore((state) => state.setUser);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    async function verifySession() {
      if (!accessToken && !refreshToken) {
        clearSession();
        router.replace("/login");
        return;
      }

      setSessionStatus("checking");

      try {
        if (accessToken) {
          const currentUser = await fetchCurrentUser(accessToken);
          if (!cancelled) {
            setUser(currentUser);
            setSessionStatus("ready");
          }
          return;
        }

        if (refreshToken) {
          const refreshed = await refreshAccessToken(refreshToken);
          const currentUser = await fetchCurrentUser(refreshed.accessToken);
          if (!cancelled) {
            setAccessToken(refreshed.accessToken);
            setUser(currentUser);
            setSessionStatus("ready");
          }
        }
      } catch {
        if (!refreshToken) {
          clearSession();
          router.replace("/login");
          return;
        }

        try {
          const refreshed = await refreshAccessToken(refreshToken);
          const currentUser = await fetchCurrentUser(refreshed.accessToken);
          if (!cancelled) {
            setAccessToken(refreshed.accessToken);
            setUser(currentUser);
            setSessionStatus("ready");
          }
        } catch {
          clearSession();
          router.replace("/login");
        }
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    clearSession,
    hydrated,
    refreshToken,
    router,
    setAccessToken,
    setUser
  ]);

  // Load chambers from localStorage (written by appointment-board)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rx-chambers");
      const parsed: Chamber[] | null = raw ? (JSON.parse(raw) as Chamber[]) : null;
      const loaded = parsed && parsed.length > 0 ? parsed : DEFAULT_CHAMBERS;
      setChambers(loaded);
      const selRaw = localStorage.getItem("rx-selected-chamber");
      const sel: Chamber | null = selRaw ? (JSON.parse(selRaw) as Chamber) : null;
      setSelectedChamber(loaded.find((c) => c.id === sel?.id) ?? loaded[0] ?? DEFAULT_CHAMBERS[0]);
    } catch {
      setChambers(DEFAULT_CHAMBERS);
      setSelectedChamber(DEFAULT_CHAMBERS[0]);
    }
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
      if (chamberRef.current && !chamberRef.current.contains(e.target as Node)) {
        setChamberOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleSelectChamber(c: Chamber) {
    setSelectedChamber(c);
    try { localStorage.setItem("rx-selected-chamber", JSON.stringify(c)); } catch {}
    setChamberOpen(false);
  }

  function handleLogout() {
    const token = refreshToken;
    clearSession();
    router.replace("/login");
    if (token) void logoutSession(token).catch(() => undefined);
  }

  if (!hydrated || sessionStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 shadow-soft">
          <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" className="fill-primary/10" />
            <path d="M10 27 C13 17 23 12 33 17 C25 20 17 24 21 31 C17 25 12 23 10 27Z" className="fill-primary" />
            <path d="M21 31 C19 25 25 21 33 17 C30 24 26 28 21 31Z" fill="currentColor" className="text-primary/60" />
          </svg>
          <div>
            <div className="text-sm font-semibold">Trust Prescription System</div>
            <div className="text-xs text-muted-foreground">Checking session</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CommandPalette />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-[95px] flex-col border-r bg-card transition-all duration-200",
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: collapse hides it
          "lg:translate-x-0",
          sidebarCollapsed && "lg:-translate-x-full"
        )}
      >
        {/* Logo / collapse button — same height as topbar */}
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="flex h-16 w-full shrink-0 items-center justify-center border-b transition-colors hover:bg-muted/40"
          onClick={() => setSidebarCollapsed(true)}
        >
          <svg viewBox="0 0 40 40" className="h-7 w-7 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" className="fill-primary/10" />
            <path d="M10 27 C13 17 23 12 33 17 C25 20 17 24 21 31 C17 25 12 23 10 27Z" className="fill-primary" />
            <path d="M21 31 C19 25 25 21 33 17 C30 24 26 28 21 31Z" fill="currentColor" className="text-primary/60" />
          </svg>
        </button>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-3 px-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as never}
                title={item.label}
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn("text-center text-[10px] font-medium leading-tight", active ? "text-primary" : "")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-200 lg:pl-[95px]", sidebarCollapsed && "lg:pl-0")}>
        <header className="no-print sticky top-0 z-50 flex h-16 items-center border-b bg-card px-3 shadow-sm lg:px-5">
          {/* Left: logo + system name */}
          <div className="flex min-w-0 items-center gap-3">
            {sidebarCollapsed && (
              <button
                type="button"
                aria-label="Expand sidebar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60"
                onClick={() => setSidebarCollapsed(false)}
              >
                <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" className="fill-primary/10" />
                  <path d="M10 27 C13 17 23 12 33 17 C25 20 17 24 21 31 C17 25 12 23 10 27Z" className="fill-primary" />
                  <path d="M21 31 C19 25 25 21 33 17 C30 24 26 28 21 31Z" fill="currentColor" className="text-primary/60" />
                </svg>
              </button>
            )}
            {!sidebarCollapsed && (
              <Button
                aria-label="Open menu"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 lg:hidden"
                onClick={() => setMobileOpen((o) => !o)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <span className="truncate text-xl font-extrabold leading-none tracking-tight text-primary">
              Trust Prescription System
            </span>
          </div>

          {/* Right: chamber selector + settings + avatar */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {user?.fullName && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                Dr. {user.fullName}
              </span>
            )}

            {/* Dynamic chamber selector */}
            <div ref={chamberRef} className="relative hidden md:block">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/15 px-3 py-1.5 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/25 hover:shadow"
                onClick={() => setChamberOpen((o) => !o)}
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                <span className="max-w-[200px] truncate">{selectedChamber.name}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", chamberOpen && "rotate-180")} />
              </button>

              {chamberOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[240px] rounded-xl border bg-card shadow-xl">
                  <div className="border-b px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Select Chamber
                  </div>
                  {chambers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-muted",
                        selectedChamber.id === c.id && "font-semibold text-primary"
                      )}
                      onClick={() => handleSelectChamber(c)}
                    >
                      {c.name}
                      {selectedChamber.id === c.id && (
                        <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Active</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t mt-1 px-2 py-2">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      onClick={() => { setChamberOpen(false); setChamberSettingsOpen(true); }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Manage Chambers
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Settings */}
            <Button aria-label="Settings" size="icon" variant="ghost" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>

            {/* Avatar + dropdown */}
            <div ref={avatarRef} className="relative ml-0.5">
              <button
                aria-label="Account menu"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
                onClick={() => setAvatarOpen((o) => !o)}
              >
                {user?.fullName?.[0]?.toUpperCase() ?? "U"}
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border bg-card p-1 shadow-lg">
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-bold leading-none text-foreground">{user?.fullName ?? "Signed in"}</p>
                    {user?.email && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                  <div className="my-1 border-t" />
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10"
                    onClick={() => { setAvatarOpen(false); handleLogout(); }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 pt-3 pb-4 lg:px-5">{children}</main>
      </div>

      {chamberSettingsOpen && (
        <AppShellChamberSettingsDialog
          chambers={chambers}
          userEmail={user?.email ?? ""}
          onClose={() => setChamberSettingsOpen(false)}
          onUpdate={(updated) => {
            const withDefault = updated.length === 0 ? DEFAULT_CHAMBERS : updated;
            setChambers(withDefault);
            try { localStorage.setItem("rx-chambers", JSON.stringify(withDefault)); } catch {}
            if (!updated.find((c) => c.id === selectedChamber.id)) {
              const first = withDefault[0] ?? DEFAULT_CHAMBERS[0];
              setSelectedChamber(first);
              try { localStorage.setItem("rx-selected-chamber", JSON.stringify(first)); } catch {}
            }
          }}
        />
      )}
    </div>
  );
}
