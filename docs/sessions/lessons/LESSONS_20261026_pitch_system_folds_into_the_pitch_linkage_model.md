# LESSONS 2026-10-26 — pitch_system folds into the pitch linkage model

Handoff `HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md`.
`topology_pitch_system.json` is folded into `topology_vpa_pitch_linkage.json`
and deleted. The document now declares `bodies[]`. The seven pitch-system
studies and the kinematic study are studies of the one graph. Every study
total, band and check verdict is unchanged; the before/after pin is below.

## The id-collision table, and which side won

Same physical feature under two ids → the linkage id wins. One id naming two
features → the linkage edge keeps it and the pitch-system edge is renamed.
`provenance.pitch_system_ids` in the merged document names every id that came
from `pitch_system`, as it is spelled now, plus the old ids that changed.

| pitch_system | vpa_pitch_linkage | kind of collision | outcome |
| --- | --- | --- | --- |
| part ids `hub`, `pitch_plate_215177_001`, `pitch_link`, `pitch_arm`, `blade_root`, `gas_spring`, `gas_spring_mount_213668_002`, `tan_link_mount_215175_002` | same ids | same part | linkage entry wins (name, drawing, note). `revision: A.1` on the gas-spring mount carried over, since only pitch_system had it. The pitch-system part notes were dropped (git has them). |
| node `hub_tan_link_mount_seat` (mount + hub) | node `tan_link_mount_hub_face` (mount + hub) | same interface | linkage node wins; two edges re-point |
| node `pitch_plate_link_hole` (plate + link, one mating node) | `pitch_plate_link_attach_bore` (plate) + gap `pitch_plate_link_joint` + `pitch_link_upper_sphere_centre` (link) | same joint, two granularities | **split**: an edge on the plate re-points to the bore, an edge on the link to the sphere centre |
| node `pitch_link_arm_hole` (link + arm) | `pitch_link_lower_sphere_centre` + gap `pitch_arm_link_joint` + `pitch_arm_link_bore` | same | split the same way; `vertical_hub_to_pitch_arm` now ends at `pitch_arm_link_bore` |
| edge `pitch_link_length` (plate hole → arm hole, 0 ± 0.03 B31, nominal in `properties`) | edge `pitch_link_length` (lower → upper sphere centre, 105.9908 min = max) | same feature, same id | linkage edge (endpoints) wins; it carries pitch_system's **band** as its dimension, the 105.9908 nominal in `properties.nominal_length_mm`, and the old nominal citation in `properties.nominal_citation`. Traversed upper → lower by the pitch studies, so its sign is −1 where it was +1; the band is symmetric about 0, so no total moves. |
| edge `tan_link_mount_height` (gas-spring seat → hub seat, 215198 79.00 ±0.10, traced) | edge `tan_link_mount_height` (hub face → attachment bore, valueless) | **one id, two features** | linkage keeps the id; pitch_system's is **`tan_link_mount_overall_height`**. The kinematic study's band ref follows the rename. |

Swept by part + feature and **not** merged: the remaining pairs where both
shapes stand side by side (gas-spring joint at the plate, blade root in the
hub, the contradictory gas-spring mount seat, clocking hole against clamp face,
rod-end bore against spindle axis). Each is a modelling call, filed as
`ISSUE_20261026_the_pitch_system_half_and_the_linkage_half_model_joints_twice.md`
(audience strategy).

**The decision this handoff did not anticipate.** "The linkage id wins and the
selections re-point" was impossible as written for the pitch link. A traversal
refuses a valueless edge in a selection, and the linkage half joins the link to
the plate and the arm through **valueless joint gaps**. So the two joint gaps
now carry an `assumed` 0/0/0 band whose note starts `PLACEHOLDER -- zero by
assumption`. That is the zero-clearance assumption pitch_system made silently
by using one mating node. The four studies that cross the link select both
gaps (with the link's transform in their `transforms` map). Their totals are
unchanged, and each reports two more open terms: blade-angle and end-stop
studies "10 of 12", vertical "8 of 10". The alternative, keeping a second
pitch-link edge on pitch_system's mating nodes, would have left two edges for
one feature, which is what the handoff exists to end.

## Before / after counts

| | before (two documents) | after (one) |
| --- | --- | --- |
| topologies | 6 | 5 |
| parts | 16 + 12 | 20 |
| nodes / interfaces | 29 + 21 | 47 |
| edges | 36 + 24 | 59 |
| branch points | 12 + 5 | 19 |
| grounded loops (cycle rank) | 8 + 4 | 13 |
| gap edges | 12 + 1 | 13 |
| components | 1 + 1 | 1 |
| bodies | — | 13 (5 mechanism + 8 one-part) |
| studies on the model | 1 chain + 1 kinematic, and 7 chain on pitch_system | **8** chain + 1 kinematic. The handoff's DoD says nine chain studies; 7 + 1 travel is 8 |
| kinematic band refs into a second topology | 4 | 0 (all 5 refs name `vpa_pitch_linkage`) |
| `assumed`-on-a-drawn-part exemptions | 2 | 6 (handoff said three; it was two) |
| layout | pitch_system: 10 cols, exact, 0/17/0 | 18 cols, `shortest_first`, branch 5 / close 115 / leader 2 |

The digits that moved, and where: `tests/test_topology_prose_for_a_reader.py`
(6 → 5 topologies); `docs/DAG_TOPOLOGY.md`'s inventory sentence (the test
re-derives it); the pitch_system note whose "5 branch points, 4 grounded loops,
1 gap edge" the notes scanner caught (counts dropped, the note is about the old
document); `apps/viewer/README.md` (crossings 314→0 became 440→2, "four of the
five"; max jog 1157→572; 106 rows × 26px = 2756px; 18 columns; pane 608→410;
`gridOffset` 585→1508; reuse 23 over 18; hover divergence 35 of 74); the
`layout_crossings` claim; `views/topology.js`'s divergence comment (35 of 74,
28 as a set, 7 reordered); and the `[real]` pins in `apps/viewer/tests.js` and
`scripts/run_viewer_browser_tests.mjs` (leaders 38, groups 49, bands 39, spine
crossings 138, forks 19).

