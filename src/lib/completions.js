import { createStore, useStore } from "./store.js";

/**
 * Manual completions — "I did this today", for work done away from the timer.
 *
 * Some intentions are genuinely not Pomodoro-shaped: you meditate, you read
 * before bed. The session log cannot know about those, so this is the one thing
 * about a daily that has to be recorded rather than derived.
 *
 * Deliberately as small as the job allows: a set of daily ids per local day,
 * and nothing else. No counts, no timestamps, no partial credit — a mark is a
 * boolean, and progress.js treats a marked day as meeting its target however
 * many sessions were logged. This is not the old lifetime `done` flag coming
 * back: that one was permanent and retired the record, this one belongs to one
 * day and is gone tomorrow.
 *
 * Marking is only ever possible for today, the same rule the rest of the
 * product follows — a day that has passed is a day you cannot change.
 */
const COMPLETIONS_KEY = "completions";

// Roughly four years of daily marking. Beyond this the oldest days are dropped,
// the same bound the session log keeps for the same reason.
const MAX_DAYS = 1500;

const startOfDay = (ts) => {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * A local date, as `YYYY-MM-DD`.
 *
 * Days are midnight timestamps everywhere else in the product, and the API here
 * takes them too — but a stored key is read by a person eventually, and
 * `"2026-08-31"` says what a thirteen-digit number does not. Built from local
 * parts rather than `toISOString`, which would report the UTC day and shift the
 * whole record by one for anybody east or west of Greenwich at the wrong hour.
 */
export function dayKey(ts) {
  const date = new Date(ts);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function hydrate(stored) {
  const empty = { days: {} };
  if (!stored || typeof stored !== "object" || !stored.days) return empty;

  const days = {};
  for (const [key, ids] of Object.entries(stored.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(ids)) continue;
    const clean = [...new Set(ids.filter((id) => typeof id === "string" && id))];
    if (clean.length > 0) days[key] = clean;
  }

  // ISO dates sort lexicographically the same way they sort chronologically.
  const keys = Object.keys(days).sort();
  if (keys.length <= MAX_DAYS) return { days };

  const kept = {};
  for (const key of keys.slice(-MAX_DAYS)) kept[key] = days[key];
  return { days: kept };
}

export const completionsStore = createStore({
  key: COMPLETIONS_KEY,
  initial: { days: {} },
  hydrate,
});

completionsStore.checkpoint();

/** The dailies marked done by hand on a local day. */
export function marksOn(state, day) {
  const ids = state.days[dayKey(day)];
  return ids ? new Set(ids) : new Set();
}

/** Whether one daily carries a manual mark on a local day. */
export function isMarked(state, dailyId, day) {
  const ids = state.days[dayKey(day)];
  return ids ? ids.includes(dailyId) : false;
}

/**
 * Marks or unmarks a daily for a day, which must be today.
 *
 * The guard reads the clock itself rather than trusting the `day` it was
 * handed, so a stale snapshot in a tab left open overnight cannot be used to
 * mark off yesterday. Unmarking is held to the same rule: removing a claim
 * after the day is over is editing history just as much as adding one.
 */
export function setMark(dailyId, day, marked) {
  if (!dailyId || startOfDay(day) !== startOfDay(Date.now())) return false;

  const key = dayKey(day);
  completionsStore.set((state) => {
    const current = state.days[key] ?? [];
    const has = current.includes(dailyId);
    if (has === marked) return state;

    const next = marked ? [...current, dailyId] : current.filter((id) => id !== dailyId);
    const days = { ...state.days };
    if (next.length === 0) delete days[key];
    else days[key] = next;
    return { days };
  });
  return true;
}

/**
 * Marks belonging to a deleted daily are deliberately left where they are.
 * Deleting is undoable for nine seconds, and a mark thrown away on delete would
 * not come back with it. Orphaned ids resolve to nothing when read and are
 * pruned with their day in time.
 */

export const useCompletions = () => useStore(completionsStore);
