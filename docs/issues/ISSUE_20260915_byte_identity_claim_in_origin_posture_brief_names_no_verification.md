---
type: bug
priority: low
status: closed
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_pitch_link_known_bands.md
resolution: closed as a duplicate by the 2026-09-16 triage sweep -- one defect, filed nine times by nine sessions in one day. The cause (an unbacked byte-identity claim in BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62) was fixed this sweep by rewording the claim; tests/test_provenance.py is green and the full suite is 1155 passed on master. Tracked at ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md, which is status: resolved and names all nine. Closed rather than resolved because nothing in this file was acted on
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
