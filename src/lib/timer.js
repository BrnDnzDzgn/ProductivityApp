import { createStore, useStore } from "./store.js";

const SETTINGS_KEY = "timer.settings";
const SESSION_KEY = "timer.session";

const MINUTE = 60000;
const TICK_MS = 250;

export const DEFAULTS = { focusMin: 25, breakMin: 5, rounds: 4, soundOn: true };
export const RANGE = { focusMin: [1, 120], breakMin: [1, 60], rounds: [1, 12] };

export function clampInt(value, [min, max], fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const phaseMs = (phase, settings) =>
  (phase === "focus" ? settings.focusMin : settings.breakMin) * MINUTE;

function sanitizeSettings(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    focusMin: clampInt(s.focusMin, RANGE.focusMin, DEFAULTS.focusMin),
    breakMin: clampInt(s.breakMin, RANGE.breakMin, DEFAULTS.breakMin),
    rounds: clampInt(s.rounds, RANGE.rounds, DEFAULTS.rounds),
    soundOn: typeof s.soundOn === "boolean" ? s.soundOn : DEFAULTS.soundOn,
  };
}

export const settingsStore = createStore({
  key: SETTINGS_KEY,
  initial: DEFAULTS,
  hydrate: (stored) => sanitizeSettings(stored),
});

function freshSession(settings) {
  return {
    phase: "focus",
    round: 1,
    remaining: phaseMs("focus", settings),
    endsAt: null,
    running: false,
    finished: false,
  };
}

/**
 * Walks a running session forward to `now`, crossing as many phase boundaries
 * as real time demands.
 *
 * The countdown is driven by wall-clock rather than by decrementing a counter,
 * because this app is built to sit in a background tab — and browsers throttle
 * background intervals to as little as once a minute. Anchoring to a timestamp
 * means a throttled tab, a sleeping laptop, and a closed one all land in the
 * same, correct place.
 */
function project(session, settings, now) {
  if (!session.running || session.endsAt == null) {
    return { session, crossed: 0, focusCompleted: 0, done: false };
  }

  let { phase, round } = session;
  let endsAt = session.endsAt;
  let crossed = 0;
  let focusCompleted = 0;
  const limit = 2 * RANGE.rounds[1] + 2; // guard against corrupt stored state

  while (endsAt <= now && crossed < limit) {
    if (phase === "focus") {
      phase = "break";
      endsAt += phaseMs("break", settings);
      focusCompleted += 1;
    } else if (round >= settings.rounds) {
      return {
        session: { phase, round, remaining: 0, endsAt: null, running: false, finished: true },
        crossed: crossed + 1,
        focusCompleted,
        done: true,
      };
    } else {
      round += 1;
      phase = "focus";
      endsAt += phaseMs("focus", settings);
    }
    crossed += 1;
  }

  return {
    session: { ...session, phase, round, endsAt, remaining: Math.max(0, endsAt - now) },
    crossed,
    focusCompleted,
    done: false,
  };
}

function hydrateSession(stored) {
  const settings = settingsStore.get();
  if (!stored || typeof stored !== "object") return freshSession(settings);

  const phase = stored.phase === "break" ? "break" : "focus";
  const round = clampInt(stored.round, [1, settings.rounds], 1);

  if (stored.finished === true) {
    return { phase, round, remaining: 0, endsAt: null, running: false, finished: true };
  }

  // A session that was still running when the tab closed keeps counting in real
  // time, but comes back paused. The user did not press start in this page, and
  // the phase chimes it would have crossed while away never played — resuming
  // silently would break the promise that a phase change is always announced.
  if (stored.running === true && Number.isFinite(stored.endsAt)) {
    const walked = project(
      { phase, round, endsAt: stored.endsAt, remaining: 0, running: true, finished: false },
      settings,
      Date.now(),
    );
    return { ...walked.session, running: false, endsAt: null };
  }

  const cap = phaseMs(phase, settings);
  return {
    phase,
    round,
    remaining: clampInt(stored.remaining, [0, cap], cap),
    endsAt: null,
    running: false,
    finished: false,
  };
}

export const sessionStore = createStore({
  key: SESSION_KEY,
  initial: null,
  hydrate: hydrateSession,
});

