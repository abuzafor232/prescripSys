import { UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModulePage } from "@/components/module-page";

export default function PatientsPage() {
  return (
    <AppShell>
      <ModulePage
        title="Patients"
        subtitle="Registration, history, allergies, follow-up"
        icon={UsersRound}
        rows={[
          { Name: "Hasan Mahmud", Phone: "01700000000", Age: "38Y", Last: "Today" },
          { Name: "Nusrat Jahan", Phone: "01800000000", Age: "29Y", Last: "Today" },
          { Name: "Abdul Karim", Phone: "01900000000", Age: "52Y", Last: "Yesterday" }
        ]}
      />
    </AppShell>
  );
}
