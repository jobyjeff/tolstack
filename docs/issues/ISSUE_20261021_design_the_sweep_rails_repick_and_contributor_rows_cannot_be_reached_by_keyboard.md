---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_sweep_rail_shows_the_mechanism.md
defer_until: 2026-11-20
class: pointer_only_control
resolution: triage 2026-10-21: low, deferred to 2026-11-20 by default
---

# Design: the sweep rail's Re-pick and contributor rows cannot be reached by keyboard

Two controls in the sweep rail (`apps/annotate/app.js` `featureRow` /
`contributorsGroup`, `apps/annotate/style.css`'s sweep-rail block) work only
with a pointer:

- **Re-pick** is `visibility: hidden` until its row is `:hover` or
  `:focus-within`. A hidden element cannot take focus, and the row itself
  (`<li class="tree-row">`) is not focusable. So `:focus-within` can never
  match, and a keyboard reader can never reach the one way from the rail to a
  binding. The rule is "subdued until hover/focus", not "absent": the usual
  shape is a muted colour or `opacity`, which keeps the button in the tab
  order.
- **A contributor row** is selected by `li.onclick`, with no `tabindex`, no
  `role="button"` and no key handler. Selecting a contributor (the face tint)
  has no keyboard path.

Joints and bodies are `<details>`/`<summary>` and are keyboard-reachable
already. Non-blocking, filed per the review checklist's design rule.

## Addendum 2026-10-26 — the viewer's copy of the rail is keyboard-reachable

`the_shell_seats_the_scene_beside_the_model` draws the sweep rail's rows in
the viewer's nav when the annotator is embedded: a disclosure is a
`<summary>`, a row with a click (a contributor) is a `tabindex="0"`
`role="button"` row answering Enter and Space, and Pick / Re-pick / Isolate
are native buttons, so the whole tree is reachable by Tab there (pinned by
`[real] a contributor row is reached by the keyboard, and Enter selects it`).
The **standalone** annotator's rail is unchanged and still has the defect this
issue describes, so it stays open for that copy.
