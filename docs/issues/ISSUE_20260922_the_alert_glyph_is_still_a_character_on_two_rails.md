---
type: chore
priority: low
status: resolved
area: apps/viewer, apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_viewer_nav_verdict_into_alert_and_icon.md
handoff: docs/sessions/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md
resolution: handoff completed 2026-09-23 -- closed automatically by dispatch when handoff `stack_page_alert_marks_and_drawn_glyph` moved to completed/; not independently verified.
---

# The alert mark is a drawn icon on the nav rail and still a `⚠` character on the two other badges

## What changed, and where it stopped

`viewer_nav_verdict_into_alert_and_icon` (2026-09-22) replaced the nav rail's
alert badge with a drawn one — `VA.warningIcon` in `apps/viewer/views/dom.js`,
one SVG path sized in pixels and coloured by `currentColor`. The reason was not
taste:

* a `⚠` is sized by `font-size`, so it can only ever be as large as a step on
  the type scale, and the steps are owned by `tests/test_app_type_scale.py`. A
  seventh step added to make one triangle bigger is a scale decision taken by
  an icon.
* it renders through whatever font the platform picks for U+26A0. On Windows
  that is as often a **colour emoji** as a monochrome glyph, and a colour emoji
  ignores the semantic colour the level class sets — so the one thing the mark
  is supposed to say at a glance is the thing the platform may overrule.

Jeff's words were about the rail: "reformat the alert icon: get rid of the
rounded border around it, make the actual icon larger so it's legible (or
replace it with a proper icon/emoji rather than a character)." That handoff's
scope was the left-hand nav, so the rail is where the redraw landed.

## The two sites still typing the character

Both reasons above apply to them unchanged. Neither is a 300px always-visible
rail, which is why neither was urgent enough to pull into that handoff.

1. **`apps/viewer`'s elements-table badge** — `VA.alertBadge`'s default, still
   `VA.ALERT_ICON` inside a `.chip--alert` (`apps/viewer/viewer.js` defines the
   glyph; `views/stack.js`'s source cell is the caller). `VA.alertBadge` already
   takes `opts.className` / `opts.icon`, so this site is a two-line change plus
   deciding whether the chip framing is right in a table cell — where, unlike on
   a row, a border may genuinely be doing work.
2. **`apps/annotate`'s own badge** — `AA.ALERT_ICON` in
   `apps/annotate/binding_state.js`, set on `badge.textContent` in
   `apps/annotate/app.js`. Jeff on this one, 2026-09-21: "same purpose, just in
   a different place." Note `apps/annotate/run_tests.cjs` asserts `ALERT_ICON`
   is *one glyph and not letters* — a real guard, and it is written against a
   character, so moving this site means replacing that check with the shape the
   viewer's drawn icon is pinned by (a sized single-path SVG) rather than
   deleting it.

Doing both would also let `VA.warningIcon` be the one definition of the mark
across the two apps, which it currently is not: the annotate app has no access
to `views/dom.js` and would need its own copy or a shared file. That choice —
copy, or a third shared module — is the only design question here.

## Why this is filed rather than done

Off the 2026-09-22 handoff's scope in as many words ("this is the left-hand nav
only"), and the rail was the surface Jeff was looking at. Recorded so the
inconsistency has an owner: the nav rail and the elements table are on the same
page, two clicks apart, showing the same alert two different ways.
