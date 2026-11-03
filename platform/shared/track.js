// Thin wrapper around gtag events. Safe to call anywhere: it no-ops on the
// server, when analytics is blocked, or before gtag has loaded.
export function track(event, params = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
  } catch {
    /* analytics must never break the page */
  }
}
