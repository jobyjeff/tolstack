---
type: review
handoff: docs/sessions/active/HANDOFF_20261112_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md
reviewer: agent
date: 2026-11-13
verdict: APPROVE (round 2)
blockers: 0
---

# Review — hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque

First run of this review (no prior commits on `review/<slug>`; the only
earlier `REVIEW_*` files are other handoffs'). The branch worked the `active/`
handoff; every lesson, issue and shot arrives as `A`, the one issue it closes
as an appended `M`. Containment checked before anything else: the handoff
branch was **not** an ancestor of `integration`, and `integration` had not
moved since the branch was cut (merge-base = `7fcb0538` = integration tip), so
the review branch was fast-forwarded onto `f966a6b7` — the merged tree and the
handoff tree are the same tree, and every run below is of that tree. **Nothing
was landed on `integration`:** the verdict is REQUEST CHANGES, two blockers,
both found by using the page rather than by a tier.

**For the next round:** the scratch root
`C:/workspace/tolstack/data/scratch/review_light_20261113` holds every
projection built from `f966a6b7` (`data/inbox`, `data/meshes` and the
non-viewer projections copied from the main checkout, this tree's `docs/`
copied, `venv-win` and `node_modules` junctioned). It is reusable for a round
2 whose diff changes no projection input; otherwise rebuild into it with
`--data-root <root>/data`. The reviewer's probes are described under
"Exploratory click-around" so the fix can be checked the same way.

## What was verified

**The rule, against the code (handoff items 1–7):**

1. *One resolver.* `VA.focusLightOf` (`apps/viewer/model.js`) is the one
   answer, and the four derivations (`focusElementKeysOf`, `focusNavRowsOf`,
   `navRevealPaths`, `sceneLightOf`) read it. Every caller of the old
   one-tier `focusElementKeysOf` / `focusNavRowsOf` was re-pointed
   (`git grep` over `apps/`, `scripts/`, `tests/`: no array-shaped reader
   left). The DAG's `setHot` no longer lights locally when a page is present,
   and `VA.lightTopoKeys` no longer refuses the page's light. ✓
2. *Two strengths.* `--lead`/`--hot`, `--selected`/`--touched`, the tree's
   `--on-touching`/`--hot-touching`, the scene's `LIGHT_LOOKS`. The browser
   tier's painted check reads own 8 / touching 6 / cold 4 on the real page. The
   23 new class names collide with nothing on the pre-diff tree (`git grep`
   each against `integration -- apps/`: 0 hits). ✓
3. *Everything can be selected.* Body, part and joint rows select
   (`entityRow`); a part's field, block and name on the DAG select; a grid
   bracket is lit but inert (the lesson's argued deviation, and I confirmed the
   caps and labels sit over `td.tvcell` with `elementFromPoint`). **A body's
   field on the DAG does not select with a real pointer — blocker B2.** And a
   body, part or joint once selected cannot be let go — **blocker B1.**
4. *Select reveals; hover marks.* `setSelected` opens every fold on every lit
   row's path and sets `revealPending`; `revealLitRows` scrolls after the
   paint with the own-row-never-leaves rule; `VA.lightNavTree` marks the
   deepest drawn fold hiding a lit row. Seen on the page (probe shots r08,
   r09: `--holds-touching` on the closed `Interfaces` group and on two
   interface folds). ✓
5. *Nothing goes opaque.* `AA.planActionLooks` keeps an about part at its
   resting look (faint comes up to ghost), near ghost, rest faint;
   `cmdOpenPart` opens at rest (`state.transparentParts`), not solid; a part
   that arrives runs `applyLooks` at once. Read off the scene in every probe
   state: every visible part 0.22 or 0.07, **none 1**, in bind mode and after
   a body, a part, a joint and a feature selection in turn. ✓
6. *Bound faces harder than the part.* `LIGHT_LOOKS` face 0.6 over part 0.22
   (hover), 0.55 over 0.18 (select); the pane reports `faceOpacity >
   partOpacity` on every light I read. ✓
7. *The same with no sweep.* My whole click-around ran in bind mode and the
   light reached the pane for every entity kind; `cmdLight` draws in either
   mode and `applyLooks` snapshots/restores the looks in a scene nothing owns
   at rest. I tried the obvious hole — a part hidden before a hover and shown
   again during it — and it came back at its resting look after the leave
   (probe 3, step 6), so the restore is sound for that case. ✓

**The four issues the handoff named.** `ISSUE_20261110_a_body_or_part_hovered…`
is resolved by this branch with an addendum and a `handoff:` back-link (right
form). The other three were already `resolved` on `integration` by dispatch
when `the_pane_follows_the_one_selection_both_ways` completed; nothing for
this branch to close, and the handoff's "close the ones this rule covers" is
satisfied. Two issues filed by the branch (`…a_selected_edge_reaches_the_pane_twice…`,
`…the_rail_leg_glow_left…`) carry correct frontmatter and the right
`found_by:` form.

**Lesson audit (arithmetic and attributions).**
- Witness counts: `git diff --name-status integration...HEAD -- scripts/mutation_witnesses`
  gives 24 A, 12 D, 8 M, 3 R (47 entries). The lesson's "retired 11 / added
  25 / re-anchored 8 / renamed 4" reconciles only with the double count it
  states: the armed-pick and proposal-select specs are counted in both
  "added" and "renamed" (one arrives as D+A, one as R065), so 23 spec files
  are genuinely new, 11 retired, 8 modified, 4 renamed. Consistent; worth
  knowing when the numbers are quoted forward.
- Guard census: `DECLARED_GUARDS` fast 688/688, annotate 314/314, browser
  884/851 are what `guard_enumeration.mjs --json` measures on the merged tree,
  and `tests/test_mutation_witnesses.py` is green on it. The browser comment's
  "+7 net" reconciles as 12 in (the ten table checks, the painted check and
  the mid-rail absence) minus 5 out. The mid-rail absence is declared with no
  spec, said in the diff; I accept the argument (no single edit makes a rail
  light without reddening a neighbour).
- `model.dimensionsOf("hub") = 3`: the lesson's table says 3 rows strong; the
  page gave `hub_blade_axis_offset`, `hub_boss_to_tan_link_mount_fasteners`,
  `hub_spindle_to_tan_link_mount_face` (3) and the pilot gap faint. ✓
- "every drawn part's opacity was 0.22 or 0.07; none was 1": re-measured
  across every state I put the page in. ✓
- The DoD asked for shots at 3840 **and** 5120; the bind-mode set exists at
  3840 only. Nit, not a finding: the bind walk reads identically and the
  sweep set covers both widths.

**Shots read.** `sweep_01` (hub hovered: 5 own tree rows, the closed
Interfaces group marked, 3 grid rows plus one faint), `sweep_02` (hub selected:
orange overlay, folds opened), `sweep_04` (locating boss: its interface row
revealed, the bound line drawn under both of its rows — one slot per drawn
row, by design) and the filmstrip (frame 1 the pale hover, frames 2–8 the
selection after the click at 150 ms). Layout at 3840: the 3D pane is the
narrow strip already filed (`ISSUE_20261112_at_3840_the_3d_pane_is_a_narrow_strip…`).
At 2560×1440 (my probes) the pane is a usable column and nothing wraps or
clips.

## Exploratory click-around (the reviewer's, bind mode, 2560×1440)

Four hand probes against the scratch root (scripts kept in the session
scratchpad; the measurements are below). What they found that the suites did
not:

| probe | what | result |
|---|---|---|
| 1 | hub container's top border hovered then clicked on the DAG | hover lights 5 tree rows, 3+1 grid rows, 4 dots, the container and bracket; the click selects the hub. ✓ |
| 1 | Escape after the hub selection | **the selection stays** (tree `--on` 5 rows, container and bracket accented, pane `select/own` layer standing). B1 |
| 1 | Enter on a joint row | selects the joint: 3 interfaces and 6 ends own, hub and mount touching, both ghost in the scene, rest faint. ✓ |
| 1 | hub selected, mount hovered | both lights at once on every surface; closed folds hiding the mount's lit rows wear `--holds` marks. ✓ |
| 1 | brackets and labels in the grid | `elementFromPoint` on six caps/labels returns `td.tvcell`: inert, as the lesson says. ✓ |
| 2 | `base` body field border: `elementFromPoint` | the rect, at the top edge (y, y+1, y+2) and the left edge. |
| 2 | `base` body field border: real `mouse.click` | **nothing selected**; `rect.dispatchEvent(click)` then selects the body (31 tree rows own). B2 |
| 2 | Escape after a feature selection / after a body or part selection | feature: released. Body, part: **not released**; a second click on the part row re-selects. B1 |
| 3 | looks at rest after part → feature → Escape in bind mode | 12 ghost, 3 faint (the three MS14101 fasteners): the restore is exact. ✓ |
| 3 | a non-hub part hidden, hub hovered, part shown, pointer leaves | during: faint; after: ghost. ✓ |
| 4/5 | real down/up on the body field, pane closed and open, five points | `mousedown` target `rect.tv__bodyfield#base`, `mouseup` target `section.tv__scroll`, no DAG re-render in between, `click` fires on the section. The hub part field's top edge and its name: down and up on the same node, click selects. The hub field's left edge and the tan_link field's top edge sit under a rail hit path (`line.rail__hit`, `path.rail__linkhit`), which takes the click. |

## Tests

| when | tier | command | result |
|---|---|---|---|
| tactical (recorded) | default pytest | worktree, single process | 1 failed (deliberate worktree red), 1938 passed, 1 skipped, 510 s |
| tactical (recorded) | viewer fast `--repo <scratch>` / annotate fast | — | 688/688, 314/314 |
| tactical (recorded) | browser `--only` × 17 suites; witness `--only` × 33 specs | — | all green after two check rewrites; 44 mutations WITNESSED |
| pre-merge subset (= the merged tree, fast-forward) | pytest | `test_viewer_js_suite test_js_python_vocabulary test_viewer_readme_doc_facts test_viewer_deep_link_contract test_js_vocabulary_is_generated test_feature_identity test_part_mesh_aliases test_app_type_scale test_mutation_witnesses test_projection_freshness test_tolerance_stack test_provenance test_thermal_exception_list test_claims_registry test_architecture_inventory` | 453 passed, 1 failed (`test_viewer_js_suite_is_green`, the worktree's skipped node-fs tier; armed below), 155 s |
| pre-merge subset | viewer fast | `node apps/viewer/run_tests.cjs` | 565/565, node-fs tier SKIPPED (no projection in the worktree) |
| pre-merge subset | viewer fast, armed | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/review_light_20261113` | **688/688**, 0 SKIP lines, `[real] the projection this tier reads was built from this tree` PASS |
| pre-merge subset | annotate fast | `node apps/annotate/run_tests.cjs` | **314/314**, 0 SKIP lines (`[real]` ran against the main checkout's projection by its fallback) |
| pre-merge subset | annotate scene wiring (mock + real pass) | `node apps/annotate/run_browser_check.mjs` | 94/99 — **the same five reds on a `git archive integration` export** (so not this merge's): two mock anchor checks (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration`), two `[real]` v1-default checks (`ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model`), and the Display-panel list — unfiled until now, see "Filed" |
| post-merge (merged tree, review worktree) | default pytest, full | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` | **1 failed, 1938 passed, 1 skipped, 2 deselected in 458 s** — the one failure is the deliberate worktree red above, covered by the armed 688/688. This conftest prints no contention header lines. Recorded in dispatch's ledger: inside budget. The shared `data/` was read, not written (scratch excluded). |
| post-merge | whole browser tier | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack/data/scratch/review_light_20261113` | **44/44 suites, 1139 checks, 0 FAIL, no SKIPPED block**; 1820 s running, 1821 s on the ledger — **OVER BUDGET by 21 s** (self-recorded). Detail under "Merge-only tiers" |
| post-merge | witness gate | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack/data/scratch/review_light_20261113 --changed-since integration` | **38/38 WITNESSED, 0 NOT WITNESSED**, 38 of 129 reached in 27m49s, 91 left to the sweep by the 30-minute cap; exit 0; 1714 s wall recorded by hand, inside budget. Detail under "Merge-only tiers" |

Benefit of the doubt given to the tactical record: it names the command, the
checkout and the counts, is consistent with the diff (the `--only` list covers
every suite the diff edits), and its fast tiers were armed through a scratch
root, not skipped.

## Merge-only tiers

Both run serially after the fast-forward merge, from the review worktree,
against the scratch data root whose seven projections were built from the
merged tree (`f966a6b7`), so the `[real]` checks read this tree's data. One
script, one browser slot each (slot wait 0 s), 02:55–03:55 local.

**Whole browser tier — PASS, 44/44 suites, 1139 checks, no red, no SKIPPED
block.** Chrome 157 via channel `chrome`. `suite file://` and `suite http`
550/550 each; `topology http` 212/212, `topology file://` 166/166, `the model
drawn alone and led` 21/21, `3D pane follows the selection` 31/31, `leaders
across the seam` 26/26 — every suite the diff edits is among the 44, so the
tactical's seventeen `--only` runs are now covered by one whole run. Running
time 1820.3 s; the runner's own ledger row says 1821 s against the 1800 s
merge budget: **over by 21 s**. The ledger's last eight full browser runs are
all a minute or two over, so this is the tier's weight, not this merge's —
the slowest three suites (`topology http` 204 s, `the DAG zoom, Fit and the
grid header` 176 s, `topology file://` 146 s) are the ones this handoff's
checks were added to, and the tactical's own full run the same morning
(05:17 Z, 1785 s, 1134 checks) was 36 s quicker with five fewer checks. Not
charged to the handoff; noted so the trend stays visible.

**Witness gate — PASS, 38/38 WITNESSED, exit 0.** `129 of 943 entries can be
reached by this diff against integration`; the runner's notes leave a further
360 entries that anchor more than 30 lines from every hunk to the scheduled
sweep (the biggest: 107 in `apps/annotate/app.js`, 77 in
`apps/viewer/views/topology.js`, 63 in `apps/viewer/topology_app.js`). Of the
129 selected, 38 were reached inside the 30-minute cap — all six `annotate`
entries, every `fast` entry, and the first browser entries — and all 38 are
WITNESSED, none NOT WITNESSED, none naming a guard the tree lacks. The other
**91 are `left to the sweep (budget)`**: browser entries in `kinematic study
page`, `leaders across the seam`, `parts as blocks`, `the DAG zoom`, `the
model drawn alone and led`, `the Preview from the scene` and `topology
file://`. Per the overlay a capped run whose reached entries are all
witnessed is a pass, and the reviewer neither re-runs nor waits for the rest.
The tactical's `--only` runs witnessed 44 mutations across its 33 touched
specs, which covers the specs this handoff added or re-anchored; the 91 the
cap left are older entries the hunks merely came near. Two entries took
4m38s each (`a body's checkbox in the nav hides that body` and `a body's
twisty folds it`) — both in the `3D pane follows the selection` suite, whose
whole-suite re-run per mutation is the cost; a later housekeeping handoff
could narrow their `--only`. Wall 28m34s (1714 s), recorded by hand as a
merge-tier row with `--role review`; inside budget.

Neither tier changes the verdict: the two blockers (B1, B2) are pointer and
keyboard behaviours no sub-check asserts, which is why the rework round adds
the checks named under "Blockers".

## Findings

### Blockers

**B1. Escape cannot let go of a body, part or joint selection — the three
kinds this handoff made selectable.** `apps/viewer/topology_app.js`, the
document `keydown` handler (around line 458): `if (state.selection)
unfreeze();`. `state.selection` is the *element* form, which a body, a part or
a joint has none of (`VA.focusElementOf` returns null for them, by design), so
the one let-go gesture the page has is a no-op on exactly the new selectables.
Measured on the page: after a part or a body selection, Escape leaves every
surface lit in the accent and the pane's `select/own` layer standing; a second
click on the row re-selects; a feature selection released by the same key.
Nothing else releases them, so a reader who selects a body is left with an
orange glow over four parts until they select something else. **Fix:** gate on
`state.focus.selected` (which `unfreeze` already reads), and add the browser
check the tier lacks — Escape after a body row click, every surface back to
rest — with its witness spec. The lesson's "stores and dedupes" inventory
stays true; this is the gesture, not a store.

**B2. A body's field on the DAG is wired to select the body and does not, for
a real pointer.** `apps/viewer/views/topology.js`, `wireContainer` on the
`tv__bodyfield` rect (`pointer-events: stroke`, `tabindex=0`, `role=button`).
`elementFromPoint` at the border returns the rect and a dispatched `click`
selects the body, so the handler is right; but a real `mousedown` on the
border is followed by a `mouseup` whose target is `section.tv__scroll`, and the
`click` fires on the section (measured at five points on `base`, pane closed
and open, no DAG re-render between the two events). The hub's part field,
small and fully on screen, selects fine from its top edge. The likely cause is
the focus a `mousedown` gives a tall focusable SVG element scrolling its
`.tv__scroll` container so the rect moves out from under the pointer; whatever
the cause, rule 3's "a body's … container in the DAG" is not met and no tier
checks it (the table check selects the body from the tree). **Fix:** make the
body field select under a real pointer (`preventDefault` on `mousedown`, or
`focus({preventScroll: true})`, or no `tabindex` on the rect with the body's
name as the keyboard control), and add a browser check that clicks the body
field with `page.mouse` — not `locator.click()` on the rect's centre, which is
`pointer-events: stroke` and would miss — and reads the selection. Also worth
a line in the README: the hub field's left edge and the tan_link field's top
edge are under rail hit paths, which take the click; the part NAME is the
dependable control there, as the lesson says.

Both are inside the handoff's scope (rule 3) and need a test to be
trustworthy, so they go back rather than being fixed inline.

### Should-fix (for the rework round; none filed as issues, since the handoff
stays open)

