# LESSONS 2026-09-16 — doc_facts_and_projection_stamps

## What changed

- `ARCHITECTURE.md`'s rotorkit bullet (deliverable 1): rewrote the single
  per-part-STEP-and-copy claim as two routes, no count, pointing at
  `data/meshes/README.md`'s "Two ways a mesh gets here."
- `docs/ANNOTATION_SURFACE.md`'s mesh-format passage (deliverable 2): dropped
  the "source STEP path" parenthetical and let the pointer to
  `data/meshes/README.md` carry the route detail instead of restating it.
- `tests/test_mesh_route_doc_facts.py` (new, deliverable 3): pairs both
  passages above against the mesh store. Scans for a STEP-source or
  copy-claim phrase with no route qualifier nearby; a `[real]` tier derives
  the live route set from `data/meshes/*/provenance.json` `produced_by.command`
  and asserts it is exactly the two routes the docs now describe. Carries a
  negative control (`test_the_route_claim_scan_can_fail`).
- `apps/viewer/README.md`, three passages:
  - commands block (deliverable 4b): added the bare `npm run test:mutations`
    form paired with the `--repo` worktree form, matching the two tiers above
    it.
  - mutation-witness tier paragraph (deliverable 4a): dropped the "three of
    the declared witnesses" count.
  - Studies paragraph (deliverable 6): dropped the per-study inconsistency
    reconstruction, kept Jeff's verbatim quote and the one-layout decision.
- `tests/test_viewer_readme_doc_facts.py` (new, deliverables 5 and 6): guards
  both README passages above. Carries two negative controls.

## Re-derivations, and how

- **Mesh routes** (deliverable 1/3): read every
  `C:\workspace\tolstack\data\meshes\*\provenance.json`'s `produced_by.command`
  in the main checkout. 24 meshes: 22 `scripts/extract_assembly_parts.py`
  (13 + 9 across two runs), 2 `scripts/tessellate_parts.py`. Matches the
  handoff's own count exactly, so `ARCHITECTURE.md` and
  `docs/ANNOTATION_SURFACE.md`'s facts predate the current tree by the same
  margin the handoff measured. No count is written into either document —
  only "two routes," which `test_the_live_mesh_store_actually_has_two_routes`
  grounds against the tree without pinning a total.
- **Mutation-witness counts** (deliverable 4/5): read
  `scripts/mutation_witnesses.json`. 27 declared mutations, 7 with
  `expect_red` starting `[real]`. Matches the handoff's own numbers, which
  were already a full day newer than the filing issue's (12/6). Given
  `viewer_unwitnessed_surface_guards` appends to this file in parallel, the
  README states no digit at all now, per the handoff's argument.
- **Studies chain lengths** (deliverable 6): read the live
  `data/projections/viewer/topologies.json`. `pitch_link_to_pitch_plate` has
  **10** edges today (not the 8 the filing issue measured on the pre-change
  tree a day earlier — the topology grew). Chain lengths (`selection` length):
  `pitch_link_cotter_hole_clearance` 7, `pitch_link_shank_out` 6,
  `pitch_link_thread_region_t` **2**. `thread_region_t` is the smallest chain
  by a wide margin, both today (2 of 10) and on the issue's pre-change
  measurement (2 of 8) — never the one that "covered nearly everything."
  Pinned as a `[real]` test
  (`test_thread_region_t_is_the_smallest_chain_not_the_largest`).

## Item 6 verdict: the README was the wrong half

The issue's premise — that the README's stated inconsistency does not
reproduce on the pre-change tree — holds up under a second, independent line
of evidence. I could not re-run the pre-change JS behaviour directly (it was
deleted by `viewer_respine_whole_walk`), so I leaned on two things instead of
git archaeology: the issue's own `[real]`-tier measurement (chain mode: all
three studies dropped rows, none dimmed; topology mode: no study dropped a
row, all three dimmed, `thread_region_t` faded the most) and my own
re-derivation of chain length ratios on the *current* tree, which is
structurally the same claim (`thread_region_t` is the smallest chain, so it
is the one that would be *most* excluded from any subset-based signal, never
the one that "covered nearly everything"). Both lines agree, and neither
supports two studies dropping rows while a third did not — under either old
mode, all three studies behaved alike; only the studies' own chain sizes
differed. The paragraph's specific per-study reconstruction was invented
detail dressing up a true, weaker claim (the old behaviour gave no signal at
all), so I kept Jeff's verbatim quote and the one-layout decision and replaced
the reconstruction with the issue's own honest alternative, word for word
close to its suggestion.

