"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Briefcase,
  CalendarClock,
  ChevronDown,
  FilePlus2,
  Italic,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Microscope,
  Pill,
  Printer,
  Plus,
  Settings,
  Trash2,
  Underline,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { fetchCurrentUser, logoutSession, refreshAccessToken, loginWithPassword } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSessionHydrated, useSessionStore } from "@/stores/session-store";

const nav: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/",                  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/appointments",      label: "Appointments", icon: CalendarClock   },
  { href: "/prescriptions/new", label: "Prescription", icon: FilePlus2       },
  { href: "/patients",          label: "Patients",     icon: UsersRound      },
  { href: "/medicines",         label: "Drugs",        icon: Pill            },
  { href: "/research",          label: "Research",     icon: Microscope      },
];

type Chamber = { id: string; name: string };
const DEFAULT_CHAMBERS: Chamber[] = [{ id: "default", name: "Dr. Abdullah Eye Care Center" }];

// ─── Prescription Pad Settings ──────────────────────────────────────────────

const PAD_SETTINGS_KEY = "rx-pad-settings";

type PadSettings = {
  pageSize: "A4" | "A5" | "Letter" | "Custom";
  customWidth: string;
  customHeight: string;
  newPatientFees: string;
  followUpFees: string;
  reportFees: string;
  headerEnHtml: string;
  headerLogo: string;
  headerMidHtml: string;
  headerBnHtml: string;
  footerText: string;
  footerAlignment: "left" | "center" | "right";
  footerShowDivider: boolean;
  // Layout
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  headerHeight: string;
  footerHeight: string;
  bodyLeftPct: string;
};

const DEFAULT_PAD: PadSettings = {
  pageSize: "A4",
  customWidth: "210", customHeight: "297",
  newPatientFees: "", followUpFees: "", reportFees: "",
  headerEnHtml: "", headerLogo: "", headerMidHtml: "", headerBnHtml: "",
  footerText: "", footerAlignment: "center", footerShowDivider: true,
  marginTop: "0.6", marginBottom: "0.6", marginLeft: "0.6", marginRight: "0.6",
  headerHeight: "1.5", footerHeight: "0.8", bodyLeftPct: "35",
};

function loadPadSettings(): PadSettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(PAD_SETTINGS_KEY) : null;
    return raw ? { ...DEFAULT_PAD, ...(JSON.parse(raw) as Partial<PadSettings>) } : { ...DEFAULT_PAD };
  } catch { return { ...DEFAULT_PAD }; }
}

