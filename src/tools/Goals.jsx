import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  TARGET_RANGE,
  TITLE_MAX,
  addGoal,
  removeGoal,
  restoreGoal,
  setActiveGoal,
  sortGoals,
  toggleGoalDone,
  updateGoal,
  useGoals,
} from "../lib/goals.js";
import "./Goals.css";

// Long enough to notice and reach, short enough that the bar isn't furniture.
const UNDO_MS = 9000;

const clampTarget = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(TARGET_RANGE[1], Math.max(TARGET_RANGE[0], n));
};

export default function Goals() {
  const { items, activeId } = useGoals();
  const [editingId, setEditingId] = useState(null);
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  // Deleting is immediate and reversible rather than guarded by a confirm: a
  // goal can hold weeks of banked sessions, and one click to undo beats one
  // click to approve something already decided.
  const handleDelete = (goal) => {
    clearTimeout(undoTimer.current);
    setUndo({
      goal,
      index: items.findIndex((g) => g.id === goal.id),
      wasActive: goal.id === activeId,
    });
    removeGoal(goal.id);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const handleUndo = () => {
    clearTimeout(undoTimer.current);
    if (undo) restoreGoal(undo.goal, undo.index, undo.wasActive);
    setUndo(null);
  };

  const ordered = sortGoals(items, activeId);

  return (
    <div className="goals">
      <div className="goals-column">
        <Composer />

        {items.length === 0 ? (
          <div className="goals-empty">
            <h2 className="goals-empty-title">Nothing to work toward yet.</h2>
            <p className="goals-empty-body">
              A goal is what your focus sessions add up to. Write one down, and every focus
              block you finish counts toward it.
            </p>
          </div>
        ) : (
          <ul className="goal-list">
            {ordered.map((goal) =>
              goal.id === editingId ? (
                <GoalEditor
                  key={goal.id}
                  goal={goal}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  active={goal.id === activeId}
                  onEdit={() => setEditingId(goal.id)}
                  onDelete={() => handleDelete(goal)}
                />
              ),
            )}
          </ul>
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

function Composer() {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("8");

  const canAdd = title.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canAdd) return;
    addGoal(title, clampTarget(target, 8));
    setTitle("");
    setTarget("8");
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
            placeholder="What are you working toward?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="composer-field composer-field--target">
          <label className="field-label" htmlFor="goal-target">
            Sessions
          </label>
          <input
            id="goal-target"
            className="field-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))
            }
            onBlur={() => setTarget(String(clampTarget(target, 8)))}
          />
        </div>

        <button type="submit" className="button button--primary composer-add" disabled={!canAdd}>
          <Plus size={18} aria-hidden="true" />
          Add
        </button>
      </div>
    </form>
  );
}

function GoalRow({ goal, active, onEdit, onDelete }) {
  const progress = Math.min(1, goal.sessions / goal.target);

  let meta = `${goal.sessions} of ${goal.target} sessions`;
  if (goal.done) meta = `Done · ${goal.sessions} ${goal.sessions === 1 ? "session" : "sessions"}`;
  else if (active) meta = `Focusing · ${meta}`;

  return (
    <li className="goal" data-active={String(active)} data-done={String(goal.done)}>
      <span className="goal-marker" aria-hidden="true" />

      <div className="goal-body">
        {/* The title is the edit affordance. A fourth icon in the action cluster
            would crowd the row on a phone, where they are always visible. */}
        <button
          type="button"
          className="goal-title"
          onClick={onEdit}
          aria-label={`Edit ${goal.title}`}
        >
          {goal.title}
        </button>
        <p className="goal-meta">{meta}</p>
        <div className="goal-track" aria-hidden="true">
          <div className="goal-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="goal-actions">
        {!goal.done && (
          <button
            type="button"
            className="icon-button icon-button--small icon-button--active"
            onClick={() => setActiveGoal(goal.id)}
            aria-pressed={active}
            aria-label={
              active
                ? `Stop counting sessions toward ${goal.title}`
                : `Count sessions toward ${goal.title}`
            }
          >
            <Crosshair size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="icon-button icon-button--small"
          onClick={() => toggleGoalDone(goal.id)}
          aria-label={goal.done ? `Reopen ${goal.title}` : `Mark ${goal.title} done`}
        >
          {goal.done ? (
            <RotateCcw size={16} aria-hidden="true" />
          ) : (
            <Check size={16} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="icon-button icon-button--small icon-button--danger"
          onClick={onDelete}
          aria-label={`Delete ${goal.title}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function GoalEditor({ goal, onDone }) {
  const [title, setTitle] = useState(goal.title);
  const [target, setTarget] = useState(String(goal.target));
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const canSave = title.trim().length > 0;

  const save = (event) => {
    event.preventDefault();
    if (!canSave) return;
    updateGoal(goal.id, { title, target: clampTarget(target, goal.target) });
    onDone();
  };

  return (
    <li className="goal goal--editing">
      <span className="goal-marker" aria-hidden="true" />

      <form
        className="goal-edit"
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
          className="field-input goal-edit-title"
          type="text"
          autoComplete="off"
          maxLength={TITLE_MAX}
          aria-label="Goal"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div className="goal-edit-row">
          <input
            className="field-input goal-edit-target"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Target sessions"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))
            }
            onBlur={() => setTarget(String(clampTarget(target, goal.target)))}
          />
          <span className="goal-edit-unit">sessions</span>
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
