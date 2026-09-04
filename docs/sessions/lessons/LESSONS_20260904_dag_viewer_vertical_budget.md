# LESSONS 2026-09-04 — dag_viewer_vertical_budget

Handoff `docs/sessions/active/HANDOFF_20260904_dag_viewer_vertical_budget.md`.
Delivered a height contract for `apps/viewer/topology.html` and a row-density
toggle, plus a browser-tier assertion for both. Scope held to
`apps/viewer/{topology.css,topology.js,topology_app.js,views/topology.js}`,
`apps/viewer/tests.js` and `scripts/run_viewer_browser_tests.mjs` — the
handoff's own diagnosis was accurate and needed no re-derivation, so this file
only records what was decided beyond it.

## 1. The height contract, in the order it actually matters

Three CSS changes, in `apps/viewer/topology.css`:

1. **`#banner .banner__stale-list { max-height: 4.6em; overflow-y: auto; }`**
   — capping only the `<ul>`, not the whole `.banner__stale` block, so the
   head line ("this projection may not be what you think it is") and the
   rebuild commands stay always visible; only a long alarm list scrolls.
   Scoped to `topology.css`, which loads on no other page, so `views/banner.js`
   (shared with the stack viewer) and the stack viewer's own banner are
   untouched — same reasoning the handoff already applied to `.detail`.
2. **`.tvtotals { max-height: 260px; overflow-y: auto; flex-shrink: 0; }`** —
   capped and independently scrollable, so a study with several `notes`
   entries can't be the block that eats the graph pane's space.
