# DESIGN.md — Orbit

> A personal-growth workspace: a home for the tools you use to become who you're trying to be. Dailies, goals, calendar, habits, and notes, living together under one calm night sky.

This document is the single source of truth for how the product looks and feels. Every tool and every page reads from it so the whole thing feels like one place, not five apps stapled together. When you ask an AI agent to build or change a surface, point it here first.

---

## 0. The two lanes: brand vs. product

This site has two kinds of surface, and they are styled to different rules. Getting this distinction right is what keeps the tools usable and the landing page compelling.

**Brand surfaces** — the landing page, about, onboarding, empty states, marketing. Their job is to make someone *feel* the vision and want in. More space, bigger type, more atmosphere, room for one orchestrated moment of motion.

**Product surfaces** — the actual tools: Pomodoro, goals, calendar, skills, dashboard. Their job is clarity and repeat use. Denser, quieter, faster, more information per screen, motion only in response to what the user does. A tool should never feel like an ad.

Rule of thumb: on a brand surface, the design can perform. On a product surface, the design gets out of the way. Both draw from the same palette, type, and spacing scale below — that shared foundation is what makes them feel like one product.

---

## 1. Visual theme & atmosphere

The feeling is **standing outside at night, looking up.** Calm, deep, quiet, and vast — but warm enough to want to stay. Not cold sci-fi, not a gaming HUD, not neon. Think a clear high-desert sky: near-black that's actually deep blue-violet up close, faint dust of stars, and starlight-white as the light that matters.

Mood: contemplative, focused, unhurried, a little bit awed.

The signature idea is **light against darkness** — starlight (white) is the hero, the dark is the stage. Color is used sparingly, like a planet or a nebula catching the eye in an otherwise monochrome sky. The restraint is the point.

Anti-mood: busy dashboards, rainbow charts, glassmorphism, glowing everything, "cosmic" clip-art of galaxies and rockets. The space theme is atmosphere, not decoration. No literal planets-and-stars imagery unless it's abstract and subtle.

---

## 2. Color palette & roles

The palette is mostly a grayscale of blue-tinted darks and starlight lights, with a single cool accent doing all the pointing. Never use pure black or pure white — both are always tinted toward the night-sky blue.

### Core (dark surfaces)

| Name | Hex | Role |
|---|---|---|
| Void | `#0A0C12` | Page background. The deepest layer. Deep blue-black, never `#000`. |
| Deep Space | `#0F1219` | Default surface — panels, tool frames, the layer content sits on. |
| Nebula | `#161A24` | Raised surface — cards, inputs, popovers. One step toward the light. |
| Horizon | `#222735` | Borders, dividers, hairlines. The faint edge where surfaces meet. |
| Dust | `#2C3242` | Hover/active surface tint, disabled fills. |

### Starlight (text & light)

| Name | Hex | Role |
|---|---|---|
| Starlight | `#EEF1F8` | Primary text and the brand "white." Warm-cool off-white, never `#FFF`. |
| Moonlight | `#A7AEC0` | Secondary text, labels, captions. |
| Comet | `#7A8296` | Tertiary text, placeholders, timestamps, the quietest readable gray. Darkened from the original `#6B7284` to clear WCAG AA (4.5:1) on all dark surfaces. |

### Accent — used sparingly

| Name | Hex | Role |
|---|---|---|
| Aurora | `#7C9CFF` | The one accent. Primary actions, active states, focus rings, key data. A cool periwinkle-blue — starlight with color in it. |
| Aurora Deep | `#5B78E0` | Aurora's pressed/hover state and gradient partner. |

### Functional (used only when meaning requires it)

| Name | Hex | Role |
|---|---|---|
| Meridian | `#5FD3A0` | Success, "break" / rest states, completion, positive streaks. |
| Solar | `#E8B366` | Warnings, attention, "focus" intensity, deadlines approaching. |
| Flare | `#E8796B` | Errors, destructive actions, overdue. Muted coral, not fire-engine red. |

