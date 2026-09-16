# BRIEF 2026-09-16 — the two propeller links are named three different ways: which source is authoritative, and do the committed ids get to stay wrong?

> **Routing note.** Filed by the 2026-09-16 triage sweep from
> `docs/issues/ISSUE_20260915_the_link_names_are_crossed_between_the_workbook_the_drawings_and_the_stacks.md`
> (chore, low, `audience: strategy`, found by
> `HANDOFF_20260915_stack_fable_audit.md`). It is here rather than in a tactical
> handoff because the issue asks which of three naming sources wins and whether
> committed identifiers are renamed behind a redirect layer — a decision with a
> cost, not a fix with a diff. The filer declined to pick, and so does this
> brief: nothing below is designed, and no option is preferred.

Source issue:
- `docs/issues/ISSUE_20260915_the_link_names_are_crossed_between_the_workbook_the_drawings_and_the_stacks.md`
  (chore, low, `audience: strategy`)

## The measured crossing

Three vocabularies name the two propeller link types, and they disagree:

| where | the 3-place link (qty 3) | the 5-place link (qty 5) |
|---|---|---|
| drawings (title blocks) | 212956-005 **PITCH ANTI ROTATION LINK ASSEMBLY** (machined link 213863-004) | 213862-002 **PITCH LINK ASSEMBLY** (per 216231 A.1) |
| the 260729 workbook + slice 1 + this repo's stack ids | **"Tan Link"** / `tan_link_to_pitch_plate` | — |
| Jeff's 2026-08-04 request + this repo's stack ids | — | **"pitch link"** / `pitch_link_to_pitch_plate` |
| 217755's own parts list | as titled | absent — the "TANGENTIAL LINK MOUNT" assemblies (215175) hold no link in their own parts list |

So the stack named `tan_link_to_pitch_plate` models the joint of a part whose
title block reads **PITCH ANTI ROTATION LINK**, while the drawing-titled
**PITCH LINK**'s stack is the one whose id Jeff coined. The repo is internally
consistent with the drawings on *which joint is which*, and simultaneously a
standing trap for anyone grepping "tangential link".

**It has already cost one real mis-attribution, and the record of it is in the
tree.** The 2026-09-06 endstop owner-refinement attached
`docs/topologies/topology_pitch_system.json`'s `pitch_link_length` edge
(`properties.nominal_length_mm: 109.4`, 77° link angle) to 212956-005 /
213863-004 — whose machined link carries only a parenthesized reference length
of `(81.43)`, and which is qty **3** where this edge needs five, one per blade.
Corrected 2026-09-15 by `stack_fable_audit` from the 216231 A.1 HUB AND BLADE
ASSEMBLY parts list, which names **213862-002 PITCH LINK ASSEMBLY, PROPELLER at
qty 5**; the owner note on that edge now carries both refinements and the reason
the first was wrong. The band itself never moved — it is the workbook's,
`untraced` — so the whole cost of the tangle landed on *identity*, which is the
one thing this repo exists to get right.

The audit's own disposition was to write the mapping down where the words meet
(stack notes, `hardware_entries.json`, the audit report) rather than rename
anything, **because the ids are not free to move**: `tan_link_to_pitch_plate`
and `pitch_link_to_pitch_plate` are deep-link parameters, `crop_key` spaces,
annotate binding keys and projection keys. `tan_link_to_pitch_plate` alone
appears in **170 tracked files** and in all three shared projections
(`C:\workspace\tolstack\data\projections\viewer\{crops,results,topologies}.json`).
The same is true one level down for part ids that embed a number —
`pitch_plate_215197` and `pitch_flange_215197`
(`docs/topologies/topology_{pitch_link,vpa_output}_to_pitch_plate.json`, also
used as `edges[].part` values) — which the 2026-09-16 re-citation of that plate
to the released **215735-001/-002** leaves naming a superseded drawing
(`HANDOFF_20260916_citation_identity_correctness.md` deliverable 2 re-cites the
values and is fenced **out** of renaming any id, deferring here).

## The question

**Which of the three sources is authoritative for a part's name in this repo —
the drawing title block, the originating workbook, or the id a human coined —
and what happens to the ids that already encode the losing answer?**

The issue offers the two ends and picks neither: keep the ids forever with the
mapping written down (today's state), or schedule a one-time rename with a
redirect layer. Either way, **decide once** — the tangle has now cost one
mis-attribution, and every future session that greps the wrong word pays the
same toll.

## What a strategy session has to decide

- **The authority rule itself**, stated once somewhere a guard can read it: when
  a drawing title block, a source workbook and a coined id name the same
  physical part differently, which one a *reader-facing* name follows, and
  whether a machine id is under the same rule at all. Note the repo's existing
  answer for a neighbouring case — `data/inbox/drawings/PROVENANCE.md` records
  that "which part is which was read off the **title blocks**, not inferred from
  the part number" — and whether that generalises or was specific to intake.
- **Whether an id may be wrong on purpose**, and if so how loudly. Today the
  answer is "yes, with the mapping written down"; what is undecided is where
  that mapping lives so that it is *found* rather than re-derived, and whether
  anything makes it stay true.
- **If a rename: the scope and the redirect layer.** Which ids are in scope
  (stack ids only, topology part ids, `crop_key` spaces, annotate binding keys,
  feature-identity event keys), whether old ids keep resolving and for how long,
  and what happens to the immutable `feature-identity/v0` events and the
  committed deep links a reader may have saved. An id rename that silently
  drops a binding is a worse defect than the name it fixes.
- **If not a rename: what stops the next mis-attribution.** The 2026-09-06 one
  was made by a session reading a name, not a number. A written mapping is only
  a fix if the session that needed it would have read it.
- **Whether the number-bearing ids are the same decision or a different one.**
  `pitch_plate_215197` names a superseded drawing as of 2026-09-16, and
  `tan_link_to_pitch_plate` names the wrong link. Both are "a committed id that
  states something no longer true", but one is a part-number succession and the
  other is a vocabulary crossing — they may want one rule or two, and that is
  part of the decision, not a premise of it.

## Related, already routed — do not duplicate

- `HANDOFF_20260916_citation_identity_correctness.md` (staged) re-cites the
  three pitch-plate lug elements from the PRELIM 215197 to the released
  215735-A, updates the reader-facing names that state what the joint contains
  today, and is explicitly forbidden from renaming any id. It records the
  mapping instead. If a decision here orders a rename, that handoff's notes are
  where the mapping to redirect from already lives.
- `docs/strategy/BRIEF_20260915_prose_field_rules_names_and_derivable_counts.md`
  (open) asks what a `name` field may **carry** — caption length, parenthetical
  units, where a demoted half of a long name goes. That is a style rule for the
  field; this brief is about which source the name's *content* must agree with.
  Adjacent, not the same question — but if both are decided, they touch the same
  SOP paragraph ("Titling an artifact") and should be written so as not to
  contradict each other.
- `docs/strategy/BRIEF_20260909_topology_part_vocabulary_mesh_mapping.md` is
  closed and already decided (a declared alias table, tracked config,
  exact-match only, `mesh_part_alias_table`). That answered how a topology
  edge's `part` maps to a **mesh's** `part_id` across repos; it did not touch
  what either of them should be called. If a rename happens, the alias table is
  one of the surfaces it has to carry.
- `docs/strategy/BRIEF_20260911_endstop_topology_retrace_and_f12.md` (open)
  owns the endstop topology's remaining retrace and its Jeff/CAD question. The
  mis-attribution cited above is *evidence* here and *already fixed* there; do
  not reopen it.
