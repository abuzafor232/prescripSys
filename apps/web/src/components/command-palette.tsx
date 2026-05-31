"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  FilePlus2,
  LayoutDashboard,
  Pill,
  Search,
  Settings,
  UserRoundPlus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const actions = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointment", icon: CalendarClock },
  { href: "/prescriptions/new", label: "Prescription", icon: FilePlus2 },
  { href: "/patients", label: "Patient", icon: UserRoundPlus },
  { href: "/medicines", label: "Medicine", icon: Pill },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  const filtered = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4 backdrop-blur-sm">
      <div className="mx-auto mt-20 w-full max-w-xl rounded-lg border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            className="border-0 px-0 focus-visible:ring-0"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="p-2">
          {filtered.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm",
                  "hover:bg-muted focus:bg-muted focus:outline-none"
                )}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