**Color rules**
- Aurora is the *only* decorative-adjacent color. If everything is accented, nothing is. On any given screen, Aurora should point to the single most important action or the live/active thing — rarely more than one or two places.
- Functional colors carry meaning, never decoration. Green means done/rest, not "here's a nice green button."
- No gradients as background wash. The one permitted gradient is a very subtle Aurora→Aurora Deep on a primary CTA or the active timer ring, and even that is optional.
- Text on dark: Starlight for anything you must read, Moonlight for support, Comet for the almost-invisible. Never put Comet on Nebula for anything important — contrast fails.
- Never gray text on a colored fill. If a surface is Aurora, its text is Void.

---

## 3. Typography

Two families, clearly distinct. One carries personality (display), one disappears into readability (body/UI).

**Display — `Space Grotesk`**
Used for: the landing hero, page titles, big numbers (timer, streak counts, stats), section headers on brand surfaces. It has a subtle mechanical, astronomical-instrument character that fits the theme without being a costume. Weights: 500, 600, 700.

**Body & UI — `Inter Tight`**
Used for: all product-surface text, body copy, buttons, labels, form fields, tool content, navigation. Chosen over plain Inter deliberately — slightly narrower, a touch more character, still invisibly readable at small sizes. Weights: 400, 500, 600.

> Why not just Inter: Inter-for-everything is the single most common tell of a generated app. Inter Tight keeps the neutrality where you need it while stepping half an inch away from the default.

**Optional mono — `JetBrains Mono`**
Only for genuinely tabular/technical data: time-of-day readouts, durations, keyboard shortcuts. Not for decorative labels. If you're reaching for mono to look "techy," don't.

### Type scale

Based on a major-third-ish progression. Display sizes are for brand surfaces and hero numbers; product surfaces mostly live in the body range.

| Token | Size / line-height | Family / weight | Use |
|---|---|---|---|
| Display XL | 72 / 1.05 | Space Grotesk 600 | Landing hero, the timer's big number |
| Display L | 48 / 1.1 | Space Grotesk 600 | Page titles on brand surfaces |
| Display M | 32 / 1.15 | Space Grotesk 500 | Tool titles, section heads |
| Title | 22 / 1.25 | Inter Tight 600 | Card titles, panel headers |
| Body L | 17 / 1.6 | Inter Tight 400 | Landing body, reading text |
| Body | 15 / 1.55 | Inter Tight 400 | Default UI text |
| Label | 13 / 1.4 | Inter Tight 500 | Buttons, form labels, metadata |
| Caption | 12 / 1.4 | Inter Tight 400 | Timestamps, helper text, the fine print |

**Type rules**
- Sentence case everywhere. No ALL-CAPS labels — they're a generated-page tell and they fight the calm.
- Don't accent a single word in a headline (no one word in Aurora or italic). If a headline needs emphasis, rewrite it.
- No tracked-out eyebrow labels floating above headings. If a section needs a label, it earns it by being genuinely a category, and it's set as quiet Moonlight body, not decorative uppercase.
- Line length caps around 70 characters for reading text.
- Big numbers (timer, stats) use `font-variant-numeric: tabular-nums` so they don't wobble as digits change.

---

## 4. Component styling

Components share one language across every tool. States are explicit — a user should always know what's interactive, what's active, and what just happened.

### Buttons

**Primary** — Aurora fill, Void text, weight 500. Border-radius 12px. The one high-emphasis action per view. Hover: lift to Aurora Deep. Pressed: settle, no bounce.

**Secondary** — transparent fill, Horizon 1px border, Starlight text. Hover: fill to Dust. For the second-most-important action (Reset, Cancel).

**Ghost / icon** — no border, Moonlight icon, transparent. Hover: Nebula fill, Starlight icon. For toolbar and utility actions (settings, mute).

**Destructive** — Flare text on transparent, Flare border on hover. Confirmation required for anything irreversible.

All buttons: comfortable hit target (min 40px height, 44px on touch), no drop shadows, no gradient unless it's the single permitted Aurora CTA.

### Cards & panels

The frame every tool lives in. Nebula surface, Horizon 1px border, border-radius 16px, generous internal padding (24px desktop). **No nested cards** — a card inside a card is a structural smell; use spacing and a hairline divider instead. **No drop shadows** for elevation on dark; elevation is communicated by getting lighter (Deep Space → Nebula → Dust), not by shadow. A very soft, large-radius glow is permissible *only* around a genuinely live element (the running timer ring), never as default card decoration.

### Inputs & forms

