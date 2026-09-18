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

## Second sighting, and it is no longer hypothetical — 2026-09-18

Added by the review of `real_tier_red_and_the_skipping_tier`
(`docs/sessions/reviews/REVIEW_20260918_real_tier_red_and_the_skipping_tier.md`),
which measured the cost of this exemption on a live page rather than in the
abstract. `docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json`'s
`joint.assembly_export_ref` was rendered key-by-key by `kvList`, so the
`pitch_link_to_pitch_plate` page was printing, as `dd.kv__value` nodes:

* `C:/workspace/drawing-checker/data/inbox/drawings/[PRELIM 2026-AUG-3] 217755
  A.1 PROPULSION ASSEMBLY, PROPELLER.pdf` — an absolute workstation path,
* `c6381f20…4294d8` — a 64-character checksum, which the `\b[0-9a-f]{24,}\b`
  shape guard exists for, and
* `20260803_145243` and `20260804_114000` — two bare run ids, which the
  `\d{8}_\d{6}` shape guard exists for.

**None of the three fired.** The only thing the surface scan could see was the
`sha256` *label*, because a label is a `<dt>` and only the `<dd>` is exempt —
so the guard reddened on the least harmful of four leaks, and the three it was
actually written for rode through this exemption for two days on trunk.

That session fixed the instance the right way (the key is lifted out and
rendered through `VA.exportBlockNode`, so no free-form value is involved any
more) and deliberately did not touch the exemption, which is correct and is
why this issue is still open. What has changed is the evidence: the "two
halves are both true" trade above now has a measured cost on one side of it,
and the next authored free-form value carrying a path or a hash is invisible
in exactly the same way.
