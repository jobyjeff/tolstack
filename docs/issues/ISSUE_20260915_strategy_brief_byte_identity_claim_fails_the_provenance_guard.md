---
type: bug
priority: med
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
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
