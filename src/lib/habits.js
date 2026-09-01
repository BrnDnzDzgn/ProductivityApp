import { isMarked } from "./completions.js";
import { recursOn } from "./dailies.js";
import { meetsTarget } from "./progress.js";

/**
 * Habits — a reading of the dailies you already have, over time.
 *
 * Nothing here is stored. A habit is not a thing you create; it is what a
 * recurring daily looks like when you stand back from it, so every mark and
 * every streak below is counted out of the session log and the hand marks, the
 * same two sources the Dailies list and the Calendar read.
 *
 * The whole file exists to answer one question honestly — which of my
 * intentions am I actually keeping — and to answer it the same way twice.
 */

const startOfDay = (ts) => {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Stepped with setDate rather than by subtracting 86,400,000, so the walk stays
// aligned to local midnight across a daylight-saving change.
const shiftDays = (ts, delta) => {
  const date = new Date(ts);
  date.setDate(date.getDate() + delta);
  return date.getTime();
};

/** Four weeks, the same window the Activity chart uses. */
export const STRIP_DAYS = 28;

/**
 * Whether a daily was finished on a day — the same predicate the Dailies list
 * and the Calendar use, so no two surfaces can disagree about a day. Sessions
 * credited to it reaching its target, or a mark saying it happened off-timer.
 */
function completedOn(daily, day, byDay, completionsState) {
  const count = byDay.get(day)?.get(daily.id) ?? 0;
  return meetsTarget(daily, count, isMarked(completionsState, daily.id, day));
}

/**
 * Consecutive scheduled days, ending today, that the daily was finished on.
 *
 * Three rules, in the order they matter:
 *
 * 1. A day the daily doesn't recur on is **skipped entirely** — it is not a
 *    hit and it is not a miss, because nothing was asked for. A Mon/Wed/Fri
 *    habit read on a Tuesday is not on a one-day lapse.
 * 2. **Today never breaks a streak.** A scheduled day that hasn't finished yet
 *    has no verdict, so an unfinished today is skipped rather than counted
 *    against you. Only a scheduled day that is *over* and carries no completion
 *    ends the run. This is the rule the Activity tool already follows when it
 *    steps past an empty today before counting.
 * 3. The walk stops at the day the daily was created. Days before that are not
 *    misses — there was nothing there to miss.
 *
 * Under-reporting is the safe direction and the only one this can fail in: the
 * session log does not reach back forever, so a streak older than the log reads
 * as shorter than it was, never longer.
 */
export function currentStreak(daily, { byDay, completions, today }) {
  const born = startOfDay(daily.createdAt);
  let cursor = today;
  let streak = 0;

  while (cursor >= born) {
    if (recursOn(daily, cursor)) {
      if (completedOn(daily, cursor, byDay, completions)) streak += 1;
      else if (cursor !== today) break;
      // Today, scheduled, not yet done: no verdict, so fall through without
      // counting it and without ending the run.
    }
    cursor = shiftDays(cursor, -1);
  }

  return streak;
}

/**
 * The last `days` days as a row of marks, oldest first.
 *
 *   done         finished — drawn in the daily's own colour
 *   missed       scheduled, the day is over, nothing on it
 *   open         scheduled, and the day is today: asked for, still unresolved
 *   unscheduled  nothing was asked for, or the daily did not exist yet
 *
 * `open` is the state the three-mark spec doesn't name, and it has to exist:
 * drawing an unfinished today as a miss would have the strip contradict the
 * streak on the same row. Days before the daily was created are `unscheduled`
 * for the same reason the streak stops there — an intention cannot have been
 * missed before it was written down.
 */
export function consistency(daily, { byDay, completions, today, days = STRIP_DAYS }) {
  const born = startOfDay(daily.createdAt);
  const marks = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = shiftDays(today, -i);

    let state;
    if (date < born || !recursOn(daily, date)) state = "unscheduled";
    else if (completedOn(daily, date, byDay, completions)) state = "done";
    else if (date === today) state = "open";
    else state = "missed";

    marks.push({ date, state });
  }

  return marks;
}
