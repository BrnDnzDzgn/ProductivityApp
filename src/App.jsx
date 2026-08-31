import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";
import { isAvailable, load, save } from "./lib/storage.js";
import "./App.css";

const SETTINGS_KEY = "timer.settings";
const SESSION_KEY = "timer.session";

const MINUTE = 60000;
const TICK_MS = 250;

const DEFAULTS = { focusMin: 25, breakMin: 5, rounds: 4, soundOn: true };
const RANGE = { focusMin: [1, 120], breakMin: [1, 60], rounds: [1, 12] };

function clampInt(value, [min, max], fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const phaseMs = (phase, settings) =>
  (phase === "focus" ? settings.focusMin : settings.breakMin) * MINUTE;

function readSettings() {
  const raw = load(SETTINGS_KEY, null);
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    focusMin: clampInt(s.focusMin, RANGE.focusMin, DEFAULTS.focusMin),
    breakMin: clampInt(s.breakMin, RANGE.breakMin, DEFAULTS.breakMin),
    rounds: clampInt(s.rounds, RANGE.rounds, DEFAULTS.rounds),
    soundOn: typeof s.soundOn === "boolean" ? s.soundOn : DEFAULTS.soundOn,
  };
}

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
    return { session, crossed: 0, done: false };
  }

  let { phase, round } = session;
  let endsAt = session.endsAt;
  let crossed = 0;
  const limit = 2 * RANGE.rounds[1] + 2; // guard against corrupt stored state

  while (endsAt <= now && crossed < limit) {
    if (phase === "focus") {
      phase = "break";
      endsAt += phaseMs("break", settings);
    } else if (round >= settings.rounds) {
      return {
        session: { phase, round, remaining: 0, endsAt: null, running: false, finished: true },
        crossed: crossed + 1,
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
    done: false,
  };
}

function readSession(settings) {
  const raw = load(SESSION_KEY, null);
  if (!raw || typeof raw !== "object") return freshSession(settings);

  const phase = raw.phase === "break" ? "break" : "focus";
  const round = clampInt(raw.round, [1, settings.rounds], 1);

  if (raw.finished === true) {
    return { phase, round, remaining: 0, endsAt: null, running: false, finished: true };
  }

  // A session that was still running when the tab closed keeps counting in real
  // time, but comes back paused. The user did not press start in this page, and
  // the phase chimes it would have crossed while away never played — resuming
  // silently would break the promise that a phase change is always announced.
  if (raw.running === true && Number.isFinite(raw.endsAt)) {
    const walked = project(
      { phase, round, endsAt: raw.endsAt, remaining: 0, running: true, finished: false },
      settings,
      Date.now(),
    );
    return { ...walked.session, running: false, endsAt: null };
  }

  const cap = phaseMs(phase, settings);
  return {
    phase,
    round,
    remaining: clampInt(raw.remaining, [0, cap], cap),
    endsAt: null,
    running: false,
    finished: false,
  };
}

const format = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const clockTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Dial geometry. The SVG scales entirely through its viewBox, so these are
// drawing units, not pixels — the rendered size is CSS's business.
const DIAL = 440;
const STROKE = 12;
const RADIUS = (DIAL - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function App() {
  const [settings, setSettings] = useState(readSettings);
  const [session, setSession] = useState(() => readSession(readSettings()));
  const { focusMin, breakMin, rounds } = settings;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageWorks] = useState(isAvailable);

  // `session` is mirrored into a ref so the tick and the controls can read the
  // latest value without re-creating the interval four times a second.
  const sessionRef = useRef(session);
  const settingsRef = useRef(settings);
  const soundOnRef = useRef(settings.soundOn);
  const audioCtxRef = useRef(null);

  const commit = useCallback((next) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    soundOnRef.current = settings.soundOn;
  }, [settings]);

  // --- Sound: short tones via Web Audio, no files needed --------------------

  const ensureAudio = useCallback(() => {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const beep = useCallback(
    (freq, duration = 0.18, when = 0) => {
      if (!soundOnRef.current) return;
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
    },
    [ensureAudio],
  );

  // Rising = back to work, falling = rest, three ascending = the set is done.
  const focusSound = useCallback(() => {
    beep(660, 0.16, 0);
    beep(880, 0.22, 0.18);
  }, [beep]);
  const breakSound = useCallback(() => {
    beep(660, 0.16, 0);
    beep(440, 0.24, 0.18);
  }, [beep]);
  const finishSound = useCallback(() => {
    beep(523, 0.15, 0);
    beep(659, 0.15, 0.16);
    beep(784, 0.3, 0.32);
  }, [beep]);

  // --- The clock ------------------------------------------------------------

  useEffect(() => {
    if (!session.running) return undefined;

    const id = setInterval(() => {
      const prev = sessionRef.current;
      if (!prev.running || prev.endsAt == null) return;

      const now = Date.now();
      if (prev.endsAt > now) {
        commit({ ...prev, remaining: prev.endsAt - now });
        return;
      }

      const { session: next, crossed, done } = project(prev, settingsRef.current, now);
      if (crossed > 0) {
        // One chime for where we landed, even if a throttled tab meant we
        // crossed several boundaries at once.
        if (done) finishSound();
        else if (next.phase === "focus") focusSound();
        else breakSound();
      }
      commit(next);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [session.running, commit, focusSound, breakSound, finishSound]);

  // --- Persistence ----------------------------------------------------------

  useEffect(() => {
    save(SETTINGS_KEY, settings);
  }, [settings]);

  // Checkpointed on real state changes only. While the timer runs, `endsAt`
  // alone reconstructs the session, so there is no reason to touch synchronous
  // storage on every tick.
  useEffect(() => {
    const s = sessionRef.current;
    save(SESSION_KEY, {
      phase: s.phase,
      round: s.round,
      remaining: s.remaining,
      endsAt: s.endsAt,
      running: s.running,
      finished: s.finished,
    });
  }, [session.phase, session.round, session.endsAt, session.running, session.finished]);

  // --- Controls -------------------------------------------------------------

  const start = useCallback(() => {
    ensureAudio(); // must happen inside the gesture, per autoplay policy
    const current = sessionRef.current;
    const base = current.finished ? freshSession(settingsRef.current) : current;
    const full = phaseMs(base.phase, settingsRef.current);
    const remaining = base.remaining > 0 ? base.remaining : full;

    if (base.phase === "focus" && base.round === 1 && remaining === full) focusSound();

    commit({
      ...base,
      running: true,
      finished: false,
      remaining,
      endsAt: Date.now() + remaining,
    });
  }, [commit, ensureAudio, focusSound]);

  const pause = useCallback(() => {
    const current = sessionRef.current;
    const remaining =
      current.endsAt != null ? Math.max(0, current.endsAt - Date.now()) : current.remaining;
    commit({ ...current, running: false, endsAt: null, remaining });
  }, [commit]);

  const reset = useCallback(() => {
    commit(freshSession(settingsRef.current));
  }, [commit]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Keep an idle timer in sync when its durations change underneath it. Skipped
  // on the first run so it can't clobber a session restored from storage.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const current = sessionRef.current;
    if (current.running) return;
    const durations = { focusMin, breakMin, rounds };
    commit({
      ...current,
      round: Math.min(current.round, rounds),
      remaining: current.finished ? 0 : phaseMs(current.phase, durations),
    });
  }, [focusMin, breakMin, rounds, commit]);

  // --- Derived view state ---------------------------------------------------

  const total = phaseMs(session.phase, settings);
  const remaining = session.finished ? 0 : Math.min(session.remaining, total);
  const progress = session.finished ? 1 : total > 0 ? 1 - remaining / total : 0;
  const display = format(remaining);
  // An arc shorter than its own round cap is just a dot; don't draw it.
  const arcVisible = progress * CIRCUMFERENCE >= STROKE;

  const phaseLabel = session.phase === "focus" ? "Focus" : "Break";
  // The ring, glow, and round dots carry phase as meaning: Aurora for work,
  // Meridian for rest and completion. The primary action stays Aurora in every
  // phase so the button never moves colour underneath the user.
  const phaseColor =
    session.finished || session.phase === "break" ? "var(--meridian)" : "var(--aurora)";

  let status;
  if (session.finished) {
    status = `All done · ${settings.rounds} ${settings.rounds === 1 ? "round" : "rounds"}`;
  } else if (session.running) {
    status = `${phaseLabel} · ends ${clockTime(session.endsAt)}`;
  } else if (remaining === total) {
    status = `${phaseLabel} · ready`;
  } else {
    status = `${phaseLabel} · paused`;
  }

  let primaryLabel = "Start";
  if (session.running) primaryLabel = "Pause";
  else if (session.finished) primaryLabel = "Start again";
  else if (remaining !== total) primaryLabel = "Resume";

  // The tab is a browser surface too, and this app is built to live in a
  // background one.
  useEffect(() => {
    if (session.running) document.title = `${display} · ${phaseLabel} — Orbit`;
    else if (session.finished) document.title = "All done — Orbit";
    else document.title = "Orbit";
  }, [display, phaseLabel, session.running, session.finished]);

  return (
    <div className="app" style={{ "--phase": phaseColor }}>
      <div className="glow" data-live={String(session.running)} aria-hidden="true" />

      <div className="utilities">
        <button
          type="button"
          className="icon-button"
          onClick={() => updateSetting("soundOn", !settings.soundOn)}
          aria-label={settings.soundOn ? "Mute chimes" : "Unmute chimes"}
        >
          {settings.soundOn ? (
            <Volume2 size={20} aria-hidden="true" />
          ) : (
            <VolumeX size={20} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
        >
          <Settings size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="rounds" role="img" aria-label={`Round ${session.round} of ${settings.rounds}`}>
        {Array.from({ length: settings.rounds }, (_, index) => {
          const number = index + 1;
          let state = "upcoming";
          if (session.finished || number < session.round) state = "done";
          else if (number === session.round) state = "current";
          return <span key={number} className="round-dot" data-state={state} />;
        })}
      </div>

      <div className="dial">
        <svg viewBox={`0 0 ${DIAL} ${DIAL}`} aria-hidden="true">
          <circle className="dial-track" cx={DIAL / 2} cy={DIAL / 2} r={RADIUS} />
          <circle
            /* Remounting at each boundary stops the ring animating backwards
               when a phase resets it from empty to full. */
            key={`${session.phase}-${session.round}-${session.finished}`}
            className="dial-progress"
            data-visible={String(arcVisible)}
            cx={DIAL / 2}
            cy={DIAL / 2}
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <div className="dial-readout">
          <div className="time" role="timer" aria-label={`${display} remaining`}>
            {display}
          </div>
          <p className="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>

      <div className="controls">
        <button
          type="button"
          className="button button--primary"
          onClick={session.running ? pause : start}
        >
          {session.running ? (
            <Pause size={18} aria-hidden="true" />
          ) : (
            <Play size={18} aria-hidden="true" />
          )}
          {primaryLabel}
        </button>
        <button type="button" className="button button--secondary" onClick={reset}>
          <RotateCcw size={18} aria-hidden="true" />
          Reset
        </button>
      </div>

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          locked={session.running}
          storageWorks={storageWorks}
          onChange={updateSetting}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function SettingsDialog({ settings, locked, storageWorks, onChange, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const node = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const focusable = () =>
      Array.from(node.querySelectorAll("input:not([disabled]), button:not([disabled])"));

    focusable()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="scrim"
      /* mousedown, so a drag that starts inside the dialog and ends outside it
         doesn't count as clicking away */
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        ref={dialogRef}
      >
        <h2 className="dialog-title" id="settings-title">
          Settings
        </h2>

        <Field
          id="focus-minutes"
          label="Focus minutes"
          value={settings.focusMin}
          range={RANGE.focusMin}
          disabled={locked}
          describedBy={locked ? "settings-locked" : undefined}
          onCommit={(value) => onChange("focusMin", value)}
        />
        <Field
          id="break-minutes"
          label="Break minutes"
          value={settings.breakMin}
          range={RANGE.breakMin}
          disabled={locked}
          describedBy={locked ? "settings-locked" : undefined}
          onCommit={(value) => onChange("breakMin", value)}
        />
        <Field
          id="rounds"
          label="Rounds"
          value={settings.rounds}
          range={RANGE.rounds}
          disabled={locked}
          describedBy={locked ? "settings-locked" : undefined}
          onCommit={(value) => onChange("rounds", value)}
        />

        {locked && (
          <p className="dialog-note" id="settings-locked">
            Pause the timer to change these.
          </p>
        )}
        {!storageWorks && (
          <p className="dialog-note">
            This browser won&rsquo;t let Orbit save anything, so your settings and progress
            will reset when you close the tab.
          </p>
        )}

        <button type="button" className="button button--primary dialog-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function Field({ id, label, value, range, disabled, describedBy, onCommit }) {
  // The input holds a draft string while typing so a half-deleted value never
  // reaches the timer as NaN.
  const [draft, setDraft] = useState(String(value));
  const [committed, setCommitted] = useState(value);

  if (value !== committed) {
    setCommitted(value);
    setDraft(String(value));
  }

  const commitDraft = () => {
    const parsed = draft.trim() === "" ? Number.NaN : draft;
    const next = clampInt(parsed, range, value);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field-input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft();
          }
        }}
      />
    </div>
  );
}
