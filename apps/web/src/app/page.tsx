import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/features/dashboard/dashboard";

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
