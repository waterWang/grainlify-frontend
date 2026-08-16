# Dashboard design system

*Last updated: 16 August 2026*

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

And that was the *small* case. **The Leaderboard was carrying 55 infinite
animations, 71 of them inside backdrop-blur surfaces, and sat at 16 FPS idle
and 15 FPS scrolling.** Thirty-five twinkling dots, four pulsing glow blobs and
three floating rings, all inside the hero's blurred panel, plus thirty falling
petals rebuilt every fifteen seconds.

That is the number to remember before adding one back. No single animation
there was expensive. The page was unusable because fifty-five cheap ones were
each multiplying the cost of the glass they sat in — which is why the rule is
categorical rather than a budget.

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

## Card surfaces: `solid` is the default, and why

`GlassCard` defaults to `tone="solid"` — the translucent card without a
backdrop filter. Real glass is Tier A only.

**The reason is not that blur is expensive.** Blur is expensive, but that alone
would not settle it; plenty of worthwhile effects cost something. The reason is
that on these pages **the blur has nothing to blur.**

A backdrop filter samples what is painted behind an element and smears it. That
is only visible when what is behind it has detail — an image, a photograph, a
busy gradient, overlapping content scrolling past. Behind our Tier B panels is
a flat two-stop gradient. The filter was sampling a near-solid colour and
producing a near-solid colour, at 40px, every frame.

So the condition, stated so it can be re-evaluated rather than obeyed:

> Use real glass where there is detail behind the panel worth blurring.
> Everywhere else the filter is invisible and should be dropped.

If someone later puts a photographic or heavily-patterned background behind a
Tier B page, **this rule stops applying to that page** and `tone="glass"` may
be the right call again — measure it. The rule is a conclusion drawn from a
condition that currently holds, not a prohibition on a technique.

### The evidence

Scroll FPS at 4x CPU throttle, blur dialled at runtime on an otherwise
identical DOM:

| | current (40px) | 8px | outer panels only | none |
|---|---|---|---|---|
| Discover | 26.8 | 38.7 | 39.3 | **120.0** |
| Leaderboard | 21.2 | 33.4 | 29.1 | **85.8** |

Lightening the blur or un-nesting it buys ~45%. Removing it is 4x. It was the
largest single cost on both pages — larger than everything else combined.

Visually, with the filter removed, mean per-channel difference was 3.9 (light)
to 18.9 (dark).

### A trap in comparing them

The first side-by-side appeared to show the glass panel looking warmer and
richer. It did not. The page background has an aurora hotspot in one corner,
and the glass panel happened to sit under it. Swapping the two panels swapped
the warmth with them.

If you are comparing two surface treatments over a non-uniform background,
swap their positions and shoot again. A difference that moves when you move the
panels is a property of the background, not of the treatment.

## Colour

Shared design components carry no colour. Every value comes from a `--brand-*`
custom property in `src/styles/brand.css`, which flips under `.dark`.

The shadcn-style tokens in `theme.css` are **not** a usable source: nothing
reads them, and their dark values disagree with the product (`--primary` is
white in dark mode, `--muted-foreground` is pure white). Reading them produces
a dark theme that is broken while looking correct in light. See the header
comment in `brand.css`.

Enforced by `brandTokens.test.ts`.

### Gold as text: three tokens, three grounds

Gold-as-a-surface and gold-as-text are different problems, and gold-as-text on
a *warm panel* is a third one. All three values are measured, not chosen.

| Token | Light value | Use it for |
| --- | --- | --- |
| `--brand-gold` | `#c9983a` | Gold **surfaces**. Fails as text at every body size (2.48 on a near-white page). |
| `--brand-gold-text` | `#7d5c20` | Gold **text on a near-white page**. Measures 5.54 there. |
| `--brand-gold-text-deep` | `#5c4214` | Gold **text on the warm panels** — modals, glass cards. |

`--brand-gold-text` is not a safe default for everything. It was calibrated
against a near-white page; on a modal panel (sampled at `rgb(212,197,176)`) the
same value measures **3.63** and fails. `--brand-gold-text-deep` measures 5.53
there.

Not `#6b4e18`, which gives 4.55. Clearing a 4.5 threshold by 0.05 is the kind
of miss that survives review because it looks fine, and this palette has
already shipped one at 4.36.

In dark mode both flip to values that already pass; the rule is to change what
fails, not everything nearby.

### Measuring contrast: resolve colours, don't parse them

**Any check that reads a Tailwind palette class must resolve the colour through
a canvas, not parse the string.**

Tailwind v4 emits `oklch()`. A regex that reads those three numbers as sRGB
returns a confident, completely wrong ratio — it reported **11.03** for a pair
that actually measured **2.43**, and **1.04** for one that measured **4.71**.
It flattered one theme and condemned the other, and either number could have
sent somebody to fix the wrong thing.

```js
// Let the browser do the conversion; the input format stops mattering.
const c = document.createElement('canvas'); c.width = c.height = 1
const x = c.getContext('2d')
x.fillStyle = getComputedStyle(el).color
x.fillRect(0, 0, 1, 1)
const [r, g, b] = x.getImageData(0, 0, 1, 1).data
```

