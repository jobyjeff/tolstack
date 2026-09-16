---
type: bug
priority: low
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_pitch_link_known_bands.md
---

# `test_every_byte_identity_claim_in_a_live_file_names_its_verification` is red on `integration`, from a strategy brief

Pre-existing failure, present on `handoff/pitch_link_known_bands` at its branch
point (`950618b`) and untouched by that handoff's work. Recording it so the next
session does not spend the time re-diagnosing it, and so a red suite is not read
as this handoff's.

```
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
  docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62
    "deliberately does not, so the viewer's behaviour is byte-for-byte what"
```

The brief was added by `df21a4a` ("triage 2026-09-15: disposition 18 open issues
into 5 handoffs + 2 briefs"). The guard's own message says what it wants: *name
the verification in the same paragraph (a test name, a sha256, a `git diff`), or
weaken the claim to what is actually checked.*

## What the fix is

One of two, and the choice belongs to whoever owns that brief:

* the sentence means `viewer_transport_honest_hosted`'s behaviour is unchanged
  **because `topology_app.js` passes no hostname to `VA.isLocalPage`** — if a
  test pins that, name it in the same paragraph; or
* weaken "byte-for-byte" to what is actually checked. The claim is about a code
  path's behaviour, not about bytes, and the guard exists precisely because
  "byte-identical" gets written for emphasis.

Do not add the brief to the historical-names exemption: it is a live document
making a live claim.
