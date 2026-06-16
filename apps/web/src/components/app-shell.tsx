"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Microscope,
  Pill,
  Settings,
  UsersRound
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { fetchCurrentUser, logoutSession, refreshAccessToken } from "@/lib/api";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"checking" | "ready">("checking");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
          className="flex h-10 w-full shrink-0 items-center justify-center border-b transition-colors hover:bg-muted/40"
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
        <header className="no-print sticky top-0 z-30 flex h-10 items-center border-b bg-card px-3 shadow-sm lg:px-4">
          {/* Left: logo + system name */}
          <div className="flex min-w-0 items-center gap-2">
            {sidebarCollapsed && (
              <button
                type="button"
                aria-label="Expand sidebar"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60"
                onClick={() => setSidebarCollapsed(false)}
              >
                <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                className="h-7 w-7 shrink-0 lg:hidden"
                onClick={() => setMobileOpen((o) => !o)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <span className="truncate text-sm font-semibold leading-none tracking-tight">Trust Prescription System</span>
          </div>

          {/* Right: consultation type + settings + avatar — always pinned to right */}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* Consultation type pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 md:flex">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">Dr. Abdullah Eye Care Center</span>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Settings */}
            <Button aria-label="Settings" size="icon" variant="ghost" className="h-7 w-7">
              <Settings className="h-3.5 w-3.5" />
            </Button>

            {/* Avatar + dropdown */}
            <div ref={avatarRef} className="relative ml-0.5">
              <button
                aria-label="Account menu"
                className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-primary font-bold text-primary-foreground text-xs shadow-sm transition hover:opacity-90"
                onClick={() => setAvatarOpen((o) => !o)}
              >
                {user?.fullName?.[0]?.toUpperCase() ?? "U"}
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border bg-card p-1 shadow-lg">
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold leading-none">{user?.fullName ?? "Signed in"}</p>
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
        <main className="mx-auto w-full max-w-[1440px] px-4 pt-2 pb-3 lg:px-5">{children}</main>
      </div>
    </div>
  );
}
