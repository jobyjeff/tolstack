---
type: bug
priority: med
status: triaged
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_surfaces_that_state_something_false.md
handoff: docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md
---

# The hosted annotate page says annotating is unavailable, then tells the reader to click a face in the 3D view

`surfaces_that_state_something_false` (2026-09-15) made the annotator's
**banner** honest on a hosted origin — one sentence, and **Connect folder**
removed rather than disabled. The rest of the page did not move with it.

Measured in real Chrome on a non-loopback origin
(`--host-resolver-rules=MAP hosted.tolstack.test 127.0.0.1`, the technique
that handoff added to `scripts/run_viewer_browser_tests.mjs`), serving this
repo's tree at `/apps/annotate/index.html`. What the hosted page shows below
the honest sentence:

| element | state |
|---|---|
| `#banner` | "Annotating is not available on this site — …" ✔ |
| `#connect-btn` | `display: none` ✔ |
| `#transport-sub` | empty ✔ |
| the detail pane | **"Pick an element on the left, then click a face in the 3D view to bind it."** |
| `#topology-select`, `#study-select` | visible, empty |
| `#console-input` + `#console-run` ("Run") | visible and **live** (`main()` wires them before the hosted early-return) |
| the 3D pane | a large empty panel — `AnnotateScene` is deliberately never constructed, so there is no canvas at all |

So the page states, two inches apart, that annotating is not available here and
that the way to annotate is to click a face in a 3D view that does not exist on
it. That is the same defect the handoff was filed to fix, one surface over.

None of this chrome is *new* — a hosted page showed the same empty selects,
the same hint and the same console before, alongside a **Connect folder**
button the visitor could not satisfy. The change is that the page now *knows*
and *says* it cannot annotate, which turns unreachable instructions into
contradicted ones, and that the 3D view the hint names is now genuinely absent
rather than merely empty.

Jeff's standing rule is the one that handoff's own fast-tier check asserts
about the notice: **a feature that is absent shows nothing about itself.** It
should hold for the page around the notice too.

## Fix shape

Extend the hosted early-return in `apps/annotate/app.js`'s `main()` past the
banner: hide the panels whose only purpose is the bind workflow (the detail
hint, the two selects, the parts panel, the dev console, the 3D pane) the way
`el.connectBtn` is hidden, leaving the sentence. Cheapest honest version is one
`display: none` on the containing columns rather than a per-element list — but
the layout is a three-column grid, so check what an emptied grid looks like
before choosing.

Coverage: `testAnnotateHostedPosture` in `scripts/run_viewer_browser_tests.mjs`
already drives exactly this page and already asserts the connect button's
`display` — one more sub-check per hidden element goes in beside it, and the
suite's local half keeps proving the rule discriminates.

## Related

- `ISSUE_20260915_a_hosted_viewer_still_offers_3d_affordances_the_annotator_cannot_service`
  — the mirror image, on the viewer's side. Same origin question, and the
  `audience: strategy` call there (read is not write; a hosted *reader* may
  legitimately want the 3D trace once
  `ISSUE_20260910_annotate_has_no_http_read_transport` lands) applies to
  **the 3D pane specifically** here. The selects, the hint and the console are
  bind-workflow surfaces and have no such argument; they can go now.
- `ISSUE_20260915_annotate_banner_renders_a_terminal_command_for_the_user_to_copy`
  — the same "this app never had the viewer's honesty pass" root.
