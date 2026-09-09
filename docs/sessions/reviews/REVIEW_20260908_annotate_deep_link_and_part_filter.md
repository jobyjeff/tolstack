---
type: review
handoff: annotate_deep_link_and_part_filter
reviewer: agent
date: 2026-09-08
verdict: APPROVE
blockers: 0
---

# Review — annotate_deep_link_and_part_filter

This is not a tolerance-stack authoring handoff (no `tolerance_stack/`,
projection builder, or `docs/topologies/` touched — confirmed by
`git diff --stat integration...handoff/annotate_deep_link_and_part_filter --
tolerance_stack/ docs/topologies/ scripts/`, empty), so mandatory checks 1–7
are N/A, as are the fold()/second-combiner architectural checks. This is a
review of `apps/annotate/`'s new command layer, parts panel, deep link (both
directions), and the orbit up-axis fix.

Merged `handoff/annotate_deep_link_and_part_filter` into this review branch:
clean fast-forward, no conflict, no carve-out needed. `git log --oneline
HEAD..integration` was empty both before and after the merge — no sibling
handoff landed underneath this one.

## What I verified

- **The command layer is a real single dispatch point, not decoration.**
  Read `commands.js` (the DOM-free tokenizer/registry/`resolveMeshIdentifier`/
  `planIsolate`) and `app.js`'s handler registrations end to end. Every
  existing UI control (topology/study `<select>`, an element row's click, the
  parts-panel checkbox/isolate button, `?autotest=1`'s load loop) now calls
  `AA.exec(...)` — grepped for the old direct-mutation call sites
  (`el.partSelect`, `openSelectedPart`, `renderPartPicker`, `state.scene.loadPart`
  outside a `cmd*` handler) and found none left. The dev console
  (`runConsoleCommand`) and the deep link (`runPendingDeepLink`) are genuinely
  two more callers of the same verbs, not parallel paths.
- **Parts panel (deliverable 2).** `renderPartsPanel` only reads scene state
  (`listOpenParts`/`isVisible`) to paint checkboxes; every mutation goes
  through `show`/`hide`/`isolate`. `scene.js`'s `setVisible`/`isVisible` is a
  one-line `.visible` flag, consistent with the stated "hide never unloads"
  design.
- **Deep link in (deliverable 3).** `?topology=&edge=&study=&isolate=`
  boots as `goto` + `isolate` command calls after Connect (FSA cannot
  pre-grant a folder from a URL, correctly not attempted). Traced the
  never-a-blank-scene path: `cmdIsolate` separates resolved targets from
  missing identifiers, opens/shows/frames whatever resolved, and only shows
  the empty-state overlay when *nothing* resolved — matches the DoD's
  "if its part's mesh is installed" conditional exactly. The mock fixture
  (`fixtures.js`'s `demo_edge_untraced` now carrying `part: "demo_triangle"`,
  matching the demo mesh's `part_id`) gives a genuine end-to-end click-through
  with no folder grant, and `demo_edge_no_owner`'s `part: "no_such_part"`
  exercises the miss path. `?mock=1` run through `node apps/annotate/run_tests.cjs`
  doesn't cover the DOM/scene path (no WebGL in Node, consistent with the rest
  of `scene.js`/`app.js` — not this handoff's gap to close).
- **Deep link out (deliverable 4).** `VA.needsAnnotation` gates on
  `untraced`/`no_source_ref` — confirmed those are the two loud gap states
  (`VA.CONFIDENCES`, `viewer.js:67`) and that `no_source_ref` is a real
  topology-edge confidence value (`topology_fixtures.js`, live projection).
  `VA.annotateLink` generalises the existing toolbar link
  (`annotation_surface_mvp`) rather than forking a second query-string
  builder — read both call sites (`renderTopoToolbar`, `renderEdgeDetail`) and
  confirmed they're the same function with different args. New viewer tests
  (`tests.js`) cover both the fixture and a **live** `pitch_system` edge
  (`hub_lower_to_top_bearing_flange`) end to end.
- **Orbit up-axis fix (deliverable 5).** Read `vendor/OrbitControls.js`
  myself to confirm `object.up` is captured into a fixed quaternion at
  construction only (`this._quat = ... setFromUnitVectors(...)` in the
  constructor, never in `update()`) — the fix (`camera.up.copy(UP_AXIS)`
  before `new OrbitControls(...)`) is ordered correctly, and `frameParts`/
  `autotestPick`'s camera-offset math was consistently moved from a
  hard-coded `+Z` to `BACK_AXIS` (perpendicular to the new `UP_AXIS`) rather
  than left half-migrated. Not visually verified (no WebGL in Node, and this
  repo's `step_tessellation` lesson already documents why real drag
  automation doesn't run here) — the lesson says so plainly and recommends
  Jeff open the page once; I have nothing to add to that.
- **Scope fence respected.** `git diff --stat integration...handoff/... --
  tolerance_stack/ docs/topologies/ scripts/` — empty. Nothing written into
  drawing-checker or rotorkit.
- **Tests, re-run myself, both checkouts:**
  - `node apps/annotate/run_tests.cjs`: **32/32** (20 new) — matches the
    commit message.
  - `node apps/viewer/run_tests.cjs`: **167/167** (fixture tier; worktree,
    `data/` empty as expected).
  - `venv-win/Scripts/python.exe -m pytest -q`: **750 passed, 1 skipped** —
    matches the commit message.
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **210/211**.
    Rebuilt both `data/projections/viewer/{results,topologies}.json` from
    this (fully-merged) tree first — the existing projection had been built
    from `master @ 9b9ef1d5`, which is **not an ancestor** of this branch (a
    diverged bookkeeping line in the main checkout, not a newer one: `master`
    is missing ~1700 lines of topology/schema content this branch and
    `integration` both have), so the provenance gate correctly refused a
    plain rebuild; used `--allow-older-tree` deliberately. The one failure
    (`[real] the pitch system's four forks are marked`) is real but **not
    caused by this handoff** — see "Findings" below, I filed it separately.
- **No data pollution.** Main checkout `git status --short` clean before and
  after every rebuild and test run (the two rebuilt projection files are
  gitignored).

## Findings

**Should-fix (both filed as issues — out of scope for this handoff, or
pre-existing; not blocking APPROVE):**

- `docs/issues/ISSUE_20260908_pitch_system_four_forks_test_is_stale_not_a_race.md` —
  the one red real-tier test is not a rebuild race, contrary to what this
  handoff's own lesson (repeating `LESSONS_20260908_viewer_v2_single_nav.md`
  §7) and every review since 2026-09-06 has said. `docs/DAG_TOPOLOGY.md`'s L2
  section and `REVIEW_20260906_mechanical_stroke_stack.md`'s own independent
  Python re-derivation both already state **5** branch points for
  `pitch_system`, and a from-scratch rebuild from a tree containing all of
  `integration` still produces 5, stably. This handoff didn't touch
  `tolerance_stack/topology.py` or any `docs/topologies/*.json`, so it isn't
  responsible for either the mismatch or the misdiagnosis — but it did
  repeat the misdiagnosis in its own lesson without re-checking, which is
  worth a general note (see overlay update below).
- `docs/issues/ISSUE_20260908_command_vocabulary_table_has_no_pairing_test.md` —
  the ten command-layer verbs are hand-documented in three places
  (`app.js`'s `register()` calls, `README.md`'s table, the lesson's table)
  with nothing pairing them, the same shape `annotate_vocab_pairing_test`
  already closed once for `binding_state.js`'s constants. All three agree
  today; nothing catches a future drift. Low priority, but the handoff's own
  lesson flags this vocabulary as agent-facing API worth naming carefully,
  which is exactly the kind of thing this repo's recurring-drift pattern
  eventually bites.

**Nit:**

- `scene.js`'s `loadPart` calls `this.frameParts()` with no arguments (frame
  every loaded part), not filtered to visible ones, unlike the `camera reset`
  verb (`cmdCamera`'s `"reset"` mode, which filters to
  `isVisible`). Before this handoff, every loaded part was always visible (no
  hide existed), so this was a distinction without a difference; now that
  `hide` exists, opening a new part while another is hidden reframes the
  camera to include the hidden part's bounding box, which `camera reset`
  would not. Purely cosmetic (over-zoomed, not wrong), not worth a
  REQUEST CHANGES or an issue on its own — flagging in case it's noticed
  later and looks like a regression.

## Overlay

Added two entries to `docs/prompts/REVIEW_AGENT.md`'s **Recurring bugs**
list: a generalization of "a prior review's PASS is a claim, not evidence"
to a **persistently-red test whose explanation ("race"/"flake") is copied
forward across reviews without re-derivation**, and a note that this repo's
apps now include a second, non-tolerance-stack architecture (a command layer
behind a UI) worth its own light checklist should a third one arrive.

## Suite counts, for the record (main checkout, post-merge, this branch)

`node apps/annotate/run_tests.cjs`: 32/32. `node apps/viewer/run_tests.cjs`:
167/167 (worktree) / 210/211 (main checkout, `--repo`, after a deliberate
`--allow-older-tree` rebuild of both viewer projections — see above).
`pytest -q`: 750 passed, 1 skipped.
