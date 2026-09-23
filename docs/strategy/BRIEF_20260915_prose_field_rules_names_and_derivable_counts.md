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

- `dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`
  (re-pointed by the 2026-09-21 triage sweep: the brief this line used to name,
  `docs/strategy/BRIEF_20260911_structural_count_pinning_convention.md`, is now
  `CONSUMED` — merged into the dispatch brief, which owns both shapes) — the
  general convention for pinning vs deriving structural counts. If route 2 wins
  for studies, it belongs to that brief's decomposition, not this one's.
- `docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md`
  deliverable 4 fixes the `==` in
  `test_every_prose_field_the_count_pairing_claims_is_really_scanned`, which is
  the *guard's own* fragility and not a rule question. It is staged and fenced;
  do not fold it in here.

## 2026-09-16 triage sweep — a third prose field: the citation's own `note`, and whether the fix is authoring-side at all

Source issue:
`docs/issues/ISSUE_20260915_stack_citation_notes_name_schema_fields_on_a_reading_surface.md`
(feature, low, `audience: strategy`), filed off
`docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md`.
It belongs to this brief's question — *what a prose field may carry* — and it
adds a field this brief does not yet name (`note` / `source_ref.note` on a
stack element) plus a second axis the `name` question does not have. Nothing
here picks between them.

**What the issue found.** `viewer_component_names_and_reference_copy` put every
string the viewer writes, and every `name`/`note` in `docs/topologies/*.json`,
under Jeff's web-copy rules (guarded by
`tests/test_topology_prose_for_a_reader.py`) and deliberately stopped at
`docs/tolerance_stacks/stack_*.json`. Authored strings there carry the same
shapes — naming a schema field (`source_ref`) or a checksum (`sha256`) in prose
— and are rendered verbatim in the topology preview pane (a `dimension_ref`
edge resolves its citation out of the stack file), on the citation hover card,
and in the stack-mode detail pane.

**The population is larger than the issue's table.** Re-measured 2026-09-16
over all seven committed `stack_*.json`, element `note` + `source_ref.note`
only, matching `source_ref` or `sha256`: **10 strings across 6 stacks**, not
seven across five. The issue's table omits three —

| stack | field | shape |
|---|---|---|
| `pitch_link_to_pitch_plate` | `bushing_214820.source_ref.note` | `source_ref` |
| `pitch_link_to_pitch_plate` | `washer_nas1149v0332.source_ref.note` | `sha256` |
| `tan_link_to_pitch_plate` | `flange_bushing_L.note` | `source_ref` |

— and `pitch_link_to_pitch_plate` does not appear in it at all.

**And there is a fourth field behind it, also on screen.** The same scan finds
**34 more** authored strings at `source_ref.export.note` naming `sha256`,
spread across all seven stacks (8 in `hub_bearing_thermal_fit_m2` alone). Those
render too: `div.el-export__note` is a real rendered node
(`apps/viewer/tests.js:1506`) and is one of the classes the handoff's own JS
guard subtracts before scanning (`VERBATIM_PROSE_CLASSES`,
`apps/viewer/tests.js:3020`). So if whatever rule this brief writes reaches
citation prose at all, the surface it governs is **44 authored strings**, not
7 — which is itself an argument the decider should have in front of them,
because it prices the two routes very differently.

**The second axis, which the `name` question does not have.** For a `name` the
only question is what the field may carry. For a citation `note` the issue
offers two non-equivalent routes and declines to pick:

1. **Authoring-side.** Bring these fields under the written rule and reword
   them. But a `source_ref.note` is *the written argument behind a value*,
   addressed to a reviewer working through the provenance record — e.g. a
   `RE-SOURCED <date> … WAS a slice-1 transcription of workbook row 23`
   history, where naming `source_ref` is how the author referred to a sibling
   citation. Rewording without re-reading the source risks changing what the
   note **claims**, which is the failure mode this repo's rules exist against.
2. **Presentational.** A citation's own note is record prose, so it renders
   inside a marked "the citation's own words" block (the way a `callout`
   already does) rather than as a sentence the page appears to be saying. The
   JS guard already carves exactly these nodes out by class on that reasoning;
   making the carve-out visible on screen is the un-taken half.

That is the same shape as this brief's *"where a demoted half goes, if
anywhere"* question, one field over — and the answers constrain each other: a
rule that says record prose is quoted rather than rewritten is also a rule
about whether a long `name` is a caption or a title.

