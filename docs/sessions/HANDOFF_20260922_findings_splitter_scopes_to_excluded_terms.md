---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-22 — findings_splitter_scopes_to_excluded_terms: ` -- ` means two different things, and the splitter only knows one of them

Source: `docs/issues/ISSUE_20260922_the_authored_finding_splitter_also_cuts_edge_names_where_the_same_separator_means_something_else.md`
(bug, med), filed by the review of `viewer_summary_balance_sheet` and routed by
the 2026-09-22 triage sweep. Baseline: trunk `master` @ `836f11e` — the
2026-09-22 batch merge has landed, `viewer_summary_balance_sheet` is in
`completed/`, projections are rebuilt and the full suite is green.
Scope: `apps/viewer/topology.js`, `apps/viewer/views/topology.js`,
`apps/viewer/tests.js` and the viewer fixtures those read. Do NOT touch
`apps/viewer/views/stack.js`, `apps/viewer/viewer.js`'s alert model or
`apps/annotate/` — `HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md`
owns those; and do NOT touch `scripts/mutation_witnesses.json`, which
`HANDOFF_20260922_mutation_witness_repair_and_enrollment.md` owns.

## The defect, measured

`VA.splitAuthoredFinding` (`apps/viewer/topology.js`, added 2026-09-22) splits
an authored finding at ` -- ` into a **name** (rendered as the row's
`<summary>`) and a **rationale** (rendered in the fold). The lesson
`docs/sessions/lessons/LESSONS_20260922_viewer_summary_balance_sheet.md`
justifies that as an **excluded-term** convention: *"Every excluded term in the
live projection that carries a reason at all separates what from why with
` -- `."* That is true of excluded terms and only of excluded terms.

`VA.studyFindings` runs the same splitter over all three buckets. Two of them —
`attention.unverified` and `attention.noTolerance` — carry **edge and node
names**, where ` -- ` is a *naming* convention (`name -- clarifier`), not a
what/why one. Measured against `data/projections/viewer/topologies.json`
(main checkout, absolute path
`C:\workspace\tolstack\data\projections\viewer\topologies.json`): **58 strings
carry ` -- `**, and `edge.name` / `node.name` are among them —
`shank out -- full-diameter shank beyond the modelled clamped stack`,
`flat washer far face -- the last modelled clamped surface`.

One is live in a findings table today: the edge
`piston end to end-stop feature -- the end stop` is `untraced` and in the chain
of **five** studies (`pitch_system_blade_angle_average`, `…_worst`,
`…_end_stop_minus7`, `…_end_stop_plus72`,
`pitch_system_vertical_hub_to_pitch_arm`). Each renders a row reading
`piston end to end-stop feature` with `the end stop` in the fold, presented as
the author's argument for why the value is unverified — beside
`closes: Find the drawing callout or datasheet line…`. The row also names the
edge by a name the grid one block above does not use.

## Deliverables

1. **Scope the split to the bucket the convention is about.** Pass
   `VA.splitAuthoredFinding` only the `excluded_from_model` bucket; take
   `unverified` / `no_tolerance_recorded` names **whole**. The CSS already
   clamps an unsplit name to one line, so no stylesheet change should be
   needed — verify that rather than assuming it. Keep the split behaviour
   itself unchanged for excluded terms; this is about which strings reach it.
2. **Pin it with a fixture whose edge name carries a ` -- `.** The regression
   this closes is invisible in any fixture where no `unverified` /
   `no_tolerance_recorded` name contains the separator, which is why it shipped.
   Add one and assert the row renders the whole name and the fold carries no
   invented rationale.
3. **De-fragilise the `[real]` test this made brittle.** `[real] a study fed by
   a zero-width row warns that its spread is a lower bound` asserts
   `shownRows.indexOf(edge.name) !== -1` over `summary.tvfind__name` text. That
   holds today only because no *zero-width* edge's name happens to carry a
   ` -- `. After deliverable 1 it holds by construction for that bucket — say so
   in a comment at the assertion, so the next reader knows it is no longer
   luck.

## Explicitly out of scope

`docs/issues/ISSUE_20260922_the_findings_whole_text_assertion_is_satisfied_by_the_gap_panel_beside_it.md`
is in the same file and is **deliberately left open** by the 2026-09-22 triage
sweep — it is an instance of the class owned by
`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`
(a guard whose truth is asserted by substring over a whole pane rather than
paired to the row it is about). Do not "fix it while you are in there": that
pre-decides an open strategy question by brute force. If your change happens to
alter whether that assertion is vacuous, record what you observed in the lesson
and leave the assertion alone.

## Definition of done

- On the live projection, all five `pitch_system*` studies that chain
  `piston end to end-stop feature -- the end stop` render that edge's name
  whole in the findings row, with nothing in the fold pretending to be a
  rationale. State the before/after row text for one of the five in the lesson.
- The new fixture reddens if deliverable 1 is reverted (run it; do not assert
  it from reading).
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` green (both the
  fixture and `[real]` halves), plus the repo's normal `venv-win` pytest run.
- Lesson (`docs/sessions/lessons/LESSONS_20260922_findings_splitter_scopes_to_excluded_terms.md`):
  the rule in one sentence — which buckets the ` -- ` convention governs and why
  the other two do not — and whether the CSS clamp really did handle an unsplit
  name without a stylesheet change.
