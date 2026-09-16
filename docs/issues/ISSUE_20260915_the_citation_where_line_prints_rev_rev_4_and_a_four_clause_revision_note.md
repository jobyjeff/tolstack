---
type: bug
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
---

# The citation where-line reads "rev Rev 4 (sheet 1 rev 4, sheet 2 rev 2, sheet 3 NEW, sheet 4 rev 2)"

Seen while verifying `viewer_component_names_and_reference_copy` against the
live pitch-link topology. Select the bolt's `fastener_grip` row; the preview
pane's where-line (`VA.citationWhere`, apps/viewer/viewer.js) renders:

> NAS6403-NAS6420 Rev 4.pdf · **rev Rev 4 (sheet 1 rev 4, sheet 2 rev 2,
> sheet 3 NEW, sheet 4 rev 2)** · sheet 3 · grip/length table · cell row
> 'Grip Dash No. 11'

Two separate things, and it is worth keeping them apart:

1. **"rev Rev 4" is the viewer's.** `citationWhere` unconditionally prefixes
   `"rev "`, and this citation's authored `revision` already begins with
   "Rev". The rule is the same one the copy pass elsewhere applied: do not
   prefix a label a value already carries. One line, in one function.
2. **The four-clause per-sheet note is the document's.** `revision` on that
   citation is `"Rev 4 (sheet 1 rev 4, sheet 2 rev 2, sheet 3 NEW, sheet 4
   rev 2)"` — a real and useful fact about a scan whose sheets are at
   different revisions, in a field every surface renders inline. That is an
   authoring question (does `revision` carry the revision, with per-sheet
   detail in `note`?) and it is the same shape as
   `ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`.

**Not fixed in that handoff on purpose.** `citationWhere` is shared by both
viewers and by four surfaces, its shape is deliberately the same as
drawing-checker's own "Where" column (so a citation reads the same in both
tools), and it is pinned by several tests — none of which is a reason not to
fix it, but all of which make it a change that wants its own diff rather than
a drive-by inside a copy pass that had already grown to five items.

`viewer_component_names_and_reference_copy` did fold the *crop's* matching
provenance away from this same pane, which is the line Jeff quoted; this one
sits two lines above it and he did not name it.
