---
priority: med
depends_on: [respine_tween_fidelity_round2]
model: opus
---

# HANDOFF 2026-09-15 — viewer_value_guard_rows_and_replays: close the four holes the 09-15 guard pass left behind

Source: triage sweep 2026-09-15, consolidating four issues filed out of
`projection_field_guard_rows`, `surfaces_that_state_something_false` and their
reviews (all completed 2026-09-15). Baseline: trunk after the 2026-09-15 batch
merge, **plus** `respine_tween_fidelity_round2` merged. Scope:
`apps/viewer/tests.js` (the value-guard tables and their bite tests),
`apps/viewer/README.md` (hover-card section only), `apps/viewer/views/topology.js`
(the `renderNodeDetail` comment), and `tests/test_topology.py`. Do NOT touch
`apps/viewer/topology.js`, the respine sections of `apps/viewer/README.md` or
the `railsSvg` comments — `respine_tween_fidelity_round2` owns those and lands
before you. Do not touch `apps/annotate/` or
`scripts/run_mutation_witness_tests.mjs`.

**Why `depends_on: respine_tween_fidelity_round2`:** that handoff rewrites
respine claims in `apps/viewer/README.md` and comments in
`apps/viewer/views/topology.js`, and adds respine checks to
`apps/viewer/tests.js` — all three files you edit. Its README edits also remove
or qualify sentences; restating a count in the same file while those sentences
are in flight is how one of these four issues happened in the first place.
Sequencing is about the file overlap, not about the content: nothing in your
four items depends on the respine fix being correct.

Read all four issues in full — each carries its own measured table:

- `docs/issues/ISSUE_20260915_four_branched_topology_fields_have_no_value_guard_row.md` (bug, med)
- `docs/issues/ISSUE_20260915_the_viewer_readmes_10_of_46_node_divergence_count_is_unguarded_and_counts_the_wrong_thing.md` (bug, med)
- `docs/issues/ISSUE_20260915_the_stack_side_value_guard_bite_test_never_replays_its_empty_collector_arm.md` (chore, low)
- `docs/issues/ISSUE_20260915_the_prose_field_replay_pins_which_fields_the_corpus_states_an_inventory_in.md` (chore, low)

## Deliverables

1. **Enrol the branched topology fields `TOPO_VALUE_GUARDS` does not list.**
   `projection_field_guard_rows` enrolled `parts[].mesh.installed` as row 9 and
   asked whether any other field was missing; the audit it asked for says yes,
   and the argument that put row 9 in applies unchanged:
   - `topologies[].worksheet_source` — added 2026-09-08 by `topology_schema_v1`,
     live values `{null, "declared"}`, branched at `views/worksheet.js:29`
     (`if (stackProj.worksheet_source === "declared")`) via
     `topology_app.js:1051`'s `VA.renderWorksheet`. Anything else prints
     nothing — right for `null`, silent for a typo. The repo already guards this
     vocabulary on the **stack** side, but that table runs against
     `realResults` only, so the topology projection's copy is unguarded. This is
     `docs/prompts/REVIEW_AGENT.md`'s "a second file joins a class the repo
     already guards", one projection over. **Strongest of the four — do this
     one first.**
   - `edges[].zero_width` — live `{false, true}`, branched three times
     (`views/topology.js:945` row class, `:1037` grid chip, `:1302` detail
     chip). Falsy is the silent arm, and a zero-width band is a claim about a
     *lower bound* on the real spread — the chip a reader can least afford to
     lose quietly.
   - `nodes[].branch` and `layout.rows[].branch` — live `{false, true}`,
     branched at `views/topology.js:769`/`:776` (dot class, larger radius) and
     `:1236` (the BRANCH POINT chip).

   Two of these predate the audit window (`5679129`, 2026-09-01) — they are not
   drift, they are the class having been incomplete from the day it was written.

   Two findings from the same audit are **deliberately not** rows, and the
   reasoning must survive into the code or a comment so the next audit does not
   re-derive it:
   - `studies[].checks[]`'s `verdict` / `verdict_scope` / `worst_confidence` —
     emitted since 2026-09-09 (`391dc7c`) but rendered nowhere
     (`views/topology.js:1127` says so; grep finds no reader). A row now would
     guard an unrendered field. Leave a note where the person who later adds
     that strip will read it: three vocabularies the repo guards stack-side
     (`VA.verdictClass`, `VA.VERDICT_SCOPES`, `VA.CONFIDENCES`) arrive with it.
   - `studies[].error.type` — `VA.STUDY_ERRORS` has a **loud** fallback
     (`VA.unlabelledStudyErrorText`), and no live study carries an error, so a
     row would trip the empty-collector arm on every run permanently. It is
     paired to Python by `tests/test_topology_projection.py` instead. Not a gap.

