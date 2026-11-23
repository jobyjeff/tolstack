# LESSONS 2026-11-21 — a_take_on_a_lug_feature_binds_that_lugs_own_face

Handoff: `docs/sessions/HANDOFF_20261121_a_take_on_a_lug_feature_binds_that_lugs_own_face.md`
(issue `ISSUE_20261120_a_take_on_a_v2_lug_feature_binds_the_other_lugs_face.md`).
Worked 2026-11-22 on a branch cut from integration `20f5e00c`.

## Root cause

`scripts/build_contact_suggestions.py` resolved each gap edge's ends to a
**mesh** and ranked every slot that mesh (or its two borrowing arms) is
recorded at. It never read the part's `occurrence`. v2 does declare one for
every lug part (the 11-19 chain added them), so the declarations were already
there. The engine ignored them. Two parts on one mesh (both straight bushings
on `214820-002`, both flanged bushings on `NAS77A3-015A`) therefore asked the
same question, got the same answer (the best-ranked slot, ties broken by key
order), and both lugs were offered one lug's bore. The flanged pair was worse:
both sat at `NAS77C3-015.5`, a lug **neither** part is. The bolt's mixed blades
come from the same cause: each edge ranked the bolt's five slots on its own.
`candidate_occurrences`' `<product>.<n>` arm was a suspect in the handoff. It
was not the cause: the per-mesh resolution was.

## What I chose, and why

**Declaration, not geometry.** An end whose part has an occurrence is measured
at that one occurrence (`Store.occurrences(sha, pin)`, the Python twin of
`AA.pinnedOccurrences`). A part's occurrence is its own `occurrence`, else its
nearest `parent`'s **when the parent resolves to the same mesh**
(`part_occurrence` / `AA.partOccurrence`). That clause is what places v2's
eight races, which are solids of their bearing's mesh and declare nothing.
I did not pick "nearest the partner's occurrence": the declarations exist,
the annotator already draws by them, and a geometric choice is one more
ranking that can tie.

**What still can't be told apart is not a Take.** A part that declares
nothing, inherits nothing and shares its mesh with another part of the model
is ranked as before, and its end says `placed: false`. The pane lists the row
with "place not known" and no Take (`AA.contactRowPlaced`, both ends: the
placed end's faces were matched against a slot that may be the other lug's).
The shell's `mates` feed leaves such rows out, because the shell gives every
mate line a Take (`ISSUE_20261122_the_shells_mate_lines_cannot_show_a_suggestion_without_a_take.md`).
On today's data this reaches v1 only: one row with candidates,
`shank_out_pitch_link`, through the two `NAS1149V0332` washers.

**The mate ranking got the same rule** (`rankMatesAt`): the feature's part and
each bound reference are placed by `AA.partPlacements`, not by every slot the
mesh is drawn at. Without it, binding a lug bushing would have ranked the
plate's bores against both lugs.

