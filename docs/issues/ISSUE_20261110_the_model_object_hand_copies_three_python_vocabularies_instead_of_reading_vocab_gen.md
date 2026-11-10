---
type: chore
priority: med
status: open
area: viewer/model
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
---

# The model object hand-copies three Python vocabularies instead of reading `vocab.gen.js`

Found in review of `the_model_is_derived_once_and_the_left_column_is_its_tree`
(2026-11-10). The repo rule (`CLAUDE.md`, "The JavaScript half of that class is
not paired, it is generated"): every vocabulary Python owns that the web apps
read is a registry row in `scripts/js_vocabulary.py`, written into
`apps/viewer/vocab.gen.js`, and the JS reads it through `VOCAB.list` /
`VOCAB.table`. The new `apps/viewer/model.js` and `views/nav.js` restate three
of them as literals instead:

| literal in JS | the Python owner | already generated? |
| --- | --- | --- |
| `VA.EDGE_ENDS = { from: "from", to: "to" }` (`model.js`) | `tolerance_stack/feature_identity.py: DIRECTIONS` | yes, `VOCAB.list("DIRECTIONS")` |
| `key.kind !== "topology_edge"` (`model.js`, `bindingRecord`) | `feature_identity.py: STACK_KEY_KINDS` | yes, `VOCAB.list("STACK_KEY_KINDS")` |
| `interfaceRow.source === "node"` (`nav.js`, `interfaceItem`) and the `source: "node" | "edge"` the tests write | `tolerance_stack/model_view.py: INTERFACE_SOURCES` (new in the same handoff) | **no registry row** |

`CONTACT_KIND = "contact"` (`model_view.py`) is in the same position as
`INTERFACE_SOURCES`: a new Python word the viewer renders (the interface row's
kind chip) with no registry row.

`tests/test_js_python_vocabulary.py`'s inline-literal scan did not fire on any
of these, so the guard is quiet in exactly the shape it exists for -- worth a
look at what shapes it matches while this is fixed.

## What to do

Add registry rows for `INTERFACE_SOURCES` and `CONTACT_KIND` (`model_view`
module, `viewer` namespace), regenerate, and have `model.js` / `nav.js` read
`VOCAB.list("DIRECTIONS")`, `VOCAB.list("STACK_KEY_KINDS")` and the two new
lists rather than spelling the words. `VA.EDGE_ENDS` can stay as the viewer's
named handle if it is *built from* the generated list, not beside it.
