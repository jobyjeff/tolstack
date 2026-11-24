---
type: bug
priority: med
status: deferred
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_annotate_hint_bar_and_context_autofilter.md
class: rerender_discards_uncommitted_input
defer_until: 2026-11-29
resolution: woke 2026-10-15 -- date trigger passed; re-triage; re-deferred 2026-10-15 (triage) -- med beyond BUDGET=3; still live (cmdHelp still calls renderDetail) -- woke 2026-10-29 -- date trigger passed; re-triage -- triage 2026-10-29: med beyond the budget (3 staged), deferred again 14 days to 2026-11-12 | woke 2026-11-15 -- date trigger passed; re-triage | re-deferred 2026-11-15 (triage) -- med beyond budget (tolstack's 3 went to two highs and the fits.json rail)
---

# The annotator's Help button discards a half-filled bind form

`cmdHelp` (`apps/annotate/app.js`) toggles `state.helpOpen` and then calls
`renderDetail()`, which does `el.detail.innerHTML = ""` and rebuilds the whole
bar — including `buildBindForm`'s six controls (direction, composition note,
owner part, GD&T modifier, general tolerance regime, note). Everything the
reader has typed into them is gone.

This is new with `annotate_hint_bar_and_context_autofilter`: before it, the
Help disclosure did not exist and nothing adjacent to the form re-rendered it.
Now the button sits on the same line as the form it destroys, and it is exactly
the button a reader reaches for *while* filling the form in — "what does
composition note mean?" costs them the other five fields.

## Repro (measured 2026-09-21, review worktree, headless Chrome)

```
?mock=1&topology=demo_system&edge=demo_edge_untraced
exec select-face <demoSha> 0        # the bind form appears
fill #bind-note-input "front face of the bushing"
click #detail .an__disclose         # the Help button
read #bind-note-input               # -> ""
```

## The shape of the fix

`help` does not need `renderDetail()`. The panel it opens is written by
`renderHintPanel()`, and the only other thing the toggle changes on the bar is
the disclosure button's own `aria-expanded`. Setting that attribute and calling
`renderHintPanel()` leaves the form's DOM (and its values) untouched.

Worth a browser-tier sub-check in the `annotate top bar + entry context`
suite — type into one field, open Help, assert the value survives — because
this class (UI state living on a node the renderer re-creates) is structurally
invisible to `apps/annotate/run_tests.cjs`, which has no DOM. The same review
noted that the sibling toggles are already safe: `transparency` calls only
`renderHintPanel()`, and the auto-filter switches call only `renderAutoSetup()`
plus the rail renderers.

## Addendum 2026-11-24 (review of editing_a_feature_opens_its_form_where_the_tree_was)

The bind form this issue is about is gone: `buildBindForm` was deleted on 2026-11-23, and the feature's form that replaced it keeps its set in the pane and re-renders from it. So there is no half-filled field left to lose. The five optional fields it had now have no writer (`ISSUE_20261124_no_surface_writes_a_bindings_note_modifier_or_owner_part_since_the_bind_bar_retired.md`). The owner-not-in-set form under the scene is still there, so check whether it has the same rerender before closing this.
