# LESSONS 2026-09-21 — viewer_nav_alert_badge_and_angled_default

## The nav row's alert-state inventory, as it landed

The handoff asked for the full set "from the renderer". There were **five**
carriers, not the three the chip styles suggest, because two of them are
`VA.studyVerdict` *states* rather than `VA.ATTENTION` flags — and one of those
two was not a chip at all but a `"⚠ "` string prefixed onto the row's label,
which is exactly the kind of thing a CSS-class census misses.

| carrier | source | disposition |
|---|---|---|
| `pass` / `marginal` / `fail` | `VA.studyVerdict().state`, a key of `VA.VERDICTS` | **stays a chip** |
| `verdict.incomplete` | `check.complete === false` | **stays a tint** (`.tvverdict--qualified`) — and the WORD now arrives through the ⚠ |
| `none` → "no pass/fail criterion recorded yet" | `VA.studyVerdict`, `checks: []` | **folds** |
| `error` → "does not sum" | `VA.studyVerdict`, `study.status !== "ok"` | **folds** (and the label's own `"⚠ "` prefix is gone with it) |
| `unverified` / `no_tolerance` / `incomplete` | `VA.studyAttention().badges` over `VA.ATTENTION` | **fold** |

Calls the handoff left to the agent, and why:

* **"no criterion" folds.** It is an absence, not an answer, and Jeff named it
  in his list of loud chips. The reason it was a chip in the first place —
  "a silent row on a rail of verdicts reads as a row that passed"
  (`viewer_study_verdicts_and_gaps`) — is still honoured, because the row is
  not silent: it wears the ⚠. That is why the `[real]` pin was rewritten as
  *no row is silent* rather than *every row has a verdict*; the old wording
  would have forced the chip back.
* **"does not sum" folds too**, and this one is the trap. It already had a
  triangle, in the label. Fold the state into a badge and leave the prefix and
  the row wears **two** ⚠ — which is the opposite of the deliverable. Dropping
  the prefix is what makes "at most one ⚠ each" true; the amber
  `.navtree__row--warn` tint stays, because a tint is a state and not a badge.
* **`verdict.incomplete` needed a guard.** `nav.js` carried a standing promise
  that the qualification arrives as a WORD and not only as a tint, and until
  this pass the word came from the *separate* `incomplete` attention flag. The
  two have different sources (`complete: false` vs `excluded_terms`), so
  `VA.studyNavAlerts` pushes an `incomplete` alert when the verdict says
  incomplete and no flag already named it. On today's projection they always
  co-occur, so that branch is fixture-only — it is there so the promise cannot
  quietly lapse on a check that reports `complete: false` and excludes nothing.

**All 21 live study rows carry a badge.** Measured in the browser tier
(`badged === rows === 21`). Nothing in the live projection exercises "a clean
row shows the verdict alone", so that case is pinned on a synthetic fixture
(`ALERT_TREE` in `tests.js`) rather than against `data/projections/`. Worth
knowing before assuming a `[real]` assertion covers the quiet path.

## Where the leader default actually lived

Three places, none of them named:

1. `topology_app.js`'s `state.leaderStyle: "jogged"` — the real one;
2. `views/topology.js`'s `VA.LEADER_STYLES[state.leaderStyle] || VA.LEADER_STYLES.jogged`
   — the toolbar's fallback preset;
3. `topology_app.js`'s `onLeaderStyle`, `style ? style.next : "jogged"`.

All three now read `VA.DEFAULT_LEADER_STYLE` (`topology.js`), with a fast-tier
test scanning `topology_app.js` and `views/topology.js` for the literal shapes
so a fourth copy fails rather than half-moving the default later.

A **fourth** site was deliberately left alone: `VA.leaderGeometry`'s
`options.style === "angled"`. That is geometry, not a preference — absent means
"draw the jogs", `geo.style` reports what was drawn, and every app path passes
the preference in explicitly. Re-pointing it at the default would have changed
what a dozen pure-geometry tests measure without making any user-visible
default more true. There is a comment at that line saying so.

## Traps in the browser tier when you flip a default

`scripts/run_viewer_browser_tests.mjs` had **click-parity** assumptions all
through the leader sections, and flipping the default breaks them in a way that
mostly still passes:

* the mock suite measured the default style first and named it `joggedBands`,
  then compared the post-drag SVG width against `angledBands.svgWidth`. Both
  variables had to be renamed *and* the width comparison re-pointed, or the
  drag assertion silently compares against the wrong style's width.
* the `[real]` suite's **persistence anchor** is the subtle one, and it carries
  its own warning from 2026-09-15
  (`ISSUE_20260915_leader_style_persistence_across_topology_switch_is_unpinned`):
  it switches topology with the style **off its default** precisely because at
  the default a reset and a non-reset are indistinguishable. Off the default is
  now *jogged*. Leaving the old `/Leaders: angled/` there would have kept the
  suite green while measuring nothing at all — the exact failure that issue was
  filed about, re-created by flipping a default. It is written against the
  toggle's TEXT, and there is now a comment at that line explaining that it has
  to move whenever the default does.
* each leader block must **end on the default style**, because later blocks
  assume it.

## Running the browser tier from a worktree

`node_modules/playwright-core` lives only in the main checkout and ESM ignores
`NODE_PATH`, so `import { chromium } from "playwright-core"` cannot be
redirected by an env var. A junction works and `node_modules/` is gitignored:

```
New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules
node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack
```

**Remove the junction before you finish.** `Remove-Item -Recurse` on a junction
can traverse into the target on some PowerShell versions, and the target is the
main checkout's `node_modules`. Delete it with `(Get-Item …).Delete()` (or
`cmd /c rmdir`), which unlinks the junction itself.

The same `--repo C:/workspace/tolstack` escape hatch makes `node
apps/viewer/run_tests.cjs` run its `[real]` tier from a worktree — 478/478
rather than a suite reporting itself skipped. `pytest -q`'s one red
(`test_viewer_js_suite.py`) is the documented worktree behaviour and stays red
here by design.

## Not done, deliberately

The **materials table's** source column still carries always-visible loud chips
(`CTE NOT TRANSCRIBED`, `VALUES_STATUS UNKNOWN`) — the second half of
`ISSUE_20260916_the_viewer_nav_rail_may_be_the_left_side_menu_jeff_called_loud`,
which is updated rather than closed and now says exactly what is left. It was
out of this handoff's scope (nav rows + the leader default) and carries its own
vocabulary decision. `VA.alertBadge` and `VA.alertsCard` are ready for it.
