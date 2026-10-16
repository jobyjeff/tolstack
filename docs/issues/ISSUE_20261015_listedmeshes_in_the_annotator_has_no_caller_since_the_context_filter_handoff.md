---
type: chore
priority: low
status: deferred
class: dead_code_after_refactor
defer_until: 2026-11-14
area: apps/annotate/app.js
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261015_annotate_gated_browser_suites_follow_the_three_part_mock.md
---

# `listedMeshes()` in the annotator has no caller since `a_context_filter_and_a_view_filter`

`apps/annotate/app.js` still defines `listedMeshes()` (the old "scope the parts
panel to the rail filter" helper). Nothing calls it any more: the panel is built
from `currentContext()` / `contextBaseShas()`. It was the target of the mutation
spec `browser__an-element-whose-part-has-no-installed-mesh-filters-the__148e0e1f`,
which was therefore a no-op that could never go red; that spec was retargeted to
`contextBaseShas` in the handoff that found this.

Fix: delete the function and its comment block. Not done there because the
handoff's scope was the browser suites and the mutation specs, not app code.