- **`VA.focusKeyEntity` is defined twice** in `apps/viewer/model.js` (two
  identical blocks, one after the other, around lines 276–304). Harmless (the
  second assignment wins and is identical) and inside the inline-fix boundary,
  but left for the rework to avoid a conflict on a file the round will touch.
- **`LIGHT_LOOKS.select.color: 0xff8c1a`** (`apps/annotate/scene.js`) is a
  second literal of `MARK_COLORS.picked`. The lesson calls it "the pick
  orange"; make it read the constant so the two cannot drift.

### Nits

- The bind-mode shot set is 3840-wide only; the DoD asked for both widths.
- The pane suite's `unbound` row hover (`testThreeDPane`, after the bound-row
  check) still hovers a row and then does nothing with the result
  (`void unboundLit`): dead motion left from the retired check.
- The lesson's "added 25" witness specs counts two renamed-and-rewritten
  specs twice (it says so); 23 files are new.

### Not this merge's

- `node apps/annotate/run_browser_check.mjs` is 94/99 on `integration`'s own
  tree, identical reds. Four of five already filed (above); the fifth filed
  now.

## Filed

- `docs/issues/ISSUE_20261113_the_annotate_browser_checks_display_panel_list_predates_the_bound_faces_setting.md`
  (`bug`, `med`, `stale_check_expectation`) — the mock pass's Display-panel
  list lacks the 2026-11-12 **Bound faces** box; red on `integration` before
  this handoff.

