---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-22 — an_export_lists_every_run_that_consumed_it: an export citation's `runs` is paired with drawing-checker's run log

Source: `docs/issues/ISSUE_20261022_two_213668_export_citations_list_one_of_five_runs_that_consumed_the_export.md`
(the should-fix in `docs/sessions/reviews/REVIEW_20261022_a_general_profile_note_bands_a_model_defined_term.md`),
routed by the 2026-10-22 second triage sweep. Baseline: trunk after the
2026-10-22 second batch merge (carries `a_general_profile_note_bands_a_model_defined_term`).
Scope: `docs/topologies/*.json` (the `source_export` blocks only), `tests/`,
and the SOP sentence that defines `runs` if the wording needs it. Do NOT
touch: any edge's band, nominal or `kind`; the kinematic study JSON; anything
in drawing-checker (read-only — never write there).

## Deliverables

1. **Fix the three named citations.** `SourceExport.runs` means *the
   drawing-checker runs whose recorded input sha256 equals this export's*
   (`tolerance_stack/stack.py`, `SourceExport` docstring; the SOP says the
   same). For 213668-002 A.1 (sha256 `dea285f5…6fc76`),
   `C:\workspace\drawing-checker\data\runs.jsonl` records five such runs:
   `20260714_111124_…`, `20260727_145424_…`, `20260730_133150_…`,
   `20260813_180536_…`, `20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER`.
   The citations:
   - `docs/topologies/topology_vpa_pitch_linkage.json`, edges
     `gas_spring_mount_flange_to_end_stop` and
     `gas_spring_mount_datum_a_to_end_stop`: list only `20260819_150314…`.
   - `docs/topologies/topology_pitch_system.json`, the 76.86 ±0.10 row-41
     citation: `runs: []`, with a note saying the file was "not run through
     drawing-checker's pipeline this session". `[]` reads as "no run consumed
     it", which is false.
   List all five runs in each. Copy each `ts` verbatim from that run's
   `run_meta.json` under `C:\workspace\drawing-checker\data\runs\<run_id>\`
   (the SOP, "How to establish one", warns that runs before
   `20260730_161157` record no `inputs` in their own `run_meta.json` — the
   sha match for those comes from `runs.jsonl`'s `inputs`; if a run's `ts`
   is absent or derived, follow the SOP's rule, do not invent a value). Reword the singular "The run's own run_meta.json records this
   sha256" in the affected notes so it matches a multi-run list.
2. **Pair `runs` with the log — the class fix, not optional.** This is the
   `unpaired_hand_copy` shape: a hand-copied list nothing checks against its
   source, so all three citations were green. Add a `[real]`-style test that,
   when `C:\workspace\drawing-checker\data\runs.jsonl` is readable, walks
   **every** `source_export` with an established sha in every committed
   topology and stack JSON and asserts its `runs` ids equal the set of run ids
   whose recorded input sha256 matches. Skip (with a reason naming the path)
   when the log is unreadable — never fail on absence. Expect it to find
   more than the three above; fix whatever else it finds the same way and
   list them in the lesson. The match reads `runs.jsonl`'s recorded inputs
   (which cover the pre-`20260730_161157` runs); say so in the test's
   docstring. The test is a guard,
   so it needs its mutation spec under `scripts/mutation_witnesses/` in the
   same change (CLAUDE.md, "A guard you add is enrolled in the same change";
   `node scripts/run_mutation_witness_tests.mjs --unenrolled` prints the name)
   and the `DECLARED_GUARDS` pin raised from the measured row.
3. **Surface.** The viewer's citation card already renders an export's runs;
   confirm it renders a five-run list legibly (no new UI unless it clearly
   does not), and note what you saw in the lesson.

## Definition of done

- All three named citations list five runs with verbatim `ts`; the new
  pairing test is green in the main-checkout-bridged run and skips cleanly
  where the log is absent.
- `--only` witness run for the new guard reports WITNESSED.
- `venv-win/Scripts/python.exe -m pytest -q` green (worktree: bridged per
  CLAUDE.md; the documented worktree-only `test_viewer_js_suite` red aside).
- Lesson: every citation the new test corrected beyond the three, and the
  rule chosen for pre-`inputs`-key runs.
