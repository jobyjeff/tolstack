---
type: bug
priority: med
status: closed
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
resolution: closed as a duplicate by the 2026-09-16 triage sweep -- one defect, filed nine times by nine sessions in one day. The cause (an unbacked byte-identity claim in BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62) was fixed this sweep by rewording the claim; tests/test_provenance.py is green and the full suite is 1155 passed on master. Tracked at ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md, which is status: resolved and names all nine. Closed rather than resolved because nothing in this file was acted on
---

# `BRIEF_20260915_origin_posture_and_absent_feature_rule.md` asserts byte-identity with nothing named that checks it, and master is red

`tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
fails on **trunk**, not only on a branch. Measured 2026-09-15 in the main
checkout at `fc3406a`:

```
byte-identity asserted with nothing named that checks it:
  docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62
  deliberately does not, so the viewer's behaviour is byte-for-byte what
```

The brief was added by the 2026-09-15 triage sweep (`df21a4a`, "triage
2026-09-15: disposition 18 open issues into 5 handoffs + 2 briefs"). The scan
it trips is the one from provenance sighting 3: outside the historical record,
an asserted byte-identity has to name what checks it — a test, a `sha256`, a
`git diff` — in the same block of prose, or be weakened to what is actually
checked.

Here the claim is true and *is* checked: `apps/viewer/tests.js`'s
`chooseTransport` cases pin that `apps/viewer`'s `topology_app.js` passes no
hostname. So this is a one-line prose fix — name that guard in the sentence, or
say "exactly what `viewer_transport_honest_hosted` shipped" and drop the byte
language.

**Not fixed here on purpose.** The handoff `annotate_hosted_page_posture` went
`staged -> active` on master at `fc3406a` and works from this very brief;
editing it from another worktree mid-flight is a collision for no gain. Whoever
lands that handoff has the file open anyway.

Until then, every session in this repo starts from a suite that is 1 red, and
the next agent to see it will spend time deciding whether it is theirs — which
is the real cost and the reason this is `med` rather than `low`.

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
