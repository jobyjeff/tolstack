---
type: bug
priority: med
status: open
area: scripts/build_kinematic_projection.py (annotator read set)
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md
---

# The annotator's served read set turns an unreadable file into an absent one, where the folder walk it copies refuses

`scripts/build_kinematic_projection.py`'s read set (`annotate.json`, added by
`the_scene_pane_is_one_flyout_that_reads_over_http`) says it answers "the way
`apps/annotate/storage/fsa.js`'s walk answers". It does not answer that way on
broken input. Every read goes through `_read_json_or_none`, which catches
`OSError`/`ValueError` and returns `None`:

| input | folder grant (`fsa.js`) | read set (HTTP) |
|---|---|---|
| `docs/topologies/part_mesh_aliases.json` present but malformed | `_readJson` → `AA.parseJson` throws; the boot reports it | `mesh_aliases: null`: the pane boots with no aliases and says nothing |
| `data/projections/parts/names.json` malformed | throws | `part_names: null`, silently |
| a mesh dir whose `provenance.json` is malformed | throws | listed under its sha as label, `part_id: null` |
| a sweep run that does not parse | listed (`AA.sweepRunEntry(id, null)`), and the annotator refuses it in its own words when picked | **dropped from the run list**. `test_the_read_set_lists_what_a_folder_walk_finds_...` plants `broken.json` and pins that it is absent |

The same file is read strictly by one transport and tolerantly by the other.
This repo's review overlay lists that shape under "Two readers of one input
file, one strict and one tolerant". A present-but-broken file becomes
"nothing there" on the served pane, the surface Jeff now uses by default,
with no message in the build output or the pane.

**Fix shape:** tolerate *absence* (`FileNotFoundError` → `None`, as today), but
let a present-but-unparseable alias table or names file fail the build, or at
least print a line naming it. List an unparseable run the way the walk does
(`run_id` only, `ts`/`mechanism` null) and still copy its bytes, so the
annotator refuses it in its own words. Then add a test per row of the table
that plants the broken file.
