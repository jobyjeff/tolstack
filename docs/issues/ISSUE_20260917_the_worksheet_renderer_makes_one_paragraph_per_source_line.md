---
type: bug
priority: med
status: triaged
area: apps/viewer
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
found_by: docs/sessions/HANDOFF_20260916_design_pass_typography.md
---

# The worksheet renderer makes one `<p>` per source LINE, so a hard-wrapped paragraph reads as a column of fragments — and `**bold**` across a wrap is not parsed

## What was measured

`WORKSHEET_hub_bearing_thermal_fit.md`, rendered live in the worksheet dialog
(`views/worksheet.js` → `apps/viewer/vendor/markdown.js`). The body contains:

```
P: 294   TABLE: 16   H3: 26   UL: 19   H2: 11   HR: 8   OL: 6   BLOCKQUOTE: 5   H1: 1   PRE: 1
```

**294 paragraphs.** The source file is hard-wrapped at about 80 columns, and
each wrapped line becomes its own `<p>` with a full paragraph margin above and
below it. The first four "paragraphs" the dialog renders are four consecutive
lines of one sentence:

```
P  "Stacks hub_bearing_thermal_fit_m2 (the current design) and"
P  "hub_bearing_thermal_fit_m1 (the as-built configuration that slipped)."
P  "Handoff hub_bearing_thermal_stack, 2026-08-05."
P  "Source workbook: data/inbox/tolerance_stacks/260209_Hub Bearing Fits.xlsx."
```

The same break also defeats inline emphasis that spans a wrap: the source's
`— **read that first if you are reading a number out of this file.**` is split,
so the dialog literally prints

```
Archetype: docs/tolerance_stacks/ARCHETYPE_thermal_fit.md — **read that
first if
you are reading a number out of this file.**
```

with the asterisks on screen. Visible in
`docs/sessions/lessons/LESSONS_20260916_design_pass_typography_13_worksheet_dialog_after.png`.

## Why it matters beyond looking wrong

The worksheet is *the agent's report* — the one surface in either app that
renders a whole document, and the thing a human reviewer reads to decide whether
to trust a number. A paragraph delivered as six widely-spaced fragments, with
markup leaking through where a sentence happened to wrap, is the argument for a
value made unreadable by its renderer. It also silently penalises the house
convention every `.md` in this repo follows (hard-wrap at ~80): the better the
source file's typography, the worse the rendered page.

## Why CSS cannot fix it

Handoff `design_pass_typography` (2026-09-16) set this surface at body size with
a measure, and tightening `.worksheet__body p`'s margins would make the
fragments sit closer together — which papers over the defect rather than fixing
it, and would then compress *real* paragraph breaks by the same amount. There is
no selector that can distinguish "a `<p>` the author meant" from "a `<p>` the
renderer invented", because by the time CSS sees them they are the same element.

The fix is in the parser: a blank line ends a paragraph; a single newline is a
soft break inside one, and inline spans have to be resolved over the joined
text. That is `apps/viewer/vendor/markdown.js`, which is **vendored** — see
`apps/viewer/vendor/README.md` for what may be changed there and how the change
is recorded, since that constraint shapes the fix.

## Where the pieces are

* `apps/viewer/vendor/markdown.js` — the renderer
* `apps/viewer/vendor/README.md` — the rule for touching vendored code
* `apps/viewer/views/worksheet.js` — the caller
* `apps/viewer/style.css` — `.worksheet__body*`, including the heading rules the
  typography pass added (a worksheet's own `h1`/`h2`/`h3` are document headings,
  not the app's section label)
* `tests/debug_typography_pass.mjs` shot 13 re-takes the screenshot
