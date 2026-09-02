---
type: bug
priority: med
status: open
area: docs
reporter: agent
---

# The one-fold rule's absolute form survives in passages `RULE_PASSAGES` does not read

Found during `review/thermal_exception_declared` (2026-09-02). That handoff did
exactly what it was asked: it made `ARCHITECTURE.md`'s "Where computation may
live" state the rule conditionally, listed the exception in
`DECLARED_COMBINING_EXCEPTIONS`, and paired the list against three registered
passages (`RULE_PASSAGES` in `tests/test_thermal_exception_list.py`:
`ARCHITECTURE.md`'s rule section, `thermal.py`'s module docstring,
`docs/tolerance_stacks/ARCHETYPE_thermal_fit.md`). Its lesson enumerated
**five** passages stating the rule.

Searching for the rule's own words instead of following the passages the handoff
named — every tracked `.md`/`.py`, whitespace flattened, regex
`(only|one) place (where )?element values` — finds **four more live passages
asserting the absolute**, plus one more phrasing family the same search cannot
see:

| passage | what it said | disposition |
|---|---|---|
| `ARCHITECTURE.md`, `stack.py` contents table | `fold(terms)` \| *"the only place element values are combined"* | corrected in review |
| `ARCHITECTURE.md`, topology-archetype section | *"So `fold()` remains the only place element values are combined"* | corrected in review |
| `ARCHITECTURE.md`, the rule section's **own opening sentence** | *"It is one place where element values get combined"*, four paragraphs above the exception the same section now states | corrected in review |
| `docs/DAG_TOPOLOGY.md`, "One `fold()`" | *"the same and only place element values are combined **anywhere in this repo**"* | corrected in review |
| `tolerance_stack/stack.py`, `fold()`'s docstring | *"**The only place element values are combined.**"* | **left as-is** — the handoff's scope said do not touch `stack.py`/`fold()`, and a reviewer should not either |

Two more instances were found and deliberately left: `PROVENANCE.md`'s
`stack.py` row repeats *"`fold()` is still the only place element values are
combined"* in three of its dated amendments (one of them the 2026-08-05
amendment that shipped `workbook_corner`, so it was false as written) — but that
file is dated history and exempt from every doc scan here by convention, and
rewriting an amendment is not a thing this repo does. Any scan built for this
issue must exempt it explicitly rather than by accident.

This is the resolved issue's own shape
(`ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values`)
one ring out: a document asserting both the absolute and the exception, with
nothing red. The rule-section opening is the sharpest instance — it is inside
the very section the new test reads, but `anchor_paragraph()` selects only the
paragraph carrying `declared exception list`, so the absolute four paragraphs up
is unguarded by construction.

## Why the corrections are not the fix

Four sentences are right today and nothing recounts them. `RULE_PASSAGES` is a
hand-kept dict of three entries, which is the same shape as
`ISSUE_20260901_traced_ratio_doc_scan_uses_a_hand_kept_list.md`: a passage that
is not in it is not merely unpaired, it is invisible, and the rule's *absolute*
form is precisely what a reader writes when they have not read the exception.

## What a fix has to deal with

- **Two phrasing families, no single phrase.** The registered passages say
  *"combines two element values"* / *"combines element values nowhere"*; the four
  found here say *"the only place element values are combined"*. A scan keyed on
  either one alone finds only its own family.
- **Line wrapping.** The rule section's own opening is wrapped between `place`
  and `where`, so a plain `grep` misses it — the scan has to flatten whitespace,
  the same lesson `RULE_PASSAGES` already encodes for matching.
- **The negative direction is what needs guarding.** The pairing tests ask
  "does this passage name the right exceptions?"; the defect is "this passage
  never mentions exceptions at all", which reads as a *stronger* claim. A scan
  wants to be: every live passage matching either phrasing family either carries
  the anchor phrase or is a deliberate registered exemption (`stack.py`'s
  `fold()` docstring, arguably, and quoted/superseded figures per the house
  `"…"` convention).
- **False positives are cheap here, silence is not** — the same trade the
  hardware-count and traced-ratio scanners make.

## Not a blocker for the handoff

`thermal_exception_declared` was approved: it delivered the decision it was
given, and its own three passages are paired and demonstrated failing. This is
the next ring, and it is a design question about scan scope rather than a fix
someone should improvise inside a review.
