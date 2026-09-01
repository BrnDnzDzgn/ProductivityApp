import { useMemo } from "react";
import { useCompletions } from "../lib/completions.js";
import { formatRecurrence, useDailies } from "../lib/dailies.js";
import { STRIP_DAYS, consistency, currentStreak } from "../lib/habits.js";
import { creditsByDay } from "../lib/progress.js";
import { navigate } from "../lib/router.js";
import { useSessions } from "../lib/sessions.js";
import { useToday } from "../lib/today.js";
import "./Habits.css";

const longDate = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

const shortDate = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const MARK_WORDS = {
  done: "done",
  missed: "missed",
  open: "still open",
  unscheduled: "not scheduled",
};

/**
 * Habits — a mirror, not a scoreboard.
 *
 * Everything here is read. There is nothing to create, edit, or delete: a habit
 * is what a recurring daily looks like from a distance, so it changes when the
 * daily changes and nowhere else.
 *
 * Nothing on this surface rewards being looked at more often (Principle 2).
 * There are no totals, no personal bests, no completion percentage — only what
 * is true right now, stated once.
 */
export default function Habits() {
  const dailies = useDailies();
  const sessions = useSessions();
  const completions = useCompletions();
  const today = useToday();

  // One pass over the log for the whole surface, rather than a rescan per day
  // per daily.
  const byDay = useMemo(() => creditsByDay(sessions), [sessions]);

  const rows = useMemo(
    () =>
      dailies.items.map((daily) => ({
        daily,
        streak: currentStreak(daily, { byDay, completions, today }),
        marks: consistency(daily, { byDay, completions, today }),
      })),
    [dailies, byDay, completions, today],
  );

  return (
    <div className="habits">
      <div className="habits-column">
        <p className="habits-note">
          Habits come from your recurring dailies &mdash; this page only reflects them.
          To add, change, or drop one, go to{" "}
          <button type="button" className="text-button" onClick={() => navigate("dailies")}>
            Dailies
          </button>
          .
        </p>

        {rows.length === 0 ? (
          <div className="habits-empty">
            <h2 className="habits-empty-title">Nothing to reflect yet.</h2>
            <p className="habits-empty-body">
              Once you have a daily or two, this page shows how consistently you&rsquo;ve kept
              them &mdash; the days you did, the days you didn&rsquo;t, and the run you&rsquo;re
              on right now.
            </p>
          </div>
        ) : (
          <>
            <p className="habits-scale">The last four weeks</p>
            <ul className="habit-list">
              {rows.map(({ daily, streak, marks }) => (
                <Habit key={daily.id} daily={daily} streak={streak} marks={marks} />
              ))}
            </ul>
            <div className="habits-axis">
              <span>{shortDate(marksStart(rows))}</span>
              <span>Today</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const marksStart = (rows) => rows[0].marks[0].date;

function Habit({ daily, streak, marks }) {
  const kept = marks.filter((mark) => mark.state === "done").length;

  return (
    <li className="habit" style={{ "--daily-color": daily.color }}>
      <div className="habit-head">
        <span className="habit-dot" aria-hidden="true" />
        <span className="habit-title">{daily.title}</span>
        {/* A number, not a trophy. Nothing here is framed as something to
            protect — a streak that ends is information, not a loss. */}
        <span className="habit-streak">
          {streak > 0 ? (
            <>
              {streak} <span className="habit-streak-unit">in a row</span>
            </>
          ) : (
            <span className="habit-streak-none" aria-label="No current run">
              &mdash;
            </span>
          )}
        </span>
      </div>

      <p className="habit-recurrence">{formatRecurrence(daily.recurrence)}</p>

      <div
        className="habit-strip"
        role="img"
        aria-label={`${daily.title}: kept on ${kept} of the last ${STRIP_DAYS} days.`}
      >
        {marks.map((mark) => (
          <span
            key={mark.date}
            className="habit-mark"
            data-state={mark.state}
            title={`${longDate(mark.date)} · ${MARK_WORDS[mark.state]}`}
          />
        ))}
      </div>
    </li>
  );
}
