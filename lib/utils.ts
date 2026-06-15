import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes election status values by removing extra quotes, 
 * trimming whitespace, and converting to lowercase.
 */
export function normalizeStatus(value: any): string {
  if (value === null || value === undefined) return 'closed';

  let strValue = '';
  if (typeof value === 'string') {
    strValue = value;
  } else {
    strValue = String(value);
  }

  return strValue.replace(/^"+|"+$/g, '').trim().toLowerCase();
}
