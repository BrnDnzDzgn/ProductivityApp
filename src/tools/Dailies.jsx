import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Crosshair, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  DAILY_COLORS,
  DEFAULT_COLOR,
  EVERY_DAY,
  TARGET_RANGE,
  TITLE_MAX,
  WEEKDAYS,
  addDaily,
  formatRecurrence,
  groupDailies,
  isEveryDay,
  recurrenceDays,
  recurrenceFromDays,
  removeDaily,
  restoreDaily,
  setActiveDaily,
  updateDaily,
  useDailies,
} from "../lib/dailies.js";
import { setMark, useCompletions } from "../lib/completions.js";
import { progressOn } from "../lib/progress.js";
import { useSessions } from "../lib/sessions.js";
import { useToday } from "../lib/today.js";
import "./Dailies.css";

// Long enough to notice and reach, short enough that the bar isn't furniture.
const UNDO_MS = 9000;

const clampTarget = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(TARGET_RANGE[1], Math.max(TARGET_RANGE[0], n));
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the lifetime record this daily was migrated from used to claim. */
function legacyNote(legacy) {
  const banked =
    legacy.sessions > 0
      ? `${plural(legacy.sessions, "session")} banked toward ${legacy.target}`
      : `a one-time target of ${plural(legacy.target, "session")}`;
  return legacy.done
    ? `Carried over from the old model, where you had finished it — ${banked}. Targets are now per day.`
    : `Carried over from the old model — ${banked}. Targets are now per day.`;
}