// Hydration normalises whatever was in storage: a corrupt blob, out-of-range
// settings, or a session that was still running when the tab closed. Write the
// result straight back, so the next load starts from the corrected state rather
// than re-deriving it from the same stale record — otherwise a session left
// paused would keep being projected forward from its original end time.
settingsStore.checkpoint();
sessionStore.checkpoint();

// --- Completed focus phases -------------------------------------------------
// The seam between the timer and everything that wants to know a focus block
// finished. Goals credits a session here; a dashboard will want the same event.

const focusCompleteListeners = new Set();

export function onFocusComplete(listener) {
  focusCompleteListeners.add(listener);
  return () => focusCompleteListeners.delete(listener);
}

// --- Sound: short tones via Web Audio, no files needed -----------------------

let audioCtx = null;

function ensureAudio() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, duration = 0.18, when = 0) {
  if (!settingsStore.get().soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// Rising = back to work, falling = rest, three ascending = the set is done.
const focusSound = () => {
  beep(660, 0.16, 0);
  beep(880, 0.22, 0.18);
};
const breakSound = () => {
  beep(660, 0.16, 0);
  beep(440, 0.24, 0.18);
};
const finishSound = () => {
  beep(523, 0.15, 0);
  beep(659, 0.15, 0.16);
  beep(784, 0.3, 0.32);
};

// --- The clock ---------------------------------------------------------------

let intervalId = null;

function stopClock() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function tick() {
  const prev = sessionStore.get();
  if (!prev.running || prev.endsAt == null) return;

  const now = Date.now();
  if (prev.endsAt > now) {
    // Only the displayed remainder changed; `endsAt` still reconstructs the
    // whole session, so there is nothing worth writing to storage.
    sessionStore.set({ ...prev, remaining: prev.endsAt - now }, { persist: false });
    return;
  }

  const { session: next, crossed, focusCompleted, done } = project(prev, settingsStore.get(), now);

  if (crossed > 0) {
    // One chime for where we landed, even if a throttled tab meant we crossed
    // several boundaries at once.
    if (done) finishSound();
    else if (next.phase === "focus") focusSound();
    else breakSound();
  }

  for (let i = 0; i < focusCompleted; i += 1) {
    for (const listener of focusCompleteListeners) listener();
  }

  if (!next.running) stopClock();
  sessionStore.set(next);
}

function startClock() {
  stopClock();
  intervalId = setInterval(tick, TICK_MS);
}

// --- Commands ----------------------------------------------------------------

export function startTimer() {
  ensureAudio(); // must happen inside the gesture, per autoplay policy

  const settings = settingsStore.get();
  const current = sessionStore.get();
  const base = current.finished ? freshSession(settings) : current;
  const full = phaseMs(base.phase, settings);
  const remaining = base.remaining > 0 ? base.remaining : full;

  if (base.phase === "focus" && base.round === 1 && remaining === full) focusSound();

  sessionStore.set({
    ...base,
    running: true,
    finished: false,
    remaining,
    endsAt: Date.now() + remaining,
  });
  startClock();
}

export function pauseTimer() {
  const current = sessionStore.get();
  const remaining =
    current.endsAt != null ? Math.max(0, current.endsAt - Date.now()) : current.remaining;
  stopClock();
  sessionStore.set({ ...current, running: false, endsAt: null, remaining });
}

export function resetTimer() {
  stopClock();
  sessionStore.set(freshSession(settingsStore.get()));
}

export function updateSetting(key, value) {
  const next = sanitizeSettings({ ...settingsStore.get(), [key]: value });
  settingsStore.set(next);

  // Keep an idle timer in sync when its durations change underneath it.
  const current = sessionStore.get();
  if (current.running || key === "soundOn") return;
  sessionStore.set({
    ...current,
    round: Math.min(current.round, next.rounds),
    remaining: current.finished ? 0 : phaseMs(current.phase, next),
  });
}

// --- Derived helpers ---------------------------------------------------------

export const totalForPhase = (session, settings) => phaseMs(session.phase, settings);

export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const useTimerSession = () => useStore(sessionStore);
export const useTimerSettings = () => useStore(settingsStore);
