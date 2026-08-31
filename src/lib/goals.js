import { createStore, useStore } from "./store.js";

const GOALS_KEY = "goals";

export const TITLE_MAX = 80;
export const TARGET_RANGE = [1, 999];

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function sanitizeGoal(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, TITLE_MAX) : "";
  if (!title) return null;

  const target = Math.min(
    TARGET_RANGE[1],
    Math.max(TARGET_RANGE[0], Math.round(Number(raw.target)) || 1),
  );
  const sessions = Math.max(0, Math.round(Number(raw.sessions)) || 0);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
    title,
    target,
    sessions,
    done: raw.done === true || sessions >= target,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  };
}

function hydrate(stored) {
  const empty = { items: [], activeId: null };
  if (!stored || typeof stored !== "object") return empty;

  const items = Array.isArray(stored.items) ? stored.items.map(sanitizeGoal).filter(Boolean) : [];
  const activeId = items.some((g) => g.id === stored.activeId && !g.done) ? stored.activeId : null;
  return { items, activeId };
}

export const goalsStore = createStore({
  key: GOALS_KEY,
  initial: { items: [], activeId: null },
  hydrate,
});

// Same reason as the timer's: hydration drops malformed goals and clears an
// active id that no longer points at anything, and that correction should
// survive the reload rather than being redone every time.
goalsStore.checkpoint();

export function addGoal(title, target) {
  const goal = sanitizeGoal({ title, target, sessions: 0, done: false, createdAt: Date.now() });
  if (!goal) return null;

  goalsStore.set((state) => ({
    items: [...state.items, goal],
    // The first goal you write down is the one you meant to work on.
    activeId: state.activeId ?? goal.id,
  }));
  return goal.id;
}

export function removeGoal(id) {
  goalsStore.set((state) => ({
    items: state.items.filter((g) => g.id !== id),
    activeId: state.activeId === id ? null : state.activeId,
  }));
}

export function setActiveGoal(id) {
  goalsStore.set((state) => {
    const goal = state.items.find((g) => g.id === id);
    if (!goal || goal.done) return state;
    return { ...state, activeId: state.activeId === id ? null : id };
  });
}

export function toggleGoalDone(id) {
  goalsStore.set((state) => {
    const items = state.items.map((g) => (g.id === id ? { ...g, done: !g.done } : g));
    const toggled = items.find((g) => g.id === id);
    return {
      items,
      activeId: toggled?.done && state.activeId === id ? null : state.activeId,
    };
  });
}

/**
 * Called when a focus phase completes. Credits the goal the user said they were
 * working toward, and retires it once it reaches its target — reaching the
 * number you set is the whole point, so it shouldn't need a second confirmation.
 */
export function creditFocusSession() {
  goalsStore.set((state) => {
    if (!state.activeId) return state;
    const target = state.items.find((g) => g.id === state.activeId);
    if (!target || target.done) return state;

    const sessions = target.sessions + 1;
    const done = sessions >= target.target;
    return {
      items: state.items.map((g) => (g.id === target.id ? { ...g, sessions, done } : g)),
      activeId: done ? null : state.activeId,
    };
  });
}

/** Active first, then everything unfinished, then what's already done. */
export function sortGoals(items, activeId) {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.done && !b.done) {
      const rank = (g) => (g.id === activeId ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
    }
    return a.createdAt - b.createdAt;
  });
}

export const useGoals = () => useStore(goalsStore);
export const selectActiveGoal = (state) =>
  state.items.find((g) => g.id === state.activeId && !g.done) ?? null;
