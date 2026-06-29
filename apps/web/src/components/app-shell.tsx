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
  CalendarOff,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  FilePlus2,
  Italic,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  History,
  Pencil,
  Phone,
  Pill,
  Plus,
  Settings,
  Sun,
  Trash2,
  Underline,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { fetchCurrentUser, logoutSession, refreshAccessToken, loginWithPassword, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSessionHydrated, useSessionStore } from "@/stores/session-store";

function loadProfilePhoto(doctorId: string): string {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(`rx-doctor-profile-${doctorId}`) : null;
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { photo?: string };
    return parsed.photo ?? "";
  } catch { return ""; }
}

const nav: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/",                  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/appointments",      label: "Appointments", icon: CalendarClock   },
  { href: "/prescriptions/new", label: "Prescription", icon: FilePlus2       },
  { href: "/patients",          label: "Patients",     icon: UsersRound      },
  { href: "/old-rx",            label: "Old Rx",       icon: History         },
  { href: "/medicines",         label: "Medicine",     icon: Pill            },
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
  const [dragging, setDragging] = useState(false);

  function processFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    processFile(e.target.files?.[0]);
    e.target.value = "";
  }

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {value ? (
        <div className="relative flex w-full items-center justify-center">
          <img src={value} alt="Logo" className="max-h-10 max-w-full rounded border bg-white object-contain p-0.5 shadow-sm" />
          <button
            type="button"
            title="Remove logo"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:opacity-90"
            onClick={() => onChange("")}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "flex w-full cursor-pointer items-center justify-center gap-1 rounded border border-dashed py-1.5 transition-colors",
            dragging
              ? "border-blue-400 bg-blue-50 text-blue-500"
              : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-gray-100",
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
        >
          <Plus className="h-3 w-3" />
          <span className="text-[9px] font-medium">{dragging ? "Drop here" : "Logo"}</span>
        </div>
      )}

      {value && (
        <button
          type="button"
          className="text-[9px] text-gray-400 underline hover:text-gray-600"
          onClick={() => inputRef.current?.click()}
        >
          Change
        </button>
      )}
    </div>
  );
}

// ─── Freeform Editor ─────────────────────────────────────────────────────────

const EDITOR_FONTS = [
  "Arial", "Times New Roman", "Georgia", "Verdana",
  "Courier New", "Trebuchet MS", "Tahoma", "Palatino Linotype",
];

const PRESET_COLORS = [
  "#000000", "#333333", "#DC2626", "#E85D04",
  "#F97316", "#15803D", "#0D9488", "#1D4ED8",
  "#7C3AED", "#92400E", "#0E7490", "#881337",
];


