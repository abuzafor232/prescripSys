import { AppShell } from "@/components/app-shell";
import { PatientsPage } from "@/features/patients/patients-page";

export default function PatientsRoutePage() {
  return (
    <AppShell>
      <PatientsPage />
    </AppShell>
  );
}
