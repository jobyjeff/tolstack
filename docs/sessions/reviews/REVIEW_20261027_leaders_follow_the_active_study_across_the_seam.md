---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_leaders_follow_the_active_study_across_the_seam.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE (round 2)
blockers: 0
---

# Review: leaders follow the active study across the seam

Branch `handoff/leaders_follow_the_active_study_across_the_seam` (5 commits,
`0717abfc`..`b962d89b`), reviewed on `review/leaders_follow_the_active_study_across_the_seam`
cut from `integration` at `4a638dbc`. `integration` had not moved, so the
review-branch merge was conflict-free and the merged tree is the handoff's
tree. **Not merged into `integration`**: two browser-tier reds, below.

## What I verified

- **Which run**: one handoff in `docs/sessions/active/`, no prior review on
  this branch, the lesson arrives as `A` (no overwrite).
- **Tactical record**: present and consistent with the diff. It covers
  `pytest -q` (single process, 1 failed / 1610 passed / 1 skipped, the one
  failure being the filed per-document-qualifier SKIP), the fast tier at
  588/588, the seam suite alone (`--only "leaders across the seam"`) at
  17/17, and the witness run `--changed-since integration`. **It did not
  run the rest of the browser tier** ("it is the merge's job"). That is the
  rule for a tactical branch, and it is where both blockers were waiting.
- **Pre-merge risky subset** (rows: `apps/viewer/`, a CSS rule, a
  guard/witness, prose in tracked docs):
  - `pytest -q tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py
    tests/test_viewer_deep_link_contract.py tests/test_app_type_scale.py
    tests/test_mutation_witnesses.py tests/test_tolerance_stack.py tests/test_provenance.py
    tests/test_thermal_exception_list.py tests/test_claims_registry.py
    tests/test_projection_freshness.py tests/test_architecture_inventory.py`:
    **311 passed**.
  - `node apps/viewer/run_tests.cjs` was armed: the inputs were bridged and
    the projections rebuilt from the merged tree (`1ceba59e`) into the review
    worktree's own `data/`. It reported **588/588**, and the one `[real]`
    SKIP is the filed qualifier. Through `--repo C:/workspace/tolstack` it
    is 483/484, red on freshness, because the main checkout's projections
    are trunk's. That is expected and was not used.
  - `node scripts/run_viewer_browser_tests.mjs --repo <review worktree>`,
    the full tier (4m15s, recorded with `suite-time`, inside budget):
    **29/33 suites**. Each red was triaged against a baseline of
    `integration`'s own tree (`git archive integration`, under
    `data/scratch/`), run against the same data:

    | suite | merged tree | `integration` | verdict |
    |---|---|---|---|
    | annotate model in the scene | 13/15, twice | **15/15** | **regression (B1)** |
    | leaders across the seam | 16/17, twice | n/a (new) | **red in its own guard (B2)** |
    | 3D pane follows the selection | 26/27, then 27/27 on re-run | 27/27 | flake, not this diff |
    | annotate rail and scene (gap badges) | 20/22 | 20/22 | pre-existing, already filed as `ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md` |

- **Code read**:
  - `VA.seamDots`, `VA.seamLeaderGeometry`, `VA.seamCrossings`,
    `VA.seamBarCrossings`, `VA.selectedLeaderNodes`, `VA.seamLeaderStates`,
    `VA.sceneRowElement`, `VA.sceneLitCommand`, `VA.renderSeamLeaders`,
    and `topology_app.js`'s `drawSeamLeaders` / `syncSceneModel` /
    `scrollSelectionIntoView` / `followScenePick` / `wireSeam`.
  - The "never through a lit bar" claim is structural and holds:
    `VA.railGeometry` gives an edge mark `y1`/`y2` inside its own slot
    only, so a leader that leaves level with its row cannot meet another
    row's bar.
  - The only selection kinds are `node` and `edge`, so the "anything
    selected dims the rest" branch has no third kind to misfire on.
- **Mutation coverage**: there are 25 new specs (8 fast, 17 browser). I
  read every one. They mutate the wiring as well as the pure functions:
  the `ResizeObserver` targets, the `followScenePick` call, the rect
  offsets, the dot/anchor clips, the `onHot` hook and the
  `syncSceneModel` posts. The browser pin's +18 is 17 specs plus the
  always-true `[real] … (skipped: …)` line, the same shape as the 10
  other skip lines in that runner.
- **Screenshots**: all four are present. Shot 2 shows the selected
  contributor's 2D↔grid and 2D↔3D leaders in the accent, with the rest
  stepped back. Shot 4 shows the hidden state.
- **Filed follow-ups**: frontmatter is complete on all three new issues.
  The resolved one has its addendum.
