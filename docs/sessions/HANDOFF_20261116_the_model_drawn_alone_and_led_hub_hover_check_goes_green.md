---
priority: med
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-16 — the_model_drawn_alone_and_led_hub_hover_check_goes_green: the one red browser sub-check on trunk is diagnosed and fixed where it is wrong

Source: the 2026-11-16 triage batch merge (found_by
`dispatch/docs/sessions/lessons/LESSONS_20261116_triage_sweep.md`), which
fast-forwarded master `a0e1ac5a` → `4ad98772` with this red known, and
`docs/issues/ISSUE_20261115_the_model_drawn_alone_and_led_two_hover_lighting_checks_red_on_integration.md`
(open since 2026-11-15, read it first — its 11-16 measurement section has the
evidence below in full). Baseline: master `4ad98772` or later. Scope:
`scripts/run_viewer_browser_tests.mjs` (the suite "the model drawn alone and
led"), and `apps/viewer/` / `apps/annotate/` only if the diagnosis says the app
is what is wrong. Do NOT touch `data/inbox/feature-identity/` (Jeff's bindings
are the ground truth this check reads, never something to edit to make it pass).

## Deliverables

1. **Name the failing conjunct.** The red sub-check is
   `[real] a part hovered in the tree lights the same thing on all four
   surfaces, in two tiers: ... every other part faint, nothing opaque`
   (`scripts/run_viewer_browser_tests.mjs`, the `push(...)` at ~line 16197).
   It is one big `&&`; the suite's log line prints the observed side of most of
   it and every printed value looks as expected, but it does **not** print the
   blade's look (`lookOf(hubLooks, bladeSha).look === "faint"`) nor the expected
   `hubDims` / `hubNodes` / `PILOT` lists. Make the check say which conjunct
   failed when it fails (print the blade look and the expected lists on the
   same log line), then run it and read the answer. Deterministic: 22/23 on
   both a full-tier run and `--only "the model drawn alone and led"` (75 s) on
   2026-11-16; also 22/23 on the 11-16 review of `the_map_draws_the_end_stop_model`
   on both baseline and merged tree. (On 11-15 it was 21/23; the second
   sub-check, the gap-edge hover, now passes.)
2. **Decide which side is wrong, and fix that side.** Suspect, not proven: the
   served feature-identity log now binds `blade_root@hub_blade1_root_bearing_bore`
   (the "a suggestion names its face and the mate ranks the other side" suite
   requires it), so on a hub hover the blade is the hub's interface partner and
   may now light at a touching look rather than `faint` — the pane's touching
   layer reports 2 faces. If the app's behaviour is the intended design (an
   interface partner lights in the faint *touching* tier), the guard's
   expectation is stale: correct it to assert the intended look, derived from
   the served log rather than hard-coded, so the next binding Jeff makes does
   not redden it again. If the app is wrong, fix the app. Either way, write in
   the lesson which it was and why. **Never loosen the check to pass** (e.g.
   dropping the blade conjunct): the "every other part faint, nothing opaque"
   claim is the point of the check.
3. **Mutation witness.** The check is enrolled; re-run its witness with
   `node scripts/run_mutation_witness_tests.mjs --only "<guard>"` and keep it
   `WITNESSED`. If you change the expectation, the spec under
   `scripts/mutation_witnesses/` must still bite.

## Definition of done

- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the model drawn alone and led"`
  23/23 against a projection freshly rebuilt by `scripts/rebuild_projections.ps1`.
- Default `venv-win/Scripts/python.exe -m pytest -q` green; the two fast node
  tiers green; the witness for the touched guard `WITNESSED`.
- The issue above set `status: resolved` with a `resolution:` naming the
  failing conjunct and the fix.
- Lesson (`docs/sessions/lessons/LESSONS_20261116_the_model_drawn_alone_and_led_hub_hover_check_goes_green.md`):
  which conjunct failed, whether the guard or the app was wrong, and whether
  any other `[real]` browser check hard-codes a "faint" look for a part that a
  newly made binding can turn into an interface partner (the class this red
  belongs to — name each one found, fix them in this handoff if they are the
  same one-line shape, file them otherwise).
