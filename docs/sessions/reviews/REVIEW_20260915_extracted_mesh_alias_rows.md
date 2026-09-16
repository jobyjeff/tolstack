---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_extracted_mesh_alias_rows.md
reviewer: agent
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW — extracted_mesh_alias_rows (2026-09-15)

**APPROVE.** Eleven alias rows, a `part_id` uniqueness guard, and a de-staled
`data/meshes/README.md`. Every identity claim on every row was re-derived here
from the live `provenance.json` files rather than read off the author's table,
and all eleven hold. One nit fixed inline; two should-fixes filed as issues
(one of them out of scope, one a merge-time duplicate). Suite green apart from a
failure that predates the branch and is already tracked twice.

## What the mandatory checks come to here

Checks 1–7 of this repo's overlay are written for a **tolerance stack** and this
deliverable contains no `StackElement`, no `source_ref`, no `fold()` path and no
verdict. Nothing in the diff touches `tolerance_stack/`, `scripts/`, or any
stack/worksheet JSON. So there is no traced/inferred/untraced ratio to state,
no sign to read, no LMC/MMC mapping and no RSS. Stated explicitly so a reader
can tell this from a review that skipped them.

What *does* carry over is the rule underneath them — **an identity claim carries
its evidence, and an unevidenced one stays out.** The alias table asserts "these
two strings name the same physical part," which is the same class of claim as a
tolerance, one namespace up, and a wrong row is silent in exactly the way an
invented number is (`resolveMeshIdentifier` exact-matches and returns a mesh; no
consumer can tell a right match from a wrong one). That is what this review
audited, row by row.

## Deliverable 1 — the eleven rows: verified, all eleven

Re-derived independently from `C:\workspace\tolstack\data\meshes\<sha>\provenance.json`
(24 directories, read at review time), against the `parts` vocabularies in
`docs/topologies/topology_*.json`. For every row I checked the mesh-side
`part_id`, the directory sha the evidence names, the XCAF `product_label_entry`,
the solid/instance counts the evidence quotes, and the topology-side part's own
`name`/`drawing`/`note`:

| row | mesh `part_id` present | sha in evidence | label entry | counts quoted |
|---|---|---|---|---|
| `pitch_plate_215177_001` | ✓ | ✓ `365deebc…` | ✓ `0:1:1:1458` | ✓ 10 solids, `product_is_assembly: true` |
| `bushing_214820_002` | ✓ | ✓ `ddf99082…` | ✓ `0:1:1:1463` | ✓ 1 solid, 8 instances |
| `straight_bushing_214820_002` | ✓ | ✓ same dir | ✓ | ✓ |
| `plain_bushing_214943_002` | ✓ | ✓ `7b30dea1…` | ✓ `0:1:1:1441` | ✓ 1 solid |
| `bolt_nas6403u11d` | ✓ | ✓ `85a7c4e3…` | ✓ `0:1:1:1466` | ✓ 1 solid, 5 instances |
| `bolt_nas6403u13h` | ✓ | ✓ `2dbf77af…` | ✓ `0:1:1:1451` | ✓ 1 solid, 3 instances |
| `bolt_nas6404u13d` | ✓ | ✓ `aaf6260b…` | ✓ `0:1:1:1440` | ✓ 1 instance |
| `washer_ms21299c3` | ✓ | ✓ `70ef2db0…` | ✓ `0:1:1:1507` | ✓ 1 solid |
| `washer_ms21299c4k` | ✓ | ✓ `e13d2e96…` | ✓ `0:1:1:193` | ✓ 1 solid, 11 instances |
| `washer_nas1149v0332h` | ✓ | ✓ `9f3a1690…` | ✓ `0:1:1:198` | ✓ 1 solid, 29 instances |
| `washer_nas1149v0332_tt` | ✓ | ✓ same dir | ✓ | ✓ |

