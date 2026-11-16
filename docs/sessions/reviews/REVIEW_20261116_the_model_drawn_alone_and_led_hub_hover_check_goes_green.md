---
type: review
handoff: docs/sessions/active/HANDOFF_20261116_the_model_drawn_alone_and_led_hub_hover_check_goes_green.md
reviewer: agent
date: 2026-11-16
verdict: APPROVE
blockers: 0
---

# Review 2026-11-16 — the_model_drawn_alone_and_led_hub_hover_check_goes_green

Branch `handoff/the_model_drawn_alone_and_led_hub_hover_check_goes_green`
(3 commits, `2dc8569e`..`acd3f1a9`), merged into `review/…` as `39e29f92` on
top of integration `9a189538`. Clean merge, no conflict. Not already contained
in integration. This is the first review of this handoff: no earlier report on
this branch, and the lesson arrives as `A`.

## What the work does

The hub-hover check hard-coded the blade as `faint`. Since Jeff bound
`blade_root@hub_blade1_root_bearing_bore`, the blade is the hub's bound
interface partner. Its faces are in the touching tier, so
`AA.planLightLooks` (`apps/annotate/commands.js:633`) puts it in `near` and it
ghosts. The tactical agent put the missing values on the log line, found that
the blade conjunct was the one failing (`ghost`, 0.22), and judged the guard
stale rather than the app wrong. The check now works out its expected looks
from `data/projections/feature-identity/bindings.json`
(`featureBound` / `ghostedPartners` / `looksOffRule`). It checks every drawn
part, not four named ones, and it is red if the projection cannot be read. The
body-selected check had the same hard-coded `faint` on the tan link, and it was
fixed the same way. The pilot-gap check's own bindings read was folded into the
shared helper, keeping its "unreadable → ask for the overlay" arm.

## Verified

- **Diagnosis, against the app.** `VA.focusLightOf` (`apps/viewer/model.js`):
  `touchParts` → `meet` adds the far-end *features* of each interface, and
  never the far *parts*. So a far part lights only through its bound faces, and
  a partner whose feature is unbound stays faint. `bindings.json` agrees: the
  blade's and gas-spring piston's features are `bound`, and the mount's
  `tan_link_mount_hub_face` is `proposed`. The run shows the mount `faint` and
  the blade `ghost`. The app is behaving as `commands.js:566` documents ("a
  touching part ghosts"), so the guard was the side in error. Agreed.
- **Not loosened.** The blade conjunct was replaced by a rule over *every* drawn
  part. It also requires the mount, blade and link to be drawn
  (`!!lookOf(…).look`), so the check cannot pass on an empty scene. "Nothing
  opaque" is kept.
- **The class table in the lesson.** I re-read every look assertion in the
  suite (`grep 'look === "faint"\|look === "ghost"'`). The joint-hover `faint`
  link is correctly out of the class, because a joint's touching tier is
  `F.part` only. The part-selected check asserts no other part's look. The
  bind-mode check accepts either look. The table is complete.
- **Witness spec.** The new mutation (dropping `add(near, …)` for touching
  faces) anchors on a line that is unique in `commands.js`. It goes red in the
  direction "should ghost, stays faint".
- **Lesson arithmetic.** 323/323, 715/715 and pytest
  `1 failed, 2027 passed, 1 skipped, 4 deselected` all reproduced exactly on
  the merged tree. "4/4 WITNESSED over three guards" is 2 + 1 + 1, which is
  right.
- **Issue** `ISSUE_20261115_…two_hover_lighting_checks_red_on_integration.md`:
  `status: resolved`, a `resolution:` naming the conjunct and the fix, and a
  dated resolution section appended. It is in grammar.
- `data/inbox/feature-identity/` was not touched (diff is 4 files, none under
  `data/`).

## Tests (merged tree `39e29f92`, tree `7864affb`)

- Pre-merge risky subset: the tactical record (23/23 `--only`, 4/4 witnessed)
  was taken on the benefit of the doubt. My first browser run was post-merge,
  because the diff is test-only and the merge was clean.
- Browser `--only "the model drawn alone and led"`, `--repo C:/workspace/tolstack`:
  **23/23**, 80.5 s. The log shows `ghosted partners ["blade_root"] (bindings read true)`
  for the hub and `["blade_root","gas_spring_piston_214700_002","tan_link_212956_005"]`
  for the base body, with `parts off their look []` both times. The first
  attempt failed with `ERR_MODULE_NOT_FOUND playwright-core`, because the
  worktree had no `node_modules`. It was armed with a junction to the main
  checkout.
- Fast tiers: `apps/annotate/run_tests.cjs` 323/323;
  `apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` 715/715.
- Witness gate `--changed-since integration --budget-min 10`, `--repo
  C:/workspace/tolstack`: **6/6 witnessed, 6/6 reached in 9m40s, 0 left to the
  sweep**, exit 0. It covered both entries of the hub-hover spec, body selected,
  part selected, joint hovered and Escape-with-pick-armed. The runner left
  `tmp/mutation-witness-34608` behind, and I removed it.
- Default pytest in the review worktree:
  `1 failed, 2027 passed, 1 skipped, 4 deselected in 465 s`. The one failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented
  worktree red. Its tier ran green through `--repo` above. This repo's conftest
  prints no contention header lines. Recorded with `suite-time record`, and it
  was inside budget.
- Prose subset after my overlay edit (`test_tolerance_stack`, `test_provenance`,
  `test_thermal_exception_list`, `test_claims_registry`): 222 passed.
- Whole browser tier: see the post-merge section below.

## Findings

No blockers, no should-fix.

**Nits** (not filed; neither is a defect today):

1. `scripts/run_viewer_browser_tests.mjs`, `ghostedPartners` / `looksOffRule`:
   the derivation's *lit set* is `[HUB]` and `body.parts`. The app's is
   `model.subtreeOf(partId)` and `model.allPartsOf(body.id)`. Today they
   coincide, because the hub has no child parts and the run is green. If a lit
   part gains a drawn child, the check false-reds: the child ghosts as an own
   part while the rule expects it faint. This fails loud rather than silently,
   so it is a nit. It is recorded in the overlay entry so the next reviewer
   checks for it.
2. The new witness entry's `contract` says the derived expectation "bites in
   both directions". The one mutation witnesses only "a partner that should
   ghost stays faint". The other direction (a non-partner ghosts) is covered by
   the same `looksOffRule` conjunct, and the mount `faint` was already
   asserted before this change, but no mutation measures it. The wording
   overclaims slightly.

## Overlay

New Recurring-bugs entry: "A `[real]` check that hard-codes a look (or any lit
state) that Jeff's next binding can move", with the lit-set nit above as its
second question.

## Note for the next reviewer

Arm `node_modules` before the first browser run in a review worktree. The
runner fails at import, not with a SKIP.