**Scope note for route 2.** Two of the 10 sit in `tan_link_to_pitch_plate`
(take 1), which `VA.SUPERSEDED_STACKS` (`apps/viewer/topology.js:2240`) drops
from the nav — reachable only through a `?stack=<id>` deep link. A
presentational fix reaches them; an authoring pass would be editing the record
of a stack the page no longer offers a row for.

**One correction to the source issue.** It proposes that the natural carrier is
"whichever handoff comes out of
`docs/strategy/BRIEF_20260909_sop_full_topology_first_restructure.md` … the same
disposition `ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`
got". That is not the disposition that issue got: its `strategy:` back-link
names **this** brief, not the SOP-restructure one. The SOP brief decides
whether `SOP_TOLERANCE_STACK.md`'s steps are rewritten topology-first; the rule
this issue needs is the one being written here. Where the resulting sentence
lands in the SOP is downstream of that.

## 2026-09-22 triage sweep — route 2 has a second, live instance, and it is the one place the reader-facing guard cannot reach

Source issue:
`docs/issues/ISSUE_20260922_the_study_summary_renders_record_prose_the_banned_string_guard_would_refuse.md`
(bug, low, `audience: strategy`), filed by the review of
`viewer_summary_balance_sheet` (2026-09-22). It belongs here rather than in a
new file because it is the **same two routes** this brief's 2026-09-16 addendum
already frames for citation `note`s — *exempt the class* vs *mark the record's
words on the page* — arriving on a second surface, with the exemption list's own
hygiene problem attached.

**What was measured.** That handoff enrolled the study summary
(`VA.renderTopoTotals`) and the grid's new totals footer in the **fixture**
tier's reader-facing walk, and the enrollment immediately paid: the surface had
been printing the study's own id in a `<code>` and naming its two ends
`washer_far_face → cotter_hole_centerline`. Both are gone. Enrolling the same
surface in the **`[real]`** walk was attempted and **backed out**, because it
fails on live data — on the **record's** own words:

* `pitch_link_cotter_hole_clearance`'s study `notes` name
  `tests/test_topology_conversions.py`, caught by the
  `\b[\w.-]+\.(?:py|exe|ps1|bat|cmd|sh)\b` shape in
  `apps/viewer/reader_facing_bans.js`;
* several `hardware_entry` gap texts name `data/inbox/specs/`, caught by the
  `data/` literal.

Both render behind a disclosure (`Details`, and `What's missing`). Neither is
the page speaking.

**Why it sharpens route 1 rather than merely repeating it.** Exempting these
costs five new `VERBATIM_PROSE_CLASSES` entries — `p.tvtotals__note`,
`span.tvgaps__text`, `summary.tvfind__name`, `p.tvfind__why`,
`div.tvcard__why__body` — each with the same argument `p.check__guidance` and
`li.notelist__note` already won. But **none of the five can be
liveness-checked**: the dead-exemption guard runs over **stack** surfaces only,
so all five land in `TOPOLOGY_ONLY_EXEMPTIONS` and are exempt from the hygiene
rule that keeps the exemption list honest. So route 1 here is not "add five
lines"; it is "add five lines *plus* teach the liveness check about topology
surfaces", or knowingly grow an unchecked list. That is a real price this brief
did not previously have on the table, and it is the same shape as
`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`'s
*definability* sub-question — a hand-kept exemption set nothing pairs to the
surfaces it claims to cover. If the answer turns out to be a detector, it
belongs to that brief's decomposition, not this one's.

**What shipped, and what it costs to leave it.** Option 3 — leave it, and write
the boundary down — is the current state: the page's **own** words on this
surface are guarded at the fixture tier, the **record's** are not scanned at
all, and that boundary is stated in the `[real]` walk's own comment. The cost is
named in the issue and is the reason it is filed: a future *page* string added
inside one of those five nodes rides through the live walk unseen.

**The repro is in the issue** (a six-line addition to the `[real]` walk's
`liveTopos` loop, then `node apps/viewer/run_tests.cjs --repo
C:\workspace\tolstack`), so whoever decomposes this can re-measure the
population rather than trust the two bullets above.

**What this adds to "what the decomposition will need to decide."** A fourth
bullet: **does the presentational route (route 2) also discharge the guard's
problem, or only the reader's?** If record prose renders inside a marked "the
author's words, to another author" block, a scanner could subtract *that block*
by one class instead of five, and the exemption list stops growing per surface.
That is a genuinely different answer from either route as currently written, and
it is the one that would keep working when the next reading surface is added.
