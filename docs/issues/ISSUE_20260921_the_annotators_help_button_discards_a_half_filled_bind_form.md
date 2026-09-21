---
type: bug
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_annotate_hint_bar_and_context_autofilter.md
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
