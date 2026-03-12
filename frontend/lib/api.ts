/**
 * Returns the backend API base URL, computed at runtime from the browser's
 * current hostname so no build-time configuration is needed.
 */
export function getApiUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8000';
  return `${window.location.origin}/api`;
}

/**
 * Parse a datetime string returned by the API.
 * The backend returns naive datetimes (no timezone suffix). JavaScript treats
 * those as *local* time, which shifts dates in UTC+ zones. Appending 'Z' forces
 * UTC interpretation so the date the user typed is the date that displays.
 */
export function parseDate(s: string): Date {
  if (s && !s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(s + 'Z');
  }
  return new Date(s);
}

/**
 * Copy text to the clipboard.
 * Falls back to the legacy execCommand approach when the Clipboard API is
 * unavailable (HTTP, older browsers).
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
