"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  PlusCircle,
  RefreshCw,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AppointmentStatus = "Pending" | "Confirmed" | "Completed";

type Appointment = {
  id: string;
  patientName: string;
  phone: string;
  time: string;
  note: string;
  dateOfBirth: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  gender: "Male" | "Female" | "Other";
  appointmentType: "New" | "Follow-up" | "Report";
  status: AppointmentStatus;
};

type AppointmentFormState = {
  patientName: string;
  phone: string;
  time: string;
  note: string;
  dateOfBirth: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  gender: "Male" | "Female" | "Other";
  appointmentType: "New" | "Follow-up" | "Report";
  status: AppointmentStatus;
};

const emptyAppointmentForm: AppointmentFormState = {
  patientName: "",
  phone: "",
  time: "09:00 AM",
  note: "",
  dateOfBirth: "",
  ageYears: "",
  ageMonths: "",
  ageDays: "",
  gender: "Male",
  appointmentType: "New",
  status: "Pending"
};

const statusColumns: AppointmentStatus[] = ["Pending", "Confirmed", "Completed"];
const bookingSlots = [
  "09:00 AM",
  "09:05 AM",
  "09:10 AM",
  "09:15 AM",
  "09:20 AM",
  "09:25 AM",
  "09:30 AM",
  "09:35 AM",
  "09:40 AM",
  "09:45 AM",
  "09:50 AM",
  "09:55 AM"
];

