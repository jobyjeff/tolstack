---
priority: high
depends_on: [mesh_store_rekeyed_to_the_pure_signature]
model: sonnet
---

# HANDOFF 2026-10-01 — mesh_store_reconciled_to_the_pure_signature: collapse the duplicate mesh directories and repoint the alias table

Source: `ISSUE_20260930_one_solid_two_geometry_signatures_across_two_runs.md`
(high, `class: shared_mutable_state_in_a_signed_artifact`). Baseline: tolstack
trunk at `61ee193`, plus rotorkit's `shape_signature_is_pure` which merged to
rotorkit trunk in the 2026-10-01 triage batch merge. Scope: `data/meshes/`
(gitignored, main checkout, absolute paths) and
`docs/topologies/part_mesh_aliases.json`; do NOT edit rotorkit's tree.

**`depends_on` is load-bearing, not caution.** The producer fix has landed, but
`mesh_store_rekeyed_to_the_pure_signature` is the handoff that produces the
old→new key map and resolves the fusion in the store itself. Reconciling before
it runs would re-do the work against keys that are about to move again — which
is exactly why the 2026-09-30 sweep declined to stage this and left the issue
`open` rather than deferring it.

## What the producer fix established

`rotorkit/docs/sessions/lessons/LESSONS_20261001_shape_signature_is_pure.md`
answers the one question this issue was waiting on. The two directories this
repo holds for XCAF label `0:1:1:249` —

- `asm217755_MS14101_3_9bfdb344` (signed clean)
- `asm217755_MS14101_3_1ec77e91` (signed after contamination)

— **both map to the same new signature,
`815597cb2da7407eb0e4fc1ef51386a65c5df934401e623859625ab7e05404c9`.** So the
answer to "which of the two is canonical" is *neither, and the question
dissolves*: they are the same solid, and under the pure key they are one
directory. Every other field already agreed, which is what made them look like
a mystery rather than a duplicate.

## Deliverables

1. **Collapse the duplicate pair**, taking the surviving directory and its new
   name from rotorkit's map rather than re-deriving a signature here — this
   repo has no `shape_signature` implementation and must not grow one. **Move
   the loser aside, never delete it**: the store is gitignored, so a deletion is
   unrecoverable and nothing in git would show what went.

2. **Repoint `docs/topologies/part_mesh_aliases.json`.** It resolves an alias
   to a `part_id` by **exact match**, so every id carrying a signature suffix
   (`asm217755_MS14101_3_84a75703`, `asm217755_216332_001_1ff0bced`, and the
   rest of the `<name>_<8 hex>` family) currently resolves to nothing — and
   **says so nowhere**, which is the half of this that matters most.

3. **Make a stale alias loud.** An exact-match resolver that returns nothing
   silently is why a re-keying went unnoticed until a sweep went looking. Add
   the check that fails — a test, a guard, or a validation pass over the alias
   table against the store — so the next key move is reported rather than
   discovered. Say in the lesson which surface it reports on and what a reader
   sees; a check whose only output is a pytest failure is a fair answer, but
   name it as that.

4. **Walk the other consumers of a signature-suffixed `part_id` before you
   finish.** The alias table is the one the issue names, but `part_id` is also
   the annotate app's binding key and appears in the shared projections. Name
   every site you found, and say which you changed and which you deliberately
   left — an unrendered path is fair to leave, in writing; a surface a user can
   reach is not.

## Definition of done

- `data/meshes/` holds exactly one directory for XCAF label `0:1:1:249`, named
  under the pure key, with the superseded one preserved outside the store and
  its location quoted in the lesson.
- Every alias in `docs/topologies/part_mesh_aliases.json` resolves to a
  directory that exists — demonstrated by running the check from deliverable 3,
  not by inspection.
- A deliberately-broken alias makes that check fail.
- Full suite green with the `[real]` tier armed (`1445 passed` was the
  2026-10-01 armed baseline; unarmed the tier proves nothing and will report a
  misleading red — see
  `dispatch/docs/issues/ISSUE_20261001_bridge_test_inputs_cannot_arm_a_directory_that_carries_a_tracked_placeholder.md`
  before concluding anything from a `[real]` failure).
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_mesh_store_reconciled_to_the_pure_signature.md`):
  the full list of `part_id` consumers found in deliverable 4 and what was done
  about each — that list is the thing the next key move will need and the thing
  nobody currently has.
