---
priority: high
depends_on: []
---

# HANDOFF 2026-09-04 — dag_viewer_vertical_budget: the DAG pane gets starved to a few rows; give it a height contract and a density control

Source: Jeff, 2026-09-03 — "issues with the divs on the screen getting all
scrunched up (very small vertical height) that makes the ui unusable, please
investigate, we really need to be able to see most of the dag at once in order
for it to be visually meaningful." Baseline: current `master`/`integration`
(the four viewer files are identical on both). Scope: `apps/viewer/`
(`topology.css`, `topology.js`, `views/topology.js`, `topology.html`, shared
`style.css` only where noted) + browser-test tiers; do NOT touch
`scripts/build_topology_projection.py`'s layout semantics (row/column
allocation is a claim about the graph, not the screen).

## Diagnosis (verified 2026-09-04 by a read-only investigation; re-measure, don't re-derive)

The page is a viewport-height flex column (`topology.css:56-62` — deliberate,
see the comment at `:51-55`: no `calc(100vh - N)` against a data-dependent
banner). Inside it, **the rails+rows scrollport (`.tv__scroll`,
`topology.css:68-73`, `min-height: 0`) is the only element allowed to shrink,
and everything stacked around it is un-shrinkable and data-dependent**:

- The provenance banner is a stack of `flex-basis: 100%` lines
  (`style.css:50-79`) and the dag_viewer_poc lesson (§7) says the
  trees-mismatch alarm "will fire most times you open the page" — one line
  quiet, ~six with an alarm (~180px).
- The totals footer (`.tvtotals`, `topology.css:172-192`; content built at
  `views/topology.js:346-400`) has no `max-height`, no `overflow`, no
  `flex-shrink: 0` — 230–300px once a study is selected, plus one paragraph
  per `study.notes` entry.
- The legend `<details>` (`topology.html:20-51`) adds ~250px when opened.

At a ~700px inner viewport that arithmetic leaves `.tv__scroll` ≈ 140px ≈ 5
rows of 26px against the pitch system's 43 rows; with the legend open the
un-shrinkable chrome exceeds the viewport, the totals footer overflows its own
container and the scrollport clamps toward 0. That is the reported symptom.

Independent second problem: rows render at a fixed 26px
(`VA.RAIL_METRICS.rowHeight`, `topology.js:255`; `--tv-row`,
`topology.css:31`; inline row heights, `views/topology.js:231-239`) with a
1:1 SVG viewBox (`views/topology.js:136-144`) — 43 rows is 1118px, so "see
most of the DAG at once" is impossible at any viewport even with perfect
chrome.

## Deliverables

1. **A height contract for the page.** Bound every non-scrolling block so the
   graph pane can never be squeezed below a usable floor:
   - Cap `.tvtotals` (`max-height` + `overflow: auto`, or collapse it, or move
     totals into the `.detail` aside — your call, justify it);
   - Cap the banner's alarm stack (`max-height` + scroll) **without hiding
     that an alarm exists** — the alarm is load-bearing, only its screen
     budget is negotiable;
   - Give `.tv__scroll` a real minimum (accept a document scrollbar rather
     than a 0px graph);
   - Fix `.detail`'s inherited `position: sticky; max-height: calc(100vh -
     47px)` (`style.css:365-368` — the 47px is the *stack viewer's* topbar) by
     overriding in `.tv .detail` (`topology.css:211-213`); never edit the
     shared rule, the stack viewer depends on it.
   Preserve the `:51-55` intent: no viewport calc against data-dependent
   chrome.
2. **A row-density control** ("see most of the DAG at once"): a
   compact/comfortable toggle (or similar) that changes row height, e.g. 16px
   compact turns 43 rows into ~690px. **The trap is documented and pinned**:
   row height is one number living in three places that must move together —
   `VA.RAIL_METRICS.rowHeight` (`topology.js:255`), `--tv-row`
   (`topology.css:31`), and the inline heights (`views/topology.js:231-239`);
   the SVG y follows via `railY`. Do NOT scale the SVG viewBox instead — that
   desynchronises rails from HTML rows and breaks the page's alignment claim.
3. **A browser-tier assertion for usable height.** The existing tier measures
   rail/row alignment (`scripts/run_viewer_browser_tests.mjs:307-320`) but not
   pane height, which is why this shipped. Add: with the legend open, a study
   selected, and a provenance alarm present, `.tv__scroll`'s height ≥ a stated
   minimum at a ~700px viewport.

## Definition of done

- The pitch-system topology (the 43-row case) is usable at a ~700px viewport:
  legend open + study selected + alarm showing, and the graph pane still shows
  a stated minimum of rows; compact mode shows most of the 43 rows at once.
  Screenshot or measured numbers in the lesson.
- Alignment guard still green: `node scripts/run_viewer_browser_tests.mjs
  --repo <checkout>` (rect-centre check), `node apps/viewer/run_tests.cjs`,
  and the pytest suite (`venv-win/Scripts/python.exe -m pytest -q` — worktrees
  use the main checkout's venv, `C:\workspace\tolstack\venv-win\...`).
- New height assertion red/green demonstrated (revert the fix, watch it fail).
- Lesson: the chosen height contract and why, the density numbers, and any
  chrome block deliberately left unbounded.
