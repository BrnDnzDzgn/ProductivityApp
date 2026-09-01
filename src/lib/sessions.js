import { createStore, useStore } from "./store.js";

/**
 * An append-only record of completed focus blocks.
 *
 * The dailies tool keeps a running count per daily, but a count can't answer
 * when you worked, how long for, or whether you worked at all yesterday — none
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
  // `goalId` is what this field was called before the Goals tool became
  // Dailies. Entries written under the old name are read under the new one, so
  // the log keeps naming what a session counted toward across the rename.
  const dailyId = raw.dailyId ?? raw.goalId;
  return {
    at,
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
    dailyId: typeof dailyId === "string" && dailyId ? dailyId : null,
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

export function recordSession({ at, minutes, dailyId }) {
  const entry = sanitizeEntry({ at, minutes, dailyId });
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

// Days are stepped with setDate rather than by subtracting 86,400,000 so the
// buckets stay aligned to local midnight across a daylight-saving change.
const shiftDays = (ts, delta) => {
  const date = new Date(ts);
  date.setDate(date.getDate() + delta);
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

/** Sessions per local day for the last `days` days, oldest first, today last. */
export function dailyCounts(state, days, now = Date.now()) {
  const today = startOfDay(now);
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i -= 1) buckets.set(shiftDays(today, -i), 0);

  for (const entry of state.items) {
    const key = startOfDay(entry.at);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }

  return [...buckets].map(([date, count]) => ({ date, count }));
}

/**
 * Consecutive days ending today that have at least one focus block.
 *
 * A day you haven't worked yet doesn't break the streak — only a day that
 * finished without one does. Counting today as a miss before it's over would
 * report a lapse every morning.
 */
export function currentStreak(state, now = Date.now()) {
  if (state.items.length === 0) return 0;

  const worked = new Set(state.items.map((entry) => startOfDay(entry.at)));
  let cursor = startOfDay(now);
  if (!worked.has(cursor)) cursor = shiftDays(cursor, -1);

  let streak = 0;
  while (worked.has(cursor)) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

/** Totals over the last `days` days, today included. */
export function summarize(state, days, now = Date.now()) {
  const from = shiftDays(startOfDay(now), -(days - 1));
  let sessions = 0;
  let minutes = 0;
  for (const entry of state.items) {
    if (entry.at < from) continue;
    sessions += 1;
    minutes += entry.minutes;
  }
  return { sessions, minutes };
}

export const useSessions = () => useStore(sessionsStore);
