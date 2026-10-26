---
verdict: APPROVE
---

# Review — the_tangential_link_cites_its_drawing (2026-10-26)

**APPROVE.** Branch merged into `review/...` and landed on `integration` by fast-forward.

- Both contributors are cited and traced: `tan_link_length` 61.40 basic, ⌖Ø0.1 B (213863-004 A, ±0.05) and
  the attach edge 3X Ø7.950 ⌖Ø0.2 A B (215735-A sh 2, sphere r 0.10). The length comes from the bare link
  body drawing, which the handoff said was not in an inbox; the lesson records the correction. The
  bore-to-bore versus ball-centre gap is filed as an issue instead of hidden.
- Study uses an inline band about zero for the length (loader requires it), and a new `[real]` test pairs
  it with the topology edge's citation. Attach edge is a true `dimension_ref`.
- Envelope moved as expected: ±0.290/±0.169 at -7°, ±0.315/±0.169 at +72°; margins 0.210/0.185. Pinned in
  `tests/test_kinematic.py`. Ids unchanged; `blade_root` name changed only.
- Verified post-merge in this worktree: `pytest -q` 1572 passed, 1 skipped, 1 failed
  (`test_viewer_js_suite`, the by-design worktree failure). The kinematic `[real]` tests ran, not skipped.

## Not delivered (non-blocking)

- The DoD screenshot folder `docs/sessions/shots_20261026_tangential_link_cites/` does not exist; the viewer
  was not launched. The page path is the loader's existing `dimension_ref`/inline-band route and is
  covered by the `[real]` tests, so this is a verification gap, not a defect.
- Not run here: main-checkout full run, node tiers, projection rebuild (must follow the batch merge, per
  CLAUDE.md, rebuild before the node tiers). No guard was added, so no mutation spec is owed.
