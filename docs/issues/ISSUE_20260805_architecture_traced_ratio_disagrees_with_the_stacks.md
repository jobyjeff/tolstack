---
type: bug
priority: low
status: closed
area: docs / provenance accounting
reporter: agent
handoff: docs/sessions/active/HANDOFF_20260806_traced_labels_and_ratio.md
closed: 2026-08-06
closed_by: handoff traced_labels_and_ratio
---

> **CLOSED 2026-08-06** by handoff `traced_labels_and_ratio`, after Part 1 moved
> the counts. Recomputed, not copied — the pre-relabel table below is superseded:
>
> **3 traced / 7 inferred / 16 untraced, out of 26 element instances** across
> `tan_link_to_pitch_plate`, `tan_link_to_pitch_plate_take2` and
> `vpa_output_to_pitch_plate`. (19 of 48 across all six stacks.) The three traced
> instances are `tan_link:pitch_plate_flange` (215197 sheet 2 B4),
> `tan_link:fastener_grip_14` and `vpa_output:fastener_grip` (both
> `NAS6403-NAS6420 Rev 4.pdf` sheet 3).
>
> **Denominator adopted: element instances**, as this issue suggested. The
> definition — instances rather than distinct ids, the stack set named
> explicitly, and `traced` meaning *the band is in the cited document* — now
> lives in **exactly one place**, `docs/SOP_TOLERANCE_STACK.md` § "The traced
> ratio". Every other document quotes the number and points there. The count
> itself is produced by `tests\debug_report_tolerance_stacks.py --ratio` and
> pinned by `test_the_seeded_traced_ratio_is_the_number_every_document_quotes`,
> so the next divergence fails the suite instead of surviving three reviews.
>
> Corrected with a dated note, not silently, in: `ARCHITECTURE.md` (which also
> lost an 18-line block duplicated by an earlier merge conflict — it held a
> second copy of this very sentence), `docs/prompts/REVIEW_AGENT.md`,
> `docs/SOP_TOLERANCE_STACK.md`, all four worksheets,
> `data/inbox/specs/README.md`, and both lessons. `docs/sessions/reviews/` and
> `docs/sessions/completed/` were deliberately left alone: they record what was
> believed on a date, and they are the evidence this correction rests on.

> **Triaged 2026-08-06.** Routed into the same handoff as
> `ISSUE_20260804_three_seeded_elements_are_traced_but_their_bands_are_not.md`
> (Part 2 of it): relabelling those three elements moves the counts, so
> restating the ratio first would just be wrong twice. The table below is
> pre-relabel and must be recomputed, not copied.

# ARCHITECTURE.md's "1 of 17 element instances is traced" does not match the stacks

`ARCHITECTURE.md` ("Known modelling gaps") states:

> The binding constraint on nearly every value is the **absence of a
> fastener-spec library**: 1 of 17 element instances across the three seeded
> stacks is `traced`.

and `WORKSHEET_pitch_link_to_pitch_plate.md` repeats it ("Slice 1 scored **1
traced out of 17** across three stacks"). Counting the three slice-1 stacks
(`tan_link`, `tan_link_take2`, `vpa_output`) as they sit on disk today:

| | count |
|---|---|
| element **instances** | **26** |
| distinct element ids | 18 |
| instances with a `hardware_ref` | 10 |
| `traced` | **4** |
| `inferred` | 6 |
| `untraced` | 16 |

The four traced instances are `tan_link:pitch_plate_flange`,
`tan_link:fastener_grip_14`, `vpa_output:under_head_chamfer_washer` and
`vpa_output:fastener_grip`. So neither number in the claim reproduces: not the
denominator (17 vs 26 / 18 / 10) and not the numerator (1 vs 4).

`PROVENANCE.md` records all three of those stack files as byte-identical to their
drawing-checker import, so the disagreement is not drift in the stacks — the
claim was either counting something else that is no longer stated, or was wrong
when written.

This is small, but it is a **provenance claim in a repo whose one rule is that
values trace**, and it is the headline number a reader takes away about how much
of the seeded work is sourced. Understating it by 4x is not flattering, but it is
still inaccurate.

## Suggested fix

Decide what the denominator should be (instances is the most useful, and matches
what a reviewer sees per stack in the viewer), restate both numbers, and say
which is which — e.g. "4 of 26 element instances across the three seeded stacks
are `traced`; 16 are `untraced`". Amend the same sentence where the pitch-link
worksheet quotes it, and note the correction rather than silently editing a
number a review already read.

Found by handoff `stack_viewer_v0`, 2026-08-05: the viewer's per-stack provenance
scoreboard (built by `scripts/build_viewer_projection.py`, pinned by
`tests/test_viewer_projection.py`) prints these counts on every stack row, which
is how the mismatch surfaced. The pitch-link stack's own "4 traced / 2 inferred /
0 untraced out of 6" **does** reproduce exactly and has a test.
