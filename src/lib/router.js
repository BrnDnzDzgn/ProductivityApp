import { useSyncExternalStore } from "react";

/**
 * Hash routing, on purpose.
 *
 * Orbit is a static site on GitHub Pages, which serves 404 for any path it has
 * no file for — so a history-API route would break the moment someone
 * refreshed or bookmarked a tool. The hash keeps deep links working with no
 * server involved, and no router dependency for a handful of routes.
 *
 * A route is at most two segments: the tool, and one thing inside it
 * (`#/notes/abc123`). Anything deeper would be a sign this needs a real router.
 */
const DEFAULT_ROUTE = "timer";

const listeners = new Set();

const readPath = () => window.location.hash.replace(/^#\/?/, "").split("?")[0];

function parse(path) {
  const [route, param] = path.split("/").filter(Boolean);
  return { route: route || DEFAULT_ROUTE, param: param ?? null };
}

// Held as one object that is only replaced when the hash actually changes, so
// the snapshots handed to useSyncExternalStore stay referentially stable.
let current = parse(readPath());

window.addEventListener("hashchange", () => {
  const next = parse(readPath());
  if (next.route === current.route && next.param === current.param) return;
  current = next;
  for (const listener of listeners) listener();
});

export function navigate(route, param) {
  const path = param ? `${route}/${param}` : route;
  if (readPath() === path) return;
  window.location.hash = `#/${path}`;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRoute() {
  return useSyncExternalStore(
    subscribe,
    () => current.route,
    () => current.route,
  );
}

/** The second segment, when a tool addresses something inside itself. */
export function useRouteParam() {
  return useSyncExternalStore(
    subscribe,
    () => current.param,
    () => current.param,
  );
}
