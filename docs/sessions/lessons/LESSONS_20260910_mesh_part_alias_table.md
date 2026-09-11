# LESSONS 2026-09-10 — mesh_part_alias_table

Handoff: `HANDOFF_20260910_mesh_part_alias_table.md`. A declared, tracked
alias table now bridges the topology `part` vocabulary and mesh provenance
`part_id`s, and `apps/annotate/`'s deep-link `isolate=` resolves through it.

## The table: home and schema as shipped

`docs/topologies/part_mesh_aliases.json` — the handoff's suggested home,
kept: it sits beside the topology files that own the part vocabulary, and the
builder/test discovery there is prefix-scoped (`topology_*.json` /
`study_*.json` globs in `scripts/build_topology_projection.py` and
`tests/test_topology.py`), so a differently-named JSON file is invisible to
them by construction — no glob had to be taught an exclusion.

Schema `joby.tolerance_stack/part_mesh_aliases/v0`: a `schema` string, a
`notes` array carrying the why (brief option b: declared configuration, never
fuzzy, never renaming installed meshes), and an `aliases` array of
`{ topology_part, mesh_part_id, evidence }`. Values map to `part_id`, never
sha256 (a re-tessellated mesh under the same part identity keeps its aliases
— and `tests/test_part_mesh_aliases.py` rejects a 64-hex value
structurally). Every entry carries its `evidence` string inline: an alias
asserts "these two strings name the same physical part," and this repo's one
rule applies to identity as much as to values.

## Mapped, on what evidence

One pair — the only one the evidence supports:

- **`gas_spring_mount_213668_002` → `machined_213668`.** Drawing number
  213668-002 appears independently on both sides:
  `topology_pitch_system.json`'s part carries `drawing: "213668-002"` rev
  A.1, name "MOUNT, GAS SPRING, PROPELLER 213668-002"; the mesh's own
  `provenance.json`
  (`data/meshes/6d5b1321446d54cd713da0739f7821c5266b3d6898ad047465e30003e7f549cf/`)
  records source STEP `213668-002_2026-07-23_Released.stp`, label "213668-002
  MOUNT, GAS SPRING (single solid)".

## Unmapped, and why

- **`blade_oml` (the other installed mesh) maps to nothing.** The nearest
  topology part, `pitch_system`'s `blade_root`, says in its own note "Part
  identity not established" — no drawing, no part number, nothing to chain to
  the mesh's "M1 Instro blade3D Shape03628907" STEP. Asserting
  `blade_root` → `blade_oml` would be exactly the invented identity the
  handoff forbids. If `blade_root`'s part identity is ever established (a
  drawing number in the topology's `parts` entry), the alias becomes a
  one-line, evidence-cited addition.
- Every other pitch_system part (`hub`, `pitch_link`, `vpa_piston`, …) has no
  installed mesh at all; the other four topologies' parts (fasteners,
  bushings, washers, plates) likewise. Nothing to map until meshes exist.

## Resolution precedence (as wired)

`AA.resolveMeshIdentifier(meshes, identifier, aliases)` in
`apps/annotate/commands.js`: direct sha256 match → direct `part_id` match →
alias table (`topology_part` exact match, resolving its `mesh_part_id`
against the installed list) → `null` (the caller's existing empty state).
The mesh side of an alias needs no pass of its own — a `mesh_part_id` typed
directly IS a `part_id` and hits the direct pass. The table is loaded once in
`app.js`'s `loadAll()` via a new storage-contract method
`readPartMeshAliases()` (fsa + memory adapters) and injected — `commands.js`
stays fetch-free, per the handoff.

## End-to-end demonstration (real data, this session)

For edge `gas_spring_mount_position` in `pitch_system` (part
`gas_spring_mount_213668_002`), the viewer's deep link
`?topology=pitch_system&edge=gas_spring_mount_position&isolate=gas_spring_mount_213668_002`
previously resolved to `null` (empty state). Through the shipped table,
`resolveMeshIdentifier` on the real main-checkout mesh list returns the
installed mesh `6d5b1321…` ("213668-002 MOUNT, GAS SPRING (single solid)",
`part_id: machined_213668`) — verified both by a one-off node run against
`C:\workspace\tolstack\data\meshes\` and, repeatably, by the new `[real]`
check in `apps/annotate/run_tests.cjs` (43/43). Unmapped parts (`hub`,
`blade_root`) still return `null` — the empty state stays for them, as
designed. Full browser click-through was not run (no browser automation on
this machine, per the standing step_tessellation lesson).

## Test tiers, and where each lives

- `apps/annotate/run_tests.cjs`: fixture-tier precedence (direct-beats-alias
  both ways, alias hit, alias-to-uninstalled-mesh → null, unmapped → null,
  and an explicit no-substring check) plus a `[real]` check resolving every
  shipped alias through `resolveMeshIdentifier` against the installed meshes
  — repo-relative `data/meshes` first (main-checkout runs), falling back to
  the absolute main-checkout path (worktree runs), console `SKIP` when
  neither has a mesh.
- `tests/test_part_mesh_aliases.py`: the table's shape (schema, complete
  entries, unique keys, no-sha256 values) and both vocabulary pairings —
  topology side runs everywhere (tracked files), mesh side is
  `pytest.mark.skipif` on the same two-candidate data-root resolution.

Suites: `node apps/annotate/run_tests.cjs` 43/43;
`venv-win/Scripts/python.exe -m pytest -q` 759 passed, 1 skipped (the
pre-existing `test_viewer_js_suite` worktree skip, unrelated).

## Decisions not in the handoff

- `data/meshes/README.md`'s new section and the annotate README's deep-link
  section both state the install-time rule ("alias, never rename") — the
  annotate README previously claimed "nothing in this repo maps one to the
  other yet," which this handoff made false; leaving it would have been the
  exact doc-drift defect this repo tracks.
- `apps/viewer/README.md` needed no change (it says "if a mesh for it happens
  to be installed" — still true), so the do-not-touch fence held with nothing
  to file.
- No alias fixture was added to `fixtures.js`/mock mode: the precedence tests
  inject plain arrays (the handoff's own instruction), and the mock demo's
  `demo_triangle` part already matches directly without an alias.
