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