3. **`.tv .detail { position: static; max-height: none; }`**, overriding the
   shared `.detail` rule's `position: sticky; top: 47px; max-height:
   calc(100vh - 47px)` (`style.css:365-368`) exactly where the handoff said to.
   That `47px` is the *stack viewer's* topbar-only offset; here the pane sits
   below a banner, a picker and a legend too, so the inherited value let
   `.detail` grow past `.tv`'s own row height. `align-self: stretch` plus this
   page's own `overflow: auto` (already present) turned out to be the whole
   fix — no replacement sticky/calc needed once the wrong one is gone.

**The floor that actually does the work**: `.tv__scroll { min-height:
calc(var(--tv-row) * 10); }`, replacing `min-height: 0`. I verified this two
ways (see §3) — reverting *only* this line, with everything else in place,
is what turns the new browser assertion red. The other three changes bound
the chrome above the pane; this is what stops the pane itself from being
squeezed past a usable floor once that chrome still doesn't fit.

**`html, body` were NOT changed from `height: 100%` to `min-height: 100%`.**
I tried that first, reasoning it was the more idiomatic "let the document grow"
pattern — but measured it side by side with the `.tv__scroll` floor and it
changes nothing observable: Chromium's default `overflow: visible` already
lets content taller than an ancestor's specified `height` render past it and
enlarge the document's scrollable area, so the floor alone produces the
document scrollbar the handoff asks for. Reverting `html, body` back to
`height: 100%` and re-running the full browser tier confirmed 7/7 still
passes. I left the original rule (and its comment, explicitly called
"deliberate" by the prior lesson) untouched rather than carry a change that
tests didn't distinguish from a no-op — smaller diff, and it means this
handoff doesn't second-guess a decision the previous session already reasoned
through.

## 2. The density toggle: where the "three places" trap actually bites

`VA.ROW_DENSITIES` and `VA.applyRowDensity` (`topology.js`) are new; the
existing `VA.RAIL_METRICS` object is **mutated in place** — its `.rowHeight`
property is written, the object itself is never replaced. That matters
because `views/topology.js` captures `var M = VA.RAIL_METRICS;` once at
script load and reads `M.rowHeight` on every render; had `applyRowDensity`
done `VA.RAIL_METRICS = {...}` instead, `M` would still point at the old
object and every row would silently stop tracking density. Mutating in place
means the SVG geometry and the inline row heights need no re-wiring at all —
the "three places" become two call sites (`topology.js` for the metric,
`topology_app.js` for the CSS variable) rather than three.

`topology_app.js`'s `applyDensity()` is the only DOM write: it calls
`VA.applyRowDensity(state.rowDensity)` and sets `--tv-row` from the returned
preset. It runs once at `boot()` (so the CSS variable and the metric object
agree from the first paint, not just after the first toggle) and again on
`onDensity`.

**Density does not `rewind()`.** `rewind()` scrolls the pane back to row 0 and
exists for the three controls that change *which* rows are on screen
(topology, study, layout mode) — `rewind`'s own comment says clicking a row
re-renders without rewinding for the same reason. Density changes how tall
the rows already on screen are, not which ones they are, so it calls `render()`
directly and the reader's scroll position survives a density toggle.

## 3. Verification, and why the red/green check needed a second pass

`node scripts\run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`,
new suite `testHeightBudget`: 700px viewport, legend forced open, a study
selected, and a **real** provenance alarm forced by cloning the mock fixture
and setting `topologies.provenance.head_sha` to a value that disagrees with
`crops.provenance.head_sha` — the same "different trees" alarm
`topology_fixtures.js`'s own comment says the quiet fixture is deliberately
built to avoid. Five sub-checks: the alarm renders, the pane holds its
10-row floor at comfortable density, compact density actually shrinks
`--tv-row`, the floor still holds at compact density, and rails stay aligned
to rows once row height has changed.

My first attempt at the red/green demonstration reverted *only* the
`.tv__scroll` min-height while `html, body` were still (at that point) changed
to `min-height: 100%` — and the test stayed green, because that html/body
change alone was enough to let the document grow and give the pane room
anyway. That is what led to §1's finding that the html/body change was
redundant. The demonstration that actually matters — revert `.tv__scroll`'s
`min-height` back to `0` with everything else (including `html, body`) as
committed — drops the height-budget suite to 3/5, failing exactly the two
floor checks:

```
FAIL sub-check: the graph pane keeps its 10-row floor (legend open, study selected, provenance alarm showing)
FAIL sub-check: the 10-row floor holds at compact density too
```

Restoring the line returns it to 5/5. This is the pair recorded as red/green.

**Measured on the real projection** (`pitch_system`, 43 rows, 1400×700,
`--repo C:\workspace\tolstack`): the tree-mismatch banner alarm is present in
this checkout's committed data by default (topologies from
`review/dag_viewer_poc`, crops from `master` — the exact condition
`LESSONS_20260831_dag_viewer_poc.md` §7 already flagged as "will fire most
times you open the page"), so the "quiet" case could not be measured against
live data without rebuilding both projections from one tree. With the alarm
showing: comfortable density holds the pane at its 260px / 10-row floor;
compact at the same viewport gets ~197px naturally (above its own 160px
floor, so the floor isn't even binding there) at 12 visible rows. Both
screenshotted (not committed — scratch artifacts) side by side: rails stay
pixel-aligned to rows in both.

Full suite: `venv-win\Scripts\python.exe -m pytest -q` (576 passed, 1
skipped), `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`
(184/184, including two new fast-tier tests for `VA.applyRowDensity` and the
picker's density button), `node scripts/run_viewer_browser_tests.mjs --repo
C:\workspace\tolstack` (7/7, including the new suite).

## 4. Gotchas for the next agent

- **The browser tier needs `npm install` inside the worktree.**
  `node_modules/` is gitignored like `data/` and the venv, but unlike those it
  is not called out anywhere as "main-checkout only" — and in fact it isn't:
  Node resolves bare specifiers relative to the running script's own
  ancestor directories, so `scripts/run_viewer_browser_tests.mjs` needs its
  *own* worktree's `node_modules/`, not the main checkout's. `PLAYWRIGHT_
  SKIP_BROWSER_DOWNLOAD=1 npm install` in the worktree root (package.json is
  tracked) fixes it in under a second — it only fetches `playwright-core`,
  never a bundled Chromium.
- **`.tv__head`'s 26px height is NOT part of the density system.** It's the
  sticky column-header row above the grid, fixed regardless of `--tv-row`.
  Leaving it fixed was a deliberate choice (a header row reads fine slightly
  taller than compact data rows; tying it to density bought nothing and would
  have made it a fourth place the row-height number lives) rather than an
  oversight — flagging it because it's the one place `--tv-row` does *not*
  reach, in a file whose whole point is that number reaching everywhere else.
