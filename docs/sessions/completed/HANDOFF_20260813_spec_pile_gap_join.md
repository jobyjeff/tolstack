---
priority: high
depends_on: []
---

# HANDOFF 2026-08-13 — spec_pile_gap_join: join open gaps against the spec pile, then clear the backlog it finds

Source: `docs/strategy/BRIEF_20260812_spec_pile_gap_join.md`, expanded
2026-08-13. Strategy answers to the brief's questions: the tool and the
backlog-clearing are **one handoff, two phases in order** (the 08-10
`fastener_citations_and_confidence` precedent shows one agent can do both);
`MS9363-09` is fixed in phase 2, not pre-peeled; **enforcement (a failing
check) is explicitly deferred** — record the allowlist need in the lesson,
build the reporter only. Baseline: trunk (`hardware_counts_doc_guard`
merged — its doc-level counts WILL move when you re-source entries; update
that test's expected numbers as part of phase 2, that's it doing its job).
Scope: a new debug tool in `tests/` or `scripts/` (follow the
`debug_report_tolerance_stacks.py` precedent), gap prose in
`hardware_entries.json` + stack files, citations; do NOT touch the staged
viewer handoffs' territory (`apps/viewer/` internals).

## Phase 1 — the join tool (report-only)

1. Collect open questions: every element across `ALL_STACK_FILES` with
   `confidence` in (`untraced`, `inferred`) + every `hardware_entries.json`
   entry whose `values_source.confidence != "traced"`, carrying the
   standard/document each gap names.
2. Collect the pile: `C:\workspace\tolstack\data\inbox\specs\` — main
   checkout, gitignored: **skip with a loud message in a worktree** (the
   `test_provenance.py` cross-repo-skip shape); silently reporting "no
   candidates" from a worktree is the failure mode to design out first.
3. **Join on designator, range-aware** — parse `NAS<lo>-NAS<hi>` filenames
   into ranges and test membership (`NAS6404` ∈ `NAS6403-NAS6420 Rev 4.pdf`);
   same shape for `MS9363 Rev C.pdf` vs `MS9363-09/-10`. This range parse is
   the whole point of the tool; substring matching already failed silently
   for a week.
4. Report both halves: `gap -> candidate file` AND `gap -> nothing in the
   pile` (the second list is the spec-intake priority queue). No relabeling,
   no writes.

## Phase 2 — clear the current backlog

5. For each candidate pair the tool reports (the brief's table is your
   starting set — 8+ rows), read the rendered crop (vision — the scans have
   no text layer, per repo SOP) and re-cite: element confidences, citation
   crops, `hardware_entries.json` values_source. **Correct the false gap
   prose** — `MS9363-09`'s "nut height/slot count/slot depth missing" claim
   has been wrong since MS9363 Rev C was read on 08-05 (and note the real
   remaining gap it hides: the phase control is uncontrolled by any
   standard — keep that finding in the entry). Same for any remaining
   "NAS640x absent from this repo" claims.
6. **The traced ratio moves — restate it last**, in one place, after all
   re-cites land (the 08-06 `traced_labels_and_ratio` precedent: anything
   restating the ratio sequences behind the changes, never beside).
7. Respect the known non-match: NAS6403 does NOT dimension thread run-out
   (`T (Ref)` only) — `thread_transition`'s gap stays open and the tool's
   report for it must not read as "closable". Note it as the first entry of
   the future allowlist.

## Definition of done

- Tool run from the main checkout prints the join (candidates + no-candidate
  list); run from a worktree prints the loud skip. Value-level tests for the
  range parse (in-range, out-of-range, malformed filename) and the
  worktree-skip.
- Every candidate the tool finds is either re-cited (crop read, confidence
  updated) or recorded in the lesson as "present but does not give this
  quantity" with the crop that proves it.
- No gap prose anywhere claims a pile document is absent when it isn't.
- `hardware_counts_doc_guard`'s counts updated to the new truth; full suite
  green; ratio restated once.
- Lesson (`docs/sessions/lessons/LESSONS_20260813_spec_pile_gap_join.md`):
  before/after traced ratio, the allowlist seed (non-matches like
  NAS6403/run-out), and whether the tool should graduate to a failing check
  (the deferred decision — give strategy the evidence).

Related issue to update on completion:
`docs/issues/ISSUE_20260810_nothing_sweeps_the_spec_pile_against_open_gaps.md`
→ `status: resolved`.
