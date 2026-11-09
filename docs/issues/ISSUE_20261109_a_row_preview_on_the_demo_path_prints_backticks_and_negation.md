---
type: bug
priority: high
status: open
area: viewer/copy
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
---

# A row's preview on the demo path prints raw backticks and negation prose

Selecting the tan-link length row (demo click 5, `docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/demo_5_tan_link_length_selected.png`)
puts this in the Preview panel:

> A derived gap: two real interfaces with no dimension between them. This is the
> answer, not a term — a study is refused if it puts this edge in its selection,
> and names it in `closes` instead. No crop index covers it — that is the state
> of the documents, not a stale projection.

- The backticks around `closes` print literally: the source string in
  `apps/viewer/topology.js:80` is rendered as text, not as markup.
- "not a term", "not a stale projection" break the prose budget's no-negation rule,
  and a field name (`closes`) is on the surface.
- The same panel shows `default transform: identity` in monospace and "M2 adds
  the term", which are internal words.
