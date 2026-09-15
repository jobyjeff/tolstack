---
type: bug
priority: med
status: open
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_extracted_mesh_alias_rows.md
---

# `tests/test_provenance.py`'s byte-identity guard reds the suite on a brief the triage sweep wrote

**The suite is red on `master` and `integration` right now**, for a reason
unrelated to any handoff staged in the 2026-09-15 sweep. Measured from a
worktree cut off `integration`, with a clean tree:

```
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
1 failed, 879 passed, 1 skipped
```

Any tactical handoff from this sweep whose definition of done says "`pytest -q`
green" cannot satisfy it as written, and will report a red suite it did not
cause. (`HANDOFF_20260915_extracted_mesh_alias_rows.md` states the baseline as
"880 passed, 1 skipped"; the real baseline at that commit is 879 passed,
1 failed, 1 skipped.)

## The claim and why the guard bites

`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`:

> `apps/annotate/` passes its hostname, and `apps/viewer/`'s `topology_app.js`
> deliberately does not, so the viewer's behaviour is **byte-for-byte** what
> `viewer_transport_honest_hosted` shipped.

The guard (sighting 3 in its own docstring) requires that an asserted
byte-identity name what checks it — a `sha256`, a `git diff`, a blob, a test,
or `PROVENANCE.md` — **in the same block of prose**. This one names a handoff
slug, which is not a verification: nothing in the paragraph says which test or
diff would catch the viewer's behaviour drifting.

## Repro

```
git switch integration        # or master
venv-win/Scripts/python.exe -m pytest -q tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
```

## Introduced by

Commit `df21a4a` ("triage 2026-09-15: disposition 18 open issues into 5
handoffs + 2 briefs"), which added the brief. Contained by `master`,
`integration` and every handoff branch cut from the sweep. The guard itself is
behaving exactly as designed — the brief is new prose that was never run
against it.

## Two ways to fix, both cheap

1. **Weaken the claim to what is checked.** The brief's point is that the
   viewer's transport decision is *unchanged*, which is a claim about
   behaviour, not bytes: "so the viewer's behaviour is unchanged from what
   `viewer_transport_honest_hosted` shipped" clears the guard and says the
   same thing.
2. **Name the verification**, if one exists — the `apps/viewer/run_tests.cjs`
   test that pins `VA.isLocalPage`'s no-hostname answer would do it.

Option 1 is the honest one unless somebody can point at the test.

## Note for whoever fixes it

A brief is live prose, so the doc guards read it. Worth checking whether the
triage sweep's *other* new brief and the five handoff files clear the same
scan — this one only surfaced because a handoff happened to run the full suite
before touching anything.
