---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-18 — visual_rules_nothing_checks: geometry and typography that can be reverted with all three tiers green, and the probe that would have seen it crashes

Source: the 2026-09-18 triage sweep, routing four open issues that are one class
— **a rule a design pass settled, which no tier can tell was broken**, plus the
one tool that could see it being broken:

- `docs/issues/ISSUE_20260917_the_typography_probe_crashes_on_the_stack_table_shots_in_five_runs_of_eight.md` (bug, low)
- `docs/issues/ISSUE_20260917_the_typography_passs_visual_rules_are_unwitnessed_in_every_tier.md` (bug, med)
- `docs/issues/ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_unwitnessed_in_every_tier.md` (bug, med)
- `docs/issues/ISSUE_20260916_the_crop_lightbox_has_no_file_origin_coverage_in_any_tier.md` (chore, low)

Baseline: trunk at `5809360`, the 2026-09-18 batch merge, with
`design_pass_typography` and `crop_lightbox_zoom_viewer` merged. Scope:
`tests/debug_typography_pass.mjs`, `apps/viewer/tests.js`,
`scripts/run_viewer_browser_tests.mjs`, `tests/test_app_type_scale.py`, and new
checks you add. Do NOT edit `apps/viewer/views/` or `style.css` to make a check
easier — the shipped behaviour is correct; what is missing is the check. Do NOT
touch `scripts/mutation_witnesses.json` (parallel handoff
`mutation_witness_enrollment_gaps`) or the surfaces owned by
`reader_facing_surfaces_second_pass`; **name any new guard in your lesson so the
enrollment handoff can declare it.**

## Deliverable 1 comes first because it is the instrument

**`tests/debug_typography_pass.mjs` aborts in five runs of eight.** Found
2026-09-17 by paste-running the command `design_pass_typography`'s own lesson
gives for re-taking its screenshots:

```
node tests/debug_typography_pass.mjs --repo C:/workspace/tolstack
```

It dies on an uncaught exception inside `tableAround` — the helper that scrolls
a stack-table row into view and returns the enclosing `<table>`'s viewport box
— so the documented re-take command reaches **5 of 13 surfaces**. Fix the crash
and make the probe's failure mode non-fatal per shot: a shot that cannot be
taken should be reported as skipped with its reason, not abort the other twelve.
A visual-review instrument that dies two-thirds of the time is the reason the
next three deliverables were not caught by anybody looking.

## Deliverables 2–4: the rules nothing checks

2. **Every visual rule `design_pass_typography` settled can be reverted with all
   three tiers green — including the confidence leak it was written to fix.**
   Measured 2026-09-17 in `review/design_pass_typography` by planting each edit
   in a `git archive HEAD` scratch tree (`%TEMP%/tsrev`, short path, with
   `node_modules` junctioned in) and running
   `venv-win/Scripts/python.exe -m pytest -q`,
   `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`, and
   `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`.

   **Be precise about what is and is not already covered, because the existing
   guard is good.** `tests/test_app_type_scale.py` works — it was observed
   failing four distinct ways in review (a bare `px` font-size, a drifted
   annotator copy, a dropped step name, all-caps above `--t-meta`), each on the
   test that owns the claim. What it pins is **the scale**: that the six steps
   are declared, ordered and distinct, and that every `font-size` in either app
   spends one. What nothing pins is **where each step is spent** — the
   hierarchy decisions the pass actually made. Add checks for the latter, at
   the tier that can see it, and do not duplicate what the scale guard already
   holds.

3. **Three of the crop lightbox's four geometric wiring lines can be deleted
   with every tier green.** Measured 2026-09-17 in
   `review/crop_lightbox_zoom_viewer` the same way: eleven one-line reverts
   against `views/lightbox.js`, `views/crop.js`, `style.css` and
   `topology.html`; **eight redden a tier and name the right check; three do
   not.** The issue's table names the three and what the reader gets from each.
   Witness them. Prefer the cheapest tier that can actually see the geometry —
   a fast-tier check over computed values where that is real, the browser tier
   where it is not; say which you chose per line and why.

4. **The crop lightbox never opens on a `file://` page in any tier.** The
   browser suite runs over http only, against a repo-root static server, for a
   real reason: the launch affordance exists only on a crop figure that *has* an
   image, and `?mock=1` — the only dataset the `file://` suites drive — carries
   no crop PNGs. So no `file://` run ever calls `showModal()` on
   `#crop-lightbox`. What *is* covered on `file://`: the module loads and its
   fast-tier rendering checks run there.

   **Decide, and this is the one judgement call here:** either give `?mock=1` a
   crop image so the `file://` tier can reach the lightbox, or record in the
   suite that `file://` coverage of the lightbox is deliberately absent and
   why. Both are legitimate; a silent gap is not. The relevant question is
   whether anyone will ever open the viewer from a `file://` URL with real crops
   — if the honest answer is no, write that down and stop, and say so in the
   lesson rather than building coverage for a configuration nobody uses.

## Definition of done

- `node tests/debug_typography_pass.mjs --repo C:/workspace/tolstack` completes
  and produces **13 of 13** surfaces (or reports skips with reasons and takes
  the rest), demonstrated over several consecutive runs — the crash was
  intermittent, five in eight, so one green run proves nothing. State how many
  runs you did.
- Each revert named in issues 2 and 3 now reddens a named check. Prove it the
  way the issues measured it: plant the edit in a scratch tree and show the
  failure, with the check name quoted. An assertion that it "would fail" is not
  the deliverable.
- Deliverable 4's decision is written into the suite, not only into the lesson.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green, plus
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` (455/455 at
  `5809360`) and the browser suite. In a worktree the venv and `node_modules`
  are absent — they live only in the main checkout; the `--repo` seam re-points
  data reads without moving app code, and 86 of 455 checks need it.
- Lesson (`docs/sessions/lessons/LESSONS_20260918_visual_rules_nothing_checks.md`):
  **the pattern behind all three measurements** — each was found by a *reviewer*
  planting reverts in a scratch tree, and none by the tiers themselves. Say
  whether revert-planting is cheap enough to become a standing step for
  design-pass handoffs, or whether the mutation-witness tier already is that
  step and these guards simply never joined it. That answer is an input to
  `docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md`, whose gate
  lifted this week.
