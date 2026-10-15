---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-15 — annotate_texts_follow_the_installed_mesh_store: the draw cap and the piston alias, after rotorkit's 13-mesh install

Source: triage sweep 2026-10-15; two issues of one shape — rotorkit installed 13
meshes into the shared store at 2026-10-14 20:21, mid-session of
`parts_sit_where_the_assembly_puts_them`, and two of that handoff's statements
went false the same minute:
`docs/issues/ISSUE_20261014_the_annotators_draw_cap_now_cuts_a_real_part_short_and_three_texts_say_no_part_reaches_it.md`
and `docs/issues/ISSUE_20261014_the_gas_spring_piston_mesh_is_installed_and_has_no_alias_row.md`
(both med). Baseline: trunk `master` @ `c51cf49`. Scope: `apps/annotate/sweep.js`,
`apps/annotate/run_tests.cjs`, `apps/annotate/README.md`,
`docs/ANNOTATION_SURFACE.md`, `docs/topologies/part_mesh_aliases.json`,
`docs/topologies/topology_vpa_pitch_linkage.json` (the piston row's note only),
`tests/test_part_mesh_aliases.py` if it must move. Do NOT touch
`scripts/run_viewer_browser_tests.mjs` (owned by the parallel
`annotate_gated_browser_suites_follow_the_three_part_mock`) or
`scripts/run_mutation_witness_tests.mjs`.

The store is gitignored: read it at `C:\workspace\tolstack\data\meshes\` by
absolute path (48 entries on 2026-10-15).

## Deliverables

1. **The draw cap: draw a 66-occurrence part in full.** `AA.OCCURRENCE_DRAW_LIMIT
   = 64` (`apps/annotate/sweep.js`) was argued as above every real count; today
   `CCR244CS-3-02` (`674069da…`) has **66** `extraction.instances[]` with a
   12-value `placement_world` (next: `NAS1149V0332H` 29, `MS21299C3K` 16).
   **Decision made here (triage):** raise the cap well above the real maximum
   (suggested 256 — 66 × 1,228 triangles is about 81 k, under a tenth of the
   hub, so the cap's own cost argument says draw it) and keep the cap for the
   pathological rivet-pattern case it was written for. *Rejected alternative:*
   keep 64 and document the truncation as intended — rejected because the
   cap's stated premise ("no installed part reaches it") is the rule the
   reader was promised, and the row already admits truncation, so nothing is
   gained by cutting a real part short. If you measure a reason this is wrong,
   say so in the lesson and argue it there.
2. **Replace the prose counts with something a test derives.** Three sites
   name the largest count as a literal: `docs/ANNOTATION_SURFACE.md` ("Where a
   part is drawn": "No installed part reaches it … NAS1149V0332H"), the
   `OCCURRENCE_DRAW_LIMIT` comment in `sweep.js`, and `apps/annotate/run_tests.cjs`'s
   "the placement rule…" check pinning `OCCURRENCE_DRAW_LIMIT >= 29`. Replace the
   pinned literal with a `[real]` check that walks the store's
   `provenance.json`s and asserts the cap's stated relation to the largest real
   count (skipping honestly where the store is absent), and drop the part name
   and number from the two prose sites (or pair them with that check). The
   lesson `LESSONS_20261014_parts_sit_where_the_assembly_puts_them.md` already
   carries a correction blockquote; leave it.
3. **The piston alias row.** `data/meshes/ed1010fe02c9ade7984d69749b1acd3e4b9ffb14e853d2e63fedcbc5465f7b5b/provenance.json`
   has `extraction.product_name: "214700-002"`. Add its row to
   `docs/topologies/part_mesh_aliases.json` for topology part
   `gas_spring_piston_214700_002`, with evidence per that file's conventions
   (`tests/test_part_mesh_aliases.py` says what else must move); rewrite the
   topology row's note (it says the mesh "is not yet" installed); update
   `apps/annotate/README.md`'s sweep paragraph, which names the piston as the
   example of a part with no installed mesh (pick a true example or drop it).
   Check the annotate `[real]` tier: run P2's `pitch_plate /
   gas_spring_piston_214700_002` should move from `no-mesh` to an anchored row.

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q` and `node apps/annotate/run_tests.cjs`
  green; in the main checkout after `scripts/rebuild_projections.ps1`,
  `node apps/viewer/run_tests.cjs` green and the annotate `[real]` rows show the
  piston anchored.
- The new store-walking check is red when you temporarily set the cap below 66
  (record that you did it) — enroll a mutation spec if the tier allows a
  `[real]` one, else say why not.
- Lesson (`docs/sessions/lessons/LESSONS_20261015_annotate_texts_follow_the_installed_mesh_store.md`):
  the counts you measured, the cap you chose and why, and every prose site you
  changed or left.
