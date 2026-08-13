---
priority: low
depends_on: [js_python_vocabulary_pairing]
---

# HANDOFF 2026-08-12 — material_cte_optional: a `not_transcribed` material must be able to say no number was transcribed

Source: triage sweep 2026-08-12, routing
`docs/issues/ISSUE_20260812_not_transcribed_material_must_still_carry_a_cte.md`
(`bug`, `low`). Found by `viewer_fixture_shape_guards` while making
`apps/viewer/fixtures.js`'s no-citation material row legal against the model.
Baseline: trunk after `js_python_vocabulary_pairing` merges (see below). Scope:
`tolerance_stack/thermal.py` and its consumers; `apps/viewer/fixtures.js` and
`apps/viewer/views/stack.js` only as far as tolerating a null CTE requires. Do
**not** touch `tests/test_sop_vocabulary.py`'s new pairing test except to make it
pass honestly.

## Why `depends_on: js_python_vocabulary_pairing`

Because option 2 below would change the `values_status` vocabulary, and that
vocabulary is defined in Python and hand-copied into `VA.VALUES_STATUSES`
(`apps/viewer/viewer.js:352`) with nothing pairing the two. Land the pairing test
first and this handoff *cannot* change one side and forget the other — the suite
says so. **If you take option 1 (the recommendation), the dependency is a no-op**
and costs nothing but ordering; that asymmetry is the reason it is set rather
than argued each way. Check this reasoning rather than obeying it: if
`js_python_vocabulary_pairing` is blocked and you are taking option 1, the
dependency is safe to drop — say so in the lesson.

## The defect

`MaterialEntry` (`tolerance_stack/thermal.py:119`) declares
`cte_1e6_per_c: float` as a **required, non-Optional** field, and `from_dict`
(line 151) does `cte_1e6_per_c=float(d["cte_1e6_per_c"])` — a `KeyError` if it is
absent. But `__post_init__` (line 135) accepts
`values_status in ("inline", "library", "not_transcribed")`, and
`not_transcribed`'s whole meaning in the sibling `hardware_entry/v0` schema is
*no dimensional value has been transcribed for this part*: the four
`not_transcribed` entries in `docs/tolerance_stacks/hardware_entries.json`
(MS9363-09, MS9363-10, MS24665-153, MS24665-229) carry `values_source: null` and
**no numbers at all**.

So a material can be marked `not_transcribed` only while simultaneously stating a
CTE — a contradiction the schema forces on the author.

Repro:

```python
from tolerance_stack.thermal import MaterialEntry
MaterialEntry.from_dict({
    "schema": "joby.tolerance_stack/material_entry/v0",
    "id": "X", "designation": "x", "values_status": "not_transcribed",
    "values_source": None, "gaps": ["no citation"],
})   # KeyError: 'cte_1e6_per_c'
```

### Why it surfaced now

`values_source: null` is the only input that makes a projected material row's
`confidence` come out `no_source_ref` (`confidence_of_ref(None)` in
`scripts/build_viewer_projection.py`), and `__post_init__` rejects
`values_status: "inline"` with a null `values_source` (line 137). So the loudest
sourcing state a material can be in — *no citation at all for this number* — is
spellable **only** as `not_transcribed` plus a CTE value. The viewer fixture now
spells it that way (`DEMO_BEARING_STEEL`) because the alternative was to describe
a `materials.json` the loader would refuse to read.

**No live material is in this state**, so nothing is currently broken. This is
about the state being expressible honestly when one arrives — which is why it is
`low` and why you should not go looking for data to fix.

## Deliverables

1. **Take option 1 unless you can argue otherwise.** Make `cte_1e6_per_c`
   `Optional[float]` and require it when `values_status` is `inline` or
   `library`, mirroring how `values_source` is already conditioned at line 137.
   This keeps the `material_entry/v0` and `hardware_entry/v0` vocabularies
   aligned and is the smaller change.

   Option 2 — drop `not_transcribed` from the material vocabulary and add a
   distinct status for *the value is stated but cited to nothing* — is recorded
   in the issue and is a real alternative. It is larger, it desynchronises the
   two schemas' vocabularies, and it changes the JS table. If you take it, say
   why in the lesson and expect the pairing test from
   `js_python_vocabulary_pairing` to make you update `VA.VALUES_STATUSES`.

2. **Make the consumers tolerate `None`.** Named in the issue:
   - `thermal.py`'s soak factors — `thermal_factor(...)` is called on
     `materials[chain.*_material].cte_1e6_per_c` at lines 348-350 and 582-584.
     Decide what a stack computed against a material with no CTE *should* do.
     Triage's suggestion, not a requirement: **raise with a message naming the
     material**, rather than substituting 0.0 — a silently-zero CTE is a thermal
     result that looks computed and is not, which is this repo's worst defect
     class. Argue it either way in the lesson.
   - `scripts/build_viewer_projection.py`.
   - `apps/viewer/views/stack.js`'s `VA.fmt` — the viewer already prints `—` for
     a missing CTE, so this side may need nothing. Verify rather than assume.

3. **Keep the fixture honest.** `DEMO_BEARING_STEEL` in `apps/viewer/fixtures.js`
   currently spells the no-citation state as `not_transcribed` **plus** a CTE
   because that was the only legal spelling. Once it isn't, decide whether the
   fixture should drop the CTE (making it a genuine example of the state) or keep
   it (making it an example of a different state). The `viewer_fixture_shape_guards`
   review's point stands: a fixture pinning a shape the builder no longer emits is
   how a green suite ships a bug.

## Definition of done

- The repro above constructs successfully and `cte_1e6_per_c is None`.
- A `values_status: "inline"` entry with **no** `cte_1e6_per_c` still raises, with
  a message naming the material — the new optionality must not become a hole.
  Demonstrate both directions.
- Whatever you decide in deliverable 2 for `thermal_factor` is covered by a test
  that **fails without the change**.
- Full suite green; state which checkout produced the count.
- Lesson (`docs/sessions/lessons/LESSONS_20260812_material_cte_optional.md`):
  which option you took; what a stack does when asked to compute against a
  CTE-less material, and why that is the right answer; and whether the
  `js_python_vocabulary_pairing` dependency turned out to bind or was a no-op.
