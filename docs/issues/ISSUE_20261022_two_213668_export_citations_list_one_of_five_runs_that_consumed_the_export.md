---
type: bug
priority: med
status: resolved
area: topologies/provenance
reporter: agent
found_by: docs/sessions/HANDOFF_20261022_a_general_profile_note_bands_a_model_defined_term.md
handoff: docs/sessions/HANDOFF_20261022_an_export_lists_every_run_that_consumed_it.md
resolution: handoff completed 2026-10-23 -- closed automatically by dispatch when handoff `an_export_lists_every_run_that_consumed_it` moved to completed/; not independently verified.
---

# Two 213668-002 export citations list 1 of the 5 runs that consumed the export, and a third says none did

`SourceExport.runs` is defined as *the drawing-checker runs whose recorded input
sha256 equals this one* (`tolerance_stack/stack.py`, `SourceExport` docstring;
SOP "the `runs` lists the drawing-checker runs whose recorded input sha256
equals yours"). For 213668-002 A.1 (sha256 `dea285f5…6fc76`) drawing-checker's
`data/runs.jsonl` records **five** such runs:

- `20260714_111124_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER`
- `20260727_145424_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER`
- `20260730_133150_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER`
- `20260813_180536_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER`
- `20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER`

The citations, measured 2026-10-22 in review:

- `docs/topologies/topology_vpa_pitch_linkage.json`, edges
  `gas_spring_mount_flange_to_end_stop` and
  `gas_spring_mount_datum_a_to_end_stop` (added by this handoff): `runs` names
  only `20260819_150314…`, the run the author read.
- `docs/topologies/topology_pitch_system.json`, the 76.86 ±0.10 row-41
  citation (pre-existing, 2026-09-06): `runs: []`, with a note saying the
  file was "not run through drawing-checker's pipeline this session". Four of
  the five runs predate that session, so `[]` reads as "no run consumed it",
  which is false.

Nothing pairs `runs` with the run log, so all three are green.

**Fix:** list all five runs in each, with each `ts` copied verbatim from that
run's `run_meta.json` (SOP: runs before `20260730_161157` have no `inputs`
key, and some have a derived `ts`). Then reword the singular "The run's own
run_meta.json records this sha256" in the export notes. Optionally add a
`[real]`-style test that, where `C:\workspace\drawing-checker\data\runs.jsonl`
is readable, checks each established export's `runs` against the run ids
whose input sha matches.
