---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261118_a_bound_pattern_offers_the_whole_pattern_on_the_other_part.md
---

# Design: the opposite-pattern row clips its fit, and its faces repeat below it

Seen in the handoff's own shots
(`docs/sessions/lessons/shots/a_bound_pattern_offers_the_whole_pattern_on_the_other_part/02_piston_row_at_rest.png`,
`03_…hovered_set_lit.png`), at the nav rail's rest width:

- The set's line reads "5 of 5 holes Ø4.9, coaxial wit…" and its reason "the
  whole pattern bound on …". The cut-off words are the fit and the part it was
  matched to, which are the reason to trust the row. The full text is still in
  the title tooltip, so the truncation rule holds. But the words a reader
  needs to decide on Take are the hidden ones. A shorter line ("5 of 5 holes
  Ø4.9 · within 0.000 mm") or a wrapping first line would show them.
- When the taken size is the only size on those axes (the piston body, where
  `others` is empty), the ten per-face mate rows under the set are exactly the
  set's own faces again (110–119). That doubles the list with nothing new in
  it. One option: fold the set's own faces behind the set's line, and keep
  separate rows only for the other sizes, which the row already names.

Non-blocking. Filed by the review of
`a_bound_pattern_offers_the_whole_pattern_on_the_other_part`.
