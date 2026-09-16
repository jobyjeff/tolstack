---
type: bug
priority: med
status: triaged
area: apps/viewer/tests
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260915_viewer_reference_crops_in_context.md
handoff: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
---

# `highlights[]` joined no `VALUE_GUARDS` table, and a malformed box is dropped in silence

`crops.json` gained `highlights[]` on 2026-09-15, and every rendered claim about
*where on a crop to look* now rides on it. It is in no live-data guard:
`apps/viewer/tests.js`'s `VALUE_GUARDS` has rows for `crop entry resolved_by`,
`located_by` and `status`, and none for `highlights[].kind` or for the array's
presence. Every assertion about highlights in the suite is fixture-tier, against
entries the test itself builds (`datasheetEntry()`, `balloonEntry()`); nothing
reads a live crop's boxes. Grep confirms: no occurrence of `crophl`,
`companion`, `highlights` or `drawing_no` below the `[real]` tier's opening at
`tests.js:7036`.

The silent arm is the one this repo has been bitten by twice already
(`VA.VERDICT_SCOPES`' missing loud fallback, `partMeshFact`'s absent `mesh`
block):

```js
VA.cropHighlights = function (carrier) {
  var boxes = carrier && carrier.highlights;
  if (!boxes || !boxes.length) return [];
  return boxes.filter(function (box) {
    return box && box.frac && box.frac.length === 4;
  });
};
```

A builder that stopped writing `frac` — or wrote three numbers, or dropped
`highlights` from the entry — makes **every overlay on every surface vanish**,
and the page then reads exactly like an honest *"nothing on this sheet was
marked"*. That reading is correct for a whole-sheet crop and a lie for a
datasheet crop, and no tier can tell them apart.

The vocabulary itself is well covered from the other side:
`tests/test_js_python_vocabulary.py`'s `CROP_HIGHLIGHT_KINDS` row pairs
`VA.CROP_HIGHLIGHT_KINDS` against the importable `HIGHLIGHT_KINDS`, and
`highlight()` refuses a kind outside it, so a *new word* cannot reach
`crops.json` unannounced (verified in review: renaming the JS key reddens that
row). This issue is about the other direction — the field going **absent or
malformed** in live data.

## Suggested fix

A `VALUE_GUARDS` row in the strong (`known: function`) form, whose `values()`
collector walks `resolvedCrops(c)`'s `highlights[].kind` **and** the
`companion.highlights[]` — so the shared
`[real] each value guard bites … on finding no value at all` arm fires the day
the collector comes back empty. Plus one `[real]` assertion that at least one
live crop renders a box, so the whole overlay disappearing is red rather than
quiet.
