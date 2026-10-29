---
type: bug
priority: med
status: deferred
area: apps/annotate (model layer anchors, browser check)
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md
class: decayed_witness
defer_until: 2026-11-12
resolution: triage 2026-10-29: med beyond the budget (3 staged), deferred 14 days
---

# Two mock-scene anchor checks in `apps/annotate/run_browser_check.mjs` are red on integration

`node apps/annotate/run_browser_check.mjs` fails two checks on integration at
`182be115`. I ran it on a `git archive` of that commit, in a scratch directory,
so this handoff's diff was not involved. Both fail on this handoff's branch
too, unchanged:

- `the mock's bound face moves its node onto the face's fitted point; the rest say they have no anchor geometry`
- `the anchors message is computed for a drawn frame, in the shape the shell reads`

The detail it prints: `"edges":{}` in the anchors message. The node sources
are `{"a":"joint","b":"origin","c":"bound","d":"origin"}`, and the message's
`nodes` has `b` and `d` as `null`. So the check expects edges to be listed,
and/or `b`/`d` to carry something, and they do not. Result on the base:
`77/79 passed`.

Not investigated further; the code paths are the model layer's
(`apps/annotate/model_layer.js`, `postModelAnchors` in `app.js`), which this
handoff did not touch. Search for the check names: no issue on HEAD,
integration or master named them on 2026-10-28.
