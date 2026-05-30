import { AppShell } from "@/components/app-shell";
import { PrescriptionBuilder } from "@/features/prescriptions/prescription-builder";

export default function NewPrescriptionPage() {
  return (
    <AppShell>
      <PrescriptionBuilder />
    </AppShell>
  );
}
