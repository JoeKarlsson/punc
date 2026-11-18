// Sends a Plausible custom event. analytics.js sets window.plausible up; for
// bots and headless browsers it never does, so nothing is sent.
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

export const track = (event: string, props?: Record<string, string>): void => window.plausible?.(event, props && { props });
