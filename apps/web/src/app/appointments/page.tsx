import { AppShell } from "@/components/app-shell";
import { AppointmentBoard } from "@/features/appointments/appointment-board";

export default function AppointmentsPage() {
  return (
    <AppShell>
      <AppointmentBoard />
    </AppShell>
  );
}
