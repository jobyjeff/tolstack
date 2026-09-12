---
priority: low
depends_on: []
model: opus
---

# HANDOFF 2026-09-11 — viewer_browser_tier_wait_predicates: two browser-tier waits that resolve on a boot transient

Source: triage sweep 2026-09-11, folding two issues that live in the same runner —
`docs/issues/ISSUE_20260911_served_mode_connect_folder_banner_check_is_flaky.md`
and `docs/issues/ISSUE_20260911_annotate_flyout_banner_check_samples_a_transient.md`.
Both were filed from the same 2026-09-11 review session's runs; the first issue
explicitly notes the mechanisms differ and **neither fix covers the other**, so both
are in scope here — they are staged together only because they edit the same file.
Baseline: trunk after the 2026-09-11 batch merge. Scope:
`scripts/run_viewer_browser_tests.mjs`; do NOT touch `apps/viewer/topology_app.js`
or `apps/annotate/` — the parallel `viewer_popover_clamp_and_rebuild_terminal_state`
and `annotate_load_gate_settles_on_failure` handoffs own those.

Both defects are **false negatives** — flaky failures on correct code — not missed
defects. That matters for how you verify: a fix here is only proven by showing the
wait now cannot resolve on the transient, not by a green run (the failing runs were
1-in-3 and 1-in-4, so green proves nothing on its own).

## Deliverable 1 — the served-mode connect-folder banner check races the boot

Seen once in four otherwise-identical runs of
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
(2026-09-11, Chrome 152.0.7977.83 via `channel: 'chrome'`, headless):

```
[served mode (repo-root static server)] 10/11 sub-checks passed: FAIL
    FAIL sub-check: [real] the connect-folder banner never appears
```

`testServedModeBoot` waits with
`await page.waitForSelector('tr.tvrow, .banner--disconnected', ...)` and then
asserts `.banner--disconnected` is absent. But `apps/viewer/topology_app.js`'s
initial state is `connection: VA.STATE.DISCONNECTED` (line 17), so the **first
paint** — before `chooseAdapter`'s HTTP probe resolves — legitimately renders the
connect-folder banner. The disjunction can resolve on that transient, and the
assertion then samples it before the probe has replaced it. The contract under test
is about the **settled** state ("zero manual steps to see the DAG"), which the
transient does not violate.

Fix shape from the issue (suggested, not binding): wait for the settled render
(`tr.tvrow`, which the suite already waits for three lines later) before sampling
`#banner` at all, and keep a bounded timeout so a genuinely stuck disconnected boot
still fails — as a **timeout**, not as a banner sighting. Preserving that
distinction is the point; do not simply widen the wait.

## Deliverable 2 — the annotate flyout's pre-connect check reads an empty banner

Seen once in three runs of the same command, same session:

```
[annotate flyout (repo-root mount + file:// degradation)] 13/14 sub-checks passed: FAIL
    FAIL sub-check: the embedded annotator boots to an honest pre-connect state
```

`testAnnotateFlyout` does:

```js
const flyoutBanner = page.frameLocator("#annotate-flyout iframe").locator("#banner");
await flyoutBanner.waitFor({ state: "visible", timeout: 15000 });
const bannerText = await flyoutBanner.textContent();
```

`apps/annotate/index.html` ships `<div id="banner" class="banner"></div>` — present
and **empty** from first paint — and `apps/annotate/style.css`'s `.banner` carries
`padding: 6px 16px`, so that empty div has a non-zero bounding box and Playwright
calls it **visible immediately**, before any `setBanner()` has run. The wait is
satisfied by the pre-boot element rather than by the pre-connect message, and
`textContent` can sample `""`, failing the `/Connect folder|File System Access/`
regex.

The general rule worth applying, and worth stating in the lesson: `waitFor({state:
"visible"})` on a **padded empty element** is not a wait for content. Anchor the
wait on the effect you are about to assert.

## Deliverable 3 — check whether the same shape exists elsewhere in this runner

Two instances in one file, found in one session, is a pattern rather than a
coincidence. Grep `scripts/run_viewer_browser_tests.mjs` for the two shapes — a
`waitForSelector` disjunction that includes the very state the next line asserts is
absent, and a `waitFor({state:"visible"})` immediately followed by a `textContent`
sample — and report what you find. Fix what is clearly the same bug; if something is
ambiguous, file it rather than guessing. This repo's `docs/prompts/REVIEW_AGENT.md`
already carries an entry for waits weaker than their assertions; anything you find
here is a sighting of it.

## Definition of done

- Both named sub-checks pass, and — the part that actually matters — you can state
  **why** the transient can no longer satisfy each wait, from the code, not from a
  run count.
- A genuinely stuck disconnected boot still fails deliverable 1's check (demonstrate
  it: force the condition and show the failure). Losing that is the obvious way to
  "fix" flake wrongly.
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q`), plus
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`.
- Lesson (`docs/sessions/lessons/LESSONS_20260911_viewer_browser_tier_wait_predicates.md`):
  deliverable 3's findings, and the padded-empty-element trap stated generally
  enough that the next runner author avoids it.
