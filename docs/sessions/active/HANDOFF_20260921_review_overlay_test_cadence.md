---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-21 — review_overlay_test_cadence: this repo's review overlay denies the benefit of the doubt by name

Source: the 2026-09-21 triage sweep, re-filing
`docs/issues/ISSUE_20260921_tolstack_review_overlay_tells_the_reviewer_not_to_trust_the_tactical_report.md`
(originally filed in dispatch because the finding session could not write a
tracked file into this main checkout). Baseline: tolstack trunk at `1946330`,
the 2026-09-21 batch merge. Scope: you own `docs/prompts/REVIEW_AGENT.md` and
nothing else. Do **NOT** change `dispatch/prompts/REVIEW_AGENT.md` — the
canonical file is correct, and it is another repo's tracked file besides. Do
**NOT** change any test or runner.

## The contradiction

The canonical review prompt gained a **"Test cadence"** section on 2026-09-21
(`test_run_policy_in_prompts`, from Jeff's policy): the reviewer checks that the
tactical report *records* a full-suite run and **gives that record the benefit
of the doubt**, runs a **risky subset pre-merge**, and runs the **full suite
once post-merge**. This repo's overlay composes onto the end of that file, so
where it restates cadence it is what the reviewer reads last.

Line numbers were taken at `integration` on 2026-09-21; that content is now
trunk, but re-locate each by its quoted text rather than by number.

1. **`docs/prompts/REVIEW_AGENT.md:317-318`**, under *"Also verify"*:

   > **Tests.** `venv-win/Scripts/python.exe -m pytest -q` green, and **re-run
   > it yourself rather than trusting the report.**

   This is the benefit of the doubt denied in as many words, and a bare
   `pytest -q` is the full suite. **What must survive is the reason the sentence
   exists** — in this repo the suite is a *transcription check*, so a stack
   whose new numbers carry no `# JEFF E18`-style source comment is incomplete
   regardless of green. That is a real and repo-specific reason to distrust a
   green, and it is not what the new cadence overrides. Rewrite as: check the
   tactical report records the full-suite run, then run the risky subset — and
   keep the transcription point as its own sentence, so it reads as "green is
   not the whole verdict here" rather than "re-run everything".

2. **`docs/prompts/REVIEW_AGENT.md:682-691`**, *"…and the same thing in reverse:
   run the suite in BOTH checkouts"*:

   > Re-run in `C:\workspace\tolstack` **after you merge**, before you push.

   Already post-merge and already correct. **It needs no edit** — it needs an
   explicit cross-reference *from* item 1, so item 1 cannot be read as ordering
   a second full run on top of this one. This is the entry the new cadence
   should point at.

3. **`docs/prompts/REVIEW_AGENT.md:1259-1261`**, the semantic-merge-conflict
   check:

   > **Before you write the verdict: `git log --oneline HEAD..master`, merge
   > master into your review branch, and re-run the suite there.**

   A third full-suite pre-merge order, and the subtlest of the three because the
   *merge-and-check* half is genuinely valuable — a semantic conflict is exactly
   what a worktree green cannot see. Keep the merge-master step; make what runs
   after it the risky subset plus anything the incoming range touched, and let
   the post-merge run at `:682-691` be the full one. If you conclude the
   semantic-conflict check genuinely needs a full suite to be worth anything,
   **say so and leave it**, with the argument written in the overlay — a
   reasoned exception to the cadence is a legitimate outcome and is better than
   a silent downgrade of a check that catches real breakage.

4. **Sweep the rest of the file for the same shape.** Any overlay sentence that
   names a bare `pytest -q` or an equivalent whole-suite invocation *and* sits
   where a reviewer reads it before merging is an instance. Report the total for
   the whole file, including "no further instances" if that is the answer — the
   issue names three because three is what that session found, not because it
   audited the file.

## Choosing the risky subset

Define it by what the diff touched and write the mapping into the overlay so
the next reviewer does not re-derive it. This repo has unusually clear seams to
map against: a `docs/topologies/` or stack-data diff implies the Python value
and schema pins; an `apps/viewer/` diff implies the viewer JS tier; an
`apps/annotate/` diff implies the annotate tier; a guard or witness change
implies `tests/test_mutation_witnesses.py` plus `npm run test:mutations`.

**Two repo-specific traps the mapping must name**, both measured:

- The viewer JS `[real]` tier reads gitignored `data/projections/viewer/`, which
  exists only in the main checkout, so in a worktree it must be run through the
  runner's `--repo` seam: `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`.
  Without it, `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
  fails on **every** branch and tells the reviewer nothing. This sweep's
  batch-merge agent hit exactly that: `1 failed, 1208 passed` in the worktree,
  **478/478** through `--repo`.
- `scripts/rebuild_projections.ps1` must be re-run from the main checkout after
  anything that changes a projection input, or the `[real]` tier judges a stale
  projection. That is a 2026-09-06/08 incident, not a hypothetical.

## Definition of done

- No sentence in `docs/prompts/REVIEW_AGENT.md` denies the tactical report the
  benefit of the doubt, and no sentence orders a full suite before the merge —
  except an exception you argued for explicitly in the file (item 3), if you
  make one.
- The transcription-check reason survives as its own point, and item 1
  cross-references the post-merge entry at `:682-691`.
- The risky-subset mapping is concrete (diff shape → command), names the
  `--repo` seam and the projection rebuild, and flags anything you could not
  justify from the repo.
- The report states the instance count for the whole file, not just the three.
- You ate your own cooking: name the risky subset you ran pre-merge with its
  result, and run the full suite once post-merge —
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` from the main
  checkout, plus the viewer tier through `--repo`.
- Lesson (`docs/sessions/lessons/LESSONS_20260921_review_overlay_test_cadence.md`):
  whether the file held instances beyond the three filed; whether you made an
  exception at item 3 and why; and how you chose the mapping. Three other repos
  (drawing-checker, wiki, bugsnap) have the same contradiction, and
  drawing-checker's handoff is being written in parallel — so whether
  mapping-by-diff-shape generalises is the transferable finding.
