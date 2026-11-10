# LESSONS 2026-11-09: the two red browser suites on trunk go green against a fresh projection

Before running anything, the projections in the main checkout were rebuilt
with `scripts/rebuild_projections.ps1`. Every stamp read
`sha12=3d04f5cdb980 dirty=False`, and master = integration = this branch's
base. Both suites were then red, and in both cases the check was wrong, not
the product.

## Rail holds still: the check, not the product

- **Evidence.** In `data/projections/feature-identity/bindings.json`, the
  record for `pitch_link_length` is `state: bound`. Both ends are bound by
  `annotate-app:jeff`, and they ratify `proposal-0001` and `proposal-0002`.
  The record has `proposals: []`, and the contact engine has no row for that
  edge.
- **Why that empties the end.** A bound end with no open proposal and no
  contact face lists no candidate (`AA.endCandidates`), so it has no `Take`.
  The issue's first hypothesis was right.
- **It is not a one-end problem.** The rail's log line listed the study's
  nine ends as `bound bound bound bound open bound bound bound bound`. The
  joints are `plate_slide`, `actuator`, `blade_hinge`, `pitch_link` and
  `tan_link`. None of them still had both ends of one edge open, so a plain
  "re-point at an unbound end" had nothing to point at.
- **The fix.** It is in the test harness only.
  - `acceptedOnlyProposals()` picks the records whose only answers are accepts
    of agent proposals: every binding ratifies an accepted proposal, and
    nothing is rejected, superseded or still open. Today those are
    `pitch_link_length`, `pitch_plate_slide_bushings_to_piston_body` and
    `tan_link_length`. For each one it reads the proposal events themselves
    from `data/inbox/feature-identity/`.
  - `installRealAnnotatorReads` takes a new `unaccept` option. With it, the
    annotator is served those records as they stood before the accept: the
    proposals open and no binding. Everything else is the projection as
    built.
  - `takeTarget` then reads the pane's rows and picks the first joint in rail
    order whose two rows are both ends of one edge, both open and both
    listing faces. These are the same conditions app.js's `nextEndToPick`
    needs. The run picked `plate_slide`.
  - Every assertion that read the pitch link's ends now reads the chosen
    joint. That includes the edge-feature exclusion (`feature=<edge>`).
  - The pitch link's joint-words and framing checks still read `pitch_link`.
- **Cases the rewind does not cover.** It is exact only for an accept-only
  record, which is why the filter is strict. A record that carries a
  rejection or a supersede is left as built. If every record ever has one of
  those, `take target` logs `{"joint":null,...}` and the Take check goes red,
  which is a loud failure rather than a skip.

## Model drawn alone and led: an off-screen DAG dot

The full breakdown that deliverable 2 asked for (the sub-check now prints it):

| Skip reason | Nodes |
| --- | --- |
| `noAnchor` | `hub_blade1_root_bearing_bore`, `hub_spindle_bore_axis` |
| `offDag` | `pitch_arm_link_bore`, `pitch_arm_root_seat`, `pitch_link_lower_sphere_centre`, `pitch_link_upper_sphere_centre` |
| `offScene` | none |
| no DAG dot at all | none |

That last row is a list the check computes itself. Such a node would appear
in none of `skipped`'s lists.

- **The two unled joint nodes** are the pitch link's sphere centres, at page
  (843, 1615) and (843, 1563). The window is 1700x1500 and the pane runs from
  y 300 to 1824.
- **So the product is right.** A dot below the window has nothing to lead
  from. The viewport comment, "tall enough that every DAG dot is in view",
  stopped being true once the DAG grew.
- **The fix.** The check now measures "on screen" itself: inside the pane,
  inside the window and not under the pinned band. It does not read the
  page's own skip lists.
  - Every joint node on screen must be led.
  - Each off-screen node is then scrolled to (`document.scrollingElement`),
    and must be led there too.
  - Both pitch-link nodes were: `scrolled to: {...: true, ...: true}`.
  - So all four joint nodes are still asserted.
- **Not done.** The raw skeleton point was not reinstated (`c75d8fe3`).
- **The related leader issue** (two hub nodes, `noAnchor`) is unchanged by
  this work. It got an addendum and went back to `status: open` with its
  `handoff:` removed, because Complete would otherwise have auto-resolved a
  defect this handoff did not fix.

## A flake found by the witness gate, in the same suite

The gate's first `--changed-since` pass found a different red. The clean
shadow run read `at rest: 4 meshes drawn for 15 parts`, and pytest was running
at the same time. `drawnSettled` treated three equal reads 300 ms apart as
settled, and a paused load satisfies that.

Settled now also needs `__scene._loading.size === 0`, and the at-rest read
first waits up to 120 s for the whole model. The count is still asserted with
`===`, so an extra context part still turns it red.

The lesson from that: don't run the default tier while the witness gate is
running.

## Verification (main checkout's data, this worktree's code)

| Run | Result |
| --- | --- |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "rail holds still"` | 17/17 |
| `... --only "the model drawn alone and led"` | 2/2 |
| Full browser tier, `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **44/44**, 1822 s. Over the 30-minute merge budget by 22 s; appended to the open browser-tier budget issue |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration` | 4/4 WITNESSED, exit 0, 561 s |
| `--only` on `f697d046` (pane seek; the DoD witness) | WITNESSED |
| `--only` on `a5140c2b`, `0daad7ab`, `c7a1ea99`, `c7b028d9`, `6122a7a2`, `8f07a068` | all WITNESSED. These are the rail sub-checks whose target moved, which the hunk-level gate left to the sweep |
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs` (worktree) | 1890 passed, 1 skipped, 1 failed, 508 s |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 671/671 |
| `node apps/annotate/run_tests.cjs` | 304/304 |

Notes on the pytest run:

- The one failure is the deliberate worktree red,
  `tests/test_viewer_js_suite.py`. It reports that the node-fs tier has no
  projection here, and that tier ran 671/671 against the main checkout.
- The one skip is `test_fit_bound_features.py:424`: the 2026-10-01
  re-extraction mesh is not installed.
- This venv has no pytest-xdist, so `-n 16 --dist loadfile` is unrecognized
  and the run was single-process.

## Gotchas

- **No `node_modules` in a worktree.** To run the browser runner from one, a
  temporary junction to the main checkout's `node_modules` is needed. It was
  removed before hand-back.
- **`--changed-since` counts hunks, not values.** A guard whose *value* moved
  (the joint) but whose lines sit more than 30 lines from any hunk is left to
  the sweep. When a re-point moves a target several guards read, witness each
  of them with `--only`.