export default function Dailies() {
  const dailies = useDailies();
  const sessions = useSessions();
  const completions = useCompletions();
  const { items, activeId } = dailies;
  // Midnight of the current day: stable across renders, and it moves on its own
  // when the day does, so a tab left open overnight regroups itself.
  const today = useToday();
  const [editingId, setEditingId] = useState(null);
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  // Deleting is immediate and reversible rather than guarded by a confirm: a
  // daily can hold weeks of banked sessions, and one click to undo beats one
  // click to approve something already decided.
  const handleDelete = (daily) => {
    clearTimeout(undoTimer.current);
    setUndo({
      daily,
      index: items.findIndex((d) => d.id === daily.id),
      wasActive: daily.id === activeId,
    });
    removeDaily(daily.id);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const handleUndo = () => {
    clearTimeout(undoTimer.current);
    if (undo) restoreDaily(undo.daily, undo.index, undo.wasActive);
    setUndo(null);
  };

  // Completion is counted out of the session log for today, never read off the
  // daily — there is no stored `done` to go stale at midnight.
  const { status, completed } = useMemo(
    () => progressOn(sessions, dailies, completions, today),
    [sessions, dailies, completions, today],
  );

  const { scheduled, rest } = groupDailies(items, activeId, today, completed);

  const renderRow = (daily, scheduledToday) =>
    daily.id === editingId ? (
      <DailyEditor key={daily.id} daily={daily} onDone={() => setEditingId(null)} />
    ) : (
      <DailyRow
        key={daily.id}
        daily={daily}
        today={today}
        progress={status.get(daily.id) ?? { count: 0, marked: false, complete: false, manual: false }}
        // A selection made on a day this daily repeats on survives into days it
        // doesn't, dormant. It shouldn't claim to be counting on one of those —
        // the timer isn't.
        active={daily.id === activeId && scheduledToday}
        scheduledToday={scheduledToday}
        onEdit={() => setEditingId(daily.id)}
        onDelete={() => handleDelete(daily)}
      />
    );

  return (
    <div className="dailies">
      <div className="dailies-column">
        <Composer />

        {items.length === 0 ? (
          <div className="dailies-empty">
            <h2 className="dailies-empty-title">Nothing to work toward yet.</h2>
            <p className="dailies-empty-body">
              A daily is a recurring intention, measured in focus sessions. Write one down,
              choose how many sessions it asks for and which days it repeats on. Each
              scheduled day starts fresh — finish today&rsquo;s and tomorrow begins at zero.
            </p>
          </div>
        ) : (
          <>
            <section className="daily-group">
              <h2 className="daily-group-title">Today&rsquo;s dailies</h2>
              {scheduled.length === 0 ? (
                <p className="daily-group-note">
                  Nothing repeats today. Sessions still count &mdash; they just aren&rsquo;t
                  counting toward anything.
                </p>
              ) : (
                <ul className="daily-list">{scheduled.map((daily) => renderRow(daily, true))}</ul>
              )}
            </section>

            {rest.length > 0 && (
              <section className="daily-group">
                <h2 className="daily-group-title">All dailies</h2>
                <p className="daily-group-note">
                  Not scheduled today. They wait for the days they repeat on.
                </p>
                <ul className="daily-list">{rest.map((daily) => renderRow(daily, false))}</ul>
              </section>
            )}
          </>
        )}

        {undo && (
          <div className="undo" role="status">
            <span className="undo-text">Deleted &ldquo;{undo.daily.title}&rdquo;</span>
            <button type="button" className="text-button" onClick={handleUndo}>
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Shared recurrence + colour controls ---------------------------------- */

/**
 * Seven weekday chips, plus a shortcut for the common case. The chips are plain
 * toggles — every day is simply all seven on — so the shortcut adds a click to
 * save, never a mode to understand. The last remaining day can't be turned off:
 * a daily scheduled for no day at all would never come round again.
 */
function RecurrencePicker({ id, recurrence, onChange }) {
  const days = recurrenceDays(recurrence);
  const everyDay = isEveryDay(recurrence);

  const toggle = (index) => {
    const next = days.includes(index) ? days.filter((day) => day !== index) : [...days, index];
    if (next.length === 0) return;
    onChange(recurrenceFromDays(next));
  };

  return (
    <div className="control">
      <span className="control-label" id={`${id}-label`}>
        Repeats
      </span>
      <div className="chips" role="group" aria-labelledby={`${id}-label`}>
        {WEEKDAYS.map((day) => (
          <button
            key={day.index}
            type="button"
            className="chip"
            aria-pressed={days.includes(day.index)}
            aria-label={day.long}
            onClick={() => toggle(day.index)}
          >
            {day.chip}
          </button>
        ))}
        <button
          type="button"
          className="chip chip--wide"
          aria-pressed={everyDay}
          onClick={() => onChange(EVERY_DAY)}
        >
          Every day
        </button>
      </div>
    </div>
  );
}

function ColorPicker({ id, color, onChange }) {
  return (
    <div className="control">
      <span className="control-label" id={`${id}-label`}>
        Color
      </span>
      <div className="swatches" role="group" aria-labelledby={`${id}-label`}>
        {DAILY_COLORS.map((option) => (
          <button
            key={option.hex}
            type="button"
            className="swatch"
            style={{ "--swatch": option.hex }}
            aria-pressed={color === option.hex}
            aria-label={option.name}
            title={option.name}
            onClick={() => onChange(option.hex)}
          />
        ))}
      </div>
    </div>
  );
}

/* --- Composer -------------------------------------------------------------- */

function Composer() {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("1");
  const [recurrence, setRecurrence] = useState(EVERY_DAY);
  const [color, setColor] = useState(DEFAULT_COLOR);

  const canAdd = title.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canAdd) return;
    addDaily(title, clampTarget(target, 1), { recurrence, color });
    setTitle("");
    setTarget("1");
    setRecurrence(EVERY_DAY);
    setColor(DEFAULT_COLOR);
  };

  return (
    <form className="composer-form" onSubmit={submit}>
      <div className="composer">
        <div className="composer-field">
          <label className="field-label" htmlFor="daily-title">
            New daily
          </label>
          <input
            id="daily-title"
            className="field-input"
            type="text"
            autoComplete="off"
            maxLength={TITLE_MAX}
            placeholder="What are you working toward?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="composer-field composer-field--target">
          <label className="field-label" htmlFor="daily-target">
            Per day
          </label>
          <input
            id="daily-target"
            className="field-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))
            }
            onBlur={() => setTarget(String(clampTarget(target, 1)))}
          />
        </div>

        <button type="submit" className="button button--primary composer-add" disabled={!canAdd}>
          <Plus size={18} aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="controls">
        <RecurrencePicker id="new-repeats" recurrence={recurrence} onChange={setRecurrence} />
        <ColorPicker id="new-color" color={color} onChange={setColor} />
      </div>
    </form>
  );
}

/* --- The list -------------------------------------------------------------- */

function DailyRow({ daily, today, progress, active, scheduledToday, onEdit, onDelete }) {
  const { count, complete, manual } = progress;
  const filled = Math.min(1, count / daily.target);

  // What today asks for, and how far in you are. A daily that isn't scheduled
  // today is owed nothing, so it states its standing terms instead. A day
  // finished by hand says so rather than claiming sessions it didn't have.
  let meta;
  if (!scheduledToday) meta = `${plural(daily.target, "session")} on the days it repeats`;
  else if (manual) {
    meta =
      count === 0
        ? "Marked done today"
        : `Marked done today · ${count} of ${daily.target} sessions`;
  } else if (complete) meta = `Done today · ${plural(count, "session")}`;
  else meta = `${count} of ${daily.target} sessions today`;
  if (scheduledToday && active && !complete) meta = `Focusing · ${meta}`;

  return (
    <li
      className="daily"
      data-active={String(active)}
      data-done={String(scheduledToday && complete)}
      data-manual={String(scheduledToday && manual)}
      data-scheduled={String(scheduledToday)}
      style={{ "--daily-color": daily.color }}
    >
      <span className="daily-marker" aria-hidden="true" />

      <div className="daily-body">
        {/* The title is the edit affordance. A third icon in the action cluster
            would crowd the row on a phone, where they are always visible. */}
        <button
          type="button"
          className="daily-title"
          onClick={onEdit}
          aria-label={`Edit ${daily.title}`}
        >
          {daily.title}
        </button>
        <p className="daily-meta">{meta}</p>
        <p className="daily-recurrence">{formatRecurrence(daily.recurrence)}</p>

        {/* Today's progress, not a lifetime bar: it empties again tomorrow. */}
        {scheduledToday && (
          <div className="daily-track" aria-hidden="true">
            <div className="daily-fill" style={{ width: `${filled * 100}%` }} />
          </div>
        )}

        {daily.legacy && <p className="daily-legacy">{legacyNote(daily.legacy)}</p>}
      </div>

      <div className="daily-actions">
        {/* Only a daily scheduled today can take the timer's sessions or be
            marked off, and only for today — a day that has passed is a day you
            cannot change. */}
        {scheduledToday && !complete && (
          <button
            type="button"
            className="icon-button icon-button--small icon-button--active"
            onClick={() => setActiveDaily(daily.id, today)}
            aria-pressed={active}
            aria-label={
              active
                ? `Stop counting sessions toward ${daily.title}`
                : `Count sessions toward ${daily.title}`
            }
          >
            <Crosshair size={16} aria-hidden="true" />
          </button>
        )}

        {/* For work done away from the timer. Offered while today is unfinished,
            and withdrawn once the sessions themselves finish it — there is
            nothing to unmark then, because the mark isn't what's holding it. */}
        {scheduledToday && !complete && (
          <button
            type="button"
            className="icon-button icon-button--small"
            onClick={() => setMark(daily.id, today, true)}
            aria-label={`Mark ${daily.title} done today`}
          >
            <Check size={16} aria-hidden="true" />
          </button>
        )}
        {scheduledToday && manual && (
          <button
            type="button"
            className="icon-button icon-button--small"
            onClick={() => setMark(daily.id, today, false)}
            aria-label={`Undo marking ${daily.title} done today`}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="icon-button icon-button--small icon-button--danger"
          onClick={onDelete}
          aria-label={`Delete ${daily.title}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/* --- Editing in place ------------------------------------------------------ */

function DailyEditor({ daily, onDone }) {
  const [title, setTitle] = useState(daily.title);
  const [target, setTarget] = useState(String(daily.target));
  const [recurrence, setRecurrence] = useState(daily.recurrence);
  const [color, setColor] = useState(daily.color);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const canSave = title.trim().length > 0;

  const save = (event) => {
    event.preventDefault();
    if (!canSave) return;
    updateDaily(daily.id, {
      title,
      target: clampTarget(target, daily.target),
      recurrence,
      color,
    });
    onDone();
  };

  return (
    <li className="daily daily--editing" style={{ "--daily-color": color }}>
      <span className="daily-marker" aria-hidden="true" />

      <form
        className="daily-edit"
        onSubmit={save}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }
        }}
      >
        <input
          ref={titleRef}
          className="field-input daily-edit-title"
          type="text"
          autoComplete="off"
          maxLength={TITLE_MAX}
          aria-label="Daily"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div className="controls">
          <RecurrencePicker
            id={`edit-repeats-${daily.id}`}
            recurrence={recurrence}
            onChange={setRecurrence}
          />
          <ColorPicker id={`edit-color-${daily.id}`} color={color} onChange={setColor} />
        </div>

        <div className="daily-edit-row">
          <input
            className="field-input daily-edit-target"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Target sessions"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))
            }
            onBlur={() => setTarget(String(clampTarget(target, daily.target)))}
          />
          <span className="daily-edit-unit">sessions per scheduled day</span>
          <button type="submit" className="text-button" disabled={!canSave}>
            Save
          </button>
          <button type="button" className="text-button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