function FreeformEditor({
  initialValue,
  onChange,
  placeholder = "Type here…",
  editorHeight,
  noToolbar = false,
}: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editorHeight?: number;
  noToolbar?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeInputActive = useRef(false);
  const [colorPickerMode, setColorPickerMode] = useState<null | "text" | "bg">(null);
  const [hexVal, setHexVal] = useState("#000000");
  const [colorAnchor, setColorAnchor] = useState({ top: 0, left: 0 });
  const textBtnRef = useRef<HTMLButtonElement>(null);
  const bgBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState("13");
  const [currentFontFamily, setCurrentFontFamily] = useState("Arial");
  const [fmt, setFmt] = useState({
    bold: false, italic: false, underline: false,
    strikethrough: false, subscript: false, superscript: false,
    orderedList: false, unorderedList: false,
    align: "left" as "left" | "center" | "right" | "justify",
  });

  useEffect(() => {
    if (!ref.current) return;
    const cleaned = sanitizeHtmlColors(initialValue);
    ref.current.innerHTML = cleaned;
    if (cleaned !== initialValue) onChange(cleaned);
    try {
      ref.current.focus();
      document.execCommand("foreColor", false, "#000000");
      ref.current.blur();
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onSelChange() {
      if (sizeInputActive.current) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode ?? null)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
        syncFmt();
        // Read font-size and font-family at cursor from computed style
        const node = sel.getRangeAt(0).startContainer;
        const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
        if (el && ref.current.contains(el)) {
          const cs = window.getComputedStyle(el);
          const sz = parseFloat(cs.fontSize);
          if (!isNaN(sz)) setCurrentFontSize(String(Math.round(sz)));
          const fm = cs.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
          const matched = EDITOR_FONTS.find(f => f.toLowerCase() === fm.toLowerCase());
          if (matched) setCurrentFontFamily(matched);
        }
      }
    }
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!colorPickerMode) return;
    function onDown(e: MouseEvent) {
      if (textBtnRef.current?.contains(e.target as Node)) return;
      if (bgBtnRef.current?.contains(e.target as Node)) return;
      if (pickerRef.current?.contains(e.target as Node)) return;
      setColorPickerMode(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorPickerMode]);

  function openPicker(mode: "text" | "bg", defaultHex: string) {
    const btn = mode === "text" ? textBtnRef.current : bgBtnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setColorAnchor({ top: r.bottom + 4, left: r.left });
    }
    if (colorPickerMode === mode) { setColorPickerMode(null); return; }
    setHexVal(defaultHex);
    setColorPickerMode(mode);
  }

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
    setTimeout(() => ref.current?.focus(), 0);
  }

  function exec(cmd: string, val?: string) {
    restoreRange();
    document.execCommand(cmd, false, val ?? undefined);
    if (ref.current) onChange(sanitizeHtmlColors(ref.current.innerHTML));
    syncFmt();
    keepFocus();
  }

  // Apply font size by wrapping selection in a span, then stripping any
  // conflicting font-size from descendants so the outer size always wins.
  function applyFontSize(px: number) {
    if (isNaN(px) || px < 1) return;
    restoreRange();
    document.execCommand("fontSize", false, "7");
    ref.current?.querySelectorAll('font[size="7"]').forEach((el) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      span.innerHTML = el.innerHTML;
      // Strip font-size from every descendant so inner spans cannot override.
      span.querySelectorAll<HTMLElement>("[style]").forEach((child) => {
        child.style.removeProperty("font-size");
      });
      el.replaceWith(span);
    });
    if (ref.current) onChange(sanitizeHtmlColors(ref.current.innerHTML));
    setCurrentFontSize(String(px));
    keepFocus();
  }

  function tbBtn(active: boolean, title?: string) {
    return {
      type: "button" as const,
      title,
      className: cn(
        "flex h-6 w-6 items-center justify-center rounded text-[#444] transition",
        "hover:bg-[#d8dce0] hover:text-[#111]",
        active && "bg-[#1a1a1a] text-white hover:bg-[#333] hover:text-white",
      ),
    };
  }

  const Sep = () => <div className="mx-0.5 h-4 w-px bg-[#ccc]" />;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border transition-shadow",
        focused ? "border-blue-400 shadow-[0_0_0_2px_rgba(96,165,250,0.25)]" : "border-gray-300"
      )}
      style={{ background: "white", color: "#111" }}
    >

      {/* ── Toolbar (hidden when noToolbar) ── */}
      {!noToolbar && <>

      {/* ── Row 1: Font family · Size · A↑ A↓ | B I U ── */}
      <div className="flex items-center gap-0.5 border-b px-1.5 py-1" style={{ background: "#ebebeb" }}>
        <select
          className="h-6 rounded border border-gray-300 bg-white px-0.5 text-[10px] text-gray-800"
          style={{ minWidth: 90 }}
          value={currentFontFamily}
          onMouseDown={saveRange}
          onChange={(e) => { setCurrentFontFamily(e.target.value); exec("fontName", e.target.value); }}
        >
          {EDITOR_FONTS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>

        <input
          type="number" min="1" max="200" step="1"
          title="Font size (px)"
          value={currentFontSize}
          className="mx-0.5 h-6 w-11 rounded border border-gray-300 bg-white px-1 text-center text-[10px] text-gray-800 outline-none focus:ring-1 focus:ring-gray-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onChange={(e) => setCurrentFontSize(e.target.value)}
          onFocus={() => { sizeInputActive.current = true; }}
          onBlur={(e) => { sizeInputActive.current = false; applyFontSize(parseInt(e.target.value)); }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") { e.preventDefault(); applyFontSize(parseInt(currentFontSize)); }
          }}
        />

        <button type="button" title="Increase font size"
          className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-200"
          onMouseDown={(e) => { e.preventDefault(); applyFontSize(Math.min(200, parseInt(currentFontSize || "13") + 2)); }}>
          <span className="font-bold leading-none" style={{ fontSize: 11 }}>A</span>
          <span className="leading-none" style={{ fontSize: 7 }}>↑</span>
        </button>
        <button type="button" title="Decrease font size"
          className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-200"
          onMouseDown={(e) => { e.preventDefault(); applyFontSize(Math.max(1, parseInt(currentFontSize || "13") - 2)); }}>
          <span className="font-bold leading-none" style={{ fontSize: 9 }}>A</span>
          <span className="leading-none" style={{ fontSize: 7 }}>↓</span>
        </button>

        <Sep />
        <button {...tbBtn(fmt.bold,      "Bold (Ctrl+B)")}      onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}>      <Bold      className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.italic,    "Italic (Ctrl+I)")}    onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}>    <Italic    className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.underline, "Underline (Ctrl+U)")} onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}><Underline className="h-3 w-3" /></button>
      </div>

      {/* ── Row 2: Highlight · Text color | Alignment · Line spacing ── */}
      <div className="flex items-center gap-0.5 border-b px-1.5 py-1" style={{ background: "#ebebeb" }}>
        <button ref={bgBtnRef} type="button" title="Highlight color"
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100"
          onMouseDown={(e) => { e.preventDefault(); saveRange(); }}
          onClick={() => openPicker("bg", "#ffff00")}>
          <span className="select-none text-[12px] leading-none">🖊</span>
        </button>
        <button ref={textBtnRef} type="button" title="Text color"
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100"
          onMouseDown={(e) => { e.preventDefault(); saveRange(); }}
          onClick={() => openPicker("text", "#000000")}>
          <span className="select-none text-[11px] font-bold leading-none"
            style={{ textDecoration: "underline", textDecorationColor: "#e53e3e" }}>A</span>
        </button>

        <Sep />
        <button {...tbBtn(fmt.align === "left",    "Align left")}    onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }}>   <AlignLeft    className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.align === "center",  "Align center")}  onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }}> <AlignCenter  className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.align === "right",   "Align right")}   onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }}>  <AlignRight   className="h-3 w-3" /></button>
        <button {...tbBtn(fmt.align === "justify", "Justify")}       onMouseDown={(e) => { e.preventDefault(); exec("justifyFull"); }}>   <AlignJustify className="h-3 w-3" /></button>

        <Sep />
        <select
          title="Line spacing"
          className="h-6 rounded border border-gray-300 bg-white px-0.5 text-[10px] text-gray-800"
          defaultValue="1.2"
          onMouseDown={saveRange}
          onChange={(e) => {
            restoreRange();
            const val = e.target.value;
            if (!ref.current) return;
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            const walker = document.createTreeWalker(ref.current, NodeFilter.SHOW_ELEMENT);
            let node: Node | null = walker.currentNode;
            while (node) {
              if (node instanceof HTMLElement && range.intersectsNode(node)) {
                const display = getComputedStyle(node).display;
                if (display === "block" || display === "list-item") {
                  node.style.lineHeight = val;
                }
              }
              node = walker.nextNode();
            }
            if (ref.current) onChange(sanitizeHtmlColors(ref.current.innerHTML));
          }}
        >
          <option value="1">1.0</option>
          <option value="1.2">1.2</option>
          <option value="1.5">1.5</option>
          <option value="2">2.0</option>
        </select>
      </div>

      </>}

      {/* ── Editor area ── */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="p-2 outline-none empty:before:pointer-events-none empty:before:text-gray-300 empty:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder}
        style={{
          cursor: "text", wordBreak: "break-word", color: "#111",
          userSelect: "text", WebkitUserSelect: "text",
          fontFamily: "Arial, sans-serif", fontSize: 13,
          ...(editorHeight
            ? { height: editorHeight, overflow: "hidden" }
            : { minHeight: 80 }),
        }}
        onKeyUp={() => { saveRange(); syncFmt(); }}
        onClick={() => { saveRange(); syncFmt(); }}
        onSelect={() => { saveRange(); syncFmt(); }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setFocused(true);
          syncFmt();
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setFocused(false), 200);
        }}
        onInput={() => { if (ref.current) onChange(sanitizeHtmlColors(ref.current.innerHTML)); }}
      />

      {/* ── Color picker popup (fixed, escapes overflow-hidden) ── */}
      {colorPickerMode && (
        <div ref={pickerRef}
          className="fixed z-[500] w-[148px] rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
          style={{ top: colorAnchor.top, left: colorAnchor.left }}>
          {/* 12 preset swatches in 6-column grid */}
          <div className="mb-1.5 grid grid-cols-6 gap-1">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" title={c}
                className="h-[18px] w-[18px] rounded-sm transition-transform hover:scale-110"
                style={{ background: c, border: "1px solid rgba(0,0,0,0.22)" }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  restoreRange();
                  exec(colorPickerMode === "text" ? "foreColor" : "backColor", c);
                  setColorPickerMode(null);
                }} />
            ))}
          </div>
          {/* Hex input row */}
          <div className="flex items-center gap-1 border-t border-gray-200 pt-1.5">
            <div className="h-4 w-4 shrink-0 rounded"
              style={{
                background: /^#[0-9a-fA-F]{6}$/i.test(hexVal) ? hexVal : "#000000",
                border: "1px solid #ccc",
              }} />
            <input
              type="text"
              value={hexVal}
              placeholder="#000000"
              className="h-5 w-full rounded border border-gray-300 px-1 text-[9px] outline-none focus:ring-1 focus:ring-gray-400"
              onChange={(e) => setHexVal(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (/^#[0-9a-fA-F]{6}$/i.test(hexVal)) {
                    restoreRange();
                    exec(colorPickerMode === "text" ? "foreColor" : "backColor", hexVal);
                  }
                  setColorPickerMode(null);
                }
                if (e.key === "Escape") setColorPickerMode(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pad Settings Panel ──────────────────────────────────────────────────────

// Per-chamber pad storage
const chamberPadKey = (id: string) => `rx-pad-settings-${id}`;
function loadChamberPad(id: string): PadSettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(chamberPadKey(id)) : null;
    return raw ? { ...DEFAULT_PAD, ...(JSON.parse(raw) as Partial<PadSettings>) } : { ...DEFAULT_PAD };
  } catch { return { ...DEFAULT_PAD }; }
}
function saveChamberPad(id: string, pad: PadSettings) {
  try {
    localStorage.setItem(chamberPadKey(id), JSON.stringify(pad));
    localStorage.setItem(PAD_SETTINGS_KEY, JSON.stringify(pad)); // keep global in sync
  } catch {}
}

// Strips gray/neutral inline color styles from rich-text HTML so unintentionally
// gray content falls back to the container's black default.
// Low saturation + medium-or-higher lightness = accidental gray → removed.
// High saturation = intentional accent (orange, red, blue…) → kept.
function sanitizeHtmlColors(html: string): string {
  if (!html) return html;
  return html.replace(
    /color:\s*rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)\s*;?/g,
    (match, rs, gs, bs) => {
      const [r, g, b] = [+rs, +gs, +bs];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const saturation = max - min;        // 0 = pure gray, 255 = fully vivid
      const lightness  = (max + min) / 2; // 0 = black, 255 = white
      return saturation < 40 && lightness > 80 ? "" : match;
    }
  );
}

// Page-size constants for preview
const _PX_IN = 96;
const _PX_MM = _PX_IN / 25.4;
const _PAGE_W: Record<string, { w: number; h: number }> = {
  A4:     { w: 210 * _PX_MM, h: 297 * _PX_MM },
  A5:     { w: 148 * _PX_MM, h: 210 * _PX_MM },
  Letter: { w: 216 * _PX_MM, h: 279 * _PX_MM },
};

