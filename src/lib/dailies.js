import { createStore, useStore } from "./store.js";
import { load, remove } from "./storage.js";

/**
 * Dailies — recurring intentions measured in focus sessions.
 *
 * A daily's `target` is a number of sessions **per scheduled day**, not a
 * lifetime total: "two sessions of piano, every Mon/Wed/Fri" asks for two that
 * day, and the next scheduled day starts fresh. Completion is therefore never
 * stored — it is derived from the session log, which already knows when every
 * focus block finished and which daily it counted toward. See progress.js.
 *
 * This supersedes the lifetime model inherited from the Goals tool, where
 * `target` was a total to bank toward and `done` was permanent. That shape is
 * migrated, not reinterpreted: see `migrateFromLifetime` below.
 */
const DAILIES_KEY = "dailies";
const LEGACY_KEY = "goals";

/** Storage schema. 1 = the lifetime model, 2 = per-day targets. */
const VERSION = 2;

export const TITLE_MAX = 80;

// Per day, not per lifetime. A focus block is roughly half an hour, so a
// double-digit daily target is already an implausible day.
export const TARGET_RANGE = [1, 24];

/**
 * The eight Daily-palette hues (DESIGN.md §11), fixed rather than free so a
 * month of dots on the calendar reads as a palette and not as confetti.
 * Periwinkle is Aurora itself, and is what a daily gets when nobody chooses.
 */
export const DAILY_COLORS = [
  { name: "Periwinkle", hex: "#7C9CFF" },
  { name: "Seafoam", hex: "#5FD3A0" },
  { name: "Amber", hex: "#E8B366" },
  { name: "Coral", hex: "#E8796B" },
  { name: "Lilac", hex: "#A98BE0" },
  { name: "Sky", hex: "#6BB6D6" },
  { name: "Sage", hex: "#9DC183" },
  { name: "Rose", hex: "#D98BA6" },
];

export const DEFAULT_COLOR = DAILY_COLORS[0].hex;

const COLOR_SET = new Set(DAILY_COLORS.map((color) => color.hex));

/** Sunday-first, matching `Date#getDay` and the S M T W T F S chip row. */
export const WEEKDAYS = [
  { index: 0, chip: "S", short: "Sun", long: "Sunday" },
  { index: 1, chip: "M", short: "Mon", long: "Monday" },
  { index: 2, chip: "T", short: "Tue", long: "Tuesday" },
  { index: 3, chip: "W", short: "Wed", long: "Wednesday" },
  { index: 4, chip: "T", short: "Thu", long: "Thursday" },
  { index: 5, chip: "F", short: "Fri", long: "Friday" },
  { index: 6, chip: "S", short: "Sat", long: "Saturday" },
];

const ALL_DAYS = WEEKDAYS.map((day) => day.index);

/** The one shared every-day recurrence. Frozen because it is handed out by reference. */
export const EVERY_DAY = Object.freeze({ type: "everyDay" });

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const clampTarget = (value, fallback = 1) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(TARGET_RANGE[1], Math.max(TARGET_RANGE[0], n));
};

const sanitizeColor = (raw) => {
  if (typeof raw !== "string") return DEFAULT_COLOR;
  const hex = raw.trim().toUpperCase();
  return COLOR_SET.has(hex) ? hex : DEFAULT_COLOR;
};

/**
 * Two shapes only: every day, or a non-empty set of weekdays. All seven days
 * selected normalises to every-day so the same recurrence never has two
 * spellings, and an empty set falls back to every day rather than leaving a
 * daily that is scheduled for no day at all.
 */