- **Not applicable**: this is not a stack, so the provenance checks
  (mandatory checks 1–7) do not apply. No value, band or `source_ref` is
  touched, and nothing under `data/inbox/` or drawing-checker is written.

## Blockers

**B1 — The branch reddens `annotate model in the scene`, two sub-checks, reproducibly.**
- **Location**: `apps/viewer/topology_app.js` `syncSceneModel`, called
  from the `annotate:state` handler and from `followSeam` after every
  paint.
- **Failing sub-checks** (`scripts/run_viewer_browser_tests.mjs` ~5727
  and ~5741): `[real] until the shell posts a lit set, the open study's
  contributors are drawn at full strength and the rest dimmed`, and `[real]
  the shell's word rules the rest: hide leaves only the lit lines, and a
  posted lit set replaces the study's`. Both are green on `integration`'s
  tree against the same data.
- **What's wrong**: the shell now posts `model lit …` / `model unlit …`
  when the scene loads and again on every `annotate:state`. So the
  embedded pane that suite drives never stays in the "until the shell
  posts" state it reads. The shell's lit set (the kinematic lit set) is
  also not the study's contributor set the check expects. The second
  check's own `model lit pitch_link_length` is then plausibly re-overridden
  by the shell's next post.
- **Suggested fix**: decide which side is right. The lesson says the
  shell's reading should win over the scene's fallback, which argues for
  re-homing the checks: read the fallback where no shell speaks (the
  annotator's full page), and read the shell's word against the shell's
  own posts. Then re-witness those guards' specs. It is the tactical
  agent's call, because it changes what an existing guard certifies.

**B2 — The branch's own `[real] with the toggle at hide, six to ten leaders across the seam, drawn from the lit part alone` is red here: 11 leaders, on two runs.**
- **Location**: `scripts/run_viewer_browser_tests.mjs`, `testSeamLeaders`,
  the hidden-state push.
- **What's wrong**: the tactical run drew 9. This review drew 11 twice,
  and the expected-set half of the check agreed with the drawn set each
  time (only the 6–10 window failed). How many dots are in the bounded
  box's view depends on where the box ends up scrolled after the clicks
  before it (the lesson says so itself: "WHICH others are drawn depends on
  where the box is scrolled"). That makes the assertion a count live
  layout can change, which is the universal checklist's wall-clock/live
  count class.
- **Suggested fix**: one of these, the tactical agent's choice.
  - Pin the box's scroll before measuring (for example, scroll the lit
    span into view deterministically) so the count is a fact about one
    state.
  - Assert the rule (expected-set equality, which already passes) and
    print the count as the DoD's measurement rather than gate on it.

## Should-fix (fold into the rework)

- **S1 — The lesson's crossing table is one environment's reading.** It
  says hidden: 9 drawn, 5 crossing pairs. This review measured 11 drawn
  and 6 crossings in the same state, same run id, same viewport. After
  B2, re-measure in the pinned state, or add a correction blockquote
  saying the hidden-state counts vary with the box's scroll. The dimmed
  row (3 drawn, 0 crossings, 3 null anchors) reproduced exactly.

## Accepted deviations (recorded, not findings)

- **The DAG↔grid leaders were not moved into the page overlay.**
  Deliverable 1 asked for it, and "pinned before the move and equal after"
  became moot. The reason given holds, and I accept it: an overlay
  redrawn from scroll events trails a compositor-scrolled pane by a
  frame, while the rails SVG scrolls with its dots exactly. The handoff's
  purpose for the single overlay, one selection lighting the triple, is
  met by `VA.selectedLeaderNodes` feeding both overlays. The witnesses
  (`one-selection-lights-its-leaders-on-both-overlays`,
  `clicking-a-grid-row-lights-its-ends-…`) go red if that sharing is
  undone.
- **"Fan from a shared ordinate" was not built**, and **six to ten at rest
  is three**. Both are honestly measured and filed with `audience:
  strategy`: `ISSUE_20261027_leaders_across_the_seam_cross_each_other_…`
  and `ISSUE_20261027_on_the_kinematic_page_most_of_the_lit_sets_…`.

## Nits

- `VA.SCENE_ANCHORS_MESSAGE = "annotate:anchors"` restates
  `AA.ANCHORS_MESSAGE` by hand, and the fast test pins it to the same
  literal (self-pinned). It is paired behaviourally by the live half,
  which fails if the annotator renames the message, and it matches the
  existing inline `"annotate:tree"` / `"annotate:state"` literals. So it
  is not worth an issue alone.
- In `VA.sceneRowElement`, the comment says "the deepest segment that
  names a thing wins", but `fields.edge` from any segment beats a deeper
  `subject`/`body`. No real key has that shape today.

## Environment notes for the rework and the next review

- A worktree arms fully with `dispatch bridge-test-inputs
  C:/workspace/tolstack .` plus `scripts/rebuild_projections.ps1 -RepoRoot
  <worktree>` plus a `node_modules` junction. Then run the fast tier with
  no `--repo` and the browser tier with `--repo <worktree>`.
- `data/scratch/review_leaders_baseline/` (the `integration` baseline) was
  removed after use.
- **Run the full browser tier before handing back.** Of a ~4 minute tier,
  only the seam suite ran on this branch, and both blockers were in the
  part that did not.

## Re-run 2026-10-27 (round 2) — APPROVE

Round 1 was REQUEST CHANGES with 2 blockers. Both are closed below. The
rework is `69aff3e1` (tests and one comment) and `20ad823a` (lesson and
issues).

**B1 closed.** The shell's side stays as it was: the page's lit set rules
the scene, which is the handoff's point. The `annotate model in the
scene` suite now does two things:
- It records every `model` word the shell posts into the scene's window
  and checks, with a new guard, that the scene draws that lit set at full
  strength. The spec mutates `pageLitSet()` to `null`, so the shell posts
  `model lit all`.
- It reads the scene's own fallback by taking the shell's word back
  (`delete __model.lit`) and re-applying the style.

That second step reaches into the scene's internal state, which is weaker
than reading a page the shell never spoke to. The author's reason for not
doing that holds: a second P2 sweep build, to reach one branch. I'm
recording it here, not raising it as a finding. That suite is now 15/15
(the shell's lit set is 13 edges).

**B2 closed.** The hidden-state count is read with the page and the
bounded box both at their top, after a waited re-draw. I measured 9
leaders, 15 crossing pairs and 0 through a lit bar. That matches the
lesson's correction exactly. Its witness was re-aimed (the dot clip's
bottom edge), and it is witnessed. **S1 closed** by the same correction
blockquote. The comment nit on `VA.sceneRowElement` is fixed too.

**The merge with `integration` (`449d8609`, fastener stacks folded into
the product model) conflicted in `scripts/guard_enumeration.mjs`.**
- Both sides had moved `DECLARED_GUARDS`. This side had fast 589 and
  browser 658/625; `integration` had fast 581 (renamed fast guards, new
  digest) and browser 640/607.
- Neither side is right alone, because the pins are derived from the
  merged tree. I took the values `node scripts/guard_enumeration.mjs`
  computes: fast 589/589 (names `37920bb8a616`) and browser 659/626
  (names `be09fd3e4f4f`). That is 639 + 18 + 1 from this branch + 1 from
  `integration`.
- After that the census reports no moved pin, and no conflict markers are
  left.

**Runs on the merged tree** (`6d2a9c9c`, projections rebuilt from it into
the review worktree, inputs bridged):

| tier | result | note |
|---|---|---|
| `node apps/viewer/run_tests.cjs` | 588/588, 1 SKIP | the filed per-document qualifier |
| browser tier, full, `--repo <worktree>` | **32/33**, 4m38s | the one red is the gap badges, filed and equally red on `integration` (round 1's baseline) |
| `run_mutation_witness_tests.mjs --changed-since integration` | **43/43 witnessed**, 35m03s | over budget; filed `ISSUE_20261027_a_changed_since_witness_gate_on_a_viewer_handoff_runs_35_minutes.md` |
| `pytest -q -rfs`, full | **3 failed / 1571 passed / 1 skipped**, 8m20s | see below |

This repo's conftest prints no `concurrent pytest processes` or
`full-suite lock` header lines. All three pytest failures are outside this
branch:
- `test_viewer_js_suite` turns the filed qualifier SKIP into a failure.
  The tactical record has the same red.
- `test_claims_registry::test_every_declared_claim_agrees_with_its_source`
  and `test_viewer_readme_doc_facts::test_thread_region_t_is_the_smallest_chain_not_the_largest`
  are **`integration`'s**, and visible only against a freshly rebuilt
  projection. The fold deleted `topology_pitch_link_to_pitch_plate.json`,
  which `apps/viewer/README.md`'s `smallest_chain` claim and
  `SUBJECT_TOPOLOGY` still name. The tests, the registry and
  `docs/topologies/` are byte-identical to `integration`, and this
  branch's README diff is only its own section.
- I filed that as
  `ISSUE_20261027_the_fastener_fold_deleted_the_topology_the_readmes_smallest_chain_claim_names.md`
  (`high`) and did not fix it, since it is outside this handoff.

**Test pollution:** none. The main checkout's `git status` is clean, and
every projection this review built went to the review worktree's own
`data/`. The untracked `venv-win` link is the bridge's, already filed.

Verdict: **APPROVE**. Landing as a fast-forward of `integration`.
