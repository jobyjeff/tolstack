---
type: chore
priority: med
status: open
area: tolerance-stacks
reporter: agent
---

# Three more slice-1 fastener values can be traced to NAS6403 for free, and `hardware_entries.json` lags the two that already were

Found while doing `traced_labels_and_ratio` (2026-08-06). Deliberately **not**
fixed inline: that handoff's Part 1 was scoped to three *mislabelled* elements,
and Part 2 recomputes the headline ratio from exactly that change. Sourcing extra
values would have moved the number a reviewer was told to expect, for a different
reason, in the same commit.

## What

`NAS6403-NAS6420 Rev 4.pdf` has been in `data/inbox/specs/` since founding. It is
one document covering NAS6403 through NAS6420: sheet 3 is a grip/length table
with a shared `Grip ±.010` column and one `LENGTH ±.015` column per basic number;
sheet 1 carries the per-basic-number dimension table including `M` (cotter-hole
centreline to point) and `T (Ref)`; sheet 2 is the CODE block and the notes.

Three slice-1 values sit on top of it and have not been re-cited:

| stack | element | today | what the document gives |
|---|---|---|---|
| `tan_link_to_pitch_plate` | `fastener_grip_13` | `inferred`, `kind: parts_list`, band from the workbook | sheet 3 row *Grip Dash No. 13*: grip **.812** under the `Grip ±.010` header, NAS6403 length **1.135** → `kind: spec` / `traced`, same values |
| `tan_link_to_pitch_plate_take2` | `fastener_grip_13` | `inferred`, `kind: workbook`, cell E52 | same row; take 2 is the same bolt as take 1 |
| `tan_link_to_pitch_plate` | `thread_transition` | `untraced`, `kind: assumed`, a 1/16 in rule of thumb | sheet 1 gives `T (Ref)` = **.323 in** for NAS6403 (grip end to point). **Not the same quantity** — `T` is the whole thread region, the allowance is the run-out inside it — so this one needs judgement, not a copy. It is currently the single most pessimistic term in the tan-link shank-out checks (its "nominal" is its maximum, min is 0). |

Separately, `docs/tolerance_stacks/hardware_entries.json` now **disagrees with
the stacks it serves**: `NAS6403U14D` and `NAS6404U13D` still carry
`values_source: {kind: "workbook", confidence: "untraced"}` while the stack
elements citing those part numbers are `traced` to the standard as of
2026-08-06. Fixing that moves the file's own prose counts ("THREE entries are
traced", "1 traced / 0 inferred / 8 untraced out of 9") and the tests that pin
them — which is exactly why it wants its own unit of work.

## Why it matters

Low-ish, but it is the *cheap* end of the repo's binding constraint. The
2026-08-06 correction found that slice 1's traced ratio was understated partly
because values that were sourceable from day one had been labelled instead of
looked up. These three are the remainder of that same pile. The pattern worth
naming: **a document arriving in `data/inbox/specs/` does not re-cite anything by
itself, and nothing in the repo notices that it could.** A sweep — "for every
`untraced`/`inferred` element, is the document that would close it now in the
pile?" — would have caught all five at once.

## Suggested fix

1. Re-cite both `fastener_grip_13` instances to `NAS6403-NAS6420 Rev 4.pdf`
   sheet 3, verifying against a crop (`tests\debug_trace_stack_values.py --crop
   "3,140,190,70" --zoom 8` renders the dash-number rows; the scan has no text
   layer, so a text search finds nothing and proves nothing).
2. Decide `thread_transition` on the merits — either derive it from sheet 1 with
   the reasoning written down, or leave it `untraced` and say in the note that
   the standard does not give this quantity directly. Do not quietly relabel it.
3. Backfill `hardware_entries.json` and its prose counts in the same change.
4. Recompute the ratio afterwards with
   `tests\debug_report_tolerance_stacks.py --ratio` and update every document
   that quotes it — the list and the rule are in `docs/SOP_TOLERANCE_STACK.md`
   § "The traced ratio". The doc-level test will fail until you do.
