# BRIEF 2026-09-15 — the prose-field rules: what a `name` may carry, and whether a `description` may state a count

Filed by triage 2026-09-15, joining two issues that both land on the same
paragraph of `docs/SOP_TOLERANCE_STACK.md` — "Titling an artifact" — and both
say, in their own words, that inventing the rule is past the line their handoff
was given. One asks what happens to the fields the title rule did **not**
cover; the other asks whether the rule should prohibit something nobody has
done yet. They want one author, because the answer to each constrains the other:
a rule that says "a `description` never carries a derivable count" is a rule
about where a `name`'s demoted half may go.

## The two issues (read each; they carry the measured corpus scan)

1. `docs/issues/ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`
   (feature, low, `audience: strategy`) — `stack_title_style_pass` (2026-09-14)
   put every `title` under the written rule and demoted what a title shed into a
   new `description`. It was scoped to `title` and stops there. The **`name`**
   field on a stack element, a topology node and a topology edge is not under
   it and carries the identical shapes:

   | where | `name` |
   |---|---|
   | `topology_tan_link_to_pitch_plate_take2.json` : `protrusion` | `worst-case protrusion -- full-diameter shank beyond the modelled clamped stack` (78 chars) |
   | `topology_rotor_fastener_length.json` : `washer_nas1149v0332_tt` | `washer thickness, NAS1149V0332H (.032 in), rotor balance-mass bolt` (unit in parentheses) |
   | `topology_pitch_link_to_pitch_plate.json` : `shank_out` | `shank out -- full-diameter shank beyond the modelled clamped stack` |

   These render as grid row labels and elements-table cells, so the same
   wall-of-text complaint applies in the same viewer. **Why it is not a straight
   repeat of the title pass:** a title has somewhere to demote *to* — the nav
   rail has a hover slot and the pass added `description` to fill it. A grid row
   label does not: the row is already dense, hover is taken by the edge
   hover-card, and `Dimension`/`StackElement` have no free prose field a reader
   sees. So extending the rule needs a decision about *where the demoted half of
   a name goes* before any renaming happens — and possibly none of it should
   move, since a `name` is arguably closer to a caption than to a title.

2. `docs/issues/ISSUE_20260915_a_study_or_stack_description_can_grow_a_derivable_count_with_nothing_pairing_it.md`
   (chore, low, `audience: strategy`) — `projection_field_guard_rows`
   (2026-09-15) brought `Topology.description` under `tests/test_topology.py`'s
   structural-count pairing. The open half was whether `Study` and
   `StackDefinition` descriptions need the same. Measured 2026-09-15 with the
   guard's own `prose_candidates` + `inventory_sentences`: **no committed
   `study_*.json` prose field states an inventory today** (all 21 scanned, zero
   hits), and **no committed `stack_*.json` `description` states a derivable
   count either** (five have a description, two have none, none contains a
   `<number> <noun>` pair at all).

   So there is nothing to fix — and the obvious move, "add the field to the
   tuple", is the wrong one:
   - **A study.** `_COUNTABLES` derives its six numbers from the **graph**
     (`len(t.parts)`, `len(t.nodes)`, `_cycle_rank(t)` …). A study's own
     countable is the length of its `selection`, a *subset* of the graph. So
     scanning `Study.description` against `_COUNTABLES` would read "this study
     walks 4 edges across 3 parts" as a false claim about a graph with 7 edges —
     a false positive, and the loud kind that gets a guard deleted. A study-side
     pairing needs a study-side baseline: a different guard.
   - **A stack.** A stack has elements, not parts/interfaces/edges. None of the
     six labels applies, so there is no baseline to pair against at all.

   The issue offers two routes and declines to pick: **(1)** write the
   prohibition down — `docs/SOP_TOLERANCE_STACK.md`'s "Titling an artifact" says
   a `description` never carries a derivable count, and the SOP vocabulary scan
   (`tests/test_sop_vocabulary.py`) already has the machinery to keep that prose
   paired to code, so a rule read by an author is cheaper than a scanner for
   something nobody has done yet; or **(2)** give studies their own pairing with
   their own baseline (selection length, term count) when a study description
   first restates one. The issue's own read is that route 1 fits *"an
   unanswerable stack stated plainly beats a confident wrong one"* and route 2
   is real work with no demand yet.

## What the decomposition will need to decide

- **Whether `name` comes under a written rule at all**, and if so what the rule
  permits — a caption-length ceiling, a prohibition on parenthetical units, a
  prohibition on the `--` clause, or nothing beyond "short". Note that two of
  the three sample names carry information a reader plausibly needs (the `.032 in`
  thickness, "beyond the modelled clamped stack"), so a rule that only forbids
  is a rule that loses data unless it names a destination.
- **Where a demoted half goes, if anywhere** — a new prose field on
  `Dimension`/`StackElement`, the existing edge hover-card (already occupied),
  or nowhere, accepting that some names stay long because the row label is the
  only surface that fact has.
- **Route 1 vs route 2 for derivable counts**, and if route 1: the exact SOP
  sentence, plus whether `tests/test_sop_vocabulary.py` should pair it to
  anything or whether an author-facing rule is deliberately unguarded (the repo
  has precedent for recording deliberate non-guards — see
  `tests/test_topology.py`'s module docstring and
  `rotorkit`'s equivalent practice).
- **Whether the two rules are one paragraph or two.** They are adjacent — both
  about what prose fields may carry — and the title rule already exists to be
  amended rather than duplicated.

## Related, already routed — do not duplicate

- `docs/strategy/BRIEF_20260911_structural_count_pinning_convention.md` — the
  general convention for pinning vs deriving structural counts. If route 2 wins
  for studies, it belongs to that brief's decomposition, not this one's.
- `docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md`
  deliverable 4 fixes the `==` in
  `test_every_prose_field_the_count_pairing_claims_is_really_scanned`, which is
  the *guard's own* fragility and not a rule question. It is staged and fenced;
  do not fold it in here.
