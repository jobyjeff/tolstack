# Lessons — display_name reaches the viewer fixtures; fixture drift caught without a projection

- **The merged-cell check was the stale side, not the renderer.** `VA.componentLabel`
  already printed `display_name || name` (the drawing title block is authoritative,
  `BRIEF_20260916_link_name_authority.md`); the `[real]` check still asserted `part.name`.
  It now asserts `display_name || name`, still requiring the part's own label and never an id.
- **The topology fixture's parts to patch are the *projected* `topologies[].parts[]`
  (~line 354), not the `topology` source-doc copy (~line 144).** The shape check reads the
  former. Both live in `topology_fixtures.js`; I patched the projected one only.
- **The demo `post` part carries `display_name: "post"` on purpose** — the same word as
  `name`, so the many pinned labels stay put. The key's presence is the point; rendering of a
  differing `display_name` is pinned by the existing componentLabel test.
- **The class guard needs no projection because the builders copy verbatim**:
  `stacks[].stack` is the raw stack file; `parts[]` is `dataclasses.asdict(Part)` + `mesh`.
  Covered: every top-level key of any tracked stack (minus the archetype's own input block) and
  every `Part` field. **Still `[real]`-only:** builder-computed keys (counts, checks, crop states,
  mesh facts, `elements[]`/`source_ref` sub-shapes, layout, study results).
- **`node -e` argv:** the first extra argument is `process.argv[1]`, not `[2]`.
- **Python-tier witness specs** are named by trial: write a placeholder, run
  `tests/test_mutation_witnesses.py`, rename to the name it prints. `--unenrolled` does not list
  python guards. They run only with `--repo C:/workspace/tolstack` (the venv is there).
- **Verification used a scratch root** (`data/scratch/display_name_fix`, junctions to the main
  `data/inbox`, `data/meshes` and this worktree's `docs/`), projections built from the committed
  tree. Three target `[real]` checks pass; the remaining reds there are the scratch's missing
  crop PNGs/spec PDFs/meshes, environmental. A full armed run belongs to the main checkout after
  the batch merge's rebuild. The scratch dir is gitignored and can be deleted.