Deep Space fill (recessed, darker than its surroundings — inputs are holes you type into, not raised buttons), Horizon border, border-radius 10px, Starlight text, Comet placeholder. Focus: border becomes Aurora, plus a 2px Aurora focus ring at low opacity. Labels sit above in Label style, Moonlight. Numeric entry (durations, counts) is a plain typed field — no spinner up/down arrows.

### Navigation (the app shell)

Because this is a multi-tool product, the shell is a first-class component. A persistent left rail (desktop) / bottom bar (mobile) holds the tools. Each tool is an icon + label; the active tool is marked with Aurora (icon tint + a subtle Aurora indicator), inactive tools are Moonlight, hover brings them to Starlight. The rail sits on Deep Space, one shade off the Void page. Keep it narrow and quiet — it's a map, not a feature.

### Data & progress

Rings, bars, streaks: track in Horizon, fill in Aurora (or the relevant functional color — Meridian for rest, Solar for focus intensity). Rounded line caps. Motion is linear and honest (a timer ring drains at real speed). Numbers alongside are Space Grotesk, tabular.

---

## 5. Layout principles

**Spacing scale** (4px base): 4, 8, 12, 16, 24, 32, 48, 64, 96. Use these steps, don't freehand values. Tools tend to live in the 16–32 range; brand surfaces open up into 48–96.

**Density by lane.** Product surfaces are efficient — a user opens the calendar to see the month, not to admire whitespace. Brand surfaces breathe — the landing page can spend a whole viewport on one idea.

**The shell.** Everything except the landing/marketing pages lives inside a consistent frame: the tool rail on one side, a top strip for context (current tool name, date/time, account), and the tool's own canvas filling the rest. Tools own their canvas but never the chrome — that stays identical everywhere, so moving between Pomodoro and goals feels like changing rooms, not buildings.

**Alignment.** Product UI is predominantly left-aligned (scannable, honest). Center alignment is reserved for genuinely singular focal moments — the running timer, a completion state, the landing hero. Don't center paragraphs of text.

**Grid.** 12-column on desktop for brand pages. Tools use their own internal layouts but sit within a max content width (~1200px) so nothing sprawls on wide monitors. Full-bleed is allowed only for the timer's focus mode and the landing hero.

**Whitespace philosophy.** On dark, negative space isn't empty — it's the night sky, and it's doing work. Resist filling it. One clear thing per region beats four competing ones.

---

## 6. Depth & elevation

Elevation on a dark theme is built with **light, not shadow.** The closer a surface is to the user, the lighter it gets.

| Level | Surface | Used for |
|---|---|---|
| 0 | Void `#0A0C12` | The page itself |
| 1 | Deep Space `#0F1219` | The shell, the base canvas |
| 2 | Nebula `#161A24` | Cards, panels, the resting content layer |
| 3 | Dust `#2C3242` | Popovers, menus, modals, hover states |

Borders (Horizon) define edges where two surfaces meet at the same level. Shadows are essentially unused; the one exception is a soft ambient glow around a live/active element (running timer), rendered as a radial Aurora bloom at low opacity — and it fades to transparent, never a hard-edged box. A modal dims everything behind it with a Void overlay at ~60% rather than casting a shadow.

---

## 7. Do's and don'ts

**Do**
- Let starlight (Starlight/Moonlight text) carry the design; let Aurora point to the one thing that matters.
- Keep the shell identical across every tool so the product feels like one place.
- Use functional color only for meaning (done, rest, warning, error).
- Build elevation with lighter surfaces, edges with hairline borders.
- Respect the brand/product lane when deciding density, type size, and motion.
- Make every interactive element show a clear hover, focus, active, and disabled state.
- Write in plain sentence case; name tools by what they do.

**Don't**
- No pure black (`#000`) or pure white (`#FFF`) — always the tinted versions.
- No ALL-CAPS labels, no tracked-out eyebrows, no single-word headline accents.
- No Inter-for-everything; body/UI is Inter Tight, display is Space Grotesk.
- No nested cards, no card-on-everything, no drop-shadow elevation.
- No gradient background washes; no glassmorphism; no glow as default decoration.
- No literal galaxy/rocket/planet clip-art. The theme is atmosphere, not stickers.
- No rainbow data viz — chart colors come from the functional palette, used meaningfully.
- No scattered fade-in-on-scroll on every section; motion is earned, not sprinkled.
- No bounce/elastic easing — it reads dated and undercuts the calm.

