"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, FileText, UsersRound } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DashboardSummary = {
  patients: number;
  appointments: number;
  prescriptions: number;
  income: number;
};

const statCards = [
  { key: "patients", label: "Patient", icon: UsersRound, tone: "text-primary" },
  { key: "appointments", label: "Appointment", icon: CalendarClock, tone: "text-amber-600" },
  { key: "prescriptions", label: "Prescriptions", icon: FileText, tone: "text-rose-600" },
  { key: "income", label: "Income", icon: CircleDollarSign, tone: "text-emerald-600" }
] as const;

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  return {
    start: getDateInputValue(start),
    end: getDateInputValue(end)
  };
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDaysInRange(start: string, end: string) {
  const days: string[] = [];
  const cursor = parseDateInput(start);
  const last = parseDateInput(end);

  while (cursor <= last && days.length < 366) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");

    days.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getDemoSummaryForDate(date: string): DashboardSummary {
  const seed = date
    .replaceAll("-", "")
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index + 3), 0);

  const appointments = 28 + (seed % 18);
  const prescriptions = 18 + ((seed * 3) % 14);

  return {
    patients: 22 + ((seed * 2) % 17),
    appointments,
    prescriptions,
    income: prescriptions * (500 + (seed % 5) * 100)
  };
}

function getRangeSummary(start: string, end: string): DashboardSummary {
  return getDaysInRange(start, end).reduce(
    (summary, date) => {
      const daily = getDemoSummaryForDate(date);

      return {
        patients: summary.patients + daily.patients,
        appointments: summary.appointments + daily.appointments,
        prescriptions: summary.prescriptions + daily.prescriptions,
        income: summary.income + daily.income
      };
    },
    { patients: 0, appointments: 0, prescriptions: 0, income: 0 }
  );
}

function formatDisplayDate(value: string) {
  return parseDateInput(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatStatValue(key: keyof DashboardSummary, value: number) {
  if (key === "income") return `Tk ${value.toLocaleString("en-US")}`;

  return value.toLocaleString("en-US");
}

function formatDayCount(count: number) {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

const defaultRange = getDefaultRange();

const dateRangeInputClass =
  "h-9 min-w-[9.5rem] border-primary/30 bg-background font-medium text-foreground";

const dateLabelClass = "grid gap-1 text-xs font-medium text-muted-foreground";

const actionLinkClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition";

const rangeSummaryClass = "text-sm text-muted-foreground";

const quickActions = [
  {
    href: "/appointments",
    label: "Appointment",
    icon: CalendarClock,
    className: "bg-muted hover:bg-muted/80"
  },
  {
    href: "/prescriptions/new",
    label: "New Prescription",
    icon: FileText,
    className: "bg-primary text-primary-foreground hover:bg-primary/90"
  }
] as const;

export function Dashboard() {
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const selectedDays = getDaysInRange(startDate, endDate);
  const summary = useMemo(
    () => getRangeSummary(startDate, endDate),
    [endDate, startDate]
  );
  const rangeLabel = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;

  function handleStartDateChange(value: string) {
    const nextStart = value || defaultRange.start;

    setStartDate(nextStart);
    if (nextStart > endDate) setEndDate(nextStart);
  }

  function handleEndDateChange(value: string) {
    const nextEnd = value || defaultRange.end;

    setEndDate(nextEnd);
    if (nextEnd < startDate) setStartDate(nextEnd);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className={rangeSummaryClass}>
            {rangeLabel} - {formatDayCount(selectedDays.length)}
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={dateLabelClass}>
              Start Date
              <Input
                className={dateRangeInputClass}
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
              />
            </label>
            <label className={dateLabelClass}>
              End Date
              <Input
                className={dateRangeInputClass}
                min={startDate}
                type="date"
                value={endDate}
                onChange={(event) => handleEndDateChange(event.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`${actionLinkClass} ${action.className}`}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const value = summary[stat.key];

          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {formatStatValue(stat.key, value)}
                  </div>
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
