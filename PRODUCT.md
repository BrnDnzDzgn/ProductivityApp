# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Deliberately general: anyone who needs to hold focus for a stretch of time — students in a study block, knowledge workers protecting deep work, hobbyists working through a practice session. No single audience is privileged, so vocabulary and defaults must read naturally to all of them rather than being tuned for one.

The user is mid-session when the product is open. It is not a destination they browse; it is a thing they set running and then work alongside, often on a second monitor, another tab, or a phone propped up beside them. It is looked at glancingly and for long stretches at a time.

## Product Purpose

Orbit is a personal-growth workspace: a single home for the tools someone uses to become who they are trying to be. Rather than a Pomodoro app, a goals app, a calendar, and a habit tracker living as four disconnected products, Orbit gathers them under one shell so they feel like one place.

Success is that someone returns to Orbit as their default surface for focused work and self-directed progress, and that moving between its tools feels like changing rooms rather than changing buildings.

The product is built up over time, one tool at a time. The timer shipped first, dailies second; both now live inside a shared shell.

## Positioning

The differentiator is coherence, not feature count. Each individual tool (a Pomodoro timer, a goals list, a calendar) exists elsewhere in abundance and better-resourced form; what a neighboring product cannot truthfully copy is that these particular growth tools share one shell, one visual language, and one sense of place. The claim is "one calm workspace for the whole practice," not "the best timer."

Corollary: any tool added to Orbit must earn its place by belonging to the same practice of personal growth. Breadth for its own sake is a failure mode, not a goal.

## Operating Context

- Opened at the start of a work or study session and left running, visible but not attended to. Long dwell time, low interaction rate.
- Frequently a background or secondary window: glanceability at distance and in peripheral vision matters more than information density.
- Audio is part of the product's contract with the user — phase changes are announced by generated chimes, because the user is by definition not looking at the screen when a phase ends. Sound is mutable.
- Runs in the browser on desktop and mobile web. It is deployed as a static site to GitHub Pages under the path `/ProductivityApp/`.
- Tools are added incrementally. Every tool ships into an existing product that people may already be using, so the shell and shared conventions have to hold still.

## Capabilities and Constraints

**Shipped today** — a persistent app shell (left rail on desktop, bottom bar on mobile, top context strip) holding six tools:

*Timer* ([src/tools/Timer.jsx](src/tools/Timer.jsx), engine in [src/lib/timer.js](src/lib/timer.js)):
- Configurable focus length, break length, and round count, edited in a modal and locked while running.
- Alternating focus/break phases with automatic advancement, a round indicator, and a terminal "all done" state.
- Driven by wall-clock timestamps rather than a decrementing counter, so a throttled background tab, a slept laptop, and a closed one all land in the same place.
- Web Audio chimes distinguishing focus start, break start, and completion; a mute toggle.
- Keeps running while another tool is on screen; the shell shows a live chip and the tab title counts down.

