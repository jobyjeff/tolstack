---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md
reviewer: agent
date: 2026-11-04
verdict: APPROVE
blockers: 0
---

# Review 2026-11-04 — the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit

Branch `handoff/the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit`
(`f5234c46`..`9763d9c9`, 3 commits) was merged into
`review/the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit` as a
fast-forward from `integration` `93893374`. Containment was checked first: the
branch was not already on `integration`. This is the first review of the slug,
and no prior report or commits exist on this branch. The diff's status letters
show only `A`/`M` on code, docs and issues, `R`/`D` on renamed witness specs,
and the lesson arrives as `A`.

## What was verified

**The deliverables, against the code.**

1. **The joint is the node.** `VA.nodeJointKinds` (`apps/viewer/interface_glyphs.js`)
   is the one place that decides a node's glyph. It reads edges only, marks both
   ends, and applies `VA.NODE_GLYPH_PRECEDENCE`, which the fast tier pairs
   against `INTERFACE_KINDS`. The view draws the glyph over an unpainted dot.
   That dot keeps `data-id`, the click and the hover, and its target radius is
   the ring's (`VA.jointNodeTargetR`). No glyph is drawn on an edge, and both a
   fast check and a `[real]` check assert this. The value-level census (8 ball,
   1 slide, 2 clearance, 11 plain) passes against a projection built from this
   tree. I re-read the live topology's gap edges: `travel_between_end_stops` is
   `clearance`, and nothing is `planar`, so the +72° stop is honestly plain. The
   lesson's "where C and the build differ" section explains why the census
   counts ends, not joints. Drawing a `planar` glyph there would have invented a
   fact the data does not state, so leaving it plain is right.
2. **An edge says only lit or unlit.** `conf--*` is off the bar. It has one
   `--edge-ink`, `--edge-lit-w`/`--edge-unlit-w`, and a dash for gaps only.
   Hover and lead still spend width. The browser check measures computed
   styles, not class names.
3. **Tints are assigned.** There are 16 `--tv-body-*` tokens, with the first
   six unchanged. The DAG fields, the grid rows and the bridges all read them.
   The `[real]` check fails if the live model passes 16 bodies (it has 13). The
   3D-scene half was fenced by the handoff ("the pane"). It is filed as
   `ISSUE_20261104_the_3d_scene_does_not_colour_a_body_with_its_dag_tint.md`,
   which has correct frontmatter.
4. **A body is one container.** `VA.bodyBridges` and the change to
   `bodyLabelFields` (named once even when nothing is lit) do this. A collapsed
   body's pills are one `g.tv__pill`. The pinned test moved from "two pills" to
   "one group, two shapes, one bridge, one name". The issue is routed to
   `resolved` with a resolution line, and brief Q2 is marked consumed in the
   marker line.
5. **Leaders.** `--leader-ink` was checked as present and not re-introduced.

**Guards observed failing (scratch mutations, all reverted).** These were
fast-tier runs with `[real]` armed:

- re-adding `confidenceClass` to the bar reddens *"a bar says only lit or unlit…"*;
- marking only `edge.to` in `nodeJointKinds` reddens *"every contact kind has
  one glyph symbol, and a joint's two ends…"* and the `[real]` live-model
  census;
- restoring the "with nothing lit, name every block" early return reddens
  *"a body in several blocks … is one container"* and the `[real]` live-model check;
- `--edge-unlit-w: 4px` (browser, `--only "topology file://"`) reddens *"every
  DAG bar is one ink and two weights, and only a gap is dashed"*. The printed
  diagnostic was `lit:4, unlit:4`.

**The provenance-audit checks (overlay 1–7).** They do not apply. The diff
changes no stack, topology value, band, confidence or citation, so no stack
data is in the change set. The traced ratio is unchanged by construction.
Nothing was written into `data/inbox/specs/` or into drawing-checker. The main
checkout was clean before and after.

## Tests

The tactical record is complete. It names the command, the checkout (the
worktree, with inputs bridged and the projection built from a clean commit),
the counts, and a base-code comparison for every red. I gave it the benefit of
the doubt and re-measured the same numbers myself.

The environment was prepared this way: `dispatch bridge-test-inputs`, then
`scripts/rebuild_projections.ps1` into this worktree's `data/` from committed
`9763d9c9` (every stamp `dirty=False`), then `node_modules` junctioned in.

