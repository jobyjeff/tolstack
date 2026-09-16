---
type: bug
priority: med
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
---

# `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md` reddens `test_every_byte_identity_claim_in_a_live_file_names_its_verification`

> **Duplicate — added in review, 2026-09-15
> (`review/viewer_value_guard_rows_and_replays`).** This is the **fifth**
> filing of one baseline red, one per session that ran while it stood:
> `ISSUE_20260915_byte_identity_guard_red_on_the_origin_posture_brief.md` (high),
> `..._byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`,
> `..._strategy_brief_byte_identity_claim_fails_the_provenance_guard.md`,
> `..._byte_identity_claim_in_origin_posture_brief_names_no_verification.md`
> and this one. Cross-referenced rather than deleted: this is the only filing
> that identifies the text as a **figure of speech about behaviour** rather
> than a provenance claim, which is the argument for weakening the sentence
> instead of naming a verification. Dispose of all five together; the `high`
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
