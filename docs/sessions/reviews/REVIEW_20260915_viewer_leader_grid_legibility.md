---
type: review
handoff: viewer_leader_grid_legibility
reviewer: agent
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# Review — viewer_leader_grid_legibility

Five deliverables, all present and all wired. Fourteen of fifteen one-line
wiring mutations died; the one survivor is a coverage gap, not a defect, and
is filed. Two inline fixes, both doc-side, both stated below.

## The mandatory checks

This handoff authors no stack, no element and no citation — it is viewer
presentation only (`apps/viewer/`, plus the browser runner and docs). Checks
1–7 (source_ref tracing, path signs, coherent corners, LMC/MMC direction, RSS,
nominal-in-band, quantised constraints, traced ratio) have **no subject** in
this diff and are recorded as not-applicable rather than passed: no
`docs/tolerance_stacks/`, no `docs/topologies/`, no `data/inbox/specs/`, no
`tolerance_stack/` and no `scripts/build_*` file is touched. Confirmed by
diffstat — the nine changed paths are `apps/viewer/{README.md, tests.js,
topology.css, topology.js, topology_app.js, views/topology.js}`,
`scripts/run_viewer_browser_tests.mjs`, one issue and one lesson. The handoff's
own fences ("do NOT touch `scripts/build_*` or projection schemas; do NOT touch
the rail/bar hover surfaces") are both respected.

## What I verified

**Merge.** `git merge-base --is-ancestor handoff/… integration` → NOT_MERGED,
so the merge was mine and real. It merged clean by `ort` (no conflicts, so no
conflict-resolution note is owed).

**All three tiers, on the merged tree.**

| tier | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 274/274, **node-fs tier SKIPPED** |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **331/331, tier RAN** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 17/17 suites; topology 143/143 sub-checks on both `file://` and http |
| `venv-win/Scripts/python.exe -m pytest -q` | 869 passed, 1 skipped |

The lesson reports 322/324 with two reds it attributes to shared-`data/` drift
owned by other branches. Those two are gone on today's `integration`: the
`--repo` tier is 331/331 here. The lesson's diagnosis stands; the branches it
named have landed.

**No test pollution.** `git status` in the main checkout is clean and nothing
under `C:\workspace\tolstack\data\` was written in the review window, after all
three tiers plus fifteen scratch-tree runs against `--repo`.

**Deliverable 5 against the real document.** `VA.elementDisplayLabel` over the
live `pitch_system` projection shortens 16 rows, including the three the
handoff names: `"blade-root clocking holes to the ring gear"` → `"clocking
holes to the ring gear"`. Probed the function directly at its stated
boundaries: `blade_rooting_torque check` is **not** eaten (word match, not
prefix match), `Blade Root seat` → `seat` (case- and separator-insensitive),
a label that *is* its component's name comes back unchanged, a gap group
(`group.part === null`) comes back unchanged. The match is made against
`group.part`, and `componentCell` renders `group.label` which is `String(part)`
— so the thing compared really is the text in the cell to the left.

**The crossing claim, re-derived.** Ran the issue's own repro: 16 pairs. See
the inline fixes below for what that number is and is not.

### Mutation testing — fifteen single-line reverts

Per the overlay's *"the whole deliverable is one line from being silently
reverted"* entry, one scratch tree (`git archive HEAD | tar -x`), one mutation
at a time, all tiers re-run.

| # | the single edit that undoes it | killed by |
| --- | --- | --- |
| 1 | `railsSvg` stops appending the band paths | fast 272/274 |
| 2 | rows stop getting `tvrow--band-*` | fast 273/274 |
| 3 | `.conf--untraced` back to the `background` shorthand | **browser**, named: *"untraced row … lost its provenance tint to the band"* ×5 sub-checks |
| 4 | `leaderGeometry` ignores `options.zoneScale` | fast 271/274 |
| 5 | the jog grip is never appended | fast 273/274 |
| 6 | `angled` forced false | fast 272/274 |
| 7 | `colgroup()` stops writing inline widths | fast 273/274 |
| 8 | the ELEMENT header grip is never rendered | fast 273/274 |
| 9 | `elementDisplayLabel` unwired from the cell | fast 273/274 |
| 10 | `selectTopology()` resets **both** preferences | **browser** 15/17, `[real] switching topology keeps the SCALE…` |
| 10b | `selectTopology()` resets **only `leaderStyle`** | **nothing — survived all three tiers** |
| 11 | band boundaries are the raw leaders (no running max) | fast 273/274 |
| 12 | a `.tvcol--name { width }` rule reappears in the stylesheet | fast 273/274, *"topology.css must declare no column width"* |
| 13 | the shortened cell loses its full-label hover title | fast 273/274 |
| 14 | `rowBandParity` inverted against the SVG band parity | fast 273/274 |

Mutation 3 is the one that matters most: it replays the exact defect the lesson
says nearly shipped (band tint losing to provenance on the 20 untraced rows of
`pitch_system`), the browser tier goes red, and the failure message names the
row. Mutation 12 confirms the new CSS scanner the stylesheet comment advertises
can actually fail and names the right file. Mutation 11 confirms the
running-maximum band clamp — the subtlest thing in the diff — is observed, and
the fast-tier fixture was deliberately pushed past its own centring to make it
observable, which the lesson records honestly.

## Findings

### Should-fix (unfixed — filed)

**S1. `state.leaderStyle` surviving a topology switch is claimed twice and
pinned nowhere.** `apps/viewer/topology_app.js:53` (*"selectTopology() never
resets it"*) and `apps/viewer/README.md` (*"they survive a topology switch like
density does"*, of all four answers) both assert it. Adding
`state.leaderStyle = "jogged";` to `selectTopology()` leaves fast 274/274,
`--repo` 331/331 and browser 17/17. The sibling claim for `jogZoneScale` **is**
pinned. Cause: `run_viewer_browser_tests.mjs` toggles back to jogged (`[real]
and back in jogged style`) before the only topology switch in the suite, so the
switch happens at the default. Not a blocker — the behaviour is correct today
and deliverable 3 does not state persistence; only the README sentence this
diff added does. Fix is one assertion beside the existing SCALE check. Filed as
`ISSUE_20260915_leader_style_persistence_across_topology_switch_is_unpinned.md`
with the measurement and the patch.

### Fixed inline (both doc-side; no behaviour changed, no test needed)

**F1. "every one of its 16 leaders is in at least one crossing pair" is wrong
— it is eight.** In `apps/viewer/topology.js`'s `leaderGeometry` comment and in
`ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_centred.md`. The
repro prints **16**, and 16 is a count of *pairs*; the leaders involved are
indices 0–7, exactly the eight that descend (`y2 > y1`). The seven that rise
and the one that is flat are in no crossing pair at all. The repro's bounds are
also inclusive, so it counts a touch: a strict segment intersection over the
same geometry gives **12** pairs across **seven** leaders (0–6). Corrected the
comment; added a dated correction blockquote to the issue rather than editing
its text, and recorded there that in **angled** style the same geometry has
**zero** crossings of either kind — measured, and directly relevant to the
issue's own candidate 4. The extent matters because the issue is
`audience: strategy` and is asking someone to choose between four layout
policies: "the descending half crosses" and "every leader crosses" point at
different ones.

**F2.** Nothing else. No code was touched by review.

### Nits (no issue filed)

- `topology_app.js` `scheduleResizePaint`'s pending animation frame is not
  cancelled on `pointerup`. Harmless — the trailing paint draws the final
  value — but it is a frame of work after the drag ends.
- The stylesheet scanner in `tests.js` (`column widths come off the ONE
  array…`) early-returns on `if (!src) return;` when `VIEWER_SRC` is absent.
  It does fire in the fast tier (observed failing, mutation 12), so this is a
  note for the next reader rather than a gap.

## For the next reviewer

Two entries added to `docs/prompts/REVIEW_AGENT.md` under **Recurring bugs**:
the persistence guard that returns a toggle to its default before the only
switch it could observe (S1's shape — and the reason mutating a group of fields
together is worth nothing), and the issue-repro number whose sentence is about
a different population (F1's shape, the doc-side twin of "one number, two
nouns").

Worth carrying forward: this diff's `[real]` browser block is the strongest in
the repo so far — it measures the page at `pitch_system`'s real confidence mix
rather than the demo fixture's, which is exactly what caught the band/provenance
layering before it shipped. Expect the next viewer handoff to be held to it.

## Verdict

**APPROVE.** 0 blockers. Merged to `integration`.
