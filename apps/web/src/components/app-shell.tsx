"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  Printer,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
          "no-print fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-all duration-200 lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-3 border-b px-4",
            sidebarCollapsed ? "lg:justify-center lg:px-3" : ""
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Printer className="h-5 w-5" />
          </div>
          <div className={cn("min-w-0", sidebarCollapsed ? "lg:hidden" : "")}>
            <div className="truncate text-sm font-semibold">PrescriptionOS BD</div>
            <div className="truncate text-xs text-muted-foreground">
              {user?.roles[0] ?? "Doctor"} workspace
            </div>
          </div>
          <Button
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("ml-auto hidden h-8 w-8 lg:inline-flex", sidebarCollapsed ? "lg:hidden" : "")}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        {sidebarCollapsed ? (
          <div className="hidden border-b p-3 lg:block">
            <Button
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="h-10 w-10"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setSidebarCollapsed(false)}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        <nav className={cn("space-y-1 p-3", sidebarCollapsed ? "lg:px-2" : "")}>
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
                  sidebarCollapsed ? "lg:justify-center lg:px-0" : "",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setMobileOpen(false)}
                title={item.label}
              >
                <Icon className={cn("h-4 w-4 shrink-0", sidebarCollapsed ? "lg:h-5 lg:w-5" : "")} />
                <span className={cn("truncate", sidebarCollapsed ? "lg:hidden" : "")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className={cn("absolute bottom-0 left-0 right-0 border-t p-3", sidebarCollapsed ? "lg:hidden" : "")}>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs font-medium">Active shift</div>
            <div className="mt-2 flex items-center justify-between">
              <Badge>Evening</Badge>
              <span className="text-xs text-muted-foreground">24 waiting</span>
            </div>
          </div>
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-200", sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")}>
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
