---
type: review
handoff: the_sweep_frame_loop_does_only_per_frame_work
reviewer: agent
date: 2026-10-01
verdict: APPROVE
blockers: 0
---

# Review: the_sweep_frame_loop_does_only_per_frame_work

## Scope

Diff `integration...handoff/the_sweep_frame_loop_does_only_per_frame_work`:
`apps/annotate/app.js` (55 lines), `apps/annotate/run_browser_check.mjs`
(+129 lines, append-only to an existing file), and the handoff's own lesson.
`scene.js` and `run_tests.cjs` were in the handoff's declared scope but
untouched — both are legitimate: the chosen fix for defect 2 lives entirely in
`app.js` (one of the two shapes the issue's own "Done when" allowed), and
`run_tests.cjs`'s `vm` sandbox cannot boot `app.js` (no DOM/WebGL), so the new
composition guards went into `run_browser_check.mjs` instead — exactly what
deliverable 3 asked for when the composition "genuinely cannot be driven from
`run_tests.cjs`."

## What I verified

**Defect 1 (playback bound to the frame clock).** Read `tickSweep` end to end.
The fix introduces `sweep.playbackPosition` as the continuous value
`AA.sweepAdvance` integrates every tick (driven by wall-clock `dt`, capped at
0.25 s for backgrounded tabs); `sweep.index` — what's rendered/scrubbed — is
`Math.round(playbackPosition)` only under reduced motion. This is the correct
fix, not the naive one: the previous code overwrote the wall-clock answer with
a frame-stepped one; the naive "just round `sweepAdvance`'s result in place"
alternative (which the lesson says was tried and rejected) would have fed the
rounded value back into the next tick's basis and stalled playback at high
frame rates, which matches my read of `AA.sweepAdvance`'s per-tick step being
sub-1 at typical frame times. Every manual-position path
(`setSweepIndex`, `setSweepIndexQuietly`) resyncs `playbackPosition =
sweep.index`, so a seek is never undone by the next tick continuing from a
stale continuous value.

**Defect 2 (per-frame reapplication).** `applySweepFrame` now tracks
`row._appliedGhost` / `row._appliedSweepGhost` on each row object and calls
`scene.setGhost` / `scene.setSweepGhost` only on the frame its input actually
changes. Confirmed `sweep.bodies` (the array `applySweepFrame` iterates) is
built once per sweep load in `anchorSweepBodies` and never partially replaced,
so the per-row flags persist correctly across frames and reset correctly on a
new sweep (fresh row objects, flags `undefined` until first applied).

**The composition guard, independently re-run.** I did not take the lesson's
pass counts on faith. In this worktree:
- `node apps/annotate/run_tests.cjs` → **177/177** (the lesson's own run
  showed 176/177 with one mesh-alias failure it correctly attributed to the
  concurrently-staged `mesh_store_reconciled_to_the_pure_signature` handoff;
  that handoff has since merged into `integration`, and the failure is gone
  here — consistent with the lesson's own attribution, not a discrepancy).
- `node apps/annotate/run_browser_check.mjs` (mock) → **35/35**.
- `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p1-20261001-203656`
  → **43/43**.
- **I broke the regression myself and watched the new guards catch it**
  (the "universal check" this prompt requires): swapped `integration`'s
  pre-fix `app.js` into the working tree, byte-for-byte, and re-ran the mock
  browser check three times. All three runs failed
  `playback makes no further setGhost/setSweepGhost calls...` and (2 of 3; see
  below) both reduced-motion timing checks; restored the committed file
  afterward (`git diff` empty). This is the strongest evidence in the review:
  the two new guards actually observe the composition in `app.js`, not a
  proxy for it.
- `node scripts/run_mutation_witness_tests.mjs --unenrolled` confirms the
  lesson's claim that `run_browser_check.mjs` carries no `TIER_HARNESS` entry
  at all: the census line for this app is
  `apps/annotate/run_tests.cjs    32 enrolled / 177 enrollable / 177 declared`
  — no second line for `run_browser_check.mjs`. The lesson is right that this
  is a pre-existing, already-filed, already-deferred gap
  (`ISSUE_20261001_four_sweep_mode_gaps_the_handoff_left_and_nobody_owns.md`,
  row 4), not something to re-file.
- Full suite in this worktree: `venv-win/Scripts/python.exe -m pytest -q` →
  **1443 passed, 1 failed, 1 skipped** (325 s). The one failure is
  `test_viewer_js_suite_is_green`'s documented worktree `[real]`-tier skip —
  expected and explicitly waived by this repo's `CLAUDE.md` for a worktree.
  (The lesson's own worktree run showed 1431/3-failed at the time it was
  written, for the same reason as above — both of its two extra failures have
  since resolved with the mesh-store merge.) The diff touches nothing under
  `apps/viewer/`, a projection, or a guard/mutation-witness file, so per this
  repo's "Choosing the risky subset" mapping and the lesson's own stated
  reasoning, the three main-checkout-only tiers
  (`run_mutation_witness_tests.mjs`'s full run, `run_viewer_browser_tests.mjs`,
  `apps/viewer/run_tests.cjs`) were not re-run here — correctly, nothing in
  this diff touches what they exercise.

**The lesson's arithmetic and claims**, re-derived rather than copied: the
"What reduced motion means here" decision is stated and argued, not left
implicit, which is exactly what the handoff asked for. The "found dirt"
section's attribution (mesh-alias failures belong to the parallel handoff, not
this one) checks out against the actual failure list and against the fact
that both failures are gone now that the parallel handoff has merged. The
"frame-rate measurement came back flat" section is unusually honest about its
own measurement being dominated by noise (concurrent agent load, a mesh store
being rewritten mid-measurement) rather than asserting an improvement it
can't actually show — this is the posture the handoff's own instructions
asked for ("measure before and after rather than asserting the improvement").

**No other `requestAnimationFrame` path has either defect shape** — checked
independently: `grep -n requestAnimationFrame apps/annotate/*.js` finds
exactly the two the lesson names (`app.js`'s `sweepClock`, `scene.js`'s
`animate`), and `animate`'s only per-frame call is `renderer.render()`, which
has no cached/skippable state to apply only-on-change.

## Findings

**Nit — pre-existing flake, not from this diff, filed separately.**
`run_browser_check.mjs`'s "hovering a joint bead" check fails intermittently
(~1 in 3 runs here) regardless of `app.js` content — reproduced against both
the pre-fix and post-fix file. Filed as
`ISSUE_20261001_sweep_joint_tooltip_browser_check_is_flaky.md` per file-don't-fix;
unrelated to either defect this handoff targets.

No should-fix or blocker findings against the diff itself.

## Verdict

**APPROVE.** Both defects are fixed correctly (not just plausibly — I
independently reproduced each failure against the pre-fix code and watched
the new guards catch it), the composition is guarded at the one harness that
can actually reach it, and the lesson's claims hold up against independent
re-derivation. Merged `handoff/the_sweep_frame_loop_does_only_per_frame_work`
into this review branch (`git merge --no-edit`, clean, no conflicts) and will
merge this review branch into `integration`.
