---
type: bug
priority: low
status: open
area: docs / provenance accounting
reporter: agent
---

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
