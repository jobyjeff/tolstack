---
type: bug
priority: med
status: open
area: tests/mutation-witness
reporter: agent
class: decayed_witness
found_by: docs/sessions/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
---

# The "nav stays beside the open pane" witness no longer reddens its own check, on trunk too

`scripts/mutation_witnesses/browser__real-the-nav-stays-beside-the-open-pane-it-is-what-drive__25decf2b.json`
hides `#navtree` while the pane is open. Its declared check is `[real] the nav
stays beside the open pane -- it is what drives it` in "3D pane follows the
selection (sweep, bind, reload, hover)".

- `--changed-since master` on handoff/the_demo_path_reads_cleanly_on_a_projector
  (2026-11-09): NOT WITNESSED. Seventeen other checks in the suite went red, but
  not the declared one.
- `--only "[real] the nav stays beside the open pane -- it is what drives it"` in
  the main checkout on trunk `3d04f5cd`: NOT WITNESSED as well, so the decay
  predates that handoff.

The check is `page.locator("#navtree").isVisible()`. With the nav hidden, the
nav-driven steps before it fail first. The likeliest reading is that the push
is never reached, or is reached on a page where the nav came back. The same spec
was in the 2026-10-26 decayed list
(`ISSUE_20261026_a_full_witness_run_on_integration_left_36_mutations_unwitnessed.md`,
"the witness cannot see the difference"), which was resolved; it has decayed
again since.

Fix shape: measure the nav's visibility right after the pane opens, before any
step that drives the pane through the nav, or retire the spec and say why.