*Dailies* ([src/tools/Dailies.jsx](src/tools/Dailies.jsx), store in [src/lib/dailies.js](src/lib/dailies.js)):
- Shipped as "Goals" and renamed 2026-08-31, once "goal" was needed for the longer-horizon tool in DESIGN.md §11.
- **Targets are per scheduled day, and they reset** (2026-08-31). "Two sessions of piano, every Mon/Wed/Fri" asks for two on each of those days; the next scheduled day starts at zero. This supersedes the lifetime model inherited from Goals, where `target` was a total banked toward across all time and `done` was a permanent hand-settable flag.
- **Completion is derived, not stored.** There is no `done` field on a daily. Whether one was finished on a day is counted out of the session log, which already records when each focus block finished and which daily it counted toward ([src/lib/progress.js](src/lib/progress.js) is the single place that joins the two, so no surface can answer it differently). A stored flag beside the log would be a second copy of the same fact, free to drift.
- **The one exception is off-timer work** ([src/lib/completions.js](src/lib/completions.js), added 2026-08-31). Some intentions aren't Pomodoro-shaped — meditating, reading — so a daily can be marked done by hand for today. `meetsTarget` treats a day as complete if the logged sessions reach the target *or* a mark is present. This is recorded rather than derived because nothing else in the product knows it; it is additional information, not a duplicate. Deliberately minimal: a set of daily ids per local day, no counts, no partial credit, and not the old permanent lifetime flag returning.
- Marking is **today only**, and so is unmarking — withdrawing a claim after the day is over edits history as much as adding one. The guard reads the clock itself rather than trusting the day it was handed, so a stale snapshot in a tab left open overnight can't mark off yesterday.
- `manual` is tracked separately from `complete`: it is true only where the mark is load-bearing. Marking something you then finish in sessions is simply finished, and the row withdraws the unmark control accordingly.
- Storage is keyed by local `YYYY-MM-DD` rather than a timestamp — it is read by a person eventually, and it is built from local date parts, not `toISOString`, which would report the UTC day and shift the whole record for anyone not on GMT. Capped at 1500 days. Marks belonging to a deleted daily are left in place, since the nine-second undo would not bring back a mark thrown away on delete; orphans resolve to nothing when read.
- Known caveat of deriving: the log is immutable but a target is not, so raising a target re-reads past days as unfinished. The alternative — stamping the target onto every log entry — is the same drift moved somewhere harder to see.
- Each daily carries a recurrence (every day, or a non-empty set of weekdays) and one of the eight fixed Daily-palette colors, defaulting to Periwinkle. A `parentGoalId` field exists and is carried through every read and write, but nothing sets or shows it until the Goals tool exists.
- The list groups into today's dailies and the rest. Only a daily scheduled today can be selected for the timer; a day that has passed is never backfilled. A daily that has met today's target stays selectable — extra sessions are still its work, and the log should say so.
- One daily at a time is the one the timer counts toward. Crediting writes nothing to the daily: the log entry naming it *is* the record. A selection made on a scheduled day lies dormant on unscheduled ones rather than being cleared, so it resumes on the next day it repeats.
- Create, edit title, per-day target, recurrence and color in place, and delete. Deleting is immediate and reversible for nine seconds rather than guarded by a confirmation.
- An empty state that teaches the per-day mechanic.

*Storage migration* — `orbit:dailies` carries an explicit schema `version`; absent means version 1, the lifetime model. `orbit:goals` is unversioned and so takes the same path, which means a browser that never saw the rename migrates straight to the current shape. Version 1 records are **migrated, not reinterpreted**: reading "20 sessions in total" as "20 sessions every day" would leave an intention that can never be met again. So the per-day target resets to 1 — the weakest claim still true of a recurring intention — and everything the old record asserted (`target`, banked `sessions`, `done`) is preserved whole in an inert `legacy` bundle. That bundle is never counted, never shown as progress, and is exactly the payload the Goals tool will want: a lifetime target with sessions banked toward it is a goal. It also holds the only surviving record of focus done before the session log existed, which nothing can reconstruct. Each migrated daily shows a quiet note saying what it used to claim; editing the daily clears the note, since setting a target by hand is the person resolving the question. The old key is dropped only after the new one is confirmed written.

*Goals* ([src/tools/Goals.jsx](src/tools/Goals.jsx), store in [src/lib/goals.js](src/lib/goals.js)):
- The longer-horizon intention, and the counterpart to Dailies: a daily asks "did I do the work today" and answers itself from the log; a goal asks "am I calling this done", which only a person can answer. `done` here is a stored boolean — the one in the product that genuinely is one.
- Two sections, This week and This month. These are **horizons, not date windows**: a goal written three weeks ago still sits under "This week" until resolved. Filtering by date would be the automatic archiving DESIGN.md §11 forbids.
- Nesting runs monthly → weekly → dailies, enforced in both directions: a weekly goal's parent must be monthly, a daily's parent must be weekly. Monthly is the top of the tree, which is what makes a cycle structurally impossible.
- **Children are only ever summarised, never propagated.** Completing every child does not check the parent, and unfinished children do not block checking it. The asymmetry is the tool: it makes the judgment informed, it does not make it.
- The progress line is a sentence, never a bar. A weekly goal counts today's completions among the children today actually asks for — a daily that doesn't recur today stays out of the denominator rather than counting as a miss. A monthly goal counts the `done` flags of the weekly goals under it.
- A window onto dailies, not a second home: the inline editor adjusts title, per-day target, and parent. Recurrence and color stay in the Dailies tool.
- Deleting a goal leaves children pointing at it, so the nine-second undo brings the whole grouping back. A pointer at a goal that no longer exists reads as no parent.
- A goal's horizon is fixed at creation; changing it would strand children pointing at a parent that can no longer hold them.
- No due dates, so no goal is ever red. Nothing auto-archives at week or month end.

