"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils";

const TEXT_TYPES = new Set([undefined, "text", "search"]);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onChange, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (TEXT_TYPES.has(type)) {
        const { selectionStart, selectionEnd } = e.target;
        const transformed = toTitleCase(e.target.value);
        if (transformed !== e.target.value) {
          e.target.value = transformed;
          // Restore cursor after React flushes the controlled re-render
          const el = e.target;
          requestAnimationFrame(() => {
            try { el.setSelectionRange(selectionStart, selectionEnd); } catch {}
          });
        }
      }
      onChange?.(e);
    }

    return (
      <input
        ref={ref}
        type={type}
        onChange={handleChange}
        className={cn(
          "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
