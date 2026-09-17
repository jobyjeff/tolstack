---
type: chore
priority: low
status: open
area: viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_crop_lightbox_zoom_viewer.md
---

# Two comments say a backdrop click closes a `<dialog>`. It does not.

`apps/viewer/topology_app.js`, in the legend/worksheet wiring:

> `state.showWorksheet` still tracks open/closed for the button's own label,
> kept in step by the dialog's native `close` event so **an Esc or a backdrop
> click (either closes a `<dialog>`)** does not leave it stale.

Measured 2026-09-16 on the installed Chrome (152.0.7977.83), a bare
`<dialog>` opened with `showModal()` and clicked at (2, 2):

```
open after a backdrop click at (2,2): true
open after Escape: false
```

A modal `<dialog>` does **not** close on a click outside it. The only opt-in
that changes this is the `closedby="any"` attribute, which is newer than the
browsers this page is written for.

## Why it is `low` and not a bug

Nothing is broken. The *mechanism* the comment describes is right — routing the
label through the dialog's own `close` event is exactly what makes the state
robust against a dismissal the wiring did not perform — and both dialogs carry
a visible **Close** button, so a pointer-only reader always has a way out. What
is wrong is only the parenthetical, and the cost of a wrong parenthetical in
this repo is the next author believing it: `crop_lightbox_zoom_viewer` wrote
the same claim into three places on the strength of that comment before
measuring it, and had to take it back out.

## The fix

Correct the parenthetical in `topology_app.js` (and check `topology.html`'s
legend/worksheet comments for the same wording while in there). The crop
lightbox's own comments, `topology.html`'s lightbox block and
`apps/viewer/README.md` already say the measured thing and name the Chrome
version.
