"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Briefcase,
  CalendarClock,
  ChevronDown,
  Eraser,
  Eye,
  FilePlus2,
  Indent,
  Italic,
  LayoutDashboard,
  List,
  ListOrdered,
  Loader2,
  LogOut,
  Menu,
  Microscope,
  Outdent,
  Pill,
  Printer,
  Plus,
  Settings,
  Strikethrough,
  Subscript,
  Superscript,
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
  headerEnLines: string;
  headerLogo: string;
  headerMidLines: string;
  headerBnLines: string;
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
  headerEnLines: "", headerLogo: "", headerMidLines: "", headerBnLines: "",
  footerText: "", footerAlignment: "center", footerShowDivider: true,
  marginTop: "0.6", marginBottom: "0.6", marginLeft: "0.6", marginRight: "0.6",
  headerHeight: "1.7", footerHeight: "0.8", bodyLeftPct: "35",
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

// ─── Freeform Editor ─────────────────────────────────────────────────────────

const EDITOR_FONTS = [
  "Arial", "Times New Roman", "Georgia", "Verdana",
  "Courier New", "Trebuchet MS", "Tahoma", "Palatino Linotype",
];

function FreeformEditor({
  initialValue,
  onChange,
  placeholder = "Type here…",
  editorHeight,
}: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editorHeight?: number;   // content area height in px — matches the printed header height
}) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focused, setFocused] = useState(false);
  const [fmt, setFmt] = useState({
    bold: false, italic: false, underline: false,
    strikethrough: false, subscript: false, superscript: false,
    orderedList: false, unorderedList: false,
    align: "left" as "left" | "center" | "right" | "justify",
  });

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always-current range tracking via native selectionchange event.
  // This fires on every cursor move / drag-select, even without explicit React handlers.
  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode ?? null)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
        syncFmt();
      }
    }
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncFmt() {
    try {
      setFmt({
        bold:          document.queryCommandState("bold"),
        italic:        document.queryCommandState("italic"),
        underline:     document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikeThrough"),
        subscript:     document.queryCommandState("subscript"),
        superscript:   document.queryCommandState("superscript"),
        orderedList:   document.queryCommandState("insertOrderedList"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        align:
          document.queryCommandState("justifyFull")   ? "justify"
          : document.queryCommandState("justifyCenter") ? "center"
          : document.queryCommandState("justifyRight")  ? "right"
          : "left",
      });
    } catch {}
  }

  function saveRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode ?? null)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
    syncFmt();
  }

  function restoreRange() {
    if (savedRange.current) {
      ref.current?.focus();
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
  }

  function keepFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
    // Return cursor to editor after toolbar controls steal focus
    setTimeout(() => ref.current?.focus(), 0);
  }

  function exec(cmd: string, val?: string) {
    restoreRange();
    document.execCommand(cmd, false, val ?? undefined);
    if (ref.current) onChange(ref.current.innerHTML);
    syncFmt();
    keepFocus();
  }

  function applyFontSize(px: number) {
    if (isNaN(px) || px < 1) return;
    restoreRange();
    document.execCommand("fontSize", false, "7");
    ref.current?.querySelectorAll('font[size="7"]').forEach((el) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      span.innerHTML = el.innerHTML;
      el.replaceWith(span);
    });
    if (ref.current) onChange(ref.current.innerHTML);
    keepFocus();
  }

  function tbBtn(active: boolean, title?: string) {
    return {
      type: "button" as const,
      title,
      className: cn(
        "flex h-6 w-6 items-center justify-center rounded text-gray-600 transition",
        "hover:bg-gray-200 hover:text-gray-900",
        active && "bg-gray-800 text-white hover:bg-gray-700 hover:text-white",
      ),
    };
  }

  const Sep = () => <div className="mx-0.5 h-4 w-px bg-gray-200" />;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border transition-shadow",
        focused ? "border-blue-400 shadow-[0_0_0_2px_rgba(96,165,250,0.25)]" : "border-gray-300"
      )}
      style={{ background: "white", color: "#111" }}
    >

      {/* ── Row 1: Font family · Size · B I U S · X² X₂ · Erase ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1" style={{ background: "#f3f4f6" }}>

        {/* Font family — onMouseDown saves selection before focus is stolen */}
        <select
          className="h-6 rounded border border-gray-300 bg-white px-0.5 text-[10px] text-gray-800"
          style={{ minWidth: 90 }}
          defaultValue="Arial"
          onMouseDown={saveRange}
          onChange={(e) => exec("fontName", e.target.value)}
        >
          {EDITOR_FONTS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>

        {/* Font size */}
        <div className="mx-0.5 flex items-center gap-0.5">
          <input
            type="number" min="1" max="200" step="1" defaultValue="13"
            title="Font size (px) — press Enter"
            className="h-6 w-11 rounded border border-gray-300 bg-white px-1 text-center text-[10px] text-gray-800 outline-none focus:ring-1 focus:ring-gray-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); applyFontSize(parseInt((e.target as HTMLInputElement).value)); }
            }}
          />
          <span className="text-[9px] text-gray-400">px</span>
        </div>

        <Sep />
        <button {...tbBtn(fmt.bold,          "Bold (Ctrl+B)")}      onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}><Bold className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.italic,        "Italic (Ctrl+I)")}    onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}><Italic className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.underline,     "Underline (Ctrl+U)")} onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}><Underline className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.strikethrough, "Strikethrough")}      onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough"); }}><Strikethrough className="h-3 w-3" /></button>
        <Sep />
        <button {...tbBtn(fmt.superscript,   "Superscript")}  onMouseDown={(e) => { e.preventDefault(); exec("superscript"); }}><Superscript className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.subscript,     "Subscript")}    onMouseDown={(e) => { e.preventDefault(); exec("subscript"); }}><Subscript className="h-3 w-3" /></button>
        <Sep />
        <button {...tbBtn(false, "Clear formatting")} onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }}><Eraser className="h-3 w-3" /></button>
      </div>

      {/* ── Row 2: Colors · Lists · Indent · Alignment ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1" style={{ background: "#f3f4f6" }}>

        {/* Text color — onMouseDown saves selection before color picker opens */}
        <input type="color" title="Text color"      defaultValue="#000000" className="h-6 w-6 cursor-pointer rounded border border-gray-300 p-0.5" onMouseDown={saveRange} onChange={(e) => exec("foreColor",  e.target.value)} />
        {/* Highlight color */}
        <input type="color" title="Highlight color" defaultValue="#ffff00" className="h-6 w-6 cursor-pointer rounded border border-gray-300 p-0.5" onMouseDown={saveRange} onChange={(e) => exec("backColor",  e.target.value)} />

        <Sep />
        <button {...tbBtn(fmt.unorderedList, "Bullet list")}   onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}><List        className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.orderedList,   "Numbered list")} onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }}>  <ListOrdered className="h-3 w-3" /></button>
        <Sep />
        <button {...tbBtn(false, "Decrease indent")} onMouseDown={(e) => { e.preventDefault(); exec("outdent"); }}><Outdent className="h-3 w-3" /></button>
        <button {...tbBtn(false, "Increase indent")} onMouseDown={(e) => { e.preventDefault(); exec("indent"); }}> <Indent  className="h-3 w-3" /></button>
        <Sep />
        <button {...tbBtn(fmt.align === "left",    "Align left")}    onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }}>   <AlignLeft    className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.align === "center",  "Align center")}  onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }}> <AlignCenter  className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.align === "right",   "Align right")}   onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }}>  <AlignRight   className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.align === "justify", "Justify")}       onMouseDown={(e) => { e.preventDefault(); exec("justifyFull"); }}>   <AlignJustify className="h-3 w-3" /></button>
      </div>

      {/* ── Editor area ── */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="p-2 text-sm outline-none empty:before:pointer-events-none empty:before:text-gray-300 empty:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder}
        style={{
          cursor: "text", wordBreak: "break-word", color: "#111",
          userSelect: "text", WebkitUserSelect: "text",
          minHeight: editorHeight ?? 80,
        }}
        onKeyUp={saveRange}
        onClick={saveRange}
        onSelect={saveRange}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setFocused(true);
          syncFmt();
        }}
        onBlur={() => {
          // Delay so toolbar clicks (select/color) don't flash the ring off
          blurTimer.current = setTimeout(() => setFocused(false), 200);
        }}
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
      />
    </div>
  );
}

