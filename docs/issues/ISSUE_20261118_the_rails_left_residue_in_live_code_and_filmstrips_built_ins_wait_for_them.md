---
type: chore
priority: med
status: resolved
area: viewer
reporter: agent
resolution: filmstrip re-pointed at the map (respine scenarios deleted), dead helpers, rule and comments removed, two uncited probes deleted; leftovers filed in ISSUE_20261118_rails_era_comments_and_assertions_remain_after_the_residue_sweep.md
found_by: docs/sessions/active/HANDOFF_20261117_the_map_is_the_only_drawing_and_classic_retires.md
handoff: docs/sessions/HANDOFF_20261117_the_filmstrip_boots_on_the_map_and_the_rails_residue_goes.md
---

# The rails left residue in live code, and `scripts/filmstrip.mjs`'s built-in scenarios wait for them

Found in review of `the_map_is_the_only_drawing_and_classic_retires`
(2026-11-18, `docs/sessions/reviews/REVIEW_20261117_the_map_is_the_only_drawing_and_classic_retires.md`).
That handoff retired the rails drawing. These pieces outlived it. None of
them changes what the page draws, so the review approved anyway.

## 1. `scripts/filmstrip.mjs`: every built-in scenario times out (the one that matters)

`CLAUDE.md` tells every viewer handoff to film a transition with
`node scripts/filmstrip.mjs`. Its `bootKinematic` helper ends with
`page.waitForSelector("#topopane svg.tv__rails", { timeout: 15000 })`.
Nothing draws that element any more, so the helper throws after 15 s. All
five built-in scenarios call it (`respine`, `respine-back`, `pane-open`,
`row-click`, `click`). Their probe (`bandProbe`) also reads
`line.rail__bar--on` and `.tv__zoomsizer`, and `click` targets
`svg.tv__rails circle.rail__dot--on`. A custom `--scenario` module that does
its own setup still works: the compositor and the stepped clock never touch
the rails.

Fix: wait for `#topopane svg.tv__map` in `bootKinematic`. Delete the respine
scenarios. Re-point `pane-open`, `row-click` and `click` at the map (for
example the map's `data-zoom` and its view transform, rather than the lit
bars' rects).

## 2. Dead code and stale comments in `apps/viewer/`

- `topology.css`: `.tv__rails { … }` (about line 689) and
  `svg.tv__rails { overflow: visible; clip-path: … }` (about line 1616) style
  an element nothing creates. The comment at line 35 still explains the
  leader ink through `.rail__leader--on`, `.seam__leader` and `.seam__end`.
- Two helpers lost their last caller in this diff: `VA.blockColumns`
  (`topology.js`, defined, never called; the baseline had three callers) and
  `VA.kinematicPoseLengths` (`views/kinematic.js`: the contribution length
  mode's input; the baseline had ten references). Four more were already
  uncalled on the baseline: `VA.dimensionText`, `VA.rowElement`,
  `VA.transformText`, `VA.topologyBuiltLine`.
- Comments that describe the rails as live: `views/topology.js` lines 1-12
  (the file header: "the rails (SVG), the grid, and the preview … the jogged
  leader lines … VA.leaderGeometry"), about line 798 (`VA.FLYOUT_WIDTH`'s
  measured `svg.tv__rails` width), about line 1598 ("no leader's seam moves …
  VA.rowPositions"); `topology.js` about line 333 (`railsSvg`'s hit path),
  about line 2051 (`VA.leaderGeometry`), about line 3163 (`VA.respineX`);
  `views/kinematic.js` about line 504 (`VA.EDGE_LENGTH_MODES`); `map.js`
  about line 82 ("the present design's pictures
  (apps/viewer/interface_glyphs.js)", a file this diff deleted).

## 3. Hand-run probes under `tests/debug_*.mjs`

About twenty of them wait for `svg.tv__rails` or seed
`tolstack.viewer.dagDrawing`. No tier runs them, so they break silently. They
are dated one-off inspection tools: delete the ones nothing cites, or leave
them as history. The point is to decide once, not to repair each one.

`git grep -n "tv__rails\|dagDrawing\|leaderGeometry\|respineX\|rowPositions" -- apps scripts tests`
lists every site.

## 2026-11-17 triage sweep

Staged as `docs/sessions/HANDOFF_20261117_the_filmstrip_boots_on_the_map_and_the_rails_residue_goes.md` (med, sonnet). Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.
