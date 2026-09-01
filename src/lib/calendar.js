/**
 * Calendar — a reader, not a store.
 *
 * Every number and every dot on the month view is derived, on demand, from two
 * things that already exist: the append-only session log and the dailies list.
 * Nothing here persists anything, and there is deliberately no
 * `orbit:calendar` key — a second record of what happened would be a second
 * thing that can disagree with the first.
 *
 * The derivation, in one sentence: bucket the session log by local day, group
 * each day's sessions by the daily they were credited to, and look the colour,
 * title, and per-day target up in the dailies list.
 */
import { dayKey } from "./completions.js";
import { meetsTarget } from "./progress.js";

const startOfDay = (ts) => {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Month arithmetic goes through year/month components rather than day maths.
 * Adding a month to the 31st with `setMonth` lands in the month after next, and
 * stepping a day with `+ 86400000` drifts an hour across a daylight-saving
 * boundary. Constructing from parts is exact in both cases.
 */
export const startOfMonth = (ts) => {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
};

export const shiftMonths = (ts, delta) => {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth() + delta, 1).getTime();
};

export const monthLabel = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export const dayLabel = (ts) =>
  new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/**
 * The month laid out as calendar cells, Sunday-first to match the weekday chips
 * in the Dailies tool. Cells outside the month are null: they are rendered as
 * blank space rather than as dimmed dates from the neighbouring month, because
 * a date that is visible but carries no dots would be claiming a day was empty
 * when this view simply isn't showing that month's data.
 */
export function monthCells(monthStart) {
  const first = new Date(monthStart);
  const year = first.getFullYear();
  const month = first.getMonth();
  const leading = first.getDay();
  const length = new Date(year, month + 1, 0).getDate();

  const cells = new Array(leading).fill(null);
  for (let day = 1; day <= length; day += 1) {
    cells.push(new Date(year, month, day).getTime());
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * What each day of a month holds, derived in a single pass over the log.
 *
 * A dot stands for one daily that day holds something for — a focus session
 * credited to it, a manual mark, or both — in that daily's colour. The colour is
 * the identity and the fill is the outcome, so a month reads as both at once:
 *
 *   solid      the day's target was met in logged sessions
 *   donut      complete, but it took the manual mark to get there
 *   ring       worked, not finished
 *   no dot     nothing
 *
 * More ink means more done, in that order. A day carrying only a manual mark
 * still draws — dots are built from the union of the log and the marks, not
 * from the log alone, or marking something off-timer would leave the day
 * looking untouched.
 *
 * Sessions the log could not attribute — finished while no daily was selected,
 * or credited to a daily that has since been deleted — are collected into
 * `unattributed` and drawn as one neutral, hollow mark. They are not dropped:
 * a day you worked must never render as a day you didn't.
 *
 * Completion comes from the same `meetsTarget` the Dailies list uses, so the
 * calendar can never disagree with the tool about whether a day was finished.
 */
export function summarizeMonth(sessionsState, dailiesState, completionsState, monthStart) {
  const from = monthStart;
  const to = shiftMonths(monthStart, 1);

  const byDay = new Map();
  const dayFor = (ts) => {
    let day = byDay.get(ts);
    if (!day) {
      day = { sessions: 0, minutes: 0, counts: new Map(), marks: new Set(), unattributed: 0 };
      byDay.set(ts, day);
    }
    return day;
  };

  for (const entry of sessionsState.items) {
    if (entry.at < from || entry.at >= to) continue;
    const day = dayFor(startOfDay(entry.at));
    day.sessions += 1;
    day.minutes += entry.minutes;
    if (entry.dailyId === null) day.unattributed += 1;
    else day.counts.set(entry.dailyId, (day.counts.get(entry.dailyId) ?? 0) + 1);
  }

  // Manual marks are keyed by local date, so the month is walked day by day
  // rather than filtered by timestamp. A day with only marks and no sessions
  // gets its entry here, which is the whole point of the second pass.
  for (const date of monthCells(monthStart)) {
    if (date === null) continue;
    const ids = completionsState.days[dayKey(date)];
    if (!ids || ids.length === 0) continue;
    const day = dayFor(date);
    for (const id of ids) day.marks.add(id);
  }

  // Dots line up left-to-right in the order the dailies were created, so a
  // given daily keeps the same position across the month and a run of days
  // reads as a pattern rather than as a reshuffle.
  const order = new Map();
  const byId = new Map();
  dailiesState.items.forEach((daily, index) => {
    order.set(daily.id, index);
    byId.set(daily.id, daily);
  });

  const summaries = new Map();
  for (const [date, day] of byDay) {
    const dots = [];
    let unattributed = day.unattributed;

    for (const id of new Set([...day.counts.keys(), ...day.marks])) {
      const count = day.counts.get(id) ?? 0;
      const daily = byId.get(id);

      // A deleted daily takes its title and colour with it. The sessions it
      // holds are still real, so they join the unattributed mark rather than
      // vanishing from the month. A mark left behind by a deleted daily has no
      // work to account for and simply resolves to nothing.
      if (!daily) {
        unattributed += count;
        continue;
      }

      const marked = day.marks.has(id);
      const complete = meetsTarget(daily, count, marked);
      dots.push({
        id,
        title: daily.title,
        color: daily.color,
        count,
        target: daily.target,
        marked,
        complete,
        manual: complete && count < daily.target,
      });
    }

    dots.sort((a, b) => order.get(a.id) - order.get(b.id));
    summaries.set(date, { date, sessions: day.sessions, minutes: day.minutes, dots, unattributed });
  }

  return summaries;
}

/**
 * Totals for the visible month, for the one quiet line under its name. Counts
 * logged focus only — the line speaks in sessions and minutes, and a day
 * finished by hand contributed neither.
 */
export function monthTotals(summaries) {
  let sessions = 0;
  let minutes = 0;
  let days = 0;
  for (const day of summaries.values()) {
    sessions += day.sessions;
    minutes += day.minutes;
    if (day.sessions > 0) days += 1;
  }
  return { sessions, minutes, days };
}
