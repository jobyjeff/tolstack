---
type: bug
priority: med
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md
---

# `integration` is red before any handoff touches it: a strategy brief asserts byte-identity with nothing named that checks it

`venv-win/Scripts/python.exe -m pytest -q` is **not green on the branch point**
every handoff staged on 2026-09-15 was cut from. Measured at the first command of
`mutation_witness_tier_repair`, before a single edit:

```
1 failed, 879 passed, 1 skipped in 27.97s
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
```

```
byte-identity asserted with nothing named that checks it:
  docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62
    deliberately does not, so the viewer's behaviour is byte-for-byte what
```

The brief (added by the 2026-09-15 triage sweep, `e6fc904`) says, of
`apps/viewer/topology_app.js` not passing a hostname to `VA.isLocalPage`:

> …so the viewer's behaviour is byte-for-byte what `viewer_transport_honest_hosted`
> shipped.

`test_every_byte_identity_claim_in_a_live_file_names_its_verification` requires an
asserted byte-identity outside the historical record to name what checks it — a
`sha256`, a `git diff`, a blob, a test or `PROVENANCE.md` — in the same block of
prose. A handoff *slug* is not one of those, and the guard is right that nothing
here diffs bytes: the claim being made is about **behaviour**, which is the
weaker and true statement.

## Why this is worth its own issue rather than a one-word fix in passing

The fix is almost certainly to weaken the phrase — "is exactly the behaviour
`viewer_transport_honest_hosted` shipped" — or to name the test that pins it.
But the file is a **strategy brief**, owned by whichever strategy agent picks up
`BRIEF_20260915_origin_posture_and_absent_feature_rule`, and the sentence is
load-bearing in an argument about two apps answering differently about one
origin. Rewording someone's argument from inside an unrelated tactical handoff is
how a claim quietly changes meaning, so this is filed rather than fixed.

What it costs meanwhile: every tactical agent cut from `integration` this round
starts red and has to establish for itself that the red is not theirs. Two of the
five handoffs staged on 2026-09-15 are sequenced behind others, so this is
several sessions each paying the same few minutes.

## Note for whoever takes it

The guard is doing exactly its job — this is sighting N of the pattern it was
written for, in a file class (`docs/strategy/`) the earlier sightings did not
cover. Worth a line in `docs/prompts/REVIEW_AGENT.md`'s entry if the fix confirms
that triage-written briefs are a new source for it: a brief is prose nobody
diffs, which is the original condition restated.
