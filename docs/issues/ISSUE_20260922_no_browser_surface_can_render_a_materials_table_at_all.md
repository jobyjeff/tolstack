---
type: chore
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md
---

# No browser surface renders a materials table, so every CSS claim about the materials row is unwitnessed

## The gap

`apps/viewer`'s materials table has had a compact source cell since 2026-09-18,
a right-hand pane since the same pass, and a quiet alert mark since 2026-09-22.
Every one of those is a **layout** claim, and the browser tier cannot see any of
them: the materials table is rendered by no page any browser suite loads.

* `?mock=1` offers two stacks — `topology_app.js`'s `mockFixture()` composes
  `VA.demoTopologyFixture()` with `VA.demoFixture()` and exposes `demo_joint`
  plus a copy of it under `demo_joint_standalone`. Neither has materials.
* the one fixture stack that does, `VA.generatedFixture()`'s `demo_fit`, is used
  by `apps/viewer/tests.js` only — it is never put into a page.
* the live projection's two stacks with materials
  (`hub_bearing_thermal_fit_m1` / `_m2`) ARE reachable in the tier's
  `[real render path (non-mock)]` suite, so the table renders there — but no
  sub-check measures anything in it, and every live entry is
  `values_status: "inline"`, so the loud branch is unreachable even there
  (`ISSUE_20260922_the_loud_chips_in_the_live_materials_source_column_are_the_two_provenance_chips.md`).

What this cost, concretely: the 2026-09-22 fold of `CTE NOT TRANSCRIBED` into
the row's alert mark had to be screenshotted by rendering `demo_fit` into
`#stackview` **by hand**, from a throwaway script, with
`VA.renderStack(root, VA.generatedFixture().results.stacks[0], …)` — the same
in-page reconstruction `tests/debug_flyout_and_alerts.mjs` uses for a *retired*
presentation. That is the right technique for shooting something that no longer
exists; using it to see something that ships today means the shipping thing has
no tier.

## The fix, and the one thing that makes it not a one-liner

Add the materials stack to `mockFixture()` as a second loose leaf, the way
`demo_joint_standalone` was added for exactly this reason (its own comment: *"a
second copy of the same rich fixture, under an id no topology's crop_key names,
gives the tour (and the browser tier) a real LOOSE stack too"*).

The catch is that the browser tier asserts the nav leaf **count**:

```
push("the nav lists exactly the stacks no topology re-expresses",
  await page.locator('[data-nav-kind="stack"]').count() === 1);
```

and `[real] the live materials column…` style checks elsewhere key on two
leaves. So the change is: one fixture edit, that assertion's number, and the
two nav-count sub-checks in `scripts/run_viewer_browser_tests.mjs` — then the
materials row's compact cell, its alert mark and its pane become measurable,
and the `?mock=1` tour gains the one archetype it cannot currently show (a
thermal fit's CTE table is the whole mechanism of that archetype).

Worth doing in the same pass, once the table is on a page: the mark's
centring, the cell's 260px clip and the chip wrapping are all claims only a
layout engine can check, and the `?mock=1` tour is where a reader meets the
materials table for the first time.