function sanitizeRecurrence(raw) {
  if (!raw || typeof raw !== "object" || raw.type !== "weekdays") return EVERY_DAY;

  const days = [
    ...new Set(
      (Array.isArray(raw.days) ? raw.days : [])
        .map((day) => Math.trunc(Number(day)))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ].sort((a, b) => a - b);

  if (days.length === 0 || days.length === 7) return EVERY_DAY;
  return { type: "weekdays", days };
}

/** Builds a recurrence from a set of weekday indices, normalising as above. */
export const recurrenceFromDays = (days) => sanitizeRecurrence({ type: "weekdays", days });

export const isEveryDay = (recurrence) => recurrence.type !== "weekdays";

/** The days a recurrence covers, always as an explicit list. */
export const recurrenceDays = (recurrence) =>
  isEveryDay(recurrence) ? ALL_DAYS : recurrence.days;

/** "Every day" or "Mon · Wed · Fri" — the quiet line under a daily's title. */
export const formatRecurrence = (recurrence) =>
  isEveryDay(recurrence)
    ? "Every day"
    : recurrence.days.map((day) => WEEKDAYS[day].short).join(" · ");

/** Whether a daily is scheduled on the local day containing `ts`. */
export const recursOn = (daily, ts) => {
  const recurrence = daily.recurrence;
  return isEveryDay(recurrence) || recurrence.days.includes(new Date(ts).getDay());
};

/**
 * What a record from the lifetime model becomes.
 *
 * The old numbers are not reinterpreted — a target of 20 meant "twenty sessions
 * in total", and reading it as "twenty sessions every day" would leave a daily
 * that can never be finished again. So the per-day target resets to 1, the
 * weakest claim that is still true of a recurring intention, and everything the
 * old record actually asserted is kept whole and inert under `legacy`.
 *
 * That bundle is the payload the Goals tool wants: a lifetime target with
 * sessions banked toward it is a goal, not a daily. Until Goals exists to
 * receive it, it rides along untouched rather than being thrown away — the
 * banked count is the only surviving record of focus done before the session
 * log existed, and nothing can reconstruct it.
 */
function migrateFromLifetime(raw) {
  if (!raw || typeof raw !== "object") return raw;

  const target = Math.round(Number(raw.target));
  const sessions = Math.max(0, Math.round(Number(raw.sessions)) || 0);
  const done = raw.done === true;

  // A daily that banked nothing toward a target of one asserted the same thing
  // either way; there is nothing to report and no decision to prompt.
  const worthReporting = sessions > 0 || (Number.isFinite(target) && target > 1) || done;

  return {
    ...raw,
    target: 1,
    legacy: worthReporting
      ? { target: Number.isFinite(target) ? target : 1, sessions, done }
      : null,
  };
}

function sanitizeLegacy(raw) {
  if (!raw || typeof raw !== "object") return null;
  const target = Math.round(Number(raw.target));
  const sessions = Math.round(Number(raw.sessions));
  return {
    target: Number.isFinite(target) && target > 0 ? target : 1,
    sessions: Number.isFinite(sessions) && sessions > 0 ? sessions : 0,
    done: raw.done === true,
  };
}

function sanitizeDaily(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, TITLE_MAX) : "";
  if (!title) return null;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
    title,
    // Sessions asked for on each day this daily is scheduled.
    target: clampTarget(raw.target),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    recurrence: sanitizeRecurrence(raw.recurrence),
    color: sanitizeColor(raw.color),
    // The weekly goal this daily hangs under, set from the Goals tool. A
    // pointer at a goal that no longer exists reads as no parent rather than
    // being cleared on delete, so the goal's nine-second undo brings the whole
    // grouping back with it.
    parentGoalId:
      typeof raw.parentGoalId === "string" && raw.parentGoalId ? raw.parentGoalId : null,
    // Inert. What this record claimed under the lifetime model, kept so the
    // change is visible and reversible rather than silent.
    legacy: sanitizeLegacy(raw.legacy),
  };
}

function hydrate(stored) {
  // Nothing under the new key means either a first run or a browser that last
  // saw this tool as Goals. `orbit:goals` is unversioned, so it reads as v1 and
  // takes the same lifetime migration as an unmigrated `orbit:dailies`.
  const source = stored ?? load(LEGACY_KEY, null);

  const empty = { items: [], activeId: null };
  if (!source || typeof source !== "object") return empty;

  const version = Number(source.version) || 1;
  const raw = Array.isArray(source.items) ? source.items : [];

  const items = raw
    .map((item) => (version < VERSION ? migrateFromLifetime(item) : item))
    .map(sanitizeDaily)
    .filter(Boolean);

  const activeId = items.some((d) => d.id === source.activeId) ? source.activeId : null;
  return { items, activeId };
}

const migrating = (() => {
  const current = load(DAILIES_KEY, null);
  if (current === null) return load(LEGACY_KEY, null) !== null;
  return (Number(current.version) || 1) < VERSION;
})();

export const dailiesStore = createStore({
  key: DAILIES_KEY,
  initial: { items: [], activeId: null },
  hydrate,
  serialize: (state) => ({ version: VERSION, ...state }),
});

// Same reason as the timer's: hydration migrates the lifetime shape, drops
// malformed dailies, and clears an active id that no longer points at anything.
// That correction should survive the reload rather than being redone every time.
//
// An empty result is only written when there is genuinely nothing stored. Two
// tabs opened at the same instant — a browser restoring a session — can race
// the migration: one tab reads `orbit:dailies` as empty, the other completes
// the migration and deletes `orbit:goals`, and the first then finds nothing
// under either key. Without this guard that tab would checkpoint its empty
// state over the migrated data, losing it with the person having touched
// nothing. Refusing to overwrite a non-empty record with an empty one costs a
// single read and closes the window.
const persisted =
  dailiesStore.get().items.length > 0 || load(DAILIES_KEY, null) === null
    ? dailiesStore.checkpoint()
    : false;

// The old key is only dropped once its contents are safely under the new one.
// A browser that refuses writes keeps its goals where they are, so the next
// visit can try the migration again instead of finding nothing.
if (migrating && persisted) remove(LEGACY_KEY);

