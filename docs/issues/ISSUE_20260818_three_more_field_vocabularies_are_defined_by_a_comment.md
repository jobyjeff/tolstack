---
type: chore
priority: med
status: triaged
handoff: docs/sessions/HANDOFF_20260819_three_field_vocabularies.md
area: tolerance_stack
reporter: agent
---

# `SourceRef.kind`, `StackElement.role` and `SpecEntry.subject_kind` are still defined by an end-of-line comment

Filed by `confidence_vocabulary_single_definition` (2026-08-18), which was sent to
fix exactly this shape for `SourceRef.confidence` and was asked, in its handoff, to
say whether any other vocabulary in this repo has it. Three do. **The shape, not
the specific list, is the finding** — this is the same defect one field over, and
the fix is the same three lines each.

For `confidence` the cost was measured: the vocabulary lived in
`# traced | inferred | untraced`, so nothing could read it, three independent
copies of the three words accumulated across `tolerance_stack/`, `scripts/` and
`tests/`, `SourceRef(confidence="banana")` constructed, and `VA.CONFIDENCES` was
the one viewer table `tests/test_js_python_vocabulary.py` could not pair. See
`ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_to_pair_va_confidences_against.md`
and the lesson for that handoff.

## The three

| field | where | validated? | copies today |
|---|---|---|---|
| `SourceRef.kind` | `tolerance_stack/stack.py:286`, `# drawing \| parts_list \| workbook \| spec \| pipeline_element \| assumed` | **no** | the comment; `tests/test_tolerance_stack.py:692` and `:1807`, two identical six-element tuples |
| `StackElement.role` | `tolerance_stack/stack.py:338`, `# bushing \| bearing \| washer \| clamped_member \| relief \| fastener \| allowance \| nut_geometry` | **no** | the comment; `tests/test_tolerance_stack.py:947` |
| `SpecEntry.subject_kind` | `tolerance_stack/spec_library.py:217`, `# part_number \| criterion \| family` | **no** | the comment, and **nothing else** — no constant, no test whitelist, no consumer that enumerates it |

`kind` is the one to do first, and it is worth correcting the record about it:
**two documents in this repo state that `SourceRef` validates `kind` against a
whitelist, and it does not.** Before 2026-08-18 `SourceRef` had no `__post_init__`
at all. The claim is in the issue above and in the handoff derived from it; both
are dated history and stay as written, but do not act on them. What is true is
that `docs/SOP_TOLERANCE_STACK.md:352` says *"A new kind must be added to all
three, or the SOP is describing something the code will not accept"* — which the
code will in fact accept silently, so the SOP is describing a check that does not
exist.

`role`'s eight words are the least urgent (nothing outside the tests reads them)
and `subject_kind`'s three are the most exposed: an event file can spell
`subject_kind: "partnumber"` today and no test anywhere fails.

## Suggested direction — the shape that worked for `confidence`

1. A module constant beside the dataclass (`SOURCE_REF_KINDS`, `ELEMENT_ROLES`,
   `SUBJECT_KINDS`), with the comment **deleted**, not left beside it — a comment
   next to the constant is the next reader's second source of truth.
2. `__post_init__` validates against it. `SourceRef.__post_init__` now exists and
   already validates `confidence`; adding `kind` to it is one `if`.
3. The test tuples read the constant instead of re-listing it, the way
   `test_every_element_carries_a_source_ref_with_a_confidence` now does.
4. `SOP_TOLERANCE_STACK.md`'s "all three" sentence gets recounted — with the
   constant in place, the SOP is stating something enforceable rather than
   something aspirational. `tests/test_sop_vocabulary.py` is where that pairing
   would live.

None of this moves a value on disk. `kind` and `role` are already asserted over
every stack file by the tests above and those tests pass, and the live
`subject_kind` values in `docs/spec_library/events/` are exactly
`criterion` / `family` / `part_number` — the three the comment lists, checked by
`grep` on 2026-08-18.

`SpecEntry.kind` (`tolerance_stack/spec_library.py:487`,
`# NAS/MS standard | MIL standard | Joby part drawing | ...`) is deliberately
**not** on this list: it ends in `| ...`, so it is free text with examples rather
than a closed vocabulary. Do not close it on the strength of the resemblance.
