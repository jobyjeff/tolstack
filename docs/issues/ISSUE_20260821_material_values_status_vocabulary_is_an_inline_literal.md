---
type: chore
priority: low
status: triaged
area: tolerance_stack/thermal
reporter: agent
handoff: docs/sessions/HANDOFF_20260826_material_values_status_vocabulary.md
---

# `MaterialEntry.values_status`'s vocabulary is an inline tuple literal inside `__post_init__` — the same defect the comment-defined ones had, invisible to the grep that finds them

Filed by `three_field_vocabularies` (2026-08-21), which closed
`SourceRef.kind`, `StackElement.role` and `SpecEntry.subject_kind`
(`ISSUE_20260818_three_more_field_vocabularies_are_defined_by_a_comment.md`) and
was asked, in its definition of done, whether there is a fifth. There is, and it
is **not** a comment — which is the interesting part.

## What it is

`tolerance_stack/thermal.py:146`:

```python
if self.values_status not in ("inline", "library", "not_transcribed"):
    raise ValueError(f"material {self.id!r}: bad values_status {self.values_status!r}")
```

The three words are **validated** — so this is strictly better than the four
fields fixed on 2026-08-19 — but they have **no name**. Consequences, in the
order they will bite:

- **Nothing can import it.** The identical three words are `hardware_entry`'s
  `values_status` (SOP Step 4, `docs/prompts/REVIEW_AGENT.md`'s "Schema hygiene"
  bullet, and `hardware_entry_problems()` in `tests/test_tolerance_stack.py`,
  which spells them again). Two independent copies of one vocabulary across two
  schemas that mean the same thing by it — the exact accumulation
  `ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_...`
  measured for `confidence`.
- **The grep does not find it.** The sweep that found the previous four —
  `grep -rn '# .* | .* |' tolerance_stack/` — sees only pipe-list *comments*. An
  inline literal in an `if` has no comment to match, so a repo-wide "are there
  any left?" pass comes back clean while this one sits there. So does a
  one-pipe comment: `SourceExport.status`'s `# established | unestablished`
  needed two pipes to be found and was fixed by hand in the same session.

## Fix shape

`MATERIAL_VALUES_STATUSES = ("inline", "library", "not_transcribed")` beside
`MaterialEntry`, read by the `if`; then decide whether `hardware_entry` should
import the same name or whether the two schemas are deliberately independent —
that decision is the substance here, not the constant.

**`hardware_entry` is not a dataclass at all** (it is validated dict-side by
`hardware_entry_problems()`), so "both read one constant" is not a one-line
change and may not be the right answer. Say which, in the lesson.

## The general form

`forge/docs/sessions/HANDOFF_20260819_no_second_source_of_truth_convention.md` is
writing the convention this is an instance of. The lesson
`docs/sessions/lessons/LESSONS_20260819_three_field_vocabularies.md` argues that
the question *"is there a fifth?"* has now been asked and answered three times
and should become a **test** — a scan for enumerated `str` domains that have no
importable name — rather than a fourth grep. That test, not this constant, is the
durable deliverable; this issue is the last hand-found instance.
