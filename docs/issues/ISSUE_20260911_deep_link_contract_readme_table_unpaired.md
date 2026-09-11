---
type: chore
priority: med
status: open
area: apps/viewer
reporter: agent
---

# The README deep-link contract table is a hand-copy of `VA.DEEP_LINK_PARAMS` with nothing pairing them

`apps/viewer/README.md`'s "Deep links in — the URL contract" section restates
the six params of `VA.DEEP_LINK_PARAMS` (`apps/viewer/viewer.js`) as a table —
and that section is the one document a sibling repo consumes without reading
the code (drawing-checker's `analyses_viewer_deep_link` is told to read the
contract from exactly there). Nothing pairs the two: `apps/viewer/tests.js`
pins the constant to a literal six (so a rename/addition fails the fast tier
and forces a deliberate edit of that test), but nothing forces the README's
table to move with it. A seventh param added to the constant and its tests
ships with a contract document that does not name it — the cross-repo consumer
reads a stale contract wearing a green suite.

Why this was not closed inline in review: the repo's existing
states-named-in-README guard (`_ENUMERATED_STATE_VOCABULARIES`,
`tests/test_tolerance_stack.py`) matches a state name anywhere in the surface
README — vacuous here, because `stack`, `edge`, `node`, `element` and
`topology` appear all over that README in unrelated prose. A real pairing has
to scope to the contract section and match the table's own claim shape
(`` `<param>=<id>` `` rows), which is a new scan whose false-positive/vacuity
surface deserves its own design and can-fail replay (this repo's doc-scan
entries in `docs/prompts/REVIEW_AGENT.md` document exactly how these go
wrong).

Fix shape: extract the array from `viewer.js` with the existing
`js_array_strings` helper (`tests/test_js_python_vocabulary.py`), scope the
README text to the "Deep links in" section (heading to next `## `), require
every param to appear as `` `<param>=<id>` `` in that section (and, the other
direction, that the section's table names no param the constant lacks), plus
a replay that cuts one table row and watches it fail.
