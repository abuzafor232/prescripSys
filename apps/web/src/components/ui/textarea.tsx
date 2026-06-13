"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onChange, ...props }, ref) => {
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const { selectionStart, selectionEnd } = e.target;
    const transformed = toTitleCase(e.target.value);
    if (transformed !== e.target.value) {
      e.target.value = transformed;
      const el = e.target;
      requestAnimationFrame(() => {
        try { el.setSelectionRange(selectionStart, selectionEnd); } catch {}
      });
    }
    onChange?.(e);
  }

  return (
    <textarea
      ref={ref}
      onChange={handleChange}
      className={cn(
        "min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
