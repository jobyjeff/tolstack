# Lessons — the_wheel_the_column_and_fit_behave (2026-10-29)

## Causes (what the handoff asked for)

- **The page jump was the zoom's own compensation.** `zoomDagAt` kept the
  content point under the pointer by `window.scrollBy(0, dy)` after every
  notch, so a wheel over the DAG moved `scrollY` (measured: 31px after three
  notches at 1600×1000). The wheel was already `preventDefault`ed; the page
  moved because the zoom scrolled it. Now only a bounded pane (the kinematic
  page, a scrollport of its own) anchors vertically; the page's scroll is
  never written by a zoom. The drawing therefore grows from the box's top-left
  rather than about the pointer.
- **The COMPONENT overlap was the same compensation, sideways.** The sticky
  rails stay put while the grid scrolls under them; the zoom's horizontal
  anchoring (`dagScrollAfterZoom`) left the grid scrolled a few px (10px
  measured), so the first grid column sat under the DAG's right rail. At
  `scrollLeft` 0 COMPONENT starts exactly at the DAG's right edge. A zoom now
  keeps the content at the pane's left edge (`scrollLeft * to/from`). Jeff's
  screenshot (flyout open, narrow pane) shows cells clipped on their left —
  the same state.
- **Fit already fitted the vertical axis in a window** (no page jump of its own
  once the zoom stopped moving the page; the box height is not pinned — it was
  not the cause). The horizontal half was missing: Fit now also caps the scale
  so the DAG's width fits the pane.

## Decisions not in the handoff

- **Pinning COMPONENT beside the rails (sticky) was built and reverted.** At
  1600 the pane leaves ~132px beside the 606px DAG on the product model; a
  pinned 150px column hides every other column when scrolled, and Playwright's
  hover/click could find no uncovered point (three browser suites went red).
  Shrinking it to half the free width did not help. Not pinning, and not
  scrolling the grid under the DAG on zoom, satisfies "never under the DAG" at
  rest. A reader who scrolls the grid sideways by hand still slides COMPONENT
  under the rails — that is the existing, deliberate sticky-rails design.
- **"Columns fit the frame at 1600×1000" holds at the Fit zoom, not zoom 1.**
  At zoom 1 the DAG is 606px in a ~738px pane (nav 300 + preview); no column
  set fits beside it. Pinned by a check (`scrollWidth <= clientWidth` at Fit).
  COMPONENT's cell gains a `title` (tooltip) where it has no hover card.
- `VA.dagScrollAfterZoom` is now unused by the app (still tested).

## Gotchas

- **I wiped uncommitted work with `git checkout HEAD -- apps/viewer`** while
  restoring after a baseline comparison, and then committed the wiped state;
  caught only because the witness anchor for the zoom edit stopped resolving.
  Commit before any baseline swap, or compare from a `git archive` export (the
  screenshots here do).
- The `[real]` tier refuses a projection built from another tree. A worktree
  cannot run `rebuild_projections.ps1` (no venv); the individual builders take
  `--data-root C:/workspace/tolstack/data` and were run from the worktree
  *after committing* (a dirty tree stamps `dirty`). Playwright needs a
  `node_modules` junction to the main checkout (untracked, ignored).
- The DOM shim has no `removeAttribute`; use `classList`.
- The shared `[real]` "sideways scroll" check flaked once in a loaded run
  (settle 150ms) and the crop-lightbox suite once in a full run (`waitFor` 20s);
  both passed in isolation and in the next full run.

## Mutation witnesses

- Enrolled: wheel-never-scrolls-page, zoom-keeps-sideways-scroll, Fit-vertical.
  **Not enrolled** (pin raised only): COMPONENT-after-DAG at zoom 1 (the
  sideways mutation reddens the sideways guard first, not this one), COMPONENT
  at Fit, Fit horizontally inside the pane, Fit grid-columns-in-frame — each is
  true today but no single-edit mutation reddens it alone.
- `browser__real-at-compact-density-fit-frames-...d8652b23` is NOT WITNESSED on
  the parent commit too (another check reddens first) — filed:
  `docs/issues/ISSUE_20261029_compact_density_fit_witness_is_masked_by_the_arrival_check.md`.

## Not run / skipped

- `tests/test_viewer_js_suite.py` is red in a worktree by design; the tiers it
  wraps were run directly in the worktree against `--repo C:/workspace/tolstack`.
- Two `tests/test_mutation_witness_shadow_concurrency.py` tests failed once on a
  stale `tmp/mutation-witness-<pid>` that could not be reaped (EPERM) in this
  worktree; unrelated to the diff.

## Final-run record

pytest (worktree, run concurrently with the witness run on a shared box):
1669 passed, 2 failed, 1 skipped, 19m10s — over the 10 min default budget, but
contended and not a clean measure. Failures: `test_viewer_js_suite` (red in a
worktree by design) and `test_browser_runner::test_a_runner_that_ends_leaves_no_chrome[signal-False]`
(Chrome-teardown timing under load; passed in the earlier full run, unrelated to
the diff). Fast tier 621/621 and annotate 255/255 (`--repo` main), browser tier
35/35 (final code; one earlier full run lost crop-lightbox to a flake), witnesses
`--changed-since integration` 5/6 (the sixth is the pre-existing decayed one above).