## Overlay

Two entries added to "Recurring bugs" in `docs/prompts/REVIEW_AGENT.md`: a new
selectable whose let-go gesture keys on the old selection's form, and a
focusable SVG container as a click target proven only with `elementFromPoint`
or a dispatched click.

## Checklist items addressed

- Provenance checks 1–7 (stacks): **not applicable** — no stack, element
  value, topology edge or spec event changed.
- Vocabulary drift: `AA.LIGHT_ROLES/TIERS/LISTS`, `VA.FOCUS_TIERS`,
  `VA.FOCUS_CONTAINER_KINDS` are module constants; no Python vocabulary born
  in the diff; `vocab.gen.js` unchanged and its pairing test green. ✓
- Guards enrolled: every new guard but one carries a spec, the one exception
  argued in the census comment; pins match the measured census. ✓
- Message set between viewer and pane: one new verb, `light`, with its parse
  table and planners pinned in the annotate fast tier and reached by the
  browser tier through the real iframe (the table checks read `__lastLight`). ✓
- Nothing written into drawing-checker; `data/inbox/specs/` untouched;
  `docs/reference/` untouched. ✓
- Design: nothing filed. The two strengths read as designed (own at the
  present weight, touching at half), the selection stays in the accent, and
  the `--holds` dot on a closed fold is a 6 px mark, muted for touching.
