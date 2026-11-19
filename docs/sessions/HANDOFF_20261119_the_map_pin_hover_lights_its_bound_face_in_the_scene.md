---
priority: med
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — the_map_pin_hover_lights_its_bound_face_in_the_scene: find why the map's pin hover lights nothing in the 3D pane, and fix it

Source: triage batch merge 2026-11-19
(`dispatch/docs/sessions/lessons/LESSONS_20261119_triage_sweep.md`), routing
`docs/issues/ISSUE_20261118_the_map_pin_hover_real_check_is_red_on_integration.md`.
Baseline: trunk `f510260e637d` (integration fast-forwarded to it).

## The red

`node scripts/run_viewer_browser_tests.mjs` (whole tier, main checkout,
trunk `f510260e637d`, projections rebuilt first) is 45/46. The one red is the
map suite, 29/30, sub-check:

> `[real] a pin hovered on the map lights its feature's row in the tree (or the closed fold holding it), the dimensions at it in the grid, the pin itself and its connector on the map, and its bound face in the scene`

Its own diagnostic line on that run:

    pin hovered: tree hot [] holds ["hub"], grid hot [4 hub dimensions],
    map lead ["feature:hub@hub_spindle_bore_axis"], pane null

So three of the four surfaces answer and the **scene answers `null`**. The
issue measured the same single red at `69c6f779` (11-18) on the whole tier,
on `--only`, and on the unmodified baseline script, so it is deterministic
rather than timing. It was green at the 11-17 batch merge (`1f8c6381`, 45/45),
so a commit between `1f8c6381` and `69c6f779` brought it in: that range is
where to look first (`git log 1f8c6381..69c6f779 -- apps/ scripts/run_viewer_browser_tests.mjs`).
The review of `the_pitch_plate_is_an_assembly_with_its_bushings` recorded it
pre-existing as well.

## Deliverables

1. **The cause, stated in the lesson.** Decide between two possibilities: the
   page stopped lighting a bound face on a map-pin hover (a product
   regression), or the check reads a pane state or a binding that the
   real data no longer holds, e.g. the hub spindle bore's binding was
   superseded or retracted in Jeff's log, or the pane is not open or not
   loaded when the hover fires. The issue's guess was that the "bound face in the
   scene" clause reads the main checkout's served log.
   Jeff's log at `C:\workspace\tolstack\data\inbox\feature-identity\` is
   **read-only**. Count its files before and after.
2. **The fix at the right side.** If it is a product regression, fix the page
   and keep the check as it is. If the check's premise has gone stale, make it
   pick a feature that *is* bound in the log it reads, or announce honestly
   when none is, using the same pattern as the suite's other `[real]` checks
   that wait on a settled tree. **Never weaken the clause to make it pass.**
3. The suite `--only "the map (the counts"` is green, and the whole tier is run
   once at the end with its ledger row cited. Any witness spec you touch goes
   through `--only`.
4. Advance the issue: `handoff: the_map_pin_hover_lights_its_bound_face_in_the_scene`
   is already on it. Write a verified `resolution:` when green.

## Out of scope

The browser tier's wall time (`ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`)
is a separate issue.
