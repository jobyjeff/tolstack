---
type: chore
priority: low
status: triaged
area: apps/viewer, apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_viewer_nav_verdict_into_alert_and_icon.md
handoff: docs/sessions/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md
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

## 2026-09-22 (later) — both sites are drawn, and there was a third

`stack_page_alert_marks_and_drawn_glyph` shipped it. `VA.ALERT_ICON` and
`AA.ALERT_ICON` are both deleted; `grep -n` for the character over `apps/`
returns comments and history only.

**The design question this issue named — copy, or a third shared file — was
answered "shared file".** `apps/viewer/warning_icon.js` holds
`VA.WARNING_ICON_PATH`, `VA.WARNING_ICON_PX` and `VA.warningIcon`, moved out of
`views/dom.js`, and `apps/annotate/index.html` loads it as a sibling — the
third file it loads across that boundary, after `storage/adapter.js` and
`reader_facing_bans.js`, both of which are there for the same stated reason. It
is reached through `AA.warningIcon` (`binding_state.js`) rather than from
`app.js`, the way `AA.chooseTransport` reaches the shared transport decision, so
a renderer never touches the viewer's namespace and a missing sibling file
fails with a sentence naming the file. A copy plus a pairing assertion was the
other option; it was not taken because the sharing precedent in **JS** here is
direct and documented, and a shared definition needs no guard at all.

The annotate guard was rewritten, not dropped, as this issue asked: it now pins
that `AA.warningIcon` **delegates** (proved by substituting the viewer's
function and watching the call land), that the missing-sibling error names the
file, that `AA` defines no geometry of its own, and that the path data is path
data — a moveto followed by nothing but commands and numbers, at a pixel size
≥ 14. That the *rendered* badge is a sized `<path>` with no text in it is
asserted where a layout engine can see it, in the browser tier.

**A third site, found by this issue's own grep:** `views/banner.js`'s stale-data
summary typed the character in front of its sentence
(`"\u26A0 Data is older than the latest code — needs a rebuild"`). Both of this
issue's arguments applied to it and one applied harder — it carried no semantic
colour at all, inheriting body text, in the one box on the page that says "do
not trust what you are reading". It is the drawn mark now, in the box's own
`--untraced` colour (`.banner__stale-summary` / `.banner__stale-mark`).

One argument in this issue's framing turned out to be wrong and is worth not
repeating: the chip framing was **not** dropped because a 16px picture inside a
`.chip` would have grown the row. It would not have — a `.chip` measures 21px
in that cell and the mark is 16 — and the browser tier now carries that
measurement beside the check that caught it. The frame went for the two reasons
the nav rail's did: a border around the only alert marker on a row is a second
mark, and unframed is the one thing in a cell of chips that is different in
kind.
