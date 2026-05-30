import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceState = {
  activeChamberId?: string;
  setActiveChamberId: (id: string) => void;
  compactMode: boolean;
  toggleCompactMode: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      compactMode: true,
      setActiveChamberId: (activeChamberId) => set({ activeChamberId }),
      toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode }))
    }),
    { name: "bd-prescription-workspace" }
  )
);
