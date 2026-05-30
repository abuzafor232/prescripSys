import { Settings } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModulePage } from "@/components/module-page";

export default function SettingsPage() {
  return (
    <AppShell>
      <ModulePage
        title="Settings"
        subtitle="Templates, users, chamber rules, integrations"
        icon={Settings}
        rows={[
          { Scope: "Prescription", Key: "A4 Template", Status: "Active" },
          { Scope: "Chamber", Key: "Daily Serial Reset", Status: "Active" },
          { Scope: "Security", Key: "2FA", Status: "Optional" }
        ]}
      />
    </AppShell>
  );
}