Nine distinct meshes, eleven rows — the two doubled ids (`214820-002`,
`NAS1149V0332H`) are one physical part in two joints, which is what the table's
one-part-many-ids shape is for, and both topology parts genuinely exist in two
different topology files.

The handoff's central instruction — *derive the mesh side from the live
provenance, not from the 2026-09-14 lesson's literal strings* — was followed and,
more usefully, its outcome was **measured**: the ids did not move, and the lesson
says why they could not have (rotorkit's suffix fires only on an ambiguous spec
number; the only suffixed id in the store, `asm217755_MS14101_3_*`, belongs to a
candidate and not to a row). That is the difference between a correct answer and
a lucky one.

**The five candidates were correctly left out**, and each is the right call:

- `tan_link_mount_215175_002` — the store holds `215175-**001**`. A dash-number
  question, unanswerable from the STEP.
- `spherical_bearing_tan_link` / `_in_vpa` — two ids, three installed `MS141xx`
  meshes, and `MS14101-3` covers two different geometries. No assignment is
  readable from either side.
- `flanged_bushing_tan_link` / `_unidentified` — the topology part's own `name`
  literally reads *"part identity NOT ESTABLISHED"*. A row here would have
  invented the thing the topology file explicitly declines to claim.
- `gas_spring` — the topology part says *"Part identity not established."*
  `PMF200521` is structural adjacency only.
- `214723-002` — the repo's own 2026-09-10 counter-evidence (bore ⌀12.320 ±0.015
  matching `215198`'s lug) stands.

I confirmed against the empty-state measurement below that all six of these
topology ids still resolve to nothing, which is the intended honest answer.

## Deliverable 2 — the uniqueness guard: observed failing, independently

Per the canonical *"a new guard has been observed failing"* check, I did not take
the author's demonstration on trust. Against a throwaway store (never the real
one), driving the **shipped** `test_installed_mesh_part_ids_are_unique`:

- **Planted duplicate** (two sha-named dirs both claiming `asm217755_MS14101_3`)
  → **RED**, and the message names the colliding `part_id`, *both* directory
  names, and the store path. It names the right thing.
- **After repair** (second dir given a suffixed id) → GREEN.
- **Noise** (a non-sha dir, a dir with no `provenance.json`, a `provenance.json`
  with no `part_id`) → ignored, still GREEN.
- **Anti-vacuity**: a store with sha-named dirs but no readable `part_id`
  anywhere → **RED** with the "would pass vacuously" message, for the new test
  *and* the pre-existing orphan test. Both non-vacuous in both directions.

The guard observes the real thing, not a proxy: it reads each directory's own
`provenance.json`, and `installed_part_id_owners()` returning
`part_id -> [dir, …]` is the correct shape — it is exactly the `set()` that the
handoff identified as where a duplicate goes to die, moved out to the one call
site that wants a set. Real store today: **24 directories, 24 distinct
`part_id`s**, so it passes on live data without being vacuous.

## Deliverable 3 — `data/meshes/README.md`

Correct on every fact I checked:

- The two extraction runs (`assembly_extract_20260914T233035Z`,
  `assembly_extract_20260915T002725Z`) and the single-part run
  (`tessellate_20260906T204904Z`) match `produced_by` in the store — 22 + 2.
- "Every mesh at the medium deflection tier (0.1 mm)" — all 24 are
  `('medium', 0.1)`.
- `scripts/extract_assembly_parts.py`, `scripts/tessellate_parts.py`,
  `stepgeom.assembly.shape_signature` and
  `rotorkit/docs/issues/ISSUE_20260914_extracted_placements_have_no_consumer.md`
  all resolve in rotorkit.
- The 54 min / 156 min / 2.9× / 2 GB figures reproduce in rotorkit's own lesson.
- The `source_step_sha256`-is-a-BRep-hash fact — the one the handoff singled out
  — is stated plainly and correctly, with the "do not read this as evidence a
  per-part STEP exists" warning the handoff asked for.