*Storage key warning* — the goals store writes `orbit:goals.list`, **not** `orbit:goals`. The bare key belonged to the tool that became Dailies, and [src/lib/dailies.js](src/lib/dailies.js) still reads and deletes it when migrating a browser that predates the rename. A second store writing there would destroy data that had not been migrated yet. `orbit:goals` is permanently retired; verified by loading goals.js *before* dailies.js against unmigrated data and confirming the migration still ran intact.

*Calendar* ([src/tools/Calendar.jsx](src/tools/Calendar.jsx), derivation in [src/lib/calendar.js](src/lib/calendar.js)):
- One month at a time, current month by default, quiet arrow navigation and a "today" affordance that appears only once you have browsed away from it.
- Read-only by construction. It holds no store of its own and writes nothing: every dot and number is derived on demand from the session log and the dailies list, so there is no second record of history that can disagree with the first.
- Each day cell carries one dot per daily that day holds something for, in that daily's color, ordered by the daily's position in the list so a run of days reads as a pattern rather than a reshuffle. The color is the identity and the ink is the outcome: **solid** where the target was met in sessions, a **donut** where the hand mark is what completed it, a **ring** where it was worked but not finished. More ink means more done. Hovering names the daily and how the day went; the mobile agenda spells the names out instead, since a touch screen cannot hover.
- Dots come from the union of the session log and the hand marks. Gating them on logged sessions alone was a real bug caught in review: a day completed off-timer rendered as an empty day, which is precisely what this tool's honesty rule forbids.
- Completion comes from the same `meetsTarget` the Dailies list uses ([src/lib/progress.js](src/lib/progress.js)), so the calendar can never disagree with the tool about whether a day was finished.
- Sessions the log cannot attribute — finished with no daily selected, or credited to a daily since deleted — are drawn as one hollow neutral mark rather than dropped. A day that was worked never renders as a day that wasn't.
- Days with nothing draw a Horizon baseline, the same honesty the Activity chart uses. Cells outside the month are blank rather than dimmed neighbouring dates, which would show a date with no dots and imply the day was empty.
- Clicking a day opens a panel naming what it held; nothing in the panel can be checked, edited, or created.
- The 7-column grid becomes a vertical agenda list under 640px rather than a squished grid, from the same DOM.

