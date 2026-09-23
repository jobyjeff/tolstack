---
type: bug
priority: low
status: triaged
area: viewer/reader-facing-copy
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_viewer_summary_balance_sheet.md
strategy: docs/strategy/BRIEF_20260915_prose_field_rules_names_and_derivable_counts.md
---

# The study summary renders record prose the banned-string guard would refuse, and is the one live surface the guard cannot reach

## What was measured

`viewer_summary_balance_sheet` (2026-09-22) enrolled the study summary
(`VA.renderTopoTotals`) and the grid's new totals footer in the **fixture**
tier's reader-facing walk (`apps/viewer/tests.js`, "no rendered topology
surface prints an internal id, a field name, a checksum or a workstation
path"). That enrollment immediately justified itself: the surface had been
printing the study's own id in a `<code>` and naming its two ends
`washer_far_face → cotter_hole_centerline`, and both are now gone.

Enrolling the same surface in the **`[real]`** walk was attempted and backed
out. It fails on live data, on the RECORD's own words:

* `pitch_link_cotter_hole_clearance`'s study `notes` name
  `tests/test_topology_conversions.py` — caught by the
  `\b[\w.-]+\.(?:py|exe|ps1|bat|cmd|sh)\b` shape in
  `apps/viewer/reader_facing_bans.js`;
* several `hardware_entry` gap texts name `data/inbox/specs/` — caught by the
  `data/` literal.

Both are rendered behind a disclosure (`Details`, and `What's missing`), and
both are the record speaking, not the page.

## Why it is a question rather than a fix

Three ways out, and choosing between them is a design call:

1. **Exempt them.** Five new `VERBATIM_PROSE_CLASSES` entries
   (`p.tvtotals__note`, `span.tvgaps__text`, `summary.tvfind__name`,
   `p.tvfind__why`, `div.tvcard__why__body`). Every one has the same argument
   `p.check__guidance` and `li.notelist__note` already won. But that list is
   deliberately short ("a new class here is a new excuse"), and none of the
   five can be liveness-checked: the dead-exemption guard runs over **stack**
   surfaces only, so all five would land in `TOPOLOGY_ONLY_EXEMPTIONS` and be
   exempt from the hygiene rule that keeps the exemptions honest. Fixing that
   properly means teaching the liveness check about topology surfaces too.
2. **Mark them on the page.** The guard's premise is "nothing a reader can act
   on". A reader genuinely cannot run `tests/test_topology_conversions.py` from
   this page. The record must not be edited — but the page could render a
   record's prose in a way that says *these are the author's words to another
   author*, which is arguably what a fold already does.
3. **Leave it, and say so.** The current state: the page's own words on this
   surface are guarded at the fixture tier, the record's are not scanned at
   all, and that boundary is written down in the `[real]` walk's own comment.

Option 3 is what shipped. The cost of leaving it is that a future *page*
string added inside one of those nodes would ride through the live walk
unseen.

## Repro

Add to `apps/viewer/tests.js`'s `[real] no rendered surface of any live
topology prints an internal id, …`, inside the `liveTopos` loop:

```js
(topoProj.studies || []).forEach(function (study) {
  check(topoProj.id + " summary of " + study.id, render(function (r) {
    VA.renderTopoTotals(r, topoProj, study, VA.topologyIndex(topoProj));
  }));
});
```

Then `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`.