function savePadSettings(s: PadSettings) {
  try { localStorage.setItem(PAD_SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Logo Upload ─────────────────────────────────────────────────────────────

function LogoUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {value ? (
        <div className="relative">
          <img src={value} alt="Logo" className="max-h-14 max-w-full rounded border object-contain" />
          <button
            type="button"
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
            onClick={() => onChange("")}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <div className="flex h-12 w-full items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/20 text-[10px] text-muted-foreground">
          No logo
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
        onClick={() => inputRef.current?.click()}
      >
        <Plus className="h-3 w-3" />
        {value ? "Change" : "Add Logo"}
      </button>
    </div>
  );
}

// ─── Rich Text Editor ────────────────────────────────────────────────────────

function RichTextEditor({
  initialValue,
  onChange,
  placeholder = "Click to edit…",
  minHeight = "100px",
}: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialValue;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function exec(cmd: string, val?: string) {
    const sel = window.getSelection();
    if (savedRange.current) {
      editorRef.current?.focus();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    document.execCommand(cmd, false, val ?? undefined);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-md border bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1">
        {/* Font size */}
        <select
          className="h-6 rounded border bg-background px-1 text-[10px] mr-1"
          defaultValue="3"
          onChange={(e) => { exec("fontSize", e.target.value); editorRef.current?.focus(); }}
        >
          {[["1","8pt"],["2","10pt"],["3","12pt"],["4","14pt"],["5","18pt"],["6","24pt"],["7","36pt"]].map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {/* Color */}
        <input
          type="color"
          title="Text color"
          className="h-6 w-6 cursor-pointer rounded border p-0.5 mr-1"
          defaultValue="#000000"
          onChange={(e) => exec("foreColor", e.target.value)}
        />
        {/* B I U */}
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" title="Bold" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}><Bold className="h-3 w-3" /></button>
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" title="Italic" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}><Italic className="h-3 w-3" /></button>
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted mr-1" title="Underline" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}><Underline className="h-3 w-3" /></button>
        {/* Alignment */}
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" title="Align Left" onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }}><AlignLeft className="h-3 w-3" /></button>
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" title="Align Center" onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }}><AlignCenter className="h-3 w-3" /></button>
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" title="Align Right" onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }}><AlignRight className="h-3 w-3" /></button>
      </div>
      {/* ContentEditable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="flex-1 p-2 text-sm outline-none empty:before:pointer-events-none empty:before:text-muted-foreground/40 empty:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder}
        style={{ minHeight, cursor: "text" }}
        onKeyUp={saveRange}
        onClick={saveRange}
        onInput={() => { if (editorRef.current) onChange(editorRef.current.innerHTML); }}
      />
    </div>
  );
}

// ─── Pad Settings Panel ──────────────────────────────────────────────────────

function PadSettingsPanel({
  pad, updatePad, chambers, selectedChamberId, onChamberChange, onChamberAdd, onChamberRemove, onSave, onCancel,
}: {
  pad: PadSettings;
  updatePad: (p: Partial<PadSettings>) => void;
  chambers: Chamber[];
  selectedChamberId: string;
  onChamberChange: (id: string) => void;
  onChamberAdd: (name: string) => void;
  onChamberRemove: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Left column ─────────── */}
      <div className="flex w-72 shrink-0 flex-col border-r">

          {/* Chamber dropdown */}
          <div className="border-b px-3 pt-3 pb-2.5">
            <ChamberDropdown
              chambers={chambers}
              selectedId={selectedChamberId}
              onChange={onChamberChange}
              onAdd={onChamberAdd}
              onRemove={onChamberRemove}
            />
          </div>

          {/* Fees */}
          <div className="border-b px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Consultation Fees</p>
            {(
              [
                ["New Patient", "newPatientFees"],
                ["Follow-Up",   "followUpFees"],
                ["Report",      "reportFees"],
              ] as [string, keyof PadSettings][]
            ).map(([label, key]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="h-7 flex-1 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="৳ 0"
                  value={pad[key] as string}
                  onChange={(e) => updatePad({ [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {/* Page Size */}
          <div className="border-b px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Page Size</p>
            <select
              className="h-7 w-full rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              value={pad.pageSize}
              onChange={(e) => updatePad({ pageSize: e.target.value as PadSettings["pageSize"] })}
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
              <option value="Custom">Custom</option>
            </select>
            {pad.pageSize === "Custom" && (
              <div className="flex items-center gap-1.5">
                <input className="h-7 flex-1 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary" value={pad.customWidth} placeholder="W" onChange={(e) => updatePad({ customWidth: e.target.value })} />
                <span className="text-xs text-muted-foreground">×</span>
                <input className="h-7 flex-1 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary" value={pad.customHeight} placeholder="H" onChange={(e) => updatePad({ customHeight: e.target.value })} />
                <span className="text-xs text-muted-foreground">in</span>
              </div>
            )}
          </div>

          {/* Margins */}
          <div className="border-b px-3 py-2 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Margins (in)</p>
            {/* Cross layout: Top / Left·Right / Bottom */}
            <div className="flex flex-col items-center gap-0.5">
              {/* Top */}
              <input type="text" inputMode="numeric" className="h-6 w-16 rounded border bg-background px-1.5 text-center text-[10px] outline-none focus:ring-1 focus:ring-primary" placeholder="Top" value={pad.marginTop} onChange={(e) => updatePad({ marginTop: e.target.value })} />
              {/* Middle row: Left — spacer — Right */}
              <div className="flex w-full items-center gap-1">
                <input type="text" inputMode="numeric" className="h-6 w-16 rounded border bg-background px-1.5 text-center text-[10px] outline-none focus:ring-1 focus:ring-primary" placeholder="Left" value={pad.marginLeft} onChange={(e) => updatePad({ marginLeft: e.target.value })} />
                <div className="flex flex-1 items-center justify-center">
                  <div className="h-px w-full border-t border-dashed border-muted-foreground/30" />
                </div>
                <input type="text" inputMode="numeric" className="h-6 w-16 rounded border bg-background px-1.5 text-center text-[10px] outline-none focus:ring-1 focus:ring-primary" placeholder="Right" value={pad.marginRight} onChange={(e) => updatePad({ marginRight: e.target.value })} />
              </div>
              {/* Bottom */}
              <input type="text" inputMode="numeric" className="h-6 w-16 rounded border bg-background px-1.5 text-center text-[10px] outline-none focus:ring-1 focus:ring-primary" placeholder="Bottom" value={pad.marginBottom} onChange={(e) => updatePad({ marginBottom: e.target.value })} />
            </div>
          </div>

          {/* Header / Footer height */}
          <div className="border-b px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Section Heights (in)</p>
            {(
              [["Header","headerHeight"],["Footer","footerHeight"]] as [string, keyof PadSettings][]
            ).map(([label, key]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{label} Height</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="h-7 w-16 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="1.5"
                  value={pad[key] as string}
                  onChange={(e) => updatePad({ [key]: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">in</span>
              </div>
            ))}
          </div>

          {/* Body column split */}
          <div className="px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Body Column Split</p>
            <div className="flex h-5 overflow-hidden rounded border text-[9px] font-bold">
              <div className="flex items-center justify-center bg-primary/15 text-primary transition-all" style={{ width: `${pad.bodyLeftPct}%` }}>
                {pad.bodyLeftPct}%
              </div>
              <div className="flex items-center justify-center bg-muted text-muted-foreground transition-all" style={{ width: `${100 - parseInt(pad.bodyLeftPct || "35")}%` }}>
                {100 - parseInt(pad.bodyLeftPct || "35")}%
              </div>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="1"
              className="w-full accent-primary"
              value={pad.bodyLeftPct}
              onChange={(e) => updatePad({ bodyLeftPct: e.target.value })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Left column</span>
              <span>Right column</span>
            </div>
          </div>

        {/* Save / Cancel */}
        <div className="mt-auto border-t px-3 py-2.5 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded border py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>

      {/* ── Right: Header + Body + Footer ─────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto">

        {/* Header section */}
        <div className="shrink-0 border-b">
          <div className="border-b bg-muted/50 px-3 py-3 text-center text-sm font-bold uppercase tracking-wide">
            Header
          </div>
          {/* 3-column header editor */}
          <div className="grid grid-cols-3 divide-x">
            {/* English column */}
            <div className="p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Doctor's Info (English)</p>
              <RichTextEditor
                key="en"
                initialValue={pad.headerEnHtml}
                onChange={(html) => updatePad({ headerEnHtml: html })}
                placeholder="Dr. Name, MBBS, Designation…"
                minHeight="120px"
              />
            </div>

            {/* Logo + Middle column */}
            <div className="flex flex-col gap-2 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Logo / Specialty</p>
              <LogoUpload value={pad.headerLogo} onChange={(v) => updatePad({ headerLogo: v })} />
              <RichTextEditor
                key="mid"
                initialValue={pad.headerMidHtml}
                onChange={(html) => updatePad({ headerMidHtml: html })}
                placeholder="Specialty, clinic name…"
                minHeight="80px"
              />
            </div>

            {/* Bengali column */}
            <div className="p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">ডাক্তারের তথ্য (বাংলা)</p>
              <RichTextEditor
                key="bn"
                initialValue={pad.headerBnHtml}
                onChange={(html) => updatePad({ headerBnHtml: html })}
                placeholder="ডাঃ নাম, এমবিবিএস…"
                minHeight="120px"
              />
            </div>
          </div>
        </div>

        {/* Prescription body area */}
        <div className="flex min-h-32 flex-1 items-center justify-center text-sm text-muted-foreground/40">
          (Prescription body — according to selected page size)
        </div>

        {/* Footer section */}
        <div className="shrink-0 border-t">
          <div className="border-b bg-muted/50 px-3 py-3 text-center text-sm font-bold uppercase tracking-wide">
            Footer
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={pad.footerShowDivider}
                  onChange={(e) => updatePad({ footerShowDivider: e.target.checked })}
                />
                Divider line
              </label>
              <div className="ml-auto flex rounded-md border overflow-hidden">
                {([
                  ["left",   <AlignLeft   key="l" className="h-3.5 w-3.5" />],
                  ["center", <AlignCenter key="c" className="h-3.5 w-3.5" />],
                  ["right",  <AlignRight  key="r" className="h-3.5 w-3.5" />],
                ] as [string, React.ReactNode][]).map(([a, icon]) => (
                  <button
                    key={a}
                    type="button"
                    className={cn("flex items-center justify-center px-2.5 py-1.5 transition", pad.footerAlignment === a ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}
                    onClick={() => updatePad({ footerAlignment: a as PadSettings["footerAlignment"] })}
                  >{icon}</button>
                ))}
              </div>
            </div>
            <textarea
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              rows={2}
              placeholder="Visiting hours, address, website…"
              value={pad.footerText}
              style={{ textAlign: pad.footerAlignment }}
              onChange={(e) => updatePad({ footerText: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chamber Dropdown (with inline add/remove) ───────────────────────────────

function ChamberDropdown({
  chambers, selectedId, onChange, onAdd, onRemove,
}: {
  chambers: Chamber[];
  selectedId: string;
  onChange: (id: string) => void;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = chambers.find((c) => c.id === selectedId);

  function submit() {
    const name = newName.trim();
    if (!name) return;
    onAdd(name);
    setNewName("");
    setAdding(false);
  }

  function startAdding() {
    setAdding(true);
    setTimeout(() => addInputRef.current?.focus(), 0);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2.5 text-sm font-semibold hover:bg-muted"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{selected?.name ?? "Select Chamber"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border bg-card shadow-xl">
          <div className="max-h-52 overflow-y-auto">
            {chambers.map((c) => (
              <div
                key={c.id}
                className={cn("flex items-center gap-2 px-3 py-2.5 transition hover:bg-muted", c.id === selectedId && "bg-primary/10")}
              >
                <button
                  type="button"
                  className="flex-1 text-left text-sm font-medium"
                  onClick={() => { onChange(c.id); setOpen(false); }}
                >
                  {c.name}
                </button>
                {c.id === selectedId && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">Active</span>
                )}
                <button
                  type="button"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); onRemove(c.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t p-2">
            {adding ? (
              <div className="flex gap-1.5">
                <input
                  ref={addInputRef}
                  type="text"
                  className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Chamber name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.stopPropagation(); submit(); }
                    if (e.key === "Escape") { setAdding(false); setNewName(""); }
                  }}
                />
                <button
                  type="button"
                  className="flex h-9 items-center gap-1 rounded-md border bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={submit}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition"
                onClick={startAdding}
              >
                <Plus className="h-4 w-4" />
                Add New Chamber
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chamber Settings Dialog ─────────────────────────────────────────────────

function AppShellChamberSettingsDialog({
  chambers,
  onClose,
  onUpdate,
}: {
  chambers: Chamber[];
  userEmail: string;
  onClose: () => void;
  onUpdate: (chambers: Chamber[]) => void;
}) {
  const [pad, setPad] = useState<PadSettings>(() => loadPadSettings());
  const [localChambers, setLocalChambers] = useState<Chamber[]>(chambers);
  const [selectedChamberId, setSelectedChamberId] = useState<string>(chambers[0]?.id ?? "");

  function updatePad(patch: Partial<PadSettings>) {
    setPad((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    savePadSettings(pad);
    onClose();
  }

  function addChamber(name: string) {
    const trimmed = name.trim();
    if (!trimmed || localChambers.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...localChambers, { id: `ch-${Date.now()}`, name: trimmed }];
    setLocalChambers(next);
    onUpdate(next);
  }

  function removeChamber(id: string) {
    const next = localChambers.filter((c) => c.id !== id);
    const safe = next.length === 0 ? DEFAULT_CHAMBERS : next;
    setLocalChambers(safe);
    if (selectedChamberId === id) setSelectedChamberId(safe[0]?.id ?? "");
    onUpdate(safe);
  }

  return (
    <div className="fixed inset-0 z-[60] flex bg-card">
      <PadSettingsPanel
        pad={pad}
        updatePad={updatePad}
        chambers={localChambers}
        selectedChamberId={selectedChamberId}
        onChamberChange={setSelectedChamberId}
        onChamberAdd={addChamber}
        onChamberRemove={removeChamber}
        onSave={handleSave}
        onCancel={onClose}
      />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"checking" | "ready">("checking");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [chambers, setChambers] = useState<Chamber[]>(DEFAULT_CHAMBERS);
  const [selectedChamber, setSelectedChamber] = useState<Chamber>(DEFAULT_CHAMBERS[0]);
  const [chamberOpen, setChamberOpen] = useState(false);
  const [chamberSettingsOpen, setChamberSettingsOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const chamberRef = useRef<HTMLDivElement>(null);
  const hydrated = useSessionHydrated();
  const accessToken = useSessionStore((state) => state.accessToken);
  const refreshToken = useSessionStore((state) => state.refreshToken);
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clear);
  const setAccessToken = useSessionStore((state) => state.setAccessToken);
  const setUser = useSessionStore((state) => state.setUser);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    async function verifySession() {
      if (!accessToken && !refreshToken) {
        clearSession();
        router.replace("/login");
        return;
      }

      setSessionStatus("checking");

      try {
        if (accessToken) {
          const currentUser = await fetchCurrentUser(accessToken);
          if (!cancelled) {
            setUser(currentUser);
            setSessionStatus("ready");
          }
          return;
        }

        if (refreshToken) {
          const refreshed = await refreshAccessToken(refreshToken);
          const currentUser = await fetchCurrentUser(refreshed.accessToken);
          if (!cancelled) {
            setAccessToken(refreshed.accessToken);
            setUser(currentUser);
            setSessionStatus("ready");
          }
        }
      } catch {
        if (!refreshToken) {
          clearSession();
          router.replace("/login");
          return;
        }

        try {
          const refreshed = await refreshAccessToken(refreshToken);
          const currentUser = await fetchCurrentUser(refreshed.accessToken);
          if (!cancelled) {
            setAccessToken(refreshed.accessToken);
            setUser(currentUser);
            setSessionStatus("ready");
          }
        } catch {
          clearSession();
          router.replace("/login");
        }
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    clearSession,
    hydrated,
    refreshToken,
    router,
    setAccessToken,
    setUser
  ]);

  // Load chambers from localStorage (written by appointment-board)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rx-chambers");
      const parsed: Chamber[] | null = raw ? (JSON.parse(raw) as Chamber[]) : null;
      const loaded = parsed && parsed.length > 0 ? parsed : DEFAULT_CHAMBERS;
      setChambers(loaded);
      const selRaw = localStorage.getItem("rx-selected-chamber");
      const sel: Chamber | null = selRaw ? (JSON.parse(selRaw) as Chamber) : null;
      setSelectedChamber(loaded.find((c) => c.id === sel?.id) ?? loaded[0] ?? DEFAULT_CHAMBERS[0]);
    } catch {
      setChambers(DEFAULT_CHAMBERS);
      setSelectedChamber(DEFAULT_CHAMBERS[0]);
    }
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
      if (chamberRef.current && !chamberRef.current.contains(e.target as Node)) {
        setChamberOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleSelectChamber(c: Chamber) {
    setSelectedChamber(c);
    try { localStorage.setItem("rx-selected-chamber", JSON.stringify(c)); } catch {}
    setChamberOpen(false);
  }

  function handleLogout() {
    const token = refreshToken;
    clearSession();
    router.replace("/login");
    if (token) void logoutSession(token).catch(() => undefined);
  }

  if (!hydrated || sessionStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 shadow-soft">
          <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" className="fill-primary/10" />
            <path d="M10 27 C13 17 23 12 33 17 C25 20 17 24 21 31 C17 25 12 23 10 27Z" className="fill-primary" />
            <path d="M21 31 C19 25 25 21 33 17 C30 24 26 28 21 31Z" fill="currentColor" className="text-primary/60" />
          </svg>
          <div>
            <div className="text-sm font-semibold">Trust Prescription System</div>
            <div className="text-xs text-muted-foreground">Checking session</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CommandPalette />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-[95px] flex-col border-r bg-card transition-all duration-200",
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: collapse hides it
          "lg:translate-x-0",
          sidebarCollapsed && "lg:-translate-x-full"
        )}
      >
        {/* Logo / collapse button — same height as topbar */}
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="flex h-16 w-full shrink-0 items-center justify-center border-b transition-colors hover:bg-muted/40"
          onClick={() => setSidebarCollapsed(true)}
        >
          <svg viewBox="0 0 40 40" className="h-7 w-7 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" className="fill-primary/10" />
            <path d="M10 27 C13 17 23 12 33 17 C25 20 17 24 21 31 C17 25 12 23 10 27Z" className="fill-primary" />
            <path d="M21 31 C19 25 25 21 33 17 C30 24 26 28 21 31Z" fill="currentColor" className="text-primary/60" />
          </svg>
        </button>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-3 px-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as never}
                title={item.label}
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn("text-center text-[10px] font-medium leading-tight", active ? "text-primary" : "")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-200 lg:pl-[95px]", sidebarCollapsed && "lg:pl-0")}>
        <header className="no-print sticky top-0 z-50 flex h-16 items-center border-b bg-card px-3 shadow-sm lg:px-5">
          {/* Left: logo + system name */}
          <div className="flex min-w-0 items-center gap-3">
            {sidebarCollapsed && (
              <button
                type="button"
                aria-label="Expand sidebar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60"
                onClick={() => setSidebarCollapsed(false)}
              >
                <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" className="fill-primary/10" />
                  <path d="M10 27 C13 17 23 12 33 17 C25 20 17 24 21 31 C17 25 12 23 10 27Z" className="fill-primary" />
                  <path d="M21 31 C19 25 25 21 33 17 C30 24 26 28 21 31Z" fill="currentColor" className="text-primary/60" />
                </svg>
              </button>
            )}
            {!sidebarCollapsed && (
              <Button
                aria-label="Open menu"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 lg:hidden"
                onClick={() => setMobileOpen((o) => !o)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <span className="truncate text-xl font-extrabold leading-none tracking-tight text-primary">
              Trust Prescription System
            </span>
          </div>

          {/* Right: chamber selector + settings + avatar */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {user?.fullName && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                Dr. {user.fullName}
              </span>
            )}

            {/* Dynamic chamber selector */}
            <div ref={chamberRef} className="relative hidden md:block">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/15 px-3 py-1.5 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/25 hover:shadow"
                onClick={() => setChamberOpen((o) => !o)}
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                <span className="max-w-[200px] truncate">{selectedChamber.name}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", chamberOpen && "rotate-180")} />
              </button>

              {chamberOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[240px] rounded-xl border bg-card shadow-xl">
                  <div className="border-b px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Select Chamber
                  </div>
                  {chambers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-muted",
                        selectedChamber.id === c.id && "font-semibold text-primary"
                      )}
                      onClick={() => handleSelectChamber(c)}
                    >
                      {c.name}
                      {selectedChamber.id === c.id && (
                        <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Active</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t mt-1 px-2 py-2">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      onClick={() => { setChamberOpen(false); setChamberSettingsOpen(true); }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Manage Chambers
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Settings */}
            <Button aria-label="Settings" size="icon" variant="ghost" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>

            {/* Avatar + dropdown */}
            <div ref={avatarRef} className="relative ml-0.5">
              <button
                aria-label="Account menu"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
                onClick={() => setAvatarOpen((o) => !o)}
              >
                {user?.fullName?.[0]?.toUpperCase() ?? "U"}
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border bg-card p-1 shadow-lg">
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-bold leading-none text-foreground">{user?.fullName ?? "Signed in"}</p>
                    {user?.email && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                  <div className="my-1 border-t" />
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10"
                    onClick={() => { setAvatarOpen(false); handleLogout(); }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 pt-3 pb-4 lg:px-5">{children}</main>
      </div>

      {chamberSettingsOpen && (
        <AppShellChamberSettingsDialog
          chambers={chambers}
          userEmail={user?.email ?? ""}
          onClose={() => setChamberSettingsOpen(false)}
          onUpdate={(updated) => {
            const withDefault = updated.length === 0 ? DEFAULT_CHAMBERS : updated;
            setChambers(withDefault);
            try { localStorage.setItem("rx-chambers", JSON.stringify(withDefault)); } catch {}
            if (!updated.find((c) => c.id === selectedChamber.id)) {
              const first = withDefault[0] ?? DEFAULT_CHAMBERS[0];
              setSelectedChamber(first);
              try { localStorage.setItem("rx-selected-chamber", JSON.stringify(first)); } catch {}
            }
          }}
        />
      )}
    </div>
  );
}
