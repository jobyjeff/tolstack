---
type: bug
priority: low
status: resolved
area: tolerance_stack/thermal.py — MaterialEntry
reporter: agent
handoff: docs/sessions/HANDOFF_20260812_material_cte_optional.md
---

# A `not_transcribed` material entry is still forced to carry a `cte_1e6_per_c`, so it cannot honestly say the number was not transcribed

> **RESOLVED 2026-08-17** by handoff `material_cte_optional`, taking **option 1**:
> `MaterialEntry.cte_1e6_per_c` is `Optional[float]`, required unless
> `values_status` is `not_transcribed`. The condition is spelled as
> `!= "not_transcribed"` rather than `in ("inline", "library")` because
> `tests/test_js_python_vocabulary.py` reads the vocabulary off the one membership
> test in `__post_init__` and refuses a second one — the `depends_on` in the
> handoff bound, though not where it was expected to.
>
> Both soak-factor sites now go through `thermal.material_soak_factor()`, which
> **raises naming the material** instead of substituting `0.0`, so a chain against
> a CTE-less material fails at stack-load time. Consequence worth knowing: no
> projection can carry a CTE-less material row, so `views/stack.js` needed nothing
> (`VA.fmt` already prints `—`) and `DEMO_BEARING_STEEL` keeps its placeholder CTE.
> Four tests in `tests/test_hub_bearing_thermal_fit.py`, each shown red against the
> unchanged module.

Found by handoff `viewer_fixture_shape_guards` (2026-08-12) while making
`apps/viewer/fixtures.js`'s no-citation material row legal against the model.

`MaterialEntry` (`tolerance_stack/thermal.py`) declares `cte_1e6_per_c: float` as
a **required, non-Optional** field, and `from_dict` does
`cte_1e6_per_c=float(d["cte_1e6_per_c"])` — a KeyError if it is absent. But
`__post_init__` allows `values_status` to be `not_transcribed`, whose whole
meaning in the sibling `hardware_entry/v0` schema is *no dimensional value has
been transcribed for this part*: the four `not_transcribed` entries in
`docs/tolerance_stacks/hardware_entries.json` (MS9363-09, MS9363-10,
MS24665-153, MS24665-229) carry `values_source: null` and **no numbers at all**.

So a material can be marked `not_transcribed` only while simultaneously stating
a CTE, which is a contradiction the schema forces on the author.

## Why it surfaced now

`values_source: null` is the only input that makes the projected material row's
`confidence` come out `no_source_ref` (`confidence_of_ref(None)` in
`scripts/build_viewer_projection.py`), and `__post_init__` rejects
`values_status: "inline"` with a null `values_source`. So the loudest sourcing
state a material can be in — *no citation at all for this number* — is
spellable **only** as `values_status: "not_transcribed"` plus a CTE value. The
viewer fixture now spells it that way (`DEMO_BEARING_STEEL`) because the
alternative was to keep describing a `materials.json` the loader would refuse to
read. No live material is in this state, so nothing is currently broken; this is
about the state being expressible honestly when one arrives.

## Repro

```python
from tolerance_stack.thermal import MaterialEntry
MaterialEntry.from_dict({
    "schema": "joby.tolerance_stack/material_entry/v0",
    "id": "X", "designation": "x", "values_status": "not_transcribed",
    "values_source": None, "gaps": ["no citation"],
})   # KeyError: 'cte_1e6_per_c'
```

## Options

1. Make `cte_1e6_per_c` `Optional[float]` and require it when `values_status` is
   `inline` or `library`, mirroring how `values_source` is already conditioned.
   Consumers that read the CTE (`thermal.py`'s soak factors,
   `build_viewer_projection.py`, `views/stack.js`'s `VA.fmt`) would need to
   tolerate `None` — the viewer already prints `—` for it.
2. Drop `not_transcribed` from the material vocabulary and add a distinct status
   for *the value is stated but cited to nothing*, so the two facts stop sharing
   one word with `hardware_entry/v0`.

Option 1 keeps the two schemas' vocabularies aligned and is the smaller change.
