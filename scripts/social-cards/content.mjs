// The copy and the layout knobs for every generated brand asset.
//
// This is the file you edit to regenerate with different words. build.mjs
// contains no copy of its own, so new wording is a change here and a re-run of
// `npm run social-cards` - never a hand-edited SVG and never a re-export from a
// design tool.
//
// Line breaks are authored, not computed. There is no text measurement in a
// standalone SVG - no wrapping, no shrink-to-fit - so a line that is too long
// runs off the edge silently. Authoring the breaks makes them reviewable, and
// build.mjs measures the rendered result and fails rather than shipping
// something clipped.

/** Which brand.css token each role reads. Roles, never literals. */
export const ROLES = {
  // The warm near-black the product uses as its dark ground. It lives in
  // :root as --brand-ink because in LIGHT mode this same value is the ink;
  // on a dark asset it is the ground. Same colour, opposite job.
  ground: { block: 'root', token: '--brand-ink' },
  cream: { block: 'root', token: '--brand-cream' },
  // The accent on every generated asset: the logo's own yellow, not the UI
  // gold. These assets sit next to the mark - as an avatar, as a post
  // thumbnail - so matching #c9983a made them read as a slightly faded copy of
  // the logo rather than the same brand. It is also the brighter pairing:
  // 9.49 on the ground against the UI gold's 6.95.
  gold: { block: 'root', token: '--brand-logo-yellow' },
  // Steps down from cream so the supporting sentence does not compete with
  // the headline. Still a token, still audited.
  support: { block: 'dark', token: '--brand-ink-muted' },
  // The inverted avatar: gold as a SURFACE, with the ink that brand.css
  // records as the safe pairing for it. White on this gold measured 2.61 and
  // failed in both themes; --brand-gold-on exists because of that.
  // Reproduces 4.png exactly: the mark in ink on the logo's yellow field.
  goldSurface: { block: 'root', token: '--brand-logo-yellow' },
  onGold: { block: 'root', token: '--brand-gold-on' },
}

// ===========================================================================
// 1. Launch share cards
// ===========================================================================

export const CONTENT = {
  wordmark: 'Grainlify',
  // First line cream, the rest gold. The split lands on a clause boundary:
  // the cream half states the problem, the gold half is the consequence.
  headline: [
    { text: 'A reward you can calculate', role: 'cream' },
    { text: 'in advance is a reward', role: 'gold' },
    { text: 'you can farm.', role: 'gold' },
  ],
  // Broken at commas so each line is a complete clause.
  support: [
    'So we removed speed as an advantage. Applications open for a window,',
    'issues assigned by weighted draw, rewards retroactive and quality-gated.',
  ],
  footer: 'grainlify.com',
}

// Both platforms crop the preview, and they do not crop the same way. The
// margin here is the SAFE AREA inset, not a visual preference: nothing is
// drawn outside it, so a centre crop at either ratio still contains all the
// text. 88px on a 1200px card is 7.3% a side.
const CARD_MARGIN = 88

/**
 * Two ratios, same content. The vertical rhythm is expressed as baselines so
 * the two cards stay visually identical rather than merely both "fitting" -
 * LinkedIn is 48px shorter, and the naive fix of scaling everything makes the
 * two posts look like different designs.
 */
export const SIZES = [
  {
    name: 'x',
    platform: 'X',
    width: 1200,
    height: 675,
    margin: CARD_MARGIN,
    logoSize: 40,
    wordmarkSize: 30,
    headline: { size: 72, lineHeight: 88, firstBaseline: 244 },
    support: { size: 24, lineHeight: 34, firstBaseline: 496 },
    // Baselines, not boxes - so every one of these has to clear the safe edge
    // by the descender depth. Set flush to the margin at first and the build
    // failed on the "y" of grainlify.com hanging 5px past it.
    footer: { size: 22, baseline: 580 },
  },
  {
    name: 'linkedin',
    platform: 'LinkedIn',
    width: 1200,
    height: 627,
    margin: CARD_MARGIN,
    logoSize: 40,
    wordmarkSize: 30,
    // 48px less height is absorbed by the two gaps around the supporting
    // block, not by shrinking the headline - the headline is the post.
    headline: { size: 64, lineHeight: 78, firstBaseline: 228 },
    support: { size: 23, lineHeight: 32, firstBaseline: 452 },
    footer: { size: 21, baseline: 532 },
  },
]

// ===========================================================================
// 2. Profile banners
// ===========================================================================