I judged this strong enough to guard directly (co-occurrence of "dropped
rows" and "covered nearly everything" — see below) rather than invoke the
"no stronger pairing" escape hatch item 6 allows.

## Guard shapes copied, and where a shape did not transfer

- `test_mesh_route_doc_facts.py` copies `test_architecture_inventory.py`'s
  shape closely: extraction asserted non-empty before any comparison,
  `[real]` tier skips honestly absent `data/meshes/`, one negative control.
  Where it diverges: `test_architecture_inventory.py`'s quantifier scanner
  bans *any* unpinned digit; mine is a phrase-plus-allowlist scan (an
  unqualified "STEP file"/"copies mesh output" claim), because the underlying
  defect here is a claim being **too broad**, not a stale **count** — the
  handoff explicitly said not to pin a routes-per-mesh count at all.
- `test_viewer_readme_doc_facts.py`'s witness-count guard started as a
  sentence-level scan (quantifier + noun in the same sentence, mirroring
  "match shapes, not English") and had to be tightened once, live: the first
  version flagged the *corrected* sentence itself, because "the other two
  do" (referring to the other two test tiers) shares a sentence with
  "declared witnesses" and "two" is a listed number word. Caught this by
  actually running the test rather than trusting the design — the failure is
  recorded below. Fixed by anchoring the quantifier directly onto the noun
  phrase (`"N of the declared witness"` / `"N ... [real]"`, small window)
  instead of "anywhere in the same sentence." This is exactly the trap
  `apps/viewer/tests.js` ~9578 already named (pin the noun, not just the
  digit) — worth recording that even a noun-aware scan can still be too loose
  if "aware" means "same sentence" rather than "immediately adjacent."
- The per-study inconsistency guard needed an AND, not an OR, between its two
  banned phrases (`"dropped rows"` and `"covered nearly everything"`): the
  *corrected* Studies paragraph legitimately still says every study "dropped
  its non-chain rows" (true, and kept), so banning that phrase alone would
  have made the guard fail against its own fix. Only the **pairing** of both
  phrases was ever the defect (a differential claim across studies); an
  either/or ban does not distinguish "uniform, described once" from "presented
  as an inconsistency."

## Guards shown red (definition of done)

All three doc-fact edits were hand-reverted in place, confirmed the paired
test goes red, then restored:

```
test_architecture_rotorkit_bullet_makes_no_unqualified_route_claim
  AssertionError: ... asserts, with no route qualifier nearby, ['STEP file'] ...

test_the_mutation_tier_section_states_no_witness_count
  AssertionError: ... counts the declared witnesses or the `[real]` checks
  again: ['three of the declared witness'] ...

test_the_studies_section_does_not_reassert_the_per_study_claim
  AssertionError: ... reasserts a per-study row-drop/coverage claim:
  ['dropped rows', 'covered nearly everything'] ...
```

Each new module's own negative-control test (`test_the_route_claim_scan_can_fail`,
`test_the_witness_count_scan_can_fail`, `test_the_per_study_claim_scan_can_fail`)
additionally replays this red against reconstructed strings on every run, not
just this session.

## Findings not mine to fix (filed nowhere new — already tracked)

- **`node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` is 411/411,
  not 407/407.** I changed no viewer JS, no fixtures, and no projection — the
  movement predates this branch. The handoff's stated baseline (407/407) was
  taken before this branch was actually cut; the tree already carries
  `viewer_unwitnessed_surface_guards`' additions (37 more witnessed checks
  per its own review commit). Reporting per the handoff's own instruction
  ("any movement here is a finding, not a pass") rather than treating 411/411
  as silently equivalent to the stated baseline.
- **`apps/viewer/README.md`'s mutation-tier paragraph and commands block had
  already been partly touched** by `mutation_witness_tier_reaches_its_checks`'s
  own review commit (`2856a164`, an ancestor of this branch) before I started
  — it had already dropped the bare "three" but left an awkward
  self-referential parenthetical ("this line said 'three' and was seven by
  2026-09-16; `grep -c ...` answers it") that both named a stale digit as
  fact and would go stale again the moment this session's own measurement
  differed. I rewrote it rather than leaving it, since the handoff names this
  exact passage as mine and the existing text did not actually satisfy "stop
  counting."
- **`tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count`
  is red**, on this branch, unrelated to anything in scope here (a
  `docs/strategy/` brief, not `docs/tolerance_stacks/`). Already filed twice
  (`ISSUE_20260916_hardware_count_guard_matches_the_other_three_in_unrelated_prose.md`
  and its near-duplicate), `status: open`, `priority: high`, explicitly out
  of scope for the sibling handoff that found it and for this one. Not
  refiled.

## Final numbers

- `venv-win/Scripts/python.exe -m pytest -q` from the worktree (main-checkout
  interpreter, absolute path): **1186 passed, 1 failed (pre-existing, above),
  1 skipped (pre-existing node-fs `[real]` tier, needs `--repo` from a
  worktree), 1188 collected** — comfortably above the 1155 floor; 11 of the
  passing tests are new in this session (5 + 6).
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`: **411/411,
  0 skipped** (see "Findings not mine to fix" above for why this is 411 and
  not 407).

## `apps/viewer/README.md` scope seam with `mutation_witness_tier_reaches_its_checks`

No conflict reached me: that handoff's own review (`2856a164`) already landed
in `integration` before this branch was cut, so its edits to the
mutation-witness paragraph and commands block were ordinary history I edited
forward, not a merge conflict. `depends_on: [viewer_unwitnessed_surface_guards]`
was about a different handoff (the one appending to
`scripts/mutation_witnesses.json`), which had also already landed by the time
I started (visible in `git log`, `4c5b6a7`) — so the count I measured (27
declared / 7 real) is already the post-append figure, not a number I need to
revisit when that handoff merges.