---

## 8. Motion

Calm and physical. Motion exists to show change, not to entertain.

- **Easing:** ease-out for entrances, ease-in-out for state changes. Never bounce or elastic.
- **Duration:** 150–250ms for UI feedback (hover, press, toggle), 300–500ms for larger transitions (opening a tool, a modal). Progress motion (timer) runs at true real-world speed, linear.
- **The one orchestrated moment:** the landing page may have a single, deliberate load sequence — e.g. starlight fading up out of the dark, or the hero number settling in. One moment, not a cascade.
- **In-product motion is reactive only:** things move when the user acts (a panel opens, a task checks off, a phase changes). No ambient animation running while someone is trying to focus. The Pomodoro's focus mode should be nearly still — that's the point.
- **Respect `prefers-reduced-motion`:** everything non-essential drops to a simple fade or nothing.

---

## 9. Responsive behavior

- **Breakpoints:** mobile < 640, tablet 640–1024, desktop > 1024.
- **The shell adapts:** left tool rail on desktop becomes a bottom tab bar on mobile. Top context strip collapses to just the essentials.
- **Touch targets:** minimum 44×44px on touch devices.
- **Tools reflow, they don't shrink-to-fit:** a calendar month view becomes an agenda list on mobile rather than a squished grid. The timer scales its ring to the viewport but keeps the number legible.
- **Reading text** stays within its ~70-char measure at every size; it doesn't stretch edge to edge on wide screens.
- **The landing hero** is designed mobile-first for impact, then given room to breathe on desktop — not a desktop layout crammed down.

---

## 10. Agent prompt guide

**Quick color reference**
```
Backgrounds:  Void #0A0C12 · Deep Space #0F1219 · Nebula #161A24
Edges/tints:  Horizon #222735 · Dust #2C3242
Text:         Starlight #EEF1F8 · Moonlight #A7AEC0 · Comet #7A8296
Accent:       Aurora #7C9CFF · Aurora Deep #5B78E0
Functional:   Meridian #5FD3A0 (rest/done) · Solar #E8B366 (focus/warn) · Flare #E8796B (error)
Type:         Space Grotesk (display) · Inter Tight (body/UI) · JetBrains Mono (data only)
```

**Starter prompts**
- *New tool:* "Build the [goals] tool as a product surface per DESIGN.md. It lives inside the app shell, uses Nebula cards on the Deep Space canvas, Aurora for the single primary action, Inter Tight throughout. Dense and quiet, left-aligned, reactive motion only."
- *Landing page:* "Design the landing hero as a brand surface per DESIGN.md. Space Grotesk Display XL, one orchestrated load moment, starlight-on-void, a single Aurora CTA. Make someone feel the calm before they see a single feature."
- *Consistency check:* "Audit this screen against DESIGN.md: pure-black/white usage, nested cards, ALL-CAPS labels, Inter-instead-of-Inter-Tight, shadow elevation, and whether Aurora is pointing at more than one thing."

**The one-line brief, if an agent reads nothing else:**
> Standing under a clear night sky: deep blue-black surfaces, starlight-white text, one cool periwinkle accent for the thing that matters. Space Grotesk for the big moments, Inter Tight for everything you actually use. Calm, quiet, dense where it's a tool and open where it's a pitch. The dark is the stage; the light is the point.

---

## 11. Tool specifications

The product's tools and the model they share. This section is the source of truth for *what each tool is*; sections 1–10 govern *how it looks*. All tools are product surfaces (section 0) unless noted. Build order follows Principle 5 — one tool fully before the next — in the sequence listed here.

### The shared model

A few concepts are common across tools. Defining them once keeps the tools coherent (Principle 1).

**Daily** — a recurring intention measured in focus sessions. Has: a title, a **target number of sessions per scheduled day**, a **recurrence** (every day, or specific weekdays), a **color** (from the Daily palette below), and an optional **parent goal**.

The target is per day, and it resets. "Two sessions of piano, every Mon/Wed/Fri" asks for two on each of those days; the next scheduled day starts at zero regardless of what happened on the last one. Completing a focus block credits the active daily; a daily is done for a day once that day's sessions reach its target, and it is done *for that day only*. There is no backfilling a missed past day, because honest history matters more than a tidy grid (Principle 4).

