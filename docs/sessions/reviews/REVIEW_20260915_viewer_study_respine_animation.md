---
type: review
handoff: viewer_study_respine_animation
reviewer: agent (review/viewer_study_respine_animation)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# Review — viewer_study_respine_animation

Work reviewed: `handoff/viewer_study_respine_animation` at `a317539`
(3 commits, +2029/−53 over 11 files), merged into
`review/viewer_study_respine_animation` at `5cfe231`.

The mandatory stack checks (provenance, signs, LMC/MMC, RSS, nominal-in-band,
quantised constraints, traced ratio) **do not apply**: this is `apps/viewer/`
display code plus its tests. No stack, topology, study, spec-parse event,
`hardware_entries.json`, `materials.json` or projection schema was touched, and
nothing under `data/inbox/specs/` or `docs/reference/` moved. Confirmed against
the diff: the only non-`apps/viewer/` source file is
`scripts/run_viewer_browser_tests.mjs` (the browser test runner), and no
`scripts/build_*` was edited — which the handoff explicitly fenced.

## The integration merge, and how its conflict was resolved

`integration` moved from the branch's base to `ee1e0e6` while the handoff was in
flight, picking up `viewer_dag_hover_cards` (`c624f80`). One content conflict, in
`apps/viewer/views/topology.js`'s `railsSvg()`, at two statements:

* **`integration`'s side:** the bar's hit twin and the dot each grew an
  `if (ctx.onCardShow) { cardOnHover(…) } else { …svgTitle(…) }` branch — the
  absorb-not-stack hover-card rule.
* **the handoff's side:** the same two nodes are created through the respine's
  `fade(node, kind, id)` helper, which is what lets an entering element fade in
  at its settled position.

**Resolution: both, composed.** The node is created through
`fade(VA.svg(…), kind, id)` and then gets `integration`'s card/title branch
verbatim. The two sides are orthogonal — one decides what the node *is*, the
other what hovering it *does* — so neither intent was traded away. The leader
path auto-merged correctly (`integration` put no card on leaders). Commit
`5cfe231` records this.

This mattered more than a routine resolution, because the overlay's *"a textually
clean merge can still kill a geometric witness"* entry is about exactly these two
files: re-mutating both merged statements (below) confirms the respine's witnesses
survived the merge intact.

## Tests — re-run in this worktree, after the merge

