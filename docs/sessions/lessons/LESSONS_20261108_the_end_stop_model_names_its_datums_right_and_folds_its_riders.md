# LESSONS 2026-11-08 — the_end_stop_model_names_its_datums_right_and_folds_its_riders

Model v2 (`docs/topologies/topology_vpa_end_stop_v2.json`) now has five bodies
and no riders. The page reads them in Jeff's order. The datums are named for
what they locate, the phantom hub–plate edge is gone, and the tan-link mount
has its compound datum. One DoD bullet is **not met**: the P2 sweep leaves the
two piston heads standing still. Why, and who owns the fix, is below.

## The shots (looked at)

`docs/sessions/lessons/shots/end_stop_names_riders/`:

- `2_v2_dag_1600.png` and `2_v2_dag_2560_full.png`: v2's DAG and grid.
- `3_v1_dag_1600_after.png` against `before_v1_dag_1600.png`: v1, unchanged.
- `4_*` to `6_*`: the 3D pane on v2 at rest, mid-sweep and at the low stop.

All of them were taken from this tree's projections, built into a scratch data
root (`data/scratch/end_stop_names_riders/`) and served by
`tests/debug_model_v2_shots.mjs --projections`, so the main checkout's shared
projections were never overwritten from a branch.

What I read off the final shots:

- **Grid, top to bottom:**
  - hub (its four edges)
  - the hub's boss in the mount's pilot bore (a gap row)
  - tan-link mount: pilot to bore, seat to bore, fastener pattern to bore
  - gas-spring mount
  - cover
  - tangential link
  - pitch plate, then piston, then lower head, then upper head
  - pitch link
  - pitch arm, then blade root
  - the two closing joints (travel between the stops, the slide bushings)
- **Hub → mount edge:** the DAG's first branch off the hub lands on the
  tan-link mount, on the row directly below the hub's own three.
- **Containers:** each body is one container, and no body holds a part that is
  not in its `parts`.
- **"Spindle":** no row says it.

## Renames (ids frozen)

| id | old name | new name |
| --- | --- | --- |
| node `hub_spindle_bore_axis` | hub spindle bore axis | hub locating-boss axis (tan-link mount pilot) |
| node `pitch_plate_spindle_bore_axis` | pitch plate pilot boss axis | pitch plate piston-locating boss axis |
| edge `hub_blade_axis_offset` | spindle axis to blade-1 root bearing axis | locating-boss axis to blade-1 root bore axis |
| edge `hub_spindle_to_tan_link_mount_face` | spindle bore axis to tangential link mount seat | locating-boss axis to tan-link mount seat |
| edge `hub_spindle_to_gas_spring_mount_face` | spindle bore axis to gas-spring mount seat | locating-boss axis to gas-spring mount seat |
| edge `pitch_plate_attach_radius` | spindle axis to pitch-link bore radius | piston-boss axis to pitch-link bore radius |
| edge `pitch_plate_tan_link_attach_radius` | spindle axis to tangential-link bore | piston-boss axis to tan-link bore radius |

**The hub node's note.** The handoff asked for "concentric with the spindle by
design". The new test bans the word "spindle" in every note, so the note now
says: concentric by design with the main bearings the whole propeller turns
on, and those bearings and the shaft are not in this model.

**Body names.** Both changed to match their new members:

- base: "ground: the hub, the two mounts and the piston cover"
- pitch_plate: "pitch plate, gas-spring piston and piston heads"

## The removed edge

`hub_to_pitch_plate_spindle_coaxiality` (a `cylindrical_slide` gap) is gone
from v2. The plate is located through the piston (`pitch_plate_pilot_in_piston`),
the piston through the mount's bushings
(`pitch_plate_slide_bushings_to_piston_body`), and the mount through its seat on
the hub, so the hub's axis enters the stack nowhere.

The sweep's "214373-002 driver 215177-001" joint is linkage's kinematic
abstraction of the travel degree of freedom, not a tolerance edge. Its two
nodes stay, because the sweep names both by id. v1 keeps the edge, and Jeff's
binding on it in v1's log is untouched.

## New nodes and edges (the tan-link mount's compound datum)

