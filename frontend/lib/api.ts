/**
 * Returns the backend API base URL.
 * Computed at runtime from the browser's current hostname so no configuration
 * is needed — works on localhost, any server IP, or any domain without rebuilding.
 */
export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    // SSR fallback (all pages are 'use client', so this path is never actually used)
    return 'http://localhost:8000';
  }
  return `http://${window.location.hostname}:8000`;
}
