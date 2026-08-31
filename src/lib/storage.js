/**
 * Orbit's persistence layer.
 *
 * The product is a static site with no backend, so everything a user
 * accumulates lives in this browser and nowhere else. Every access is guarded:
 * private windows, cleared site data, and browsers set to block storage all
 * throw rather than returning empty, and a timer that crashes on a privacy
 * setting is worse than one that forgets.
 *
 * Keys are namespaced per tool (`orbit:timer.settings`) so tools added later
 * share this module instead of inventing their own.
 */

const PREFIX = "orbit:";

/** Reads a JSON value. Returns `fallback` when absent, unreadable, or corrupt. */
export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Writes a JSON value. Returns false when this browser refused to store it. */
export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Removes a stored value. Silent when storage is unavailable. */
export function remove(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* nothing to clean up if we could never write it */
  }
}

/**
 * Whether this browser will accept writes at all. Probed once rather than
 * inferred from a failed save, so the UI can be honest about losing data before
 * the user has anything to lose.
 */
export function isAvailable() {
  try {
    const probe = PREFIX + "__probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
