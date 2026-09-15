---
type: bug
priority: high
status: open
area: viewer/topology
reporter: agent
audience: strategy
---

# The topology viewer's leader lines cross each other, 16 times on `pitch_system`

Found while building the alternating leader bands
(`HANDOFF_20260914_viewer_leader_grid_legibility.md`). It is not that
handoff's to fix — which lane a leader takes is layout policy, fenced off the
same way `viewer_dag_spine_layout`'s own leftovers are — but it is very
probably a large part of what Jeff was describing when he said the leaders
are "near impossible to follow".

## What is wrong

`apps/viewer/topology.js`'s `VA.leaderGeometry` allocates lanes strictly
monotonically in walk order and the file states, in as many words, that
leaders therefore **cannot cross**:

> Lanes are strictly monotone in walk order. Leaders never cross under that
> rule (both endpoint sequences are monotone in y) …

That proof was sound when it was written, and it rested on a premise that is
no longer true. `LESSONS_20260910_viewer_leader_line_grid.md` records the
premise explicitly: *"Leaders always **rise** left-to-right (`y2 < y1`
structurally)."* Since `viewer_dag_spine_layout` centred the grid block
against the DAG (2026-09-14), a leader above the centre **descends** — the
lesson for that handoff says so and the browser tier was changed to stop
reading a leader's ends off its bounding box because of it.

Once a leader may descend, two leaders cross exactly when

    y2[i] >= y1[i+1]

— leader *i*'s vertical run, in its own lane, passes straight through leader
*i+1*'s horizontal run, because every later leader's lane is to the right of
lane *i* and every node's x is to the left of the jog zone.

## Repro

Pure, no browser:

```
node -e "global.window={};require('./apps/viewer/topology.js');
var VA=global.window.ViewerApp,fs=require('fs');
var p=JSON.parse(fs.readFileSync('C:/workspace/tolstack/data/projections/viewer/topologies.json','utf8'));
var t=VA.findTopology(p,'pitch_system'),l=VA.spineRight(t.layout);
var plan=VA.gridPlan(l,t);
var pos=VA.rowPositions(l,t,'uniform',VA.RAIL_METRICS,{budget:782,plan:plan});
var g=VA.leaderGeometry(l,plan,VA.RAIL_METRICS,pos,{}),n=0;
g.leaders.forEach(function(a,i){g.leaders.slice(i+1).forEach(function(b){
  var lo=Math.min(a.y1,a.y2),hi=Math.max(a.y1,a.y2);
  if(a.laneX>=b.x1&&a.laneX<=b.laneX&&b.y1>=lo&&b.y1<=hi)n++;});});
console.log(n);"
```

Prints **16** on today's `pitch_system` at comfortable density with a 782px
budget. The same check is now a live test in both tiers
(`apps/viewer/tests.js`, `[real] pitch_system's leaders really do cross…`),
asserting `> 0` and saying in its own message that reaching 0 means this
issue was fixed.

> **Correction, 2026-09-15 (review).** This paragraph first read "every one
> of its 16 leaders is in at least one crossing pair". Re-derived: the 16
> pairs are all among the **eight leaders that descend** (`y2 > y1`, indices
> 0–7 in walk order); the seven that still rise, and the one that is flat,
> are in no crossing pair at all. The predicate above is inclusive, so it
> counts a touch as a crossing — a strict segment intersection over the same
> geometry gives **12** pairs across **seven** leaders (0–6). The shape of
> the problem is unchanged; its extent is half what the sentence claimed,
> and that matters to the choice below, because it says the crossings are a
> property of the descending half rather than of the lane allocation as a
> whole. Measured at the same density and budget as the repro; in **angled**
> style the same geometry has **zero** crossings of either kind, which is
> what makes candidate 4 below more than a palliative.

## What it does NOT break

- The endpoint correspondence contract is untouched: every leader still lands
  on its own dot and on its own boundary row's seam, and the browser tier
  measures that at every density, mode and style.
- The alternating bands shipped by `viewer_leader_grid_legibility` are drawn
  from a running maximum of the leaders rather than from the raw "region
  between two of them" precisely so a crossing pinches a band to nothing
  instead of folding a polygon over itself and doubling its own tint. Drawn
  literally it was a visible checkerboard; that is worked around, not fixed.

## Why this is `audience: strategy`

Every fix is a layout-policy change of the kind the DAG page deliberately
fences off, and choosing between them is a design call, not a patch:

1. **Order the lanes by the grid-side seam** rather than by walk order. The
   endpoints stay monotone either way; whether that is crossing-free needs
   proving, not assuming — the last proof of this shape outlived its premise
   by four days, which is the actual lesson here.
2. **Let lanes be reused** (the file already argues reuse buys little width;
   it says nothing about crossings).
3. **Stop centring**, or centre less aggressively — but the centring was
   measured to cut `pitch_system`'s max jog 507px → 208px, so this trades a
   measured win for an unmeasured one.
4. **Route around**: give a descending leader a different path shape, which
   is closest to what the angled-leader view option already offers as a
   reader-side workaround.

Whatever is chosen, the comment in `VA.leaderGeometry` claiming leaders
cannot cross must be corrected — it is a wrong fact with a commit and a
reviewer, which is exactly what `CLAUDE.md` says tracked docs are for.
