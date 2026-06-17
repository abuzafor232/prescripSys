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
  Plus,
  Settings,
  Trash2,
  UsersRound
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
    try {
      await loginWithPassword(userEmail, password);
      setVerified(true);
    } catch {
      setAuthError("Incorrect password. Please try again.");
    } finally { setVerifying(false); }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold">Manage Chambers</h2>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {!verified ? (
            <div className="space-y-3">
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
            <div className="space-y-4">
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
        <header className="no-print sticky top-0 z-30 flex h-16 items-center border-b bg-card px-3 shadow-sm lg:px-5">
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
