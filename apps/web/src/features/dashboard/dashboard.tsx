import {
  Activity,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Pill,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Patients", value: "1,284", icon: UsersRound, tone: "text-primary" },
  { label: "Today Serial", value: "42", icon: CalendarClock, tone: "text-amber-600" },
  { label: "Prescriptions", value: "31", icon: FileText, tone: "text-rose-600" },
  { label: "Income", value: "৳18,500", icon: CircleDollarSign, tone: "text-emerald-600" }
];

const queue = [
  ["M021", "Hasan Mahmud", "Waiting"],
  ["M022", "Nusrat Jahan", "Vitals"],
  ["M023", "Abdul Karim", "Waiting"],
  ["M024", "Farhana Akter", "Follow-up"]
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
            href="/prescriptions/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            New Prescription
          </Link>
          <Link
            href="/appointments"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-muted px-3 text-sm font-medium hover:bg-muted/80"
          >
            <CalendarClock className="h-4 w-4" />
            Serial
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

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Chamber Queue</CardTitle>
            <Badge>Main Chamber</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[90px_1fr_120px] border-b px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Token</span>
              <span>Patient</span>
              <span>Status</span>
            </div>
            {queue.map(([token, patient, status]) => (
              <div
                key={token}
                className="grid grid-cols-[90px_1fr_120px] items-center border-b px-4 py-3 text-sm last:border-b-0"
              >
                <span className="font-semibold">{token}</span>
                <span>{patient}</span>
                <Badge>{status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Top Medicines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Napa", "Seclo", "Maxpro", "Monas", "Ceevit"].map((medicine, index) => (
                <div key={medicine} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    {medicine}
                  </div>
                  <span className="text-muted-foreground">{35 - index * 4}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Prescription signed", "Patient registered", "Serial completed"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-amber-600" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