2. **Give the stack-side bite test the empty-collector replay the topology side
   now has.** `projection_field_guard_rows` lifted the reporting loop out as
   `unexplainedValues(guards, projection)` and replayed the *empty collector*
   arm per row, so all nine `TOPO_VALUE_GUARDS` rows prove both arms. The
   stack-side table in `apps/viewer/tests.js` has the identical hole: `[real] no
   live value is one the viewer has no branch for` carries its own inline copy
   of the two-arm loop, and `[real] each value guard bites when fed a value
   nothing can explain` checks `known(SENTINEL)` for each of the 15 rows and
   nothing else. So for `source_ref.confidence`, `checks[].verdict`, `crop entry
   status`, `stacks[].worksheet_source` and eleven more, a collector that went
   blind — a renamed key in `build_viewer_projection.py`, a reshaped
   `crops.json` — would report `": no live value found"` at runtime with nothing
   proving that report fires. Hoist `unexplainedValues` out of the topology
   block so both tables call the one copy, and give the stack side the same
   per-row blind-collector replay. Mechanical; the topology side is the worked
   example.

3. **Fix the "10 of the 46 live nodes" sentence, and pair its digits.** Two
   defects in one sentence, shipped in `apps/viewer/README.md`'s hover-cards
   section and restated in `views/topology.js`'s `renderNodeDetail` comment.
   - *The number counts memberships; the sentence claims strings.* Re-derived
     from `C:\workspace\tolstack\data\projections\viewer\topologies.json`
     (5 topologies, 46 nodes) through `VA.nodeSideIds`: **10** nodes differ in
     declared `parts` vs derived sides **as a set**; **17** rendered a
     *different string* hovered vs clicked (the extra 7 are the same two parts
     in opposite order — authoring order vs first-seen-edge order, six of them
     `head_bearing_face`-shaped); **0** declare a part no incident edge carries.
     "Answering differently hovered and clicked" is the string claim, so the
     honest number for that wording is 17. `LESSONS_20260915_surfaces_that_state_something_false.md`
     already has it right — *"17 of 46 live nodes rendered a different string
     hovered and clicked; 10 differed in membership"* — and the shipped
     documents carry the other number under the string wording. Second sighting
     of `docs/prompts/REVIEW_AGENT.md`'s "One number, two nouns, both in the
     same commit". Either quote 17 for the string claim, or keep 10 and say
     *"naming a different **set** of sides"*; fix the comment with the same
     words.
   - *Both digits are hand-restated live-projection counts with nothing pairing
     them.* At least the third sighting on this one file in two weeks
     (`REVIEW_20260914_viewer_dag_hover_cards` S,
     `REVIEW_20260914_viewer_dag_spine_layout` S2, and
     `ISSUE_20260915_the_viewer_readmes_rail_allocation_measurement_is_stale_and_unguarded`).
     The pattern to copy is three tests down in the same file: `[real] every
     number apps/viewer/README.md states about the spine, the fit and the
     centring is re-derivable from the live projection` regexes the sentence out
     of `VIEWER_SRC.readText("README.md")` and asserts against a value computed
     from `liveTopos`. The new `[real]` node test already holds
     `divergedFromDeclared` and `nodes`, so this is a regex and two `eq`s.
     **Keep its existing `> 0` vacuity assertion** — it answers a different
     question.

4. **Stop `test_every_prose_field_the_count_pairing_claims_is_really_scanned`
   pinning which fields the corpus happens to state an inventory in.**
   `tests/test_topology.py`'s last assertion is
   `assert replayed == {"description", "notes"}`, where `replayed` is computed
   from the **committed topology corpus** — the set of `PROSE_FIELDS` keys that,
   when dropped, give `unlisted_inventory_fields` something to report. With `==`,
   an ordinary authoring act (appending one *correct*, guarded inventory
   sentence to a prose field that currently states none) reddens the guard's own
   demonstration. The per-member replay is the right answer to the blocker it
   was written for; only the `==` is wrong. Relax it to the claim the test
   actually wants to make — every `PROSE_FIELDS` key the pairing claims to scan
   is really scanned — without letting it pass vacuously when the corpus states
   no inventory at all. Read the issue: it names what "vacuously" would look
   like here.

## Definition of done

- Each new `TOPO_VALUE_GUARDS` row bites: demonstrate the per-row
  unknown-value **and** empty-collector arms reddening for the new rows and for
  the 15 stack-side rows, and paste the row count before/after into the lesson.
- The README sentence and the `renderNodeDetail` comment state the same number
  under the same noun, and a `[real]` check re-derives both digits from
  `C:\workspace\tolstack\data\projections\viewer\topologies.json` (gitignored —
  read it from the main checkout by that absolute path). Prove the pairing
  reddens: edit the README digit, show the failure, revert.
- `tests/test_topology.py` stays green when a correct, guarded inventory
  sentence is appended to a prose field that states none today — show that
  experiment and revert it — and still reddens if a `PROSE_FIELDS` key stops
  being scanned.
- `venv-win/Scripts/python.exe -m pytest -q` green (baseline 880 passed,
  1 skipped); fixture tier green, and the browser tier run with
  `--repo C:\workspace\tolstack` so the `[real]` checks are not skipped.
- Lesson (`docs/sessions/lessons/LESSONS_20260915_viewer_value_guard_rows_and_replays.md`):
  the final `TOPO_VALUE_GUARDS` row list with one line each on why the field is
  in it; where you recorded the two deliberate non-rows and why that location is
  the one the next person will read; and the shape you replaced the `==` with in
  deliverable 4, including what stops it passing vacuously.