**Deleted-section check** (this overlay's blind-spot entry — a doc guard cannot
fail on a section that is gone): I diffed the headings against the previous
version myself. `## What's here today (2026-09-06, …)` and its two-row table are
the only removals. Nothing was silently lost: the two single-part meshes keep
their run and commit in the replacement prose, and the old paragraph's real
content — that placements are not applied to the mesh — survives, restated for
the extraction route with a rotorkit issue pointer. The `927`/`1083` face counts
went with the table, which is the point of the exercise.

**The count question** was answered the right way: gone, not moved. A test
pinning it would redden the suite every time rotorkit installs a part — a guard
that fires on correct behaviour — and the derived answers consumers actually read
(`build_topology_projection.py`'s per-part stamp, this file's `[real]` tier) are
built from the store already. The section now says *why* it lists nothing, which
is what stops the next agent helpfully re-transcribing a table.

## Definition of done — item by item

| DoD item | result |
|---|---|
| `tests/test_part_mesh_aliases.py` green with the new rows (baseline 5) | **6 passed**, no skips — both `[real]` tiers reached the main checkout's store |
| `node apps/annotate/run_tests.cjs` green, both `[real]` tiers | **63/63**, both `[real]` checks ran (the handoff's 53/53 is stale; the suite grew independently of this diff) |
| uniqueness test exists and reddens on a planted duplicate, demonstrated, cleaned up | ✓ author demonstrated; ✓ independently replayed here; nothing written to the real store (its newest mtime is 2026-09-14) |
| annotate no longer shows "no installed mesh" for the 11 rows' parts; name them and how | ✓ and **independently reproduced**: driving the real `AA.resolveMeshIdentifier` over the live store, `git show integration:…part_mesh_aliases.json` as before — **11 gained, 1 already had (`gas_spring_mount_213668_002`), 0 lost, 17 still empty of 29 live topology parts**. The eleven gained are exactly the eleven rows. All six candidate ids are among the seventeen. |
| `pytest -q` green (baseline 880 passed, 1 skipped) | see below — green except a pre-existing failure |
| lesson with rows, candidates, and where the count ended up | ✓ all three, plus two forward-looking notes |

**The suite.** The handoff's stated baseline was wrong, and the author is right
about it. On *this* review branch's base (`b586eec`, clean tree, nothing merged):
**1 failed, 883 passed, 1 skipped**. After merging the work: **1 failed, 884
passed, 1 skipped** — exactly `+1` test, the new guard, and no new failure. The
one failure is
`test_every_byte_identity_claim_in_a_live_file_names_its_verification` tripping
on `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`,
prose the triage sweep itself wrote, present before any change on either branch.
`node apps/viewer/run_tests.cjs`: **298/298**, unchanged; its node-fs tier skips
in a worktree for the pre-existing reason the lesson names.

## Lesson audit (canonical: re-derive its arithmetic and its attributions)

Re-derived every number in `LESSONS_20260915_extracted_mesh_alias_rows.md`.
**All of them hold**, including the ones that would have been easiest to get
wrong: nine distinct meshes / eleven rows; 10 solids and nine NAS77 bushings in
`215177-001` (`NAS77A3-015A` ×8 + `NAS77A4-015A` ×1 = 9 ✓); `PMF200521` as 2
solids × 3 instances; 24 directories with 24 distinct `part_id`s; 11 gained / 1
had / 0 lost / 17 empty; 6 passed / 63/63 / 298/298. The "five candidates"
framing traces correctly to the five rows of rotorkit's own candidate table (the
handoff's prose collapsed them into four bullets and dropped `214723-002`; the
lesson recovers it as item 5, which is the more complete reading).

Causal attributions checked too: *"the ids did not move because the suffix only
fires on an ambiguous number"* is right — `asm217755_MS14101_3_9bfdb344` /
`_84a75703` are the only suffixed ids in the store, and neither is a row. One
loose phrase, not worth an edit: *"exactly one id carries a suffix"* immediately
names two ids; the sense is one *spec number*.

