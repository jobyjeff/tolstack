---
type: review
handoff: docs/sessions/active/HANDOFF_20261030_an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed.md
reviewer: agent
date: 2026-10-30
verdict: APPROVE
blockers: 0
---

# Review — an armed pick can reach either part, and a failed bind says why

One tactical commit (`c21a06bb`), merged into `review/…` with no conflicts and
no inline fixes by me.

## Deliverable 1 — part switch (option 2, as decided)
`cmdArm` keeps every named part with an installed mesh (deduped by sha);
`parts[0]` stays the default. Two-part ends show `picking on <part>` and a
`Pick on <other>` button running the new verb `arm part <partId>`;
`switchArmedPart` moves the filter, display, frame and line, and clears the
pre-selection. One-part ends are unchanged. Browser check on `[hub, blade_root]`
asserts the second part is pickable, the hub is refused, the row names the armed
part. Handoff scope respected (no topology / viewer files touched).

## Deliverable 2 — failure words
`AA.classifyBindFailure` / `bindFailureWords` give four fixed classes (no grant,
read-only, collision, other); raw text goes to `console.error` and hover.
Reaches the armed row plus the Bind / Correction / Accept / Reject / Record
banners. Unit check asserts exact text per class and that no filename, path or
adapter phrase appears. Left alone, named in the lesson: non-write
`setBanner(err.message)` sites and `Connect failed`.

## Verification
- Tactical lesson present; both deliverables and the lesson ask are met.
- Risky subset pre-merge: `node apps/annotate/run_tests.cjs` 269/269;
  pytest `-k "guard or enumerat or witness or vocab or claims or scan"` 217 passed.
- Witness tier `--changed-since integration` (repo = main checkout, node_modules
  junctioned): 22/22 witnessed, 0 left to the sweep, 14m46s. Includes the three
  new specs and the changed one.
- Post-merge full `pytest -q` in the worktree: 1685 passed, 1 skipped, 1 failed
  — `test_viewer_js_suite_is_green`, the documented worktree-only red (no
  `data/projections`). Left unexercised here: the viewer `[real]` tier; the diff
  does not touch `apps/viewer/`. Contention header lines not captured (output
  was tailed).

## Notes (not blockers)
- Option 1 (declared `face_part`) remains the cleaner end state; the truth table
  is unstarted — only one of 14 ambiguous nodes was exercised. Follow-up, not a
  blocker, per the handoff.
- The armed-row hover (`title`) is set on the current row element and is lost on
  re-render; the console keeps the raw text. Cosmetic.
