/** A file/line reference extracted from a judge's evidence string. */
export interface Citation {
  path: string;
  startLine: number;
  /** Equal to startLine for a single-line citation. */
  endLine: number;
  /** The exact substring matched, so the UI can render it as the link text
   * and leave the surrounding prose untouched. */
  raw: string;
  index: number;
}

// Matches "src/auth/LoginForm.tsx:44-61", "internal/api/x.go:12", and the
// L-prefixed variants GitHub itself uses ("path:L44-L61").
//
// The path pattern requires at least one "/" or a file extension, so
// ordinary prose containing a colon and a number ("attempts: 3") is not
// mistaken for a citation - a false link is worse than a missing one,
// because a reviewer who clicks it and lands nowhere stops trusting all of
// them.
const CITATION_RE = /((?:[\w.\-]+\/)*[\w.\-]+\.[\w]+)[:#]L?(\d+)(?:\s*[-–]\s*L?(\d+))?/g;

/** Pulls every file:line citation out of a judge's evidence string. */
export function parseCitations(evidence: string): Citation[] {
  if (!evidence) return [];
  const out: Citation[] = [];
  CITATION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_RE.exec(evidence)) !== null) {
    const start = parseInt(m[2], 10);
    const end = m[3] ? parseInt(m[3], 10) : start;
    if (!Number.isFinite(start) || start <= 0) continue;
    out.push({
      path: m[1],
      startLine: start,
      // A reversed range is a model slip, not a reason to drop the citation.
      endLine: Math.max(start, Number.isFinite(end) ? end : start),
      raw: m[0],
      index: m.index,
    });
  }
  return out;
}

/** Builds a GitHub URL that opens the cited file at the cited lines.
 *
 * Pinned to the merge commit when we have one. §5.5's citation requirement
 * only works if a reviewer can check it in one click - and a link to a
 * moving branch drifts, so a citation that was accurate at merge time
 * silently starts pointing at the wrong lines. Falling back to HEAD is
 * better than no link, but the caller should say which it is. */
export function citationUrl(repoFullName: string, c: Citation, mergeCommitSha: string | null): string {
  const ref = mergeCommitSha || 'HEAD';
  const anchor = c.endLine > c.startLine ? `#L${c.startLine}-L${c.endLine}` : `#L${c.startLine}`;
  return `https://github.com/${repoFullName}/blob/${ref}/${c.path}${anchor}`;
}

/** The PR's own diff view, for the cases where no line citation was given. */
export function prFilesUrl(repoFullName: string, prNumber: number): string {
  return `https://github.com/${repoFullName}/pull/${prNumber}/files`;
}

export interface EvidenceSegment {
  text: string;
  citation?: Citation;
}

/** Splits an evidence string into plain and citation segments, so the UI can
 * render the citations as links in place without losing the prose. */
export function segmentEvidence(evidence: string): EvidenceSegment[] {
  const citations = parseCitations(evidence);
  if (citations.length === 0) return evidence ? [{ text: evidence }] : [];

  const segments: EvidenceSegment[] = [];
  let cursor = 0;
  for (const c of citations) {
    if (c.index > cursor) segments.push({ text: evidence.slice(cursor, c.index) });
    segments.push({ text: c.raw, citation: c });
    cursor = c.index + c.raw.length;
  }
  if (cursor < evidence.length) segments.push({ text: evidence.slice(cursor) });
  return segments;
}
