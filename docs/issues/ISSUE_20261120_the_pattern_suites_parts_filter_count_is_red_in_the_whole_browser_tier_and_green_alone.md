---
type: bug
priority: med
status: open
area: tests/browser annotate
reporter: agent
class: whole_tier_flake
found_by: docs/sessions/HANDOFF_20261119_the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies.md
---

# The pattern suite's Parts-filter count is red in the whole browser tier and green alone

Suite `a pattern is bound as its like faces and a face can be added (the offer, Take all,
the fit, Add a face, Shift-click, the filter)`, in `scripts/run_viewer_browser_tests.mjs`.
Failing sub-check: **"[real] the Parts filter's count is the number of the model's
features not bound"**.

Measured 2026-11-20 by the round-2 review of
`the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies`,
on merge `98168d83`, against a scratch root built from that tree (every projection
paired):

- Whole tier (`node scripts/run_viewer_browser_tests.mjs --repo <root>`): 10/11, red on
  that sub-check, and the only red in 49 suites (2374 s).
- Right after, on the same tree and root, `--only "a pattern is bound as its like faces"`:
  **11/11**, with the log printing `filter count 46; feature rows not bound under Parts 46`.

The diff under review touched only `apps/viewer/map.css` and the Groups suite on the
viewer side, so this does not follow that diff. Probably something left over from an
earlier suite in the whole run: the count compares the filter with the feature rows
it can see, and the earlier suites bind and unbind on the same page model. That is a
guess, not something I measured.

Next step: run the whole tier twice against `git archive integration` on the same
scratch data. If it goes red there too, it is a test-isolation defect in the
suite's own setup (the count should be read after the page's bind state has
settled, or against a fresh page).
