---
type: chore
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
---

# The annotator's reader-facing copy is scanned in its MARKUP only — most of its words are written by app.js and reach no guard

`reader_facing_surfaces_second_pass` (2026-09-18, deliverable 4) found that the
banned-string guards reached `apps/viewer/` and nothing else, and widened them:
the list moved to `apps/viewer/reader_facing_bans.js` and
`apps/annotate/run_tests.cjs` now reads the same one. What that widening
actually covers, and what it does not, is worth having on the board rather than
only in a lesson.

## What is covered now

* **`apps/annotate/index.html`** — element text plus the `placeholder` /
  `title` / `aria-label` / `alt` attributes, scanned against the shared list.
  This is where both of the defects the issue named actually lived.
* **`AA.BINDING_STATES` and `AA.BINDING_STATE_ALERTS`** — the word tables a
  rail row and its alert popup print.
* **every sentence passed through `assertNoCommandOrPath`** — the banner's,
  which was already scanned against a narrower local list (`COMMANDISH`) and
  is now scanned against both.

## What is NOT covered, and why

Most of this app's words are built by `app.js` at runtime and written straight
into a real DOM: the detail pane's prose, the bind form's labels, the
owner-not-in-set form, the scene's empty state, the parts panel's rows, the
rail filter's summary. None of them reach a guard.

The reason is structural, not an oversight: `app.js` is an **ES module** that
imports three.js and touches `document` at load, and `apps/annotate/run_tests.cjs`
has **no DOM shim at all** — its own docstring says so, because
`binding_state.js` and `commands.js` are DOM-free by design and needed none.
Giving this app the coverage the viewer has means one of:

1. **A DOM shim for the annotate runner**, the way `apps/viewer/run_tests.cjs`
   has one, plus a way to load `app.js`'s render functions without booting the
   scene. `app.js` is 1200 lines of boot + wiring + render with no seam between
   them; the render functions would have to be factored out first, which is the
   real cost and the real deliverable.
2. **Scan it in the browser tier instead.** `scripts/run_viewer_browser_tests.mjs`
   already drives `apps/annotate/index.html?mock=1` in three suites (the flyout,
   the rail filter, the hosted posture) with a real DOM in front of it. A walk of
   the rendered page's text there would cover everything, cost no refactor, and
   run in a tier that exists — at the price of being a browser-tier check rather
   than a fast one, so a copy defect reddens late instead of early.
3. **Move the app's reader-facing sentences into `AA.*` tables**, which the two
   already-covered tables show works and which this repo's own field-vocabulary
   rule points at anyway. That converts the problem into the one the guard
   already solves, incrementally, one sentence at a time.

Option 2 is the cheapest real coverage and option 3 is the one that compounds;
they are not exclusive.

## Why this is filed rather than done

The handoff's deliverable was the two strings and the widening, and it says so:
*"check whether the banned-string guards reach `apps/annotate/` at all or only
`apps/viewer/`. If they do not reach it, that is the more valuable finding:
widen them, and report what else they light up."* Building a DOM tier for a
second app is a session, not a clause.

## What the widening lit up elsewhere, for the record

Three new entries went on the shared list: `materials.json`, `data/`, and a
`window.<Namespace>` shape. The `data/` entry lit up **three live viewer
strings** naming a repo path at a reader:

* the sourcing legend and `VA.CROP_RULES.spec_pile`, both saying
  `data/inbox/specs/` and both restating a rule
  `VA.IDENTITY_RULES.spec_pile_filename` already states in words ("the
  standard-spec library is only ever added to");
* **`topology.html`'s topbar subtitle** — *"read-only · renders
  `data/projections/viewer/` · computes nothing"*, on screen at all times, on
  every page of the app, read by no guard because every scan in
  `apps/viewer/tests.js` renders a JS surface and none read the markup around
  them. The viewer now has the twin of the annotator's markup check.

All three were reworded in the same session, so the list ships green; they are
named here because "what else it lit up" is the part of the finding a reader of
the board would otherwise never see — and because the third one is the clearest
evidence that a shared list applied to every surface CLASS finds instances a
handoff scoped to one surface never would.

## Where the pieces are

* `apps/viewer/reader_facing_bans.js` — the shared list and the argument for
  where it lives
* `apps/annotate/run_tests.cjs` — the three checks this widening added
* `apps/annotate/app.js` — the uncovered half
* `scripts/run_viewer_browser_tests.mjs` — the three suites that already drive
  this app with a real DOM