export function AppointmentBoard() {
  const [selectedDate, setSelectedDate] = useState("2026-05-30");
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState<AppointmentFormState>(emptyAppointmentForm);
  const [statusMessage, setStatusMessage] = useState("");

  const groupedAppointments = useMemo(
    () =>
      statusColumns.reduce<Record<AppointmentStatus, Appointment[]>>(
        (acc, status) => {
          acc[status] = appointments.filter((item) => item.status === status);
          return acc;
        },
        { Pending: [], Confirmed: [], Completed: [] }
      ),
    [appointments]
  );

  function updateForm(patch: Partial<AppointmentFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patientName = form.patientName.trim();

    if (!patientName) {
      setStatusMessage("Patient name is required.");
      return;
    }

    setAppointments((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        patientName,
        phone: form.phone.trim(),
        time: form.time,
        note: form.note.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        ageYears: form.ageYears.trim(),
        ageMonths: form.ageMonths.trim(),
        ageDays: form.ageDays.trim(),
        gender: form.gender,
        appointmentType: form.appointmentType,
        status: form.status
      }
    ]);
    setForm(emptyAppointmentForm);
    setAppointmentOpen(false);
    setStatusMessage("Appointment added.");
  }

  function moveAppointment(id: string, status: AppointmentStatus) {
    setAppointments((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  function refreshBoard() {
    setStatusMessage("Appointment board refreshed.");
  }

  return (
    <>
      <div className="space-y-5 pb-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Appointments</h1>
            <p className="text-sm text-muted-foreground">Personal/Remote Consultations</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DateControl value={selectedDate} onChange={setSelectedDate} />
            <Button type="button" onClick={() => setAppointmentOpen(true)}>
              Book Appointment
              <PlusCircle className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={refreshBoard}>
              Refresh
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportMenuOpen((current) => !current)}
              >
                Show Report
                <ChevronDown className="h-4 w-4" />
              </Button>
              {reportMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-md border bg-card p-1 shadow-soft">
                  {["Daily Summary", "Follow-up Report", "Patient Queue"].map((item) => (
                    <button
                      key={item}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      type="button"
                      onClick={() => {
                        setStatusMessage(`${item} selected.`);
                        setReportMenuOpen(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {statusMessage ? (
          <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[365px_minmax(0,1fr)]">
          <aside className="min-h-[46rem] rounded-md bg-[#dfe6ff] p-2">
            <DateControl value={selectedDate} onChange={setSelectedDate} fullWidth />
            <h2 className="mt-4 px-2 text-2xl font-semibold text-foreground">Follow-up</h2>
            <div className="mt-5 space-y-3">
              {appointments.length ? (
                appointments.map((item) => (
                  <AppointmentCard
                    key={item.id}
                    appointment={item}
                    compact
                    onMove={moveAppointment}
                  />
                ))
              ) : (
                <div className="px-2 text-sm text-muted-foreground">
                  No follow-up appointments.
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="border-b">
              <button
                className="border-b-2 border-primary px-5 py-4 text-lg font-semibold text-primary"
                type="button"
              >
                09:00 AM - 11:59 PM
              </button>
            </div>

            <div className="grid gap-6 pt-3 xl:grid-cols-3">
              {statusColumns.map((status) => (
                <div key={status} className="min-w-0">
                  <div className="rounded-md bg-muted px-5 py-4 text-2xl font-semibold">
                    {status}
                  </div>
                  <div className="mt-4 space-y-3">
                    {groupedAppointments[status].length ? (
                      groupedAppointments[status].map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          onMove={moveAppointment}
                        />
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                        No records found
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {appointmentOpen ? (
        <BookAppointmentDialog
          date={selectedDate}
          form={form}
          onClose={() => setAppointmentOpen(false)}
          onDateChange={setSelectedDate}
          onReset={() => setForm(emptyAppointmentForm)}
          onSearchPatient={(query) =>
            setStatusMessage(query ? `Searching patient: ${query}` : "Type a patient number or phone first.")
          }
          onSubmit={handleSubmit}
          onUpdate={updateForm}
        />
      ) : null}
    </>
  );
}

function DateControl({
  value,
  fullWidth = false,
  onChange
}: {
  value: string;
  fullWidth?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex h-14 overflow-hidden rounded-md border border-primary/30 bg-card",
        fullWidth ? "w-full" : "w-full sm:w-72"
      )}
    >
      <span className="flex flex-1 items-center justify-center px-4 text-sm font-semibold sm:text-base">
        {formatDisplayDate(value)}
      </span>
      <span className="relative flex w-12 items-center justify-center border-l bg-muted">
        <CalendarDays className="pointer-events-none h-4 w-4" />
        <input
          aria-label="Appointment date"
          className="absolute inset-0 cursor-pointer opacity-0"
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function AppointmentCard({
  appointment,
  compact = false,
  onMove
}: {
  appointment: Appointment;
  compact?: boolean;
  onMove: (id: string, status: AppointmentStatus) => void;
}) {
  return (
    <article className="rounded-md border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{appointment.patientName}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {appointment.time || "No time set"}
          </div>
          {appointment.phone ? (
            <div className="mt-1 text-xs text-muted-foreground">{appointment.phone}</div>
          ) : null}
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
          {appointment.status}
        </span>
      </div>

      {!compact && appointment.note ? (
        <p className="mt-3 text-sm text-muted-foreground">{appointment.note}</p>
      ) : null}

      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {statusColumns
            .filter((status) => status !== appointment.status)
            .map((status) => (
              <Button
                key={status}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onMove(appointment.id, status)}
              >
                Move to {status}
              </Button>
            ))}
        </div>
      ) : null}
    </article>
  );
}

function BookAppointmentDialog({
  date,
  form,
  onClose,
  onDateChange,
  onReset,
  onSearchPatient,
  onSubmit,
  onUpdate
}: {
  date: string;
  form: AppointmentFormState;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onReset: () => void;
  onSearchPatient: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (patch: Partial<AppointmentFormState>) => void;
}) {
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const visibleSlots = showAllSlots ? bookingSlots : bookingSlots.slice(0, 8);

  function runSearch() {
    onSearchPatient(patientSearch.trim());
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f4f7ff]">
      <form
        className="min-h-screen"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-[#f4f7ff] px-3">
          <h2 className="text-2xl font-semibold text-primary">Appointment Booking</h2>
          <button
            aria-label="Close appointment booking"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
            title="Close appointment booking"
            type="button"
            onClick={onClose}
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="mx-2 mb-4 rounded-md bg-card px-10 py-6 shadow-sm">
          <div className="space-y-3">
            <label className="block text-sm font-medium">Select Date</label>
            <DateControl value={date} onChange={onDateChange} fullWidth />
          </div>

          <div className="mt-7 border-b">
            <button
              className="border-b-2 border-primary px-5 py-3 text-xl font-semibold text-primary"
              type="button"
            >
              09:00 AM - 11:59 PM
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {visibleSlots.map((slot, index) => (
              <button
                key={slot}
                className={cn(
                  "inline-flex h-12 items-center gap-2 rounded-xl px-3 text-primary",
                  form.time === slot ? "bg-primary text-primary-foreground" : "bg-primary/10"
                )}
                type="button"
                onClick={() => onUpdate({ time: slot })}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    form.time === slot ? "bg-primary-foreground text-primary" : "bg-card text-primary"
                  )}
                >
                  {index + 1}
                </span>
                {slot}
              </button>
            ))}
            {!showAllSlots ? (
              <button
                className="h-12 rounded-md px-4 text-primary hover:bg-muted"
                type="button"
                onClick={() => setShowAllSlots(true)}
              >
                See more
              </button>
            ) : null}
          </div>

          <div className="mt-6 flex justify-center gap-4 text-sm">
            <LegendItem label="Available" tone="available" />
            <LegendItem label="Selected" tone="selected" />
            <LegendItem label="Booked" tone="booked" />
          </div>

          <div className="mt-6 flex overflow-hidden rounded-xl border">
            <Input
              className="h-12 rounded-none border-0"
              placeholder="Type a patient number or phone number, then press Enter or click Search."
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runSearch();
                }
              }}
            />
            <button
              aria-label="Search patient"
              className="flex h-12 w-14 items-center justify-center bg-primary text-primary-foreground"
              title="Search patient"
              type="button"
              onClick={runSearch}
            >
              <Search className="h-6 w-6" />
            </button>
          </div>

          <div className="my-6 flex items-center justify-center gap-2">
            <div className="h-px w-40 bg-border" />
            <h3 className="text-lg font-semibold">Add information for appointment</h3>
            <div className="h-px w-40 bg-border" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <RequiredText>Phone Number</RequiredText>
              <div className="flex">
                <span className="inline-flex h-12 items-center rounded-l-xl border border-r-0 bg-muted px-4 text-sm">
                  +88
                </span>
                <Input
                  className="h-12 rounded-l-none rounded-r-xl"
                  inputMode="tel"
                  placeholder="Type patient's phone number"
                  value={form.phone}
                  onChange={(event) => onUpdate({ phone: event.target.value })}
                />
              </div>
            </label>

            <label className="space-y-2">
              <RequiredText>Patient&apos;s Name</RequiredText>
              <Input
                className="h-12 rounded-xl"
                value={form.patientName}
                placeholder="Type patient's name here"
                onChange={(event) => onUpdate({ patientName: event.target.value })}
              />
            </label>

            <label className="space-y-2">
              <RequiredText>Date of Birth</RequiredText>
              <div className="flex">
                <Input
                  className="h-12 rounded-l-xl rounded-r-none"
                  inputMode="numeric"
                  placeholder="dd/mm/yyyy"
                  value={form.dateOfBirth}
                  onChange={(event) => onUpdate({ dateOfBirth: event.target.value })}
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-r-xl border border-l-0 bg-muted">
                  <CalendarDays className="h-4 w-4" />
                </span>
              </div>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium">Age</span>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  className="h-12 rounded-xl"
                  inputMode="numeric"
                  placeholder="Year"
                  value={form.ageYears}
                  onChange={(event) =>
                    onUpdate({ ageYears: event.target.value.replace(/\D/g, "") })
                  }
                />
                <Input
                  className="h-12 rounded-xl"
                  inputMode="numeric"
                  placeholder="Month"
                  value={form.ageMonths}
                  onChange={(event) =>
                    onUpdate({ ageMonths: event.target.value.replace(/\D/g, "") })
                  }
                />
                <Input
                  className="h-12 rounded-xl"
                  inputMode="numeric"
                  placeholder="Day"
                  value={form.ageDays}
                  onChange={(event) =>
                    onUpdate({ ageDays: event.target.value.replace(/\D/g, "") })
                  }
                />
              </div>
            </div>

            <SegmentedBookingField
              label="Gender"
              options={["Male", "Female", "Other"]}
              required
              value={form.gender}
              onChange={(value) => onUpdate({ gender: value as AppointmentFormState["gender"] })}
            />

            <SegmentedBookingField
              label="Type"
              options={["New", "Follow-up", "Report"]}
              required
              value={form.appointmentType}
              onChange={(value) =>
                onUpdate({ appointmentType: value as AppointmentFormState["appointmentType"] })
              }
            />

            <div className="md:col-span-2">
              <button
                className="float-right text-primary underline-offset-2 hover:underline"
                type="button"
                onClick={() => setCommentOpen((current) => !current)}
              >
                +add comment
              </button>
            </div>

            {commentOpen ? (
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Comment</span>
                <Textarea
                  className="min-h-24 rounded-xl"
                  value={form.note}
                  onChange={(event) => onUpdate({ note: event.target.value })}
                />
              </label>
            ) : null}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)]">
            <Button
              className="h-14 rounded-xl"
              type="button"
              variant="outline"
              onClick={() => {
                onReset();
                setPatientSearch("");
                setCommentOpen(false);
              }}
            >
              Reset
            </Button>
            <Button className="h-14 rounded-xl bg-emerald-600 text-base hover:bg-emerald-700" type="submit">
              Book Appointment
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function LegendItem({
  label,
  tone
}: {
  label: string;
  tone: "available" | "selected" | "booked";
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          tone === "available" && "bg-primary/10",
          tone === "selected" && "bg-primary",
          tone === "booked" && "bg-muted-foreground"
        )}
      />
      {label}
    </span>
  );
}

function RequiredText({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium">
      {children}
      <span className="text-destructive">*</span>
    </span>
  );
}

function SegmentedBookingField({
  label,
  options,
  required = false,
  value,
  onChange
}: {
  label: string;
  options: string[];
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </span>
      <div className="grid overflow-hidden rounded-xl border sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option}
            className={cn(
              "h-12 border-b border-r text-sm font-semibold last:border-r-0 sm:border-b-0",
              value === option
                ? "bg-blue-500 text-white"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDisplayDate(value: string) {
  if (!value) return "Select date";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Select date";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
