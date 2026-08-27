---
priority: low
depends_on: []
---

# HANDOFF 2026-08-26 — review_checklist_vocabulary_wording: fix `docs/prompts/REVIEW_AGENT.md`'s stale "three places" vocabulary claim

Source: `docs/issues/ISSUE_20260821_review_checklist_still_says_a_vocabulary_lives_in_three_places.md`,
filed by `three_field_vocabularies` (2026-08-21). Baseline: trunk. Scope:
`docs/prompts/REVIEW_AGENT.md` only, specifically the "Documented vocabularies
drifting from the seeded data" checklist item (~line 683). Do not touch
`tolerance_stack/`, `tests/`, or `docs/SOP_TOLERANCE_STACK.md` — those are
where the vocabulary itself already got fixed (`three_field_vocabularies`,
merged) and are out of scope here; this handoff only corrects the checklist
prose that still describes the old state.

## The stale claim

`docs/prompts/REVIEW_AGENT.md`, "Documented vocabularies drifting from the
seeded data" (~line 683):

> A vocabulary lives in **three** places (SOP prose, the dataclass comment,
> the enforcing test); check all three, not two.

As of 2026-08-19 it lives in **two**, and neither is a comment: SOP prose is
unchanged (still the author-facing copy), the dataclass comment is deleted (a
module constant — `SOURCE_REF_KINDS`, `ELEMENT_ROLES` — is now the definition,
enforced by `__post_init__`), and the enforcing test now reads the constant
rather than a hand-copied whitelist (the SOP↔constant pairing specifically is
`tests/test_sop_vocabulary.py::test_the_sop_spells_the_same_vocabularies_the_code_enforces`).
A reviewer following the current wording looks for a comment that no longer
exists, and manually re-does a diff the suite already does.

## Deliverables

1. **Replace the "three places" claim.** New wording should say the SOP list
   and the constant are paired by
   `test_the_sop_spells_the_same_vocabularies_the_code_enforces`, and direct
   the reviewer to read what that pairing does *not* cover — it covers
   `SourceRef.kind` and `StackElement.role`; the SOP does not mention
   `SpecEntry.subject_kind` at all, so that one has no prose to pair against
   and still needs eyes. Keep the part of the checklist item that is not
   mechanised: a **sentence stating a rule** (as opposed to a listed value) is
   not something any vocabulary-vs-data comparison can see, and that manual
   read is still the reviewer's job.
2. **Fix the second stale clause in the same paragraph.** The item also says
   `kind: "spec"` was *"omitted from the whitelist in
   `test_source_ref_leaves_the_feature_identity_slot_open_and_empty`"* — that
   is correct as history and should stay written as history (don't delete
   it), but note explicitly that the test it names no longer holds a
   whitelist (it reads the constant now, same as the rest of this item).

## Definition of done

- The checklist item under "Documented vocabularies drifting from the seeded
  data" in `docs/prompts/REVIEW_AGENT.md` matches the current code (constant +
  paired test), keeps the un-mechanizable "read the rule sentence" instruction,
  and marks the whitelist reference as historical rather than current.
- No code or test changes — this is a prose-only handoff. Confirm with a diff
  review that only `docs/prompts/REVIEW_AGENT.md` changed.
- Lesson (`docs/sessions/lessons/LESSONS_20260826_review_checklist_vocabulary_wording.md`):
  quote the before/after wording of the fixed paragraph.