Two further rules learned the hard way:

- **Sample the painted pixel for the background.** Hide the glyphs, screenshot,
  read the pixel back. Tailwind compiles gradients to
  `var(--tw-gradient-stops)`, so a style-walker finds no colour at all, and
  translucent surfaces composite with whatever is behind them.
- **A check must be able to prove it measured the right element.** A selector
  that matched a different `<span>` once returned a plausible ratio and
  reported PASS for something it never touched. Assert the sampled element
  carries the class you expect before reporting a number.

The generated brand assets (`scripts/social-cards/`) are the exception: they
read hex from `brand.css`, which contains no `oklch`, and compare hex to hex.

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

## Pre-existing brand inconsistencies

Noticed during the sweep, deliberately **not** fixed inside unrelated commits.
Collected here to be taken as one pass, so the decisions are made together
rather than piecemeal.

| Where | What | Note |
|---|---|---|
| Ecosystems cards | Avatar tiles render in random purple / cyan / red / green, derived from the ecosystem name | Off-brand against the warm gold palette. Deriving a colour from a name is reasonable; deriving it from the *whole* hue wheel is not |
| `theme.css` shadcn tokens | `--primary` is white in dark mode, `--muted-foreground` is pure white, `--border` is solid gold | Defined, wrong, and read by nothing. See `brand.css` header |
| `AdminPage` | Renders "Admin Page - Content to be implemented" | A placeholder reachable from the admin view |
| GrainHack card (Discover) | Titled "Join the GrainHack", button navigates to the Open-Source Week page; the sidebar lists both as separate destinations | Copy was fixed; the routing conflation was not |

## Modals render through a portal

`Modal` calls `createPortal(..., document.body)`. This is load-bearing, not
tidiness.

`position: fixed` is viewport-relative **only while no ancestor establishes a
containing block**, and `transform`, `filter`, `backdrop-filter`,
`perspective`, `will-change` and `contain` all establish one. This app paints
glass everywhere — AdminPage alone wraps its sections in eleven
`backdrop-blur-[40px]` cards — so a modal rendered inside one resolved `fixed`
against that card rather than the screen.

Measured on an 800px viewport, scrolled down:

| | backdrop | dialog panel |
| --- | --- | --- |
| inside a blurred ancestor | 1364px tall at y=250 | y=782 — **18px visible, 281px below the fold** |
| through the portal | 800px at y=0 | y=251, fully visible |

The CSS was already correct, which is what made this worth measuring. Offsets,
`z-index` or `top`/`left` would have moved the symptom around *inside the wrong
containing block* and looked fixed at whatever scroll position they were tested
at — and would have fixed one modal, when seventeen components render this one.

**If you add a `backdrop-blur`, `transform` or `filter` to a container, check
nothing inside it relies on `position: fixed`.** The failure is silent and
scroll-dependent.

---

## Components ruled out

Not taste — each has a concrete reason.

| Component | Reason |
|---|---|
| Sparkles | Canvas-based via `@tsparticles`; a new dependency plus a per-frame canvas loop |
| Background Boxes | Renders a 150×100 grid — roughly 15,000 DOM nodes for a hover effect |
| Link Preview | Requires `next/image` and an external screenshot API; this is Vite, not Next |

---

## The sweep

One row per page as it is done. Audit count is persistently-animated elements
found inside backdrop-blur surfaces by the runtime check, before any changes.
FPS is idle / scrolling, 4x CPU throttle, measured A/B against the previous
commit.

| Page | Tier | Offences before | FPS before | FPS after | Commit |
|---|---|---|---|---|---|
| Discover | A | 2 | 38 / 27 | 120 / 120 | `6eeaa7b` |
| Leaderboard | B | 71 | 16 / 15 | 121 / 122 | `1a33d5d` + richness |
| Browse | B | 0 | 120 / 40 | 120 / 120 | (this commit) |
| Ecosystems | B | 0 | 120 / 42 | 120 / 120 | (this commit) |
| Ecosystem detail | B | unverified | — | — | sweep (de-glassed, not measured) |
| Contributors | B | 0 | 120 / n/a | 120 / n/a | sweep |
| Open-Source Week | B | unverified | — | — | sweep (de-glassed, not measured) |
| OSW detail | B | unverified | — | — | sweep (de-glassed, not measured) |
| Maintainers | B | unverified | — | — | sweep (de-glassed, not measured) |
| Org profile | B | unverified | — | — | sweep (de-glassed, not measured) |
| Profile | B | unverified | — | — | sweep (de-glassed, not measured) |
| Search | B | 0 | 120 / n/a | 120 / n/a | sweep |
| GrainHack rules | B | unverified | — | — | sweep (harness could not render it) |
| Blog | B | **5** | **54 / 39** | 120 / 120 | sweep |
| Issue detail | C | — | — | — | — |
| Project detail | C | — | — | — | — |
| My GrainHack | C | — | — | — | — |
| Settings | C | — | — | — | — |
| Admin | D | — | — | — | — |
| GrainHack admin | D | — | — | — | — |
| Data | D | — | — | — | — |
| Landing | A | — | — | — | — |
| Sign in / Sign up | A | — | — | — | — |

