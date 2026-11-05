---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md
reviewer: agent
date: 2026-11-04
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the_kinematic_grid_is_a_stack_of_sub_stacks

Branch `handoff/the_kinematic_grid_is_a_stack_of_sub_stacks` (tip `8f90bc5d`),
reviewed on `review/the_kinematic_grid_is_a_stack_of_sub_stacks` cut from
`integration` `0816cccf`. It was not already merged
(`merge-base --is-ancestor` false). This is the first review of this handoff,
and the review branch carried no earlier attempt.

**Verdict: REQUEST CHANGES, 1 blocker.** The deliverable itself is good: one row
builder, the rows in chain order, sub-stacks that fold, body tints and dividers
as tokens, a sourcing legend, and a SENSITIVITY column, all pinned value by
value. The blocker shows only on the merged tree. It comes from a browser check
that landed on `integration` after this branch was cut, so the author could not
have seen it. Not merged into `integration`.

## The blocker

**[blocker] On the merged tree, the DAG's sub-stack labels cannot be clicked
once the drawing is scrolled sideways.**

- **Where:** suite "the DAG zoom, Fit and the grid header", sub-check
  `[real] a click on a node, an edge, a sub-stack's label or a grid row never
  moves the drawing sideways -- its scroll and the space before it stay exactly
  as they were, parked or not` (from
  `the_dag_holds_still_and_the_filter_bar_stays_put`, `afbdb3e7`, which is not
  on the handoff branch).
- **Result:** 40/40 on `integration`'s viewer code and 39/40 on the merge. Both
  runs used the same projection, built from the merge.
- **Why it fails:** in the "parked" pass (drawing scrolled 100px sideways)
  `visiblePointOn` finds no sub-stack label to click. A temporary probe,
  reverted, read what `elementFromPoint` returns at each label's centre:
  - "Travel between end stops" (`text[data-substack-toggle]`, box 492–628 ×
    871–880, inside the scrollport 301–838): `path.rail__leaderhit`. A leader's
    hit strip lies over the label, so a reader clicking it gets the leader, not
    the fold.
  - "Plate position at the feather stop" (492–653 × 705–714): `DIV.tv__body`.
    The label is not the topmost hit target at its own centre.
- **Cause:** on `integration` the parked pass clicks a label. The difference is
  this branch's band reorder (`VA.orderBand` → `lit.order`), which reroutes the
  leaders across the sub-stack fields.
- **Fix:** merge `integration` into the handoff branch. Then make a sub-stack's
  label win hit-testing over the leader hit strips and whatever `.tv__body` box
  covers it, so a click on the label toggles the fold at any scroll. Do not
  relax the check. Its count floor is what caught this.
- **Not inline-fixable:** it changes hit-testing order, which is designed
  behaviour, and it needs the browser tier plus a witness to be trusted.

## What I fixed inline (`98010a83`)

All three are within the three prongs. Two of them also need carrying onto the
handoff branch, because a fresh review branch will not have this commit.

- **Should-fix, fixed:** the "no band on file" hover card stopped naming its
  row. `subStackRow` and `edgeRow` now call `VA.kinematicGapCard` with a
  hand-built `{ study }` / `{ edge }` stub, and the card reads `row.name` for its
  title line (`views/kinematic.js`, `kinematicGapCard`). The retired table passed
  the whole row. The stubs now carry `name` (`entry.name` / `fullName`). This
  restores the earlier behaviour; it is not a new design.
- **Nit, fixed:** two comments still said grid rows wear the band parity
  (`topology.css` above `.tvrow--body-t*`; `views/topology.js` step 0 of the
  rails draw, "read by grid() below").
- **Nit, fixed:** the `COLUMNS` comment for SENSITIVITY was out-dented by two
  spaces.

## The merge conflict I resolved (`120913aa`)

`scripts/guard_enumeration.mjs` `DECLARED_GUARDS`: `integration` had re-pinned
for `a_joint_end_lists_its_candidate_faces_…` and `the_dag_holds_still_…`
(fast 632, browser 815/782). The handoff had re-pinned against its own older
base (fast 629, browser 794/761). Neither side is right for the merged tree. I
re-derived the counts with `node scripts/guard_enumeration.mjs --json`:

- fast 632 (632 + 0);
- browser 816 / 783 (815 + 1 / 782 + 1).

These are exactly each side's delta on top of the other. The census pairs on
all three sources, and the commit has no marker lines.

## What I verified

Scope matches the handoff's fence. The chart and the DAG glyphs are untouched,
and `apps/annotate/` is untouched. In `topology_app.js` only the state, wiring
and delegated handlers of the retired table changed, not the respine or landing
code.

DoD, item by item, on the merged tree against a projection built from it:

| DoD item | Status |
|---|---|
| Six linkage rows in chain order | ✓ pinned: `arm → pitch link → plate × 2 → tan link → mount` |
| Travel folded, `±0.82 mm → ±1.417 deg at the −7 deg stop` | ✓ pinned (`deg`, not `°`; the lesson says why) |
| Expands to four rows | ✓ pinned in fast and browser tiers |
| Gap sub-stack last | ✓ pinned, dashed, `not yet authored` |
| Body tints match the DAG containers | ✓ one token set; per-row classes pinned |
| Sourcing legend | ✓ (wording nit filed) |
| SENSITIVITY column | ✓ signed coefficient; a chain row shows its ratio |
| One row builder for both kinds of study | ✓ `edgeRow` / `subStackRow`; `kmtable` deleted |
| Shots at 1600×1000 | ✓ (shots `4_`/`5_` predate the width fix; the lesson says so) |

Other checks:

- **No second combiner in JS.** Every number in a sub-stack header or a term row
  is a projection field (`total.*`, `g.reach`, `g.entry`, `row.coefficient`,
  `row.magnitude`, `linkageFold.worst_case_half`), formatted and never added up.
  `Math.abs(g.entry)` with the sign moved to a prefix is formatting.
- **The mandatory stack checks (1–7) do not apply.** No stack, topology or
  spec-library data changed. The traced ratio is unchanged and not re-derived
  here.
- **Vocabulary.** `VA.CONFIDENCE_WORDS` is keyed through the generated
  `VOCAB.table("CONFIDENCES", …)`, so a new confidence refuses to load. No
  inline literal vocabulary.
- **The handoff's own issues** have correct frontmatter:
  `ISSUE_20261104_the_kinematic_stack_has_no_by_reach_sort.md` (deliverable 1's
  reach sort was not built because it crosses every leader; routed to strategy
  with options) and `…_nav_kinematic_row_witness_reddens_the_page_shape_check…`.
- **Lesson audit.**
  - The fast-tier count reconciles: 623/629 on the branch, 626/632 on the merge
    (+3 tests from `integration`), with the same six reds.
  - The band-crossing counts (7 → 4, 168 → 188) were not re-derived. No command
    in the tree prints them.
  - The shots folder is `shots_20261103_<slug>/`, not the `shots/<slug>/` that
    `CLAUDE.md` asks for since 2026-11-03. Nit; not moved.

## Tests

The tactical record (single-process pytest 1722 passed / 2 failed, both
explained; fast tier 623/629; browser suites re-run after the late fixes;
witnesses 12/12 by hand plus the gate's) is consistent with the diff, so the
pre-merge full suite was not repeated.

**Scratch data root:** `C:\workspace\tolstack\data\scratch\review_kin_grid\root`,
with all six projection families built from the merge commit by this worktree's
builders. The fast tier's freshness line pairs every projection with `120913aa`.

- **Fast tier**, `node apps/viewer/run_tests.cjs --repo <scratch>`:
  **626/632**. The six reds are the pre-existing ones in
  `ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md`
  (open). The result is the same after the inline fixes.
- **pytest risky subset** (`test_js_python_vocabulary`, `test_viewer_readme_doc_facts`,
  `test_viewer_deep_link_contract`, `test_app_type_scale`, `test_mutation_witnesses`,
  `test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`,
  `test_claims_registry`, `test_js_vocabulary_is_generated`,
  `test_architecture_inventory`): **359 passed**.
- **Browser tier**, `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`:
  the kinematic study page passed 24/24 and respine 44/44. Failing or aborted
  suites, with each one re-run on `integration`'s viewer code against the same
  projection:

  | Suite | Merge | `integration` | Reading |
  |---|---|---|---|
  | topology file:// / http | 201/205 | 201/205, same four | pre-existing |
  | 3D pane follows | 30/32 | 30/32, same two | pre-existing |
  | scene pane over HTTP | 8/9 | 8/9 | pre-existing |
  | real render path, crop lightbox | abort | abort (lesson, base) | pre-existing |
  | **DAG zoom** | **39/40** | **40/40** | **the blocker** |

- **Mutation witnesses: not established by this review.** My first run died
  before it started (no `node_modules` in the worktree). My second was
  **contaminated by my own baseline step**: I checked `integration`'s viewer
  files out into this worktree while that run was still reading it, so this
  handoff's own specs reported "the mutation no longer describes a place in the
  tree". I stopped it. The tactical record (12/12 by hand, the browser specs
  witnessed in the gate's run) is the evidence that stands. The re-review owes a
  clean `--changed-since integration` run.
- **No post-merge full suite.** There is no merge to gate.

## Issues filed

- `docs/issues/ISSUE_20261104_the_click_never_moves_the_drawing_check_never_clicks_a_grid_row.md`
  (bug, med): the check's "a grid row" arm has never clicked anything (the grid
  starts at y = 927 in a 900px viewport), on `integration` too.
- `docs/issues/ISSUE_20261104_design_the_sourcing_legend_names_a_red_wash_but_not_the_uncited_one.md`
  (design, low).

## For the rework, and for the next reviewer

