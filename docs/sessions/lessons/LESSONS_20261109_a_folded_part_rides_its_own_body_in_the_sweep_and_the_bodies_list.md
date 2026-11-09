# LESSONS 2026-11-09 — a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list

Handoff: `docs/sessions/active/HANDOFF_20261109_a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list.md`.
Shots: `docs/sessions/lessons/shots/a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list/`
(1920×1200, taken by `tests/debug_folded_parts_ride.mjs`; `before_*` served a
`git archive` of the baseline's `apps/` through `--tree`, `after_*` this tree).

## The rule a folded part now follows

A part that a topology body lists and the run's own part list for that body
does not list rides that body's subject. A `rides_with` body's parts ride
their host's subject in exactly the same way. `AA.sweepRidingParts(topology)`
(`apps/annotate/sweep.js`) builds the map: `rides_with` bodies go to their
host, and every other non-link body goes to itself. The parts the run already
lists are skipped in `anchorSweepBodies`, as before. A link is never a host:
it is posed by its two joint ends, and its pressed-in bearings are carried
inside its occurrence.

Which occurrence: `AA.sweepRideChoice` decides, for a moving body and now for
a **ground** body too. One recorded occurrence needs no choosing. Several
are narrowed to the ones recorded deepest beside the body's own placed parts,
and a tie is a refusal. Before this change the ground path took *every*
recorded occurrence. That was harmless while its only user was v1's cover
(one occurrence). Under the new rule it made v1's `base` claim all 29 recorded
NAS1149V0332H washers, the same mesh the plate's washers use, and
`AA.sweepOccurrenceSubject` (base rows come first) would then have attributed
a plate washer picked in the scene to `base`. So the ground path was narrowed
too. This is a decision the handoff did not make; the issue's suggestion was
taken otherwise unchanged.

The existing skips stay: link subjects, parts with no mesh or no recorded
position, and parts whose every occurrence is inside a claim (carried).

**v2, P2 run** (`vpa-pitch-p2-20261105-204957`): the cover is a `ground` row
on `base`, and both heads are `rides` rows on `pitch_plate`. Each head's drawn
matrix tracks the piston's translation: z 41.13 / 10.72 / −23.33 at the low,
mid and feather stops, equal to the piston's. Before the fix the heads sat at
−23.33 at every stop and the cover had no row. The bar reads `15 of 15 parts
placed` (was `12 of 12`). In `after_low.png` the orange head ring sits at the
top of the piston; in `before_low.png` it is not there.

## What v1 did under it

v1 changes, and the change is correct. v1's `base` and `pitch_plate` declare
hardware that linkage does not list (`tests/test_topology.py`,
`BODY_PARTS_LINKAGE_DOES_NOT_LIST`). Before this change that hardware stood at
its assembly position while the plate swung away from it, which is the same
defect as v2's heads. Measured on the P2 run:

- `pitch_plate`: `washer_nas1149v0332h` rides (8 occurrences),
  `bolt_nas6404u13d` rides (1), `plain_bushing_214943_002` rides (1).
  `bolt_nas6403u11d`, `bushing_214820_002`, `bolt_nas6403u13h` and
  `washer_ms21299c4k` are `refused`. Their recorded positions do not say
  which belong to the plate, and the bar's disclosure says so.
- `base`: `washer_ms21299c3` is `ground` (1). `washer_nas1149v0332_tt` is
  `refused` (29 recorded positions, none narrowed).
- Heads and cover are unchanged: they ride and stand still as before, through
  their `rides_with` bodies.

The annotate `[real]` check `both piston heads ride the pitch plate…`
(`apps/annotate/run_browser_check.mjs`, which no gate runs) pinned the exact
set of `rides` rows, so it now looks at the heads only. Its claim that "the
cover has no mesh" was already stale: the cover has a mesh and was a `ground`
row before this change. The check now says the cover sits still with the
base. I did **not** run that harness. It is ungated and long under SwiftShader.

## The Bodies list — every site that reads it

`AA.sweepModelTree(tree, topology)` re-reads the run's tree through the model
when the sweep starts (`state.sweep.tree`). A subject the topology declares
lists that body's parts in its order, then any part the run lists and the
body does not. `tree.order` carries the topology's `bodies[]` order, and
`AA.sweepTreeSubjects` sorts by it, so links sit among the bodies as the DAG
draws them. A subject the model does not declare keeps the run's parts and
comes after.

v2, measured (`after_*.png`, rail): `base · 4 parts` (hub, tan-link mount,
gas-spring mount, piston cover) · `tan link · 3 parts` (link, `MS14101-3_2`,
`MS14103-3`) · `pitch plate · 4 parts` (plate, piston body, lower head, upper
head) · `pitch link · 2 parts` (link, `MS14101-3`) · `blade · 2 parts` (pitch
arm, blade). That is the projection's `bodies[]` exactly: 4/3/4/2/2, 15 parts,
in v2's authored walk order. Before: base 3, pitch plate 2, blade 2,
pitch link 2, tan link 1, in the run's order.

v1 now lists `base · 6` and `pitch plate · 13`, as its DAG does. The parts
with no mesh are the existing `missingPartRow` (no checkbox). v1's list order
is its `bodies[]` order (base, blade, pitch plate, pitch link, tan link). v1's
DAG is not `walk_order: authored`, so its *drawn* order is the walk's, and the
rail does not try to reproduce that.

Readers of `sweep.tree` / `AA.sweepTreeSubjects`, all now on the model's
bodies:

1. `renderSweepRail`: the Bodies group, its heads and part rows.
2. `jointRowWords` → `AA.sweepJointEndParts`: joint row words. They are
   unchanged on v2 (same five lines before and after).
3. `anchoredOccurrences`: what an armed pick and a selected suggestion frame.
   A head now resolves to `pitch_plate`'s occurrences.
4. `subjectKnown`, which gates the `show-body`/`hide-body` verbs. Names are
   unchanged.

Readers that deliberately stay on the run's subjects (`sweep.structure.bodies`,
`artifact.bodies`):

