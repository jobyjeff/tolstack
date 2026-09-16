---
type: bug
priority: high
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md
---

# `tests/test_provenance.py` is red on trunk: the origin-posture brief asserts byte-identity and names nothing that checks it

> **Duplicate — added in review, 2026-09-15.** This is the **third** filing of
> the same standing red, and both siblings were already in `docs/issues/` at
> this handoff's own branch point (`f629942`), so unlike the 2026-09-15 pair
> this one was visible from the tactical worktree:
> `ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`
> (filed by `mutation_witness_tier_repair`, `med`) and
> `ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`
> (filed by `extracted_mesh_alias_rows`, `med`). All three name the same clause,
> `BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`. **Triage: fix
> once and close all three.** Kept rather than deleted only because this one
> carries the `high` argument the other two do not — one prose clause reddening
> every pytest run in every worktree — so whichever survives should carry that
> priority.

`venv-win/Scripts/python.exe -m pytest -q` from a worktree cut from
`integration` on 2026-09-15:

```
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
1 failed, 884 passed, 1 skipped
```

The claim:

> docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62
> "deliberately does not, so the viewer's behaviour is byte-for-byte what
> `viewer_transport_honest_hosted` shipped"

The guard's own message says what it wants: *"Name the verification in the
same paragraph (a test name, a sha256, a `git diff`), or weaken the claim to
what is actually checked."* Neither is there — the paragraph names
`VA.isLocalPage`, `topology_app.js` and `chooseAdapter`, but nothing that
would go red if the viewer's behaviour changed.

## Not mine to fix, deliberately

Found by `annotate_hosted_page_posture`, whose scope is `apps/annotate/` and
which is explicitly told not to re-litigate the viewer-side origin policy.
This brief is the artifact that policy question was routed **to**, and its
sentence is a strategy claim; the fix is a one-clause edit by whoever owns the
brief (name the check, or write "unchanged by that handoff" instead of
"byte-for-byte").

## Why `high`

It is one prose clause, but it reddens **every** pytest run in **every**
worktree until it is fixed, and this repo's suite is the thing every tactical
session checks itself against. A standing red is how a real regression stops
being noticed.

## Repro

```
venv-win/Scripts/python.exe -m pytest -q tests/test_provenance.py
```

Nothing needs building and no worktree state is involved — the brief is a
tracked file and the guard reads it directly.
