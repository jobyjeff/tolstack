# Lessons — the_suggestion_and_take_real_checks_wait_on_a_settled_tree

## The suggestion suite: three red shapes, one cause

Baseline `--only "a suggestion names its face"` against the main checkout's
projections (`--repo C:/workspace/tolstack`, tree `69c6f779`): **red 4 of 5**.
The runs were red in different places, which is what a race looks like:

| run | what went red | wall |
|---|---|---|
| 1 | line rendered (face 134), but the 180 s wait for the mount's part never saw it, then Take wrote nothing, then page 2's armed ranking was null | 355 s |
| 2 | the line never appeared (`face NaN`), so `mountSha` was `undefined` and the 180 s wait could not succeed | ~400 s |
| 3 | line and Take fine, the hover never washed the face (`__lastWash` null in 15 s) | 101 s |
| 4 | green | 103 s |

On run 2 the pane was healthy (49 parts open, sweep bodies 30, no failed
requests, no notice), so the miss was on the nav side: `openBody` clicked
twisties with `.catch(() => {})` while the page was still opening the sweep's
parts one by one and repainting the tree, and never read back whether the
click took. Run 3 is the same shape for a hover: `line.hover()` on a node the
repaint then replaced, swallowed. The 250 s tail on a red run was the later
waits keying on something the first miss had made impossible.
Attribution for runs 1 and 2 is measured (run 2's pane dump) plus inferred
(the missed click itself was not filmed); run 3 is inferred from `__lastWash`.

## What changed

`testSuggestionNamesItsFace` (`scripts/run_viewer_browser_tests.mjs`):
- `openPage(query, settled)` waits for `__sweep.bodies` (the sweep has opened
  every part it will) before the first click on a study's page.
- `expand()` replaces `openBody`'s clicks: wait for the twisty, click it until
  `aria-expanded` reads `true` (re-read each time), throw naming it otherwise.
- the line wait is 30 s and Take waits for its button; the hover leaves and
  rests again up to four times until the pane washes; the mount part wait is
  60 s, not 180.
- `need()` prints `MISSING: <what> (after N ms; pane {...})` and returns false;
  the checks that read it go red. **It does not throw**: the first version
  threw, and the witness gate then reported `browser__real-after-a-take-the-faces-layer-follows-the-partner-en__fe6901ac`
  as "the tier never reached the witness" (a mutated page aborted the suite
  before the check was pushed). Soft waits: 6/6 witnessed. So a precondition
  is named and bounded, not fatal; a red run is now ~1-2 min, not 250 s.

`testAnnotateRailHoldsStill`: `need()` on the Take button on a listed face of
the end, the written event, the partner row selected **with its layer drawn
and the row on screen** (replaces the fixed 1000 ms), the partner end selected
in the pane with its faces listed, and the taken end's body reading bound.

After: suggestion suite **3/3 green** (94, 99, 131 s); holds-still **3/3** alone
and green inside the whole tier.

## Take checks: the red order was NOT reproduced

Baseline `--only` was green; the issue's 14/17 never reappeared. A CPU timing
knob on the baseline (Chrome `Emulation.setCPUThrottlingRate`, applied after
the pane is up; throttling from page creation just aborts the page's own load
at the 30 s handle wait) at **4x and 8x** left it **17/17**, so it is not
simple slowness. The three reds all begin with `!!take`, and `take` is read
from a nav snapshot taken after a fixed 300 ms, so a late Take button turns
exactly those three red; that is the inferred cause and the waits now key on
it. It is not measured. If it flakes again, the new error names the missing
step; start from it.

## Page race

No page defect was proved. The nav replacing its nodes while the sweep opens
parts is by design; it is the suite's job to wait for it.

## Replay commands

```
node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "a suggestion names its face"
node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "annotate rail holds still"
```
Redirect to a file, never `| tail` (it prints nothing until the run ends and a
backgrounded run's output looks empty). A throttle replay is a scratch copy of
the runner with the `Emulation.setCPUThrottlingRate` call after the pane's
joints are up; delete the copy, an untracked `scripts/*.mjs` reddens
`test_architecture_inventory`.

## Found red, not this handoff's

The whole tier at this tree is **43/45, 1679.8 s** (budget 1800 s). Both
reds fail identically on the unmodified baseline script and alone, so they are
data, not timing: `annotate rail suggestion` (addendum on
`ISSUE_20261108_the_rail_suggestion_real_check_finds_15_suggested_rows_for_34_open_proposal_edges_on_trunk.md`)
and the map suite's pin-hover check
(`ISSUE_20261118_the_map_pin_hover_real_check_is_red_on_integration.md`).

`pytest -q` has no xdist here (`-n 16` is refused): the default tier is
`pytest -q`, 448 s.
