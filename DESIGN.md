# DESIGN.md — Orbit

> A personal-growth workspace: a home for the tools you use to become who you're trying to be. Pomodoro, goals, calendar, skills, and more, living together under one calm night sky.

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
| Comet | `#6B7284` | Tertiary text, placeholders, timestamps, the quietest readable gray. |

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
Text:         Starlight #EEF1F8 · Moonlight #A7AEC0 · Comet #6B7284
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