---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-14 — guard_mutation_witness_tier: pin each guard to the mutation it must redden on, and repair five that redden on nothing

Source: triage sweep 2026-09-14/15. This is the sweep's **bug-class handoff**:
five separate issues, filed by five different review sessions, are the same
failure shape, and three of them were only found because a reviewer mutated the
code by hand and noticed the suite stayed green. Baseline: trunk after the
2026-09-14 batch merge (98 commits landed; projections rebuilt from one tree,
all three stamping `head_sha=243749ab4602`). Scope: `apps/viewer/tests.js`,
`scripts/run_viewer_browser_tests.mjs`, and whatever small harness the
mutation tier needs. Do NOT add `TOPO_VALUE_GUARDS` rows or touch
`tests/test_topology.py` — `HANDOFF_20260914_projection_field_guard_rows` owns
those and is sequenced behind you for exactly that reason. Do NOT change any
app behaviour: every item below is a guard that fails to witness *correct*
behaviour, so if you find yourself editing `topology_app.js` or `views/` to make
a test pass, stop — that is the wrong direction.

## The class

The repeated shape is: **a guard's witness is coupled to an incidental property
of the app, and when the app changes correctly the guard silently stops
witnessing.** Nothing goes red, so nothing announces that the coverage left.
Measured instances, all from 2026-09-11..15 reviews:

| issue | the mutation that ships green |
| --- | --- |
| `card_layout_guard_cannot_see_the_absolute_popover_again` | the room cap subsumed the witness; an in-flow popover no longer lengthens anything measurable |
| `unpublished_banner_has_nothing_pinning_and_nothing_else` | flip one condition to `if (true)` → **fast tier 260/260 and 314 with `--repo`, browser tier 17/17** |
| `a_refusing_study_staying_on_the_walk_is_unwitnessed_in_every_tier` | `state.layoutMode = "chain";` unconditionally → **every tier green** |
| `compact_density_correspondence_check_has_no_positive_anchor` | the check passes at comfortable density too, so it anchors nothing |
| `leader_style_persistence_across_topology_switch_is_unpinned` | asserted in two shipped docs, observable by no tier |

## Deliverables

1. **A mutation-witness tier.** The structural deliverable, and the reason this
   handoff exists rather than five point fixes. Give the repo a way to declare,
   next to a guard, the mutation it must redden on — then a runner that applies
   each declared mutation, runs the owning tier, and fails if the tier stays
   green.

   Suggested shape, to **prototype and report on rather than take as settled**:
   a small table of `{ file, find, replace, expect_red_in }` entries plus a
   runner that patches a copy of the tree, runs the named tier, and asserts a
   failure. All five mutations above are already written out as exact strings in
   their issues, so the table has real content on day one. If a copy-the-tree
   approach proves too slow or too fragile on Windows, say so in the lesson and
   describe what you did instead — the requirement is "a declared mutation that
   is checked", not a specific mechanism.

   Two properties matter more than elegance: a mutation that stops reddening
   must fail **loudly** (that is the whole point), and adding an entry must be
   cheap enough that the next reviewer does it instead of filing an issue.

2. **Repair the five guards** so each reddens on its declared mutation.
   - **`card_layout_guard`** — `CARD_LAYOUT_VIEWPORT` (1600x700) existed because
     at 1000px tall the mock document is taller than the open card, so an in-flow
     popover lengthened nothing measurable; at 700px the card reached ~280px past
     the document's bottom. The room cap has since made the app *more* correct,
     which is what took the guard's teeth out. Its three sub-checks are `an open
     card leaves the document's own height untouched`, `an open card moves the DAG
     pane by nothing at all`, and `leaders still land on their dots and seams with
     a card open`. Restore a witness that distinguishes `fixed` from `absolute`
     under the room cap. Read the issue's full text first — it is explicit that
     the app is not at fault.
   - **`unpublished_banner`** — pin the *"and nothing else"* half, not just the
     sentence. The mutation to catch is `topology_app.js`'s no-adapter branch
     dropping its `transportKind !== VA.TRANSPORT.UNPUBLISHED` condition, which
     puts a "this browser cannot open a local folder … `?mock=1` still runs a
     demo" sentence on a hosted visitor's banner — advice that is untrue of their
     situation.
   - **`a_refusing_study`** — pin `onNavStudy`'s `chainable(studyId) ? "chain" :
     "topology"` false branch. Note the fast tier is *structurally* blind here
     (`topology_app.js` is not loaded by `run_tests.cjs`), so the witness
     probably has to be a browser-tier check or a change to what the fast tier
     loads. Say which you chose and why.
   - **`compact_density`** — give the compact-density correspondence check a
     **positive anchor**. `correspondence()` re-derives endpoints from the live
     DOM, so it measures whatever density is showing; the check needs to assert
     something only true at 16px rows. The issue notes the density toggle is
     clicked and un-clicked around it, so also confirm the toggle actually took
     effect before measuring.
   - **`leader_style_persistence`** — pin that `state.leaderStyle` survives
     `selectTopology()`, as `topology_app.js` and `apps/viewer/README.md` both
     claim ("they survive a topology switch like density does").

3. **Write the class down** in `docs/prompts/REVIEW_AGENT.md`'s recurring-bugs
   list, in one line: a guard whose witness depends on an incidental property of
   the app stops witnessing silently when the app changes — declare the mutation,
   don't just assert the behaviour. This sweep promotes it there anyway; make
   sure your wording and the promoted line agree rather than duplicating.

## Definition of done

- Each of the five mutations, applied by hand, **reddens a named test** — show
  the actual failure output for all five in the lesson. This is the deliverable;
  a green suite proves nothing here by construction.
- The mutation tier runs as part of the repo's normal test story (say where it
  hangs off) and passes with no mutations applied.
- All existing tiers stay green with no mutation: fast tier
  `node apps/viewer/run_tests.cjs` and `--repo C:\workspace\tolstack`, browser
  tier `scripts/run_viewer_browser_tests.mjs`, and
  `venv-win/Scripts/python.exe -m pytest -q` (869 passed / 1 skipped as of this
  staging). Report the counts; they should go **up**.
- The projections you read live only in the main checkout at
  `C:\workspace\tolstack\data\projections\viewer\` — read them there by absolute
  path, and if a `[real]` check needs a rebuild, be aware that
  `BRIEF_20260914_real_tier_shared_projection_coupling` documents why rebuilding
  the shared dir from a worktree is contentious. Prefer not to rebuild; if you
  must, use `scripts/rebuild_projections.ps1` from the main checkout and say so.
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_guard_mutation_witness_tier.md`):
  the mechanism you chose and why, the five failure outputs, and — the part the
  next agent cannot derive from the diff — **which other guards you spot-checked
  with a mutation and found already sound**, so the next reviewer knows where the
  coverage is real.
