---
type: chore
priority: low
status: open
area: annotate/rail
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md
---

# The pane's hidden rail still carries binding controls no surface shows

Since 2026-11-23 the shell draws none of the annotator's rail rows: a
feature's faces are its form's (`VA.renderFeatureForm`). The pane's rail is
still laid out (embedded, invisible) and still has its own writing controls,
reachable only from the console or a harness:

| what | where | verb |
|---|---|---|
| a candidate row's **Take** / the surest proposal's **Accept** | `app.js` `candidateRow`, `pressWrite` | `take`, `accept` |
| a joint end's **Pick a face…** / **Pick a different face** | `app.js` `endPickAction` and the candidate list's last row | `arm` (now opens an edit; nothing ticks it but `edit ok`) |
| bind mode's **owner not in set** form under the scene (visible; the bindings block beside it was made read-only on 2026-11-23, and its now-dead `state.correcting` / `bindContext` target plumbing is still there) | `app.js` `buildOwnerNotInSetForm`, `correctionTarget` | `owner_not_in_set` |
| the rail-gesture channel | `VA.SCENE_ACTS` (nav.js, no sender left), `AA.RAIL_ACTS` + `railGesture` (app.js), `tests/test_rail_act_vocabulary_is_paired.py` | `annotate:rail` |
| the verbs `keep`, `drop-face`, `flip`, `take`, `accept` | `app.js` | console only |

Each is a second way to write a binding beside the form's tick, which is the
"one click does one of five things" problem the form exists to end. The
browser suites `annotate rail suggestion`, `annotate sweep rail` and `annotate
armed pick` still drive the pane's own rail.

Retire them with their suites: the rail keeps what it shows for selection and
hover (`followScenePick`, `VA.sceneInspectStep` read its `selected` rows) and
loses every write. Check `bound-faces` and the owner-not-in-set path first:
the latter has no other home.
