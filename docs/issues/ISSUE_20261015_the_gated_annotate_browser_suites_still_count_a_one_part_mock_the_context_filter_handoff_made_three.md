---
type: bug
priority: high
status: triaged
area: scripts/run_viewer_browser_tests.mjs (annotate suites)
reporter: agent
found_by: dispatch/docs/sessions/lessons/LESSONS_20261015_triage_sweep.md
class: gated_tier_not_run_by_the_handoff_that_changed_its_subject
handoff: docs/sessions/HANDOFF_20261015_annotate_gated_browser_suites_follow_the_three_part_mock.md
---

# The gated annotate browser suites still count a one-part mock; `a_context_filter_and_a_view_filter` made it three

## What is red

Measured 2026-10-15 by the triage sweep, in the main checkout on `master` @
`c51cf49faf7b` (the batch merge of 14 integration commits), right after
`scripts/rebuild_projections.ps1` (all three stamps `branch=master
sha12=c51cf49faf7b dirty=False behind_trunk=0`):

```
node scripts/run_viewer_browser_tests.mjs
  -> 23/25 browser checks passed, exit 1
node scripts/run_viewer_browser_tests.mjs --only "annotate"
  [annotate rail filter + face deselect] 29/32 sub-checks passed: FAIL
    FAIL sub-check: unfiltered, the rail lists the whole study and every installed mesh
    FAIL sub-check: ...and the parts panel to the parts that element names -- the panel that was scoped by nothing at all before
    FAIL sub-check: an element whose part has no installed mesh filters the parts panel to nothing AND says why
  [annotate top bar + entry context (auto-filter, see-through)] 26/30 sub-checks passed: FAIL
    FAIL sub-check: ...and shows that element's part alone, in the scene and in the list
    FAIL sub-check: ...and it is the ARRIVAL that shows it, not the face suggestions — with those off the part is in the scene all the same
    FAIL sub-check: ...and ticking it back re-applies the arrival it came from
    FAIL sub-check: a study-scope entry shows only that study's parts, see-through, with its bound faces marked
```

`node apps/viewer/run_tests.cjs` was green (522/522) on the same tree, and the
pytest suite on the batch-merge candidate was `1446 passed, 1 skipped`.

## Cause (read from the diff, not yet re-run past a fix)

Commit `c2e1d79` ("annotate: parts panel separates context from view; Isolate is
a toggle", handoff `a_context_filter_and_a_view_filter`) added two installed
mock meshes to `apps/annotate/fixtures.js` (`demo_bracket`, `demo_plate`, "so the
parts panel has a model of three to filter") and split the parts panel into
"in this model" / "Other parts", with a `part-row part-row--head` header row
(`apps/annotate/app.js` ~2546). The browser tier's annotate suites
(`testAnnotateRail`, ~line 5185, and the top-bar/entry-context suite, ~5961)
still pin the old picture by counting `#parts-panel li.part-row`: e.g.
`allRows === 3 && allParts === 1` ("one installed mesh") and `parts().count()
=== 0` for an element whose part has no mesh.

That handoff's review ran `apps/annotate/run_browser_check.mjs` (50/50) and says
in so many words that the main-checkout viewer browser tier was **not
exercised** (`REVIEW_20261014_a_context_filter_and_a_view_filter.md`, line 36),
so the red first surfaced at the batch merge. It is on trunk now.

## Not to be fixed by weakening

The sub-checks' *claims* still hold under the new panel (unfiltered shows every
installed mesh; an element filter scopes the panel to its part; a meshless
part's filter says why; an arrival isolates the element's part). The fix is to
re-express each count against the new context/view semantics (e.g. count only
non-header rows, and the "in this model" section where the claim is about the
filter), not to drop or loosen them.

## Knock-on in the mutation-witness tier (same tree, same day)

`node scripts/run_mutation_witness_tests.mjs` (main checkout, ~41 min):
**159/166 declared mutations witnessed**, exit 1. All seven misses are
`browser__` specs reported "the tier was red before the mutation, so nothing
was proved", i.e. this red, not seven decayed guards:
`…an-element-whose-part-has-no-installed-mesh-filters-the__148e0e1f`,
`…and-it-is-the-arrival-that-shows-it-not-the-face-suggest__c393748f`,
`…and-no-state-has-quietly-fallen-back-to-the-unstyled-bor__2c2e291c`,
`…and-the-3d-canvas-runs-to-the-right-edge-of-the-window-t__783e318d`,
`…deselect-puts-the-mesh-back-to-its-own-colours-the-tint__ecfb1a63`,
`…unticking-parts-returns-the-lists-to-manual-at-once__2ae46522`,
`…unticking-see-through-parts-makes-the-body-solid-now__a358ea17`.
Re-greening the two suites should bring these back; any that stays unwitnessed
after that is a real decay.
