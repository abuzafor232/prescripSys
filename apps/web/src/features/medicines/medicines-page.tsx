"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, AlertCircle, Plus, X, Pill, Pencil } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "@/hooks/use-debounce";
import { createMedicine, updateMedicine, fetchMedicineList, type CreateMedicineInput, type MedicineListItem } from "@/lib/api";
import { useSessionStore } from "@/stores/session-store";

// ── Add Drug Modal ────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateMedicineInput = {
  brandName:   "",
  genericName: "",
  strength:    "",
  dosageForm:  "",
  companyName: "",
  darNo:       ""
};

function AddDrugModal({ token, onClose }: { token: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm]     = useState<CreateMedicineInput>(EMPTY_FORM);
  const [serverError, setServerError] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateMedicineInput) => createMedicine(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines-list"] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        (err as { message?: string })?.message ??
        "Failed to save. Please try again.";
      setServerError(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  });

  const set = (field: keyof CreateMedicineInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    mutate({
      brandName:   form.brandName.trim(),
      genericName: form.genericName.trim(),
      strength:    form.strength?.trim()    || undefined,
      dosageForm:  form.dosageForm?.trim()  || undefined,
      companyName: form.companyName?.trim() || undefined,
      darNo:       form.darNo?.trim()       || undefined
    });
  };

  const fields: { key: keyof CreateMedicineInput; label: string; required?: boolean }[] = [
    { key: "brandName",   label: "Trade Name",   required: true },
    { key: "genericName", label: "Generic Name", required: true },
    { key: "strength",    label: "Strength" },
    { key: "dosageForm",  label: "Dosage Form" },
    { key: "companyName", label: "Company" },
    { key: "darNo",       label: "DAR No" }
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Add Drug</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          {fields.map(({ key, label, required }, i) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {label}{required && <span className="ml-0.5 text-destructive">*</span>}
              </label>
              <input
                ref={i === 0 ? firstRef : undefined}
                autoFocus={i === 0}
                type="text"
                value={form[key] ?? ""}
                onChange={set(key)}
                required={required}
                placeholder={label}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}

          {serverError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? "Saving…" : "Add Drug"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Edit Drug Modal ───────────────────────────────────────────────────────────

function EditDrugModal({ token, medicine, onClose }: { token: string; medicine: MedicineListItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateMedicineInput>({
    brandName:   medicine.brandName,
    genericName: medicine.genericName,
    strength:    medicine.strength    ?? "",
    dosageForm:  medicine.dosageForm  ?? "",
    companyName: medicine.companyName ?? "",
    darNo:       medicine.darNo       ?? ""
  });
  const [serverError, setServerError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<CreateMedicineInput>) => updateMedicine(medicine.id, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines-list"] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        (err as { message?: string })?.message ??
        "Failed to save. Please try again.";
      setServerError(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  });

  const set = (field: keyof CreateMedicineInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    mutate({
      brandName:   form.brandName.trim()              || undefined,
      genericName: form.genericName.trim()            || undefined,
      strength:    form.strength?.trim()              || undefined,
      dosageForm:  form.dosageForm?.trim()            || undefined,
      companyName: form.companyName?.trim()           || undefined,
      darNo:       form.darNo?.trim()                 || undefined
    });
  };

  const fields: { key: keyof CreateMedicineInput; label: string; required?: boolean }[] = [
    { key: "brandName",   label: "Trade Name",   required: true },
    { key: "genericName", label: "Generic Name", required: true },
    { key: "strength",    label: "Strength" },
    { key: "dosageForm",  label: "Dosage Form" },
    { key: "companyName", label: "Company" },
    { key: "darNo",       label: "DAR No" }
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Edit Drug</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          {fields.map(({ key, label, required }, i) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {label}{required && <span className="ml-0.5 text-destructive">*</span>}
              </label>
              <input
                autoFocus={i === 0}
                type="text"
                value={form[key] ?? ""}
                onChange={set(key)}
                required={required}
                placeholder={label}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}

          {serverError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MedicinesPage() {
  const token = useSessionStore((s) => s.accessToken) ?? "";

  const [search, setSearch]         = useState("");
  const [searchType, setSearchType] = useState<"" | "trade" | "generic">("");
  const [page, setPage]             = useState(1);
  const [showAdd, setShowAdd]       = useState(false);
  const [editMedicine, setEditMedicine] = useState<MedicineListItem | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isFetching, isError, error } = useQuery({
    queryKey:        ["medicines-list", debouncedSearch, searchType, page],
    queryFn:         () =>
      fetchMedicineList(
        {
          q:          debouncedSearch || undefined,
          searchType: searchType || undefined,
          page,
          limit:      20
        },
        token
      ),
    enabled:         !!token,
    staleTime:       60_000,
    placeholderData: (prev) => prev,
    retry:           1
  });

  const { data: totalData } = useQuery({
    queryKey:  ["medicines-total"],
    queryFn:   () => fetchMedicineList({ page: 1, limit: 1 }, token),
    enabled:   !!token,
    staleTime: 5 * 60_000
  });

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleType   = useCallback((v: "" | "trade" | "generic") => { setSearchType(v); setPage(1); }, []);

  const meta      = data?.meta;
  const medicines = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Filters + Add button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by trade name, generic or company…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
          <Pill className="h-3.5 w-3.5" />
          {totalData ? totalData.meta.total.toLocaleString() : "…"} medicines
        </span>

        <select
          value={searchType}
          onChange={(e) => handleType(e.target.value as "" | "trade" | "generic")}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All (Generic + Trade)</option>
          <option value="trade">Trade Name</option>
          <option value="generic">Generic Name</option>
        </select>

        <button
          onClick={() => setShowAdd(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add Drug
        </button>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {(error as { error?: { message?: string } })?.error?.message ?? "Failed to load medicines."}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div
          className="grid border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: "2fr 1fr 2fr 1.5fr 1fr 44px" }}
        >
          <span>Trade Name</span>
          <span>Dosage Form</span>
          <span>Generic Name</span>
          <span>Company</span>
          <span>DAR No</span>
          <span />
        </div>

        {isFetching && medicines.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : medicines.length === 0 && !isError ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {debouncedSearch ? `No results for "${debouncedSearch}"` : "No medicines found."}
          </div>
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity duration-150" : ""}>
            {medicines.map((m) => (
              <div
                key={m.id}
                className="grid items-center gap-x-4 border-b border-border px-4 py-2.5 text-sm last:border-0 hover:bg-muted/30 transition-colors"
                style={{ gridTemplateColumns: "2fr 1fr 2fr 1.5fr 1fr 44px" }}
              >
                <span className="font-semibold text-foreground" title={m.brandName}>
                  {m.brandName}
                  {m.strength && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">{m.strength}</span>
                  )}
                </span>
                <span>
                  {m.dosageForm ? (
                    <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {m.dosageForm}
                    </span>
                  ) : "—"}
                </span>
                <span className="text-muted-foreground" title={m.genericName}>{m.genericName}</span>
                <span className="truncate text-muted-foreground" title={m.companyName ?? ""}>{m.companyName ?? "—"}</span>
                <span className="font-mono text-xs text-muted-foreground">{m.darNo ?? "—"}</span>
                <span className="flex justify-end">
                  <button
                    onClick={() => setEditMedicine(m)}
                    title="Edit"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {((page - 1) * 20 + 1).toLocaleString()}–{Math.min(page * 20, meta.total).toLocaleString()} of {meta.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 font-medium text-foreground">{page} / {meta.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages || isFetching}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showAdd && <AddDrugModal token={token} onClose={() => setShowAdd(false)} />}
      {editMedicine && (
        <EditDrugModal token={token} medicine={editMedicine} onClose={() => setEditMedicine(null)} />
      )}
    </div>
  );
}
