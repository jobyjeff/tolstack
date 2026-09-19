---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-18 — reader_facing_surfaces_second_pass: six live surfaces that talk to the reader in schema field names, code, or 750px of composite cell

Source: the 2026-09-18 triage sweep, routing six open issues that are one class
— **a reader-facing surface saying something written for a different audience,
or at a size written for different data**. Every one is a *second instance* of a
rule a previous handoff applied to the surfaces in front of it and no further:

- `docs/issues/ISSUE_20260917_the_materials_source_column_is_a_750px_tall_composite_cell.md` (bug, med)
- `docs/issues/ISSUE_20260917_the_worksheet_renderer_makes_one_paragraph_per_source_line.md` (bug, med)
- `docs/issues/ISSUE_20260916_the_materials_table_says_values_status_and_library_ref_to_the_reader.md` (bug, low)
- `docs/issues/ISSUE_20260917_the_annotators_console_and_parts_label_print_code_at_the_reader.md` (bug, med)
- `docs/issues/ISSUE_20260916_both_preview_panes_still_restate_the_document_over_the_crop.md` (bug, low)
- `docs/issues/ISSUE_20260918_a_joint_that_was_never_opened_now_reads_as_a_loud_file_not_identified.md` (bug, low, `audience: strategy`)

Baseline: trunk at `5809360`, the 2026-09-18 batch merge, with
`reader_facing_copy_and_vocabulary`, `viewer_hover_deslop_and_banner_purge` and
`real_tier_red_and_the_skipping_tier` all merged. Scope: `apps/viewer/views/`,
`apps/viewer/style.css`, `apps/viewer/vendor/markdown.js`, `apps/annotate/`,
and the guards that cover them. Do NOT touch
`scripts/mutation_witnesses.json` — that belongs to the parallel handoff
`mutation_witness_enrollment_gaps`, staged the same day. **Coordinate with it
rather than working around it**: if you add a guard here, name it in your lesson
for that handoff to enroll, and say so.

**`model: opus`, not negotiable:** five of six are judgement about layout,
density and voice on a page Jeff reviews by eye.

## Deliverables

1. **The materials source column is the composite cell the elements table
   already retired.** Measured on `hub_bearing_thermal_fit_m1`, live data, at
   1600×1000 with the preview pane at its 560px default: the first `tr.mat-row`
   (`AL_7050_T7451`) renders **750px tall**, and all six cells report that
   height because one of them sets it. The elements table already solved this
   shape; apply the same solution rather than inventing a second one — and say
   in the lesson what the elements table's answer was, because a third table
   will arrive.

2. **The worksheet renderer makes one `<p>` per source *line*.** Measured on
   `WORKSHEET_hub_bearing_thermal_fit.md` in the worksheet dialog
   (`views/worksheet.js` → `apps/viewer/vendor/markdown.js`): **294
   paragraphs** from a file hard-wrapped at ~80 columns, so a paragraph reads as
   a column of fragments — and `**bold**` spanning a wrap is not parsed at all.
   Fix the renderer's block handling (a blank line ends a paragraph; a single
   newline is a soft wrap), and cover it with a case whose bold spans a wrap.
   **Do not reformat the source worksheets** to work around the renderer; the
   documents are correct markdown.

3. **The materials table says `values_status`, `library_ref` and
   `materials.json` to the reader — and the guard cannot see it.** This is the
   important half: `reader_facing_copy_and_vocabulary` widened the banned-string
   walk to the stack-side surfaces and added a scan for the schema's own field
   names, and it covers `views/stack.js`'s materials table. **It is green
   because no live or fixture material entry reaches the branches that would
   fail it**, not because the branches are clean. So fix the strings *and* make
   the guard non-vacuous: add a fixture entry that reaches those branches, so
   the guard is proven to cover the code it claims to. A guard whose covered
   branch is unreachable in every fixture is a guard that reports green over
   nothing.

4. **The annotator prints a command line, a JS module path and a repo folder
   path at the reader, on two always-visible surfaces.** At rest on
   `apps/annotate/index.html?mock=1`, nothing selected: the command box's
   placeholder reads `command, e.g. isolate machined_213668
   (window.AnnotateApp.exec)` and the parts panel's label reads `parts
   (data/meshes/)`. Screenshot on file at
   `docs/sessions/lessons/LESSONS_20260916_design_pass_typography_10_annotator_page_after.png`.
   Each breaks a different standing web-UI rule (an internal API path at a
   reader; a repo folder path as a label) — fix both, and check whether the
   banned-string guards reach `apps/annotate/` at all or only `apps/viewer/`.
   If they do not reach it, that is the more valuable finding: widen them, and
   report what else they light up.

5. **Both preview panes restate the document, one line under the citation that
   already named it.** `viewer_hover_deslop_and_banner_purge` deliverable 2
   fixed this on the **hover cards** — a card states its document once, in its
   own where-line, and the crop under it renders no head — and scoped the
   deliverable to cards, so the two preview panes were left exactly as they
   were with the same defect. Apply the same rule. This is the cheapest of the
   six and the clearest instance of the class.

6. **A joint block shouts FILE NOT IDENTIFIED in a sentence written for a
   citation.** Since `real_tier_red_and_the_skipping_tier`, a joint's
   `assembly_export_ref` renders through `VA.exportBlockNode` — which is right,
   it is the one builder and the key-by-key fallback was leaking a checksum, a
   workstation path and two run ids. But `VA.EXPORT_STATUSES.unestablished`
   says *"FILE NOT IDENTIFIED — which file this value was read from cannot be
   established"*, and **there is no "this value" in a joint block**: the joint
   is context, not a number. Live on `hub_bearing_thermal_fit_m1` and `_m2`.

   This issue carries `audience: strategy`. The sweep judged it below the brief
   bar — it is a wording call inside one repo's copy vocabulary, not a policy —
   and makes the call here so review can check it: **the status vocabulary needs
   a per-subject sentence, not one sentence reused for values and for joints.**
   The rejected alternative was to special-case the joint block at its call
   site, which keeps one wrong sentence in the shared vocabulary and moves the
   problem to the next non-value subject. If you find a third subject while
   doing this, that is evidence the vocabulary needs a subject parameter rather
   than two strings — say so.

## Definition of done

- Every fix demonstrated on **live** data at 1600×1000, with before/after
  screenshots in the report. Five of six are visual; a diff does not show
  whether they worked. Live stack data is gitignored and exists only in the
  main checkout — read it from `C:\workspace\tolstack\data\` by absolute path,
  and point the JS runner at it with `--repo C:/workspace/tolstack`.
- The materials row's measured height is in the report, before (750px) and
  after.
- The worksheet dialog renders `WORKSHEET_hub_bearing_thermal_fit.md` with a
  paragraph count consistent with its blank lines, not its newlines — number in
  the report — and bold spanning a wrap is parsed.
- Deliverable 3's guard is proven non-vacuous by a fixture that reaches the
  branches it covers.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green, and
  the JS suite green against real projections
  (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` — 455/455 as of
  `5809360`). In a worktree the `[real]` tier cannot run without that seam;
  86 of 455 checks read gitignored `data/`, so an environment failure there is
  not a red.
- Lesson (`docs/sessions/lessons/LESSONS_20260918_reader_facing_surfaces_second_pass.md`):
  **all six of these are second instances of a rule applied once to the surfaces
  in front of a previous handoff.** Say whether the guards can be made to find
  the *next* second instance without a human reading the page — that is the
  question worth answering, and you will be the first to have seen all six
  together.
