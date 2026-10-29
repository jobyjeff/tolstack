# Lessons 2026-10-29 — the_grid_header_rides_its_rows_on_merged_trunk

## Outcome: not reproducible; the guard's wait was racy, product unchanged

- `the DAG zoom, Fit and the grid header` passed 28/28 on master (`2f328e93`, which
  carries `8a2ae880`) in the main checkout **four times in a row**, and in this
  worktree against the main checkout's projections. The viewer files named in the
  handoff (`topology.css`, `views/topology.js`, `topology_app.js`) are byte-identical
  to trunk, so there was nothing to bisect and **no culprit commit exists to name**.
  The projection rebuild the sweep ran was superseded (`data/projections/viewer`
  rebuilt 09:53 today) so the exact failing data was not available either.
- Most likely cause, not proven: the header pin is written from the `scroll` event,
  which Chrome fires inside a rendered frame; the guard read after a fixed
  `settle(60)`. On a box busy with a sweep, no frame runs inside 60 ms, the head
  is still at its natural place, and both sub-checks fail (`headTop` above the bar,
  `pinned` unset) while rows are on screen. Both failures were on the scroll-walk
  and the kinematic section (which has the same wait style) passed.
- Fix: the scroll-walk now waits two animation frames after `scrollTo` before
  reading. Every assertion is unchanged — the claim is not loosened.

## The class question

Should `--changed-since` / the review post-merge browser run have selected it?
No: none of the later landings changed the guard or the pin's code in a hunk the
guard's anchor reaches, so selection was correct (this branch's own run reports
`0 of 557 entries reachable`). The real hole is that **a browser TRUTH-tier suite
whose result depends on frame timing is red on load, not on a regression**, and
the batch merge reads either as a stop. Candidate guards of the same shape: any
`settle(<ms>)` after a `scrollTo` followed by a read of scroll-driven state
(grep `settle(60)` in `scripts/run_viewer_browser_tests.mjs`). Not widened here.

## Process

- The worktree has no `node_modules`; I junctioned the main checkout's in (gitignored)
  to run the browser tier here, and removed the junction before finishing.
- pytest in the worktree: `1666 passed, 5 skipped, 1 failed` — the one failure is
  the documented `test_viewer_js_suite_is_green` (no `data/projections/` here).
- Full browser tier: 34/35; `crop lightbox` failed in the full run (load flake,
  the launcher-focus sub-check) and passed alone 20/20.
