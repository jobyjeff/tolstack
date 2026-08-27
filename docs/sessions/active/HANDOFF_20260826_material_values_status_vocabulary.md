---
priority: low
depends_on: []
---

# HANDOFF 2026-08-26 — material_values_status_vocabulary: name `MaterialEntry.values_status`'s inline tuple literal

Source: `docs/issues/ISSUE_20260821_material_values_status_vocabulary_is_an_inline_literal.md`,
filed by `three_field_vocabularies` (2026-08-21) as the fifth (and last
hand-found) instance of the vocabulary-with-no-importable-name defect —
see `docs/sessions/lessons/LESSONS_20260819_three_field_vocabularies.md` for
the general form (`forge/docs/sessions/HANDOFF_20260819_no_second_source_of_truth_convention.md`
is writing the cross-repo convention this is an instance of). Baseline: trunk.
Scope: `tolerance_stack/thermal.py` (the `MaterialEntry.values_status` check)
and, if the decision below says so, `hardware_entry`'s validation in
`tolerance_stack/` plus `tests/test_tolerance_stack.py`'s
`hardware_entry_problems()`. Do not touch `docs/prompts/REVIEW_AGENT.md` —
that's a separate handoff (`review_checklist_vocabulary_wording`, staged
alongside this one) and is explicitly out of scope per its own issue.

## Deliverables

1. **Name the vocabulary.** `tolerance_stack/thermal.py:146` currently checks
   `self.values_status not in ("inline", "library", "not_transcribed")`
   inline, in `__post_init__`. Extract
   `MATERIAL_VALUES_STATUSES = ("inline", "library", "not_transcribed")` as a
   module-level constant beside `MaterialEntry`, and have the `__post_init__`
   check read it.
2. **Decide whether `hardware_entry` should share this constant or stay
   independent, and act on the decision.** `hardware_entry` validates the
   identical three words (`values_status`) via `hardware_entry_problems()` in
   `tests/test_tolerance_stack.py` (dict-side check, not a dataclass —
   `hardware_entry` is not a dataclass at all, so "both read one constant" is
   not a one-line change). SOP Step 4 and `docs/prompts/REVIEW_AGENT.md`'s
   "Schema hygiene" bullet both spell the same three words again. This is the
   same accumulation `ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_...`
   measured for `confidence` — decide here whether `MaterialEntry` and
   `hardware_entry` are one vocabulary or two schemas that happen to share
   words today, and either import the same constant from
   `hardware_entry_problems()` or record explicitly why not.
3. **Consider (but don't block on) the durable fix.** The lesson from
   `three_field_vocabularies` argues that "is there a fifth?" has now been
   asked and answered enough times (four prior instances, this is the fifth)
   that it should become a test — a scan for enumerated `str` domains with no
   importable name — rather than a recurring hand grep. If this is cheap given
   what you learn while fixing (1)/(2), build it; if not, say explicitly in the
   lesson why this instance was fixed by hand instead and leave the test as an
   explicit follow-up (don't silently drop it).

## Definition of done

- `MATERIAL_VALUES_STATUSES` exists, is imported by `MaterialEntry`'s
  validation, and the decision from deliverable 2 is implemented (constant
  shared with `hardware_entry_problems()`, or an explicit one-line note in the
  lesson for why the two stay independent).
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q` — confirm exact
  spelling/venv name against this repo's `CLAUDE.md` first).
- Lesson (`docs/sessions/lessons/LESSONS_20260826_material_values_status_vocabulary.md`):
  record the shared-vs-independent decision and its reasoning, and whether the
  generalized "no fifth vocabulary left unnamed" test got built or deferred.