**Completion is counted, not stored.** It comes out of the session log, which already records when every focus block finished and which daily it counted toward. A `done` flag beside that would be a second copy of the same fact, free to drift from it.

The one exception is work done **away from the timer** — you meditate, you read before bed, and the log cannot know. So a daily can also be **marked done by hand for today**. That mark is the only thing about a daily's completion that is recorded, and it is recorded because nothing else in the product knows it: it is additional information, not a duplicate. It is a per-day boolean and nothing more — no counts, no partial credit, gone tomorrow. It is emphatically not the old lifetime `done` flag returning; that one was permanent and retired the record.

Marking follows the same rule as everything else here: **today only.** A day that has passed cannot be marked, and cannot be unmarked either — withdrawing a claim after the day is over is editing history just as much as adding one.

Which of the two finished a day is kept, because the calendar draws the difference and a streak resting on hand marks alone ought to be visible as one.

*This supersedes the lifetime model inherited from the old Goals tool* (2026-08-31), where `target` was a total to bank toward across all time and `done` was a permanent, hand-settable flag that retired the record. Lifetime targets with sessions banked toward them are goals, not dailies. Existing records are migrated rather than reinterpreted: the per-day target resets to 1 and everything the old record claimed is preserved inert alongside it, since reading "20 sessions in total" as "20 sessions every day" would leave an intention that can never be met again.

Formerly called "Goals"; renamed to **Dailies** so the word "goal" can mean the longer-horizon thing below.

**Goal** — a weekly or monthly intention, checked off **by hand**. A goal is a container: dailies can nest under a weekly goal, and weekly goals under a monthly goal. Progress of children is *shown* but never auto-completes the parent — the person decides when a goal is done. Goals are not measured in sessions; they're measured in judgment. The tool's job is to make that judgment informed, not to nag.

**Habit** — not a thing you create. A habit is the streak-and-consistency *view* of a daily that recurs. The Habits tool is read-only: it reflects the recurring dailies you already have. You change your habits by changing your dailies, not by editing a habit list.

**Session log** — the existing append-only record (see PRODUCT.md). Everything above reads from it. Unchanged.

### The Daily color palette

Dailies carry a color so the calendar can show, at a glance, *which* intentions a day held. With many dailies, a free color picker would turn the calendar into confetti and break "no rainbow data viz" (section 7). So dailies choose from a **fixed set of eight muted, night-sky-compatible hues** — each legible as a small dot on Void, none fighting Aurora for attention:

```
Periwinkle  #7C9CFF   (= Aurora; the default)
Seafoam     #5FD3A0   (= Meridian)
Amber       #E8B366   (= Solar)
Coral       #E8796B   (= Flare)
Lilac       #A98BE0
Sky         #6BB6D6
Sage        #9DC183
Rose        #D98BA6
```

These are deliberately desaturated and equal in weight — no single one dominates. The person picks one per daily; if they don't, it defaults to Periwinkle. Chart and dot fills come only from this set.

### Tool: Dailies  *(build first — rename + recurrence)*

The renamed, extended version of today's Goals tool. Everything the current tool does, plus:
- A **recurrence** control on create/edit: "every day" or a weekday picker (S M T W T F S as toggle chips, Aurora when on).
- A **color** swatch picker from the eight-hue palette.
- A **per-day target**: how many sessions this daily asks for on each day it repeats. Labelled as such, and small — a double-digit daily target is an implausible day.
- An optional **parent goal** selector (populated once the Goals tool exists; absent until then).
- The list groups by "today's dailies" (those recurring today, front and center) and "all dailies" below. Only today's count toward the timer and can be completed today.
- Today's progress bar empties again tomorrow — it shows the day, not a lifetime.
- Keep the nine-second undo on delete and the teaching empty state.
- A check control for today only, for work done away from the timer. It appears while today is unfinished and withdraws once the sessions themselves finish it — there is nothing to unmark then, because the mark is not what is holding it up. The row says which happened ("Marked done today" vs "Done today · 2 sessions") rather than flattening them.
- The old hand-settable lifetime "done" and the target-below-banked rule went with the lifetime model; this replaces neither.
- A daily carried over from that model shows a quiet note saying what it used to claim, until the person resolves it by editing the daily.

