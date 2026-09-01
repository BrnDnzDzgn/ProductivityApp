import { useSyncExternalStore } from "react";

/**
 * The current local day, as a midnight timestamp.
 *
 * Reading `Date.now()` while rendering is impure — the same render can produce
 * a different answer each time — and "today" is exactly the kind of value that
 * has to hold still within a render and then genuinely change when the day
 * does. Orbit is built to be left open, so a tab that was open at midnight
 * should roll its streak and its today-count over rather than waiting for a
 * reload.
 */
const startOfDay = (ts) => {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

let current = startOfDay(Date.now());
const listeners = new Set();
let intervalId = null;

function check() {
  const next = startOfDay(Date.now());
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  // A minute's granularity is plenty for a date boundary, and it costs nothing
  // while nobody is subscribed.
  if (intervalId === null) intervalId = setInterval(check, 60000);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function useToday() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}
