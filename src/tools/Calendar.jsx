import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  dayLabel,
  monthCells,
  monthLabel,
  monthTotals,
  shiftMonths,
  startOfMonth,
  summarizeMonth,
} from "../lib/calendar.js";
import { useCompletions } from "../lib/completions.js";
import { WEEKDAYS, useDailies } from "../lib/dailies.js";
import { useSessions } from "../lib/sessions.js";
import { useToday } from "../lib/today.js";
import "./Calendar.css";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Solid where the target was met in logged sessions, a donut where the manual
 * mark is what finished the day, a ring where it was worked but not finished.
 * More ink means more done, and the colour stays the daily's throughout.
 */
const dotState = (dot) => (dot.manual ? "manual" : dot.complete ? "complete" : "partial");

function dotLabel(dot) {
  if (dot.manual) {
    return dot.count === 0
      ? `${dot.title} · marked done`
      : `${dot.title} · ${dot.count} of ${dot.target} · marked done`;
  }
  return `${dot.title} · ${dot.count} of ${dot.target}${dot.complete ? " · done" : ""}`;
}

function formatMinutes(total) {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * The month view. It reads the session log and the dailies list and draws what
 * it finds; it has no way to create, complete, or edit anything. Every control
 * on this surface either moves the month or asks a day what it held.
 */
export default function Calendar() {
  const sessions = useSessions();
  const dailies = useDailies();
  const completions = useCompletions();
  const today = useToday();

  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(null);

  const cells = useMemo(() => monthCells(month), [month]);
  const summaries = useMemo(
    () => summarizeMonth(sessions, dailies, completions, month),
    [sessions, dailies, completions, month],
  );
  const totals = useMemo(() => monthTotals(summaries), [summaries]);

  const currentMonth = startOfMonth(today);
  const browsing = month !== currentMonth;

  const goTo = (next) => {
    setMonth(next);
    setSelected(null);
  };

  const detail = selected === null ? null : (summaries.get(selected) ?? {
    date: selected,
    sessions: 0,
    minutes: 0,
    dots: [],
    unattributed: 0,
  });

  return (
    <div className="calendar">
      <div className="calendar-column">
        <header className="cal-head">
          <div className="cal-head-text">
            <h2 className="cal-month">{monthLabel(month)}</h2>
            <p className="cal-totals">
              {totals.sessions === 0
                ? "No focus logged this month."
                : `${plural(totals.sessions, "session")} across ${plural(totals.days, "day")} · ${formatMinutes(totals.minutes)}`}
            </p>
          </div>

          <div className="cal-nav">
            {/* The affordance back to now only exists once you've wandered off
                it — an inert "today" button on the current month is furniture. */}
            {browsing && (
              <button type="button" className="text-button" onClick={() => goTo(currentMonth)}>
                Today
              </button>
            )}
            <button
              type="button"
              className="icon-button icon-button--small"
              onClick={() => goTo(shiftMonths(month, -1))}
              aria-label={`Previous month, ${monthLabel(shiftMonths(month, -1))}`}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button icon-button--small"
              onClick={() => goTo(shiftMonths(month, 1))}
              aria-label={`Next month, ${monthLabel(shiftMonths(month, 1))}`}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Column headers for the grid. On mobile the grid unstacks into an
            agenda and each row names its own weekday, so this row goes. */}
        <div className="cal-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day.index} className="cal-weekday">
              {day.short}
            </span>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((date, index) =>
            date === null ? (
              // Outside the month. Blank rather than a dimmed neighbouring date,
              // which would show a day with no dots and imply it was empty.
              <div key={`pad-${index}`} className="cal-pad" aria-hidden="true" />
            ) : (
              <Day
                key={date}
                date={date}
                summary={summaries.get(date)}
                isToday={date === today}
                selected={date === selected}
                onSelect={() => setSelected(selected === date ? null : date)}
              />
            ),
          )}
        </div>

        {detail && <DayPanel detail={detail} onClose={() => setSelected(null)} />}

        {sessions.items.length === 0 && (
          <p className="cal-note">
            Nothing logged yet. Finish a focus block and the day it landed on picks up a dot,
            in the colour of the daily it counted toward.
          </p>
        )}
      </div>
    </div>
  );
}