| tier | result |
|---|---|
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` | **869 passed, 1 skipped** |
| `node apps/viewer/run_tests.cjs` | **292/292** (node-fs tier skipped: no projection in a worktree) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **353/353** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **18/18 suites**, incl. `[topology file:// respine] 30/30` |

The author reported 346/346 on `--repo` pre-merge; 353 post-merge is the seven
hover-card `[real]` tests arriving from `integration`, not drift.

**No production-data pollution.** `C:\workspace\tolstack` is clean and
`find data -newermt '-3 hours' -type f` is empty after all four tiers plus seven
mutation runs. `node_modules` was junctioned from the main checkout for
`playwright-core` and removed before finishing.

## Deliverables

**1. Study selection re-spines the DAG, animated — delivered, with a measured
deviation the author declared.** A study click now sets
`state.layoutMode = "chain"`, so the study's chain becomes the right-justified
spine, the grid re-orders to the sum's order and the leaders follow, as one
transition. The deviation: deliverable 1's *"the rest of the graph re-lays around
it to the left"* describes re-columning the **whole walk**, which deliverable 2's
own words ("study re-lay drops non-chain rows") contradict, and which is not
buildable under the handoff's fences. The author built the mechanism, filed the
ambition (`ISSUE_20260915_respine_shows_the_chain_rather_than_recolumning_the_
whole_walk.md`, `audience: strategy`, four named decisions), and wrote the
reasoning into the lesson. I agree with the reading and with the resolution: of
the two readings only one is reachable without a projection-side change the
handoff forbids. **Checked what pins the shipped rule** (the overlay's "measured
deviation with nothing pinning the rule that replaced it"): the browser tier
asserts `Showing: study chain` after a study click and `chained.rows ===
study.result.chain.length`, so restoring `state.layoutMode = "topology"` goes
red — it is not lesson-only.

**2. Interpolate the position store; no second layout path — delivered.**
`VA.tweenPositions` interpolates one `VA.rowPositions` store into another and
hands the result to `railGeometry`/`leaderGeometry` **unchanged**; no geometry
function was modified, and `railsSvg`/`grid` gained only an opacity helper. The
pairing is by `(kind, id)` rather than by layout row key, which is the correct
call and is tested against the trap directly (`demo_strut_branch`: chain row 3 is
`post_bushing_offset`, walk row 3 is `post_height`, and the test asserts an
index pairing would land >50px away). An element on one side only fades at its
own settled position — asserted in both directions, which is what caught the
author's own first vacuous version. `x` genuinely cannot go through the store
(rails are keyed by column, not by element); absorbing it as one right-anchored
CSS block translate is sound, is documented in three places, and its one visible
cost is filed
(`ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_slides.md`).

**3. Honest states survive — delivered.** The settled frame is a *plain* render
with no tween and no ghost, which is the right architecture for this: it makes
"the animation is presentation only" structural rather than asserted. Floored
marks are OR-ed while moving (nothing mid-flight is a measured proportion — the
honest mark is the one that never under-claims) and settle to the target's own
flag. Provenance classes, the selected accent and the leader endpoint contract
are untouched by the diff and the full correspondence matrix runs on settled
geometry in both layouts × three length modes. `prefers-reduced-motion: reduce`
jumps to the end state, watched with a `MutationObserver` so a single frame of a
ghost would be caught — the honest reading of the preference, not a faster tween.

**Definition of done:** the truth-tier zero-drift claim is met twice over —
`[real]` fast-tier cycles every committed topology's first summing study through
a full select/deselect in three modes and pairs the settled DOM against a fresh
render bar-for-bar; the browser tier reaches the same selection through the
transition and again under emulated reduced motion and diffs the two DOMs
(bars, dots, leaders, rows, break marks, grid offset, SVG width, ghosts,
transforms, inline opacities). Both carry non-vacuity witnesses. The lesson
carries the frame budget the handoff asked for (15 frames, 1.83/2.82ms mean,
4.30ms worst against 16.7ms) and the sharp answer on what the store could not
express.

## Mutation testing — five fired, one survived

The overlay's *"the whole deliverable is one line from being silently reverted"*
entry is the reason this is the core of the review. The author ran 21 one-line
reverts and observed every one failing; I re-ran five independently **in the
merged tree**, plus two of my own.

| # | mutation | result |
|---|---|---|
| M1 | `views/topology.js`: disable the `VA.tweenPositions` call in `renderTopoPane` | **red** — 3 fast-tier tests |
| M2 | the dot's `fade(…)` id, in the *merged* hunk | **red** — fast tier |
| M3 | the bar-hit's `fade(…)` id, in the *merged* hunk | **red** — fast tier |
| M4 | `topology_app.js`: `onNavStudy` → `rewind` instead of `respine` | **red** — respine 21/25, render-crash suite too |
| M5 | `paint()` no longer cancels a running transition | **red** — precisely the interrupt sub-check |
| M7 | remove the no-op guard (`serialisation() === paintedSerialisation`) | **red** — via the non-mock real-render suite |
| M6 | `state.layoutMode = chainable(studyId) ? "chain" : "topology"` → `"chain"` | **GREEN in all three tiers** |

M2/M3 are the answer to the merge risk: the respine's fade witnesses were not
killed by the hover-card merge. M6 is the one finding of substance below.

## Findings

### Should-fix (both filed as issues; neither blocks)

1. **`chainable()`'s false branch is unwitnessed in every tier.**
   `apps/viewer/topology_app.js`, `onNavStudy`. Forcing a refusing study onto
   the chain layout leaves the fast tier 292/292, `--repo` 353/353 and the
   browser tier 18/18 — while the shipped page would caption itself *"Showing:
   study chain"* over the whole walk, with the toggle `disabled` so the reader
   cannot correct it. The behaviour as shipped is right; only the guard is
   unpinned. The author's 21-mutation sweep missed it because a mutation list is
   written from the **deliverables**, and this branch is a defensive answer the
   author invented while building. Filed:
   `ISSUE_20260915_a_refusing_study_staying_on_the_walk_is_unwitnessed_in_every_tier.md`.
   Not a blocker: no deliverable asked for it, and every line the handoff *did*
   ask for is witnessed (M1–M5, M7).

2. **`VA.tweenPositions(from, to, 1)` is not "the target store exactly".** It
   deliberately unions in every node/edge the outgoing store had, so the settled
   store carries `arm_tip` and `post_arm_pin` at their outgoing y — measured by
   adding two key-set assertions to the test of that name, which fails
   immediately. Nothing drifts in the DOM (both geometry passes iterate the
   layout, not the store, which three tiers confirm), so this is a claim/guard
   defect rather than a rendering one: the test's scope structurally excludes the
   leak it is named for. Filed:
   `ISSUE_20260915_a_settled_tween_store_is_not_the_target_store_it_keeps_the_outgoing_sides_keys.md`.

### Nits (no issue; grouped)

3. **An arriving grid row fades at e², not e.** `views/topology.js`: the grid
   block carries `rows.style.opacity = tween.e` *and* each entering `<tr>` gets
   `fade(…)`'s own alpha `e`, and CSS composes them. Cosmetic, and both curves
   still run 0→1, but it is not what either comment describes.

4. **`chainable()` is a third spelling of one predicate.** `layoutFor()` uses
   `status === "ok" && study.layout`, the toolbar's `studyOk()` uses
   `status === "ok"` alone, and `chainable()` adds a third copy. Its comment
   cites the toolbar's disabled test as "the one condition the chain layout has
   ever had", which omits the `.layout` clause. They are equivalent *only*
   because `scripts/build_topology_projection.py` sets `row["layout"]` on every
   path where `status` stays `"ok"` — verified, but nothing in JS-land pins it.
   Second sighting of the overlay's "second copy of a producer's condition"
   entry, so no new entry.

5. **`paintedSerialisation` is assigned at the end of `paint()`**, so a paint
   that throws into `renderCrash` leaves it stale and the next respine's no-op
   guard decides from a pre-crash value. Reachable only after a render crash,
   which is already a terminal banner state.

6. **Pre-existing, filed rather than fixed:** `apps/viewer/README.md`'s
   column-reuse bullet still says *"nine allocations over nine columns for the
   pitch system, two over two for L1"* over *"the two committed topologies"* —
   the live projection is 10/10 for `pitch_system` across five topologies — and
   it now contradicts the newly **guarded** "walk needs 10 columns" sentence
   ~350 lines below it in the same file. Out of this handoff's scope (it predates
   it by five weeks). Filed:
   `ISSUE_20260915_the_viewer_readmes_rail_allocation_measurement_is_stale_and_unguarded.md`.

### Checked and clean

* **Lesson leftovers all have issues.** Every "named, not fixed here" item in the
  lesson — the x-slide's grow direction, the whole-walk re-columning, the grid
  cross-fade — carries a `docs/issues/ISSUE_*.md` with correct frontmatter
  (`type` in the closed set, `priority`, `status: open`, `area`, `reporter`, and
  `audience: strategy` on the two that need design). Nothing to file on the
  author's behalf.
* **The guards were observed failing, not accepted on green** — seven mutations
  above, and the author's own sweep names the three that survived its first pass
  and what each taught.
* **Restated counts are paired.** The README's new `10 columns` / `1 column`
  sentence is pinned to `livePitch.layout.columns` and every summing study's
  `layout.columns` by a fast-tier `[real]` test. `VA.RESPINE.duration` is a
  module constant; the lesson's timing table is a dated measurement, not a
  quantity a doc asserts.
* **No new module**, so `ARCHITECTURE.md`'s inventory needs no row; nothing
  reads `lmc`/`mmc`; no second combiner; nothing written into drawing-checker;
  no vocabulary added as an inline literal (`VA.RESPINE` is a named constant).
* **An animation frame is inside a crash seam.** `animateTopoPane` takes
  `onError` and the shell passes `renderCrash`; both tiers seed a throw on the
  *second* render so the check cannot be satisfied by the synchronous first
  frame. This is the 2026-09-09 silently-empty-pane incident answered one seam
  further out, and it is the diff's best judgement call.
* **Hover cards vs. a respine** (a merge interaction, not a finding): a card is
  mounted in `nodes.crop`, outside the pane, positioned against its trigger —
  which a transition detaches every frame. Reaching a nav click without first
  firing `mouseleave`/blur on the trigger is not a real gesture, and the browser
  tier's 18/18 includes the full hover-card suite post-merge. Noted, not filed.

## Overlay

Two new **Recurring bugs** entries in `docs/prompts/REVIEW_AGENT.md`, both new
failure classes rather than second sightings:

* *"The deliverable is mutation-tested and the guard the author added on their
  OWN initiative is not"* — with the mechanism (a mutation list is written from
  the deliverables) and the cheap habit that finds it.
* *"An interpolator claimed to be the identity at its far end — check the KEY
  SETS, not the values at the shared keys."*

## For the next reviewer

This is among the strongest tactical work in this repo's history: the animator
adds no second layout path, no geometry function moved, the settled frame is
structurally a plain render, and the lesson answers both questions the handoff
asked it with numbers. The two respine `[real]` witnesses are the pattern to
copy — *settled equals fresh* paired with *the two states are not the same
picture*, because the first is vacuous without the second.

Two things to carry forward. The **in-flight probe** (`catchFrame`) is now the
reusable way to prove a control animates rather than repaints; a settled-state
check passes just as well on a repaint, so each control that should animate needs
its own caught frame. And when a handoff's deliverables disagree, the author's
rule — *build the mechanism, file the picture* — is the right resolution and is
worth quoting back.

**Verdict: APPROVE.** Merged into `integration`.
