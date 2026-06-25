import { UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PatientsPage } from "@/features/patients/patients-page";

export default function PatientsRoutePage() {
  return (
    <AppShell>
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Patients</h1>
        </div>
        <p className="text-sm text-muted-foreground">Registration, history, allergies, follow-up</p>
      </div>
      <PatientsPage />
    </AppShell>
  );
}
