---
type: bug
priority: med
status: closed
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
resolution: closed as a duplicate by the 2026-09-16 triage sweep -- one defect, filed nine times by nine sessions in one day. The cause (an unbacked byte-identity claim in BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62) was fixed this sweep by rewording the claim; tests/test_provenance.py is green and the full suite is 1155 passed on master. Tracked at ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md, which is status: resolved and names all nine. Closed rather than resolved because nothing in this file was acted on
---

# `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md` reddens `test_every_byte_identity_claim_in_a_live_file_names_its_verification`

> **Duplicate — added in review, 2026-09-15
> (`review/viewer_value_guard_rows_and_replays`).** This is the **sixth**
> filing of one baseline red, one per session that ran while it stood:
> `ISSUE_20260915_byte_identity_guard_red_on_the_origin_posture_brief.md` (high),
> `..._byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`,
> `..._strategy_brief_byte_identity_claim_fails_the_provenance_guard.md`,
> `..._byte_identity_claim_in_origin_posture_brief_names_no_verification.md`,
> `..._a_strategy_briefs_byte_for_byte_claim_reddens_the_suite_on_master.md`
> and this one. Cross-referenced rather than deleted: this is the only filing
> that identifies the text as a **figure of speech about behaviour** rather
> than a provenance claim, which is the argument for weakening the sentence
> instead of naming a verification. Dispose of all six together; the `high`
> filing is the one to keep.

Found as the **baseline** state of this branch, before any edit: the suite is
one test red on trunk-after-integration as of 2026-09-15, and the handoff that
found it expected `880 passed, 1 skipped`.

```
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
  byte-identity asserted with nothing named that checks it:
    docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62
    deliberately does not, so the viewer's behaviour is byte-for-byte what
```

Reproduce from a clean tree:

```
venv-win/Scripts/python.exe -m pytest -q tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
```

## What it is

The brief (committed by the 2026-09-15 triage sweep, `df21a4a`) writes:

> `apps/viewer/`'s `topology_app.js` deliberately does not, so the viewer's
> behaviour is **byte-for-byte** what `viewer_transport_honest_hosted` shipped.

That is a figure of speech about *behaviour*, not a claim about bytes — the
one thing the guard is built to refuse, because the defect it was written for
was exactly a claim that had drifted stronger than its evidence. So the guard
is doing its job and the file is the one that is wrong.

## Fix shape

One word in the brief: "behaviour is unchanged from what
`viewer_transport_honest_hosted` shipped", or any wording that does not assert
byte identity. Not a change to `tests/test_provenance.py` — weakening the
scanner to let figurative uses through is how the original defect came back.

Worth a second look at whether the scanner should skip `docs/strategy/`
entirely; it currently reads it as a live document, which is defensible (a
brief is read and acted on) but means a strategy agent writing prose can
redden a tactical agent's baseline. That judgement is a strategy call, hence
the low-friction fix above being offered first.

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
