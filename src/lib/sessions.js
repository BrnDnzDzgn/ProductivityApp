import { createStore, useStore } from "./store.js";

/**
 * An append-only record of completed focus blocks.
 *
 * The goals tool keeps a running count per goal, but a count can't answer when
 * you worked, how long for, or whether you worked at all yesterday — and none
 * of that can be reconstructed after the fact. Every focus block that finishes
 * without being written down is history that is simply gone, so the log starts
 * now, before anything reads from it.
 */
const SESSIONS_KEY = "sessions";

// Roughly five years of four-a-day. Beyond this the oldest entries are dropped
// rather than letting a synchronous storage write grow without bound.
const MAX_ENTRIES = 5000;

function sanitizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;

  const at = Number(raw.at);
  if (!Number.isFinite(at) || at <= 0) return null;

  const minutes = Math.round(Number(raw.minutes));
  return {
    at,
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
    goalId: typeof raw.goalId === "string" && raw.goalId ? raw.goalId : null,
  };
}

function hydrate(stored) {
  if (!stored || typeof stored !== "object") return { items: [] };
  const items = Array.isArray(stored.items)
    ? stored.items.map(sanitizeEntry).filter(Boolean)
    : [];
  items.sort((a, b) => a.at - b.at);
  return { items: items.slice(-MAX_ENTRIES) };
}

export const sessionsStore = createStore({
  key: SESSIONS_KEY,
  initial: { items: [] },
  hydrate,
});

sessionsStore.checkpoint();

export function recordSession({ at, minutes, goalId }) {
  const entry = sanitizeEntry({ at, minutes, goalId });
  if (!entry) return;

  sessionsStore.set((state) => {
    const items = [...state.items, entry];
    items.sort((a, b) => a.at - b.at);
    return { items: items.length > MAX_ENTRIES ? items.slice(-MAX_ENTRIES) : items };
  });
}

const startOfDay = (ts) => {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** Focus blocks finished since local midnight. */
export function countToday(state, now = Date.now()) {
  const from = startOfDay(now);
  let count = 0;
  for (const entry of state.items) if (entry.at >= from) count += 1;
  return count;
}

/** Minutes of focus since local midnight. */
export function minutesToday(state, now = Date.now()) {
  const from = startOfDay(now);
  let total = 0;
  for (const entry of state.items) if (entry.at >= from) total += entry.minutes;
  return total;
}

export const useSessions = () => useStore(sessionsStore);
