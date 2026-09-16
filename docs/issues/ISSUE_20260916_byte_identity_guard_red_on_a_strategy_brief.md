---
type: bug
priority: med
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_reference_crops_in_context.md
---

# `pytest -q` is red on `integration` before any handoff touches it: an unbacked byte-identity claim in a strategy brief

> **Cross-reference added in review, 2026-09-16.** This is the **seventh** filing
> of the same red. Six siblings were already in `docs/issues/` at this branch's
> own merge-base (`d16db3b`), so `ls docs/issues/` in the tactical worktree would
> have shown them:
> `ISSUE_20260915_a_strategy_briefs_byte_for_byte_claim_reddens_the_suite_on_master.md`,
> `ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`,
> `ISSUE_20260915_byte_identity_claim_in_origin_posture_brief_names_no_verification.md`,
> `ISSUE_20260915_byte_identity_guard_red_on_the_origin_posture_brief.md`,
> `ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`,
> `ISSUE_20260915_strategy_brief_byte_identity_claim_fails_the_provenance_guard.md`
> (plus `..._a_strategy_briefs_byte_for_byte_figure_of_speech_...`, which landed
> on `integration` after the branch point). **Triage should close all seven as
> one.** Kept rather than deleted because this one carries the clearest repro and
> the `df21a4a` attribution; nothing here is new against the six above.

`tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
fails on a clean checkout of `integration`. It is not caused by any handoff
branch — it was red at the first command of this session, before a single file
was edited.

## The claim

`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`:

> `apps/annotate/` passes its hostname, and `apps/viewer/`'s `topology_app.js`
> deliberately does not, so the viewer's behaviour is **byte-for-byte** what
> `viewer_transport_honest_hosted` shipped.

The guard's rule is that an asserted byte-identity has to name what checks it —
a test name, a sha256, a `git diff` — in the same paragraph. This one names a
handoff, which is a claim about history, not a verification.

## Repro

```
git switch integration
venv-win/Scripts/python.exe -m pytest -q tests/test_provenance.py -k byte_identity
```

→ `1 failed`. Every other test in the suite passes (1115 passed, 1 skipped as of
this session).

## Why it matters more than one red test

`CLAUDE.md` tells every agent that arrives here to expect green, and the
reviewer checklist starts from green. A suite that is red for a reason unrelated
to the branch under review costs each session the time to prove the failure is
not theirs, and trains people to skim past red — which is the exact habit
`test_viewer_js_suite.py` argues against in its own docstring when it explains
why it *skips* rather than fails.

## Likely fix

Either weaken the sentence to what is actually checked ("unchanged" rather than
"byte-for-byte"), or name the verification — `git diff` against the
`viewer_transport_honest_hosted` merge, or the browser-tier check that measures
the viewer's transport choice. The brief was written by the 2026-09-15 triage
sweep (`df21a4a`), so whoever owns that brief owns the wording; it is one
sentence either way.
