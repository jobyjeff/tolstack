---
type: bug
priority: med
status: closed
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
resolution: closed as a duplicate by the 2026-09-16 triage sweep -- one defect, filed nine times by nine sessions in one day. The cause (an unbacked byte-identity claim in BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62) was fixed this sweep by rewording the claim; tests/test_provenance.py is green and the full suite is 1155 passed on master. Tracked at ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md, which is status: resolved and names all nine. Closed rather than resolved because nothing in this file was acted on
---

# A byte-identity claim in the 2026-09-15 origin-posture brief fails the provenance guard

`venv-win/Scripts/python.exe -m pytest -q` is **red on a clean tree** (measured
2026-09-15 at the head of `handoff/viewer_study_verdicts_and_gaps`, cut from
`integration`, before any edit):

```
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
  docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62
  "deliberately does not, so the viewer's behaviour is byte-for-byte what"
```

884 passed, 1 failed, 1 skipped. Nothing else is red.

The brief landed in `df21a4a` ("triage 2026-09-15: disposition 18 open issues
into 5 handoffs + 2 briefs"). The guard's rule is that a byte-identity claim in
a live file must name the verification that checks it — a test name, a sha256,
or a `git diff` — in the same paragraph. The sentence at line 62 asserts the
viewer's behaviour is "byte-for-byte what `viewer_transport_honest_hosted`
shipped" and names nothing.

**Repro:** `venv-win/Scripts/python.exe -m pytest -q tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`

**Fix shape:** either name the verification in that paragraph, or weaken the
claim to what is actually checked ("unchanged", "the same branch"). It is one
sentence in a strategy brief, which is why this is filed rather than fixed: the
brief is the strategy advisor's artifact and the wording is their call, and a
tactical session editing someone else's brief to make its own suite green is
the wrong shape.

**Cost while open:** every session in this repo starts and ends on a red suite,
so "green before, green after" stops being a usable check for anyone.

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
