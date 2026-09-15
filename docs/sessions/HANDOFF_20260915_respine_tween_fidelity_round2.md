---
priority: med
depends_on: [mutation_witness_tier_repair]
model: opus
---

# HANDOFF 2026-09-15 — respine_tween_fidelity_round2: the "nothing appears from nowhere" claim is false from a transition frame

Source: triage sweep 2026-09-15, consolidating three issues filed out of
`respine_tween_fidelity` (completed 2026-09-15) and its review. Baseline: trunk
after the 2026-09-15 batch merge, **plus** `mutation_witness_tier_repair`
merged. Scope: `apps/viewer/topology.js`, `apps/viewer/views/topology.js`,
`apps/viewer/README.md` (respine sections only), the respine checks in
`apps/viewer/tests.js`, and `testRespine` in
`scripts/run_viewer_browser_tests.mjs`. Do NOT touch `apps/annotate/`
(`annotate_hosted_page_posture` owns it) and do not edit the value-guard tables
in `apps/viewer/tests.js` or the hover-card sections of
`apps/viewer/README.md` — `viewer_value_guard_rows_and_replays` is sequenced
behind you and owns those.

**Why `depends_on: mutation_witness_tier_repair`:** you add sub-checks to
`testRespine` in `scripts/run_viewer_browser_tests.mjs`, which that handoff
restructures (single-sourcing the suite labels) and whose sub-check names it
brings under a `scripts/mutation_witnesses.json` pairing test. Landing it first
means a renamed or added respine sub-check is caught by pytest rather than by a
later browser sweep, and keeps the two handoffs out of each other's diff in
that file.

Read all three issues in full — the first carries the decisive measurement:

- `docs/issues/ISSUE_20260915_an_interrupted_respine_pops_nine_rails_in_from_nowhere.md` (bug, med)
- `docs/issues/ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_column_has_no_fade.md` (bug, low)
- `docs/issues/ISSUE_20260915_the_respine_is_unwitnessed_with_the_pane_scrolled_sideways.md` (chore, low)

## The single defect behind the first two items

Rails and links carry no opacity of their own, and three places justify that on
the strength of `VA.respineX` interpolating the drawn column count:

- `apps/viewer/views/topology.js`, `railsSvg`'s comment 1 — *"a column the
  transition is adding is drawn collapsed onto the spine at e = 0 and unfolds
  out of it, so there is nothing to appear from nowhere"*;
- `apps/viewer/README.md` — *"A surviving rail starts exactly where the outgoing
  frame drew it"*;
- `ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_column_has_no_fade.md`'s
  own "Why it is not observable today" — which is what made that issue `low`.

All three hold when the outgoing frame is a **settled** one and are false when
it is a transition frame — the case `VA.lastTopoRender.columns` was deliberately
made fractional to support. Measured straight off the shipped functions
(synthetic 10-column walk, 1-column chain, `VA.RAIL_METRICS`):

```
frame A (select walk -> chain, e = 0.5): rails [105]                            width 136
frame B (interrupt: deselect, e = 0):    rails [15,15,15,15,15,25,45,65,85,105] width 136
```

Nine rails appear at once, from nowhere. So the "not observable today"
reasoning that priced the second issue `low` is itself falsified by the first:
an **interruption** reaches the no-fade case now, without waiting for the
re-columned walk that `docs/strategy/BRIEF_20260915_respine_scope_and_grid_motion.md`
item 1 would introduce. Treat these as two directions of one defect, not two
bugs — that is why they are in one handoff.

## Deliverables

1. **Make the interrupted respine correct, and make the three claims true or
   gone.** Either give rails and links a real opacity story, or make the
   fractional outgoing frame the thing the incoming transition starts from so
   the unfold argument actually holds from any frame. Weigh both: a rail belongs
   to a *column* and a link to a *pair* of columns, so neither is in the store's
   keyed `alpha` map (`VA.tweenPositions`) and neither can be — the same fact
   the x tween is built around — which is the reason the opacity route was
   avoided the first time. Whichever you pick, the two comments and the README
   sentence above must end up stating what the code actually guarantees, with
   the qualifier ("from a settled frame") either removed by the fix or written
   into the claim. A fix that leaves any of the three claims unconditional while
   the guarantee is conditional is not done.

2. **Cover the surviving-column case that item 1's reasoning currently
   excuses.** A rail or fan-out on a column **both** serialisations have is
   drawn at full opacity from the first frame whatever the transition is doing.
   It is unobservable in the committed corpus for a structural reason worth
   keeping in the test: all 21 study chains across the five topologies have
   `columns: 1` and `links: []`, while their walks run 2–10 columns and 2–18
   links, so every link a respine adds today arrives on a column the respine
   also adds. Add a check that exercises the shared-column case **synthetically**
   (two serialisations differing by something other than column count — a loop
   closure present in one and not the other), so the guarantee is pinned before
   the re-columned walk in the brief above makes it reachable in real data.

3. **Witness the respine with `.tv__hscroll` scrolled sideways.** Every respine
   check in both tiers runs at horizontal scroll zero, and the browser tier's
   in-flight probe asserts `live.scrollLeft === 0` as a *precondition* for its
   box measurements (`testRespine`'s `catchFrame`) — stating the gap rather than
   covering it. Since `VA.respineX` the SVG is drawn at the interpolated pane
   width, which grows 82 → 316px on the real `pitch_system` over a deselect and
   shrinks over a select, so the pane's content width now changes *during* a
   transition. Two consequences nothing measures: a browser **clamps
   `scrollLeft`** when content shrinks, so a reader scrolled to the right end
   may see the pane jump horizontally partway through a select; and
   `.tv__rails { position: sticky; left: 0 }` should keep the DAG pinned to the
   visible left edge throughout — by construction, unasserted. Repro shape given
   in the issue: in `testRespine`, before the study click, set
   `live.scrollLeft = live.scrollWidth`, then catch a frame and take the same
   `dagLeft` / `dagPastGrid` boxes plus `scrollLeft` before and after. This is
   browser-tier only — neither the fixture tier nor the DOM shim can scroll a
   pane; say so in the check's name or comment rather than leaving a reader to
   wonder why it has no fixture-tier twin. If the clamp turns out to produce a
   visible jump, that is a finding: fix it if it is in scope, file it if it
   opens a design question.

## Definition of done

- A check reproduces the interruption in the measurement above (a transition
  frame at `e = 0.5` interrupted by a deselect) and fails on the current code —
  demonstrate it failing before the fix, and green after. Put both rail arrays
  in the lesson.
- The synthetic shared-column check from deliverable 2 is present and
  meaningful: it must redden if the opacity/unfold guarantee is removed.
  Demonstrate that.
- `testRespine` runs the scrolled-pane arm and asserts the sticky-rails
  invariant plus `scrollLeft` before/after; the real `pitch_system` topology is
  the named subject (`C:\workspace\tolstack\data\projections\viewer\topologies.json`
  — gitignored, so read it from the main checkout by that absolute path).
- `venv-win/Scripts/python.exe -m pytest -q` green (baseline 880 passed,
  1 skipped); fixture tier and browser tier green, the latter run with
  `--repo C:\workspace\tolstack` so the `[real]` checks are not skipped.
- Lesson (`docs/sessions/lessons/LESSONS_20260915_respine_tween_fidelity_round2.md`):
  which of the two routes in deliverable 1 you took and what made the other one
  worse; the exact wording the three claims ended up with; and whether the
  `scrollLeft` clamp produced a visible jump on the real topology — that answer
  is the thing the next agent cannot derive from the diff.
