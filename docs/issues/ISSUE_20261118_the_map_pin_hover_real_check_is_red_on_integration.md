---
type: bug
priority: med
status: open
area: tests/browser-truth
class: browser_red_on_trunk
reporter: agent
found_by: docs/sessions/HANDOFF_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md
---

# The map suite's pin-hover `[real]` check is red on integration

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the map (the counts"`
is 29/30 at `69c6f779`, the failing sub-check `[real] a pin hovered on the map lights its feature's row in the tree (or the closed fold holding it), the dimensions at it in the grid, the pin itself and its connector on the map, and its bound face in the scene`.

Deterministic: the whole tier, alone, and the unmodified baseline script
(`git show HEAD:scripts/run_viewer_browser_tests.mjs`) all give the same one
red, so it is neither this handoff's change nor timing. The whole tier at this
tree was 43/45, the other red being `annotate rail suggestion`
(`ISSUE_20261108_the_rail_suggestion_real_check_finds_15_suggested_rows_for_34_open_proposal_edges_on_trunk.md`).
The cause is not found; the sibling checks of the same suite (the one selection
on four surfaces) pass, which points at the "bound face in the scene" clause
reading the main checkout's served log.
