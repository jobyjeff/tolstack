---
type: bug
priority: low
status: open
area: tests/browser-tier
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260918_visual_rules_nothing_checks.md
---

# Three of the browser tier's seven `setViewportSize` calls measure straight through the app's 150ms repaint debounce

Surfaced while checking a claim in
`LESSONS_20260918_visual_rules_nothing_checks.md` §1, which says
`scripts/run_viewer_browser_tests.mjs` *"already knew this and waits `450ms`
after each of its three `setViewportSize` calls"*. It does not, and the real
distribution is the finding.

`apps/viewer/topology_app.js:247` re-paints on `resize` behind a **150ms
debounce** — the same timer whose race made
`tests/debug_typography_pass.mjs` abort in five runs of eight
(`ISSUE_20260917_the_typography_probe_crashes_on_the_stack_table_shots_in_five_runs_of_eight`,
diagnosed and fixed 2026-09-18). Every `setViewportSize` in the browser runner
is on a booted topology page, so every one arms that timer:

| line | suite | what follows |
| --- | --- | --- |
| 1495 | `testTheTopologyPage` | `waitForTimeout(450)` |
| 1632 | `testTheTopologyPage` | `waitForTimeout(450)` |
| 1670 | `testTheTopologyPage` | **nothing** |
| 2022 | `testTheTopologyPage` | **nothing** — `cardLayout(BAR_TRIGGER)` measures on the next line |
| 2041 | `testTheTopologyPage` | **nothing** |
| 2988 | `testHeightBudget` | `waitForTimeout(400)` |
| 2997 | `testHeightBudget` | `waitForTimeout(400)` |

2022 is the one worth looking at first: it resizes to `CARD_CAP_VIEWPORT` and
immediately reads a layout, so `beforeBarCard` can be measured against the
*previous* viewport's paint, ~187ms before the real one lands. 1670 and 2041 do
not measure on the next line, but both go on to locate and act on rows the
pending repaint will detach — which is precisely the failure mode the probe
exhibited, and it is a race against a fixed timer, so it depends only on how
long the intervening work happens to take on the day.

Nothing has been observed failing here — the tier is 23/23 green and has been.
This is filed as a latent flake, not a live one, which is why it is `low`.

## The fix already exists in this repo

`tests/debug_typography_pass.mjs` now carries

```js
const RESIZE_DEBOUNCE_SETTLE = 450;
async function resizeTo(page, size) {
  await page.setViewportSize(size);
  await page.waitForTimeout(RESIZE_DEBOUNCE_SETTLE);
}
```

with a comment naming the debounce it is waiting out. Lifting the same helper
into `scripts/run_viewer_browser_tests.mjs` and routing all seven call sites
through it would collapse three spellings (450 / 400 / nothing) into one named
number, and would make the lesson's claim true rather than merely corrected.
The two `400`s should be checked rather than assumed equivalent — 400 is still
> 150 + paint, so they are probably fine, but nothing says why they differ from
the 450s.

(The lesson's sentence and the probe's own comment were corrected in review on
2026-09-18; this issue is the code half.)
