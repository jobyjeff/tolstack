---
priority: med
depends_on: [guard_mutation_witness_tier]
model: opus
---

# HANDOFF 2026-09-14 — projection_field_guard_rows: bring three projection fields into the guard sets they belong in

Source: triage sweep 2026-09-14/15, dispositioning three issues from the reviews
of `annotate_affordances_flyout_and_mesh_gating` and `stack_title_style_pass`.

**Why `depends_on: [guard_mutation_witness_tier]`** — not a judgement about
importance: both handoffs edit `apps/viewer/tests.js`, and that handoff
restructures how a guard declares what it witnesses. Adding rows first would mean
writing them twice, and the merge would conflict in the same file. Land the
harness, then add rows that declare their mutations in the new shape.

Baseline: trunk after the 2026-09-14 batch merge, plus `guard_mutation_witness_tier`
merged. Scope: `apps/viewer/tests.js` (`TOPO_VALUE_GUARDS` and the `[real]` mesh
block) and `tests/test_topology.py`. Do NOT touch
`scripts/run_viewer_browser_tests.mjs` or `topology_app.js`, and do NOT change
the projection builders — every item here is a *guard* gap, not a data defect.

## Deliverables

1. **`parts[].mesh` needs a `TOPO_VALUE_GUARDS` row.** `annotate_affordances_flyout_and_mesh_gating`
   added a new enumerated projection field the page switches on —
   `topologies[].parts[].mesh.installed`, which decides whether every 3D
   affordance renders — and did not enrol it in the guard class this repo already
   keeps for exactly that kind of field.

   `TOPO_VALUE_GUARDS` has eight rows today (`layout.rows[].kind`,
   `layout.links[].kind`, `edges[].value_source`, `studies[].status`,
   `edges[].confidence`, `nodes[].kind`, `edges[].kind`,
   `edges[].transform.kind`), driven by `[real] no live topology value is one the
   page cannot render`.

   The row bites in the direction that matters, which is the point: **its
   `values()` collector going empty is itself reported** ("no live value found —
   either the collector is wrong or the builder stopped writing it"), and that is
   the case a boolean's own two-value set cannot catch. An absent `mesh` block is
   currently silent.

   `docs/prompts/REVIEW_AGENT.md` already states the rule this satisfies:
   *"whether a field is covered is no longer yours to enumerate; read the rows"*.

2. **A topology's `description` must come under the structural-count guard.**
   `stack_title_style_pass` added an optional top-level `description` to
   `Topology`, `Study` and `StackDefinition`, and moved into it the qualification
   the shortened `title` shed. For two topologies the demoted sentence is a
   **structural inventory of the graph**:

   | file | `description` | `notes` (the guarded copy) |
   | --- | --- | --- |
   | `topology_pitch_link_to_pitch_plate.json` | "…as a graph: **4 parts, 7 interfaces, 8 edges**. …" | "The graph: 4 parts, 7 interfaces, 8 edges, 3 branch points, 2 grounded loops …" |
   | `topology_tan_link_to_pitch_plate_take2.json` | "…as a graph: **4 parts, 7 interfaces, 7 edges**, closing at the derived protrusion gap." | same counts, in `notes` |

   **Both are correct today** — verified by hand against the files (4/7/8 and
   4/7/7). The defect is the pairing, not the numbers: so do not "fix" any count.

   `tests/test_topology.py::test_a_topologys_own_notes_count_the_graph_they_describe`
   is the guard this repo wrote for exactly this hand-copy, and it scans only:

   ```python
   prose = json.dumps({k: v for k, v in raw.items()
                       if k in ("title", "notes", "provenance")})
   ```

   Add `description` to that set. Check whether `Study` and `StackDefinition`'s
   new `description` fields need the same treatment, and say what you found —
   the issue only measured the topology case.

3. **Two of the three `[real]` mesh tests must stop pinning the mesh count.**
   The rule `annotate_affordances_flyout_and_mesh_gating` set is *offer a 3D
   affordance exactly where a mesh resolves*, and it has to hold at **any** mesh
   count without a test edit — because a sibling rotorkit handoff
   (`assembly_step_part_extraction`) is actively growing the mesh set. In
   `apps/viewer/tests.js`'s `--- 3D affordances against the REAL mesh set ---`
   block:

   - `[real] across every live topology, a part's 3D affordance is offered exactly
     where a mesh resolves` — **count-free, with non-vacuity witnesses on both
     sides. Correct; needs no change. Do not touch it.**
   - the other two redden when the mesh set grows. Rewrite them to assert the
     rule rather than the magnitude, keeping a non-vacuity witness so they cannot
     pass on an empty set — the correct test above is the model to follow.

   This is the same defect shape as atp-post's
   `census_live_test_pins_a_growing_count` (a count over a population that is
   still being added to), which the same sweep routed there. Worth one line in
   your lesson if the fix rhymes.

## Definition of done

- `mesh` appears in `TOPO_VALUE_GUARDS` and the `[real]` value guard passes
  against the live projection at
  `C:\workspace\tolstack\data\projections\viewer\topologies.json` (read it there
  by absolute path — it does not exist in your worktree). Demonstrate the row
  bites: temporarily empty the collector and show the "no live value found"
  report firing.
- `test_a_topologys_own_notes_count_the_graph_they_describe` reads `description`
  and still passes — then demonstrate it bites by editing one `description` count
  to a wrong number in a scratch copy and showing the failure.
- The two count-pinned mesh tests pass with the current mesh set **and** with a
  synthetically enlarged one. Show both.
- All tiers green: `node apps/viewer/run_tests.cjs` and `--repo
  C:\workspace\tolstack`, and `venv-win/Scripts/python.exe -m pytest -q` (869
  passed / 1 skipped before this handoff's additions).
- Each new/changed guard declares its mutation in the tier
  `guard_mutation_witness_tier` introduced. If that handoff's mechanism turns out
  not to fit a Python-side guard like item 2's, say so plainly rather than
  forcing it.
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_projection_field_guard_rows.md`):
  whether `Study`/`StackDefinition` `description` needed the same guard, and
  whether any *other* field added in the last month is missing from
  `TOPO_VALUE_GUARDS` — the enumeration is the thing that keeps going stale, so
  an audit result is worth more here than the three fixes.
