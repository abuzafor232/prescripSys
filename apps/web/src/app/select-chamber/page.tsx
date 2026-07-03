"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, Printer } from "lucide-react";
import { useSessionHydrated, useSessionStore } from "@/stores/session-store";

type Chamber = { id: string; name: string };

const DEFAULT_CHAMBERS: Chamber[] = [{ id: "default", name: "Dr. Abdullah Eye Care Center" }];

export default function SelectChamberPage() {
  const router = useRouter();
  const hydrated = useSessionHydrated();
  const accessToken = useSessionStore((s) => s.accessToken);
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const user = useSessionStore((s) => s.user);

  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken && !refreshToken) {
      router.replace("/login");
      return;
    }
    try {
      const raw = localStorage.getItem("rx-chambers");
      const parsed: Chamber[] | null = raw ? (JSON.parse(raw) as Chamber[]) : null;
      setChambers(parsed && parsed.length > 0 ? parsed : DEFAULT_CHAMBERS);
    } catch {
      setChambers(DEFAULT_CHAMBERS);
    }
  }, [hydrated, accessToken, refreshToken, router]);

  function handleSelect(chamber: Chamber) {
    setSelected(chamber.id);
    try {
      localStorage.setItem("rx-selected-chamber", JSON.stringify(chamber));
    } catch {}
    setTimeout(() => router.replace("/"), 150);
  }

  if (!hydrated || chambers.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <Printer className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Select Chamber</h1>
          {user?.fullName && (
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome, <span className="font-semibold text-primary">Dr. {user.fullName}</span>. Choose a chamber to continue.
            </p>
          )}
          {!user?.fullName && (
            <p className="mt-1 text-sm text-muted-foreground">Choose a chamber to continue.</p>
          )}
        </div>
      </div>

      {/* Chamber cards */}
      <div className="w-full max-w-md space-y-3">
        {chambers.map((chamber) => {
          const isSelected = selected === chamber.id;
          return (
            <button
              key={chamber.id}
              type="button"
              onClick={() => handleSelect(chamber)}
              disabled={selected !== null}
              className={`flex w-full items-center gap-4 rounded-xl border-2 bg-card px-5 py-4 text-left shadow-sm transition-all duration-150
                ${isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-muted/40 hover:shadow"
                }
                disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors
                ${isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="flex-1 text-base font-semibold text-foreground">{chamber.name}</span>
              {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        You can switch chambers anytime from the top bar.
      </p>
    </main>
  );
}
