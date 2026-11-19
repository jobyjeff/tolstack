---
type: feature
priority: low
status: open
area: scripts/propose_bindings
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261118_a_bound_pattern_offers_the_whole_pattern_on_the_other_part.md
---

# propose_bindings.py does not propose the whole pattern opposite a bound one

Since 2026-11-18 the annotator offers, once one side of an interface holds a
hole pattern, the whole pattern on the other part as one row
(`AA.rankOppositePattern`, `apps/annotate/suggestions.js`): its feature body,
its candidate list and the armed pick's bar all carry it. The handoff named a
third site, `scripts/propose_bindings.py`, and it does **not** carry it:

- the script writes **one face per proposal** (`Proposal.face_id`, one
  `GeometryKey`), and its checks are per face;
- the opposite pattern needs the assembly placements and the mate's
  coaxiality test, which live only in the JS today (Python has placements in
  `fit_bound_features.py`, but no mate ranking). A Python twin would be a
  second copy of the rule.

Options: (a) a `face_ids` list on a proposal row plus a Python port of
`rankOppositePattern` paired value-for-value against the committed fixture
`tests/fixtures/opposite_pattern_cases.json`; (b) leave agents to propose one
hole and rely on the pane's row, which offers the whole set once one side is
bound. Recommendation: (b) until an agent proposal run actually needs a
pattern -- Jeff's binding is quicker through the row than any proposal.
