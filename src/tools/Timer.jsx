import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";
import {
  RANGE,
  clampInt,
  formatDuration,
  pauseTimer,
  resetTimer,
  startTimer,
  totalForPhase,
  updateSetting,
  useTimerSession,
  useTimerSettings,
} from "../lib/timer.js";
import { selectActiveGoal, useGoals } from "../lib/goals.js";
import { navigate } from "../lib/router.js";
import { isAvailable } from "../lib/storage.js";
import "./Timer.css";

const clockTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Dial geometry. The SVG scales entirely through its viewBox, so these are
// drawing units, not pixels — the rendered size is CSS's business.
const DIAL = 440;
const STROKE = 12;
const RADIUS = (DIAL - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const storageWorks = isAvailable();

export default function Timer() {
  const session = useTimerSession();
  const settings = useTimerSettings();
  const goals = useGoals();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeGoal = selectActiveGoal(goals);

  const total = totalForPhase(session, settings);
  const remaining = session.finished ? 0 : Math.min(session.remaining, total);
  const progress = session.finished ? 1 : total > 0 ? 1 - remaining / total : 0;
  const display = formatDuration(remaining);
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

  return (
    <div className="timer" style={{ "--phase": phaseColor }}>
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
          aria-label="Timer settings"
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
          onClick={session.running ? pauseTimer : startTimer}
        >
          {session.running ? (
            <Pause size={18} aria-hidden="true" />
          ) : (
            <Play size={18} aria-hidden="true" />
          )}
          {primaryLabel}
        </button>
        <button type="button" className="button button--secondary" onClick={resetTimer}>
          <RotateCcw size={18} aria-hidden="true" />
          Reset
        </button>
      </div>

      {activeGoal && (
        <button type="button" className="timer-goal" onClick={() => navigate("goals")}>
          {activeGoal.title}
          <span className="timer-goal-count">
            · {activeGoal.sessions} of {activeGoal.target} sessions
          </span>
        </button>
      )}

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          locked={session.running}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function SettingsDialog({ settings, locked, onClose }) {
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
          Timer settings
        </h2>

        <Field
          id="focus-minutes"
          label="Focus minutes"
          value={settings.focusMin}
          range={RANGE.focusMin}
          disabled={locked}
          describedBy={locked ? "settings-locked" : undefined}
          onCommit={(value) => updateSetting("focusMin", value)}
        />
        <Field
          id="break-minutes"
          label="Break minutes"
          value={settings.breakMin}
          range={RANGE.breakMin}
          disabled={locked}
          describedBy={locked ? "settings-locked" : undefined}
          onCommit={(value) => updateSetting("breakMin", value)}
        />
        <Field
          id="rounds"
          label="Rounds"
          value={settings.rounds}
          range={RANGE.rounds}
          disabled={locked}
          describedBy={locked ? "settings-locked" : undefined}
          onCommit={(value) => updateSetting("rounds", value)}
        />

        {locked && (
          <p className="dialog-note" id="settings-locked">
            Pause the timer to change these.
          </p>
        )}
        {!storageWorks && (
          <p className="dialog-note">
            This browser won&rsquo;t let Orbit save anything, so your settings, timer, and
            goals will reset when you close the tab.
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