1. Merge `integration` into the handoff branch. Carry over the gap-card `name`
   fix from `98010a83` (the two comment fixes too, if convenient).
2. Fix the label hit-testing; then run `--only "the DAG zoom"` and expect 40/40.
3. Re-run the kinematic, topology, respine and seam suites.
4. Run the witnesses with `--changed-since integration`, and nothing else
   touching the worktree meanwhile.

## Re-run 2026-11-04 (round 2) — APPROVE

**Verdict: APPROVE, 0 blockers.** The rework (`38a4866a`, `e7251b6c`, `b7dbdf70`
on top of the author's merge of `integration` `8d8baf7a`) fixes the blocker at
its cause, and every guard it adds is witnessed.

### The merges

`integration` had moved on to `d7e1b034` (the `coaxial_ends_share_one_3d_node`
landing and a master sync). I merged it into the review branch first
(`99aa5de8`), then the handoff (`445f9eb2`).

- `docs/prompts/REVIEW_AGENT.md`: this review's three overlay entries and
  `integration`'s flake entry both kept.
- `scripts/guard_enumeration.mjs`, both merges: both sides' comments kept and
  the pins re-derived with `--json`. After the second merge the handoff's own
  pins (fast 635, browser 823/790) match the merged tree exactly, no orphans.

### The fix

Round 1's probe saw two hit-test losers. The rework found two causes, and both
are fixed:

- **A label ran past the SVG's clipped right edge,** so half of it was neither
  drawn nor clickable. That is the `DIV.tv__body` hit. `VA.subStackLabelPlacement`
  puts a label right of its bar when it fits, and otherwise end-anchors it at
  the drawing's edge, so the real text width decides where it starts.
- **The drawn half lay under the leaders' hit strips.** The labels are now
  appended to `over` after every mark, below the hover label.

The trade-off: along a label's one 9px line, a bar it crosses gives its click
to the label. The code comment says so, and it is the right way round for a
visible button.

### Tests, on the merged tree

Scratch root `C:\workspace\tolstack\data\scratch\review_kin_grid_r2\root`. Its
inputs are copies, not junctions. All six projection families and the crops
were built from `445f9eb2` before any tier ran.

- **Fast tier:** **629/635**. The six reds are the filed ones
  (`ISSUE_20261103_the_slide_re_author_left_six…`). Both new label checks pass.
- **pytest risky subset** (the same 11 files as round 1): **359 passed**.
- **Browser tier, full run:**
  - **the DAG zoom: 41/41.** `clicked 6` covers a sub-stack label both
    parked and not. The new label check saw both labels in both passes, with
    no BAD entry.
  - kinematic study page 24/24, respine 44/44, leaders across the seam 26/26.
  - Red or aborted: topology file:// and http 201/205, the 3D pane 30/32,
    the scene pane over HTTP 8/9, and the real-render-path and crop-lightbox
    aborts. These are the same suites as round 1's pre-existing table, and
    the FAIL lines are the same named checks.
- **Mutation witnesses, `--changed-since integration`,** with nothing else
  touching the worktree: **24/65 witnessed, 65/81 reached, 16 left to the
  sweep (budget), 31m10s**.
  - The blocker's own click-check spec
    (`browser__real-a-click-on-a-node-an-edge-a-sub-stack-s-label-or-a__b7738695`)
    is **WITNESSED**.
  - Every not-witnessed entry is one of three known cases: a fast entry
    blinded by the six filed reds; an entry in the 3D pane suite blinded by
    that suite's own pre-existing reds; or the nav-row spec "another check
    reddened", already filed by this handoff.
- **The rework's own specs, which the gate could not prove:**
  - The browser label spec `…54c25710` was left to the sweep by the budget.
    `--only`: **2/2 witnessed**.
  - The three fast mutations can't be gated while the fast tier is red at
    baseline. By hand (apply, run the fast tier, diff against its six
    baseline reds, restore): **3/3 witnessed**. Each reddened its own declared
    check. The rule mutation also reddened the `[real]` check that stands on
    it. The worktree was clean afterwards.

### Nits (not blocking)

- **The new browser check's floor is loose.**
  `labelsSeen.filter(not below).length >= 2` counts across both passes, so
  one label seen twice meets it. This run saw both labels in both passes
  (4 entries), so nothing hides today. A per-label floor would say "every
  label, in both passes" outright.
- **The first-row zoom check is green on this tree.** The rework's issue
  `ISSUE_20261104_the_first_row_zoom_check_wheels_above_the_drawing.md`
  measured it red at `8d8baf7a`. On `445f9eb2` (integration `d7e1b034`) the
  DAG zoom suite is 41/41, that check included. Its aim is still a fixed
  `y = 200`, so the fragility it names is real. I added an addendum to the
  issue rather than closing it.

### Merge

Merged into `integration` as pre-authorized by the seed. Not merged into
master. The board move (`active/` → `completed/`) is left to the operator, as
it was for `coaxial_ends_share_one_3d_node`.