Deltas marked *pre-paid* were partly earned by an earlier page: the shared
ProjectCard / OrganizationCard were de-glassed during Browse, so Discover,
EcosystemDetail and OrgProfile will show smaller numbers than the work they
actually received. A small delta there means the page was already fixed, not
that it needed nothing.

Browse is the useful counter-example to Leaderboard: **zero** animations, but
12 glass panels, and it still scrolled at 40 FPS. The two failure modes are
independent — a page can be quiet and still slow, so run the audit *and* the
FPS pass rather than treating a clean audit as a clean bill of health.

**`unverified` is not `0`.** A row marked unverified was de-glassed but never
run through the runtime audit, because the harness could not render it with a
realistic fixture. It is recorded that way on purpose: a table that reads clean
for a page that never rendered is the exact failure this document spends its
first section warning about. `n/a` in a scroll column means the page fits the
viewport and cannot be scrolled — also not a score.

Fill a row when the page lands. If the offence counts stop being interesting —
a run of pages at zero — that is the signal the remaining sweep is not paying
for itself, and worth saying so rather than finishing it out of tidiness.

## Verifying a page

Per page, before commit:

0. **Run the audit first, before changing anything**, and record the count. If
   Leaderboard had 55 animations, its neighbours were not written differently,
   and knowing the number up front beats discovering it mid-redesign.
1. Screenshots at desktop (1440) and mobile (390), both themes.
2. FPS idle and while scrolling, CPU throttled 4x, **A/B against the previous
   commit** — not a single reading.
3. `prefers-reduced-motion` honoured.
4. Existing accessible names unchanged.
5. Same data, same props, tests passing.

### Do not trust the overflow check on its own

`document.documentElement.scrollWidth > clientWidth` reports **false** while
content is visibly clipped, because clipping inside a container with
`overflow: hidden` never reaches the document. The Leaderboard podium was cut
off on both edges at 390px with that check reporting no overflow, and the
Discover greeting truncated a user's own name with the same check clean.

### The canonical example: measuring overflow when you meant clipping

`scrollWidth > clientWidth` does not mean "this content is clipped". It means
"this content is wider than the box". Those are the same thing only when the
box actually clips — on `overflow: visible` the content simply spills and stays
perfectly readable.

Used as a clipping check it fails in **both** directions:

- **False negative.** Content clipped inside an `overflow: hidden` child never
  widens the document, so the *document-level* check reads `false` while the
  Leaderboard podium is cut off at both edges and Discover truncates a user's
  own name.
- **False positive.** Applied to every element, it flagged four "clipped"
  podium columns that were `overflow: visible` and entirely on screen. I nearly
  went and fixed them.

The check now requires a non-visible overflow and reports which elements it
found, so the count can be judged rather than trusted.

This is the clearest instance of the shape all four share: **the check answered
a slightly different question than the one being asked, and the answer to the
wrong question looked like a pass.**

    intended question                 what was actually measured
    is anything clipped?              is the document wider than the viewport
    is anything clipped?              is any box narrower than its content
    does scrolling stay smooth?       how fast frames run while scrollBy no-ops
    did the page render correctly?    did a JS exception reach window.onerror
    what does this page do?           what does a file with that name contain
    is this host reachable?           what does an intercepted resolver claim

### The same shape, in reading code: follow the import, not the filename

Not a harness bug, but the identical failure: I checked a thing that answered a
slightly different question, and the wrong answer looked like confirmation.

Two files in this repo export `AdminPage`:

    src/features/dashboard/pages/AdminPage.tsx   2 lines, imported by nothing
    src/features/admin/pages/AdminPage.tsx       the real console, with
                                                 SocialFollowReview and
                                                 RedemptionsReview

I searched for the filename, opened the first hit, found
`"Admin Page - Content to be implemented"`, and concluded the admin page was a
placeholder. Dashboard.tsx line 61 says
`lazy(() => import("../admin/pages/AdminPage"))` — the other one.

On the strength of that I rerouted the ADMIN pill away from the console and
built an admin sidebar without an entry for it, which left social-follow proofs
arriving into a review queue with no reachable screen. The user found it, not a
test.

**The rule: follow the import, never the filename.** And when two files share an
export name, assume the one nothing imports is the one lying to you — dead code
is where stale content survives, precisely because nothing exercises it.

The tell was available and free: a two-line file confirmed a story I had already
formed, and I did not ask why a page in active use would be two lines long. A
result that agrees with you too easily deserves the same suspicion as one that
disagrees.

A second harness trap, same family: a page shorter than the viewport cannot
scroll, so `window.scrollBy()` does nothing and the scroll sample degenerates
into an idle sample reading a perfect ~120 FPS. Browse first measured
"120 FPS scrolling" for exactly that reason. The harness now checks
`scrollHeight > innerHeight` and reports *not scrollable* rather than a score.
Give the page realistic data volume before believing any scroll figure.

Both were caught by looking at the mobile screenshot. The check is worth
running — it catches genuine document-level overflow — but it is a floor, and a
green result is not evidence that the layout fits. Look at the picture.
