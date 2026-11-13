---
type: bug
priority: med
status: open
area: annotate/browser-check
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261113_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md
class: stale_check_expectation
---

# The annotate browser check's Display-panel list predates the Bound faces setting

`node apps/annotate/run_browser_check.mjs` (the mock pass) is red on
`integration` at

> the Display panel offers exactly the layers the verb parses, plus the
> see-through setting and nothing else

The panel now offers `["Joints and links","3D parts","Paths","Where it
started","The model","See-through parts","Bound faces"]`: the **Bound faces**
box was added by `a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown`
(2026-11-12, `cmdBoundFaces` in `apps/annotate/app.js`) and the check's
expected list was not. Measured 2026-11-13 on a `git archive integration`
export with the main checkout's `node_modules` junctioned: 94/99, this one
among the five reds, identical on the merge of
`hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque`
(so not that handoff's).

The other four reds of that run are already filed:
`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`
(the two mock anchor checks) and
`ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model.md`
(the two `[real]` checks that expect v1). This is the one with no owner.

Fix shape: the check should read the panel's expected list from the one
place the settings are declared (the verb's parse table plus the settings
the panel adds), rather than restating it, so the next setting cannot
redden it. Failing that, add `Bound faces` to the literal. This check is not
on any gated tier (the mock pass is run by hand, "for a scene/placement
change", per the review overlay), which is why a red here has no landing
to stop.
