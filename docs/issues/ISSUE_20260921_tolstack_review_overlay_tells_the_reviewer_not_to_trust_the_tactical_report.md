---
type: chore
priority: high
status: triaged
area: tolstack/prompts
reporter: agent
handoff: docs/sessions/HANDOFF_20260921_review_overlay_test_cadence.md
found_by: dispatch/docs/sessions/HANDOFF_20260921_test_run_policy_in_prompts.md
---

# tolstack: the review overlay says "re-run it yourself rather than trusting the report", which is the opposite of the new cadence

## Re-filed here by the 2026-09-21 triage sweep

This issue was filed in `dispatch/docs/issues/` because the session that found
it ran in a worktree and could not write a tracked file into this repo's main
checkout (`dispatch/hooks/main_checkout_edit_guard.py`, correctly). Its own text
asked for exactly this: re-file it into the owning repo, or discharge it from a
main-checkout session. The triage sweep runs in the main checkouts, so it did
the re-filing. The dispatch-side copy is now `status: closed` with a pointer
here; **this file is the live one**. Nothing about the finding changed in the
move — the quoted line numbers below were taken at `integration` on 2026-09-21
and that content is now on this repo's trunk.

**Filed in dispatch, about tolstack, deliberately.** A worktree session cannot
write a tracked file into another repo's main checkout (the
`main_checkout_edit_guard.py` hook, correctly). A triage sweep reads dispatch's
`docs/issues/` too, so this reaches a disposition — but it should be **re-filed
into `tolstack/docs/issues/`** by whoever picks it up, or discharged directly
from a main-checkout session.

## What changed above it

`dispatch/dispatch/prompts/REVIEW_AGENT.md` gained a **"Test cadence"** section
(handoff `test_run_policy_in_prompts`, 2026-09-21): the reviewer checks that
the tactical report *records* a full-suite run and gives that record the
benefit of the doubt, runs a **risky subset pre-merge**, and runs the **full
suite once post-merge**. The overlay composes onto the end of that file, so
where it restates cadence it is what the reviewer reads last.

## The contradictions, quoted (at `integration`, 2026-09-21)

1. `docs/prompts/REVIEW_AGENT.md:317-318`, under "Also verify":

   > **Tests.** `venv-win/Scripts/python.exe -m pytest -q` green, and **re-run
   > it yourself rather than trusting the report.**

   This is the benefit of the doubt denied by name, and a bare `pytest -q` is
   the full suite. What should survive: the *reason* the sentence exists — the
   suite is a transcription check, so a stack whose new numbers carry no
   `# JEFF E18`-style source comment is incomplete regardless of green. What
   should move: "re-run it yourself" becomes "check the tactical report records
   the full-suite run, then run the risky subset".

2. `docs/prompts/REVIEW_AGENT.md:682-691`, "…and the same thing in reverse: run
   the suite in BOTH checkouts":

   > Re-run in `C:\workspace\tolstack` **after you merge**, before you push.

   Already post-merge and already correct — it needs no edit, and it is the
   entry the new cadence should point at. Worth an explicit cross-reference so
   entry 1 above can't be read as ordering a second full run.

3. `docs/prompts/REVIEW_AGENT.md:1259-1261`, the semantic-merge-conflict check:

   > **Before you write the verdict: `git log --oneline HEAD..master`, merge
   > master into your review branch, and re-run the suite there.**

   The hazard is real (two branches each green, the merged tree red) and this
   is the one check that genuinely wants a pre-merge run of *something*. Under
   the new cadence the run it orders is the **risky subset chosen from both
   diffs** — the modules either side touched — with the post-merge full suite
   as the backstop. Reword rather than delete; also update `master` to the
   integration branch, which is what a review branch merges from now.

## The repo nuance that belongs here and not in the canonical prompt

tolstack's **two tiers cannot run in a fresh worktree** (`CLAUDE.md:107-114`):
the `[real]`/node-fs tier and the browser TRUTH tier need gitignored
`node_modules/playwright-core`, so a worktree `pytest -q` is red on
`tests/test_viewer_js_suite.py` **by design** (since 2026-09-18: a skipped tier
is not a passed one). The canonical prompt deliberately keeps this in the
override. Two things the overlay should state outright:

- what a tactical agent's full-suite **record** is expected to look like here
  (which checkout, and that the worktree run is red by design, so a record
  reading "green in the worktree" is itself the inconsistency that voids the
  benefit of the doubt);
- what counts as **risky** pre-merge (suggested, not binding): the browser tier
  files covering the changed viewer surface + the value-pin tests of the
  changed modules, plus `tests/test_mutation_witnesses.py` when the diff
  touches a guarded witness.

Watch the `--repo`-with-backslashes trap at `:469-481` while writing this: it
silently drops the whole `[real]` tier and still prints a clean total, which is
exactly the "disarmed tier" shape the new cadence treats as a void record.
