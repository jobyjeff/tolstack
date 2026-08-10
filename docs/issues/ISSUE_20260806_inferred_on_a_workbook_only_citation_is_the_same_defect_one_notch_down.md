---
type: bug
priority: med
status: triaged
handoff: docs/sessions/HANDOFF_20260810_fastener_citations_and_confidence.md
area: tolerance-stacks
reporter: agent
---

# Three seeded elements carry `confidence: "inferred"` on `kind: "workbook"`, and the same bolt is labelled two different ways in two stacks

Found during `review/traced_labels_and_ratio` (2026-08-06), out of that handoff's
scope and therefore filed rather than fixed. That handoff fixed the three elements
claiming **`traced`** from a parts list. This is the same note-vs-field defect one
notch down, on the label nobody was looking at.

## What

`docs/SOP_TOLERANCE_STACK.md` is explicit: *"a value whose only support is 'the
source workbook says so' is `untraced` — no matter how reasonable it looks."*
Three element instances across the seeded stacks are `inferred` on a `kind:
"workbook"` `source_ref`:

| stack | element | `kind` | `confidence` | its own `source_ref.note` |
|---|---|---|---|---|
| `tan_link_to_pitch_plate` | `washer_thin` | `workbook` (E11) | `inferred` | *"The parts list says .032 MIN; the workbook models it as .032 +/-.004. The NAS1149 standard is not in this repo, so the +/-.004 is untraced."* |
| `tan_link_to_pitch_plate_take2` | `straight_bushing` | `workbook` | `inferred` | — |
| `tan_link_to_pitch_plate_take2` | `fastener_grip_13` | `workbook` (E52) | `inferred` | — |

Each is defensible as a *judgement* — the parts list corroborates the part's
existence and its nominal, so the value is more than a bare workbook cell — but
none of them says so in the field that a consumer reads, and the first one's note
explicitly ends *"the +/-.004 is untraced"*. That is the exact shape the
2026-08-06 correction was about.

**The sharpest version of it: the same bolt is labelled two different ways in two
stacks of the same joint.** `fastener_grip_13` is `kind: "parts_list"` /
`inferred` in `tan_link_to_pitch_plate` and `kind: "workbook"` / `inferred` in
`tan_link_to_pitch_plate_take2`. Take 2 is a restatement of take 1, so one of the
two is wrong about where the number came from.

## Why it matters

`test_no_traced_element_cites_a_parts_list` (added 2026-08-06) closes the
`traced` + `parts_list` hole and nothing guards this one. `inferred` is a weaker
claim than `traced`, so the cost is lower — but it feeds the headline ratio (these
three are 3 of the seeded stacks' 7 `inferred`), and the SOP's one hard rule is
that `untraced` must appear on the gap list. An element labelled `inferred` on
workbook-only support is a value that has quietly left the gap list.

## Suggested fix

1. Decide, per element, which is true: the support really is the parts list (then
   `kind: "parts_list"`, and cite the balloon like `tan_link:fastener_grip_13`
   does), or it really is only the workbook (then `untraced`, and it joins the
   gap list). Do not split the difference.
2. Reconcile the two `fastener_grip_13` instances so the same bolt has the same
   provenance shape in both stacks. Note that
   `ISSUE_20260806_three_more_slice1_fastener_values_are_now_sourceable.md`
   proposes re-citing **both** to `NAS6403-NAS6420 Rev 4.pdf` sheet 3 as
   `traced` — doing that issue first makes this one smaller, and the two should
   probably be worked together.
3. Consider whether the guard generalises: the rule the repo actually wants is
   *"`confidence` must be consistent with `kind` and with the `source_ref.note`"*,
   and only the `traced`/`parts_list` corner of it is mechanised today. A test
   asserting `kind == "workbook"` ⟹ `confidence == "untraced"` would state it for
   this corner; the note-vs-field half is not mechanisable and stays a review
   check (`docs/prompts/REVIEW_AGENT.md` check 1).
4. Recompute the ratio afterwards (`tests\debug_report_tolerance_stacks.py
   --ratio`) and update the documents that quote it — the doc-level test will
   fail until you do.
