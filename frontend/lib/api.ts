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
 * Read an image file, downscale it to fit within `maxDim` pixels, and return a
 * compressed data URL. This keeps payloads small so they never trip nginx's
 * `client_max_body_size` (1 MB by default) — the cause of the intermittent
 * "can't upload PNG/JPG" failures, where a large image returned a 413 that the
 * UI mis-reported as an auth/endpoint error.
 *
 * Images with transparency (PNG) are re-encoded as PNG to preserve the alpha
 * channel; everything else is re-encoded as JPEG for much smaller files.
 */
export function imageToDataUrl(
  file: File,
  maxDim = 1024,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process the image.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = file.type === 'image/png';
        resolve(
          isPng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', quality),
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Full list of IANA timezone names for the host's event-timezone picker.
 * Uses the browser's built-in list when available (all modern browsers since
 * 2022); falls back to a short common list otherwise.
 */
export function getTimezones(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    if (typeof intl.supportedValuesOf === 'function') {
      return intl.supportedValuesOf('timeZone');
    }
  } catch { /* fall through */ }
  return [
    'UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin',
    'Europe/Madrid', 'Europe/Rome', 'Europe/Helsinki', 'Europe/Athens',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai',
    'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
  ];
}

/** The host browser's own timezone — a sensible default for a new event. */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
  } catch {
    return 'Europe/London';
  }
}

/**
 * Return the URL only if it is a safe http(s) link, otherwise undefined.
 * Defends against stored javascript:/data: values ending up in an href.
 */
export function safeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
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