Visually: Nebula cards on the Deep Space canvas, one primary action (add a daily) in Aurora, the color swatch as the only other color per row, recurrence shown as a quiet Moonlight line ("every day", "Mon · Wed · Fri"). Left-aligned, dense, calm.

### Tool: Calendar  *(build after Dailies)*

One large month view; the current month by default; today clearly marked (an Aurora ring on the date number, not a filled cell — the day is *indicated*, not *shouted*). Month navigation is quiet arrows; a "today" affordance returns from wherever you've browsed to.

Each day cell shows a small row of **colored dots**, one per daily that day holds something for — a focus session credited to it, a hand mark, or both — in that daily's color. The color is the identity; the **ink is the outcome**:

| Mark | Meaning |
|---|---|
| **solid** ● | the day's target was met in logged sessions |
| **donut** ◉ | complete, but the hand mark is what got it there |
| **ring** ○ | worked, not finished |
| nothing | nothing |

More ink means more done, in that order. Solid-versus-donut is a close-up distinction, not a glance one: at month scale both read as "done", which is the honest headline — you did meditate. The provenance is there when you look, stated plainly in words in the hover label and the day panel ("marked done"), never with anything that scolds.

Dots are built from the **union** of the log and the hand marks, never the log alone — a daily finished off-timer would otherwise leave its day looking untouched, the exact failure this section's honesty rule exists to prevent. Hovering (or tapping, on touch) a dot names the daily and how the day went ("Piano · 1 of 2", "Meditate · marked done"). A day with nothing completed is not empty-looking-broken — it draws its baseline quietly, so gaps read as days-not-worked, not as missing data (the Activity tool's honesty principle, applied here).

The calendar is a *reader*, not a scheduler: it visualizes the session log and daily completions. It does not let you create or complete things directly (that's the Dailies tool's job) — clicking a day can reveal what happened that day, but the calendar never becomes an input surface. This keeps the shell's tools single-purpose.

Responsive: the month grid becomes a vertical agenda list on mobile (section 9) — each day a row, its dots inline — rather than a squished 7-column grid.

### Tool: Goals  *(build after Calendar)*

The longer-horizon tool. Two sections, **This week** and **This month**, each a list of hand-checked goals. Creating a goal: a title, a horizon (weekly/monthly), and optional children.