*Habits* ([src/tools/Habits.jsx](src/tools/Habits.jsx), derivation in [src/lib/habits.js](src/lib/habits.js)):
- A read-only reflection of the recurring dailies, one row each: name, recurrence, current run, and a 28-day consistency strip. No store of its own; every mark is counted out of the session log and the hand marks through the same `meetsTarget` the Dailies list and Calendar use.
- **Truly read-only** — the entire page renders one interactive element, and it navigates to Dailies. No inputs, no selects, no links. A habit is not a thing you create; it changes when the daily changes and nowhere else.
- **Streak rule**, matching how Activity already treats today: walking back from today, a day the daily doesn't recur on is skipped entirely (neither hit nor miss); a scheduled day that is over with no completion ends the run; and **an unfinished today never ends a run**, because a day that hasn't finished has no verdict yet. The walk stops at the daily's `createdAt` — days before it existed are not misses.
- Under-reporting is the only direction this can fail in: the session log doesn't reach back forever, so a run older than the log reads shorter than it was, never longer.
- **Strip states** are four, not the three in DESIGN.md §11: done (the daily's color), missed (faint Horizon), *open* (hollow — today, scheduled, unresolved), and nothing (unscheduled, or before the daily existed). The fourth is required: drawing an unfinished today as a miss would have the strip contradict the run counted on the same row.
- Carries no totals, no personal best, no completion percentage, and no Aurora. A run of zero renders as an em dash rather than "0". Rows stay in creation order — no ranking, because ranking is a scoreboard (Principle 2).
- `creditsByDay` in [src/lib/progress.js](src/lib/progress.js) buckets the whole log once for this surface; `creditsOn` rescans per day, which is right for the one or two days the other tools need but would walk the log a hundred times over here.

*Activity* ([src/tools/Activity.jsx](src/tools/Activity.jsx)):
- Answers one question — am I actually doing the work. Sessions in the last seven days, current streak, focus time, four weeks of days as a bar per day, and the dailies still in flight.
- Named "Activity" rather than "Dashboard" deliberately: the roadmap slot is the same, but the name states what it shows and resists becoming a metrics surface. Nothing it reports rewards opening it more often, per the second product principle.
- Reads as sentences rather than a grid of stat tiles. A day with no focus still draws its baseline, so gaps read as days not worked rather than as missing data.
- A day you haven't worked yet does not break a streak; only a finished day without a session does.

*Session log* ([src/lib/sessions.js](src/lib/sessions.js)):
- Append-only record of every completed focus block: when it finished, how many minutes it ran, and which daily it counted toward (`dailyId`, null when none was active — entries written before the rename carry `goalId` and are read under the new name).
- Timestamps are the real phase boundaries, not the moment the app noticed — a throttled tab that crosses several at once still logs each at its own time.
- Capped at 5000 entries, oldest dropped. Read by the Activity tool, the Calendar tool, and the shell's context strip; Habits will read from it too.
- Day boundaries are stepped with `setDate` rather than by subtracting 86,400,000, so buckets stay aligned to local midnight across a daylight-saving change.

**Tool sequence:** dailies shipped second (chosen 2026-08-31), then the session log, then Activity, then Calendar, then Goals, then Habits (all 2026-08-31). Remaining, per DESIGN.md §11: Notes. Skills was considered and cut.

**Rail order** is Timer · Dailies · Goals · Calendar · Habits · Activity — the two tools you write intentions into, then the three that read them back. Goals took the `Target` icon, freed for it when the old Goals tool became Dailies.

**Shared stylesheet** (2026-08-31) — component classes used by more than one tool live in [src/components.css](src/components.css): buttons, icon buttons, text buttons, fields, chips, the composer row, labelled control groups, and the undo bar. Loaded once from `main.jsx` after the tokens and before any tool, so a tool can always override what it finds there. Tools no longer depend on each other's stylesheets. Order inside that file is load-bearing in two places, and commented as such: a modifier shares the specificity of the class it modifies, so `.button--primary` must follow `.button`, and `.icon-button--small` must follow the coarse-pointer rule it is expected to win against.

Lifting it surfaced a live bug: `.controls` was defined in **both** Timer.css and Dailies.css with different values, and because Dailies loads later it was silently winning — the timer's Start/Reset row was being drawn with the composer's `flex-wrap`, `gap: 16px 24px`, and a `16px` top margin instead of its own `gap: 12px`. Timer's is now `.timer-controls`. It was the only cross-file class collision; the rest of the shipped CSS is rule-for-rule identical, verified by diffing the built stylesheet before and after (304 rules each, one changed selector).

**Known gap:** `.icon-button--small` (32px) and `.child-detach` (26px) fall under the 44px touch minimum DESIGN.md §9 sets, because they follow the `@media (pointer: coarse)` rule that widens `.icon-button` and override it. Pre-existing and deliberately preserved through the stylesheet lift rather than silently changed.

**Hard constraints:**
- **Static only, permanently.** No backend, no server, no accounts, no authentication. Deployment is static hosting on GitHub Pages, so routing is hash-based ([src/lib/router.js](src/lib/router.js)) — a history-API route would 404 on refresh.
- **No cross-tab sync.** No store listens for the `storage` event, so two open tabs diverge and the last write wins. This is inherent to the current design, not a bug in any one tool. The migration in [src/lib/dailies.js](src/lib/dailies.js) is guarded against the one case where it could cost data passively: two tabs starting at the same instant (a browser restoring a session) could have the second read both `orbit:dailies` and `orbit:goals` as empty in the window after the first tab wrote the migrated record and deleted the legacy key, then checkpoint its empty state over the migrated data with the person having touched nothing. It now writes an empty result only when nothing is stored. Loss from actively editing in a stale tab remains possible, as it does for every store.
- **Storage keys are exact and never enumerated.** `storage.js` only ever calls `getItem`/`setItem`/`removeItem` on `PREFIX + key`; there is no prefix scan, no `Object.keys`, no `localStorage.key(i)` anywhere in the source. This is what makes `orbit:goals.list` and `orbit:goals` provably unable to collide despite the shared prefix — they are distinct exact keys, the two stores' key sets are disjoint, and module evaluation is synchronous, so load order cannot matter.
- **Persistence is browser-local (`localStorage`) only**, namespaced `orbit:` per tool through [src/lib/storage.js](src/lib/storage.js). No cross-device sync, no shared state, no server-held history. Anything built on streaks or long-run progress must be honest about being per-browser and losable, and must degrade gracefully when storage is empty or refused.
- "Now" never comes from `Date.now()` during render. [src/lib/today.js](src/lib/today.js) publishes the current local day as a stable snapshot that changes on its own at midnight, so a tab left open overnight rolls its streak and today-count over without a reload.
- Tool state lives in module stores ([src/lib/store.js](src/lib/store.js)) rather than component state, because a tool's work has to outlive its view — the timer counts while dailies is on screen, and dailies accepts a session from a tool that isn't rendered.
- `onFocusComplete` in [src/lib/timer.js](src/lib/timer.js) is the seam everything downstream hangs off; listeners receive `{ at, minutes }`. [src/App.jsx](src/App.jsx) is the only wiring layer, and the log entry it writes is the entire record of the block: it names the daily the session counted toward, and every notion of a daily being done that day is counted back out of it. Which daily is checked against the block's own timestamp, not the current moment, so a block that finished before midnight is matched to the recurrence of the day it belonged to.
- Stack is React 19 + Vite 8 with `lucide-react` for icons. No router, no state library, no CSS framework, no component library — deliberately, at this size.

**Terminology:** settled on "focus" over "study" (2026-08-31), since the confirmed audience is general rather than students. The UI, the settings labels, and the storage keys all use it.

**Resolved design-system gap:** the Comet text token was `#6b7284`, which failed WCAG AA 4.5:1 against every surface in the palette. DESIGN.md §2 now specifies `#7A8296`, and [src/index.css](src/index.css) was brought in line 2026-08-31, so Comet is a genuine third text tier rather than a mark-only color.

## Brand Commitments

- The product is named **Orbit**. The repository, page title, and deploy path still read "ProductivityApp" / "productivityapp"; these are scaffold leftovers, not the name.
- [DESIGN.md](DESIGN.md) is the committed visual authority for the product and its two-lane (brand vs. product surface) structure. Visual decisions belong there, not here.
- No confirmed voice or tone guidance beyond what DESIGN.md's copy rules imply. Undecided.

## Evidence on Hand

- **No users, no usage data, no testimonials, no press, no case studies, no benchmarks, no pricing.** This is a pre-audience personal project. None of these may be fabricated or implied in any surface.
- **No real brand assets.** `public/favicon.svg` and `public/icons.svg` are unrelated template debris from another project — a purple (`#863bff`) mark and a set of Bluesky/Discord/GitHub/X social icons, referenced nowhere in the source. `src/assets/hero.png`, `react.svg`, and `vite.svg` are likewise unused Vite scaffold files. Orbit has no logo, no icon, and no imagery of its own; treat all of the above as deletable, not as identity.
- The only genuine product artifact is the running Pomodoro itself.

## Product Principles

1. **One place, not five apps.** Every addition is judged by whether it makes Orbit feel more like a single coherent workspace. A tool that would be better as a standalone product does not belong here.
2. **The tool is not the point; the practice is.** Orbit exists to support someone becoming who they are trying to be. Features that increase time-in-app without increasing real progress are working against the product.
3. **Design for the glance, not the gaze.** The primary reading is peripheral, at distance, mid-task. Legibility and calm at a glance outrank density and cleverness.
4. **Honest about being local.** No feature may imply durability, sync, or an account that the static architecture cannot deliver. Where data is losable, the design says so plainly.
5. **Ship one tool fully before starting the next.** Incremental breadth is the plan; half-built tools accumulating in a shell is the failure mode it turns into if unattended.
