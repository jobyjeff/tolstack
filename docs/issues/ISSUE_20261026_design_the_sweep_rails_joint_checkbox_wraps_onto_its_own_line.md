---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_rail_and_the_scene_point_at_each_other.md
class: unreviewed_design_debt
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# Design: the sweep rail's link-joint checkbox wraps onto a line of its own

Found in review of `the_rail_and_the_scene_point_at_each_other` (2026-10-26),
from the branch's own screenshot
`docs/sessions/shots_20261026_rail_and_scene/2_blade_hidden.png`.

Body rows (`base · 3 parts`) carry their new show/hide checkbox at the right
end of the summary line. The link joints' rows (`pitch link · ball-ended link ·
pitch pla…`, `tan link · …`) are long enough to fill the line, and their
checkbox drops to a second line of its own under the summary, right-aligned,
which reads as an orphan control.

Cause: `apps/annotate/style.css` floats `.an__tree-check` right, but the
checkbox is appended *after* the text in the `<summary>`; a right float that
follows an inline-block filling its line is placed on the next line. The
`max-width: calc(100% - 40px)` on `.an__tree-text` was meant to leave room and
does not cover the disclosure marker's width plus the indent.

Fix shape: insert the checkbox before the text (so the float is placed first),
or lay the summary's text and checkbox out with flex while keeping the
disclosure marker (the lesson notes `display: flex` on the summary drops it, so
wrap the two in an inner flex span instead). Check at the rail's rest width.