| id | kind | interface / node kind | what it is |
| --- | --- | --- | --- |
| `tan_link_mount_pilot_bore` | node | `datum_feature`, cylindrical face on the mount | locates on the hub's boss |
| `tan_link_mount_fastener_clocking` | node | `mating_surface`, on mount and hub | rotation constrained by the perimeter fasteners |
| `hub_boss_in_tan_link_mount_pilot` | gap edge | `pin_in_bore` | hub locating boss in the mount's pilot bore |
| `tan_link_mount_pilot_to_bore` | structural (mount) | — | pilot bore to attachment bore (the bore's radial location) |
| `hub_boss_to_tan_link_mount_fasteners` | structural (hub) | — | locating-boss axis to the hub's hole pattern for the mount |
| `tan_link_mount_fasteners_to_bore` | structural (mount) | — | fastener pattern to attachment bore (clocking) |

None of the new edges carries a `dimension`, and each note says what would
close it.

**Clocking interface word.** The vocabulary has none for "a bolted clocking".
`interface` is a word on a gap edge only, and the topology refuses it on a
structural edge. The repo already models a fastener clocking as one
`mating_surface` node on both parts, with a structural edge on each side
(v1's `pitch_arm_blade_root_clocking`). I followed that precedent and added no
new word.

## The walk-order rule, as implemented, and what it did to v1

**Feasibility answer: the suggested rule cannot be a no-op on v1.** Applied to
v1 unchanged, it moved the walk from 16/70/50 crossings on 14 columns to
55/66/83 on 15. I then re-ordered v1's `bodies[]` and `parts` to the order v1
draws today, and that did not reproduce v1's walk either (43/114/63). I
measured each part of the rule separately:

| part of the rule | effect on v1 |
| --- | --- |
| start on the first body's first part | no-op |
| the current body's own deferred edges in `parts` order | no-op |
| sorting a node's edges by part | moves v1 |
| crossing into the earliest authored body | moves v1 |

**So the rule is declared, not default.** `walk_order` is a new top-level
topology field:

- Vocabulary: `WALK_ORDERS = ("nearest_fork", "authored")` in
  `tolerance_stack/topology.py`.
- It is paired against `docs/DAG_TOPOLOGY.md`, "The vocabularies".
- Python is the only reader, so it is not in `vocab.gen.js`.

v2 declares `"walk_order": "authored"`. Under that value, `serialize_topology`:

1. starts at the first node on the first body's first part;
2. takes a node's in-body edges by the `parts` rank of the part each leads into
   (staying on the same part first);
3. after a body is done, walks its own deferred edges in `parts` order;
4. then crosses into the earliest authored body not yet drawn;
5. otherwise falls back to the nearest fork.

**v1 is byte-identical.** The layout matches at the serializer, the projection
entry matches, and `node tests/debug_model_v2_shots.mjs --dump-v1` produced the
same rails SVG and grid markup before and after (`cmp` clean, 146,769 bytes).
`tests/test_topology_projection.py::test_the_authored_walk_is_not_the_product_models`
pins why it is not the default.

**Two authoring choices made to fit the rule** (both are file order, so Jeff
can re-order them):

- **Blade parts.** Authored as `[pitch_arm, blade_root]`, because the loop
  reaches the blade from the pitch link.
- **Hub edges.** The pilot gap is listed first among the hub's three edges into
  the tan-link mount. With the seat edge first, the viewer's block drawing
  crossed itself 28 times against the walk's 24. The `[real]` check "drawn as
  blocks … crossing itself no more than the builder's walk does" was red.
  Pilot-first gives 23.

**What the fold costs the page, measured.** Over every ordering I tried, v2's
leader-vs-rail crossings after the spine mirror rose from 3 to 11–12. That is
the fold and the new nodes, not the order. `apps/viewer/README.md` now says
41 → 12. Bringing it down is the DAG/grid sibling's
(`the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows`).

**Still open from the five-body-column issue:** the blade is reached last, so
its closing edge still runs back up to the hub's bore row. That is in the
addendum on `ISSUE_20261108_model_v2s_five_body_dag_draws_a_column_not_a_loop.md`.

## The 3D pane: heads do not move (DoD not met)

`apps/annotate/app.js` poses a part in a sweep only in three cases:

- the run's subject lists it (linkage's lists name neither head nor the cover);
- its body `rides_with` the subject;
- it is carried inside a matched occurrence.

Folding deletes the rider bodies, so the heads now stand still at their
assembly position while the piston moves. The cover is on ground, so it is
right where it is.

The measurement: the sweep's anchor rows, printed by the shots script, have no
row for 214699, 214698 or 214958 (before the fold the heads were `rides` rows).

The fix is in `apps/`, which this handoff fences out. The scene sibling owns
`apps/annotate/` and launches after this merges. Filed as
`docs/issues/ISSUE_20261108_the_sweep_leaves_model_v2s_folded_piston_heads_standing_still.md`
(code-red), with the fix and its v1 caveat.

The rest of that DoD bullet holds: the pane says v2 and the P2 run plays.

## The gas-spring mount — Jeff's open question

The tan-link mount got boss, seat and fasteners. The gas-spring mount still has
one seat node (`gas_spring_mount_hub_face`) and one hub edge into it. Jeff has
not said how it locates on the hub: a pilot, dowels, or the bolt pattern alone.
It would want the same three-part datum once he does. Not done, per the
handoff.

## apps/ touched despite the fence — figures only

The viewer's `[real]` tier re-derives figures in `apps/viewer/README.md` and in
a comment in `apps/viewer/views/topology.js` from the live projection, and v2's
change moved them. Four were updated, figures only, so a merged tree stays
green:

- leader-vs-rail crossings: 256 → 25 became 260 → 34;
- hover/click divergence: 58 of 102 became 60 of 104;
- membership count: 44 became 45, and its complement 14 became 15;
- rail allocations: 17 over 7 became 18 over 7.

No behaviour changed under `apps/`.

## Gotchas

- **Heredocs ate a backslash in Python.** Through the Bash tool, a
  `'''…\\n…'''` inside a `python - <<'EOF'` heredoc reached Python as a real
  newline. Write the script to the scratchpad with the Write tool instead.
- **Scratch data root for the `[real]` tiers from a worktree.**
  1. Copy the main checkout's `data/projections` into a scratch `repo/data`.
  2. Junction `inbox` and `meshes` into it, and junction the worktree's `docs`
     as `repo/docs`, because worksheets are read from `--repo`.
  3. Rebuild all seven projections into it with `--data-root … --allow-older-tree`.
  4. Pass `--repo <scratch>/repo` to the runners.

  The annotate runner has no `--repo`. It reads the worktree's own `data/`
  first, so I copied projections there (gitignored). The browser tier needs
  `node_modules`: junction the main checkout's.

## Verification record

| tier | where | result |
| --- | --- | --- |
| `pytest -q`, final tree, 568 s | worktree, this tree's projections in its gitignored `data/` | 1891 passed, 1 skipped, 0 failed |
| `pytest -q`, earlier tree, 390 s | worktree, no `data/` | 1890 passed, 1 skipped, 1 failed |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | worktree, against a scratch data root built from this tree | 672/672 |
| `node apps/annotate/run_tests.cjs` | worktree, this tree's projections in the worktree's gitignored `data/` | 303/303 |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`, ~30 min | worktree, `node_modules` junctioned | 42/43 |
| `node scripts/run_mutation_witness_tests.mjs --changed-since integration` | worktree | 0 of 847 entries reachable |
| `node apps/annotate/run_browser_check.mjs --real <P2>` | worktree | red, the same failures as baseline |

What each non-green line is:

- **pytest's one failure, in the earlier run,** is `test_viewer_js_suite.py`, which is
  deliberately red in a worktree. The viewer tier it stands for ran green
  against the scratch root (next row).
- **The browser tier's one failure** is
  `annotate rail holds still (bodies under Bodies, joint words, framing, the second face)`.
  The same 6 of 17 sub-checks fail against the main checkout's baseline
  projections. Filed as
  `ISSUE_20261108_the_rail_holds_still_browser_check_is_red_on_integration.md`.
- **The annotate `[real]` check** is ungated, and the same failures show on the
  baseline. Filed as
  `ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model.md`.

The linkage pairing test is green on both models.

**Not done here:** rebuilding the main checkout's shared projections from this
branch. That belongs to the post-merge step (`scripts/rebuild_projections.ps1`
in the main checkout). Every `[real]` run above read projections built from
this tree into `data/scratch/end_stop_names_riders/`.