## Findings

### Fixed inline (1)

1. **nit — `docs/topologies/part_mesh_aliases.json`, the new `notes` entry.**
   *"**Five** further **installed meshes** stayed OUT, as candidates rather than
   rows: …"* — the list that follows names **six topology part ids** (not
   meshes), grouped into four questions, and the meshes those ids could point at
   number seven to nine. The count contradicted its own enumeration in the same
   sentence, and it is a quantity in tracked prose that nothing pairs against the
   tree — this repo's standing defect class, inherited here verbatim from the
   handoff's own phrasing. **Fixed inline** (three prongs: documentation only, no
   behaviour, one clause) by dropping the count rather than restating it:
   *"Further topology part ids stayed OUT, as candidates rather than rows — each
   needs a decision nothing in the STEP can settle: …"*. The list itself was
   already correct and is untouched. Re-validated: JSON parses, 6 passed.

### Should-fix, filed as issues, not fixed (2)

2. **`ARCHITECTURE.md` (and `docs/ANNOTATION_SURFACE.md`) still describe the
   only mesh route as a per-part-STEP tessellation that this repo hand-copies.**
   True for 2 of the 24 installed meshes. The author corrected exactly this
   sentence in `data/meshes/README.md` — which was in the handoff's three-file
   scope — and `ARCHITECTURE.md`'s rotorkit bullet carries it almost verbatim,
   outside that scope and outside every guard the repo owns. Out of scope, so
   filed rather than fixed:
   `ISSUE_20260915_architecture_md_still_says_every_mesh_is_a_tessellated_per_part_step_copy.md`.
   Added to this repo's review overlay as the fact-rather-than-count variant of
   the existing "fixed the one guarded copy" entry.

3. **Duplicate issue, created by the merge rather than by the author.**
   `ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`
   reports the same brief line as
   `ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`,
   which reached `integration` at 15:22 — twenty-one minutes *after* this
   handoff's branch point (`3141e51`, 15:01). **Not a finding against the
   author**, who could not have seen it. Both are kept because each carries a
   measurement the other lacks (the branch-point run; the observation that this
   guard reads **test docstrings**, which it proved by catching a byte-identity
   claim in a draft of the new test's own docstring — a genuinely useful thing to
   have on the record). I appended a cross-reference to the newer one saying so;
   **triage should close one and fold the measurements into the survivor.** Added
   to the overlay as a new entry, because the duplicate first exists at the
   merge, which makes it the reviewer's to catch.

### Nits, not fixed, no issue

4. `installed_part_id_owners()` reads `provenance.get("part_id")` and skips a
   falsy one, where the code it replaced used `provenance["part_id"]` and would
   have raised. A mesh installed with a malformed provenance is now invisible to
   both `[real]` tests instead of crashing one of them. In practice harmless —
   an alias pointing at such a mesh still reports as orphaned, and the
   anti-vacuity assertion still catches a wholly unreadable store (both replayed
   above) — and the tolerant read is the right choice for a scanner. Recorded
   only so the next reader knows the strictness was traded deliberately.

5. The lesson's *"exactly one id carries a suffix"* names two ids in the same
   breath (see the audit above). Reads fine in context.

## Merge

`git merge-base --is-ancestor handoff/extracted_mesh_alias_rows integration`
before starting: **not merged** — no bypass, so merging it in and watching the
suite was a real step. The merge into `review/extracted_mesh_alias_rows` was
clean, no conflicts, nothing to resolve.

## Note for the next reviewer

Two of this sweep's handoffs now have issues open against the same red
`integration` suite, and a third will file a fourth unless somebody fixes one
word of prose in
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`. It
is one sentence and the fix is written out in both issues. Until then every
tactical report from this sweep opens by explaining a failure it did not cause.
