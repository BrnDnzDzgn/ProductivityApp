import { useSyncExternalStore } from "react";

/**
 * Hash routing, on purpose.
 *
 * Orbit is a static site on GitHub Pages, which serves 404 for any path it has
 * no file for — so a history-API route would break the moment someone
 * refreshed or bookmarked a tool. The hash keeps deep links working with no
 * server involved, and no router dependency for two routes.
 */
const DEFAULT_ROUTE = "timer";

const listeners = new Set();
const readHash = () => window.location.hash.replace(/^#\/?/, "").split("?")[0] || DEFAULT_ROUTE;

let current = readHash();

window.addEventListener("hashchange", () => {
  const next = readHash();
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
});

export function navigate(route) {
  if (readHash() === route) return;
  window.location.hash = `#/${route}`;
}

export function useRoute() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}
