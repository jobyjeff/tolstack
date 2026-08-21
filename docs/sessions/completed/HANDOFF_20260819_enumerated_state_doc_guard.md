---
priority: low
depends_on: []
---

# HANDOFF 2026-08-19 — enumerated_state_doc_guard: a deleted provenance section fails the suite

Source: `docs/strategy/BRIEF_20260817_doc_scan_deletion_guards.md` — Jeff
picked shape 2 (2026-08-19 strategy session): derive the documentation
requirement from the data, and write down that everything else is covered by
the review checklist, not by tests. Baseline: trunk (the README restored
2026-08-12 is the corpus this must protect). Scope: `tests/` (the doc-scan
guard family), a short written decision note; do NOT restructure the live
documents themselves beyond what a failing-then-passing demonstration needs.

## Deliverables

1. **The enumerated-state guard.** Every enumerated state the viewer has a
   branch for (`VA.EXPORT_STATUSES`, `values_status` — enumerate from the
   code, not from a hand-kept list) must be *mentioned by name* in the
   owning surface's README. Self-updating in both directions: add a state to
   the code and the guard demands documentation; the guard walks
   `live_documents()` (which is deliberately a walk, not a list — keep it
   that way).
2. **Prove it catches the 08-12 deletion.** The reproduced hole: removing
   `## Which bytes the number was read off` from `apps/viewer/README.md` plus
   the `EXPORT UNESTABLISHED` and `CTE NOT TRANSCRIBED` legend rows left the
   suite at 350 passed, 0 failed. The new guard must fail on exactly that
   edit (demonstrate in a test fixture or a temporary working-tree
   manipulation inside the test, NOT by committing a broken README).
3. **Write the decision down** (suggest alongside the guard's docstring plus
   a line in `docs/prompts/REVIEW_AGENT.md`'s existing entry): shape 2
   protects sections documenting enumerated code states, and prose beyond
   that is deliberately guarded by the review checklist + working-tree
   hygiene, not by tests — chosen over a required-heading manifest (goes
   stale) and a claim-count baseline (its own staleness surface). Cite the
   brief so the reasoning isn't re-derived.

## Definition of done

- The guard passes on the current corpus; deleting the 08-12 section (in the
  test's controlled copy) fails it with a message naming the missing state
  and the surface that should mention it.
- Value-level: the state list in the test is derived from the code's enums —
  pin that a state added to the enum without documentation fails.
- Full suite green (351 in the main checkout / 350+1 skip in a worktree is
  the known baseline).
- Lesson (`docs/sessions/lessons/LESSONS_20260819_enumerated_state_doc_guard.md`):
  which surfaces own which enums, and any enumerated state found undocumented
  TODAY (fix or file, don't ignore).
