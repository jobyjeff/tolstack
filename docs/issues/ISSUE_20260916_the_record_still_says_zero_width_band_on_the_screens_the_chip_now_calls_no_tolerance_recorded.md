---
type: chore
priority: low
status: open
area: docs/tolerance_stacks
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260916_reader_facing_copy_and_vocabulary.md
---

# The record still says "zero-width band" on the same screens where the chip now says "no tolerance recorded"

`reader_facing_copy_and_vocabulary` (2026-09-16) closed the viewer's half of
`ISSUE_20260915_the_stack_view_still_says_zero_width_band_where_the_dag_says_no_tolerance_recorded`:
all five viewer-authored strings now read `VA.ATTENTION.no_tolerance.text`,
*"no tolerance recorded"*. That issue's framing was **one fact, two
vocabularies, inside one viewer** — and on screen the two vocabularies still
coexist, because the other speaker is the **record**, which the viewer renders
verbatim on purpose.

The handoff's own screenshot shows it. In
`docs/sessions/lessons/LESSONS_20260916_reader_facing_copy_and_vocabulary_3_no_tolerance_recorded.png`,
the row chip reads `no tolerance recorded` and the element note one line below
reads:

> 0.063 in, read out of the parts-list nomenclature. **ZERO-WIDTH BAND**:
> MS21299 is not in data/inbox/specs/, so no document gives a tolerance.

## Where

Twelve authored instances, measured 2026-09-16 with
`grep -ric "zero-width" docs/tolerance_stacks/*.json docs/topologies/*.json`:

| file | instances |
|---|---|
| `docs/tolerance_stacks/stack_rotor_fastener_length.json` | 4 |
| `docs/tolerance_stacks/hardware_entries.json` | 3 |
| `docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json` | 3 |
| `docs/topologies/topology_rotor_fastener_length.json` | 1 |
| `docs/topologies/study_rotor_fastener_grip_u2h.json` | 1 |

## Why this is a decision and not a rewrite

It is the same shape as
`ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule` — an
**authoring** question that the viewer must not answer for the author:

* `docs/reference/` is insert-only and `data/inbox/specs/` is append-only, but
  a stack's own `note` is not — it is edited as the stack is re-cited, so this
  *is* editable. The question is whether it should be.
* An argument for leaving it: the record is a transcription-time argument and
  `min == max` / "zero-width band" is the precise engineering statement of what
  was found. An argument for changing it: Jeff's standing rule is everyday
  words, no schema jargon, and the whole point of the 2026-09-15 issue was that
  a reader should not meet two names for one fact on one screen.
* Whichever way it goes, `zero_width` / `zero_width_count` / `chip--zero-width`
  keep their names — nothing reads those as words.

## Fix shape, if the answer is "change it"

Edit the twelve notes to say *no tolerance recorded* (or a sentence built from
it), and add the phrase to whatever doc-scan already pairs the viewer's
vocabulary against the seeded documents, so a thirteenth cannot be authored
silently. The reverse answer — the record keeps its own words — wants one line
somewhere durable saying so, because otherwise the next reviewer refiles this.
