---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261001_kinematic_sweep_animation.md
class: unreviewed_design_debt
defer_until: class:unreviewed_design_debt
resolution: deferred 2026-10-01 (triage, second sweep) -- low, and the budget rule defers low by default. Grouped on its class so the set is judged together.
---

# Design: three things on the sweep bar the 2026-10-01 screenshots happen not to show

Filed from review `kinematic_sweep_animation` as design findings, which never
block a merge (canonical `REVIEW_AGENT.md`, "The changed surface reads as
designed"). Sweep mode's bar is otherwise a careful piece of work — one line
at rest, hierarchy from weight and spacing, tabular numbers, no boxes inside
boxes. These three are the exceptions.

## 1 — the readouts grid pairs a label with its value only when the column count happens to be even

`apps/annotate/style.css`:

```
.an__sweep-readouts {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
```

`dt` and `dd` are separate grid items, so a `dt` lands in the cell after the
previous `dd`. That reads as paired columns only while `auto-fit` resolves to
an **even** number of tracks. At the screenshot's width it resolves to four
(two pairs) and the bar reads correctly; one track wider — a detail pane of
about 1050 px, which is an ordinary maximised window — it resolves to five,
and every label after the first row sits above or beside somebody else's
number. The fix is to make the pair the grid item (`repeat(auto-fit, minmax(…))`
over a wrapper, or `grid-auto-flow: row dense` with an explicit two-track
sub-grid), not to widen the `minmax`.

## 2 — the summary line renders the producer's raw mechanism id at the reader

`AA.sweepSummaryParts` pushes `artifact.mechanismName` verbatim, so the bar
reads `vpa-pitch-p1-20261001-203656 · geometry from the motion sheet ·
vpa_pitch_chunk0_p1 · 80 points` (the 2026-10-01 screenshots show exactly
this). Every other name on this surface goes through `AA.measureLabel`, which
is why no readout label and no body row shows an underscore — the browser
check asserts that for the readouts, and the summary line is simply not in
its scope. `vpa_pitch_chunk0_p1` is an internal slug standing in as the
human-readable title, the shape canonical `REVIEW_AGENT.md` lists under "A
surface that shows the reader something only the code knows". The run id
beside it is deliberate and should stay; the mechanism name should read as
words.

## 3 — Space and the arrow keys reach the global transport handler while a control in the bar has focus

`app.js`'s `keydown` listener returns early only for `INPUT`, `SELECT` and
`TEXTAREA`. Its own comment states the intent more broadly — "ignored …
while a control that uses the same keys (the scrubber itself) has focus" —
but the bar's `<button>`s and the two `<summary>` elements (Help, "N of M
parts placed") are neither. After clicking ▶ or opening the bodies
disclosure, Space is claimed by the transport and `ev.preventDefault()` runs,
so the focused control's own activation is suppressed. Matching on "is the
event target a focusable control inside the bar" rather than on three tag
names is the fix.

## Done when

Each row is fixed or closed with its reason. Row 1 wants a width in the
browser check that resolves to an odd track count, so the pairing is observed
and not argued.
