---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_the_blade_and_piston_joints_are_authored_as_what_the_parts_show.md
reviewer: agent
date: 2026-11-17
verdict: APPROVE
blockers: 0
---

# Review: the blade and piston joints are authored as what the parts show

The branch `handoff/the_blade_and_piston_joints_are_authored_as_what_the_parts_show`
was reviewed at `23f47183`. It fast-forwarded the review branch, cut from
`integration` at `0ba213ec`, and had not been merged before (the containment
check came back false). The tactical worktree is clean, and the handoff tip did
not move during the review.

## What was verified

**This is topology authoring, not a stack.** Mandatory checks 1–7 have no
subject here:

- v2 is studyless and carries no values.
- Every new edge is `structural` or `gap`, with no dimension and a "Value to come
  from <drawing>'s drawing." / "What would close it" sentence.
- No `source_ref`, band, `lmc`/`mmc`, path term or check was added. So there is
  no traced ratio to recompute, no sign to read and no RSS to find.

The provenance question here moves to the mesh evidence in the node notes, and
that was audited directly.

**The mesh evidence re-derives.** I wrote my own probe (scratchpad, not
committed), using `fg.fit_face` and each mesh's `placement_world`.

Piston body ↔ heads and plate ↔ piston body, in the assembly frame:

- **Body spigot:** faces 4/5, Ø40.000, z 211.635–214.835. Head seat 168 is at z 210.835.
- **Lower head bore:** faces 1/2, Ø40.000, z 211.835–213.326. That gives the
  lesson's 1.49 overlap.
- **Upper head bore:** faces 114/115, Ø40.000, z 213.826–214.935. That gives the
  1.01 overlap.
- **Body top and recess floor:** body top face 1 is at z 215.835 and the recess
  floor (151) at 215.935, so they are 0.100 apart and not a seat, as the note says.
- **Upper head's three holes:** Ø5.2 (head) against Ø5.3 (body), with
  coincident centres (9.134, 6.481) and (1.046, −11.151). The circle radius is
  11.2, so Ø22.4.
- **Plate ↔ body flange:** body face 109 at z 102.166 (−Z) against plate faces
  922 and 382 at 102.166 (+Z). The plate holes (Ø5.2) and body holes (Ø4.9) are
  both on r 36.0, so Ø72. The pilot is Ø41.040 in Ø41.072.

Blade ↔ pitch arm, diameters in each mesh's own frame:

- arm bore 253/254 is Ø64.030;
- root boss 1060/1061 and 6439/6440 are Ø64.000;
- the cross holes (266/267, 271/272, 4558, 6403, 6572) are Ø6.350;
- the seat planes 250 and 1079/6432 are opposed.

**I did not re-derive the blade's hole angles or the 0.025 seat gap.** Both are
in the question for Jeff, which is the right home for them.

**Every count was recounted from the diff.** Each figure below matches the pins
in `tests/test_model_view.py` and the inventory sentence in
`docs/DAG_TOPOLOGY.md`:

- 9 new nodes (31 → 40) and 16 new edges (13 structural + 3 gap; 40 → 56);
- cycle rank 56 − 40 + 1 = 17;
- contacts 11 + 4 = 15, gaps 10 + 3 = 13;
- features 42 + 13 = 55, dimensions 30 + 13 = 43;
- within bodies: pitch plate 3 + 2 + 2 + 1 = 8, blade 3;
- joints 15 → 16, compound joints 3 → 7;
- every per-part (features, dimensions) pair in the lesson's table.

**Scope:**

- The v1 topology and the map's layout file are untouched
  (`git diff --name-only`).
- `apps/` changed only for the map defect the new joint exposed, plus two README
  and comment count updates. The `[real]` tier pins both of those.

**The map fix (`apps/viewer/map.js`, `partBetween` / `flankOf` / `detour`)** is
small and local. It only applies when two parts in one column have another
part's cell between them. Its new fast guard is enrolled: a spec, a pin of
721 → 722 with a new names digest, and the spec `WITNESSED` in my gate run.

**Shots.** I read shots 01 and 05: the detour reads beside the lower head.

**Feature-identity log.** The real log at `data/inbox/feature-identity/` held 84
files before my runs and 84 after.

**Issue contract:**

- The questions issue carries `needs: jeff` with a 107-character `ask:`.
- The handoff itself requires `needs: jeff` with a shot per row, and both
  questions are about the design intent of Jeff's parts. So I did not re-route it
  to `audience: strategy`.

## Tests

| Run | Where | Result |
| --- | --- | --- |
| Risky subset, pre-merge (`test_topology`, `test_topology_projection`, `test_model_view`, `test_viewer_projection`, `test_topology_map`, `test_mutation_witnesses`, `test_architecture_inventory`, `test_tolerance_stack`, `test_provenance`, `test_claims_registry`, `test_contact_suggestions`, `test_js_vocabulary_is_generated`) | review worktree | 687 passed, 178 s |
| Full default tier, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` | review worktree, merged tree | 2114 passed, 1 failed, 1 skipped, 460 s (inside budget, recorded) |
| Viewer fast tier, `--repo` on a scratch root built from the merged tree | `data/scratch/rvbpj` | 722/722 with `[real]`; the projection is paired at `23f47183` |
| Annotate fast tier | review worktree | 324/324, no SKIP lines |
| Witness gate, `--changed-since integration --budget-min 10` | scratch root | 4/4 witnessed, 0 left to the sweep, 171 s |
| Whole browser tier | scratch root, tree `6026532151d5` | 47/48 in 1903 s; the red is shown below |
| `--only "kinematic study page"` | same root | 27/27 |

**The one failure in the full suite** is `test_viewer_js_suite_is_green`. It is
the documented worktree red: there is no `data/` in the worktree. That tier
passed through `--repo` (the row above). This repo's conftest prints no
contention header lines.

**The scratch root** was built per the overlay's recipe. It is a `git archive`
of the merged tree, with no `.git`. The inbox, meshes and non-viewer projections
were copied in, `venv-win` and `node_modules` were junctioned, and all eight
builders ran from the review worktree with `--data-root`. I did not reuse the
tactical root `bpj`, because it holds the tactical agent's scratch bind (event
0084).

**The single browser red** is `[real] colouring by body … survives a reload` on
the kinematic study page. It is the deferred flake
`ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent.md`.
The `--only` re-run was green on the same root, and the page draws v1's study,
which this diff does not touch. I appended a sighting to that issue.

**The browser tier ran 1903 s, against an 1800 s budget.** The runner's own ledger
row says `over: true`. I appended the measurement to the open
`ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.

## Findings

No blockers and no should-fix findings.

- **Design (filed, low):** the upper piston head pattern's detour lane runs
  outside the pitch plate district's dashed border (shot 01). The lesson names
  it as cosmetic but files nothing. Filed as
  `docs/issues/ISSUE_20261117_design_a_map_detour_lane_runs_outside_its_bodys_district.md`.
- **Note:** the plate-side holes (z 98.50–101.77) stop 0.4 mm below the seat
  plane at 102.166. Presumably a counterbore or chamfer face sits between them.
  This is evidence only, and nothing in the model reads it.

## Note for the next reviewer

- The overlay gained one entry: "A topology note's mesh evidence is a claim you
  can re-fit in a minute". It gives the recipe for re-deriving the mesh evidence
  in a node note.
- The worktree needs a `node_modules` junction before the browser runner will
  start. Mine failed on a missing `playwright-core` until I added it.
