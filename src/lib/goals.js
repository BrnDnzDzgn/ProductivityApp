import { createStore, useStore } from "./store.js";
import { recursOn } from "./dailies.js";

/**
 * Goals — the longer-horizon intention, checked off by hand.
 *
 * A daily asks "did I do the work today" and answers itself from the session
 * log. A goal asks "am I calling this done", and only a person can answer that.
 * Goals are measured in judgment, not sessions, so `done` here is a stored
 * boolean — the one thing in the product that genuinely is one.
 *
 * Nesting runs monthly → weekly → dailies. A weekly goal holds dailies (through
 * their `parentGoalId`), a monthly goal holds weekly goals. Children are only
 * ever *summarised* by their parent: finishing every child does not check the
 * parent, and unfinished children do not stop you checking it. That asymmetry
 * is the point of the tool — it makes the judgment informed, it does not make
 * it for you.
 *
 * Storage note: the key is `orbit:goals.list`, **not** `orbit:goals`. That bare
 * key belonged to the tool that became Dailies, and dailies.js still reads and
 * deletes it when migrating a browser that predates the rename. A second store
 * writing there could destroy data that had not been migrated yet, so the name
 * is permanently retired rather than reused.
 */
const GOALS_KEY = "goals.list";

export const TITLE_MAX = 80;

export const HORIZONS = [
  { id: "weekly", label: "Weekly", section: "This week" },
  { id: "monthly", label: "Monthly", section: "This month" },
];

const HORIZON_IDS = new Set(HORIZONS.map((horizon) => horizon.id));

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function sanitizeGoal(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, TITLE_MAX) : "";
  if (!title) return null;

  const horizon = HORIZON_IDS.has(raw.horizon) ? raw.horizon : "weekly";

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
    title,
    horizon,
    done: raw.done === true,
    // Only a weekly goal nests, and only under a monthly one. A monthly goal is
    // the top of the tree, which is what makes a cycle structurally impossible.
    parentGoalId:
      horizon === "weekly" && typeof raw.parentGoalId === "string" && raw.parentGoalId
        ? raw.parentGoalId
        : null,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  };
}

function hydrate(stored) {
  if (!stored || typeof stored !== "object") return { items: [] };
  const items = Array.isArray(stored.items) ? stored.items.map(sanitizeGoal).filter(Boolean) : [];
  return { items };
}

export const goalsStore = createStore({
  key: GOALS_KEY,
  initial: { items: [] },
  hydrate,
});

goalsStore.checkpoint();

export function addGoal(title, horizon) {
  const goal = sanitizeGoal({ title, horizon, done: false, createdAt: Date.now() });
  if (!goal) return null;
  goalsStore.set((state) => ({ items: [...state.items, goal] }));
  return goal.id;
}

/**
 * Checks or unchecks a goal. Nothing else moves: children are not touched, and
 * no parent is recalculated. Deciding a goal is done is a hand action and only
 * ever a hand action.
 */
export function toggleGoalDone(id) {
  goalsStore.set((state) => ({
    items: state.items.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal)),
  }));
}

export function updateGoal(id, { title }) {
  goalsStore.set((state) => ({
    items: state.items.map((goal) => {
      if (goal.id !== id) return goal;
      const next = typeof title === "string" ? title.trim().slice(0, TITLE_MAX) : goal.title;
      return next ? { ...goal, title: next } : goal;
    }),
  }));
}

/**
 * Nests a weekly goal under a monthly one, or detaches it with `null`.
 * Refused unless the shapes are right, so the tree cannot go sideways.
 */
export function setGoalParent(id, parentId) {
  goalsStore.set((state) => {
    const goal = state.items.find((g) => g.id === id);
    if (!goal || goal.horizon !== "weekly") return state;
    if (parentId !== null) {
      const parent = state.items.find((g) => g.id === parentId);
      if (!parent || parent.horizon !== "monthly") return state;
    }
    return {
      items: state.items.map((g) => (g.id === id ? { ...g, parentGoalId: parentId } : g)),
    };
  });
}

/**
 * Removes a goal. Children are deliberately left pointing at it: deleting is
 * undoable for nine seconds, and a child detached on delete would not come back
 * attached. A pointer at a goal that no longer exists reads as no parent, the
 * same way an orphaned completion mark reads as nothing.
 */
export function removeGoal(id) {
  goalsStore.set((state) => ({ items: state.items.filter((goal) => goal.id !== id) }));
}

/** Puts a deleted goal back where it was, reattaching whatever still points at it. */
export function restoreGoal(goal, index) {
  goalsStore.set((state) => {
    if (state.items.some((g) => g.id === goal.id)) return state;
    const items = [...state.items];
    items.splice(Math.min(Math.max(index, 0), items.length), 0, goal);
    return { items };
  });
}

/** Unfinished first, then what's already checked; oldest first within each. */
export function sortGoals(items) {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.createdAt - b.createdAt;
  });
}

export const goalsByHorizon = (state, horizon) =>
  sortGoals(state.items.filter((goal) => goal.horizon === horizon));

/** The weekly goals nested under a monthly one. */
export const childGoals = (state, monthlyId) =>
  sortGoals(state.items.filter((goal) => goal.parentGoalId === monthlyId));

/** The dailies assigned to a weekly goal. Order follows the Dailies list. */
export const childDailies = (dailiesState, weeklyId) =>
  dailiesState.items.filter((daily) => daily.parentGoalId === weeklyId);

/**
 * How a goal's children are going, as one quiet line — never a bar.
 *
 * A monthly goal counts the weekly goals under it, which carry a plain `done`.
 * A weekly goal counts the dailies under it, which do not: a daily is done for
 * a day, so the only honest count is today's, and only among the ones today
 * actually asks for. A daily that doesn't recur today is owed nothing and is
 * left out of the denominator rather than counted as a miss.
 */
export function summarizeChildren(goal, { goals, dailies, status, today }) {
  if (goal.horizon === "monthly") {
    const children = childGoals(goals, goal.id);
    if (children.length === 0) return null;
    return `${children.filter((child) => child.done).length} of ${children.length} done`;
  }

  const children = childDailies(dailies, goal.id);
  if (children.length === 0) return null;

  const scheduled = children.filter((daily) => recursOn(daily, today));
  if (scheduled.length === 0) return "Nothing scheduled today";

  const done = scheduled.filter((daily) => status.get(daily.id)?.complete).length;
  return `${done} of ${scheduled.length} done today`;
}

export const useGoals = () => useStore(goalsStore);
