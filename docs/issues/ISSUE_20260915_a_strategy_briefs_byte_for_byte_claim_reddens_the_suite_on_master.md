---
type: bug
priority: med
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
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
