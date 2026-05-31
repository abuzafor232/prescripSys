"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  Printer,
  Search,
  Settings,
  UsersRound
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { fetchCurrentUser, logoutSession, refreshAccessToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSessionHydrated, useSessionStore } from "@/stores/session-store";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointment", icon: CalendarClock },
  { href: "/prescriptions/new", label: "Prescription", icon: FilePlus2 },
  { href: "/patients", label: "Patient", icon: UsersRound },
  { href: "/medicines", label: "Medicine", icon: Pill },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"checking" | "ready">("checking");
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
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">PrescriptionOS BD</div>
            <div className="text-xs text-muted-foreground">Checking session</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CommandPalette />
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">PrescriptionOS BD</div>
              <div className="text-xs text-muted-foreground">
                {user?.roles[0] ?? "Doctor"} workspace
              </div>
            </div>
          </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-3">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs font-medium">Active shift</div>
            <div className="mt-2 flex items-center justify-between">
              <Badge>Evening</Badge>
              <span className="text-xs text-muted-foreground">24 waiting</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <Button
              aria-label="Open menu"
              title="Open menu"
              size="icon"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <button
              className="hidden h-9 min-w-72 items-center gap-2 rounded-md border bg-card px-3 text-left text-sm text-muted-foreground md:flex"
              onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            >
              <Search className="h-4 w-4" />
              Search
              <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px]">
                Ctrl K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="hidden md:inline-flex">{user?.fullName ?? "Signed in"}</Badge>
            <ThemeToggle />
            <Button
              aria-label="Sign out"
              title="Sign out"
              size="icon"
              variant="ghost"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