- `anchorSweepBodies`' `subjects`: what the run poses and matches against
  joint points. A folded part reaches it through `AA.sweepRidingParts`
  instead, as a `rides`/`ground` row.
- `scene.js` `enterSweep` (the stick figure) and `sweepExportSource` (the
  Export-points joint-end → body map). Both read the solver's bodies, which
  are poses rather than part lists.
- `modelRunSubjects` (model layer): subject names only. `modelPartInfo`
  already found a part's body through `topology.bodies` (`modelBodyOfPart`).

Binding mode has no Bodies list of its own. The model layer's body select
(`model` verb, `MODEL_SELECT_KINDS`) already reads `topology.bodies`, so it
was already on the model's answer and is unchanged.

The bar's disclosure (`buildSweepBodiesDisclosure`) and `contextBaseShas`
read `sweep.bodies`, the anchoring rows. Those now include the folded parts,
which is why the disclosure reads 15 of 15.

**The bearing label** was a one-line change in the same code:
`AA.partRowWords` now ends a label that has no drawing number at
`AA.meshShortName` (`MS14101-3`). The full STEP filename stays on the hover.
It reaches every part row, in sweep and binding mode, not only the rail.

## Assert, don't log

`testModelDrawnAloneAndLed` (`scripts/run_viewer_browser_tests.mjs`) gains two
pushes:

- `…with the P2 run loaded the end-stop model still draws as many parts as it
  has, and no context`. This is the issue's suggestion. It is **green on the
  baseline** (15 meshes drawn there too: the heads were drawn, just standing
  still), so on its own it could not satisfy "must fail on today's trunk". It
  guards the sweep-only alone sites. Its witness drops the carried-bolt skip
  *and* the trailing `hideOutsideModel()` in one multi-line `find`, because
  the two back each other up.
- `…with the P2 run loaded every part of the end-stop model's bodies is posed
  with its own body`. Non-link bodies only, because a link's bearings are
  carried rows, which name no topology part. **Red on the baseline**, run
  before the fix: `base/piston_cover_214958_002,
  pitch_plate/piston_head_lower_214699_002,
  pitch_plate/piston_head_upper_214698_002`. Green after.

The suite's other failing sub-check (`every joint node the scene drew has its
leader across the seam`) is red on the baseline too. It belongs to
`HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection`
and was left alone.

Four witness specs, and the annotate/browser pins in
`scripts/guard_enumeration.mjs` raised by two each. The existing spec
`annotate__a-run-s-links-are-bodies-of-their-own…` anchored the line
`AA.sweepTreeSubjects` used to return, so it was re-pointed at the line that
now names the list.

## Gotchas

- **MAX_PATH.** `tests/test_mutation_witness_shadow_concurrency.py` copies the
  tree under a pytest tmp dir, and this slug's shots folder plus
  `after_v2_sweep_feather_1920.png` landed at about 260 characters. The shots
  were renamed short (`after_low.png`). The test is still red in this
  worktree on two older `LESSONS_20261103_…png` names: already filed as
  `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`.
- `scene-view`'s `part` is the mesh's own `part_id` (`asm217755_214699_002`),
  not the topology id. The probe matches on the number suffix.
- A worktree runs the browser tier with a `node_modules` junction to the main
  checkout plus `--repo C:/workspace/tolstack`. The junction is untracked.

## Verification record (2026-11-09, this worktree; data and `node_modules` from the main checkout)

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`: **1 failed, 1890 passed,
  1 skipped**, 413 s (recorded, inside budget). The one failure is
  `test_viewer_js_suite_is_green`, which is red in a worktree by design (no
  projection here). That tier was run separately:
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **671/671**.
- `node apps/annotate/run_tests.cjs`: **306/306**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the model drawn alone and led"`:
  3/4. Both new checks pass. The leader sub-check is red on the baseline too,
  and the sibling red-suites handoff owns it. The full browser tier was not
  run; per the merge-tier rule that is the review's and the batch merge's.
- `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo C:/workspace/tolstack`:
  14/14 reached, **11/14 witnessed**, exit 0. All the annotate entries are
  witnessed, including the four this branch added or re-pointed. The three
  browser entries are NOT WITNESSED, *"the tier was red before the mutation"*:
  they share the suite the sibling's leader check keeps red, so the runner
  proves nothing there until that lands. Witnessed **by hand** instead: each
  spec's mutation was applied and the suite run, and each turned exactly its
  own sub-check red (drawn count; posed with its body: cover and both heads).
  `app.js` was then restored from a copy of the committed file. Once the
  sibling's leader fix is on integration, the runner should witness all three
  unaided.
