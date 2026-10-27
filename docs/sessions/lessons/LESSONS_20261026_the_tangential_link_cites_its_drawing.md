# Lessons — the_tangential_link_cites_its_drawing (2026-10-26)

## Before → after (blade pitch at the stops, P2 sweep)

| | −7° stop before | after | +72° stop before | after |
|---|---:|---:|---:|---:|
| worst case | ±0.244 | **±0.290** | ±0.242 | **±0.315** |
| RSS | ±0.165 | **±0.169** | ±0.159 | **±0.169** |
| S461-607 margin | 0.256 | **0.210** | 0.258 | **0.185** |
| gap rows | 2 | **0** | 2 | **0** |

Both stops still pass. A gap row folded in as zero, so citing the two bands only ever widens
the envelope; the margin lost is the honest price (0.311 / 0.487 deg/mm times 0.05 and 0.10 mm).

| Edge | Before | After | Citation |
|---|---|---|---|
| `tan_link_length` | gap | **61.40 basic, ±0.05, traced** | 213863-004 A sh 1, run `20260910_154233_213863-004-A`: boxed 61.40 bbox [332.97, 139.52, 365.25, 155.67]; ⌖Ø0.1 B on Ø14.288 bbox [93.43, 186.58, 159.12, 202.73] (pt, page 1190.56 × 841.89) |
| `pitch_plate_tan_link_attach_radius` | gap | **sphere r 0.10, traced** | 215735-A sh 2, 3X Ø7.950 +0.015/0 ⌖Ø0.2 A B, bbox [1182.66, 740.04, 1289.72, 769.8], frame [1186.91, 774.91, 1267.66, 791.06] |

## What differed from the handoff

- **The length is on 213863-004, not 212956-005, and 213863-004 IS in an inbox**
  (`drawing-checker/data/inbox/drawings/213863-004-A.pdf`, run above). The handoff, the edge's
  note and the issue all said it was not acquired. 212956-005 A (the assembly sheet) carries
  only reference lengths, (81.43) overall, (11.10), (21.00), note 1 ≈82×22×12 — an absence for
  a centre distance, recorded in the topology history. Nothing Jeff has to export for this.
- **Mesh vs drawing:** P2's sphere centres are 61.45 apart, drawing 61.40: 0.05 mm, inside
  the band's full width. Bore-to-bore, though: the drawn number is the body's bore axes, the
  solver's points are ball centres, and the ball-centre offsets are still uncited
  (`ISSUE_20261026_the_tangential_link_ball_centre_offsets_are_not_in_its_band.md`). Spec
  event 0006 was not read for this.
- **Attach bore identity is by count** (3X ↔ three links, as the existing stack's note has
  it), datum B = the Ø41.040 central bore (sheet 1), so ⌖Ø0.2 A B is a position from the
  spindle axis, which is exactly the edge. ⌖Ø0.2 as a ball is conservative axially; no disk
  (the axis is unstated, see the 10-23 issue). The Ø8.520 ⌖Ø0.03 (to datum F) is not this edge.
- **A contributor band must be authored about 0** (`_resolve_band`), so the length cannot be a
  bare `dimension_ref` to the topology edge (nominal 61.40). The edge carries the true value;
  the study carries an inline band about zero with the same `source_ref`, and
  `test_real_the_tangential_link_length_band_is_the_topology_edges_citation_about_zero` pairs
  half-width and citation. The attach edge's dimension is authored about zero, so that one is
  a real `dimension_ref`. Inline bands also need `units`.
- Runs recorded no `dimensions`; callouts read by eye and the PDF text layer (PyMuPDF from
  drawing-checker's venv, `-X utf8`).

## Part name

`blade_root` → `blade bonded assembly` (id unchanged). Rebuilt into a scratch data root:
`names.json` now reads `216332-001: blade bonded assembly`, source topology. Ids of all nodes
and edges unchanged (only a `dimension` added to two edges).

## Verified / not done

- `pytest -q` in this worktree, after the last commit: 1572 passed, 1 skipped, 1 failed in
  5m55s. The failure is `test_viewer_js_suite` (worktree has no projections, by design).
  Not run: the viewer/annotate node tiers, the browser TRUTH tier, mutation witnesses (no guard touched), main-checkout run.
- The shared projection was NOT rebuilt (it would overwrite trunk-state data with an unmerged
  tree); a scratch build confirms the kinematic study builds with 0 gap rows. **No screenshot**:
  the viewer was not launched, so the DoD's shots folder is not delivered.
