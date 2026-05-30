import { Pill } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModulePage } from "@/components/module-page";

export default function MedicinesPage() {
  return (
    <AppShell>
      <ModulePage
        title="Medicines"
        subtitle="Bangladesh brand and generic database"
        icon={Pill}
        rows={[
          { Brand: "Napa", Generic: "Paracetamol", Strength: "500 mg", Form: "Tablet" },
          { Brand: "Seclo", Generic: "Omeprazole", Strength: "20 mg", Form: "Capsule" },
          { Brand: "Maxpro", Generic: "Esomeprazole", Strength: "20 mg", Form: "Tablet" }
        ]}
      />
    </AppShell>
  );
}
