---
type: feature
priority: low
status: deferred
area: viewer/nav
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
defer_until: 2026-12-10
class: fixed_at_one_of_n_sites
resolution: deferred 2026-11-10 (triage) -- low defers by default
---

# A loose stack's status mark left the nav with its row

Since 2026-11-10 the two thermal-fit stacks (the analyses no model is part of)
are options of the nav's model picker, as Jeff's structure asked ("the two
models, then any analysis that belongs to neither"). A `<select>` option cannot
carry a mark, so the red mark `hub_bearing_thermal_fit_m1` wore (a failing
result check) and the amber one `m2` wore (two marginal checks) are no longer
visible until the stack's own page is opened. Until 2026-11-10 they were the
reason a stack derived a verdict at all (`viewer_nav_verdict_into_alert_and_
icon`, 2026-09-22).

The rule that derives the status is unchanged (`VA.stackNavStatus`, pinned
on synthetic stacks in `apps/viewer/tests.js`); only the surface is gone.
Options: a one-line status strip under the picker for the chosen analysis; a
glyph in the option's text (everyday word, not a character badge); or accept
that a stack's verdict is on its page. A design call, not a fix.
