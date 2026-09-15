---
type: chore
priority: med
status: resolved
area: viewer/topology
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `guard_mutation_witness_tier` moved to completed/; not independently verified.
---

# `state.leaderStyle` surviving a topology switch is asserted in two docs and pinned by no tier

Found reviewing `HANDOFF_20260914_viewer_leader_grid_legibility.md` (verdict
APPROVE — this is the one unfixed should-fix from that review, filed so it
keeps an owner after the handoff moves to `completed/`).

## The claim

Two shipped artifacts say the leader-style preference outlives a topology
switch:

- `apps/viewer/topology_app.js`, on `state.leaderStyle`: *"A display
  preference like the three above -- selectTopology() never resets it."*
- `apps/viewer/README.md`, of all four legibility answers at once: *"they
  survive a topology switch like density does"*.

Both are true of the code today. Neither is observable by any tier.

## Measured

Scratch tree from the merged review branch, one line added to
`selectTopology()` in `apps/viewer/topology_app.js`:

```
state.leaderStyle = "jogged";
```

| tier | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 274/274 passed |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 331/331 passed |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 17/17 passed |

The sibling preference is covered: adding `state.jogZoneScale = 1` to the
same function reddens `[real] switching topology keeps the SCALE, not the
pixel width` in both browser modes (142/143, 15/17). So the gap is specific
to `leaderStyle`, not to the persistence contract in general.

## Why it is invisible

`scripts/run_viewer_browser_tests.mjs` toggles the style to `angled`,
measures the angled correspondence, then **toggles it back to jogged**
(`[real] and back in jogged style`) *before* it clicks the
`pitch_link_to_pitch_plate` nav row. The only topology switch in the suite
therefore happens with the preference already at its default, where a reset
and a non-reset are the same state. Same shape as the overlay's *"the whole
deliverable is one line from being silently reverted"* entry: the pure layer
(`VA.LEADER_STYLES`, its `next` cycle) is well tested, and what is untested
is that nothing else writes the field.

## Fix

One assertion, no new fixture: switch topology **while angled** and read the
toggle back.

```js
await page.locator("#leader-style-toggle").click();          // -> angled
await page.locator(navRow("topology", "pitch_link_to_pitch_plate")).click();
await page.waitForSelector("tr.tvrow", { timeout: 5000 });
push("[real] switching topology keeps the leader STYLE too",
  /Leaders: angled/.test(
    await page.locator("#leader-style-toggle").textContent()));
```

Place it beside `[real] switching topology keeps the SCALE, not the pixel
width` so the two halves of the same documented rule sit together, and
restore jogged afterwards so the checks below it are unaffected. Worth
asking at the same time whether `edgeValueOnly` and `edgeLengthMode` — the
older preferences whose precedent both docs invoke — have the same hole.