// ─── Pad Preview ─────────────────────────────────────────────────────────────

const PX_PER_IN = 96;
const PX_PER_MM = PX_PER_IN / 25.4;

const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  A4:     { w: 210 * PX_PER_MM, h: 297 * PX_PER_MM },
  A5:     { w: 148 * PX_PER_MM, h: 210 * PX_PER_MM },
  Letter: { w: 216 * PX_PER_MM, h: 279 * PX_PER_MM },
};

function PadPreview({ pad, onClose }: { pad: PadSettings; onClose: () => void }) {
  const pageW = pad.pageSize === "Custom"
    ? (parseFloat(pad.customWidth) || 8.5) * PX_PER_IN
    : PAGE_SIZES[pad.pageSize]?.w ?? PAGE_SIZES.A4.w;
  const pageH = pad.pageSize === "Custom"
    ? (parseFloat(pad.customHeight) || 11) * PX_PER_IN
    : PAGE_SIZES[pad.pageSize]?.h ?? PAGE_SIZES.A4.h;

  const PREVIEW_W = 640;
  const scale = PREVIEW_W / pageW;
  const previewH = pageH * scale;
  // epx: given a desired effective pixel size, returns the pre-scale size so
  // the element always appears at `target` px regardless of the zoom factor.
  const epx = (target: number) => Math.round(target / scale);

  const inToPx = (v: string, fallback: number) => (parseFloat(v) || fallback) * PX_PER_IN;
  const mTop    = inToPx(pad.marginTop,    0.6);
  const mBottom = inToPx(pad.marginBottom, 0.6);
  const mLeft   = inToPx(pad.marginLeft,   0.6);
  const mRight  = inToPx(pad.marginRight,  0.6);
  const hdrH    = inToPx(pad.headerHeight, 1.7);
  const ftrH    = inToPx(pad.footerHeight, 0.8);
  const bodyLeft = parseInt(pad.bodyLeftPct) || 35;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header bar */}
      <div className="mb-3 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-bold text-white tracking-wide uppercase">Live Preview</span>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
      </div>

      {/* Scrollable paper wrapper */}
      <div
        className="overflow-auto rounded shadow-2xl"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scaled container */}
        <div style={{ width: PREVIEW_W, height: previewH, position: "relative", overflow: "hidden" }}>
          {/* Full-size page, scaled down */}
          <div style={{
            width: pageW,
            height: pageH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            background: "white",
            boxShadow: "inset 0 0 0 1px #e5e7eb",
          }}>
            {/* Scoped CSS reset for contentEditable-produced HTML (p margins, ul padding, etc.) */}
            <style>{`
              .rxp p,.rxp h1,.rxp h2,.rxp h3,.rxp h4 { margin:0; padding:0; }
              .rxp ul,.rxp ol { margin:0; padding-left:1.4em; }
              .rxp li { margin:0; padding:0; }
              .rxp * { box-sizing:border-box; word-break:break-word; overflow-wrap:break-word; }
            `}</style>

            {/* Margin inset */}
            <div style={{
              position: "absolute",
              top: mTop, bottom: mBottom, left: mLeft, right: mRight,
              display: "flex", flexDirection: "column",
            }}>
              {/* Header — minHeight so all content is visible; grows if content is taller */}
              <div style={{
                minHeight: hdrH, flexShrink: 0,
                display: "flex", alignItems: "flex-start",
                borderBottom: "1px solid #d1d5db",
              }}>
                {/* English */}
                <div
                  className="rxp"
                  style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: "6px 8px", wordBreak: "break-word" }}
                  dangerouslySetInnerHTML={{ __html: pad.headerEnLines || "" }}
                />
                {/* Middle: logo + specialty */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "6px 8px", minWidth: 80, maxWidth: "35%", overflow: "hidden" }}>
                  {pad.headerLogo && (
                    <img src={pad.headerLogo} alt="Logo" style={{ maxHeight: hdrH * 0.5, maxWidth: 120, objectFit: "contain", marginBottom: 4 }} />
                  )}
                  <div
                    className="rxp"
                    style={{ textAlign: "center", width: "100%" }}
                    dangerouslySetInnerHTML={{ __html: pad.headerMidLines || "" }}
                  />
                </div>
                {/* Bengali */}
                <div
                  className="rxp"
                  style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: "6px 8px", textAlign: "right", wordBreak: "break-word" }}
                  dangerouslySetInnerHTML={{ __html: pad.headerBnLines || "" }}
                />
              </div>

              {/* Body */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Left column — patient info */}
                <div style={{ width: `${bodyLeft}%`, borderRight: "1px solid #e5e7eb", padding: "8px 6px", display: "flex", flexDirection: "column", gap: epx(5) }}>
                  {["Name", "Age / Sex", "Weight / BP", "Chief Complaints", "On Examination", "Investigation", "Diagnosis", "Follow Up"].map((label) => (
                    <div key={label}>
                      <div style={{ fontSize: epx(8), fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: epx(2) }}>{label}</div>
                      <div style={{ borderBottom: "1px dotted #d1d5db", height: epx(14) }} />
                    </div>
                  ))}
                </div>
                {/* Right column — Rx */}
                <div style={{ flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: epx(3) }}>
                  <div style={{ fontSize: epx(22), fontFamily: "serif", fontWeight: 700, color: "#374151", marginBottom: epx(4) }}>℞</div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ marginBottom: epx(6) }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: epx(4) }}>
                        <span style={{ fontSize: epx(9), color: "#9ca3af", minWidth: epx(12) }}>{i + 1}.</span>
                        <div style={{ flex: 1, borderBottom: "1px dotted #d1d5db", height: epx(14) }} />
                      </div>
                      <div style={{ display: "flex", gap: epx(4), marginTop: epx(2) }}>
                        <span style={{ minWidth: epx(12) }} />
                        <div style={{ flex: 1, borderBottom: "1px dotted #e5e7eb", height: epx(11) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                height: ftrH, flexShrink: 0,
                borderTop: "1px solid #d1d5db",
                display: "flex", flexDirection: "column", justifyContent: "center",
                padding: `${epx(4)}px ${epx(6)}px`,
              }}>
                {pad.footerShowDivider && (
                  <div style={{ borderTop: "1px solid #9ca3af", marginBottom: epx(4) }} />
                )}
                <div style={{ fontSize: epx(11), color: "#374151", textAlign: pad.footerAlignment, whiteSpace: "pre-wrap" }}>
                  {pad.footerText
                    ? pad.footerText
                    : <span style={{ color: "#d1d5db", fontStyle: "italic" }}>No footer text</span>}
                </div>
              </div>
            </div>

            {/* Margin guides (subtle dashed outline) */}
            <div style={{
              position: "absolute",
              top: mTop, bottom: mBottom, left: mLeft, right: mRight,
              border: "1px dashed rgba(59,130,246,0.15)",
              pointerEvents: "none",
            }} />
          </div>
        </div>
      </div>

      {/* Page size label */}
      <p className="mt-2 text-[11px] text-white/50">
        {pad.pageSize === "Custom" ? `Custom ${pad.customWidth}×${pad.customHeight} in` : pad.pageSize} — scale {Math.round(scale * 100)}%
      </p>
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
  const [previewing, setPreviewing] = useState(false);

  return (
    <div className="flex flex-1 overflow-hidden">
      {previewing && <PadPreview pad={pad} onClose={() => setPreviewing(false)} />}
      {/* ── Left column ─────────── */}
      <div className="flex w-72 shrink-0 flex-col border-r bg-card shadow-soft">

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
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Consultation Fees</p>
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
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Page Size</p>
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
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Margins (in)</p>
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
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Section Heights (in)</p>
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
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Body Column Split</p>
            <div className="flex h-5 overflow-hidden rounded border text-[9px] font-bold">
              <div className="relative flex items-center justify-center bg-primary/15 text-primary transition-all" style={{ width: `${pad.bodyLeftPct}%` }}>
                {pad.bodyLeftPct}%
                <div className="absolute right-0 top-0 h-full w-px bg-primary/50" />
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

        {/* Live Preview */}
        <div className="border-t px-3 py-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/8 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition"
            onClick={() => setPreviewing(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Live Preview
          </button>
        </div>

        {/* Save / Cancel */}
        <div className="border-t bg-primary/5 px-3 py-2.5 flex gap-2">
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
      {/* Force permanently-white / light-mode rendering regardless of theme */}
      <div
        className="flex flex-1 flex-col overflow-y-auto"
        style={{
          "--background":        "0 0% 100%",
          "--foreground":        "0 0% 0%",
          "--card":              "0 0% 100%",
          "--card-foreground":   "0 0% 0%",
          "--muted":             "0 0% 94%",
          "--muted-foreground":  "0 0% 10%",
          "--border":            "0 0% 86%",
          "--primary":           "0 0% 10%",
          "--primary-foreground":"0 0% 100%",
          background:            "white",
          color:                 "black",
          colorScheme:           "light",
        } as React.CSSProperties}
      >

        {/* Header section */}
        <div className="shrink-0 border-b">
          <div className="border-b bg-primary/5 px-3 py-3 text-center text-sm font-bold uppercase tracking-wide text-primary">
            Header
          </div>
          {/* 3-column header editor — height locked to headerHeight inches */}
          {(() => {
            const hdrPx = Math.round((parseFloat(pad.headerHeight) || 1.7) * 96);
            return (
              <div className="grid grid-cols-3 divide-x bg-card">
                {/* English column */}
                <div className="p-3">
                  <p className="mb-2 text-xs font-semibold text-primary/70">Doctor's Info (English)</p>
                  <FreeformEditor
                    initialValue={pad.headerEnLines}
                    onChange={(json) => updatePad({ headerEnLines: json })}
                    placeholder="Dr. Name, MBBS…"
                    editorHeight={hdrPx}
                  />
                </div>

                {/* Logo + Middle column */}
                <div className="flex flex-col gap-2 p-3">
                  <p className="text-xs font-semibold text-primary/70">Logo / Specialty</p>
                  <LogoUpload value={pad.headerLogo} onChange={(v) => updatePad({ headerLogo: v })} />
                  <FreeformEditor
                    initialValue={pad.headerMidLines}
                    onChange={(json) => updatePad({ headerMidLines: json })}
                    placeholder="Specialty, clinic name…"
                    editorHeight={hdrPx}
                  />
                </div>

                {/* Bengali column */}
                <div className="p-3">
                  <p className="mb-2 text-xs font-semibold text-primary/70">ডাক্তারের তথ্য (বাংলা)</p>
                  <FreeformEditor
                    initialValue={pad.headerBnLines}
                    onChange={(json) => updatePad({ headerBnLines: json })}
                    placeholder="ডাঃ নাম, এমবিবিএস…"
                    editorHeight={hdrPx}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Prescription body area — shows column split */}
        <div className="flex min-h-32 flex-1">
          <div
            className="flex items-center justify-center border-r border-dashed border-muted-foreground/30 text-xs text-muted-foreground/30 transition-all"
            style={{ width: `${pad.bodyLeftPct}%` }}
          >
            Left {pad.bodyLeftPct}%
          </div>
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/30">
            Right {100 - parseInt(pad.bodyLeftPct || "35")}%
          </div>
        </div>

        {/* Footer section */}
        <div className="shrink-0 border-t bg-card">
          <div className="border-b bg-primary/5 px-3 py-3 text-center text-sm font-bold uppercase tracking-wide text-primary">
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
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/30 py-2 text-sm font-semibold text-primary/50 hover:border-primary hover:text-primary hover:bg-primary/5 transition"
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
  const [selectedChamberId, setSelectedChamberId] = useState<string>("");

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
    <div className="fixed inset-0 z-[60] flex bg-background">
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
