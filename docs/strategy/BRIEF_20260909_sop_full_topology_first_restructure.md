# STRATEGY BRIEF 2026-09-09 — sop_full_topology_first_restructure: finish making SOP_TOLERANCE_STACK.md topology-first

> **Routing note.** `docs/issues/ISSUE_20260908_sop_full_topology_first_restructure.md`
> is `type: chore`, `priority: low`, `audience: strategy` — the filer marked
> this a document-restructuring design call, not a mechanical edit.

## The gap, as filed

Handoff `topology_schema_v1` (2026-09-08) asked that
`docs/SOP_TOLERANCE_STACK.md` "become the procedure for authoring a topology +
studies; the linear chain is presented as the degenerate case, not a separate
document class." That session added a framing section right after the intro
("Topology first: a stack is the linear degenerate case") that states the
decision and cross-links `docs/DAG_TOPOLOGY.md` — but deliberately did **not**
restructure the ~1000-line document itself. Steps 0–8 are still written and
ordered as the linear-stack procedure, with topology treated as a pointer-out
rather than folded in as the general case with the linear chain as a worked
example.

## Why it wasn't done in that session

The file is paired against the code by several string-anchored tests
(`tests/test_sop_vocabulary.py`'s two pipe-list anchors, each requiring an
exact single match; traced-ratio figures pinned elsewhere), and the handoff's
own instruction was that "the citation core... moves intact." Restructuring a
long, heavily cross-referenced procedural document under one session's time
budget risked breaking an anchor invisibly, so a conservative framing-only
edit was judged the smaller, safer change — see
`docs/sessions/lessons/LESSONS_20260908_topology_schema_v1.md`, "What I chose
not to do."

Not urgent: the framing already added correctly tells an agent which document
to start from and that the citation core is shared, so nobody is currently
misled by the document's shape. This is a documentation-quality follow-up,
not a correctness gap.

## Open questions a strategy session needs to decide

- Should Steps 1–6 be rewritten generically over "an element" (covering both
  `StackElement` and topology's `Dimension`) with the linear case presented as
  a worked example of the general procedure, or left as-is with a topology
  appendix?
- Whoever picks this up must audit every anchor `tests/test_sop_vocabulary.py`
  and `tests/test_tolerance_stack.py` read out of this file before moving any
  surrounding prose, so a restructuring pass doesn't silently orphan a pairing
  test.
- Should `docs/DAG_TOPOLOGY.md` fold into `SOP_TOLERANCE_STACK.md` outright,
  or stay a separate, cross-linked document (the current shape)? The
  `topology_schema_v1` handoff's wording is compatible with either reading.

## Decompose into

Likely one tactical handoff once the shape is decided — but the decision
itself (generic-rewrite vs. topology-appendix, fold-in vs. stay-separate)
needs to happen here first, since it determines the scope and the anchor-audit
checklist the tactical agent would need.