function Day({ date, summary, isToday, selected, onSelect }) {
  const dots = summary?.dots ?? [];
  const unattributed = summary?.unattributed ?? 0;
  // What the day has to show, which is not the same as what it logged: a daily
  // finished away from the timer carries no sessions and still holds a dot.
  const held = dots.length > 0 || unattributed > 0;

  const names = [
    ...dots.map((dot) => `${dot.title}, ${dotLabel(dot).split(" · ").slice(1).join(", ")}`),
    unattributed > 0 ? `${plural(unattributed, "session")} not counted toward a daily` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      className="cal-day"
      data-today={String(isToday)}
      data-worked={String(held)}
      aria-pressed={selected}
      aria-label={
        names.length > 0 ? `${dayLabel(date)} — ${names.join("; ")}` : `${dayLabel(date)} — nothing logged`
      }
      onClick={onSelect}
    >
      <span className="cal-date">{new Date(date).getDate()}</span>
      <span className="cal-weekday-inline" aria-hidden="true">
        {WEEKDAYS[new Date(date).getDay()].short}
      </span>

      {/* The baseline is always drawn. A day you didn't work reads as a day you
          didn't work, not as a cell that failed to load. */}
      <span className="cal-dots" aria-hidden="true">
        {held ? (
          <>
            {dots.map((dot) => (
              <span
                key={dot.id}
                className="cal-dot"
                data-state={dotState(dot)}
                style={{ "--dot": dot.color }}
                data-name={dotLabel(dot)}
              >
                <span className="cal-dot-mark" />
                <span className="cal-dot-name">{dot.title}</span>
              </span>
            ))}
            {unattributed > 0 && (
              <span
                className="cal-dot cal-dot--loose"
                data-name={`${plural(unattributed, "session")} · no daily`}
              >
                <span className="cal-dot-mark" />
                <span className="cal-dot-name">No daily</span>
              </span>
            )}
          </>
        ) : (
          <span className="cal-baseline" />
        )}
      </span>
    </button>
  );
}

/**
 * What a day held, in words. Reading only — there is nothing here to check off,
 * because completing a daily belongs to the Dailies tool and only ever happens
 * on the day itself.
 */
function DayPanel({ detail, onClose }) {
  const { date, sessions, minutes, dots, unattributed } = detail;

  return (
    <section className="cal-panel" aria-live="polite">
      <div className="cal-panel-head">
        <h3 className="cal-panel-title">{dayLabel(date)}</h3>
        <button type="button" className="text-button" onClick={onClose}>
          Close
        </button>
      </div>

      {sessions === 0 ? (
        <p className="cal-panel-empty">No focus logged.</p>
      ) : (
        <>
          <p className="cal-panel-summary">
            {plural(sessions, "session")} · {formatMinutes(minutes)} of focus
          </p>
          <ul className="cal-panel-list">
            {dots.map((dot) => (
              <li key={dot.id} className="cal-panel-item">
                <span
                  className="cal-dot-mark"
                  data-state={dotState(dot)}
                  style={{ "--dot": dot.color }}
                  aria-hidden="true"
                />
                <span className="cal-panel-name">{dot.title}</span>
                <span className="cal-panel-count">
                  {dot.manual
                    ? dot.count === 0
                      ? "Marked done"
                      : `${dot.count} of ${dot.target} · marked done`
                    : `${dot.count} of ${plural(dot.target, "session")}${dot.complete ? " · done" : ""}`}
                </span>
              </li>
            ))}
            {unattributed > 0 && (
              <li className="cal-panel-item cal-panel-item--loose">
                <span className="cal-dot-mark" aria-hidden="true" />
                <span className="cal-panel-name">Not counted toward a daily</span>
                <span className="cal-panel-count">{plural(unattributed, "session")}</span>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
