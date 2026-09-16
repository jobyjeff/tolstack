---
type: bug
priority: high
status: resolved
area: docs/strategy
reporter: agent
resolution: reworded the claim to drop the byte-identity assertion (1f62803); the guard is green (10 passed) and the full suite on merged master is 1155 passed; supersedes the eight duplicate issues named in the body.
---

# The byte-identity guard is red on master, from a 2026-09-15 triage brief

**Symptom.** `tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
fails on `master` (and therefore on `integration`, which carries the same
blobs). The guard scans live prose for asserted byte-identity claims and
requires each one to name its verification — a `sha256`, a `git diff`, a test,
a blob or `PROVENANCE.md` — in the same block of prose. One claim now has no
recognised pointer:

```
docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62
  deliberately does not, so the viewer's behaviour is byte-for-byte what
```

The sentence reads "...so the viewer's behaviour is byte-for-byte what
`viewer_transport_honest_hosted` shipped." It does name *something* — a handoff
name — but a handoff name is not one of the verification forms the scanner
recognises, so the claim counts as unbacked. Two fixes are available and the
choice is a judgement call, which is why this is an issue and not an inline
edit: either weaken the prose to the behavioural claim actually being made
(the viewer's `chooseAdapter` is unchanged), or point the claim at the thing
that checks it (a `git diff` of `apps/viewer/topology_app.js`, or the test that
pins `chooseAdapter`'s `file://`-only answer).

**Introduced by.** `df21a4a` — "triage 2026-09-15: disposition 18 open issues
into 5 handoffs + 2 briefs". The brief is a strategy artifact, so this is the
designed behaviour of a docs-guard suite catching prose, not a code regression:
the 129 commits on `integration` are *not* implicated. `master` and
`integration` hold byte-identical copies of both the brief
(`3bfa07c`) and the test (`b3011b6`).

**Blast radius.** It gates the 2026-09-16 batch merge of `integration` into
`master` (129 commits), which was reported `skipped-red` rather than merged.
Because the failure is pre-existing on trunk, merging would not have made
trunk any redder — an operator may reasonably choose to fix the one line of
prose and re-run rather than hold the batch.

**Already reported eight times, on `integration` only.** The 2026-09-16 batch
merge found that `integration` carries eight separate open issues for this one
failure, filed by eight different sessions that each hit the same red suite and
each filed blind. None of them is on `master`, so trunk had no record at all —
hence this file, which exists to *name* them so the pile can be collapsed to
one rather than to add a ninth voice to it:

- `docs/issues/ISSUE_20260915_a_strategy_briefs_byte_for_byte_claim_reddens_the_suite_on_master.md` (med)
- `docs/issues/ISSUE_20260915_a_strategy_briefs_byte_for_byte_figure_of_speech_reddens_the_provenance_guard.md` (med)
- `docs/issues/ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md` (med)
- `docs/issues/ISSUE_20260915_byte_identity_claim_in_origin_posture_brief_names_no_verification.md` (low)
- `docs/issues/ISSUE_20260915_byte_identity_guard_red_on_the_origin_posture_brief.md` (high)
- `docs/issues/ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md` (med)
- `docs/issues/ISSUE_20260915_strategy_brief_byte_identity_claim_fails_the_provenance_guard.md` (med)
- `docs/issues/ISSUE_20260916_byte_identity_guard_red_on_a_strategy_brief.md` (med)

Eight duplicates is itself the more interesting defect: a red trunk guard with
no issue *on trunk* is invisible to the next session, which then rediscovers it
and files again. Whoever fixes the one line of prose should close all nine.

## Resolution (2026-09-16)

Fixed in `1f62803`. The sentence asserted byte identity about a **behaviour**,
which is not a property bytes can carry — the author was reaching for
provenance they did not have and named a handoff instead of a verification. The
claim actually being made is that `topology_app.js`'s `chooseAdapter` call is
unchanged, so the prose now says exactly that:

> ...`apps/viewer/`'s `topology_app.js` deliberately does not, so the viewer's
> behaviour is **unchanged from** what `viewer_transport_honest_hosted` shipped.

No verification pointer was added, because none was needed once the claim
stopped overreaching. `tests/test_provenance.py` is green (10 passed), and the
2026-09-16 batch merge of `integration` into `master` (129 commits, merge
`2ccec0f`) then ran **1155 passed, 0 failed, 0 skipped**.

This issue supersedes the eight duplicates listed above — all eight describe
this one failure and all eight are closed by this one-line prose fix.

**Repro.**

```
cd C:\workspace\tolstack
venv-win/Scripts/python.exe -m pytest -q tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
```

Full suite on `integration` for the same run: **1 failed, 1153 passed, 1
skipped** — this is the only failure.
