---
type: bug
priority: med
status: open
area: viewer/menus
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
---

# Unbind from a row's menu fails without a word

A feature row's right-click **Unbind** (`apps/viewer/topology_app.js`,
`runMenuItem`, the `A.unbind` branch) sends
`postToPane(["unbind", edgeId, end, topologyId])`. That is a plain post with
no id. The form's own Unbind sends the same command through `formPress`,
which carries an id and waits for the pane's answer
(`onFormWriteResult`). A write the pane refuses or fails ("busy" behind
another write, a server error, a log that would not take the event) is shown
there as the form's "not written" state.

The menu's post has no id, so nothing on this page ever hears that answer.
If the retraction is not written, the row stays bound and nothing says why.
That is a failure path that returns nothing, from the one menu item besides
**Bind the suggested faces** that writes. The handoff asked that every item
do what the form does, and the form does surface the failure.

Seen by reading the code in the review of 2026-11-24. The browser suite
checks the success path only ("Unbind from the row writes the form's Unbind:
one retraction").

**Fix shape:** send the menu's Unbind with an id, as `formPress` does, and
surface a refusal where the reader is: the row, or a toast. One option is to
open the form on the feature and press its Unbind, the way **Bind the
suggested faces** runs the form's tick. Add a browser check that has the pane
refuse the write and looks for the reason on screen.
