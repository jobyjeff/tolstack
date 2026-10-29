---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md
reviewer: agent
date: 2026-10-28
verdict: APPROVE
blockers: 0
---

# Review — the_scene_pane_is_one_flyout_that_reads_over_http

Branch `handoff/the_scene_pane_is_one_flyout_that_reads_over_http` (7 commits,
`ade6ee9c`..`feba27db`), merged into `review/…` at `31fe18f2` on `integration`
`ee467bbb`. It was not already merged: containment was checked first. First
run of this handoff, and no prior attempt on this review branch. Every lesson
and issue arrives as `A`, except the triaged issue, which was edited in place.

## What was verified

- **Deliverable 1, HTTP first.** `apps/annotate/storage/http.js` wraps
  `VA.HttpAdapter` and does not copy it. `AA.chooseTransport` now passes
  `http`. Reads need no grant. The first write calls `ensureWriter()` from
  inside `existingEventFilenames()`, on all three write paths (bind, flip or
  replace, owner-not-in-set), and then re-reads the identity projection from
  the folder before it counts a sequence number. The writer is offered only
  where `VA.isLocalPage`, so a hosted bind throws `AA.READ_ONLY_WRITE`.
  - **Scope deviation, argued in the lesson and accepted:** a new served read
    set (`kinematic/annotate.json` + `sweeps/`) is written by
    `scripts/build_kinematic_projection.py`, a file outside the handoff's list.
    A static mount cannot list directories, so this was needed to make the
    sweep play, and it needed no drawing-checker change. It is pinned by three
    new tests in `tests/test_kinematic.py`, including a config↔builder
    pairing.
- **Deliverable 2, banner out of the pane.** Embedded, `setBanner` routes every
  kind to the one dismissable `#notice` line. The status arrives as
  `annotate:status`. Its words, tones and sentences are `AA.PANE_STATUS`, and
  the shell composes none of them. Its CSS keys on `AA.PANE_STATUS_TONES`,
  paired in the fast tier. The message is listed in `docs/ANNOTATION_SURFACE.md`.
- **Deliverable 3, no document scroll.** Measured in my browser-tier run:
  `scrollHeight 915 / clientHeight 915, 0px under the scene` at both 400 px
  and 1200 px.
- **Deliverable 4, one handle.** `#pane-toggle` and `#flyout-close` are gone.
  The seam tab is hidden while the pane is open, and the chevron on the
  divider stops `pointerdown` so it does not start a drag. ↗ is in the header.
  The tab, the status dot and the notice line use only existing tokens or
  idioms. I grepped every new class name (`panehandle`, `flyout__status`,
  `flyout__collapse`, `an__notice*`, `an__sweep-twisty`, `an__sweep-figure*`)
  against `integration`'s `apps/` and found no collisions.
- **Deliverable 5, sweep fold.** One twisty, kept in sessionStorage. The gate
  line is built by one `buildSweepGate()` in both states. The scrubber chip and
  the folded figures share `AA.sweepHeadlineFigures`, and the chip text is
  byte-equal to the old composition.
- **Static/file:// annotator unchanged.** `run_browser_check.mjs` (mock):
  80/82, the same two red checks
  `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`
  names.
- **Hosted posture.** The suite was updated: a non-loopback origin that
  publishes projections shows the scene read-only, and a bind press answers
  `READ_ONLY_WRITE`. 21/21.
- **ISSUE_20260910.** It carries `handoff: the_scene_pane_is_one_flyout_that_reads_over_http`
  and a dated fix note, so Complete advances it to `resolved`.
- **Mandatory stack checks 1–7: not applicable.** No stack, topology,
  element or `source_ref` changed. The diff carries no numbers that need a
  citation, so the traced ratio does not move.
- **Main checkout:** `git status` is clean, and `data/projections/viewer/kinematic/`
  is unchanged (no `annotate.json` there yet; see the note below).

## Merge conflict (carve-out)

`scripts/guard_enumeration.mjs` `DECLARED_GUARDS`. Integration had moved
(`the_dag_is_zoomable_and_a_length_mode_draws_to_scale`, +4 fast and +26
browser guards). Neither side was right, because each was measured without
the other's guards. I re-measured with the census and wrote: fast
599/599 `dbc8af926861` (integration's), annotate 246 (the handoff's +7),
browser 713/680 `3902e5312c24`. That is integration's 699/666 plus the
handoff's +14/+14. No marker lines.

## Tests

The tactical report records a full suite: `pytest -q` 1593 passed, 1 skipped,
1 failed (the by-design worktree red). It also records every node tier with
counts and its scratch data root. It is consistent with the diff, so I gave
it the benefit of the doubt.

