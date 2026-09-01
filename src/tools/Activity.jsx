import { currentStreak, dailyCounts, summarize, useSessions } from "../lib/sessions.js";
import { recursOn, sortDailies, useDailies } from "../lib/dailies.js";
import { useCompletions } from "../lib/completions.js";
import { progressOn } from "../lib/progress.js";
import { navigate } from "../lib/router.js";
import { useToday } from "../lib/today.js";
import "./Activity.css";

// Four weeks: long enough to show a habit forming or lapsing, short enough that
// every bar still has room to be read.
const WINDOW_DAYS = 28;
const SUMMARY_DAYS = 7;

const shortDate = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const longDate = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

function formatMinutes(total) {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Activity() {
  const sessions = useSessions();
  const dailies = useDailies();
  const completions = useCompletions();

  // Midnight of the current day: stable across renders, and it moves on its own
  // when the day does.
  const today = useToday();
  const week = summarize(sessions, SUMMARY_DAYS, today);
  const streak = currentStreak(sessions, today);
  const days = dailyCounts(sessions, WINDOW_DAYS, today);
  const busiest = Math.max(1, ...days.map((day) => day.count));
  const daysWorked = days.filter((day) => day.count > 0).length;

  // A daily's standing is a property of the day, counted out of the log. Today
  // is the only day it can still be changed, so that is the one worth showing.
  const { status, completed } = progressOn(sessions, dailies, completions, today);
  const scheduled = sortDailies(
    dailies.items.filter((daily) => recursOn(daily, today)),
    dailies.activeId,
    completed,
  );

  if (sessions.items.length === 0) {
    return (
      <div className="activity">
        <div className="activity-column activity-empty">
          <h2 className="activity-headline">Nothing logged yet.</h2>
          <p className="activity-empty-body">
            Finish a focus block and it lands here. This page only ever answers one
            question — whether you are actually doing the work.
          </p>
        </div>
      </div>
    );
  }

  const headline =
    week.sessions === 0
      ? "No focus in the last seven days."
      : `${plural(week.sessions, "session")} in the last seven days.`;

  const support = [
    streak > 0 ? `${plural(streak, "day")} in a row` : null,
    week.minutes > 0 ? `${formatMinutes(week.minutes)} of focus` : null,
  ].filter(Boolean);

  return (
    <div className="activity">
      <div className="activity-column">
        <h2 className="activity-headline">{headline}</h2>
        {support.length > 0 && <p className="activity-support">{support.join(" · ")}</p>}

        <div className="activity-chart">
          <p className="activity-scale">Up to {plural(busiest, "session")} a day</p>
          <div
            className="activity-bars"
            role="img"
            aria-label={`Focus over the last ${WINDOW_DAYS} days: ${plural(
              daysWorked,
              "day",
            )} with at least one session.`}
          >
            {days.map((day) => (
              <div
                key={day.date}
                className="activity-day"
                data-worked={String(day.count > 0)}
                title={`${longDate(day.date)} · ${plural(day.count, "session")}`}
              >
                <div
                  className="activity-bar"
                  style={{ height: `${(day.count / busiest) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="activity-axis">
            <span>{shortDate(days[0].date)}</span>
            <span>Today</span>
          </div>
        </div>

        <section className="activity-section">
          <h3 className="activity-heading">Today&rsquo;s dailies</h3>

          {scheduled.length === 0 ? (
            <p className="activity-empty-note">
              Nothing repeats today. Sessions still count — they just aren&rsquo;t counting
              toward anything.
            </p>
          ) : (
            <ul className="activity-dailies">
              {scheduled.map((daily) => {
                const { count, complete, manual } = status.get(daily.id) ?? {
                  count: 0,
                  complete: false,
                  manual: false,
                };
                return (
                  <li key={daily.id}>
                    <button
                      type="button"
                      className="activity-daily"
                      data-active={String(daily.id === dailies.activeId)}
                      data-complete={String(complete)}
                      data-manual={String(manual)}
                      onClick={() => navigate("dailies")}
                    >
                      <span className="activity-daily-title">
                        {daily.title}
                        <span className="activity-daily-count">
                          {manual ? "marked done" : `${count} of ${daily.target}`}
                        </span>
                      </span>
                      <span className="activity-daily-track">
                        <span
                          className="activity-daily-fill"
                          style={{ width: `${Math.min(1, count / daily.target) * 100}%` }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