export const BANNER_CONTENT = {
  wordmark: 'Grainlify',
  // Split across two lines so the memorable half can carry the banner. The
  // lead states the category; the hero is the claim, and it gets the size and
  // the gold.
  // Typographic apostrophe rather than the straight quote - same word, and a
  // straight quote reads as unset type at banner size.
  lead: 'Funded open-source contribution.',
  hero: 'Rewards you can’t farm.',
}

/**
 * Banners have a second exclusion zone the share cards do not: both platforms
 * overlay the profile picture on the lower-left of the banner. Anything drawn
 * there is not "tight" - it is covered.
 *
 * `avatarZone` is anchored to the BOTTOM-LEFT corner and build.mjs asserts
 * that no drawn element intersects it. On LinkedIn the overlay is roughly
 * 250px wide, which is wider than the banner is tall, so the zone is the full
 * height and the left 250px are simply unusable.
 *
 * `contentX` clears the zone at ANY height rather than only below its top
 * edge. Both platforms re-crop these on narrow viewports, and a layout that
 * relies on being above the avatar survives the desktop render and loses its
 * first word on a phone.
 */
/**
 * `crops` are the windows the artwork must survive. Each platform renders
 * these at more than one aspect, and a layout verified only against the full
 * canvas loses its first or last word on the other one.
 *
 * These are stated assumptions, not measured platform internals: a defensive
 * inset rather than a claim about anyone's exact CSS. Every content element is
 * asserted to sit inside EVERY window, so widening a window is the only way to
 * loosen the check - it cannot be loosened by accident.
 */
export const BANNERS = [
  {
    name: 'linkedin',
    platform: 'LinkedIn company page',
    width: 1128,
    height: 191,
    // The overlay is wider than the banner is tall, so the left 250px are not
    // "tight" - they are unusable at any height.
    avatarZone: { width: 250, height: 191 },
    // Text only. At 191px there is no room to stack a lockup above a tagline,
    // and the logo is already in the avatar directly below this.
    showLockup: false,
    contentX: 296,
    marginRight: 48,
    marginTop: 20,
    lead: { size: 21, baseline: 67, role: 'cream' },
    hero: { size: 44, baseline: 129, role: 'gold' },
    // A rule in the logo yellow, set tight to the type. On a canvas this wide
    // a left-aligned block with nothing to its left still reads as adrift;
    // the rule gives it an edge to sit against. Measured like any other
    // content, so it has to clear the avatar overlay too.
    accent: { x: 268, width: 5, top: 47, bottom: 140 },
    // Lighter than X, and lighter again now the dots are the vivid yellow
    // rather than the muted gold. A texture tuned for a 500px banner reads as
    // noise when the canvas is 191px tall and three rows of it are visible.
    texture: { spacing: 56, radius: 2, opacity: 0.05, ghost: null },
    crops: [
      { name: 'desktop', left: 0, right: 1128, top: 0, bottom: 191 },
      // Mobile centre-crops the cover to roughly the middle 60%. Combined with
      // the avatar overlay, the genuinely safe band is x 250-902 - which is
      // what actually constrains this layout, not the 1128px canvas.
      { name: 'mobile', left: 226, right: 902, top: 0, bottom: 191 },
    ],
  },
  {
    name: 'x',
    platform: 'X header',
    width: 1500,
    height: 500,
    avatarZone: { width: 200, height: 200 },
    // Small. The mark is repeated at size in the avatar immediately below, so
    // setting it large here spends the banner's best real estate on a
    // duplicate.
    showLockup: true,
    logoSize: 32,
    wordmarkSize: 24,
    markTop: 158,
    // Right two-thirds. Content centred on a 1500px canvas reads as a
    // placeholder, and the lower-left is the avatar's anyway.
    contentX: 520,
    marginRight: 100,
    marginTop: 60,
    lead: { size: 32, baseline: 248, role: 'cream' },
    hero: { size: 66, baseline: 328, role: 'gold' },
    accent: { x: 486, width: 6, top: 158, bottom: 344 },
    texture: {
      spacing: 56,
      radius: 2.5,
      // Dropped from 0.10 with the muted gold: the same alpha in the vivid
      // yellow is roughly twice as loud.
      opacity: 0.07,
      // One oversized mark, very faint, filling the left third that the
      // avatar does not cover. This is the half of the canvas that read as
      // unfinished; dots alone do not give it a subject.
      ghost: { height: 300, x: 96, centreY: 250, opacity: 0.05 },
    },
    crops: [
      { name: 'desktop', left: 0, right: 1500, top: 0, bottom: 500 },
      { name: 'mobile', left: 0, right: 1500, top: 55, bottom: 445 },
    ],
  },
]

