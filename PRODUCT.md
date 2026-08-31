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

The product is built up over time, one tool at a time. The timer shipped first, goals second; both now live inside a shared shell.

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

**Shipped today** — a persistent app shell (left rail on desktop, bottom bar on mobile, top context strip) holding two tools:

*Timer* ([src/tools/Timer.jsx](src/tools/Timer.jsx), engine in [src/lib/timer.js](src/lib/timer.js)):
- Configurable focus length, break length, and round count, edited in a modal and locked while running.
- Alternating focus/break phases with automatic advancement, a round indicator, and a terminal "all done" state.
- Driven by wall-clock timestamps rather than a decrementing counter, so a throttled background tab, a slept laptop, and a closed one all land in the same place.
- Web Audio chimes distinguishing focus start, break start, and completion; a mute toggle.
- Keeps running while another tool is on screen; the shell shows a live chip and the tab title counts down.

*Goals* ([src/tools/Goals.jsx](src/tools/Goals.jsx), store in [src/lib/goals.js](src/lib/goals.js)):
- Goals are measured in focus sessions, not tasks — a title plus a target number of sessions.
- One goal at a time is the one the timer counts toward; finishing a focus block credits it, and a goal retires itself on reaching its target.
- Create, edit title and target in place, mark done, reopen, and delete. Deleting is immediate and reversible for nine seconds rather than guarded by a confirmation — a goal can hold weeks of banked sessions, so undo is the safer affordance.
- Lowering a target below the sessions already banked completes the goal; raising one never reopens a goal, so a completion marked by hand is never silently undone.
- An empty state that teaches the session mechanic.

*Session log* ([src/lib/sessions.js](src/lib/sessions.js)):
- Append-only record of every completed focus block: when it finished, how many minutes it ran, and which goal it counted toward (null when none was active).
- Timestamps are the real phase boundaries, not the moment the app noticed — a throttled tab that crosses several at once still logs each at its own time.
- Capped at 5000 entries, oldest dropped. Surfaced today only as "N sessions today" in the shell's context strip; it exists mainly because focus history cannot be reconstructed after the fact, and the dashboard, streaks, and skills tools will all read from it.

**Tool sequence:** goals shipped second (chosen 2026-08-31), followed by the session log that underpins the rest. Calendar, skills, and a dashboard remain planned; their order is still undecided.

**Hard constraints:**
- **Static only, permanently.** No backend, no server, no accounts, no authentication. Deployment is static hosting on GitHub Pages, so routing is hash-based ([src/lib/router.js](src/lib/router.js)) — a history-API route would 404 on refresh.
- **Persistence is browser-local (`localStorage`) only**, namespaced `orbit:` per tool through [src/lib/storage.js](src/lib/storage.js). No cross-device sync, no shared state, no server-held history. Anything built on streaks or long-run progress must be honest about being per-browser and losable, and must degrade gracefully when storage is empty or refused.
- Tool state lives in module stores ([src/lib/store.js](src/lib/store.js)) rather than component state, because a tool's work has to outlive its view — the timer counts while goals is on screen, and goals accepts a session from a tool that isn't rendered.
- `onFocusComplete` in [src/lib/timer.js](src/lib/timer.js) is the seam everything downstream hangs off; listeners receive `{ at, minutes }`. [src/App.jsx](src/App.jsx) is the only wiring layer, and it credits the goal before logging the session so the log can name a goal that retires itself in the same breath.
- Stack is React 19 + Vite 8 with `lucide-react` for icons. No router, no state library, no CSS framework, no component library — deliberately, at this size.

**Terminology:** settled on "focus" over "study" (2026-08-31), since the confirmed audience is general rather than students. The UI, the settings labels, and the storage keys all use it.

**Known design-system gap:** the Comet text token (`#6b7284`) fails WCAG AA 4.5:1 against every surface in DESIGN.md's own palette — 4.06 on Void, 3.89 on Deep Space, 3.62 on Nebula. All readable text uses Moonlight instead; Comet survives only on non-text marks. Amending DESIGN.md would need roughly `#7a8296` to make a genuine third text tier viable.

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
