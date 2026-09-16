---
type: review
handoff: docs/sessions/HANDOFF_20260916_doc_facts_and_projection_stamps.md
reviewer: agent
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-16 — doc_facts_and_projection_stamps

## What I verified

- Read the handoff in full and the tactical branch's single commit
  (`41b1e22`, `handoff/doc_facts_and_projection_stamps`), diffed against
  `integration`. Scope held exactly: `ARCHITECTURE.md`'s rotorkit bullet,
  `docs/ANNOTATION_SURFACE.md`'s mesh-format paragraph, and only the three
  named `apps/viewer/README.md` passages (commands block, mutation-witness
  tier paragraph, Studies paragraph) — no forbidden file touched
  (`apps/viewer/tests.js`, `apps/viewer/viewer.js`,
  `scripts/mutation_witnesses.json`, `tests/test_mutation_witnesses.py`,
  `data/`, `docs/reference/` all untouched).
- **Independently re-derived every number the lesson claims**, not just read
  it:
  - `data/meshes/*/provenance.json` `produced_by.command` in the main
    checkout: **24 meshes, 22 `scripts/extract_assembly_parts.py`, 2
    `scripts/tessellate_parts.py`** — matches the handoff and the lesson
    exactly.
  - `scripts/mutation_witnesses.json`: **27 declared mutations, 7 with
    `expect_red` starting `[real]`** — matches.
  - `data/projections/viewer/topologies.json`, `pitch_link_to_pitch_plate`
    study chain lengths: `pitch_link_cotter_hole_clearance` 7,
    `pitch_link_shank_out` 6, `pitch_link_thread_region_t` **2** — confirms
    `thread_region_t` is the smallest chain, never the one that "covered
    nearly everything," which is the basis for item 6's verdict (README was
    the wrong half).
- Fast-forward merged `handoff/doc_facts_and_projection_stamps` into this
  review branch (no conflict — clean fast-forward, nothing to resolve).
- `venv-win/Scripts/python.exe -m pytest -q` from the main checkout against
  this tree: **1186 passed, 1 failed, 1 skipped.** The failure
  (`test_no_live_document_states_an_unguarded_hardware_entry_count`, over
  `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`)
  predates this branch (confirmed via `git log` on that file, unrelated
  content) and is already filed twice
  (`ISSUE_20260916_hardware_count_guard_matches_the_other_three_in_unrelated_prose.md`
  and its near-duplicate) — not a regression from this work. 11 of the
  passing tests are new here.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`: **411/411,
  0 skipped.** Matches the lesson's explanation for why this is 411 and not
  the handoff's stated 407/407 baseline: the baseline predates
  `viewer_unwitnessed_surface_guards` landing on `integration`, which this
  branch was cut after — no viewer JS changed on this branch.
- **Demonstrated a guard biting independently**, not just trusting the
  lesson's claim: reverted `ARCHITECTURE.md`'s rotorkit bullet to the exact
  pre-fix wording (from `1b3848b`), ran
  `tests/test_mesh_route_doc_facts.py`, watched
  `test_architecture_rotorkit_bullet_makes_no_unqualified_route_claim` go red
  naming `['STEP file']`, then `git checkout --` restored the file cleanly
  (verified via `git status`/`git diff --stat`, no residue).
- Ran both new modules directly: 11/11 pass, including all three negative
  controls.
- Checked `npm run test:mutations` against `package.json` (line 9) and
  `scripts/run_mutation_witness_tests.mjs`'s own header comment (lines
  16–22) — the README's new commands-block pairing mirrors it correctly.
- Checked the three source issues
  (`ISSUE_20260915_architecture_md_still_says_every_mesh_is_a_tessellated_per_part_step_copy.md`,
  `ISSUE_20260915_viewer_readme_mutation_tier_paragraph_is_stale_on_both_counts.md`,
  `ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_change_does_not_reproduce.md`):
  all three already carry `status: triaged` and
  `handoff: docs/sessions/HANDOFF_20260916_doc_facts_and_projection_stamps.md`,
  so dispatch's own auto-resolution handles them at Complete — no manual
  disposition needed from me. No new issues were filed by this handoff.
- Confirmed no data pollution: `git status --short` in the main checkout is
  clean after both test runs.

## Findings

None that rise to should-fix or blocker. This is an unusually clean
handoff: every corrected fact is independently re-derived and matches, every
correction is paired with a guard, every guard carries a negative control,
and the lesson's own self-audit (a first version of the witness-count scan
that would have flagged its own corrected sentence, caught by actually
running it) is exactly the kind of rigor the review checklist asks reviewers
to go looking for — here the author found it first.

**Nit:** the handoff's stated pytest floor (≥1155) and viewer floor (407/407)
were both taken from a baseline that had already moved by the time this
branch was cut (a day-of-triage artifact, not this author's error) — the
lesson calls this out correctly under "Findings not mine to fix" rather than
silently reporting numbers that don't match the handoff's own definition of
done. No action needed; noting it because it's exactly the kind of
lesson-arithmetic the "handoff's own lesson is an artifact under review"
universal check exists to catch, and here it survives that check.

## Item 6 (Studies paragraph) — independently checked, not just trusted

The handoff's verdict was "the README was the wrong half," decided before
editing either side, with re-derivation on the current tree. I re-ran the
chain-length re-derivation myself (see above) rather than accepting the
lesson's numbers, and it holds: `thread_region_t` is the smallest of the
three chains today (2 of 10 edges) exactly as the lesson states, which is
structurally incompatible with the removed sentence's claim that its chain
"covered nearly everything." The guard
(`test_the_studies_section_does_not_reassert_the_per_study_claim`) correctly
requires the AND of both phrases, not either alone, so it does not fire on
the corrected paragraph's own (true, kept) claim that every study "dropped"
rows uniformly.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md` was already well populated (no seeding
needed). Added one new **Recurring bugs** entry for a genuinely new footgun
this session's own lesson surfaced: a quantifier+noun scan anchored at
"same sentence" is still loose enough to flag its own corrected wording
(the fix was to anchor onto the noun phrase directly, not "same sentence
as the noun"). No entries pruned — nothing in the existing checklist found
nothing this round; several ("guard observed failing," "count restated by
hand," "lesson arithmetic," "mechanism fact fixed in one doc and left in
its mirror") all had live, positive hits verified above rather than misses.

## Merge

Fast-forward, `handoff/doc_facts_and_projection_stamps` → this review
branch → `integration`. No conflict to resolve, nothing to disposition
beyond what dispatch already handles automatically for the three linked
issues.