**Pre-landing risky subset (merged tree, review worktree):** `pytest -q`
over `test_annotate_js_suite test_app_type_scale test_architecture_inventory
test_feature_identity test_js_python_vocabulary test_js_vocabulary_is_generated
test_kinematic test_mutation_witnesses test_part_mesh_aliases
test_projection_freshness test_projection_provenance
test_rebuild_projections_script test_viewer_deep_link_contract
test_viewer_readme_doc_facts`: **281 passed**. Every tier below read
the tactical's scratch root `data/scratch/scene_pane`, which was rebuilt from
this branch. Integration's new commits changed no builder, so its
projections hold for the merged tree.

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo <scratch>` | 598/598, no SKIP |
| `node apps/annotate/run_tests.cjs` | 246/246 |
| `node apps/annotate/run_browser_check.mjs` | 80/82 (pre-existing, filed) |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` (335 s) | 32/33 suites. Red: crop lightbox launcher focus, already filed on integration (`ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md`). New suite "the scene pane reads over HTTP" 9/9; hosted posture 21/21 |
| `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration` (33 min, capped) | 40/50 witnessed, 50/56 reached, 6 left to the sweep. NOT WITNESSED: `d42adbc7` (already filed by the tactical), plus 9 in the flyout suite because its clean baseline went red (below) |
| `--only` for those 9's two new specs, and the 6 left to the sweep | **8/8 WITNESSED** |

**Post-merge full suite (review worktree):** `1 failed, 1593 passed, 1
skipped, 2 deselected` in 669 s, serial. The one failure is
`test_viewer_js_suite`, the worktree-only red; its tier ran through `--repo`
above, 598/598. This repo's conftest prints no contention header lines. The
run overlapped the witness tier. `suite-time record`: OVER BUDGET by 1m09s,
appended to `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`.
Left unexercised in the worktree: the `[real]` checks that need the main
checkout's `data/`, covered by the `--repo` runs above.

**The flyout baseline red, A/B'd.** The check is `[real] the whole live
drawing is clear of the panel`. With `--only` that suite: integration 3/3
green, the handoff branch 3/3 green, the merged tree 5 of 7 green (one red
under pytest load, one alone). The red follows the merge of this handoff
with the DAG-zoom one. The check measures straight after `[open]`, with no
settle wait. Filed:
`ISSUE_20261028_the_live_drawing_clear_of_the_panel_check_measures_before_the_column_settles.md`.

## Findings

### Should-fix (unfixed, each filed)

1. **The read set reads tolerantly where the folder walk it copies reads
   strictly.** `scripts/build_kinematic_projection.py` `_read_json_or_none`:
   - a malformed alias table or names file becomes `null`;
   - an unparseable run is dropped, and the test pins that it is absent;
   - FSA throws on the first two and lists the third.

   This is the overlay's "two readers, one strict and one tolerant" shape.
   → `ISSUE_20261028_the_annotators_served_read_set_turns_an_unreadable_file_into_an_absent_one.md`.
2. **A DoD outcome not shown: "a bind attempt prompts for the folder once and
   then writes".** The fast tier pins it with a stub writer. No tier can open
   the native picker, and the lesson's live run stopped at "folder needed".
   → `ISSUE_20261028_the_served_panes_first_bind_folder_prompt_has_not_been_seen_in_a_real_browser.md`
   (`needs: jeff`).
3. **The flyout check race above**, which takes nine witnesses with it on the
   merged tree. → filed, as above.

### Nits

- The lesson said "the `--only` runs above show their unmutated suites green".
  It recorded no such runs. I added a correction blockquote (inline, within
  the boundary), and it also notes item 2 and the rebuild dependency.
- "Binding is not available here" reaches the reader as `Bind failed: Binding
  is not available here — …`. The handoff asked for one short line. This is
  one line, with a prefix it did not need. Not filed.

### Operator note: the served pane needs a rebuild

The HTTP probe wins as soon as `topologies.json` is served. The pane reads
meshes and runs only from `kinematic/annotate.json`, which only a rebuild of
the kinematic projection writes. The main checkout has none yet. So after
the batch merge, **until `scripts/rebuild_projections.ps1` runs**, the pane
on 8000 boots with no parts and no runs. Before this change, a folder grant
would have shown them. The batch merge's documented rebuild-then-tiers order
covers this. The hosted site needs its next bake after that rebuild.

## Inline fixes made

- The merge-conflict resolution described above.
- A correction blockquote in the tactical lesson.
- Overlay: a new **Recurring bugs** entry, "A builder that publishes a snapshot
  of what another transport WALKS".

## Verdict

**APPROVE.** No blockers. Three should-fixes are filed as issues, and the
design surfaces follow the token and type-scale rules.