**Pin before you start, and pin to a diff.** `summarize()` over every study
was dumped before the first edit and diffed after. The only differences were
the two zero joint terms (and the open-term counts they add) and the rename.
Kinematic study: −6.992 / ±0.290 / ±0.169 / margin 0.210 at −7, 72.001 /
±0.315 / ±0.169 / margin 0.185 at +72, identical before and after. Its
projection differs only in `body` (new), the band sources' topology, the
contributor notes, and the renamed band id.

## `bodies[]` as implemented (linkage's follow-up is written from this)

- **Shape:** `{id, name, kind: "body" | "link", parts: [part ids], note?}` on
  the topology document. `BODY_KINDS` is a module constant in
  `tolerance_stack/topology.py`, paired to `docs/DAG_TOPOLOGY.md`. It is not
  in the JS vocabulary registry because nothing in JS reads it yet; add a
  registry row with the first renderer.
- **Rules (`Body` + `Topology.__post_init__`):** kind in `BODY_KINDS`; at least
  one part; no part twice; every part declared; a part in at most one body.
  All or nothing: declaring any body means every part is in one.
  `Topology.body_of(part)` returns the `Body`, or `None` when the document
  declares none.
- **The five mechanism bodies** equal `linkage/vpa.py`'s `BODY_PARTS` +
  `LINK_PARTS`, with `kind` following the list (`test_the_mechanism_bodies_are_linkages_own`,
  read with `ast`, skipped without the sibling). One declared difference:
  `tan_link` also holds `spherical_bearing_tan_link` and
  `spherical_bearing_tan_link_ms14103_3`, because they are pressed into
  212956-005 and move with it. Linkage lists the assembly alone so its mesh is
  not drawn twice. The handoff said "exactly linkage's"; "every part in exactly
  one body" made that impossible to keep honestly.
- **Everything else is a one-part body**, id = the part id, with a note saying
  the mechanism does not place it. That covers `gas_spring`, both piston heads,
  the piston cover, `vpa_208510_007`, `vpa_piston`, `ring_gear` and
  `hydraulic_brake`. No `hub_statics`-style group: the VPA body is bolted to the
  hub, but grouping it would be a claim about the mechanism, and the ring gear
  and the brake plainly move.
- **Projections:** `topologies.json` per topology `bodies: [{id, name, kind,
  parts, note}]`, `[]` when none. Each kinematic row has `body`: its edge's
  part's body, `null` for a gap edge. The real sweep's `feature.body` agrees on
  every contributor (`test_real_every_contributor_carries_the_body_its_part_moves_with`).
- Linkage reading this file instead of its own lists is filed:
  `ISSUE_20261026_linkage_keeps_its_own_body_lists_beside_the_topologys.md`.

## Every `apps/` line touched, and why

The handoff allowed only load-throw fixes in `apps/`. Nothing in the merged
projection throws at load, so **no app behaviour changed**. What changed is
tests, docs, comments and one fixture, all needed for the DoD's green tiers:

- `apps/viewer/topology_fixtures.js`: `"bodies": []` plus a header note. The
  fixture-shape `[real]` check refuses a projection key the fixture lacks.
- `apps/viewer/tests.js`: `livePitch` now finds `vpa_pitch_linkage`. The
  grouping, band-tint, blade-root, variation-only (now scoped to
  `provenance.pitch_system_ids`), spine-leader and fork pins are re-measured.
  The per-document qualifier check is a named SKIP (see below). The two
  kinematic pins are stale since the tangential link handoff, described below.
- `apps/viewer/README.md`: the spine/fit/centring numbers, the
  `layout_crossings` claim, two deep-link examples, and "every committed
  topology is inside the exact width" (no longer true).
- `apps/viewer/views/topology.js`: the comment the hover-divergence test pairs
  to the README (35 of 74 / 28 / 7). Comment only.
