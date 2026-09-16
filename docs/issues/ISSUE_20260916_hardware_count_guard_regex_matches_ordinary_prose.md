---
type: bug
priority: high
status: open
area: tests/doc-scan
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_js_guards_and_suite_isolation.md
---

# `test_no_live_document_states_an_unguarded_hardware_entry_count` is red on `integration`: its `other (N) do not` shape matches ordinary English

`venv-win/Scripts/python.exe -m pytest -q` on `integration` (measured
2026-09-16 at `1b3848b`, the merge of `integration` into
`review/python_value_and_schema_pins`) is **1 failed, 1175 passed, 1 skipped**:

```
FAILED tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
E   live documents state hardware-entry counts that disagree with docs/tolerance_stacks/hardware_entries.json:
E       docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152: says 3 entries that do not defer to the spec library; hardware_entries.json has 28
```

**It is a false positive, not a stale count.** The named line is
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`:

> honest answer may genuinely diverge, for a reason **the other three do not** have:

That sentence is about the brief's four origin-posture cases and says nothing
whatever about hardware entries. It is matched by the `_COUNT_CLAIMS` entry at
`tests/test_tolerance_stack.py:2830`:

```python
    ("entries that do not defer to the spec library",
     rf"other\s+({_NUM})\s+do\s+not", ("not_library",)),
```

`_NUM` accepts spelled-out numbers, so `other three do not` matches and the
guard then demands that "three" equal `hardware_entries.json`'s
`not_library` count of 28. The shape carries no anchor to hardware, entries,
the spec library, or anything else in its own subject — it is four ordinary
English words in sequence, and this is the first live document to write them.

## Why this is `high` and not a nit

**The whole pytest suite is red on `integration` right now**, so every session
cut from it starts from a red baseline and has to re-derive that this one
failure is not theirs before it can trust its own run. This session
(`js_guards_and_suite_isolation`) spent that time; the next one will too. The
repo's own convention is that a docs-only change can legitimately turn the
suite red — which is exactly what makes a *false* red expensive, because the
honest response to a red doc-scan is to go and fix the document.

## Provenance — neither side is at fault, the pairing is

- The claim shape is old: added in `46e545e`
  (`hardware_counts_doc_guard`), long before the brief existed.
- The brief was committed by the **2026-09-16 triage sweep** (`78305fc`,
  "triage 2026-09-16: 39 issues dispositioned"), i.e. *after* the
  `1155 passed` baseline that `HANDOFF_20260916_*` files quote was measured on
  `master`. Nothing since has re-measured pytest on `integration`.

So no handoff introduced this; a triage sweep's own prose met a guard that was
never anchored to its subject.

## Repro

```
venv-win/Scripts/python.exe -m pytest -q tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
```

## Fix shape (for whoever picks this up — not done here, off-task)

Anchor the shape to its own subject, the way the neighbouring entries in
`_COUNT_CLAIMS` are. Every other claim in that list names something —
`workbook`, `entries are traced`, `NAS`, `source-control drawings`,
`not_transcribed` — while this one names nothing. Requiring `entries` or the
spec library within the match (e.g. `other\s+(N)\s+do\s+not\s+(?:defer|...)`,
or `other\s+(N)\s+entries\s+do\s+not`) would keep the count guarded and stop
it reading prose about anything else that comes in threes.

Note the test's own docstring already states the honest limit — *"a shape not
listed in `_COUNT_CLAIMS` is not caught"* — but says nothing about the
converse, a shape loose enough to catch text that is not a claim at all. Worth
a line there too, since this is the second direction the guard can be wrong in.

**Do not "fix" this by rewording the brief.** `docs/strategy/` prose is not
where this belongs, and the next document to write "the other three do not"
would reopen it.
