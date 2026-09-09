---
type: review
handoff: topology_schema_v1
reviewer: agent
date: 2026-09-08
verdict: APPROVE
blockers: 0
---

# Review — topology_schema_v1

Reviewed on `review/topology_schema_v1` (cut from `integration` @ `60dc9e1`),
against `handoff/topology_schema_v1` (single commit `6710c1c`). Merged clean
(`git merge handoff/topology_schema_v1`, auto-merge on `ARCHITECTURE.md`, no
conflicts) — the containment check (`git merge-base --is-ancestor
handoff/topology_schema_v1 HEAD`) said `NOT_ANCESTOR` beforehand, so the merge
in this review is real work, not a no-op.

This handoff is a **schema/architecture change**, not a new tolerance stack:
no new element, hardware, or material citation is introduced anywhere in the
diff (`git diff 60dc9e1 6710c1c` touches `topology.py`, two doc files, the
projection builder, and existing topology/study JSON files only to add
metadata blocks — `joint`, `configuration`, a `checks` entry that folds
existing values, and a worksheet reference). Recomputed the traced ratio
anyway per check 7 to confirm nothing moved: **5 traced / 3 inferred / 18
untraced of 26** seeded-slice element instances, **30/9/20 of 59** across all
stacks — identical before and after
(`tests/debug_report_tolerance_stacks.py --ratio`). The seven mandatory
provenance checks are therefore addressed as follows:

1. **Every tolerance traces** — N/A, no new element/hardware/material value.
2. **Signs on every path term** — N/A, no new term list; the one new
   arithmetic branch (`check_study`'s no-`limit` path) introduces no term,
   see "What I verified" below.
3. **LMC/MMC direction** — N/A, no new element.
4. **RSS actually computed** — N/A for new content; the acid test (below)
   confirms the pre-existing RSS numbers ride through the no-`limit` branch
   unchanged.
5. **Nominal inside its own min/max** — N/A, no new element.
6. **Quantised cotter/castellation hardware** — N/A, no new hardware.
7. **Traced/inferred/untraced ratio** — unchanged, recomputed above.

## What I verified

- **The acid test is real, not just green.** Deliberately broke
  `check_study`'s no-`limit` branch (made it fold an empty term list instead
  of returning `result.interval`) and confirmed
  `test_the_l1_studys_own_authored_check_matches_the_stacks_check_exactly`
  goes red with a real numeric mismatch (`rss_center` 0.0 vs 0.0083, etc.),
  then reverted (`git checkout -- tolerance_stack/topology.py`, tree confirmed
  clean afterward). The guard bites.
- **The joint block genuinely mirrors the stack's**, field for field, for the
  keys the test checks (`assembly_drawing`, `assembly_revision`, `sheet`,
  `view`, `zone`, `description`, `scope`) — diffed
  `topology_vpa_output_to_pitch_plate.json`'s new `joint` against
  `stack_vpa_output_to_pitch_plate.json`'s own by hand; they agree. One
  omission: the docstring in `topology.py` lists `zone_note` as a mirrored
  field, the worked example and the test both drop it (nit, below).
- **`check_study`'s with-`limit` branch is provably unchanged** — same
  `Term`/`fold()` construction, byte-for-byte, just moved under an `else`. The
  full suite (which includes the pre-existing `endstop_location_stack`
  `limit`-based checks, e.g. `pitch_system_end_stop_minus7`) stays green.
- **Full suite, merged tree, this worktree: 681 passed, 1 skipped** (up from
  672 before merge, +9 new tests; the 1 skip is the pre-existing
  `REQUIREMENTS_PULL`-gated, data-absent-in-worktree skip, unrelated). Did not
  additionally re-run in the main checkout: nothing in this diff reads or
  writes gitignored `data/`, so the worktree/main-checkout split this repo's
  checklist warns about does not apply here — every new/changed test reads
  only tracked `docs/topologies/`.
