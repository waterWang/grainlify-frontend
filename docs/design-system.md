# Dashboard design system

How the Aceternity-derived visual language is applied across the product. Read
the hard constraint first; the tier table is the easy part.

---

## Hard constraint: no animation inside glass

**Nothing inside a `backdrop-blur` surface may animate. Any tier, no
exceptions — including hover effects and CSS transitions.**

If a surface needs motion, the moving element goes *outside* the blurred
container, or the container gives up its blur.

### Why — the mechanism

This is not a stylistic preference, and it will look like one if the reason
isn't attached, so here it is.

A backdrop filter samples whatever is painted behind the element and blurs that
sample. The sample is only valid while nothing behind or within the element
changes. Change anything inside a blurred panel — a pixel of opacity on a
two-pixel ring — and the sample is invalidated, so the browser recomputes the
blur across the **entire panel**. At 60fps, a decorative pulse in the corner of
a banner means re-blurring that whole banner sixty times a second.

The cost does not scale with the size of the thing animating. It scales with
the size of the glass.

### What it cost us, measured

Two 2px rings pulsing opacity inside Discover's GrainHack banner, on a
4x-throttled CPU:

| | Idle FPS | Janky frames |
|---|---|---|
| Rings pulsing | 38.4 – 42.6 | 5 – 9 |
| Rings static | 119.6 – 120.6 | 0 |

Two thirds of the idle frame budget, for an effect most people would not
notice was gone. It was removed in commit `6eeaa7b`.

### The wrong diagnosis, recorded so it isn't repeated

The first explanation was that scaling a bordered element forces its border to
be re-rasterised at each new size. That is true, and it is why the original
`transform: scale` version was the worst of the three. But switching to opacity
appeared to fix it and did not — the "fixed" reading was taken straight after
the edit with nothing to compare against, and was measuring a state where the
rings had been switched off entirely by a previous experiment.

Two lessons, both cheap:

- Toggle the thing you are blaming on and off against an otherwise identical
  page. A single post-change reading proves nothing.
- If an animation is inside glass, suspect the glass first, whatever property
  is being animated.

### What this permits

- Motion **outside** blurred panels: page-level entry animations, the sidebar,
  buttons that are not inside a glass card.
- **One-shot entry** animations on the glass element itself (a card fading in
  on mount). The cost is transient and bounded; the rule targets persistent
  animation.
- Anything at all on a surface with no `backdrop-blur`.

---

## Colour

Shared design components carry no colour. Every value comes from a `--brand-*`
custom property in `src/styles/brand.css`, which flips under `.dark`.

The shadcn-style tokens in `theme.css` are **not** a usable source: nothing
reads them, and their dark values disagree with the product (`--primary` is
white in dark mode, `--muted-foreground` is pure white). Reading them produces
a dark theme that is broken while looking correct in light. See the header
comment in `brand.css`.

Enforced by `brandTokens.test.ts`.

---

## Tiers

Treatment follows what a page is *for*, not how important it is.

### Tier A — Hero. Animated backgrounds permitted.

Landing, Sign in, Sign up, Discover.

Aurora and grid treatments, recoloured to brand tokens. Sign in and sign up are
**static only** — no motion behind a form.

### Tier B — Browse. Static grid, glass cards, spotlight hover.

Browse, Ecosystems (+ detail), Contributors, Open-Source Week (+ detail),
Leaderboard, Maintainers, Org profile, Profile, Search, GrainHack rules, Blog.

Scannable surfaces. Static `GridBackground`, glass panels, `SpotlightCard` on
card grids, shared section headers. No animated backgrounds: people are reading
a list to find something, usually their own name.

### Tier C — Working. Quiet.

Issue detail, Project detail, My GrainHack, Settings.

Spacing, typography, hover states. No background treatment behind text people
read or forms they fill in.

### Tier D — Admin. Plainest.

Admin, GrainHack admin, Data.

Flat surfaces, tighter density, no glass, no grid. It should read as a control
panel, not a launch page.

---

## Components ruled out

Not taste — each has a concrete reason.

| Component | Reason |
|---|---|
| Sparkles | Canvas-based via `@tsparticles`; a new dependency plus a per-frame canvas loop |
| Background Boxes | Renders a 150×100 grid — roughly 15,000 DOM nodes for a hover effect |
| Link Preview | Requires `next/image` and an external screenshot API; this is Vite, not Next |

---

## Verifying a page

Per page, before commit:

1. Screenshots at desktop (1440) and mobile (390), both themes.
2. FPS idle and while scrolling, CPU throttled 4x, **A/B against the previous
   commit** — not a single reading.
3. `prefers-reduced-motion` honoured.
4. Existing accessible names unchanged.
5. Same data, same props, tests passing.