export function addDaily(title, target, { recurrence, color } = {}) {
  const daily = sanitizeDaily({
    title,
    target,
    createdAt: Date.now(),
    recurrence,
    color,
  });
  if (!daily) return null;

  dailiesStore.set((state) => ({
    items: [...state.items, daily],
    // The first daily you write down is the one you meant to work on.
    activeId: state.activeId ?? daily.id,
  }));
  return daily.id;
}

export function removeDaily(id) {
  dailiesStore.set((state) => ({
    items: state.items.filter((d) => d.id !== id),
    activeId: state.activeId === id ? null : state.activeId,
  }));
}

/**
 * Points the timer at a daily. Only a daily scheduled today can take sessions,
 * so one that isn't is not selectable — the recurrence is the promise, and a
 * Wednesday session does not belong to a Monday-and-Friday intention.
 *
 * A daily that has already met today's target stays selectable: extra sessions
 * are still that daily's work, and the log should say so.
 */
export function setActiveDaily(id, today) {
  dailiesStore.set((state) => {
    const daily = state.items.find((d) => d.id === id);
    if (!daily || !recursOn(daily, today)) return state;
    return { ...state, activeId: state.activeId === id ? null : id };
  });
}

/**
 * Which daily a focus block finishing at `at` counts toward, if any.
 *
 * Nothing is written here. The session log entry naming this daily *is* the
 * record of the work, and completion is read back out of the log per day — a
 * counter on the daily would be a second copy of the same fact, free to drift.
 *
 * `at` is the real phase boundary rather than the moment the app noticed, so a
 * block that finished before midnight is checked against the day it belonged to.
 */
export function dailyForSession(at = Date.now()) {
  const state = dailiesStore.get();
  const daily = state.items.find((d) => d.id === state.activeId);
  return daily && recursOn(daily, at) ? daily.id : null;
}

/**
 * Files a daily under a weekly goal, or detaches it with `null`.
 *
 * Kept apart from `updateDaily` on purpose: attaching is not the person
 * answering the migration note's question about targets, so it must not clear
 * the note the way setting a target does.
 */
export function setDailyParent(id, parentGoalId) {
  dailiesStore.set((state) => ({
    ...state,
    items: state.items.map((daily) =>
      daily.id === id
        ? { ...daily, parentGoalId: typeof parentGoalId === "string" ? parentGoalId : null }
        : daily,
    ),
  }));
}

export function updateDaily(id, { title, target, recurrence, color, parentGoalId }) {
  dailiesStore.set((state) => {
    const items = state.items.map((daily) => {
      if (daily.id !== id) return daily;

      const nextTitle = typeof title === "string" ? title.trim().slice(0, TITLE_MAX) : daily.title;
      if (!nextTitle) return daily;

      return {
        ...daily,
        title: nextTitle,
        target: clampTarget(target, daily.target),
        recurrence: recurrence ? sanitizeRecurrence(recurrence) : daily.recurrence,
        color: color === undefined ? daily.color : sanitizeColor(color),
        parentGoalId:
          parentGoalId === undefined
            ? daily.parentGoalId
            : typeof parentGoalId === "string" && parentGoalId
              ? parentGoalId
              : null,
        // Setting a target by hand is the person answering the question the
        // migration note was asking, so the note retires itself.
        legacy: null,
      };
    });
    return { ...state, items };
  });
}

/** Puts a deleted daily back where it was. Paired with the undo affordance. */
export function restoreDaily(daily, index, wasActive) {
  dailiesStore.set((state) => {
    if (state.items.some((d) => d.id === daily.id)) return state;
    const items = [...state.items];
    items.splice(Math.min(Math.max(index, 0), items.length), 0, daily);
    return { items, activeId: wasActive ? daily.id : state.activeId };
  });
}

/**
 * Active first, then whatever today still asks for, then what's already done.
 *
 * Completion is a property of a day rather than of the daily, so it arrives as
 * a set of ids from progress.js instead of being read off the record.
 */
export function sortDailies(items, activeId, completed = new Set()) {
  return [...items].sort((a, b) => {
    const doneA = completed.has(a.id);
    const doneB = completed.has(b.id);
    if (doneA !== doneB) return doneA ? 1 : -1;
    if (!doneA && !doneB) {
      const rank = (d) => (d.id === activeId ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
    }
    return a.createdAt - b.createdAt;
  });
}

/**
 * Splits the list into what today asks of you and everything else. Today's
 * dailies lead because they are the only ones the timer can count toward.
 */
export function groupDailies(items, activeId, today, completed = new Set()) {
  const sorted = sortDailies(items, activeId, completed);
  return {
    scheduled: sorted.filter((daily) => recursOn(daily, today)),
    rest: sorted.filter((daily) => !recursOn(daily, today)),
  };
}

export const useDailies = () => useStore(dailiesStore);

/** The daily the timer is counting toward — null unless it is scheduled today. */
export const selectActiveDaily = (state, today) => {
  const daily = state.items.find((d) => d.id === state.activeId);
  return daily && recursOn(daily, today) ? daily : null;
};
