---
type: chore
priority: low
status: open
area: prompts/review
reporter: agent
---

# `docs/prompts/REVIEW_AGENT.md` still tells reviewers a vocabulary lives in three places and to check all three

Filed by `three_field_vocabularies` (2026-08-21). **Not fixed here on purpose:**
that file's own header says the review agent owns it and edits it in a review
worktree, and this handoff's scope named `tolerance_stack/`, `tests/` and
`docs/SOP_TOLERANCE_STACK.md`.

## The claim

`docs/prompts/REVIEW_AGENT.md`, "Documented vocabularies drifting from the seeded
data" (~line 683):

> A vocabulary lives in **three** places (SOP prose, the dataclass comment, the
> enforcing test); check all three, not two.

As of 2026-08-19 it lives in **two**, and neither of them is a comment:

| | before | now |
|---|---|---|
| SOP prose | the list in Step 5b / Step 2 | unchanged — still the author-facing copy |
| the dataclass comment | `# drawing \| parts_list \| ...` | **deleted**; the module constant (`SOURCE_REF_KINDS`, `ELEMENT_ROLES`) is the definition and `__post_init__` enforces it |
| the enforcing test | a hand-copied whitelist | reads the constant; the SOP↔constant *pairing* is `tests/test_sop_vocabulary.py::test_the_sop_spells_the_same_vocabularies_the_code_enforces` |

A reviewer following the current wording will look for a comment that is not
there, and — more costly — will do by hand a diff the suite now does.

## What the item should say instead

The manual check that is *not* mechanised is the one this same checklist item
already names as its third sighting: a **sentence about a rule**, which no
vocabulary-vs-data comparison can see. Keep that half; replace the "three places"
half with "the SOP list and the constant are paired by a test — read what the
pairing does not cover" (it covers `SourceRef.kind` and `StackElement.role`; the
SOP does not mention `SpecEntry.subject_kind` at all, so that one has no prose to
pair).

Same paragraph, second stale clause: *"`kind: "spec"` … omitted from the
whitelist in `test_source_ref_leaves_the_feature_identity_slot_open_and_empty`"*
is correct as **history** and should stay as such, but the test it names no
longer holds a whitelist.

See `docs/sessions/lessons/LESSONS_20260819_three_field_vocabularies.md`.
