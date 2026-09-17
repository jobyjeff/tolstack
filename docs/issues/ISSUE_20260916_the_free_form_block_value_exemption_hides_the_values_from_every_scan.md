---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
audience: strategy
found_by: docs/sessions/reviews/REVIEW_20260916_reader_facing_copy_and_vocabulary.md
---

# `dd.kv__value` exempts 433 nodes from the whole surface scan — the free-form blocks are scanned for their labels and not their values

`reader_facing_copy_and_vocabulary` (2026-09-16) built the stack-side surface
walk and enrolled `dd.kv__value` in `VERBATIM_PROSE_CLASSES`, the list of nodes
whose text is subtracted before the scan runs. Measured on the `[real]` stack
walk over the live projections: **433 nodes**, by a wide margin the largest
exemption in the list (next is `li.el-gaps__text` at 125, then
`span.gap__text` at 91).

`dd.kv__value` is the **value** half of every free-form authored block — a
stack's or a topology's `joint`, and a generated check's `configuration`. So
after this change those blocks are scanned for their **labels**
(`VA.fieldLabel`, which is why planting the raw key reddens) and not at all for
their **values**.

## Why that matters, and why the exemption is nonetheless right today

The free-form block is the one place on this page where a human types an
arbitrary string into the record and the viewer prints it whole. It is
therefore simultaneously:

* the place a run id, a workstation path or a checksum is most likely to be
  **authored** — and this is measured, not hypothetical. Dropping
  `dd.kv__value` from the list and running only the banned-literals-and-shapes
  half of the scan reddens immediately:

  > `pitch_link_to_pitch_plate stack page renders "20260804_114000" (a
  > drawing-checker run id — an internal artifact's address, and a shape, so an
  > id nobody has written yet is caught too)`

  `rotor_fastener_length`'s joint block carries two more, in
  `"assembly_export": "[PRELIM 2026-AUG-19] 217755 A.1 PROPULSION ASSEMBLY,
  PROPELLER.pdf (drawing-checker runs 20260819_163414 / 20260819_110144, ...)"`.
  All of them are inside the exemption today; and
* genuinely **the record speaking** — a live joint block says *"not read for
  this stack — see identification_note"*, which names a field on purpose, and
  the ban has always been on the viewer's words and never on the record's.

Both halves are true, which is why the tactical agent left it as it stands and
wrote the trade down rather than quietly narrowing it. That was the right call
for the rework; it is not a resolution.

## The shape a resolution probably takes

A **two-tier exemption**: the record's own text is exempt from the *field-name*
scan (which is about the viewer using schema jargon as a label) but stays under
the *banned literals and shapes* (which are about a reader being shown a string
they can do nothing with — an absolute path, a checksum, a run id), with an
argued allowlist for the cases like `assembly_export` where the record really
is naming a run on purpose.

The reason that is a decision and not a refactor: `VERBATIM_PROSE_CLASSES`
today has one meaning — *"the ban is on the viewer's words, never the
record's"* — and that single sentence is what makes the list arguable at all.
Splitting it into two lists with two rules costs that, and whoever wants the
coverage should decide whether the trade is worth it before writing the code.
Either answer wants one line somewhere durable saying which it is, because
otherwise the next reviewer refiles this.