Nesting is the heart of it. A weekly goal can hold dailies; a monthly goal can hold weekly goals. Under each goal, its children are listed with their own state, and a quiet progress line summarizes them ("3 of 5 done" in Moonlight, never a loud progress bar demanding completion). Checking the parent is always a deliberate hand action — Aurora check control — and is never triggered automatically by the children, nor blocked by them (you can call a goal done with children unfinished; that's your call).

Editing a daily from here is allowed — the Goals tool can open a daily's edit inline — so the person doesn't have to bounce to the Dailies tool to re-parent or adjust. Dailies still *live* in the Dailies tool; Goals just gets a window into them.

An unfinished goal at week/month end doesn't scold. It stays until the person resolves it (checks it, deletes it, or carries it forward) — no automatic archiving, no red overdue state unless the person set a hard date. Calm over pressure (Principle 3).

**As built** (2026-08-31), four decisions the spec above left open:

- **"This week" and "This month" are horizons, not date windows.** A goal written three weeks ago and never checked still sits under "This week". This is what "it stays until the person resolves it" requires: filtering by date would be the automatic archiving the paragraph above forbids, wearing a different hat.
- **No due dates, so nothing is ever red.** The "unless the person set a hard date" clause describes a feature that does not exist, so the overdue state it licenses cannot occur. If hard dates ever ship, that is where Flare would be earned.
- **A weekly goal's progress line counts today**, because its children are dailies and a daily is only ever done for a day. It counts only the children today actually asks for — a daily that doesn't recur today is owed nothing and stays out of the denominator rather than being counted as a miss. With none scheduled, the line reads "Nothing scheduled today". A monthly goal's line counts the plain `done` of the weekly goals under it.
- **A goal's horizon is fixed once created.** Changing it would strand children pointing at a parent that can no longer hold them, and silently orphaning someone's structure is worse than asking them to make a new goal.

### Tool: Habits  *(build after Goals)*

A read-only reflection of the recurring dailies. For each recurring daily: its name, its recurrence, its current streak, and a compact consistency strip (the last several weeks as a row of marks — filled in the daily's color on days it was completed, faint Horizon on scheduled-but-missed, nothing on days it wasn't scheduled). No create, no edit, no delete — a line of Moonlight copy explains that habits come from recurring dailies and links to the Dailies tool.

**As built** (2026-08-31), two things the spec above left open:

- **A fourth mark state.** Today, scheduled, not yet done is neither *done* nor *missed*: it is **open**, drawn hollow. Drawing it faint like a miss would have the strip contradict the run counted at the end of the same row, since an unfinished today never ends a run. Days before the daily was created draw as nothing, for the same reason the streak walk stops there — an intention cannot have been missed before it was written down.
- **The window is four weeks**, the same span the Activity chart covers, so both reflection surfaces answer "the last four weeks" rather than each picking their own idea of recent.

The streak rule, stated once: walking back from today, an unscheduled day is skipped entirely — neither a hit nor a miss, because nothing was asked for. A scheduled day that is **over** and carries no completion ends the run. An unfinished **today** is skipped rather than counted against you. This is the same rule the Activity tool follows when it steps past an empty today before counting a streak.

The point is a single honest answer to "which of my intentions am I actually keeping." It rewards nothing by being opened more often (Principle 2) — it's a mirror, not a scoreboard.

### Tool: Notes  *(build last — largest, most independent)*

A Notion-like hierarchical writing space. Structure, three levels the person can extend:
- **Notebooks** — the top level, shown first when the tool opens (think shelves).
- **Pages** — live inside notebooks, and inside other pages: a page can hold **sub-pages to arbitrary depth**. A left tree (collapsible) navigates the hierarchy; the current page fills the canvas.
- Everything — notebook names, page titles, sub-page titles — is **renameable inline**.

The editor is genuine rich text: **headings (a couple of levels), paragraphs, and bullet lists** at minimum, entered fluidly (a clean toolbar or markdown-style shortcuts, whichever reads calmer). Create a new note, a new sub-page under any page, save, and reopen — all frictionless. Ease of use is a stated requirement: creating and moving between notes should feel weightless.

**Honesty constraint (important):** like every Orbit tool, Notes persists to `localStorage` only — per-browser and losable (Principle 4, hard constraints in PRODUCT.md). Notes is the tool where that hurts most, because people trust a notes app with things they don't want to lose. So Notes **must** carry a plain, visible affordance to **export** (download all notes as a file — Markdown or JSON) and ideally **import** it back. The design states the local-only nature quietly but clearly rather than implying cloud durability it can't provide. This isn't optional polish; it's the tool being honest about what it is.

Visually Notes leans slightly toward the calmer, more spacious end of the product lane — it's a reading and writing surface, so its measure stays within ~70 characters (section 9), its type is comfortable (Body L for note content), and its chrome is minimal. Still product, not brand: no performance, just a quiet place to write. The tree, the page, and the editor are all Deep Space / Nebula surfaces with Horizon dividers; Aurora marks only the current page in the tree and the single primary "new" action.

### Cut: Skills

Considered and cut (2026-08-31). A hand-maintained list of "skills I have" is a static inventory that doesn't connect to the practice — it rewards no real progress and risks becoming dead weight (Principle 2). If a sense of "what am I getting better at" is wanted later, it should *emerge* from where focus was actually spent (goals and dailies invested in over time), not from a list the person curates. Not on the roadmap.

### Roadmap summary

| Order | Tool | Nature | Depends on |
|---|---|---|---|
| 1 | **Dailies** | Rename of Goals + recurrence + color + parent slot | — |
| 2 | **Calendar** | Read-only month view of completed dailies | Dailies (recurrence, color) |
| 3 | **Goals** | Weekly/monthly, hand-checked, nesting | Dailies (for children) |
| 4 | **Habits** | Read-only streak view of recurring dailies | Dailies (recurrence) |
| 5 | **Notes** | Notion-like hierarchy + rich text + export | — (independent) |

Existing tools — Timer, Activity, the shell, the session log — are unchanged except that Dailies replaces Goals in the rail and anywhere "goal" was shown for the session-counting thing.