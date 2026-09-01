import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  HORIZONS,
  TITLE_MAX,
  addGoal,
  childDailies,
  childGoals,
  goalsByHorizon,
  removeGoal,
  restoreGoal,
  setGoalParent,
  summarizeChildren,
  toggleGoalDone,
  updateGoal,
  useGoals,
} from "../lib/goals.js";
import {
  TARGET_RANGE,
  formatRecurrence,
  recursOn,
  setDailyParent,
  updateDaily,
  useDailies,
} from "../lib/dailies.js";
import { useCompletions } from "../lib/completions.js";
import { progressOn } from "../lib/progress.js";
import { useSessions } from "../lib/sessions.js";
import { useToday } from "../lib/today.js";
import "./Goals.css";

// The same nine seconds the Dailies tool gives back a deletion in.
const UNDO_MS = 9000;

const clampTarget = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(TARGET_RANGE[1], Math.max(TARGET_RANGE[0], n));
};

/** The calendar's ink language, so a daily reads the same wherever it appears. */
const dailyState = (progress, scheduled) => {
  if (!scheduled) return "unscheduled";
  if (progress?.manual) return "manual";
  if (progress?.complete) return "complete";
  return "partial";
};

export default function Goals() {
  const goals = useGoals();
  const dailies = useDailies();
  const sessions = useSessions();
  const completions = useCompletions();
  const today = useToday();

  const [editingGoal, setEditingGoal] = useState(null);
  const [editingDaily, setEditingDaily] = useState(null);
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const { status } = useMemo(
    () => progressOn(sessions, dailies, completions, today),
    [sessions, dailies, completions, today],
  );

  const handleDelete = (goal) => {
    clearTimeout(undoTimer.current);
    setUndo({ goal, index: goals.items.findIndex((g) => g.id === goal.id) });
    removeGoal(goal.id);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const handleUndo = () => {
    clearTimeout(undoTimer.current);
    if (undo) restoreGoal(undo.goal, undo.index);
    setUndo(null);
  };

  const empty = goals.items.length === 0;

  return (
    <div className="goals">
      <div className="goals-column">
        <Composer />

        {empty ? (
          <div className="goals-empty">
            <h2 className="goals-empty-title">Nothing set for the longer run.</h2>
            <p className="goals-empty-body">
              A goal is the thing your dailies add up to, over a week or a month. Unlike a
              daily, nothing finishes it for you &mdash; you decide when it&rsquo;s done, and
              it waits here until you say so.
            </p>
          </div>
        ) : (
          HORIZONS.map((horizon) => (
            <Section
              key={horizon.id}
              horizon={horizon}
              goals={goals}
              dailies={dailies}
              status={status}
              today={today}
              editingGoal={editingGoal}
              editingDaily={editingDaily}
              onEditGoal={setEditingGoal}
              onEditDaily={setEditingDaily}
              onDelete={handleDelete}
            />
          ))
        )}

        {undo && (
          <div className="undo" role="status">
            <span className="undo-text">Deleted &ldquo;{undo.goal.title}&rdquo;</span>
            <button type="button" className="text-button" onClick={handleUndo}>
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  horizon,
  goals,
  dailies,
  status,
  today,
  editingGoal,
  editingDaily,
  onEditGoal,
  onEditDaily,
  onDelete,
}) {
  const items = goalsByHorizon(goals, horizon.id);

  return (
    <section className="goal-section">
      <h2 className="goal-section-title">{horizon.section}</h2>

      {items.length === 0 ? (
        <p className="goal-section-note">
          Nothing {horizon.id === "weekly" ? "for this week" : "for this month"} yet.
        </p>
      ) : (
        <ul className="goal-list">
          {items.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              goals={goals}
              dailies={dailies}
              status={status}
              today={today}
              editing={editingGoal === goal.id}
              editingDaily={editingDaily}
              onEdit={() => onEditGoal(goal.id)}
              onEditDone={() => onEditGoal(null)}
              onEditDaily={onEditDaily}
              onDelete={() => onDelete(goal)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function GoalRow({
  goal,
  goals,
  dailies,
  status,
  today,
  editing,
  editingDaily,
  onEdit,
  onEditDone,
  onEditDaily,
  onDelete,
}) {
  const [picking, setPicking] = useState(false);

  const weekly = goal.horizon === "weekly";
  const kidGoals = weekly ? [] : childGoals(goals, goal.id);
  const kidDailies = weekly ? childDailies(dailies, goal.id) : [];
  const summary = summarizeChildren(goal, { goals, dailies, status, today });

  return (
    <li className="goal" data-done={String(goal.done)}>
      <div className="goal-head">
        {/* The one deliberate action on this surface. Nothing else sets it: not
            a finished child, not a passing week. */}
        <button
          type="button"
          className="goal-check"
          role="checkbox"
          aria-checked={goal.done}
          aria-label={goal.done ? `Reopen ${goal.title}` : `Mark ${goal.title} done`}
          onClick={() => toggleGoalDone(goal.id)}
        >
          {goal.done && <Check size={13} aria-hidden="true" />}
        </button>

        <div className="goal-body">
          {editing ? (
            <GoalTitleEditor goal={goal} onDone={onEditDone} />
          ) : (
            <button
              type="button"
              className="goal-title"
              onClick={onEdit}
              aria-label={`Rename ${goal.title}`}
            >
              {goal.title}
            </button>
          )}

          {/* A count, not a bar. It reports; it doesn't demand. */}
          {summary && <p className="goal-summary">{summary}</p>}
        </div>

        <div className="goal-actions">
          <button
            type="button"
            className="icon-button icon-button--small icon-button--danger"
            onClick={onDelete}
            aria-label={`Delete ${goal.title}`}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {(kidDailies.length > 0 || kidGoals.length > 0) && (
        <ul className="child-list">
          {kidDailies.map((daily) =>
            editingDaily === daily.id ? (
              <DailyEditor
                key={daily.id}
                daily={daily}
                goals={goals}
                onDone={() => onEditDaily(null)}
              />
            ) : (
              <DailyChild
                key={daily.id}
                daily={daily}
                progress={status.get(daily.id)}
                scheduled={recursOn(daily, today)}
                onEdit={() => onEditDaily(daily.id)}
                onDetach={() => setDailyParent(daily.id, null)}
              />
            ),
          )}

          {kidGoals.map((child) => (
            <GoalChild
              key={child.id}
              goal={child}
              onDetach={() => setGoalParent(child.id, null)}
            />
          ))}
        </ul>
      )}

      <ChildPicker
        goal={goal}
        goals={goals}
        dailies={dailies}
        open={picking}
        onOpen={() => setPicking(true)}
        onClose={() => setPicking(false)}
      />
    </li>
  );
}

function GoalTitleEditor({ goal, onDone }) {
  const [title, setTitle] = useState(goal.title);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const save = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    updateGoal(goal.id, { title });
    onDone();
  };

  return (
    <form className="goal-rename" onSubmit={save}>
      <input
        ref={ref}
        className="field-input goal-rename-input"
        type="text"
        autoComplete="off"
        maxLength={TITLE_MAX}
        aria-label="Goal"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }
        }}
      />
      <button type="submit" className="text-button" disabled={!title.trim()}>
        Save
      </button>
      <button type="button" className="text-button" onClick={onDone}>
        Cancel
      </button>
    </form>
  );
}

/* --- Children -------------------------------------------------------------- */

function DailyChild({ daily, progress, scheduled, onEdit, onDetach }) {
  const state = dailyState(progress, scheduled);
  const count = progress?.count ?? 0;

  let standing;
  if (!scheduled) standing = "Not today";
  else if (progress?.manual) standing = "Marked done";
  else if (progress?.complete) standing = `${count} of ${daily.target} · done`;
  else standing = `${count} of ${daily.target}`;

  return (
    <li className="child" data-state={state} style={{ "--daily-color": daily.color }}>
      <span className="child-mark" data-state={state} aria-hidden="true" />
      <button
        type="button"
        className="child-title"
        onClick={onEdit}
        aria-label={`Edit ${daily.title}`}
      >
        {daily.title}
      </button>
      <span className="child-meta">{formatRecurrence(daily.recurrence)}</span>
      <span className="child-standing">{standing}</span>
      <button
        type="button"
        className="icon-button icon-button--small child-detach"
        onClick={onDetach}
        aria-label={`Remove ${daily.title} from this goal`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

function GoalChild({ goal, onDetach }) {
  return (
    <li className="child child--goal" data-done={String(goal.done)}>
      <span className="child-mark child-mark--goal" data-done={String(goal.done)} aria-hidden="true">
        {goal.done && <Check size={11} aria-hidden="true" />}
      </span>
      <span className="child-title child-title--static">{goal.title}</span>
      <span className="child-standing">{goal.done ? "Done" : "Open"}</span>
      <button
        type="button"
        className="icon-button icon-button--small child-detach"
        onClick={onDetach}
        aria-label={`Remove ${goal.title} from this goal`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * Attaching a child. A weekly goal takes dailies, a monthly goal takes weekly
 * goals — the two levels the model allows and no others. Something already
 * filed elsewhere says so, so moving it is a deliberate choice rather than a
 * surprise.
 */
function ChildPicker({ goal, goals, dailies, open, onOpen, onClose }) {
  const weekly = goal.horizon === "weekly";

  const options = weekly
    ? dailies.items
        .filter((daily) => daily.parentGoalId !== goal.id)
        .map((daily) => ({
          id: daily.id,
          title: daily.title,
          held: goals.items.find((g) => g.id === daily.parentGoalId)?.title ?? null,
          attach: () => setDailyParent(daily.id, goal.id),
        }))
    : goals.items
        .filter((child) => child.horizon === "weekly" && child.parentGoalId !== goal.id)
        .map((child) => ({
          id: child.id,
          title: child.title,
          held: goals.items.find((g) => g.id === child.parentGoalId)?.title ?? null,
          attach: () => setGoalParent(child.id, goal.id),
        }));

  const label = weekly ? "Add a daily" : "Add a weekly goal";

  if (!open) {
    return (
      <div className="goal-add">
        <button type="button" className="text-button" onClick={onOpen} disabled={options.length === 0}>
          {options.length === 0
            ? weekly
              ? "No dailies to add"
              : "No weekly goals to add"
            : label}
        </button>
      </div>
    );
  }

  return (
    <div className="goal-add goal-add--open">
      <ul className="picker">
        {options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="picker-item"
              onClick={() => {
                option.attach();
                onClose();
              }}
            >
              <span className="picker-title">{option.title}</span>
              {option.held && <span className="picker-held">in {option.held}</span>}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="text-button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

/**
 * A window onto a daily, not a second home for it. Enough to re-file it or
 * adjust what it asks for each day; recurrence and colour stay in the Dailies
 * tool, which is where a daily actually lives.
 */
function DailyEditor({ daily, goals, onDone }) {
  const [title, setTitle] = useState(daily.title);
  const [target, setTarget] = useState(String(daily.target));
  const [parent, setParent] = useState(daily.parentGoalId ?? "");
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const weeklyGoals = goals.items.filter((goal) => goal.horizon === "weekly");
  const canSave = title.trim().length > 0;

  const save = (event) => {
    event.preventDefault();
    if (!canSave) return;
    updateDaily(daily.id, {
      title,
      target: clampTarget(target, daily.target),
      parentGoalId: parent || null,
    });
    onDone();
  };

  return (
    <li className="child child--editing">
      <form
        className="child-edit"
        onSubmit={save}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }
        }}
      >
        <input
          ref={ref}
          className="field-input child-edit-title"
          type="text"
          autoComplete="off"
          maxLength={TITLE_MAX}
          aria-label="Daily"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div className="child-edit-row">
          <label className="child-edit-label" htmlFor={`target-${daily.id}`}>
            Per day
          </label>
          <input
            id={`target-${daily.id}`}
            className="field-input child-edit-target"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={target}
            onChange={(event) => setTarget(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            onBlur={() => setTarget(String(clampTarget(target, daily.target)))}
          />

          <label className="child-edit-label" htmlFor={`parent-${daily.id}`}>
            Goal
          </label>
          <select
            id={`parent-${daily.id}`}
            className="field-input child-edit-parent"
            value={parent}
            onChange={(event) => setParent(event.target.value)}
          >
            <option value="">No goal</option>
            {weeklyGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </div>

        <div className="child-edit-row">
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

/* --- Composer -------------------------------------------------------------- */

function Composer() {
  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState("weekly");

  const canAdd = title.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canAdd) return;
    addGoal(title, horizon);
    setTitle("");
  };

  return (
    <form className="composer-form" onSubmit={submit}>
      <div className="composer">
        <div className="composer-field">
          <label className="field-label" htmlFor="goal-title">
            New goal
          </label>
          <input
            id="goal-title"
            className="field-input"
            type="text"
            autoComplete="off"
            maxLength={TITLE_MAX}
            placeholder="What are you aiming at?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <button type="submit" className="button button--primary composer-add" disabled={!canAdd}>
          <Plus size={18} aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="controls">
        <div className="control">
          <span className="control-label" id="horizon-label">
            Horizon
          </span>
          <div className="chips" role="group" aria-labelledby="horizon-label">
            {HORIZONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="chip chip--wide"
                aria-pressed={horizon === option.id}
                onClick={() => setHorizon(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