// ===========================================================================
// 3. Early-access campaign card
// ===========================================================================

/**
 * The launch card is a manifesto: quiet, text-led, read after the scroll has
 * already stopped. This one has to stop it. The difference is the focal point
 * - a number at display size, which resolves at thumbnail scale where a
 * sentence does not, and which is how most impressions of this will be seen.
 */
export const CAMPAIGN_CONTENT = {
  wordmark: 'Grainlify',
  // Split so the numeral can be set at display size and the words beside it
  // at reading size. "300 founding spots" as one string would force the whole
  // phrase to share a size, and the number is the part doing the work.
  display: '300',
  displaySuffix: ['founding', 'spots'],
  lead: 'Follow. Refer. Join the founding pool.',
  support: 'Distributed after our first funded hackathon.',
  footer: 'grainlify.com',
}

/**
 * `thumbnail` is the check the brief turns on. The card is rendered a second
 * time at feed-thumbnail width and the display number's rendered height is
 * measured there: `minDisplayPx` is the floor below which the number stops
 * reading as a number. Verified at the size most people see, not only at the
 * size it was designed at.
 *
 * `suffixGap` guards the one piece of this layout that is not fully specified
 * by coordinates: the words sit at a fixed x beside a numeral whose width
 * depends on the font. Too small and they collide; too large and the pairing
 * falls apart. Asserted from the rendered boxes rather than assumed.
 */
export const CAMPAIGNS = [
  {
    name: 'x',
    platform: 'X',
    width: 1200,
    height: 675,
    margin: CARD_MARGIN,
    logoSize: 40,
    wordmarkSize: 30,
    display: { size: 240, baseline: 360, role: 'gold' },
    displaySuffix: { size: 58, x: 560, firstBaseline: 262, lineHeight: 68, role: 'gold' },
    lead: { size: 34, baseline: 440, role: 'cream' },
    support: { size: 24, baseline: 492, role: 'support' },
    footer: { size: 22, baseline: 580, role: 'gold' },
    texture: {
      spacing: 56,
      radius: 2.5,
      opacity: 0.06,
      // Bleeds off the right edge, behind nothing. The left half carries the
      // content; this stops the right half reading as leftover canvas.
      ghost: { height: 420, x: 880, centreY: 300, opacity: 0.04 },
    },
    thumbnail: { width: 200, minDisplayPx: 12 },
    suffixGap: { min: 24, max: 96 },
  },
  {
    name: 'linkedin',
    platform: 'LinkedIn',
    width: 1200,
    height: 627,
    margin: CARD_MARGIN,
    logoSize: 40,
    wordmarkSize: 30,
    display: { size: 220, baseline: 342, role: 'gold' },
    displaySuffix: { size: 54, x: 524, firstBaseline: 250, lineHeight: 63, role: 'gold' },
    lead: { size: 32, baseline: 418, role: 'cream' },
    support: { size: 23, baseline: 468, role: 'support' },
    footer: { size: 21, baseline: 532, role: 'gold' },
    texture: {
      spacing: 56,
      radius: 2.5,
      opacity: 0.06,
      ghost: { height: 390, x: 880, centreY: 285, opacity: 0.04 },
    },
    thumbnail: { width: 200, minDisplayPx: 12 },
    suffixGap: { min: 24, max: 96 },
  },
]

// ===========================================================================
// 4. Profile avatars
// ===========================================================================

/**
 * Mark only, no words. The full lockup is unreadable at 100px and X crops it
 * to a circle on top of that, so the wordmark was costing legibility and
 * returning nothing.
 *
 * `safeRadius` is the real constraint. A 400px square's inscribed circle has
 * radius 200; the mark is held inside a 160px radius so the circular crop has
 * 40px of clearance on every side and the glyph never touches the edge.
 * build.mjs measures the mark's actual painted bounds - not its viewBox, which
 * is padded - and fails if any corner of it escapes that radius.
 */
export const AVATARS = {
  size: 400,
  markHeight: 190,
  safeRadius: 160,
  variants: [
    { name: 'gold-on-dark', ground: 'ground', mark: 'gold' },
    { name: 'dark-on-gold', ground: 'goldSurface', mark: 'onGold' },
  ],
}
