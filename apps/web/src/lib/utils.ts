import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Capitalise the first letter of every space-separated word. */
export function toTitleCase(value: string): string {
  return value.replace(/(^|\s)(\S)/g, (_, sep, char) => sep + char.toUpperCase());
}
