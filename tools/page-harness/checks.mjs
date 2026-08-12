/**
 * Browser checks for the per-page design sweep.
 *
 * Committed rather than rewritten per page, because every guard in here was
 * added after a check quietly reported success on something it could not
 * actually measure. Re-deriving the harness each time loses them.
 *
 * ## The rule these exist to enforce
 *
 * Before trusting a check, confirm it is capable of failing on this input.
 *
 * Audited against a page that renders nothing at all, every check below except
 * the screenshot returned a passing value:
 *
 *   document overflow      false  -> "no overflow"
 *   clipped children       0      -> "nothing clipped"
 *   pageerror listener     none   -> "no errors"
 *   reduced-motion count   0      -> "honoured"
 *   glass offences         0      -> "clean"
 *   infinite animations    {}     -> "quiet"
 *   idle FPS               ~120   -> "fast"
 *   scroll FPS             ~120   -> "fast"      (until guarded)
 *
 * Seven of eight. A harness that returns a perfect score for a blank page is
 * worse than no harness, because it produces confidence. So assertRendered()
 * is a precondition for all of them, and the individual guards below cover the
 * cases where a check can no-op on a page that *did* render.
 */

/**
 * Fail loudly unless the page actually rendered the thing under test.
 *
 * Catches: a crashed render, a stub missing an export, a dev-server error
 * overlay (which is a DOM element, not a pageerror — `PAGE ERRORS: none` was
 * reported for one of those once), and a fixture too thin to exercise the page.
 */
export async function assertRendered(page, { minText = 200, minElements = 40, mustContain = [] } = {}) {
  const state = await page.evaluate(() => ({
    text: document.body.innerText.trim(),
    elements: document.querySelectorAll('*').length,
    overlay: !!document.querySelector('vite-error-overlay'),
    html: document.body.innerHTML.slice(0, 300),
  }));

  if (state.overlay) throw new Error('page-harness: a Vite error overlay is on screen — the page did not build');
  if (state.elements < minElements)
    throw new Error(`page-harness: only ${state.elements} elements rendered (expected >= ${minElements}). Body: ${state.html}`);
  if (state.text.length < minText)
    throw new Error(`page-harness: only ${state.text.length} characters of text (expected >= ${minText}). The fixture is empty or the page failed to render.`);
  for (const needle of mustContain)
    if (!state.text.includes(needle))
      throw new Error(`page-harness: expected the page to contain ${JSON.stringify(needle)} and it does not`);

  return state;
}

/**
 * Persistently-animated elements inside backdrop-blur surfaces.
 *
 * The runtime companion to glassAnimation.test.ts, which parses one file at a
 * time and therefore cannot see composition across components. This reads the
 * real DOM. On Leaderboard it found 71 offences the static check could not.
 */
export async function auditGlass(page) {
  return page.evaluate(() => {
    const glass = [...document.querySelectorAll('*')].filter((e) => {
      const s = getComputedStyle(e);
      return (s.backdropFilter || s.webkitBackdropFilter || 'none') !== 'none';
    });
    const describe = (e) =>
      e.tagName.toLowerCase() +
      (typeof e.className === 'string' && e.className
        ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '');
    const offences = [];
    for (const g of glass)
      for (const d of g.querySelectorAll('*'))
        if (d.getAnimations().some((a) => a.effect?.getTiming?.().iterations === Infinity && a.playState === 'running'))
          offences.push({ glass: describe(g), child: describe(d) });

    const counts = {};
    for (const a of document.getAnimations())
      if (a.effect?.getTiming?.().iterations === Infinity && a.playState === 'running')
        counts[a.animationName || 'js-animation'] = (counts[a.animationName || 'js-animation'] || 0) + 1;

    return { glassElements: glass.length, offences: offences.length, examples: offences.slice(0, 5), infiniteAnimations: counts };
  });
}

/**
 * Frame timing. Returns null for the scroll sample when the page cannot
 * scroll, rather than a number.
 *
 * A page shorter than the viewport makes window.scrollBy() a no-op, so the
 * sample degenerates into an idle reading of ~120 FPS. Browse reported exactly
 * that before this guard, and it would have been recorded as "no work needed".
 */
export async function sampleFps(page, { ms = 3000, scroll = false } = {}) {
  if (scroll) {
    const scrollable = await page.evaluate(() => document.body.scrollHeight > window.innerHeight + 50);
    if (!scrollable) return null;
  }
  return page.evaluate(
    async ({ ms, scroll }) => {
      const frames = [];
      let last = performance.now();
      let stop = false;
      const tick = (t) => { frames.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      if (scroll) {
        const start = performance.now();
        while (performance.now() - start < ms) {
          window.scrollBy(0, 14);
          if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 5) window.scrollTo(0, 0);
          await new Promise((r) => requestAnimationFrame(r));
        }
      } else {
        await new Promise((r) => setTimeout(r, ms));
      }
      stop = true;
      const f = frames.slice(3);
      if (f.length < 10) return null; // too few samples to mean anything
      return {
        fps: +(1000 / (f.reduce((a, b) => a + b, 0) / f.length)).toFixed(1),
        jank: f.filter((x) => x > 50).length,
      };
    },
    { ms, scroll },
  );
}

/**
 * Layout checks. `documentOverflow` is deliberately reported alongside
 * `clippedChildren`, because on its own it is misleading: content clipped
 * inside an `overflow: hidden` container never reaches the document, so it
 * returns false while the Leaderboard podium was visibly cut in half.
 */
export async function auditLayout(page) {
  return page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    clippedChildren: [...document.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2).length,
  }));
}

export const fmt = (v) => (v === null ? '   n/a' : String(v.fps).padStart(6));
