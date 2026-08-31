import { useSyncExternalStore } from "react";
import { load, save } from "./storage.js";

/**
 * A minimal persisted store, shared by every tool.
 *
 * Tools need state that outlives their view: the timer has to keep counting
 * while you are reading your goals, and a goal has to accept a completed
 * session from a tool that isn't on screen. Anything owned by `useState`
 * inside a tool dies the moment you navigate away, so tool state lives here
 * and views subscribe to it.
 *
 * Deliberately not a state library: there are two tools and no async, and the
 * whole contract is get / set / subscribe.
 */
export function createStore({ key, initial, hydrate }) {
  const stored = key ? load(key, null) : null;
  let state = hydrate ? hydrate(stored, initial) : (stored ?? initial);

  const listeners = new Set();

  return {
    get: () => state,

    /**
     * `persist: false` keeps a change in memory only — the timer changes its
     * remaining milliseconds four times a second, and none of those are worth
     * a synchronous write.
     */
    set(updater, { persist = true } = {}) {
      const next = typeof updater === "function" ? updater(state) : updater;
      if (Object.is(next, state)) return state;
      state = next;
      if (key && persist) save(key, state);
      for (const listener of listeners) listener();
      return state;
    },

    /** Writes the current state even if nothing changed. */
    checkpoint() {
      if (key) save(key, state);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
