---
type: chore
priority: med
status: open
area: viewer/vocabularies
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
---

# "The two loud gap confidences" is now stated in three places, none paired to another

`untraced` + `no_source_ref` — the pair that means *nothing readable stands
behind this number* — decides two things that must agree, and each side spells
the pair itself:

* `scripts/build_topology_projection.py:190`,
  `UNVERIFIED_CONFIDENCES = ("untraced", "no_source_ref")` — new 2026-09-15
  (`viewer_study_verdicts_and_gaps`); it selects which edges become
  `unverified_value` rows in a topology's `gaps` list.
* `apps/viewer/viewer.js:88`, `VA.needsAnnotation` —
  `confidence === "untraced" || confidence === "no_source_ref"`, two inline
  string literals in a function body; it decides which grid rows and which
  studies wear the `unverified` badge, and which edges offer the annotate link.
* `VA.confidenceClass`'s comment states the pair a third time, in prose.

The first two are *computed* and must describe the same set: if they drift, the
"what's missing" panel lists rows the grid does not badge, or the reverse, on
the one page whose job is to say what cannot be trusted. Nothing pairs them —
`tests/test_js_python_vocabulary.py`'s `PAIRINGS` and
`tests/test_topology_projection.py`'s `JS_PAIRINGS` both need a
`VA.<NAME> = {` / `= [` **table** to anchor on, and `needsAnnotation` is a
function, which is why this pair has never been pairable.

`no_source_ref` has **zero live instances** (`tests/test_js_python_vocabulary.py`
records this), so drift in that half would not show up in live data either.

**Fix shape:** promote the JS side to a table — e.g.
`VA.UNVERIFIED_CONFIDENCES = ["untraced", "no_source_ref"]` with
`needsAnnotation` reading it — and add a `js_array_strings` row pairing it
against `build_topology_projection.UNVERIFIED_CONFIDENCES`. That is the same
shape that closed `CONFIDENCES` and `VERDICT_SCOPES`, and it retires the prose
copy in `confidenceClass`'s comment at the same time.
