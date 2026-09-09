---
type: feature
priority: low
status: open
area: apps/viewer/tests.js
reporter: agent
audience: strategy
---

# A bare literal structural count (`branch_nodes.length === N`) in a JS test can go stale for months under "one pre-existing unrelated failure" cover

`HANDOFF_20260909_tolstack_viewer_js_suite_drift` fixed
`apps/viewer/tests.js`'s `[real] the pitch system's four/five forks are marked`,
whose `branch_nodes.length === 4` assertion had been wrong (live count: 5)
since on or before 2026-09-06. Two independent by-hand derivations
(`docs/DAG_TOPOLOGY.md`'s L2 section, and `REVIEW_20260906_mechanical_stroke_
stack.md`'s `len(t.branch_nodes())` re-derivation) already agreed on 5 before
this fix, yet at least three review cycles
(`LESSONS_20260908_viewer_v2_single_nav.md` §7 and its own loopback review)
re-labelled the mismatch a "concurrent-rebuild race" without re-running that
cheap check, because a stable-looking `N/N+1 passed, one pre-existing
failure` summary line reads as "already known, already triaged" rather than
"go look at this."

This repo already has a named anti-pattern for the adjacent case — "a
quantity written in prose that no test reads from the tree is a defect"
(`CLAUDE.md`, "Things that cost previous sessions time") — enforced for
prose counts via `ARCHITECTURE.md`'s module-inventory test. This issue asks
whether the same principle should extend to a **hardcoded structural count
in a JS test**, which is exactly as capable of silently going stale and, on
this evidence, harder to notice once it does (a JS assertion failure just
adds one more "pre-existing failure" to a running tally; a prose/tree
mismatch fails its own named test with a specific message).

**Possible fix shape** (not designed here — this needs a design decision,
which is why it's `audience: strategy` rather than a tactical fix): derive
the expected branch/fork count from something the topology's own provenance
or `docs/DAG_TOPOLOGY.md` already states in one place, rather than a bare
`=== N` literal duplicated into the test — mirroring the "one named
constant plus a test pairing the prose against it" shape this repo already
uses for field vocabularies. Whether that means reading a count out of
`docs/DAG_TOPOLOGY.md` at test time, a shared constant, or something else is
the open question.

Not fixed as part of `tolstack_viewer_js_suite_drift`: that handoff's scope
was the two red assertions themselves, not a redesign of how the test
suite pins structural counts.
