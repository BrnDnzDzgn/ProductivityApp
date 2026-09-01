/**
 * Where the session log meets the dailies list.
 *
 * A daily's target is a number of sessions per scheduled day, and whether it
 * was met on a given day is counted out of the log, which already records when
 * every focus block finished and which daily it counted toward. Keeping a
 * `done` flag beside that would be a second copy of the same fact, and two
 * copies are free to disagree.
 *
 * The one thing the log cannot know is work done away from the timer, so a day
 * also counts as complete if it carries a manual mark (completions.js). That is
 * additional information rather than a duplicate — nothing else in the product
 * records that you meditated. Which of the two finished a day is kept as
 * `manual`, because the calendar draws the difference and a streak resting on
 * marks alone ought to be visible as one.
 *
 * Every surface that asks "was this daily finished on that day" comes through
 * here, so the Dailies list, the Calendar's dots, and Activity can never answer
 * it differently.
 *
 * One honest caveat: the log is immutable but a daily's target is not. Raising
 * a target from two to three re-reads past days as unfinished. The alternative
 * is stamping the target onto every log entry, which would be a second record
 * of the same intention — the same drift, moved somewhere harder to see.
 */

import { marksOn } from "./completions.js";

const startOfDay = (ts) => {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Stepped with setDate rather than by adding 86,400,000, so the window stays
// aligned to local midnight across a daylight-saving change.
const nextDay = (ts) => {
  const date = new Date(ts);
  date.setDate(date.getDate() + 1);
  return date.getTime();
};

/**
 * What one local day holds, straight from the log: how many sessions were
 * credited to each daily, plus the totals and the ones credited to nothing.
 */
export function creditsOn(sessionsState, day) {
  const from = startOfDay(day);
  const to = nextDay(from);

  const counts = new Map();
  let sessions = 0;
  let minutes = 0;
  let unattributed = 0;

  for (const entry of sessionsState.items) {
    if (entry.at < from || entry.at >= to) continue;
    sessions += 1;
    minutes += entry.minutes;
    if (entry.dailyId === null) unattributed += 1;
    else counts.set(entry.dailyId, (counts.get(entry.dailyId) ?? 0) + 1);
  }

  return { counts, sessions, minutes, unattributed };
}

/**
 * The whole log bucketed by local day, in one pass.
 *
 * `creditsOn` rescans the log for every day it is asked about, which is right
 * for the one or two days a tool needs at a time. Habits asks about several
 * weeks across every daily at once, and doing that a day at a time would walk
 * the log a hundred times over for the same answer.
 */
export function creditsByDay(sessionsState) {
  const byDay = new Map();
  for (const entry of sessionsState.items) {
    if (entry.dailyId === null) continue;
    const day = startOfDay(entry.at);
    let counts = byDay.get(day);
    if (!counts) {
      counts = new Map();
      byDay.set(day, counts);
    }
    counts.set(entry.dailyId, (counts.get(entry.dailyId) ?? 0) + 1);
  }
  return byDay;
}

/**
 * Whether a daily was finished on a day: enough sessions logged, or a manual
 * mark saying it happened away from the timer.
 */
export const meetsTarget = (daily, count, marked = false) =>
  marked || count >= daily.target;

/**
 * Every daily's standing on one day: sessions credited, and whether that met
 * the target. `completed` is the same answer as a set, for ordering a list.
 *
 * A daily not scheduled on this day still appears, at zero. Whether that reads
 * as "missed" or as "not asked for" is the caller's business — nothing is owed
 * on a day a daily doesn't recur.
 */
export function progressOn(sessionsState, dailiesState, completionsState, day) {
  const { counts, sessions, minutes, unattributed } = creditsOn(sessionsState, day);
  const marks = marksOn(completionsState, day);

  const status = new Map();
  const completed = new Set();

  for (const daily of dailiesState.items) {
    const count = counts.get(daily.id) ?? 0;
    const marked = marks.has(daily.id);
    const complete = meetsTarget(daily, count, marked);
    status.set(daily.id, { count, marked, complete, manual: complete && count < daily.target });
    if (complete) completed.add(daily.id);
  }

  return { status, completed, marks, sessions, minutes, unattributed };
}

/**
 * One daily's standing on one day, for callers that only need the one.
 *
 * `manual` is true only where the mark is doing the work. Marking something you
 * then go on to finish in sessions is simply finished, and unmarking it would
 * change nothing — so the row offers no control to unmark it.
 */
export function progressFor(sessionsState, completionsState, daily, day) {
  const count = creditsOn(sessionsState, day).counts.get(daily.id) ?? 0;
  const marked = marksOn(completionsState, day).has(daily.id);
  const complete = meetsTarget(daily, count, marked);
  return { count, marked, complete, manual: complete && count < daily.target };
}
