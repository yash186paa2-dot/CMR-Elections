import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes election status values by removing extra quotes, 
 * trimming whitespace, and converting to lowercase.
 * Handles strings, objects with a status property, and null/undefined.
 */
export function normalizeStatus(value: any): string {
  if (!value) return 'closed';

  let strValue = '';
  
  // Handle object format like { status: 'open' } or { value: 'open' }
  if (typeof value === 'object' && value !== null) {
    strValue = value.status || value.value || value.election_status || JSON.stringify(value);
  } else {
    strValue = String(value);
  }

  return strValue
    .replace(/^"+|"+$/g, '')
    .trim()
    .toLowerCase();
}
