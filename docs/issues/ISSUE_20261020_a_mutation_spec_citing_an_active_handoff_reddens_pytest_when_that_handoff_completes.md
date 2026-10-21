---
type: bug
priority: med
status: open
area: mutation-witnesses
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_sweep_rail_shows_the_mechanism.md
---

# A mutation spec citing an `active/` handoff reddens pytest the moment that handoff completes

`tests/test_mutation_witnesses.py::test_the_issue_each_mutation_cites_is_in_the_tree`
was red on `integration` at `9a29acd`: 23 mutations in 18 specs cited
`docs/sessions/active/HANDOFF_20261020_the_3d_pane_opens_in_the_mode_the_study_wants.md`
as their `issue`, and the board move `active -> completed` (`0f12b15`) moved the
file out from under them. Nothing in the handoff's own review could see it: the
path was right on every branch the review ran on.

Fixed for those 18 on `handoff/the_sweep_rail_shows_the_mechanism` (one
commit, path rewritten to `completed/`). **The class is still open**: any spec a
tactical session writes with its own `active/` handoff as the `issue` reddens
pytest for everybody when dispatch completes that handoff.

Options, for whoever takes it:

1. The board move (dispatch's Complete) rewrites `docs/sessions/active/<file>`
   to `completed/<file>` in `scripts/mutation_witnesses/*.json` in the same
   commit — dispatch-side, generic over any tracked reference.
2. The test resolves a cited handoff across the three board directories
   (staged, `active/`, `completed/`) by file name, since a handoff's directory
   is its status, not its identity.
3. The README's spec shape says to cite the session's lesson (stable) or an
   issue, never an `active/` handoff. (This handoff's specs cite its lesson.)

Option 2 is the smallest and keeps the citation meaningful; option 1 fixes every
other tracked reference to an `active/` path too.