- `scripts/run_viewer_browser_tests.mjs` and four `tests/debug_*.mjs`: the nav
  row id and the band/leader counts.
- Data, not app: three `blade_root` edges' `name` lost their "blade-root"
  prefix (ids unchanged). The part's name is now the linkage half's "blade
  bonded assembly", which `VA.elementDisplayLabel` cannot trim "blade-root"
  against. Without the rename the rows Jeff complained about on 2026-09-15
  would truncate again.

## Found on the way

- **The kinematic `[real]` pins were stale before this branch.** The fast pins
  (0.256 / 0.258, two gap rows) and the browser pins (+0.256 / +0.258, ±0.244 /
  ±0.165, "fifth and sixth gaps") predate
  `the_tangential_link_cites_its_drawing`, which banded both gap rows and
  shrank both margins. That handoff ran no viewer tier, and the pre-fold build
  already gives 0.210 / 0.185. Fixed here. Two of the specs' mutations
  (drop band-less rows; write every row as a term) could no longer bite, so
  they now drop banded rows and write every row as a gap. Three guards were
  retitled (they promised gaps). The specs were renamed to the derived names,
  and the fast and browser name-set pins in `scripts/guard_enumeration.mjs`
  were re-pinned.
- **The per-document "unverified" qualifier lost its only live witness.**
  Before, the hub had no drawing. Now it declares 214373-002, so no live part
  without a drawing cites both a verified and an unverified document.
  `ISSUE_20261026_the_per_document_qualifier_lost_its_only_live_witness.md`.
- **Four pitch-system placeholders hit the 2026-10-22 rule** once the hub and
  blade root carried the linkage half's drawings. Each now has a
  `no_drawing_governs`. Two say plainly they are **exemptions made by the fold,
  not findings**; the pin lists six. Appended to
  `ISSUE_20261022_two_pitch_system_placeholders_are_exempted_...`.
- **The one-nominal guard lost its corpus subject**, which is the point of the
  fold. Its non-vacuity companion is gone. The guard now rebuilds the
  2026-09-30 pair in memory first, then runs the corpus. Its mutation spec
  mutates the helper's two branches instead of the deleted file's data. A new
  `test_the_topology_nominal_pairing_still_reads_the_corpus` keeps the corpus
  half honest.
- **Re-serialising a topology JSON rots mutation anchors.** The original file
  mixed literal `±` with `\u` escapes. `ensure_ascii=False` keeps the diff
  against the original at 23 deleted lines; `True` broke an anchor. One anchor
  (`76.86 ±0.10`) then matched twice, because the folded-in gas-spring mount
  edge cites the same callout. It is now unique, via the preceding `"cell": null`.
- **The DAG is now product-sized**: 18 columns past the exact search, 115 close
  crossings, and the right-justified spine no longer reaches 0 leader crossings.
  `ISSUE_20261026_the_product_graph_is_past_the_exact_column_search_and_crosses_itself.md`.
- The layout tests measured on the old graph (`test_the_pitch_systems_short_legs...`,
  `test_no_other_column_order_beats...`, the count self-test) read a frozen copy,
  `tests/fixtures/topology_pitch_system_before_the_fold.json`.
- Heredocs through the Bash tool still eat backslashes (`'\u'`, `"\n"`), as two
  earlier lessons say. Write edit scripts to scratch files.

## Verification

Recorded in the completion report, from the runs' own output. Projections were
built from committed trees into
`C:\workspace\tolstack\data\scratch\pitch_merge\root\data` (inbox, specs and
meshes copied; `linkage-sweeps` junctioned read-only). The shared
`data/projections/` was not rebuilt; the batch merge does that. Delete the
scratch root after review.

### The runs, as recorded

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider -rs`,
  run in the worktree: 1 failed, 1551 passed, 1 skipped, 558s, inside budget
  (recorded with `dispatch suite-time`). The failure is the documented worktree
  red (`test_viewer_js_suite`: no projection in a worktree). The skip is
  `test_fit_bound_features.py:424`, a re-extraction that is not installed.
- `node apps/viewer/run_tests.cjs --repo <scratch root>`: 550/550, plus one
  named SKIP (the per-document qualifier, filed).
- `node apps/annotate/run_tests.cjs --repo <scratch root>`: 213/213.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch root>`: every
  suite green except `topology file:// respine` and `topology height budget`.
  Those two flake on frame timing under load: an `--only` re-run on the same
  tree gave 40/40 and 21/21
  (`ISSUE_20261026_respine_and_refit_browser_checks_miss_their_frame_under_load.md`).
  The annotate sweep rail on P2 is 15/15, so the joint feature ids linkage
  names did not move.
- Mutation witnesses, `--only` for each spec this branch touched: 5/5
  mutations witnessed across 4 specs, plus the renamed
  `browser__real-the-7-deg-stop-ranks-six-contributors-every-one-a-b__b7c5d4f7`.
  It was not run `--only` on its own; it runs at the merge's `--full`.
- Not run: `scripts/rebuild_projections.ps1` and the main-checkout pytest. The
  main checkout is on `master`, without this change.