function PadPreviewModal({ pad, onClose }: { pad: PadSettings; onClose: () => void }) {
  const pageW = pad.pageSize === "Custom"
    ? (parseFloat(pad.customWidth)  || 8.5) * _PX_IN
    : _PAGE_W[pad.pageSize]?.w ?? _PAGE_W.A4.w;
  const pageH = pad.pageSize === "Custom"
    ? (parseFloat(pad.customHeight) || 11)  * _PX_IN
    : _PAGE_W[pad.pageSize]?.h ?? _PAGE_W.A4.h;

  const PREVIEW_W = 780;
  const scale    = PREVIEW_W / pageW;
  const previewH = Math.round(pageH * scale);

  const ip = (v: string, fb: number) => (parseFloat(v) || fb) * _PX_IN;
  const mTop    = ip(pad.marginTop,    0.6);
  const mBottom = ip(pad.marginBottom, 0.6);
  const mLeft   = ip(pad.marginLeft,   0.6);
  const mRight  = ip(pad.marginRight,  0.6);
  const hdrH    = ip(pad.headerHeight, 1.7);
  const ftrH    = ip(pad.footerHeight, 0.8);
  const bodyLeft = parseInt(pad.bodyLeftPct) || 35;
  const hasMid   = !!(pad.headerLogo || pad.headerMidLines);

  // thin underline helper used for blank fields
  const uline: React.CSSProperties = { borderBottom: "1px solid #111", display: "inline-block", minWidth: 120, marginBottom: -1 };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="mb-3 flex shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs font-bold uppercase tracking-widest text-white/80">Pad Preview</span>
        <span className="text-xs text-white/40">
          {pad.pageSize === "Custom" ? `${pad.customWidth}×${pad.customHeight} in` : pad.pageSize}
          &nbsp;·&nbsp;{Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          className="ml-2 flex items-center gap-1.5 rounded bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
      </div>

      {/* Scrollable paper */}
      <div
        className="overflow-auto rounded shadow-2xl ring-1 ring-white/10"
        style={{ maxHeight: "calc(100vh - 80px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: PREVIEW_W, height: previewH, position: "relative", overflow: "hidden" }}>
          {/* Full-size page scaled down */}
          <div style={{
            width: pageW, height: pageH,
            transform: `scale(${scale})`, transformOrigin: "top left",
            position: "absolute", top: 0, left: 0,
            background: "white", color: "#111",
            fontFamily: "Arial, sans-serif", fontSize: 13,
          }}>
            <style>{`
              .rxp p,.rxp h1,.rxp h2,.rxp h3,.rxp h4{margin:0;padding:0}
              .rxp ul,.rxp ol{margin:0;padding-left:1.2em}
              .rxp li{margin:0;padding:0}
              .rxp *{box-sizing:border-box;word-break:break-word;overflow-wrap:break-word}
            `}</style>

            {/* ── Content inside margins ── */}
            <div style={{
              position: "absolute",
              top: mTop, bottom: mBottom, left: mLeft, right: mRight,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>

              {/* ── HEADER: Bengali | Logo | English ── */}
              <div style={{
                height: hdrH, flexShrink: 0,
                display: "flex", alignItems: "stretch",
                borderBottom: "2px solid #222",
                overflow: "hidden",
              }}>
                {/* Left: Bengali */}
                <div className="rxp" style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: "6px 10px", color: "#111" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.headerBnLines || "") }} />

                {/* Centre: Logo + mid text — auto-width so text columns reach the edges */}
                {hasMid && (
                  <div style={{
                    flexShrink: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "0 6px", overflow: "hidden",
                  }}>
                    {pad.headerLogo && (
                      <img src={pad.headerLogo} alt="" style={{ maxHeight: hdrH * 0.6, maxWidth: 130, objectFit: "contain" }} />
                    )}
                    {pad.headerMidLines && (
                      <div className="rxp" style={{ textAlign: "center", width: "100%", marginTop: pad.headerLogo ? 4 : 0, color: "#111" }}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.headerMidLines) }} />
                    )}
                  </div>
                )}

                {/* Right: English */}
                <div className="rxp" style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: "6px 10px", color: "#111" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.headerEnLines || "") }} />
              </div>

              {/* ── Patient info row ── */}
              <div style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 6px",
                borderBottom: "1px solid #aaa",
                fontSize: 11, color: "#111",
              }}>
                <span style={{ fontWeight: 600 }}>Patient Name:</span>
                <span style={{ ...uline, flex: 2 }} />
                <span style={{ fontSize: 10, color: "#888", marginLeft: 4 }}>(No.:</span>
                <span style={{ ...uline, minWidth: 55, flex: "none" }} />
                <span style={{ fontSize: 10, color: "#888" }}>)</span>
                <span style={{ fontWeight: 600, marginLeft: 8 }}>Age:</span>
                <span style={{ ...uline, minWidth: 50, flex: "none" }} />
                <span style={{ fontWeight: 600, marginLeft: 8 }}>Date:</span>
                <span style={{ ...uline, minWidth: 80, flex: "none" }} />
              </div>

              {/* ── Body ── */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* Left: clinical fields */}
                <div style={{
                  width: `${bodyLeft}%`, flexShrink: 0,
                  borderRight: "1px solid #bbb",
                  display: "flex", flexDirection: "column",
                  padding: "8px 8px",
                  overflow: "hidden", gap: 7,
                }}>
                  {["Complaint", "History", "Findings", "Investigation", "Diagnosis"].map((label) => (
                    <div key={label}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                        {label}
                      </div>
                      <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 7 }} />
                    </div>
                  ))}
                </div>

                {/* Right: prescription fields */}
                <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", overflow: "hidden", gap: 7 }}>
                  {["Medication", "Glass Prescription", "Advice", "Follow-Up", "Referral"].map((label) => (
                    <div key={label}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                        {label}
                      </div>
                      <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 7 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Footer ── */}
              <div style={{
                height: ftrH, flexShrink: 0,
                borderTop: "2px solid #222",
                overflow: "hidden", display: "flex", flexDirection: "column",
                justifyContent: "center", padding: "4px 10px",
              }}>
                {pad.footerShowDivider && <div style={{ borderTop: "1px solid #555", marginBottom: 4 }} />}
                {pad.footerText ? (
                  <div className="rxp" style={{ fontSize: 11, color: "#111", lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.footerText) }} />
                ) : (
                  <div style={{ fontSize: 10, color: "#bbb", textAlign: "center", fontStyle: "italic" }}>footer text here</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live A4 Preview ─────────────────────────────────────────────────────────

function PadLivePreview({ pad, className }: { pad: PadSettings; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);

  const pageW = pad.pageSize === "Custom"
    ? (parseFloat(pad.customWidth) || 8.5) * _PX_IN
    : _PAGE_W[pad.pageSize]?.w ?? _PAGE_W.A4.w;
  const pageH = pad.pageSize === "Custom"
    ? (parseFloat(pad.customHeight) || 11) * _PX_IN
    : _PAGE_W[pad.pageSize]?.h ?? _PAGE_W.A4.h;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const pad = 24;
      const scaleW = (el.clientWidth  - pad) / pageW;
      const scaleH = (el.clientHeight - pad) / pageH;
      setScale(Math.min(scaleW, scaleH));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [pageW, pageH]);

  const ip  = (v: string, fb: number) => (parseFloat(v) || fb) * _PX_IN;
  const mT  = ip(pad.marginTop,    0.6);
  const mB  = ip(pad.marginBottom, 0.6);
  const mL  = ip(pad.marginLeft,   0.6);
  const mR  = ip(pad.marginRight,  0.6);
  const hdrH = ip(pad.headerHeight, 1.7);
  const ftrH = ip(pad.footerHeight, 0.8);
  const bodyLeft = parseInt(pad.bodyLeftPct) || 35;
  const hasMid   = !!(pad.headerLogo || pad.headerMidLines);
  const uline: React.CSSProperties = { borderBottom: "1px solid #999", display: "inline-block", minWidth: 80 };

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft", className)}>
      {/* Title bar */}
      <div className="flex shrink-0 items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <Eye className="h-3.5 w-3.5 text-primary/60" />
        <span className="text-xs font-semibold text-foreground/70">Live Preview</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {pad.pageSize === "Custom" ? `${pad.customWidth}×${pad.customHeight}in` : pad.pageSize}
          </span>
        </div>
      </div>

      {/* Paper container — stretches to fill available card height */}
      <div ref={wrapRef} className="flex-1 min-h-0 bg-muted/10 p-3 flex items-start justify-center overflow-hidden">
        <div style={{ width: Math.round(pageW * scale), height: Math.round(pageH * scale), position: "relative", overflow: "hidden", flexShrink: 0 }}>
          {/* Full-size page scaled down */}
          <div style={{
            width: pageW, height: pageH,
            transform: `scale(${scale})`, transformOrigin: "top left",
            position: "absolute", top: 0, left: 0,
            background: "white", color: "#111",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            fontFamily: "Arial, sans-serif", fontSize: 13,
          }}>
            <style>{`
              .rxpv p,.rxpv h1,.rxpv h2,.rxpv h3{margin:0;padding:0}
              .rxpv ul,.rxpv ol{margin:0;padding-left:1.2em}
              .rxpv li{margin:0;padding:0}
              .rxpv *{box-sizing:border-box;word-break:break-word;overflow-wrap:break-word}
            `}</style>

            <div style={{ position: "absolute", top: mT, bottom: mB, left: mL, right: mR, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ height: hdrH, flexShrink: 0, display: "flex", alignItems: "stretch", borderBottom: "2px solid #222", overflow: "hidden" }}>
                <div className="rxpv" style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: "6px 10px", color: "#111" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.headerBnLines || "") }} />
                {hasMid && (
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6px", overflow: "hidden" }}>
                    {pad.headerLogo && <img src={pad.headerLogo} alt="" style={{ maxHeight: hdrH * 0.6, maxWidth: 130, objectFit: "contain" }} />}
                    {pad.headerMidLines && (
                      <div className="rxpv" style={{ textAlign: "center", width: "100%", marginTop: pad.headerLogo ? 4 : 0, color: "#111" }}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.headerMidLines) }} />
                    )}
                  </div>
                )}
                <div className="rxpv" style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: "6px 10px", color: "#111" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.headerEnLines || "") }} />
              </div>

              {/* Patient info row */}
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderBottom: "1px solid #aaa", fontSize: 11, color: "#111" }}>
                <span style={{ fontWeight: 600 }}>Patient Name:</span><span style={{ ...uline, flex: 2 }} />
                <span style={{ fontSize: 10, color: "#888", marginLeft: 4 }}>(No.:</span><span style={{ ...uline, minWidth: 55, flex: "none" as const }} /><span style={{ fontSize: 10, color: "#888" }}>)</span>
                <span style={{ fontWeight: 600, marginLeft: 8 }}>Age:</span><span style={{ ...uline, minWidth: 50, flex: "none" as const }} />
                <span style={{ fontWeight: 600, marginLeft: 8 }}>Date:</span><span style={{ ...uline, minWidth: 80, flex: "none" as const }} />
              </div>

              {/* Body */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Left: clinical fields */}
                <div style={{ width: `${bodyLeft}%`, flexShrink: 0, borderRight: "1px solid #bbb", padding: "8px", display: "flex", flexDirection: "column", gap: 7, overflow: "hidden" }}>
                  {["Complaint", "History", "Findings", "Investigation", "Diagnosis"].map((label) => (
                    <div key={label}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#444", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                      <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 7 }} />
                    </div>
                  ))}
                </div>
                {/* Right: prescription fields */}
                <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 7, overflow: "hidden" }}>
                  {["Medication", "Glass Prescription", "Advice", "Follow-Up", "Referral"].map((label) => (
                    <div key={label}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#444", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                      <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 7 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ height: ftrH, flexShrink: 0, borderTop: "2px solid #222", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "4px 10px" }}>
                {pad.footerText ? (
                  <div className="rxpv" style={{ fontSize: 11, color: "#111", lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlColors(pad.footerText) }} />
                ) : (
                  <div style={{ fontSize: 10, color: "#bbb", textAlign: "center", fontStyle: "italic" }}>footer text here…</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dimension info bar */}
      <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 border-t bg-muted/20 px-3 py-1.5">
        {([
          ["Header", `${pad.headerHeight || "1.7"}in`],
          ["Footer", `${pad.footerHeight || "0.8"}in`],
          ["Margins", `${pad.marginTop || "0.6"}/${pad.marginLeft || "0.6"}in`],
          ["Body", `${pad.bodyLeftPct || "35"}/${100 - parseInt(pad.bodyLeftPct || "35")}%`],
        ] as [string, string][]).map(([k, v]) => (
          <span key={k} className="text-[9px] text-muted-foreground">
            <span className="font-semibold text-foreground/50">{k}</span> {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Pad Settings Panel ───────────────────────────────────────────────────────

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
  const hdrPx = Math.round((parseFloat(pad.headerHeight) || 1.7) * _PX_IN);

  const settingLabel = "text-[10px] font-bold uppercase tracking-wide text-primary mb-0.5";
  const inp = "h-6 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary";

  // Light-theme CSS vars for editor cards
  const lightTheme: React.CSSProperties = {
    "--background": "0 0% 100%", "--foreground": "0 0% 0%",
    "--card": "0 0% 100%", "--card-foreground": "0 0% 0%",
    "--muted": "0 0% 94%", "--muted-foreground": "0 0% 12%",
    "--border": "0 0% 86%", "--primary": "0 0% 10%",
    "--primary-foreground": "0 0% 100%",
    colorScheme: "light",
  } as React.CSSProperties;

  return (
    <div className="space-y-4">
      {/* ── Chamber selector ── */}
      <ChamberDropdown
        chambers={chambers} selectedId={selectedChamberId}
        onChange={onChamberChange} onAdd={onChamberAdd} onRemove={onChamberRemove}
      />

      {/* ── 3-column main grid ── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[168px_1fr_1fr] xl:items-stretch">

        {/* ── LEFT: Settings ── */}
        <div className="space-y-1.5">

          {/* Consultation Fees */}
          <div className="rounded-xl border bg-card p-2.5 shadow-soft space-y-1.5">
            <p className={settingLabel}>Consultation Fees (৳)</p>
            {([
              ["New Patient", "newPatientFees"],
              ["Follow-Up",  "followUpFees"],
              ["Report",     "reportFees"],
            ] as [string, keyof PadSettings][]).map(([label, key]) => (
              <div key={key} className="flex items-center justify-between gap-1">
                <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
                <input type="text" inputMode="numeric" className={cn(inp, "w-14 text-center")}
                  placeholder="0" value={pad[key] as string}
                  onChange={(e) => updatePad({ [key]: e.target.value })} />
              </div>
            ))}
          </div>

          {/* Page Size */}
          <div className="rounded-xl border bg-card p-2.5 shadow-soft space-y-1.5">
            <p className={settingLabel}>Page Size</p>
            <select className={cn(inp, "w-full")} value={pad.pageSize}
              onChange={(e) => updatePad({ pageSize: e.target.value as PadSettings["pageSize"] })}>
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
              <option value="Custom">Custom</option>
            </select>
            {pad.pageSize === "Custom" && (
              <div className="flex items-center gap-1">
                <input className={cn(inp, "flex-1")} value={pad.customWidth} placeholder="W (in)"
                  onChange={(e) => updatePad({ customWidth: e.target.value })} />
                <span className="text-[10px] text-muted-foreground">×</span>
                <input className={cn(inp, "flex-1")} value={pad.customHeight} placeholder="H (in)"
                  onChange={(e) => updatePad({ customHeight: e.target.value })} />
              </div>
            )}
          </div>

          {/* Section Heights */}
          <div className="rounded-xl border bg-card p-2.5 shadow-soft space-y-1.5">
            <p className={settingLabel}>Header Height (in)</p>
            {([["Header", "headerHeight"], ["Footer", "footerHeight"]] as [string, keyof PadSettings][]).map(([label, key]) => (
              <div key={key} className="flex items-center gap-1">
                <span className="w-12 shrink-0 text-[10px] text-muted-foreground">{label}</span>
                <input type="text" inputMode="numeric" className={cn(inp, "w-12 text-center")}
                  placeholder="1.5" value={pad[key] as string}
                  onChange={(e) => updatePad({ [key]: e.target.value })} />
                <span className="text-[10px] text-muted-foreground">in</span>
              </div>
            ))}
          </div>

          {/* Margins */}
          <div className="rounded-xl border bg-card p-2.5 shadow-soft space-y-1.5">
            <p className={settingLabel}>Margins (in)</p>
            <div className="flex flex-col items-center gap-1">
              <input type="text" inputMode="numeric" className={cn(inp, "w-14 text-center text-[10px]")}
                placeholder="Top" value={pad.marginTop} onChange={(e) => updatePad({ marginTop: e.target.value })} />
              <div className="flex w-full items-center gap-1">
                <input type="text" inputMode="numeric" className={cn(inp, "w-14 text-center text-[10px]")}
                  placeholder="Left" value={pad.marginLeft} onChange={(e) => updatePad({ marginLeft: e.target.value })} />
                <div className="h-px flex-1 border-t border-dashed border-muted-foreground/30" />
                <input type="text" inputMode="numeric" className={cn(inp, "w-14 text-center text-[10px]")}
                  placeholder="Right" value={pad.marginRight} onChange={(e) => updatePad({ marginRight: e.target.value })} />
              </div>
              <input type="text" inputMode="numeric" className={cn(inp, "w-14 text-center text-[10px]")}
                placeholder="Bottom" value={pad.marginBottom} onChange={(e) => updatePad({ marginBottom: e.target.value })} />
            </div>
          </div>

          {/* Body Column Split */}
          <div className="rounded-xl border bg-card p-2.5 shadow-soft space-y-1.5">
            <p className={settingLabel}>Body Split</p>
            <div className="flex h-5 overflow-hidden rounded border text-[9px] font-bold">
              <div className="relative flex items-center justify-center bg-primary/15 text-primary transition-all" style={{ width: `${pad.bodyLeftPct}%` }}>
                {pad.bodyLeftPct}%
                <div className="absolute right-0 top-0 h-full w-px bg-primary/50" />
              </div>
              <div className="flex items-center justify-center bg-muted text-muted-foreground transition-all" style={{ width: `${100 - parseInt(pad.bodyLeftPct || "35")}%` }}>
                {100 - parseInt(pad.bodyLeftPct || "35")}%
              </div>
            </div>
            <input type="range" min="15" max="60" step="1" className="w-full accent-primary"
              value={pad.bodyLeftPct} onChange={(e) => updatePad({ bodyLeftPct: e.target.value })} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Patient info</span><span>Rx</span>
            </div>
          </div>
        </div>

        {/* ── MIDDLE: Header + Footer editors ── */}
        <div key={selectedChamberId} className="space-y-4" style={lightTheme}>

          {/* ── Header section ── */}
          <div className="overflow-hidden rounded-xl border bg-white shadow-soft" style={{ color: "black" }}>
            <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Header</span>
              <span className="ml-auto text-[10px] text-gray-400">{pad.headerHeight || "1.7"} in tall</span>
            </div>

            {/* 3-column editors: Bengali | Logo+Centre | English */}
            <div className="flex divide-x">

              {/* Bengali — fills all remaining left space */}
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  বাংলা — বাম
                </p>
                <FreeformEditor
                  initialValue={pad.headerBnLines}
                  onChange={(v) => updatePad({ headerBnLines: v })}
                  placeholder="ডাঃ নাম, এমবিবিএস…"
                  editorHeight={hdrPx}
                />
              </div>

              {/* Logo + centre text — auto-sized to content */}
              <div className="flex shrink-0 flex-col items-center gap-1 p-2"
                style={{ minWidth: 100, maxWidth: 160 }}>
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Logo / Centre
                </p>
                <LogoUpload value={pad.headerLogo} onChange={(v) => updatePad({ headerLogo: v })} />
                <FreeformEditor
                  initialValue={pad.headerMidLines}
                  onChange={(v) => updatePad({ headerMidLines: v })}
                  placeholder="Clinic name…"
                  editorHeight={Math.max(hdrPx - 48, 36)}
                  noToolbar
                />
              </div>

              {/* English — fills all remaining right space */}
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  English — ডান
                </p>
                <FreeformEditor
                  initialValue={pad.headerEnLines}
                  onChange={(v) => updatePad({ headerEnLines: v })}
                  placeholder="Dr. Name, MBBS…"
                  editorHeight={hdrPx}
                />
              </div>
            </div>
          </div>

          {/* ── Footer section ── */}
          <div className="overflow-hidden rounded-xl border bg-white shadow-soft" style={{ color: "black" }}>
            <div className="flex items-center gap-3 border-b bg-gray-50 px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Footer</span>
              <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                <input type="checkbox" className="h-3.5 w-3.5 rounded"
                  checked={pad.footerShowDivider}
                  onChange={(e) => updatePad({ footerShowDivider: e.target.checked })} />
                Divider line
              </label>
              <span className="ml-auto text-[10px] text-gray-400">{pad.footerHeight || "0.8"} in</span>
            </div>
            <div className="p-3">
              <FreeformEditor
                initialValue={pad.footerText}
                onChange={(v) => updatePad({ footerText: v })}
                placeholder="Visiting hours · Address · Phone · Website…"
                editorHeight={Math.round((parseFloat(pad.footerHeight) || 0.8) * _PX_IN)}
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live preview (sticky) ── */}
        <div className="h-full flex flex-col">
          <PadLivePreview pad={pad} className="flex-1 min-h-0" />
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border bg-card px-5 py-3 shadow-soft">
        <button type="button"
          className="rounded-lg border px-4 py-1.5 text-xs font-semibold transition hover:bg-muted"
          onClick={onCancel}>
          Cancel
        </button>
        <button type="button"
          className="rounded-lg bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          onClick={onSave}>
          Save Changes
        </button>
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
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm font-semibold shadow-sm transition hover:bg-muted"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="max-w-[220px] truncate">{selected?.name ?? "Select Chamber"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[260px] overflow-hidden rounded-xl border bg-card shadow-xl">
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

// ─── Appointment Settings Modal ──────────────────────────────────────────────

// ── Shared types ──
export const APPT_SCHEDULE_KEY = "rx-appointment-schedule";
export const WEEK_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type WeekDay = typeof WEEK_DAYS[number];

// minutesPerPatient: consultation duration per patient in minutes
export type TimeBlock    = { id: string; from: string; to: string; maxPatients: number; minutesPerPatient: number };
export type WeekSchedule = Record<WeekDay, TimeBlock[]>;
export type LeaveEntry   = { id: string; from: string; to: string; comment: string };
export type ApptScheduleData = { phone: string; schedule: WeekSchedule; leaves: LeaveEntry[] };

const EMPTY_WEEK: WeekSchedule = Object.fromEntries(WEEK_DAYS.map((d) => [d, [] as TimeBlock[]])) as unknown as WeekSchedule;
const DEFAULT_APPT: ApptScheduleData = { phone: "", schedule: { ...EMPTY_WEEK }, leaves: [] };

// Per-chamber key
function apptScheduleKey(chamberId: string) { return `${APPT_SCHEDULE_KEY}-${chamberId}`; }

export function loadApptSchedule(chamberId = "default"): ApptScheduleData {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(apptScheduleKey(chamberId)) : null;
    if (!raw) return { ...DEFAULT_APPT, schedule: { ...EMPTY_WEEK } };
    const p = JSON.parse(raw) as Partial<ApptScheduleData>;
    return { phone: p.phone ?? "", schedule: { ...EMPTY_WEEK, ...(p.schedule ?? {}) } as WeekSchedule, leaves: p.leaves ?? [] };
  } catch { return { ...DEFAULT_APPT, schedule: { ...EMPTY_WEEK } }; }
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function fmt12h(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// ── Schedule tab ──
const DEFAULT_BLOCK_FORM = { from: "09:00", to: "21:00", maxPatients: 30, minutesPerPatient: 10 };

function ScheduleTab({ schedule, onChange }: { schedule: WeekSchedule; onChange: (s: WeekSchedule) => void }) {
  const [expanded, setExpanded] = useState<WeekDay | null>(null);
  const [adding,   setAdding]   = useState<WeekDay | null>(null);
  const [editing,  setEditing]  = useState<{ day: WeekDay; id: string } | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_BLOCK_FORM });

  function openAdd(day: WeekDay) {
    setForm({ ...DEFAULT_BLOCK_FORM });
    setAdding(day); setEditing(null); setExpanded(day);
  }

  function openEdit(day: WeekDay, block: TimeBlock) {
    setForm({ from: block.from, to: block.to, maxPatients: block.maxPatients, minutesPerPatient: block.minutesPerPatient ?? 10 });
    setEditing({ day, id: block.id }); setAdding(null); setExpanded(day);
  }

  function commitAdd(day: WeekDay) {
    onChange({ ...schedule, [day]: [...schedule[day], { id: uid(), ...form }] });
    setAdding(null);
  }

  function commitEdit(day: WeekDay, id: string) {
    onChange({ ...schedule, [day]: schedule[day].map((b) => b.id === id ? { ...b, ...form } : b) });
    setEditing(null);
  }

  function removeBlock(day: WeekDay, id: string) {
    onChange({ ...schedule, [day]: schedule[day].filter((b) => b.id !== id) });
  }

  const inlineForm = (day: WeekDay, onCommit: () => void, onCancel: () => void) => (
    <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">From</label>
          <input type="time" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">To</label>
          <input type="time" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Max Patients</label>
          <input type="number" min={1} max={999} value={form.maxPatients}
            onChange={(e) => setForm((f) => ({ ...f, maxPatients: Math.max(1, Number(e.target.value) || 1) }))}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Min / Patient</label>
          <input type="number" min={1} max={120} value={form.minutesPerPatient}
            onChange={(e) => setForm((f) => ({ ...f, minutesPerPatient: Math.max(1, Number(e.target.value) || 1) }))}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCommit}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {WEEK_DAYS.map((day) => {
        const blocks    = schedule[day];
        const isOpen    = expanded === day;
        const hasBlocks = blocks.length > 0;
        return (
          <div key={day} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <button type="button" className="flex flex-1 items-center gap-2 text-left"
                onClick={() => setExpanded(isOpen ? null : day)}>
                <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                <span className="text-sm font-semibold text-foreground">{day}</span>
                {hasBlocks && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {blocks.length}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => openAdd(day)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-border px-4 py-3 space-y-2">
                {blocks.length === 0 && adding !== day && (
                  <p className="text-xs italic text-muted-foreground/60">No schedule — click + to add a time block.</p>
                )}
                {blocks.map((block) => {
                  const isEditingThis = editing?.day === day && editing.id === block.id;
                  return (
                    <div key={block.id}>
                      {isEditingThis ? (
                        inlineForm(day, () => commitEdit(day, block.id), () => setEditing(null))
                      ) : (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {fmt12h(block.from)} – {fmt12h(block.to)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Max: {block.maxPatients} patients &nbsp;·&nbsp; {block.minutesPerPatient ?? 10} min/patient
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openEdit(day, block)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-primary transition-colors">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => removeBlock(day, block.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {adding === day && inlineForm(day, () => commitAdd(day), () => setAdding(null))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Leave tab ──
function LeaveTab({ leaves, onChange }: { leaves: LeaveEntry[]; onChange: (l: LeaveEntry[]) => void }) {
  const empty = { from: "", to: "", comment: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  function addLeave() {
    if (!form.from || !form.to) { setError("Both From and To dates are required."); return; }
    if (form.from > form.to)    { setError("'From' must be before or equal to 'To'."); return; }
    onChange([...leaves, { id: uid(), ...form }]);
    setForm(empty); setError("");
  }

  function fmtDisplay(iso: string) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Leave / Holiday</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">From <span className="text-destructive">*</span></label>
            <input type="date" value={form.from}
              onChange={(e) => { setForm((f) => ({ ...f, from: e.target.value })); setError(""); }}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">To <span className="text-destructive">*</span></label>
            <input type="date" value={form.to}
              onChange={(e) => { setForm((f) => ({ ...f, to: e.target.value })); setError(""); }}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Comment (optional)</label>
          <input type="text" value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            placeholder="e.g. Eid Holiday"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={addLeave}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
          <button type="button" onClick={() => { setForm(empty); setError(""); }}
            className="rounded-lg border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">Reset</button>
        </div>
      </div>

      {leaves.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved Leaves</p>
          {leaves.map((lv) => (
            <div key={lv.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarOff className="h-3.5 w-3.5 text-destructive/70" />
                  <span className="text-sm font-medium text-foreground">
                    {fmtDisplay(lv.from)}{lv.from !== lv.to && <> — {fmtDisplay(lv.to)}</>}
                  </span>
                </div>
                {lv.comment && <p className="mt-0.5 text-xs text-muted-foreground pl-5">{lv.comment}</p>}
              </div>
              <button type="button" onClick={() => onChange(leaves.filter((l) => l.id !== lv.id))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm italic text-muted-foreground/50 py-4">No leaves added yet.</p>
      )}
    </div>
  );
}

// ── Main modal ──
type ApptSettingsTab = "schedule" | "leave";

function AppointmentSettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<ApptSettingsTab>("schedule");
  const [saved, setSaved] = useState(false);

  // Load chambers from localStorage (same source as topbar)
  const [chambers] = useState<Chamber[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("rx-chambers") : null;
      const parsed = raw ? (JSON.parse(raw) as Chamber[]) : null;
      return parsed && parsed.length > 0 ? parsed : DEFAULT_CHAMBERS;
    } catch { return DEFAULT_CHAMBERS; }
  });

  // Active chamber — default to the selected one from topbar
  const [selectedChamberId, setSelectedChamberId] = useState<string>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("rx-selected-chamber") : null;
      const saved = raw ? (JSON.parse(raw) as Chamber) : null;
      return saved?.id ?? chambers[0]?.id ?? "default";
    } catch { return chambers[0]?.id ?? "default"; }
  });

  // Per-chamber data
  const [appt, setAppt] = useState<ApptScheduleData>(() => loadApptSchedule(selectedChamberId));

  // Reload data when chamber changes
  function handleChamberChange(id: string) {
    setSelectedChamberId(id);
    setAppt(loadApptSchedule(id));
  }

  function handleSave() {
    const key = apptScheduleKey(selectedChamberId);
    try {
      localStorage.setItem(key, JSON.stringify(appt));
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(appt) }));
    } catch {}
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  const TABS: { id: ApptSettingsTab; label: string }[] = [
    { id: "schedule", label: "Schedule" },
    { id: "leave",    label: "Leave" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative flex h-[90vh] w-full max-w-xl flex-col rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0 border-b px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Appointment Settings</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chamber selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Chamber</label>
            <select
              value={selectedChamberId}
              onChange={(e) => handleChamberChange(e.target.value)}
              className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {chambers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input type="tel" value={appt.phone}
              onChange={(e) => setAppt((a) => ({ ...a, phone: e.target.value }))}
              placeholder="Chamber contact phone number"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-muted/40 p-1">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                  tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "schedule" && (
            <ScheduleTab schedule={appt.schedule}
              onChange={(s) => setAppt((a) => ({ ...a, schedule: s }))} />
          )}
          {tab === "leave" && (
            <LeaveTab leaves={appt.leaves}
              onChange={(l) => setAppt((a) => ({ ...a, leaves: l }))} />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drug Formation Order ────────────────────────────────────────────────────
// Lets the user decide whether a dosage form label appears BEFORE or AFTER
// the trade name in search results (e.g. "TAB NAPA" vs "NAPA TAB").

import type { DosageFormPositions } from "@/lib/dosage-form-position";
import { IMAGE_DEFAULTS, loadDosageFormPositions, saveDosageFormPositions } from "@/lib/dosage-form-position";

const SCHEDULE_KEY = "rx-dosage-form-schedule";

type FormSched = {
  schedule: string;         // "None" | "1"–"6"
  scheduleDoses: string[];
  durationValue: string;
  durationUnit: string;
  continueMedicine: boolean;
  // used when schedule === "None": [text, digit1-9, text, eye-side]
  noneFields: [string, string, string, string];
};
type FormSchedules = Record<string, FormSched>;

const DEFAULT_SCHED: FormSched = {
  schedule: "3",
  scheduleDoses: ["0", "0", "0"],
  durationValue: "0",
  durationUnit: "Day",
  continueMedicine: false,
  noneFields: ["1 Drop", "1", "Times Daily", "Both Eye"],
};

function loadSchedules(): FormSchedules {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? "{}") as Record<string, unknown>;
    const result: FormSchedules = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === "object" && !Array.isArray(v)) result[k] = v as FormSched;
    }
    return result;
  } catch { return {}; }
}
function saveSchedules(s: FormSchedules) {
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)); } catch {}
}

function DrugFormationOrderPanel({ onClose }: { onClose: () => void }) {
  const token = useSessionStore((s) => s.accessToken) ?? "";

  const [apiForms, setApiForms] = useState<string[]>([]);
  const [positions, setPositions] = useState<DosageFormPositions>(() => loadDosageFormPositions());
  const [schedules, setSchedules] = useState<FormSchedules>(() => loadSchedules());
  const [newForm, setNewForm]     = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [newPos, setNewPos]       = useState<"before" | "after">("before");

  useEffect(() => {
    if (!token) return;
    apiFetch<string[]>("/medicines/dosage-forms", { token })
      .then(setApiForms)
      .catch(() => {});
  }, [token]);

  const extraForms = Object.keys(positions).filter((f) => !apiForms.includes(f));
  const allForms   = [...apiForms, ...extraForms];

  function getPos(form: string): "before" | "after" {
    if (form in positions) return positions[form];
    const upper = form.toUpperCase();
    if (upper in IMAGE_DEFAULTS) return IMAGE_DEFAULTS[upper];
    return "before";
  }

  function toggle(form: string, pos: "before" | "after") {
    const next = { ...positions, [form]: pos };
    setPositions(next);
    saveDosageFormPositions(next);
  }

  function getSched(form: string): FormSched {
    const v = schedules[form];
    if (!v || typeof v !== "object" || !("scheduleDoses" in v)) return { ...DEFAULT_SCHED };
    return { ...DEFAULT_SCHED, ...v, noneFields: (v.noneFields ?? ["1 Drop","1","Times Daily","Both Eye"]) };
  }

  function patchSched(form: string, patch: Partial<FormSched>) {
    const next = { ...schedules, [form]: { ...getSched(form), ...patch } };
    setSchedules(next);
    saveSchedules(next);
  }

  function setSchedCount(form: string, count: string) {
    if (count === "None") {
      const cur = getSched(form);
      patchSched(form, { schedule: "None", scheduleDoses: [], noneFields: cur.noneFields ?? ["1 Drop","1","Times Daily","Both Eye"] });
      return;
    }
    const n = Math.max(1, Math.min(6, parseInt(count, 10) || 1));
    const current = getSched(form);
    const doses = Array.from({ length: n }, (_, i) => current.scheduleDoses[i] ?? "0");
    patchSched(form, { schedule: String(n), scheduleDoses: doses });
  }

  function setSchedDose(form: string, i: number, val: string) {
    const doses = [...getSched(form).scheduleDoses];
    doses[i] = val;
    patchSched(form, { scheduleDoses: doses });
  }

  function handleAdd() {
    const name = newForm.trim();
    if (!name) return;
    toggle(name, newPos);
    setNewForm("");
  }

  const rowBtn = (active: boolean) =>
    cn("px-3 py-1 rounded text-xs font-semibold transition-colors",
      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70");

  const numCls = "h-8 w-12 rounded-sm border bg-background px-1 text-center text-sm font-semibold text-red-600 outline-none focus:ring-1 focus:ring-primary";
  const selCls = "h-8 rounded-sm border bg-background px-1 text-sm outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="mx-auto max-w-full overflow-x-auto p-4 lg:p-6">
      {/* Top add bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-sm">
        <span className="w-28 shrink-0 text-xs font-semibold text-muted-foreground">Drug Formation</span>
        <div className="relative flex-1 min-w-40">
          <input
            value={newForm}
            onChange={(e) => { setNewForm(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Search formation…"
            className="h-8 w-full rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
          />
          {searchOpen && apiForms.filter((f) => f.toLowerCase().includes(newForm.toLowerCase())).length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-0.5 max-h-48 w-full overflow-y-auto rounded border bg-popover shadow-lg">
              {apiForms.filter((f) => f.toLowerCase().includes(newForm.toLowerCase())).map((f) => (
                <button key={f} type="button"
                  onMouseDown={() => { setNewForm(f); setNewPos(getPos(f)); setSearchOpen(false); }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-muted">
                  <span>{f}</span>
                  <span className={cn("ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    getPos(f) === "before" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {getPos(f) === "before" ? "Before" : "After"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setNewPos("before")}
          className={cn("px-3 py-1 rounded text-xs font-semibold transition-colors", newPos === "before" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
          Before
        </button>
        <button type="button" onClick={() => setNewPos("after")}
          className={cn("px-3 py-1 rounded text-xs font-semibold transition-colors", newPos === "after" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
          After
        </button>
        <button type="button" disabled={!newForm.trim()} onClick={handleAdd}
          className="flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
          Save
        </button>
      </div>

      {/* List — horizontally scrollable so every row stays on one line */}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <div className="min-w-max">
        <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <span className="w-36 shrink-0">Formation</span>
          <span className="w-[136px] shrink-0 text-center">Position</span>
          <span className="shrink-0">Schedule</span>
        </div>

        {allForms.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…
          </div>
        ) : allForms.map((form) => {
          const pos   = getPos(form);
          const sched = getSched(form);
          const isNone = sched.schedule === "None";
          const count = isNone ? 0 : Math.max(1, Math.min(6, parseInt(sched.schedule, 10) || 1));
          return (
            <div key={form}
              className="flex items-center gap-4 border-b px-4 py-2 last:border-0 hover:bg-muted/20 transition-colors">

              {/* Formation name */}
              <span className="w-36 shrink-0 truncate text-sm font-medium text-foreground">{form}</span>

              {/* Position */}
              <div className="flex w-[136px] shrink-0 items-center gap-1">
                <button type="button" className={rowBtn(pos === "before")} onClick={() => toggle(form, "before")}>Before</button>
                <button type="button" className={rowBtn(pos === "after")}  onClick={() => toggle(form, "after")}>After</button>
              </div>

              {/* Schedule row — mirrors ExpandedMedicineForm */}
              <div className="flex items-center gap-x-2">
                {/* Schedule count */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Schedule</span>
                  <select className={cn(selCls, "w-14")} value={sched.schedule}
                    onChange={(e) => setSchedCount(form, e.target.value)}>
                    {["None","1","2","3","4","5","6"].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* None → 4 custom fields */}
                {isNone ? (
                  <>
                    <input type="text" className={cn(numCls, "w-16")}
                      value={sched.noneFields[0]}
                      onChange={(e) => { const f = [...sched.noneFields] as [string,string,string,string]; f[0]=e.target.value; patchSched(form,{noneFields:f}); }} />
                    <select className={cn(selCls, "w-14")}
                      value={sched.noneFields[1]}
                      onChange={(e) => { const f = [...sched.noneFields] as [string,string,string,string]; f[1]=e.target.value; patchSched(form,{noneFields:f}); }}>
                      {["1","2","3","4","5","6","7","8","9"].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input type="text" className={cn(numCls, "w-20")}
                      value={sched.noneFields[2]}
                      onChange={(e) => { const f = [...sched.noneFields] as [string,string,string,string]; f[2]=e.target.value; patchSched(form,{noneFields:f}); }} />
                    <select className={cn(selCls, "w-24")}
                      value={sched.noneFields[3]}
                      onChange={(e) => { const f = [...sched.noneFields] as [string,string,string,string]; f[3]=e.target.value; patchSched(form,{noneFields:f}); }}>
                      {["Right Eye","Left Eye","Both Eye"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {/* Duration — same as normal schedule */}
                    {!sched.continueMedicine && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">for</span>
                        <input type="number" min="0" className={numCls}
                          value={sched.durationValue}
                          onChange={(e) => patchSched(form, { durationValue: e.target.value })} />
                        <select className={cn(selCls, "w-20")} value={sched.durationUnit}
                          onChange={(e) => patchSched(form, { durationUnit: e.target.value })}>
                          {["Day","Month","Year"].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    )}
                    <label className="flex cursor-pointer select-none items-center gap-1.5">
                      <span className="text-xs font-semibold">Continue</span>
                      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-primary"
                        checked={sched.continueMedicine}
                        onChange={(e) => patchSched(form, { continueMedicine: e.target.checked })} />
                    </label>
                  </>
                ) : (
                  <>
                    {/* Dose inputs */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: count }, (_, i) => (
                        <div key={i} className="flex items-center gap-0.5">
                          <input type="number" min="0" className={numCls}
                            value={sched.scheduleDoses[i] ?? ""}
                            onChange={(e) => setSchedDose(form, i, e.target.value)} />
                          {i < count - 1 && <span className="select-none text-xs text-muted-foreground">+</span>}
                        </div>
                      ))}
                    </div>

                    {/* Duration */}
                    {!sched.continueMedicine && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">for</span>
                        <input type="number" min="0" className={numCls}
                          value={sched.durationValue}
                          onChange={(e) => patchSched(form, { durationValue: e.target.value })} />
                        <select className={cn(selCls, "w-20")} value={sched.durationUnit}
                          onChange={(e) => patchSched(form, { durationUnit: e.target.value })}>
                          {["Day","Month","Year"].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Continue */}
                    <label className="flex cursor-pointer select-none items-center gap-1.5">
                      <span className="text-xs font-semibold">Continue</span>
                      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-primary"
                        checked={sched.continueMedicine}
                        onChange={(e) => patchSched(form, { continueMedicine: e.target.checked })} />
                    </label>
                  </>
                )}
              </div>

              {/* Per-row Save */}
              <button
                type="button"
                className="ml-2 shrink-0 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={() => saveSchedules(schedules)}
              >
                Save
              </button>
            </div>
          );
        })}
        </div>{/* end min-w-max */}
      </div>

      {/* Save & Exit */}
      <div className="mt-4 flex justify-end">
        <button type="button"
          onClick={() => { saveDosageFormPositions(positions); saveSchedules(schedules); onClose(); }}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          Save &amp; Exit
        </button>
      </div>
    </div>
  );
}

// ─── Chamber Settings Dialog ─────────────────────────────────────────────────

function AppShellChamberSettingsDialog({
  chambers,
  initialChamberId,
  onClose,
  onUpdate,
}: {
  chambers: Chamber[];
  userEmail: string;
  initialChamberId?: string;
  onClose: () => void;
  onUpdate: (chambers: Chamber[]) => void;
}) {
  const [localChambers, setLocalChambers] = useState<Chamber[]>(chambers);
  const [selectedChamberId, setSelectedChamberId] = useState<string>(initialChamberId ?? "");
  const [pad, setPad] = useState<PadSettings>(() =>
    initialChamberId ? loadChamberPad(initialChamberId) : loadPadSettings()
  );
  const [savedToast, setSavedToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updatePad(patch: Partial<PadSettings>) {
    setPad((prev) => ({ ...prev, ...patch }));
  }

  function handleChamberChange(id: string) {
    setSelectedChamberId(id);
    if (id) setPad(loadChamberPad(id));
  }

  function handleSave() {
    if (selectedChamberId) saveChamberPad(selectedChamberId, pad);
    else savePadSettings(pad);
    setSavedToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSavedToast(false), 3000);
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
    <>
      <PadSettingsPanel
        pad={pad}
        updatePad={updatePad}
        chambers={localChambers}
        selectedChamberId={selectedChamberId}
        onChamberChange={handleChamberChange}
        onChamberAdd={addChamber}
        onChamberRemove={removeChamber}
        onSave={handleSave}
        onCancel={onClose}
      />

      {/* ── Saved toast ── */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-[300] flex items-center gap-2 rounded-xl border bg-card px-5 py-3 shadow-2xl transition-all duration-300",
          savedToast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        )}
      >
        <span className="text-base">✓</span>
        <span className="text-sm font-semibold">Settings saved</span>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"checking" | "ready">("checking");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [chambers, setChambers] = useState<Chamber[]>(DEFAULT_CHAMBERS);
  const [selectedChamber, setSelectedChamber] = useState<Chamber>(DEFAULT_CHAMBERS[0]);
  const [chamberOpen, setChamberOpen] = useState(false);
  const [chamberSettingsOpen, setChamberSettingsOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifyCallback = useRef<() => void>(() => {});
  const [settingsOpen,        setSettingsOpen]        = useState(false);
  const [apptSettingsOpen,    setApptSettingsOpen]    = useState(false);
  const [drugFormOrderOpen,   setDrugFormOrderOpen]   = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const avatarRef    = useRef<HTMLDivElement>(null);
  const settingsRef  = useRef<HTMLDivElement>(null);
  const chamberRef   = useRef<HTMLDivElement>(null);
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
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
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

  function openVerify(onSuccess: () => void) {
    verifyCallback.current = onSuccess;
    setVerifyPassword("");
    setVerifyError("");
    setVerifyOpen(true);
  }

  async function doVerify() {
    if (!verifyPassword.trim()) { setVerifyError("Please enter your password"); return; }
    setVerifying(true);
    setVerifyError("");
    try {
      await loginWithPassword(user?.email ?? "", verifyPassword);
      setVerifyOpen(false);
      verifyCallback.current();
    } catch {
      setVerifyError("Incorrect password. Please try again.");
    } finally {
      setVerifying(false);
    }
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

      {/* ── Access verification modal ── */}
      {verifyOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setVerifyOpen(false); }}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Verify Access</p>
                <p className="text-xs text-muted-foreground">Enter your password to verify</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                autoFocus
                placeholder="Current password"
                value={verifyPassword}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => { setVerifyPassword(e.target.value); setVerifyError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") void doVerify(); if (e.key === "Escape") setVerifyOpen(false); }}
              />
              {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
              <div className="flex gap-2">
                <button type="button"
                  className="flex-1 rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-muted"
                  onClick={() => setVerifyOpen(false)}>
                  Cancel
                </button>
                <button type="button"
                  disabled={verifying}
                  className="flex-1 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
                  onClick={() => void doVerify()}>
                  {verifying ? "Verifying…" : "Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          // Desktop: always visible
          "lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className="flex h-16 w-full shrink-0 items-center justify-center border-b"
        >
          <svg viewBox="0 0 40 40" className="h-7 w-7 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" className="fill-primary/10" />
            <path d="M10 27 C13 17 23 12 33 17 C25 20 17 24 21 31 C17 25 12 23 10 27Z" className="fill-primary" />
            <path d="M21 31 C19 25 25 21 33 17 C30 24 26 28 21 31Z" fill="currentColor" className="text-primary/60" />
          </svg>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-3 px-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const innerContent = (
              <>
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
              </>
            );
            const sharedClass = cn(
              "flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            );
            return (
              <Link
                key={item.href}
                href={item.href as never}
                title={item.label}
                className={sharedClass}
                onClick={() => setMobileOpen(false)}
              >
                {innerContent}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[95px]">
        <header className="no-print sticky top-0 z-50 flex h-16 items-center border-b bg-card px-3 shadow-sm lg:px-5">
          {/* Left: mobile menu + system name */}
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="Open menu"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
            >
              <Menu className="h-5 w-5" />
            </Button>
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
                </div>
              )}
            </div>

            {/* Settings dropdown */}
            <div ref={settingsRef} className="relative">
              <Button
                aria-label="Settings"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setSettingsOpen((o) => !o)}
              >
                <Settings className="h-4 w-4" />
              </Button>

              {settingsOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border bg-card p-1 shadow-lg">
                  {/* Dark mode toggle */}
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      {isDark ? <Moon className="h-3.5 w-3.5 text-muted-foreground" /> : <Sun className="h-3.5 w-3.5 text-muted-foreground" />}
                      Dark Mode
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDark}
                      onClick={() => setTheme(isDark ? "light" : "dark")}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                        isDark ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200",
                          isDark ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  <div className="my-1 border-t" />

                  {/* Manage Chamber */}
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                    onClick={() => {
                      setSettingsOpen(false);
                      setTimeout(() => openVerify(() => setChamberSettingsOpen(true)), 0);
                    }}
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    Manage Chamber
                  </button>

                  {/* Appointment Settings */}
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                    onClick={() => { setSettingsOpen(false); setApptSettingsOpen(true); }}
                  >
                    <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                    Appointment Settings
                  </button>

                  {/* Drug Formation Order */}
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                    onClick={() => { setSettingsOpen(false); setDrugFormOrderOpen(true); }}
                  >
                    <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                    Drug Formation Order
                  </button>
                </div>
              )}
            </div>

            {/* Avatar + dropdown */}
            <div ref={avatarRef} className="relative ml-0.5">
              {(() => {
                const profilePhoto = user?.doctorId ? loadProfilePhoto(user.doctorId) : "";
                return (
                  <button
                    aria-label="Account menu"
                    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
                    onClick={() => setAvatarOpen((o) => !o)}
                  >
                    {profilePhoto
                      ? <img src={profilePhoto} alt="avatar" className="h-full w-full object-cover" />
                      : (user?.fullName?.[0]?.toUpperCase() ?? "U")}
                  </button>
                );
              })()}

              {avatarOpen && (
                <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border bg-card p-1 shadow-lg">
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-bold leading-none text-foreground">{user?.fullName ?? "Signed in"}</p>
                    {user?.email && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                  <div className="my-1 border-t" />
                  <Link
                    href="/profile"
                    onClick={() => setAvatarOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    My Profile
                  </Link>
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
        <main className={cn("mx-auto w-full max-w-[1440px] pt-3 pb-6", chamberSettingsOpen ? "px-2 lg:px-2" : "px-4 lg:px-5")}>
          {chamberSettingsOpen ? (
            <AppShellChamberSettingsDialog
              chambers={chambers}
              userEmail={user?.email ?? ""}
              initialChamberId={selectedChamber.id}
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
          ) : drugFormOrderOpen ? (
            <DrugFormationOrderPanel onClose={() => setDrugFormOrderOpen(false)} />
          ) : children}
        </main>
      </div>

      {/* Appointment Settings Modal */}
      {apptSettingsOpen && (
        <AppointmentSettingsModal onClose={() => setApptSettingsOpen(false)} />
      )}
    </div>
  );
}