- Operator-facing refusal / agent's mess to Jeff: none added. ✓

## Re-run 2026-11-13 (round 2)

Round 1 was REQUEST CHANGES, 2 blockers; both are closed below. The rework is
two commits on the handoff branch (`898e98d5` the fix, `3565f05e` the lesson's
round-2 record), merged into this branch as `3b5e9268` (a true merge: round 1's
report commits sit beside them). Nothing else moved on `integration`
(`7fcb0538`) in between.

### The blockers, closed

**B1 — Escape now reads the one focus state.** The handler gates on
`state.focus.selected`, which `setSelected` writes for every kind, so a body,
a part or a joint is released the way an element is. Re-probed on the merged
tree with a real keyboard, pane closed and open: after selecting a body (31
tree rows, 6 containers, 12 grid rows lit), a part (9 rows, the hub's two
containers), an interface's joint-sized set (16 rows), a feature (2 rows) and a
grid row (4 rows), one Escape takes every count to zero — tree, containers,
grid, dots — with no page error. The old element-form Escape still works (the
feature and grid-row cases are that path). The new browser check `[real]
Escape lets go of a body selected from the tree` measured the same (tree 0,
containers none, the pane's light gone, the scene at rest), and its spec
`__1670fbae`, whose mutation puts the old gate back, is WITNESSED.

**B2 — the body field is no longer pan space.** The cause was not the
focus-scroll round 1 guessed: the DAG's drag-to-pan counted `.tv__bodyfield`
as the drawing's empty space and took `setPointerCapture` on `pointerdown`,
so the compatibility `mouseup` and `click` were retargeted to the pane and
the field's handler never ran — exactly the up-on-`.tv__scroll` round 1
measured, and exactly what `elementFromPoint` and a dispatched click cannot
see. The pan's start set is now the SVG and a study's field. Re-probed with a
real pointer at the base field's top and left borders, pane closed and open:
mousedown, mouseup and click all on `rect.tv__bodyfield#base`, 37 tree rows
on, the body's six containers in the accent, and Escape clears it. The hub
part field's top border and the hub's name still select (down, up, click on
the rect and the text respectively). A drag on the SVG's empty space still
arms the grab class and releases on mouseup (the DAG fits the pane here, so
there was nothing to scroll). The new browser check records the three event
targets in the capture phase, as the overlay asked; its spec `__12ec5cd0`,
whose mutation makes the field pan space again, is WITNESSED. The older
Escape spec `__2d586b66` was re-anchored to the new gate and is WITNESSED.

Round 1's overlay entry on this bug named the guessed cause; it now names the
measured one (pointer capture by the pan) and tells the next reviewer to read
a pointer-capturing gesture's start set whenever a diff makes a new element a
control. The edit is on this branch.

### The should-fixes and nits

Checked in the diff: `VA.focusKeyEntity` is defined once; `LIGHT_LOOKS.select`
reads `MARK_COLORS.picked`; the dead `unboundLit` hover in the pane suite is
gone; eleven `bind_<nn>_<what>_bind_5120.png` shots exist beside the 3840 set
(read `bind_03_body_selected_bind_5120.png` and
`bind_08_part_container_hovered_on_dag_bind_5120.png`: the body and the hub
lit on tree, DAG, grid and scene at once, the scene translucent throughout).
The CSS comment that called a body's name "the one control" and the viewer
README's pan sentence now say which space is empty.

**One thing documented rather than fixed, and that is the right call for this
handoff:** where a part field's border runs under a rail's hit path (the hub
field's left edge, the tan_link field's top edge on the end-stop model) the
rail takes the click; the README names the part's NAME as the dependable
control there. A re-layering of rail hit paths against container borders is a
handoff of its own, not a rework item.

The lesson's round-2 section is complete (no placeholder tokens), its witness
table states its own double-count, and its "25 new spec files against
`integration`" squares with git within rename detection: `git diff
--name-status integration HEAD -- scripts/mutation_witnesses/` shows 26
added, 12 deleted, 9 modified, 3 renamed — one rewritten pane spec that the
lesson counts as renamed git sees as a delete plus an add.

### Tests, round 2 (the merged tree `3b5e9268`; browser and witness runs against the round-1 scratch root, its `docs/` re-mirrored from this tree, projections built from `f966a6b7` — this round changed no projection input, and the fast tier's freshness check agrees)

| tier | command | result |
|---|---|---|
| viewer fast, armed | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/review_light_20261113` | **688/688**, `[real] the projection this tier reads was built from this tree` PASS |
| annotate fast | `node apps/annotate/run_tests.cjs` | **314/314** |
| the round-2 anchor test | `…pytest -q tests/test_mutation_witnesses.py` | **44 passed**, 92 s (every spec's `find` matches once on the merged tree) |
| default, full | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` | **1 failed, 1938 passed, 1 skipped, 2 deselected in 460 s** — the deliberate worktree red (`test_viewer_js_suite_is_green`), covered by the armed 688/688; recorded in the ledger, inside budget |
| docs guards after the overlay edit | `…pytest -q tests/test_title_style.py tests/test_claims_registry.py` | 74 passed |
| browser `--only` | `the model drawn alone and led` | **23/23** (21 + the two new checks), 75 s |
| browser `--only` | `the DAG zoom` (the pan's start set changed) | **48/48**, 177 s |
| browser `--only` | `3D pane follows the selection` (the dead hover removed) | **31/31**, 98 s |
| witness `--only` | `__1670fbae` Escape lets go of a body | **WITNESSED**, 2m39s |
| witness `--only` | `__12ec5cd0` a real pointer on a body's field | **WITNESSED**, 2m32s |
| witness `--only` | `__2d586b66` the re-anchored Escape spec | **WITNESSED**, 8m46s |

The whole browser tier and the `--changed-since` witness gate ran once, after
round 1's merge (above, "Merge-only tiers"); round 2 touched three suites and
three specs, all re-run here, and the review table's rule is once per review.
The `--only` runs write no ledger row; the default tier's row is recorded by
hand with `--role review`. The tactical's own round-2 default run (668 s, OVER
BUDGET by 1m08s, per the lesson and the ledger) was the box, not the diff:
the same tree ran in 460 s here with nothing else of this session's beside it.

### Landing

`integration` fast-forwarded to this branch's head (`git fetch .
review/<slug>:integration`), which contains both handoff commits and this
report. Not merged into trunk. The review scratch root
`data/scratch/review_light_20261113` and the worktree's `node_modules`
junction were removed at the end of this round; the worktrees and branches
stay for the operator's batch merge.
