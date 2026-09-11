---
type: review
handoff: annotate_command_vocabulary_pairing_test
reviewer: agent
date: 2026-09-09
verdict: APPROVE
blockers: 0
---

# Review — `annotate_command_vocabulary_pairing_test`

## What this handoff actually was

Not a tolerance stack or a spec-library parse event — the seven mandatory
provenance checks in this repo's overlay do not apply. This is a structural
pairing test closing `ISSUE_20260908_command_vocabulary_table_has_no_pairing_test.md`:
`apps/annotate/README.md`'s verb table vs. `app.js`'s
`commands.register(...)` calls, the same shape `annotate_vocab_pairing_test`
(2026-09-06) already closed for `binding_state.js`'s vocabulary arrays.

**Baseline confirmed before merging** (unlike the 2026-09-06 sibling, this one
was *not* already shipped elsewhere): on the pre-merge review branch,
`node apps/annotate/run_tests.cjs` → 32/32, with no pairing test present.
`CommandLayer.prototype.verbs()` was confirmed still called exactly once, from
the "unknown command" error message, never a test — matching the issue's
claim.

## What I verified

- Fast-forwarded the review branch onto `handoff/annotate_command_vocabulary_pairing_test`
  (single commit `d982bf4`, diff-only: `apps/annotate/run_tests.cjs` +118,
  new lesson file). No code outside scope touched — `README.md`'s table and
  `commands.js`'s `verbs()` are both untouched, per the handoff's explicit
  restriction.
- **Post-merge JS suite:** `node apps/annotate/run_tests.cjs` → **36/36
  passed** (4 new checks: the two extractor self-checks, the pairing itself,
  and the "can it fail" replay).
- **The new guard has been observed failing** (per this checklist's universal
  check): added a real, undocumented verb
  (`commands.register("teleport_manual_probe", cmdGoto)`) to the actual
  `apps/annotate/app.js` on disk, re-ran the suite — both
  `README.md's verb table names exactly the verbs...` and the "can it fail"
  self-test went red, the latter in exactly the documented way (its own
  synthetic "teleport" verb collided with the real injected one in the
  failure list, matching the lesson's own account of this exact experiment).
  Reverted with `git checkout -- apps/annotate/app.js`; `git status` clean
  afterward.
- Read the extractor code (`registeredVerbsFromAppJs`,
  `verbsFromReadmeTable`) against the real files: 10 registered verbs in
  `app.js` (`open-part show hide isolate camera select-face select-topology
  select-study select-edge goto`), 9 README table rows collapsing to the same
  10 verbs (the `camera` row appears twice, the `select-*` row packs three
  verbs into one cell separated by `" / "`, and `open-part`'s cell has an
  escaped `\|`) — the escaped-pipe column regex and the "first
  whitespace-delimited token per backtick span" extraction both hold up
  against the actual table, not just a synthetic fixture.
- `venv-win/Scripts/python.exe -m pytest -q` → **750 passed, 1 skipped** —
  matches the lesson's own claimed count exactly.
- `data/` untouched: this handoff has no runtime I/O; confirmed no stray
  files via `git status` in the main checkout after the pytest run.
- Scope held: `commands.js`'s `verbs()` method was not touched (not needed —
  the lesson's stated reason, that `app.js` can't be booted in the sandbox,
  checks out against `run_tests.cjs`'s own docstring/sandbox shape).

## Reconciling with `integration`

`integration` had moved (`972d7b7` → `59a2b98`, a board-status file rename
for an unrelated handoff, `croppable_rule_shared_predicate`) since this
review branch was cut, so containment didn't hold and a plain fast-forward
wasn't available. Merged `integration` into the review branch
(`ort` strategy, no conflict — disjoint files) before pushing forward; both
suites re-run green after that merge (36/36 JS, 750 passed/1 skipped
pytest).

## Findings

None. No should-fix or blocker findings, so no new issue file is required
under "an unfixed should-fix outlives its handoff."

## Verdict

**APPROVE.** Proceeding to merge into `integration` and push.

## Overlay

No new overlay entry: this handoff is a fix *for* the already-well-documented
"documented vocabulary drifting from the seeded data" pattern (this repo's
overlay already carries an extensive set of entries on exactly this class,
including the 2026-09-06 sibling for `binding_state.js` and the
apps/annotate-specific entry from `annotate_deep_link_and_part_filter`), not
a new sighting of a footgun. Nothing to promote or prune this review.
