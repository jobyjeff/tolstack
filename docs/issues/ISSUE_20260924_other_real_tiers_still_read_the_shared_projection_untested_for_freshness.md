---
type: bug
priority: med
status: open
area: tests/projection-freshness
reporter: agent
found_by: docs/sessions/HANDOFF_20260924_fixture_pairing_reads_a_fresh_projection.md
---

# Three more readers still trust `data/projections/viewer/` without asking which tree built it

`fixture_pairing_reads_a_fresh_projection` (2026-09-24) fixed **one** reader.
`apps/viewer/run_tests.cjs` now reads each projection's provenance stamp and
asks git whether the inputs it names still match the tree under test, and makes
a stale answer a failed check plus a skipped tier. The handoff's scope named
that runner, `apps/viewer/fixtures.js`, `tests/test_viewer_js_suite.py` and
`CLAUDE.md` and nothing else, so the sites below were fenced out — correctly,
but the fence is not a fix and the handoff it belonged to closes.

**The defect is the same one in every row**: a guard compares something
*tracked* (a fixture, an alias table, a declared value) against something
*gitignored, shared by every worktree and rebuilt by hand*. When the two are
from different trees the guard agrees with itself, and it can only fail
downstream of the gate it exists to feed.

| site | what it pairs against the projection | how it behaves when the projection is stale |
| --- | --- | --- |
| `apps/annotate/run_tests.cjs`, `[real] planStudyTrace over every real study` | the tracked part/mesh alias table and the planner, against `data/projections/viewer/topologies.json` | passes against whatever is on disk; absence is a `SKIP` line, staleness is nothing |
| `apps/annotate/run_tests.cjs`, the live pitch-link face-suggestion check (`SKIP  [real] face suggestions over the live pitch-link joint` is its absent arm) | the suggestion rules against the same projection plus `data/meshes/` | same |
| `tests/claims_registry.py`, the `smallest_chain` metric's source | a **declared value in a live document** re-derived from `data/projections/viewer/topologies.json` | a declaration is confirmed against a projection built from a tree that no longer exists — and this one publishes a number |

The third is the worst of the three and the reason this is not `low`: the
claims registry exists so a published figure cannot go stale silently, and
re-deriving it from a stale artifact restores exactly the failure mode it
replaced. It also reaches for the main checkout by absolute path
(`C:/workspace/tolstack/...`) when the local one is absent, so a worktree
confirms a declaration against a projection from a tree it may not contain.

## What a fix has to establish

The freshness question is already answered once, in JS, inside
`apps/viewer/run_tests.cjs` (`projectionFreshness`): it reads the stamp, finds
the recorded source directory *by shape* so the key name stays a fact Python
owns, and asks git whether those inputs plus the recorded builder plus
`tolerance_stack/` still match the tree. Two consumers of that answer are
Python and one is a second node harness, so the honest question for whoever
picks this up is **where the one implementation should live** — most likely
`scripts/projection_provenance.py`'s read side, with the node harnesses calling
it or with the JS kept as the one copy and the Python one deriving from the same
stamp. What must not happen is three hand-written freshness checks that drift.

`tests/claims_registry.py` needs a decision of its own that the other two do
not: a stale source for a declared value could be `UNAVAILABLE` (the outcome
the registry already has for a source it cannot reach) rather than a failure,
since "I could not check this" is a state it already models honestly.
