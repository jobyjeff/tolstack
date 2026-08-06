---
type: bug
priority: high
status: triaged
area: tolerance-stacks
reporter: agent
handoff: docs/sessions/HANDOFF_20260806_traced_labels_and_ratio.md
---

# Three seeded elements say `confidence: "traced"` while their own note says the band is untraced

Found during the `pitch_link_stack` review (2026-08-04) while recomputing the
traced ratio. **Not** a finding against that handoff — the defect is in the
slice-1 data imported at founding, and `pitch_link_stack` labelled its own
equivalent values correctly.

## What

`docs/prompts/REVIEW_AGENT.md` check 1 is explicit:

> a value from a parts-list part number, with the tolerance band coming from
> somewhere else, is **`inferred`** — not `traced`;
> … `traced` requires the actual band to be in the cited document.

Three seeded elements break that rule, and each one **says so in its own
`source_ref.note`**:

| stack | element | `confidence` | its own note |
|---|---|---|---|
| `tan_link_to_pitch_plate` | `fastener_grip_14` | `traced` | *"The grip +/-.010 is untraced (NAS6403 spec absent)."* |
| `vpa_output_to_pitch_plate` | `fastener_grip` | `traced` | *"the +/-.010 in is untraced (NAS6404 spec absent)."* |
| `vpa_output_to_pitch_plate` | `under_head_chamfer_washer` | `traced` | *"the +/-.006 in band is untraced (MS21299 spec absent from this repo)."* |

All three cite `kind: "parts_list"`, document 217755. The parts list gives the
nominal in the nomenclature (`.875" GRIP`, `.812" GRIP`, `.063"`) and **no band**
in any of the three cases. Per the rule these are `inferred`.

## Why it matters

1. **It corrupts the repo's headline calibration figure.** The SOP, the review
   checklist, both lessons and now the `pitch_link_stack` worksheet all quote
   *"slice 1 traced 1 of 17"*. Counted mechanically, `confidence == "traced"`
   over the three seeded stacks is **4 of 26** — or 4 of 17 over
   `tan_link` + `vpa` (11 + 6 = the 17). The quoted 1 is the count of values
   traced to a **part drawing or specification** (only `pitch_plate_flange`,
   215197), which is the honest number and is what
   `test_the_only_traced_part_drawing_value_is_the_pitch_plate_flange` pins. But
   nothing says so, so a reviewer who computes the ratio the checklist tells them
   to compute gets a different number from every document in the repo and has to
   work out why.
2. **`traced` is the one label the whole repo exists to protect.** These three
   are exactly the shape check 1 tells a reviewer to hunt: a `traced` label on a
   standard-part dimension whose band has no document behind it. They are
   *honest* — the note says the band is untraced — but the machine-readable field
   says otherwise, and the field is what anything downstream will read.

## Suggested fix

Two of the three can now be *properly* traced, free — `pitch_link_stack` put
`NAS6403-NAS6420 Rev 4.pdf` to work and its sheet-3 table covers both bolts:

| element | fix |
|---|---|
| `fastener_grip_14` | re-cite to `NAS6403-NAS6420 Rev 4.pdf` sheet 3, row *Grip Dash No. 14* → grip **.875**, column header `Grip ±.010`. Verified by this reviewer in the same crop that confirmed dash 11. Stays `traced`, legitimately, with `kind: "spec"` |
| `fastener_grip` | same file, **NAS6404** column, dash 13 → grip **.812**, length **1.182**, `M .180/.160`. The lesson's intake queue already flags this as the cheapest item on the list |
| `under_head_chamfer_washer` | **MS21299 is not in the pile.** Downgrade to `inferred` and keep the band as a listed gap |

Then either add a test asserting no element carries `confidence: "traced"` with a
`kind: "parts_list"` ref, or — if a parts-list *nominal* with a documented band
elsewhere is a case worth keeping — say so in the SOP and give it a distinct
shape. And once the counts move, correct the *"1 of 17"* figure everywhere it
appears, or define it in one place as "traced to a drawing or specification" and
reference that.

Note for whoever does this: `check_result` is produced, not stored, so relabeling
`confidence` changes no arithmetic and no verdict. The seeded worksheets' ratio
lines will need updating with the JSONs.
