import { CalendarClock, CircleDollarSign, FileText, UsersRound } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Patient", value: "1,284", icon: UsersRound, tone: "text-primary" },
  { label: "Appointment", value: "42", icon: CalendarClock, tone: "text-amber-600" },
  { label: "Prescriptions", value: "31", icon: FileText, tone: "text-rose-600" },
  { label: "Income", value: "Tk 18,500", icon: CircleDollarSign, tone: "text-emerald-600" }
];

export function Dashboard() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Today</h1>
          <p className="text-sm text-muted-foreground">Tuesday, May 26, 2026</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/appointments"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-muted px-3 text-sm font-medium hover:bg-muted/80"
          >
            <CalendarClock className="h-4 w-4" />
            Appointment
          </Link>
          <Link
            href="/prescriptions/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            New Prescription
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="mt-1 text-2xl font-semibold">{stat.value}</div>
                </div>
                <Icon className={`h-6 w-6 ${stat.tone}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
