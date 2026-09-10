---
type: review
handoff: endstop_piece_part_acquisition
reviewer: agent
date: 2026-09-10
verdict: APPROVE
blockers: 0
---

# Review — endstop_piece_part_acquisition

Not a tolerance-stack handoff (no `stack_*.json` touched) — this is the
worksheet §0 banner's "calibrated capability baseline" plus a spec-library
intake event. The seven mandatory stack checks (signs, LMC/MMC, RSS,
nominal-in-range, cotter/castellation, ratio) don't apply to stack elements
here since none exist, but the provenance-audit spirit — "did the author
actually open the document, and does the citation match it" — applies in
full to the worksheet's drawing/spec citations, and that is what this review
spent its effort on.

## What I verified

- **All four acquired drawings exist** in drawing-checker's
  `data/inbox/drawings/` (`213863-004-A.pdf`, `214723-002-A.pdf`,
  `215198-A.pdf`) and the RBC catalog already sat in this repo's
  `data/inbox/specs/` — confirmed on disk, not just asserted.
- **Re-rendered and re-read the source documents myself** (drawing-checker's
  venv, PyMuPDF), rather than trusting the worksheet's transcriptions:
  - `215198-A.pdf` sheet 1's note 5 mirror-component language — exact
    string match. Sheet 1's `79.00 ±0.10` (row 42, §11b) and sheet 2's
    DETAIL B five dimensions (row 59, §11d: `⌀12.290 ±0.010`,
    `⌀13.1 ±0.1`, `⌀9.000 +0.015/0.000`, `6.37 ±0.08`, `9.88 ±0.08`) — all
    confirmed present and exact against a rendered crop.
  - `213863-004-A.pdf`'s two bores (`⌀14.288 ±0.006`, `⌀15.876 ±0.006`), the
    `61.40` basic hole-center dimension with no printed ±, and the `(81.43)`
    parenthesized reference used for identity — all confirmed against a
    rendered crop. **Found one error here** (below).
  - `214723-002-A.pdf`'s bushing bores (`⌀12.320 ±0.015`, `⌀12.25 ±0.02`,
    `⌀9.50 ±0.02`, `⌀4.830 ±0.015`) and position frames — confirmed present.
  - `RBC_Aerospace_Plain_Bearings_Web.pdf` pp.21–22: re-read both
    DIMENSIONS — TOLERANCES tables directly. Every value in the new
    spec-parse event (`docs/spec_library/events/0006_...json`) — bore,
    OD, width, ball width, min race, for both `MS14101-3` and `MS14103-3`,
    plus the once-printed-in-the-header `-0.013 mm` bore/OD tolerance
    convention — matches the table exactly, dash row `-3`, column for
    column.
- **New tests are a real guard, not a proxy.** Mutated
  `MS14101-3`'s `bore_B.max` in a scratch copy of the event JSON;
  `test_ms14101_3_bore_matches_the_endstop_worksheets_bearing_size_rows`
  failed immediately, then restored cleanly (`git status` clean after).
- **Suite green**: `754 passed, 1 skipped`, matching the lesson's own count
  exactly, re-run by me after the merge.
- **Traced ratio re-derived independently**:
  `tests/debug_report_tolerance_stacks.py --ratio` gives
  `5 traced / 3 inferred / 18 untraced` (seeded) and
  `30 traced / 9 inferred / 20 untraced` (all stacks, 59 instances) —
  unchanged from before this handoff, correctly so since no `stack_*.json`
  was touched. The worksheet's own internal disposition count (26/43 →
  35/43 located, 5/43 → 11/43 traced) is arithmetically consistent:
  6 rows moved gap→traced, 2 gap→mismatch, 1 gap→candidate, 9−9=0 net,
  totals still sum to 43.
- **`PROVENANCE.md` / `docs/tolerance_stacks/README.md`** amendments state
  the new count (11/43, 6 distinct callouts) and point at §11 rather than
  restating its reasoning — matches this repo's own convention.
- **The filed issue** (`ISSUE_20260910_endstop_topology_retrace_and_link_
  length_discrepancy.md`) has correct, exact frontmatter
  (`type: chore`, `priority: med`, `status: open`, `audience: strategy`) and
  correctly declines to resolve the F12 nominal disagreement (109.4 mm
  topology vs. 61.40 mm drawing) by fiat — a genuine Jeff question, not
  silently folded into the topology JSON.
- **Append-only discipline held**: no `data/inbox/` reorganization; the RBC
  catalog was already in the pile, nothing new copied in; drawing-checker's
  read-only invariant (snapshot before/after, 5910 entries, empty diff) is
  plausible and consistent with the four drawings' arrival predating the
  session, per the lesson's own timestamped account.

## Findings

### Should-fix (fixed inline)

**§11a self-contradicted its own datum-letter reading, and the first mention
was wrong.** `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`,
§11a. The worksheet's first sentence described `213863-004-A.pdf`'s left
hole (`⌀14.288 ±0.006`) as carrying a position tolerance "referenced solely
to datum C, which this same feature also carries" — i.e., self-referencing.
A rendered crop of the FCF (`Matrix(8)` clip, this review) shows the position
frame's third compartment actually reads **B** (the *other* hole's axis); the
separate datum-feature flag beneath it — a different box — is what reads
**C**. Two sentences later, the same paragraph's own conclusion says the
opposite and correct thing: "controlled entirely by the left hole's `⌀0.1`
true-position callout to **datum B** (the right hole's own axis)" — silently
contradicting its own opening clause. The final numeric conclusion (0.10 mm
worst-case band, the F12 mismatch finding, the `mismatch` disposition for
rows 31/52) is unaffected, since it relied on the second, correct statement —
but a reader citing only the first sentence would carry the wrong datum
letter forward, and the "confirmed, not a self-reference" framing was
answering a non-issue (there never was a self-reference; the letters are
plainly different once read correctly).

Fixed inline (prose-only, no disposition or numeric result changed, no test
needed): corrected the first parenthetical to state the position frame
references datum B and the feature separately carries flag C, matching the
paragraph's own later, correct statement and the rendered drawing.

No other should-fix findings survived to be worth an issue — everything else
checked out against the source documents.

### Nits

None beyond the one fixed above.

## Overlay maintenance

Appended a new **Recurring bugs** entry (`docs/prompts/REVIEW_AGENT.md`)
for the datum-letter self-contradiction class this review surfaced — no
prior sighting of this specific failure shape in the overlay.

## Verdict

**APPROVE.** Fast-forward merge to `integration`, suite re-run green
(754 passed, 1 skipped) post-merge, pushed.