- **Pre-merge risky subset** (apps/viewer + CSS + witnesses + docs rows):
  `pytest -q tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py tests/test_app_type_scale.py
  tests/test_mutation_witnesses.py tests/test_architecture_inventory.py
  tests/test_tolerance_stack.py tests/test_provenance.py tests/test_claims_registry.py
  tests/test_topology_projection.py tests/test_js_vocabulary_is_generated.py`:
  **415 passed**.
- **Fast tier** (`node apps/viewer/run_tests.cjs`, `[real]` armed):
  **629/635**. The six reds are the pre-existing set
  (`ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md`).
  I checked `integration`'s `apps/viewer` out against the same projection and
  got the same six, also 629/635.
- **Browser tier** (`--repo <this worktree>`): **35/41 suites**, 1678 s,
  recorded as inside the merge budget. The red suites:
  - topology file:// and topology http, 201/205 each. These are the
    pre-existing pitch_system four.
  - real render path: aborted.
  - 3D pane follows: 30/32.
  - scene pane over HTTP: 8/9.

  The last three are as recorded by the tactical and filed in
  `ISSUE_20261104_three_browser_suites_are_red_on_the_base_with_a_fresh_projection.md`.
  One red was **not** in the tactical record: *leaders across the seam*, 25/26.
  Run alone on HEAD it passed 26/26. Run alone on base it was 25/26, red on a
  *different* sub-check. That is a flake on both trees, not this diff, and it
  is now filed as
  `ISSUE_20261104_the_seam_leader_screenshot_row_checks_are_intermittent.md`.
- **Mutation witnesses** (`--changed-since integration`, absolute `--repo`):
  26/26 reached, 6 WITNESSED, and 20 skipped as "red before the mutation".
  They were skipped because the armed fast tier and the topology suites carry
  the pre-existing reds, as the tactical reported. The four hand mutations
  above stand in for the branch's new guards. 968 s, inside budget.
- **Post-merge full suite** (this worktree, merged tree, `[real]` armed, single
  process because `venv-win` has no xdist): **1721 passed, 3 failed, 1 skipped,
  2 deselected**, 505 s, recorded as inside budget. This conftest prints no
  `concurrent pytest processes` / `full-suite lock` header lines. The failures:
  - `test_viewer_js_suite`: the pre-existing six.
  - Two `test_mutation_witness_shadow_concurrency` tests. Their spawned tier
    picks up this worktree's armed projection and its six reds. With
    `data/projections/viewer` moved aside, both pass (**2 passed**). This is an
    artifact of arming the tier, not a defect.
- `data/` hygiene: the main checkout's `git status` was clean afterwards, and
  no file under the bridged `data/inbox` or `data/meshes` is newer than the
  session.

## Findings

**Blockers:** none.

**Should-fix:** none left unfixed.

**Nits:**

- *Fixed inline.* `apps/viewer/topology.css` had three comments that still
  described the retired confidence channel. They said the hover rule "keeps its
  provenance HUE … `--on` is 7", that an untraced bar under the pointer is
  "unmistakably red", and that the hit target's bar "carries every provenance
  colour". I rewrote these as comments only (commit `52fe7439`). An overlay
  entry now covers this class.
- `tests/test_app_type_scale.py`'s failure message still suggests
  `.rail__bar.conf--untraced` as an example scope. That example is now
  hypothetical but harmless. I left it as is.
- The DoD asked for a *side-by-side* screenshot with the mock-up. The lesson
  ships `0_mockup_C.png` and the build shots as separate files, not one
  composite. They are enough to compare by eye.

**Design (filed, non-blocking):**
`ISSUE_20261104_design_dashed_gaps_read_as_hashes_and_a_bodys_second_block_is_unnamed.md`
covers the two follow-ups the lesson named and nobody filed. Body names
overlapping glyphs and rails is visible in `1b_kinematic_minus7_dag.png`. It is
already item 2 of
`ISSUE_20261027_design_the_planar_and_clearance_glyphs_read_alike_and_body_names_sit_on_the_rails.md`.

**Lesson audit.** I re-derived the census (passes on the live projection), the
6 pre-existing fast reds, the browser suite counts and the pytest counts. All
match, apart from the seam-leaders flake noted above. The lesson's heading date
is 2026-11-04 while its filename says 20261103. The filename follows the DoD,
so I left it.

## Verdict

**APPROVE.** All five deliverables landed as specified. The new guards were
observed failing, and every red reproduces on the base code.
