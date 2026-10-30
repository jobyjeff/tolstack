# Lessons 2026-10-29 — inputs_absent stamp and drawing display names

## Item 1 — what the rebuild reads (for dispatch's `[tests] candidate_inputs`)

`scripts/projection_provenance.py::READ_INPUTS`, relative to the data root, is
now the one list; `stamp(..., data_root=)` records every entry that is missing
or holds only a `README*` as `provenance.inputs_absent` (`data/<rel>` strings).
Every builder passes its own `--data-root` (viewer results, topology, part
names, crops, contact suggestions, kinematic, spec library, feature identity).

- `data/inbox/specs`, `data/inbox/drawings`, `data/inbox/feature-identity`,
  `data/inbox/tolerance_stacks`, `data/inbox/linkage-sweeps`, `data/meshes`

This equals the current `.dispatch.toml` declaration. The builders also read
drawing-checker's own `data/` (crops, part names) — not a tolstack input and not
listed; its absence is already a loud `SKIP`/error in those builders.
`rebuild_projections.ps1` prints `inputs absent: n` in yellow on each stamp line
and still exits 0; `projection_provenance.note_lines` prints the names.

## Item 2 — files that gained `display_name` / `naming_note`

- `docs/topologies/topology_vpa_pitch_linkage.json`: parts `pitch_link`
  ("Pitch link 213862-002"), `tan_link_212956_005` ("Pitch anti-rotation link
  212956-005"), `pitch_plate_215177_001` ("Pitch plate 215735-001/-002").
- `docs/tolerance_stacks/stack_{pitch_link,tan_link,tan_link_take2}_to_pitch_plate*.json`
  (top-level fields; the loader ignores them, no code reads them yet).
- `tolerance_stack/topology.py` `Part` gained the two optional fields (flow into
  the projection via `asdict`). Viewer: `VA.componentLabel` prints `display_name`
  first; `componentTitle` adds the id to the tooltip.

## Surprises / decisions

- The 2026-10-27 fold already deleted `pitch_plate_215197`/`pitch_flange_215197`
  as part ids (they live on in the topology's `parts` alias map), so the plate
  display name sits on `pitch_plate_215177_001`.
- Stack pages show `title`, not the id, so a stack `display_name` is data only;
  changing a title would need its own look. Body names ("pitch link", "tangential
  link") are rendered from `name` and were left alone — they say the joint, and a
  `display_name` on `Body` would be a further schema change.
- The mutation spec for the component-label guard was re-pointed (`find` text
  moved with the fallback chain); PROVENANCE.md rows for the two tan-link stacks
  were amended.

## Not run

Full `pytest -q` in this worktree: 3 failed, 1681 passed, 1 skipped (7m40s)
before the fixes; the two real failures (witness anchor, PROVENANCE rows) are
fixed and re-run green; the third is the worktree-only
`test_viewer_js_suite` skip-is-red. Viewer fixture tier 507/507; the `[real]`
tier, the browser TRUTH tier and the `--changed-since` witness run need a
main-checkout rebuild of projections from this tree and were NOT run. The
`.ps1` was exercised only by reading: it refuses to run from a worktree (no venv).
