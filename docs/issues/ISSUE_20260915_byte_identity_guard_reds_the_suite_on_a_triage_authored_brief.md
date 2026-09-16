---
type: bug
priority: med
status: closed
area: docs/strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_extracted_mesh_alias_rows.md
resolution: closed as a duplicate by the 2026-09-16 triage sweep -- one defect, filed nine times by nine sessions in one day. The cause (an unbacked byte-identity claim in BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62) was fixed this sweep by rewording the claim; tests/test_provenance.py is green and the full suite is 1155 passed on master. Tracked at ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md, which is status: resolved and names all nine. Closed rather than resolved because nothing in this file was acted on
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

## Duplicate — added in review, 2026-09-15

`ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`
(handoff `mutation_witness_tier_repair`) reports the same failure, the same
line of the same brief. Neither author could see the other: that issue reached
`integration` at 15:22, and this handoff's branch point (`3141e51`) is 15:01.
Both are kept because each carries its own measurement — that one has the
branch-point run, this one has the observation that the guard reads **test
docstrings** too (it caught a byte-identity claim in a draft of
`test_installed_mesh_part_ids_are_unique`). **Triage: close one, fold the two
measurements into the survivor.**

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
