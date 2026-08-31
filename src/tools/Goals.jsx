import { useState } from "react";
import { Crosshair, Plus, RotateCcw, Trash2, Check } from "lucide-react";
import {
  TARGET_RANGE,
  TITLE_MAX,
  addGoal,
  removeGoal,
  setActiveGoal,
  sortGoals,
  toggleGoalDone,
  useGoals,
} from "../lib/goals.js";
import "./Goals.css";

export default function Goals() {
  const { items, activeId } = useGoals();
  const [confirmingId, setConfirmingId] = useState(null);

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
            {ordered.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                active={goal.id === activeId}
                confirming={confirmingId === goal.id}
                onConfirm={() => setConfirmingId(goal.id)}
                onCancelConfirm={() => setConfirmingId(null)}
                onDelete={() => {
                  setConfirmingId(null);
                  removeGoal(goal.id);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Composer() {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("8");

  const parsedTarget = Number.parseInt(target, 10);
  const canAdd = title.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canAdd) return;
    addGoal(title, Number.isFinite(parsedTarget) ? parsedTarget : 1);
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
            onBlur={() => {
              const n = Number.parseInt(target, 10);
              const clamped = Number.isFinite(n)
                ? Math.min(TARGET_RANGE[1], Math.max(TARGET_RANGE[0], n))
                : 8;
              setTarget(String(clamped));
            }}
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

function GoalRow({ goal, active, confirming, onConfirm, onCancelConfirm, onDelete }) {
  const progress = Math.min(1, goal.sessions / goal.target);

  let meta = `${goal.sessions} of ${goal.target} sessions`;
  if (goal.done) meta = `Done · ${goal.sessions} ${goal.sessions === 1 ? "session" : "sessions"}`;
  else if (active) meta = `Focusing · ${meta}`;

  return (
    <li className="goal" data-active={String(active)} data-done={String(goal.done)}>
      <span className="goal-marker" aria-hidden="true" />

      <div className="goal-body">
        <p className="goal-title">{goal.title}</p>
        <p className="goal-meta">{meta}</p>
        <div className="goal-track" aria-hidden="true">
          <div className="goal-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {confirming ? (
        <div className="goal-confirm">
          <span>Delete?</span>
          <button type="button" className="text-button text-button--danger" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="text-button" onClick={onCancelConfirm}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="goal-actions">
          {!goal.done && (
            <button
              type="button"
              className="icon-button icon-button--small icon-button--active"
              onClick={() => setActiveGoal(goal.id)}
              aria-pressed={active}
              aria-label={
                active ? `Stop counting sessions toward ${goal.title}` : `Count sessions toward ${goal.title}`
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
            onClick={onConfirm}
            aria-label={`Delete ${goal.title}`}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}
