---
type: chore
priority: low
status: open
area: tolerance_stacks
audience: strategy
reporter: agent
found_by: docs/sessions/active/HANDOFF_20260915_stack_fable_audit.md
---

# The link names are crossed between the workbook, the drawings and the stacks

Three vocabularies name the two propeller link types, and they disagree:

| where | the 3-place link (qty 3) | the 5-place link (qty 5) |
|---|---|---|
| drawings (title blocks) | 212956-005 **PITCH ANTI ROTATION LINK ASSEMBLY** (machined link 213863-004) | 213862-002 **PITCH LINK ASSEMBLY** (per 216231 A.1) |
| the 260729 workbook + slice 1 + this repo's stack ids | **"Tan Link"** / `tan_link_to_pitch_plate` | — |
| Jeff's 2026-08-04 request + this repo's stack ids | — | **"pitch link"** / `pitch_link_to_pitch_plate` |
| 217755's own PL | (as titled) | absent — the "TANGENTIAL LINK MOUNT" assemblies (215175) hold no link in their own parts list |

So the stack named `tan_link_...` models the joint of a part titled PITCH ANTI
ROTATION LINK, while the drawing-titled PITCH LINK's stack is the one whose id
Jeff coined — consistent with the drawings, but a standing trap for anyone
grepping "tangential link". The 2026-09-06 endstop owner-refinement fell into
exactly this: it attached the pitch-system topology's `pitch_link_length`
(nominal 109.4 mm) to 212956-005/213863-004, whose machined link's reference
length is (81.43) — corrected 2026-09-15 by `stack_fable_audit`, owner now
213862-002.

Committed ids are deep links and annotate keys, so a rename is not free; the
audit recorded the mapping where the words meet (stack notes, hardware
entries, the audit report) instead. Strategy question: whether to keep the ids
forever with the mapping written down (current state), or schedule a one-time
rename with a redirect layer. Either way, decide once — the tangle has now
cost one real mis-attribution.