- **`worksheet_for()` sanity-checked by actually running the builder**, into a
  scratch `--data-root` (not the shared main checkout, to avoid the
  provenance-gate stand-off with another concurrent session's projection
  build — `build_topology_projection.py` refused the shared `data/` as a
  target, correctly: master had moved to board-state commits my branch
  doesn't contain). Confirmed in the scratch output: `pitch_system` resolves
  its declared `WORKSHEET_end_stop_graft.md`; `vpa_output_to_pitch_plate`
  correctly reports no worksheet (`None`/`None`, no by-name match); the `joint`
  block rides through for `vpa_output_to_pitch_plate` and is `{}` for
  `pitch_system`; `configuration` rides through for
  `pitch_system_gas_spring_branch` and is `{}` elsewhere.
- **Doc guards green**: `tests/test_architecture_inventory.py` (10/10),
  `tests/test_sop_vocabulary.py` (6/6) — the SOP's new "Topology first"
  section did not disturb either pipe-list anchor. No new file was added to
  `tolerance_stack/`/`scripts/`, so the `ARCHITECTURE.md` module-inventory
  block needed no new row (it already listed `topology.py` and
  `build_topology_projection.py`); the `check_study` row and the `joint`/
  `configuration` notes were added to the existing rows, correctly.
- **`docs/reference/`, `data/inbox/specs/`, drawing-checker: all untouched** —
  confirmed by the diff stat; no snapshot diff needed.
- **Deliverable 4 (path-referencing check terms) is fenced, not built**, and
  the reasoning holds up: a stack's `path` term resolves against a dict local
  to the *same file*; a topology's nearest analogue (another `Study`) is
  deliberately a separate document with no cross-study id index, and building
  one to combine two studies' totals under independently-authored signs would
  reopen exactly the branch/cycle question `traverse()`'s guards exist to
  refuse (two studies over one topology can legitimately share edges; nothing
  would then check whether a combination double-counts). Documented in both
  `docs/DAG_TOPOLOGY.md` and the lesson, correctly flagged for
  `linear_stack_conversions` to read before converting `tan_link_to_pitch_plate`.
- **"What v0 cannot do" swept per instruction** — none silently dropped: gap 3
  (load cases) closed via `Study.configuration`; gaps 1, 2, 4 re-fenced with
  dated 2026-09-08 notes explaining why (no real value to design against yet,
  only `kind: "assumed"` placeholders); a fifth gap (path-referencing checks,
  found while doing this session's own work) added.
- **Versioning stayed `/v0`, correctly** — every new field is optional,
  defaults empty, and is read by nothing `fold`/`traverse`/`summarize`
  touches; the full pre-existing suite proves both existing topologies and
  all eight studies fold identically before/after.
- **`ISSUE_20260908_sop_full_topology_first_restructure.md`** (deliverable 6's
  honest partial-completion) carries correct frontmatter
  (`type: chore`, `priority: low`, `status: open`, `area`, `reporter: agent`,
  `audience: strategy`) and accurately describes what was and wasn't done —
  a framing section added, the ~1000-line procedural body left alone, with a
  concrete reason (the file's several exact-single-match string anchors).

## Findings

**Should-fix (filed as an issue, not fixed inline — the fix needs new code and
a new test, so it fails the inline-fix boundary's second prong):**

- **`scripts/build_topology_projection.py` never calls `check_study()` or
  reads `study.checks`** — `project_study()`'s row has no `"checks"` key at
  all, before or after this handoff. Verified two ways: grepped the file (no
  `check_study` import, no `.checks` read) and ran the builder into a scratch
  data-root — `vpa_output_shank_out`'s projected row has no `checks` key even
  though `study_vpa_output_shank_out.json` now carries the acid-test check.
  Contrast `build_viewer_projection.py`'s `project_stack`, which calls
  `stack.check(spec["check_id"])` per entry and merges the `CheckResult` in.
  This matters more than an ordinary gap because the strategy brief's own
  framing for deliverable 1 is "today a topology has no field for a verdict at
  all... the single reason every stack stayed in the classic viewer nav" —
  the schema and function now support a verdict-bearing study check, but the
  one artifact a future viewer would read still cannot show one. Not a
  regression this handoff introduced (the with-`limit` branch has had the
  identical gap since `endstop_location_stack`, 2026-09-06) and not required
  by this handoff's stated Definition of Done, which is why this is
  should-fix rather than blocking. Filed:
  `ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`.

**Nits:**

- `topology.py`'s `Topology.joint` docstring lists `zone_note` among the
  mirrored fields; the worked example (`topology_vpa_output_to_pitch_plate.json`)
  and the pairing test (`test_the_l1_topologys_joint_block_mirrors_its_stacks`)
  both omit it. Harmless (the field is free-form/optional either way) but the
  docstring overclaims by one field.

## Overlay maintenance

Added one new entry to `docs/prompts/REVIEW_AGENT.md`'s "Architectural errors
to check" (a schema field built specifically to be renderable, where the
projection that would render it never calls the function that computes it) —
new failure class, not a repeat of an existing entry. No entries pruned this
review; nothing on the list cried wolf here.

## Verdict

**APPROVE.** No blockers. One should-fix filed as an issue (not a merge
blocker — pre-existing gap, DoD-compliant as stated). Merged into
`integration` and pushed; see commit log for the merge and the overlay/issue
commits.
