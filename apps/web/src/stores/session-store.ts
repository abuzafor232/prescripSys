"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/lib/api";

type SessionState = {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  setSession: (session: Pick<SessionState, "accessToken" | "refreshToken" | "user">) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      setSession: (session) => set(session),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: undefined, refreshToken: undefined, user: undefined })
    }),
    { name: "bd-prescription-session" }
  )
);

export function useSessionHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