**A second wrong offer on the same features, pre-existing, fixed here.** The
walk found v2's two flanged-bushing bores offered, with a Take, the plate's
**spindle** bore (faces 487/521, "coaxial with 215177-001 pitch plate
assembly"). A Take wrote face 487 into the scratch log (shots in
`before_mate_fix/`). The cause is a different one. Each flanged bore is
positioned by a radius dimension from the plate's own spindle bore. That end
is bound (Jeff's v1 coaxiality, read through) on the **container's** mesh
`37e9f606`, so the "same mesh as me" filter missed it, and the mate ranking
treated a dimension's other end as a mating face. Identical on trunk with the
live projection. I fixed it here because the next ordinary click would write
it on the exact features this handoff exists for: a reference across an edge
whose two ends name one part is never a mate (`AA.edgeWithinOnePart`).
Cross-part structural edges (the hub-to-mount fastener patterns) stay mates.

## Shared-mesh parts, per model

| model | parts sharing a mesh with another part | placed after |
|---|---:|---:|
| `vpa_end_stop_v2` | 16 (2 flanged bushings, 2 straight bushings, 4 bearings, 8 races) | 16 |
| `vpa_pitch_linkage` (v1) | 4 (2 bushings `214820-002`, 2 washers `NAS1149V0332`) | 0 |

The v1 bushings are on no gap edge with candidates. The washers reach
`shank_out_pitch_link` (listed, no Take) and `shank_out_rotor` (`no_mesh`).

## Before / after — the lug rows of `contact_suggestions.json`

Before: the main checkout's live projection (built from master `53271c6c`).
After: this branch's builder into a scratch data root, same meshes.

| edge | before: occurrence → plate faces | after |
|---|---|---|
| `pitch_link_straight_bushing_transition_fit` | `prd-e-03300154.1` (tangential lug) → **1370, 1371** | `prd-e-03481962.1` → **1380, 1381** |
| `tan_link_straight_bushing_transition_fit` | `prd-e-03300154.1` → 1370, 1371 | `prd-e-03300154.1` → **1370, 1371** |
| `pitch_link_flanged_bushing_press_fit` | `NAS77C3-015.5` (neither lug) → 1445, 1446 | `NAS77C3-015.4` → **1385, 1386** |
| `tan_link_flanged_bushing_press_fit` | `NAS77C3-015.5` → 1445, 1446 | `NAS77C3-015.1` → **1375, 1376** |
| `pitch_link_bolt_in_flanged_bushing` | bolt `prd-e-03481962.4`, bushing `.7` | bolt `prd-e-03481962.1`, bushing `NAS77C3-015.4` |
| `pitch_link_upper_inner_race_on_bolt` | bolt `prd-e-03481962.1` | same |
| `pitch_link_bolt_in_straight_bushing` | bolt `prd-e-03481962.1` | same |
| `pitch_link_lower_outer_race_press_fit` | `no_contact` | ok, link faces 14/16/36/37 |
| `pitch_link_upper_outer_race_press_fit` | `no_contact` | ok, link faces 54/56/72/73 |
| `tan_link_lower_inner_race_on_mount` | race at `prd-e-03438709.2` (another tangential link) → mount 832 | race at `prd-e-03438709.1` → mount **827** |

**Deliverable 3, the bolt:** all three pitch-link bolt edges now resolve to the
one declared bolt occurrence, `prd-e-03481962.1`, beside the P2 sweep's upper
pitch-link ball.

**The four ball-joint edges** (two races of one bearing) were `no_contact`
before because one bearing's inner race was compared with another bearing's
outer race. They are still `no_contact`, now for an honest reason: one mesh
at one occurrence is never compared with itself. The note says so, and the
builder used to crash there (`nearest_gap_mm` is `None`) once pinned. Comparing
two solids of one mesh is filed:
`ISSUE_20261122_two_parts_that_are_solids_of_one_mesh_at_one_place_are_never_compared_for_contact.md`.

## The walk: Takes on the real projection, in a scratch log

`docs/sessions/lessons/shots/a_take_on_a_lug_feature_binds_that_lugs_own_face/`:
the shell's feature body for each lug feature before the press (`*_row.png`),
after it (`*_after.png`), and the written event (`*_event.json`). The probe
copied the viewer projections, the feature-identity projections and Jeff's
log into `data/scratch/lug_take_20261122/`, swapped in this branch's contact
projection **in both places the pane reads it** (see the trap below), and
counted the real log's files before and after each run (unchanged by the probe).

Each feature's body, opened from the shell's tree, then its first Take
pressed on a fresh scratch copy:

| feature (plate `215735-001`) | the row | Take wrote |
|---|---|---|
| pitch link straight bushing bore | 2 faces · round · r 4.2600 mm · fits the mating pin | **1380, 1381** |
| tangential link straight bushing bore | 2 faces · round · r 4.2600 mm · fits the mating pin | **1370, 1371** |
| pitch link flanged bushing bore | 2 faces · round · r 3.9750 mm · fits the mating pin | **1385, 1386** |
| tangential link flanged bushing bore | 2 faces · round · r 3.9750 mm · fits the mating pin | **1375, 1376** |

Before the mate fix, the two flanged bores' bodies led with four spindle-bore
rows ("coaxial with 215177-001 pitch plate assembly, Ø41.04 vs Ø41.04") and
the Take wrote **487** (`before_mate_fix/`). Trunk did the same with the live
projection. Both bushing ODs read "2 faces · round · r 4.2530 mm · fits the
mating bore". On v1, the bolt end of `shank_out_pitch_link` (whose washer end
is unplaced) shows only "not bound · Pick a face" (`v1_*.png`). Real log: 116
files before and after every run.

## Was a wrong Take already in Jeff's log?

