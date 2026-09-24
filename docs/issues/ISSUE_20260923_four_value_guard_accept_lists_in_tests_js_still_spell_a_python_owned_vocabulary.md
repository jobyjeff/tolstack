---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260923_js_vocabulary_generated_from_python.md
---

# Four `inList([...])` rows in `apps/viewer/tests.js`'s value guards still spell a Python-owned vocabulary by hand

`js_vocabulary_generated_from_python` (2026-09-23) removed twenty-six hand
copies of Python-owned vocabularies from the two apps: they are generated into
`apps/viewer/vocab.gen.js` now, and the app's tables are keyed by the generated
words. Its inventory pass turned up four that the generation did **not** reach,
because they are not in the app at all — they are accept-lists inside the
`VALUE_GUARDS` / `TOPO_VALUE_GUARDS` tables in `apps/viewer/tests.js`, written
as `known: inList([...])`.

Most rows in those tables read a `VA` table directly (`known: function (v) {
return !!VA.CROP_RULES[v]; }`), which is the strong form and is now backed by
the generated vocabulary all the way to Python. These four are the exceptions.

| the row's `field` | the list as written | who owns the words |
|---|---|---|
| `source_ref.kind and elements[].kind` | `["drawing", "parts_list", "spec", "workbook", "assumed"]` | `tolerance_stack/stack.py`: **`SOURCE_REF_KINDS`**, which has **seven** — `pipeline_element` and `requirement` are missing here |
| `stacks[].checks_source` | `["generated", "authored"]` | `scripts/build_viewer_projection.py`, two literals in one expression; there is no constant to read |
| `crop entry status` | `["resolved", "unresolvable", "not-built", "no-entry"]` | mixed: `resolved`/`unresolvable` are `build_viewer_crops.py`'s, the other two are the viewer's own words for a crop that is absent |
| `topologies[].gaps[].kind` (stack-side) | `["excluded_from_model", "hardware_entry"]` | a deliberate **subset** of `build_topology_projection.py`'s `TOPOLOGY_GAP_KINDS` — `build_viewer_projection.stack_gaps` can only mint these two, and the comment beside the row says so |

## Why it is `low`

None of the four is a rendered vocabulary: they are the accept-lists of a
live-data sweep, so a drift costs a confusing test failure rather than a wrong
page. The first row is the only one where the two sides genuinely disagree
today, and the disagreement is currently harmless — no live citation is a
`pipeline_element` or a `requirement`, so the narrower list has never rejected
anything. The day one arrives, the guard reports "the live projection carries a
value the viewer has no branch for" about a value the viewer handles fine.

## What a fix looks like, and the one that would be wrong

The wrong fix is to widen the list by hand to seven words: that is the same
defect with a longer literal.

* `source_ref.kind` — the honest fix is the one the app's tables got: put
  `SOURCE_REF_KINDS` in `scripts/js_vocabulary.py`'s registry and read it as
  `VOCAB.list("SOURCE_REF_KINDS")` in the guard row. It was left out of the
  2026-09-23 pass only because nothing in the *app* branches on it, and the
  registry was scoped to what the apps render.
* `checks_source` — needs a Python constant before it can be generated
  (`build_viewer_projection.py` spells both words inline in
  `"generated" if generated else "authored"`). That is a one-line change on the
  Python side, and it is what CLAUDE.md's "a field vocabulary is a module-level
  constant" asks for anyway.
* `crop entry status` and `gaps[].kind` are **not** straightforward generation
  targets, and the reason is worth keeping: one is a union of a builder's words
  with the viewer's own, the other is a stated subset. Both want a *named*
  constant on the JS side plus a comment, not a generated list.
