---
type: bug
priority: high
status: closed
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md
resolution: closed as a duplicate by the 2026-09-16 triage sweep -- one defect, filed nine times by nine sessions in one day. The cause (an unbacked byte-identity claim in BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62) was fixed this sweep by rewording the claim; tests/test_provenance.py is green and the full suite is 1155 passed on master. Tracked at ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md, which is status: resolved and names all nine. Closed rather than resolved because nothing in this file was acted on
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

## Closed as duplicate — 2026-09-16 triage sweep

One defect, **filed nine times by nine different sessions in a single day.** Each
session ran the suite, found `tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
red, found no issue on trunk explaining it, and filed blind.

The cause was one sentence of prose:
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`
asserted the viewer's behaviour was "byte-for-byte" what
`viewer_transport_honest_hosted` shipped, naming a *handoff* — which is not one of
the verification forms the scanner accepts (sha256 / git diff / test / blob /
PROVENANCE.md). It was fixed this sweep by rewording rather than by adding a
pointer, because behaviour is not a thing that can be byte-identical; the author
was reaching for provenance they did not have. `tests/test_provenance.py` is
green and the full suite is **1155 passed** on `master`.

Superseded by `ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md`
(`status: resolved`), which names all nine.

**Why nine filings and not one, since that is the durable lesson:** the guard was
red on `master`, and there was no issue *on master* describing it — the eight
earlier filings existed only on their own branches, invisible to each other until
this sweep's batch merge carried them all to trunk at once. A red trunk guard with
no on-trunk issue re-teaches itself to every session that meets it. This is the
shape `dispatch/docs/strategy/BRIEF_20260911_cross_branch_issue_dedup.md` exists
to decide, and it is now nine sightings in one day rather than a hypothetical.
