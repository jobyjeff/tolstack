---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_flyout_resize_annotator_filter_and_deselect.md
reviewer: agent (review/flyout_resize_annotator_filter_and_deselect)
date: 2026-09-16
verdict: REQUEST CHANGES
blockers: 1
---

# REVIEW 2026-09-16 — flyout_resize_annotator_filter_and_deselect

Branch `handoff/flyout_resize_annotator_filter_and_deselect` (9 commits,
`a484ce7..02e9d9f`) merged into this review branch off `integration` at
`2f4836e`. `integration` had **not** moved since the branch was cut
(`merge-base` = `integration` = review HEAD = `2f4836e`), so the merge was a
clean fast-forward with no conflict to resolve. **`integration` has not been
advanced** — the verdict below is REQUEST CHANGES.

## What I verified, and how

All four tiers re-run in this worktree (`npm install` first, per the lesson's
note), against `--repo C:/workspace/tolstack`:

| tier | result | lesson's claim |
|---|---|---|
| `pytest -q` | **1192 passed, 1 failed, 1 skipped** | matches |
| `apps/viewer/run_tests.cjs` | **437/437** | matches (431 at base — confirmed against the previous handoff's lesson) |
| `apps/annotate/run_tests.cjs` | **81/81** | matches |
| `scripts/run_viewer_browser_tests.mjs` | **21/21 suites** | matches; sub-counts match too (`app file://` 39, `annotate flyout` 39, the new `annotate rail filter + face deselect` 30, `annotate hosted posture` 18) |
| `scripts/run_mutation_witness_tests.mjs` | **51/51 declared mutations witnessed** | matches; all eight new witnesses bite, checked individually in the run log |

The one red pytest is
`test_no_live_document_states_an_unguarded_hardware_entry_count`, tripping on
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`.
Pre-existing, untouched by this diff, and named identically by the previous two
lessons.

Lesson arithmetic re-derived independently and **it holds**: 51 entries in
`scripts/mutation_witnesses.json` (8 new here, counted in the diff); 8 `shot()`
calls in `tests/debug_flyout_and_alerts.mjs` and 8 PNGs committed; `annotate
flyout` 19 → 39 (counted `push(` in `testAnnotateFlyout` at `2f4836e`); 431 and
20/20 at base confirmed from
`LESSONS_20260916_viewer_hover_deslop_and_banner_purge.md`. Two issues filed,
both with correct frontmatter and `found_by:` (not `handoff:`).

I also drove the page myself, in Chrome 152 at 1600×1000 off a repo-root server
with live `data/` from the main checkout, because deliverable 1's whole claim is
a layout claim. That measurement is the blocker below.

## Blocker

### B1. The DAG is never visible beside the flyout, and the check named for it is green over a 100%-covered diagram

**Where:** `apps/viewer/views/topology.js` (`VA.FLYOUT_WIDTH`,
`VA.clampFlyoutWidth`); `apps/viewer/topology_app.js` (`roomBesideFlyout`);
`scripts/run_viewer_browser_tests.mjs` (`uncoveredDag`, the sub-check *"the DAG
is still visible BESIDE it — adjacency is the deliverable, and the strip left
uncovered is at least the reserve"*); the same `uncoveredDag` in
`tests/debug_flyout_and_alerts.mjs`.

**What I measured.** `#topopane` lays out at x=300..1038. But `#topopane` is a
horizontal scrollport holding the rails **and** the grid table; the DAG itself
is the one `svg.tv__rails` the pane renders, and it is pinned at the pane's left
edge. Across **all 21 live studies** its right edge is:

```
pitch_link_thread_region_t                392   tan_link_take2_worst_case_protrusion  390
pitch_link_cotter_hole_clearance          416   vpa_output_shank_out                  402
pitch_link_shank_out                      422   rotor_fastener_grip_u2h..u10h         544
pitch_system_gas_spring_mechanical_stroke 526   pitch_system_gas_spring_branch        550
pitch_system_vertical_hub_to_pitch_arm    556   pitch_system_blade_angle_*/end_stop_* 562
```

The flyout opens at **738** (the clamp, as the lesson says) and its floor is
`FLYOUT_WIDTH.min` = **560**. So at every width a reader can reach, on every
live study, the graph is entirely underneath the panel — the widest DAG (562)
leaves 2px at the flyout's minimum. `?mock=1`, which is what the tier and the
probe drive, is worse: the demo DAG is 78px wide (x=300..378) and
`svgUncovered` is **0** at both the default and the minimum.

`uncoveredDag()` returns `dag.right − max(dag.left, panel.right)` on
`#topopane`, so it reports **300** (= `reserve`) while the diagram is at **0**.
The check passes in exactly the case it was written to catch. The lesson (§2)
had already caught the shallower version of this — *"a covered diagram and an
adjacent one are indistinguishable from the layout tree; you have to compute the
overlap"* — and then computed the overlap against the pane rather than against
the drawing.

**The lesson's stated mitigation does not work either.** §2 says
"`.tv__hscroll` is how a reader brings the rails into the strip". Measured on
`pitch_system_blade_angle_worst`: `.tv__hscroll` does scroll (scrollWidth 1480,
clientWidth 738), but the rails SVG's box stays at x=300..562 at
`scrollLeft: 0` **and** at `scrollLeft: 742`. That is by design and
`views/topology.js:303-310` says so — `.tv__rails` is `position: sticky;
left: 0` inside the scrollport precisely so the rail stays pinned at the pane's
left edge while the grid columns move under it. There is no scroll position
that brings the diagram out from under the panel, and there never can be.

**And DoD item (a) is therefore not met.** The handoff asks for a screenshot of
"the flyout LEFT-docked beside the *visible DAG*, resized wide". Shots 1, 2a and
2b all show an empty strip of pane plus the element grid; no DAG appears in any
of them. Shots 1 and 2b are also the same width (738 both times — the default
already sits at the clamp), so "resized wide" is demonstrated only by 2a→2b.

**Why this goes back rather than getting fixed here.** Making the graph actually
visible beside a left-docked panel is a design change, not a wording fix: it
runs into the `position: fixed` / "opening it cannot shrink or reflow the DAG
pane by construction" decision the CSS header argues for at length. Plausible
answers — shift `.tv__main` right while the panel is open, re-lay-out the rails
to the pane's right, cap the panel at the rails' left edge and accept a panel
narrower than `min`, or take it back to Jeff as "left-docked and DAG-adjacent
are incompatible at 1600px, pick one" — are all the tactical agent's or Jeff's
call. What is *not* optional either way: the guard and the probe must measure
the drawing (`svg.tv__rails`), not its scrollport, and the fixture has to be
able to discriminate (at `?mock=1` a 78px DAG can never survive a 560px panel,
so a mock-only check is structurally silent).

**The mutation tier does not cover this and could not have.**
`flyout-reserves-a-strip-of-graph` witnesses the *fast-tier* check, and that
check is about the clamp's arithmetic (`room − reserve`), which is correct as
arithmetic. Nothing declares a witness for the browser-tier sub-check that
names adjacency — which is the one making the claim that is false.

## Should-fix

### S1. `apps/viewer/README.md` still describes the retired filled export chip on the row

Second sighting of this overlay's own entry (*"A viewer copy change that leaves
`apps/viewer/README.md` describing the old string"*), which was a rework item in
`REVIEW_20260916_reader_facing_copy_and_vocabulary` one handoff ago and whose
remedy is spelled out there: grep the retired rendering across that README
before reading the diff. `apps/viewer/README.md` is not in this diff at all.

- **`:1308-1310`** — "The elements table shows only a confidence chip, a kind
  chip, a short one-line where-ref, and (for the states that cannot wait) a loud
  export/identity chip — that is the whole compact row." Both the loud export
  chip and the zero-width chip are gone from that row; it now carries one
  outlined ⚠ badge (`.chip--alert`) with the words on hover.
- **`:1329`** — "`unestablished` | **filled magenta, on the row's chip AND on
  the panel's block**". The row's chip no longer exists: `.chip--export-*` is
  rendered by no production code path any more (only by
  `tests/debug_flyout_and_alerts.mjs`'s before-shot reconstruction, which
  `apps/viewer/style.css`'s new comment correctly explains).
- Worth a look while you are in there: **`:1203`**, the colour legend's
  "**filled magenta `EXPORT UNESTABLISHED`**" row — still true of the panel
  block, no longer true of anything on a row.

Note that `views/detail.js` and `views/topology.js` do still render
`chip--zero-width`, so the `:1206` legend row stays correct.

## Nits

1. **`apps/annotate/fixtures.js:2`** — "one topology with two edges" where the
   fixture has had three since `639022d`. This branch fixed exactly that stale
   count in `apps/annotate/README.md` (commit `1404c01`, "a count that was
   wrong") and left the sibling copy in the file the count is *about*. Overlay
   entry: *"Your own inline fix left a residue — grep for the other copies."*
2. **`apps/annotate/run_tests.cjs`**, check *"the three fixture edges cover all
   three alerting states plus none, so the badge is exercised over every
   branch"* — `AA.BINDING_STATE_ALERTS` has three alerting states and the
   fixture carries two; the assertion in the body says so itself
   (`badged == ["unbound", "owner_not_in_set"]`). `needs_re_confirmation` is
   never exercised by the fixture, so "every branch" overstates it. The claim
   the check actually makes is "three binding states, two of them alerting,
   one silent". (Same class as this branch's own commit `f952d40`, "a check
   whose claim was wider than the node it read".)
3. **`apps/viewer/views/cards.js:312-320`** — the `--- the citation card: the
   spec-sheet reference ---` header block is now orphaned above `alertsCard`,
   and `citationCard` has no header at all. Move the new block above the
   citation header (or the citation header down onto its function).
4. **Lesson, Counts paragraph** — "The annotator's **two** suites went from 37
   sub-checks to 87 between them" — 87 is 39 + 30 + 18 across **three** suites.
   The enumeration right after it is correct; the noun is not.

## What is good, and should survive the rework

Recorded so the rework does not lose it:

- **The clamp arithmetic itself** (`VA.clampFlyoutWidth`, `flyoutWidthAfterDrag`)
  is right, pure, and pinned with the sign inversion called out explicitly
  against `VA.paneWidthAfterDrag` in the same test. The degenerate cases (no
  layout → px max, not zero; `min` beating the reserve on a narrow window) are
  each stated rather than emergent.
- **`body.tv-resizing .flyout__frame { pointer-events: none; }`** and its
  witness (`flyout-drag-survives-its-own-iframe`, naming the *leftward* drag on
  purpose) is a genuinely non-obvious bug found and fixed with the measurement
  attached.
- **§7a of the lesson** — eight witnesses declared, five reported unwitnessed,
  three of them real guards reading a proxy — is the most useful thing in this
  handoff, and the deselect one (reading `geometry.attributes.color` against
  `userData.baseColors` instead of `_lastPick`) is the right resolution of
  exactly the "two representations of one fact disagree" shape. B1 above is the
  same shape one level up, which is why it is worth saying twice.
- **`filter-element`** as one verb with an empty value rather than a
  `filter`/`show-all` pair, and the two documented non-decisions (`select-edge`
  does not filter; `selectTopology`/`selectStudy` drop the filter) are right and
  argued.
- **Deliverables 2, 3, 4 and 5 all measure as delivered**, in the browser, with
  the screenshots to match: the rail scopes and lifts, the tint comes off on all
  three surfaces, the full-page link carries the panel's own params and is
  re-pointed per launch, and both alert rails consolidated without losing a word
  (4a/4b is a clean before/after).

## For the next reviewer

`docs/prompts/REVIEW_AGENT.md` gained one **Recurring bugs** entry from this
review: *"An 'X is still visible beside it' claim measured against the CONTAINER
instead of the thing drawn inside it."* Two existing entries took a second
sighting and were deliberately left unedited: the `apps/viewer/README.md` one
(S1) and the inline-fix-residue one (nit 1).

No issues were filed: the blocker goes back with the branch, and the should-fix
and the nits go back with it, so nothing here is being left ownerless by an
APPROVE.
