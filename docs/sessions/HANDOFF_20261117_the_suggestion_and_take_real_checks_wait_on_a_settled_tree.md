---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-17 — the_suggestion_and_take_real_checks_wait_on_a_settled_tree: two `[real]` browser suites stop racing the tree they read

Sources (both med, both filed 2026-11-17 from reviews, both `[real]` checks
that read the navigation tree after an action):
- `docs/issues/ISSUE_20261117_the_suggestion_names_its_face_suite_flakes_with_the_mount_line_never_appearing.md`
  (class `timing_assertion_under_load`)
- `docs/issues/ISSUE_20261117_the_annotate_rail_holds_still_take_checks_flake_in_the_whole_browser_tier.md`
  (class `browser_tier_flake`)

Staged by the 2026-11-17 triage sweep. Baseline: master `2e239d04` or later.
Scope: `scripts/run_viewer_browser_tests.mjs` (`testSuggestionNamesItsFace`
at ~line 10665 and its `openBody` helper; the "annotate rail holds still"
suite registered at ~line 14267 and its Take steps) and, only if a cause in
the page is proven, the page code behind it. Do NOT touch the popover suite
(`ISSUE_20261117_the_popover_hover_intent_corridor_checks_flake_alone_on_integration.md`
is deferred separately: wall-clock pacing, a different fix).

## Why

- **Suggestion suite:** one red run in two, on integration and merged trees
  alike. The mount's `.navtree__featurestate[data-look]` line sometimes never
  appears inside 60 s, then a 180 s wait for an `undefined` sha follows. A red
  run costs about 250 s of wall time, which was most of one whole-tier overrun.
  The issue names the suspects: `openBody`'s twisty clicks swallow their errors
  (`.catch(() => {})`) and can miss on a tree that is still rebuilding, and the
  wait is a fixed timeout rather than one keyed on a settled tree.
- **Annotate rail holds still:** 14/17 in the whole tier and 17/17 alone
  straight after, on the same tree. All three red checks read state that
  follows a Take.

The 2026-11-17 batch merge's whole tier was 45/45, so a green run proves
nothing here. This repo's overlay says that N green runs are not evidence a
flake is fixed.

## Deliverables

1. **Find each cause before fixing it.** Replay the failing order: the whole
   tier, or the suites that run before it, on a scratch root built from the
   baseline, with the box loaded the way a whole tier loads it. Get at least
   one red run per suite that you can attribute to a step. Record which step
   was missed and how you know.
2. **The waits key on settled state, and they fail fast naming what was
   missing.**
   - Suggestion suite: wait for the part's row and the feature's twisty to be
     present and expanded before waiting for the line. Do not swallow a
     twisty-click failure.
   - Take steps: wait on the post-Take state each check reads (the partner
     end selected, the bound line), not on time.
   - A missing precondition ends the suite in seconds with its name, not
     after 250 s.
3. **Evidence of the fix.** Repeat the replay that went red and show it green
   (your N runs plus the red order).

## Definition of done

- Both suites green in the replayed order; the whole browser tier run once
  and recorded per `CLAUDE.md` (wall time against the budget).
- The mutation-witness gate (`--changed-since` the baseline) for the changed
  checks.
- Both issues get `status: resolved`, each with a one-line `resolution:`
  naming the cause found.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md`):
  - the red orders and their attribution;
  - the waits changed;
  - whether any page race was found;
  - the replay commands, so the next flake of this class starts from them.