No. Read-only scan of `data/inbox/feature-identity/` (116 files at the end):
no event binds a face of the plate `0d6f23ee`, a lug bushing (`64fc8465`,
`513c2be1`) or the bolt on `vpa_end_stop_v2`. Jeff was binding v2 features
during this session (events 0102–0116). The two on the tangential link's lower
race (0112, 0113) bind faces **of the race's own mesh** (0/1/20/21, 26/27),
which are the same faces at every slot, so neither can be another part's. No
`needs: jeff` issue filed.

## Traps

- **The pane reads contact suggestions from two places.** Over a folder grant,
  `data/projections/feature-identity/contact_suggestions.json`. Over HTTP,
  `contact_suggestions` inside `projections/viewer/kinematic/annotate.json`,
  copied there by the kinematic builder. A probe that swaps only the first
  still shows the old ranking. My first walk did exactly that and read 1370
  on both lugs.
- **A raw newline in a JS string passed `node --check` and the annotate
  tier, and killed the page** ("Invalid or unexpected token", no stack). The
  annotate node tier never loads `app.js`. A Python edit script passed through
  the Bash tool turned `"\\n"` into a real newline. Build a backslash with
  `chr(92)` / `bytes([92])` in such scripts, and open the page before trusting
  an `app.js` edit.
- **`Path.write_text` on Windows writes CRLF.** Harmless under this repo's
  `core.autocrlf=true`, but it makes `cat -A` and byte-level `find` strings
  disagree with what you think is there. Use `write_bytes`.
- **A test elsewhere builds its own stub `Store`**
  (`tests/test_topology.py::test_the_contact_builder_and_the_proposer_read_a_declared_face`).
  A new method `_end` calls needs a stub twin.

## Deliberately not reached (each filed)

- The sweep's instance choice still filters by per-mesh pins:
  `ISSUE_20261122_the_sweeps_instance_choice_reads_pins_per_mesh_so_a_shared_mesh_part_can_take_its_siblings_slot.md`.
- The shell's mate lines cannot show a row without a Take (`apps/viewer` was
  fenced out): `ISSUE_20261122_the_shells_mate_lines_cannot_show_a_suggestion_without_a_take.md`.
- Two solids of one mesh at one place are never compared:
  `ISSUE_20261122_two_parts_that_are_solids_of_one_mesh_at_one_place_are_never_compared_for_contact.md`.
- `scripts/propose_bindings.py` reads no candidates (it records a hand-given
  `--contact-rank`), so it needs no rule.
- The live `contact_suggestions.json` in the main checkout is **not** rebuilt
  by this session. Writing it from an unmerged branch would make every other
  worktree's rebuild refuse (exit 3) until the merge. The review rebuilds after
  the merge (CLAUDE.md: rebuild before the four tiers).

## Test record

All in this worktree, at the branch tip before this lesson's commit.

- **Default pytest tier**, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs`:
  **2589 passed, 2 failed, 1 skipped, 4 deselected in 465 s** (recorded with
  `dispatch suite-time`, inside budget). Neither failure is this branch's:
  - `tests/test_viewer_js_suite.py`: the documented worktree red (the
    viewer's `[real]` tier has no projection here). The same tier run with
    `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **623/623**.
  - `tests/test_export_runs_match_the_run_log.py`: v1 citations missing the
    11-19 gas-spring-mount run. Owned and already fixed on integration by
    `an_export_citation_picks_up_a_new_drawing_checker_run_in_one_command`,
    which completed after this branch was cut.
  - The skip is `test_fit_bound_features.py:433` (a re-extraction that is not
    installed), unrelated.
- **Annotate fast tier**, `node apps/annotate/run_tests.cjs`: **334/334**,
  including its `[real]` checks.
- **Witness**, one run, `--only` for the five specs this branch added or
  changed (two python, the new annotate one, the extended
  `a-part-that-declares-an-occurrence` one, and the re-pointed browser
  `the-end-s-candidate-list` one): **9/9 witnessed** in 5 m 01 s. The first
  attempt was 7/9. My contact-row test put `placed: false` on the `from` end,
  so a check of `from` alone passed it (fixed: the test now puts it on `to`).
  And the browser entry needs `node_modules`, which a worktree lacks: a
  temporary junction to the main checkout's, removed with `rmdir` afterwards.
- **Browser runner `--only`**: no browser suite was added or changed, so none
  was run on its own. The re-pointed spec's witness run included its suite's
  clean run (`annotate rail suggestion …`), and it was green. The whole
  browser tier is the review's.
- The scratch-projection probe (the walk above) is not a tier. It lives in
  the session scratchpad and is described here so it can be rebuilt.

