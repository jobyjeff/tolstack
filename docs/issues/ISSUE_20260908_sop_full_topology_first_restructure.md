---
type: chore
priority: low
status: triaged
area: docs/SOP_TOLERANCE_STACK.md
reporter: agent
audience: strategy
strategy: docs/strategy/BRIEF_20260909_sop_full_topology_first_restructure.md
---

# `docs/SOP_TOLERANCE_STACK.md` still reads as a linear-stack document with a topology pointer, not a topology-first procedure

Handoff `topology_schema_v1` (2026-09-08) asked that
`docs/SOP_TOLERANCE_STACK.md` "become the procedure for authoring a topology +
studies; the linear chain is presented as the degenerate case, not a separate
document class." That session added a framing section ("Topology first: a
stack is the linear degenerate case", right after the intro, before "The one
rule") that states the decision, says which document to start from, and
cross-links `docs/DAG_TOPOLOGY.md` — but deliberately did **not** restructure
the ~1000-line document itself: Steps 0–8 are still written and ordered as the
linear-stack procedure, with topology treated as a pointer-out rather than
folded in as the general case with the linear chain as a worked example of it.

**Why not done in that session**: the file is paired against the code by
several string-anchored tests (`tests/test_sop_vocabulary.py`'s two
pipe-list anchors, each requiring an exact single match; the traced-ratio
figures pinned elsewhere) and the handoff's own instruction was that "the
citation core... moves intact" — restructuring a long, heavily
cross-referenced procedural document under one session's time budget risked
breaking an anchor invisibly. A conservative framing-only edit was judged the
smaller, safer change; see that session's lesson,
`docs/sessions/lessons/LESSONS_20260908_topology_schema_v1.md`, "What I chose
not to do".

**What a fuller pass would involve**, if a strategy session decides it is
worth doing:

- Deciding whether Steps 1–6 should be rewritten generically over "an element"
  (covering both `StackElement` and topology's `Dimension`) with the linear
  case as a worked example, or left as-is with a topology appendix.
- Auditing every anchor `tests/test_sop_vocabulary.py` and
  `tests/test_tolerance_stack.py` read out of this file before moving any of
  the surrounding prose, so a restructuring pass does not silently orphan a
  pairing test.
- Deciding whether `docs/DAG_TOPOLOGY.md` should be folded into
  `SOP_TOLERANCE_STACK.md` outright, or stay a separate, cross-linked document
  (the current shape) — the handoff's wording is compatible with either
  reading.

Not urgent: the framing added 2026-09-08 already tells an agent correctly
which document to start from and that the citation core is shared, so nobody
is currently misled by the document's shape — this is a documentation-quality
follow-up, not a correctness gap.
