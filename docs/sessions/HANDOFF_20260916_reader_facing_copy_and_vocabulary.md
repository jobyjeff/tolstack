---
priority: med
depends_on: [topology_grid_scroll_and_grips]
model: opus
---

# HANDOFF 2026-09-16 — reader_facing_copy_and_vocabulary: six surfaces that say something false, internal, or unpaired with their own vocabulary

Source: the 2026-09-16 dispatch triage sweep, clustering six open tolstack
issues (`docs/issues/`) into one class — **server- or client-authored copy that
says something false, internal, or unpaired with its own vocabulary source.**
Baseline: `master` after the 2026-09-16 batch merge, where
`venv-win/Scripts/python.exe -m pytest -q` measured **1155 passed**.

Scope: `apps/viewer/viewer.js`, `apps/viewer/topology.js`,
`apps/viewer/views/{stack,detail,cards,worksheet,topology}.js`, the copy- and
vocabulary-guard sections of `apps/viewer/tests.js`,
`tests/test_js_python_vocabulary.py`, `tests/test_topology_projection.py`'s
`JS_PAIRINGS`, and the `UNVERIFIED_CONFIDENCES` constant in
`scripts/build_topology_projection.py` (that constant only — do not rework the
builder).

Do NOT touch, and each has a named owner:

- **`apps/viewer/` layout and CSS** — `HANDOFF_20260916_topology_grid_scroll_and_grips.md`
  is staged over it. Your changes here are **text and vocabulary only**. The CSS
  class names `chip--zero-width`, `num--zero-width`, `el-row--zero-width`,
  `tvrow--zero-width` (`apps/viewer/views/topology.js:1050`) stay exactly as
  they are — nothing reads them as words.
- **`scripts/run_mutation_witness_tests.mjs`, `scripts/mutation_witnesses.json`,
  `tests/test_mutation_witnesses.py`** — `HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md`.
  Do not enroll your new guard in the witness tier yourself; name it in your
  lesson so that handoff can.
- **The crop and topology value-guard test modules** — one or two guard handoffs
  are being staged over them in parallel. `VALUE_GUARDS` / `TOPO_VALUE_GUARDS`
  in `apps/viewer/tests.js` are theirs. Item 5 below needs you to delete a local
  `WORKSHEET_SOURCES` **inside** `tests.js` that both guard rows read; keep that
  diff to those exact lines, and record the overlap in your lesson so the merge
  order is visible.
- **`docs/topologies/*.json` authored `revision` and `name` field values** —
  whether `revision` should carry per-sheet detail is an open *authoring*
  question (`ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`,
  left open deliberately by the last sweep). See item 1: you fix the viewer's
  half and leave the document's half alone.
- `docs/reference/` (insert-only), `data/inbox/specs/` (append-only), and the
  projection field `zero_width_count` (not user-visible; see item 3).

Gitignored inputs live only in the main checkout. The live projections you will
verify against are
`C:\workspace\tolstack\data\projections\viewer\topologies.json`,
`C:\workspace\tolstack\data\projections\viewer\results.json` and
`C:\workspace\tolstack\data\projections\viewer\crops.json`. Pass
`--repo C:/workspace/tolstack` to the JS runners so the `[real]` tier sees them.

**Sequencing (set by the 2026-09-16 triage sweep, check the reasoning rather than just obeying it).**
`depends_on: [topology_grid_scroll_and_grips]`, which is itself third in a chain, so
you are last of four over `apps/viewer/`. Why: your deliverable 3 edits
`views/topology.js:1583-1584` and your deliverable 5 deletes a `WORKSHEET_SOURCES`
local **inside** `apps/viewer/tests.js` — both files are rewritten by the handoffs
ahead of you, and `tests.js` by two of them. Your guard deliverable also wants to
reach the inline-literal scanner into `apps/viewer/`, which is only worth wiring
once the guard registries ahead of you have stopped moving.

## Deliverables

1. **The citation where-line prints `rev Rev 4`.**
   (`ISSUE_20260915_the_citation_where_line_prints_rev_rev_4_and_a_four_clause_revision_note.md`.)
   `VA.citationWhere` (`apps/viewer/viewer.js:339`) is
   `if (sourceRef.revision) parts.push("rev " + sourceRef.revision);`, and the
   live NAS citation's authored `revision` already begins with "Rev", so
   selecting the bolt's `fastener_grip` row renders the observed string

   > `NAS6403-NAS6420 Rev 4.pdf · rev Rev 4 (sheet 1 rev 4, sheet 2 rev 2, sheet 3 NEW, sheet 4 rev 2) · sheet 3 · grip/length table · cell row 'Grip Dash No. 11'`

   It should read `… · Rev 4 (sheet 1 rev 4, …) · …` — i.e. **do not prefix a
   label a value already carries.** Suggested shape, to investigate rather than
   copy blindly: suppress the `"rev "` prefix when the value already starts
   (case-insensitively) with `rev`, and keep it otherwise. `citationWhere` is
   shared by both viewers and four surfaces and its shape deliberately matches
   drawing-checker's own "Where" column, so it is pinned by several tests —
   update them rather than routing around the function.
   **The four-clause per-sheet note is the document's, not yours.** Leave
   `revision`'s authored value alone; it is the authoring question fenced above.

2. **The component card makes a sourcing statement over values this repo
   refuses to call traced.**
   (`ISSUE_20260915_the_component_card_says_dimensions_from_for_a_part_whose_every_value_is_untraced.md`,
   priority med — the highest in this set.) `apps/viewer/views/cards.js:131` is
   `(card.standardPart ? "standard part — dimensions from " : "dimensions from ") + card.references.map(VA.referenceText).join("; ")`.
   Over the live projection (2026-09-15) the unqualified branch renders, among
   seven lines:

   > `dimensions from 260729_sample_tol_stack.xlsx · sheet grip length tols old`

   on `pitch_link | washer_nas1149v0332h`,
   `tan_link_take2 | spherical_bearing_tan_link`,
   `tan_link_take2 | flanged_bushing_tan_link`,
   `vpa_output | flanged_bushing_unidentified`, and

   > `dimensions from 260825_End_Stop_JC.xlsx · sheet End Stop Tol Stack; 212966-006-A · sheet 4`

   on `pitch_system | hub`. **Every dimension behind every one of those lines is
   `confidence: "untraced"` and on the gap list** —
   `flanged_bushing_unidentified`'s card is titled *"part not identified"* and
   then says where its dimensions come from; `spherical_bearing_tan_link`'s own
   note three lines below says *"Its width is untraced."*

   **The right wording here is a judgement and this handoff does not make it for
   you.** The constraint: the card carries no confidence chip, so this line is
   the only provenance its reader sees, and it must not use the same words for a
   traced drawing citation and for a workbook transcription this repo explicitly
   refuses to call traced. Two options, both a few lines, both of which the
   existing `[real]` guard (*"every live part with no drawing names the document
   its own dimensions come off, or says nothing at all"*) passes under:
   (a) **qualify by the citations' own confidence** — `VA.partReferences`
   (`apps/viewer/topology.js:2410`) already collects `kinds` per document and can
   collect confidences the same way, giving e.g. *"dimensions transcribed from
   … — untraced"*; or
   (b) **restrict the line to `kind: "spec"` / `kind: "drawing"`** and render
   nothing for a part whose only citations are `workbook`, which is already the
   rule stated for the overlay. (a) is more informative; (b) cannot be wrong.
   Pick one, say in the lesson which and why, and pin the chosen string at the
   value level. The `standardPart` branch is right as it stands — Jeff's own
   example — so do not disturb it.

3. **"zero-width band" and "no tolerance recorded" are one fact with two
   vocabularies, inside one viewer.**
   (`ISSUE_20260915_the_stack_view_still_says_zero_width_band_where_the_dag_says_no_tolerance_recorded.md`.)
   The DAG page says **`no tolerance recorded`** (`VA.ATTENTION.no_tolerance`,
   `apps/viewer/topology.js:334-335`; `VA.GAP_KINDS.no_tolerance_recorded`,
   `apps/viewer/topology.js:497`) — Jeff's standing rule: everyday words, no
   schema jargon. Five user-visible strings still say the schema's word:

   - `apps/viewer/views/stack.js:250-252` — the element row chip,
     `VA.chip("chip--zero-width", "zero-width band", "min == max: every interval this feeds is a LOWER bound on the real spread.")`
   - `apps/viewer/views/stack.js:195-196` — both min/max cells' `title`,
     `"zero-width band: min == max, no document gives a tolerance"`
   - `apps/viewer/views/detail.js:46-48` — the same chip in the detail pane
   - `apps/viewer/viewer.js:270-271` — `VA.summaryChips`' header chip,
     `stackProj.zero_width_count + " zero-width band" + (… ? "" : "s")`,
     rendering e.g. `1 zero-width band`
   - `apps/viewer/views/topology.js:1583-1584` — the **DAG page's own** hover
     card, which is what makes this a straight self-contradiction rather than a
     two-surface split

   Every one should read `no tolerance recorded` (or a sentence built from it:
   the summary chip becomes e.g. `1 element with no tolerance recorded`), and
   all five must be **sourced from one place** — the module-level-constant shape
   `VA.ATTENTION` already has, per `CLAUDE.md` ("a field vocabulary is a
   module-level constant, never an inline literal"). Read the existing constant
   rather than adding a sixth copy of the words. `apps/viewer/tests.js:220`
   asserts `"1 zero-width band"` and `tests.js:1000`/`1080` assert the chip —
   those move with the copy. Class names and `zero_width_count` do not move.

4. **The element pane prints bare drawing-checker run ids as link text.**
   (`ISSUE_20260916_the_element_pane_still_prints_bare_drawing_checker_run_ids_as_link_text.md`.)
   `VA.exportRunsLine` (`apps/viewer/views/detail.js:131-141`) renders, measured
   in a real browser on 2026-09-16 in served mode on
   `tan_link_to_pitch_plate:straight_bushing`:

   > `drawing-checker runs: 20260723_163810, 20260727_153847, 20260730_131903, 20260730_132230`

   with the first as an `<a>` whose text is `link.run_id` verbatim. Two inches
   above it, `views/crop.js` already renamed its click-through *away* from
   "open run in drawing-checker" to the drawing's own number and revision, with
   the reason written in: *"a run is an internal artifact, and its id told a
   reader nothing about which drawing they were about to open."*

   **This one is a design call and the handoff states the constraint, not the
   copy.** A run id genuinely *is* the address of the thing the link opens, so
   this may be the single place an internal id earns its place. Either outcome
   is acceptable; a silent third option is not:
   - **If the ids go**, give the line the same treatment the crop link got —
     name the drawing and the date as the link text, keep the raw id on the
     `title`. The unlinked ids' existing `title` ("no link: drawing-checker
     addresses a run by a longer name than the id recorded here…") already
     explains why they are unlinked; preserve that fact.
   - **If the ids stay**, the guard in item 7 must carry an **allowlist entry
     that argues for it in a comment** — this exact surface, this exact reason —
     so the next reader meets the argument instead of an exception.

5. **`worksheet_source` has no `VA.WORKSHEET_SOURCES` to read.**
   (`ISSUE_20260915_worksheet_source_vocabulary_has_no_va_constant.md` — a
   vocabulary-source defect, not a wrong string. Give the vocabulary one home.)
   The branch `if (stackProj.worksheet_source === "declared")`
   (`apps/viewer/views/worksheet.js:29`) reads a bare literal; the vocabulary's
   only named copy today is a local `WORKSHEET_SOURCES` **inside**
   `apps/viewer/tests.js`, read by both guard rows — one copy instead of two,
   but not co-located with the branch and invisible to that branch's reader.
   Three steps, from the issue's own fix shape:
   1. `VA.WORKSHEET_SOURCES` beside the other viewer vocabularies (where
      `VA.CONFIDENCES`, `apps/viewer/viewer.js:67`, and `VA.VALUE_SOURCES`,
      `apps/viewer/topology.js:55`, live), carrying `declared` / `by_name` /
      `null`, each with what it means **on screen**.
   2. `views/worksheet.js` branches off the constant, not off the literal.
   3. Both `tests.js` rows read `VA.WORKSHEET_SOURCES`; delete the local
      `WORKSHEET_SOURCES` and the comment pointing at the issue.

   Both builders write the same three values (`worksheet_for` in
   `scripts/build_viewer_projection.py` and in
   `scripts/build_topology_projection.py` — the same two rules, deliberately not
   shared because each builder is stdlib-only), so pair the new table against
   whichever of those is the honest Python side rather than inventing a third
   spelling. Out of scope: whether
   `test_no_persisted_field_vocabulary_is_an_inline_literal`
   (`tests/test_tolerance_stack.py:2945`, which reads `tolerance_stack/` only and
   is why this went uncaught in the viewer for as long as it has) should reach
   `apps/viewer/` — item 7 is where that question gets answered, if it does.

6. **The loud-gap confidence pair lives in three places and nothing pairs
   them.** (`ISSUE_20260915_the_loud_gap_confidence_pair_has_three_homes_and_no_pairing.md`,
   priority med — the other structural half. One home, the rest paired to it.)
   `untraced` + `no_source_ref` — *nothing readable stands behind this number* —
   decides two things that must agree, and each side spells the pair itself:
   - `scripts/build_topology_projection.py:190`,
     `UNVERIFIED_CONFIDENCES = ("untraced", "no_source_ref")`, selecting which
     edges become `unverified_value` rows in a topology's `gaps` list;
   - `apps/viewer/viewer.js:88-90`, `VA.needsAnnotation`, whose body is
     `return confidence === "untraced" || confidence === "no_source_ref";` —
     two inline literals in a function, deciding which grid rows and which
     studies wear the `unverified` badge and which edges offer the annotate
     link;
   - `VA.confidenceClass`'s comment (`apps/viewer/viewer.js:76-78`) states the
     pair a third time, in prose.

   The first two are *computed* and must describe the same set: if they drift,
   the "what's missing" panel lists rows the grid does not badge, or the
   reverse, on the one page whose job is to say what cannot be trusted. They
   have never been pairable because `tests/test_js_python_vocabulary.py`'s
   `PAIRINGS` and `tests/test_topology_projection.py`'s `JS_PAIRINGS` both need
   a `VA.<NAME> = {` / `= [` **table** to anchor on and `needsAnnotation` is a
   function. Fix shape: promote the JS side to
   `VA.UNVERIFIED_CONFIDENCES = ["untraced", "no_source_ref"]` with
   `needsAnnotation` reading it, add a `js_array_strings` row pairing it against
   `build_topology_projection.UNVERIFIED_CONFIDENCES` (the same shape that
   closed `CONFIDENCES` and `VERDICT_SCOPES`), and retire the prose copy in
   `confidenceClass`'s comment in the same diff. Note `no_source_ref` has
   **zero live instances** (recorded in `tests/test_js_python_vocabulary.py`),
   so drift in that half would not surface in live data either — the pairing is
   the only thing that can catch it.

7. **THE IMPORTANT ONE — build the guard, not just the six fixes.**
   Items 1-6 are six sites. This item is what decides whether there is a seventh
   next week. Read
   `C:\workspace\dispatch\docs\sessions\lessons\LESSONS_20260915_triage_sweep_guards_not_checklists.md`
   §2 before starting: dispatch's sibling class got **two checklist promotions
   and measured zero reduction in rate**, because a checklist makes a class
   visible to whoever reads the checklist and does not make it impossible. A
   checklist promotion does not count as having addressed this class. Build
   something that **fails**.

   Required: a test that reddens when a reader-facing surface (a) prints an
   internal identifier — a run id, a schema field name, a module name, a
   checksum, a workstation path — or (b) restates a vocabulary that has a
   canonical home. What exists today, and where each stops short:
   - `apps/viewer/tests.js:3002` — `BANNED_IN_RENDERED_TEXT`, eight **literal**
     strings (`sha256`, `source_ref`, `crop_key`, `crops.json`, `C:/`, `C:\`,
     `build_viewer_crops.py`, `venv-win`). No run-id **shape**, which is exactly
     why item 4 walked past it. A shape (`\b\d{8}_\d{6}\b`) catches ids nobody
     has written yet; a literal only catches the four in today's data.
   - `apps/viewer/tests.js:3222` (fixture tier) and `tests.js:9756` (`[real]`
     tier) — the internal-id walks. Both enumerate **topology** surfaces (grid,
     node/edge panes, hover cards) and check each topology's own ids. Neither
     visits the stack-side surfaces this handoff edits — `views/stack.js`,
     `views/detail.js`, `views/worksheet.js`, `VA.summaryChips`.
     `VA.exportRunsLine` sits on a surface no walk reaches.
   - `tests/test_tolerance_stack.py:2945` —
     `test_no_persisted_field_vocabulary_is_an_inline_literal`, the
     restated-vocabulary half, reading `tolerance_stack/` **only**. Items 5 and
     6 are both instances of what it would have caught inside `apps/viewer/`.
   - `tests/test_js_python_vocabulary.py`'s `PAIRINGS` and
     `tests/test_topology_projection.py`'s `JS_PAIRINGS` — the pairing
     machinery, which needs a table and so cannot see a vocabulary spelled in a
     function body (item 6).

   Suggested directions, to prototype and report on rather than to follow: teach
   the banned list to carry **shapes as well as literals**, and extend the
   surface walk's coverage to the stack-side renderers; and either teach the
   inline-literal scanner to reach `apps/viewer/` or mirror it there, so a
   two-or-more-literal comparison whose members equal a `VA.<NAME>` table's
   members fails. **Preserve `VERBATIM_PROSE_CLASSES`**
   (`apps/viewer/tests.js:3020`) and its argument: the ban is on the *viewer's*
   words, never the record's — a document's own note is rendered verbatim on
   purpose and trimming it would be editing the record.

   Two demonstrations, both required in the lesson:
   - **A negative control**: the guard does not fire on the corrected tree.
     Report the counts.
   - **A planted positive**: show it **reddens**. Plant one, revert it, and
     quote the failure message. A candidate is already sitting there —
     `VA.citationWhere` returns the literal `"no source_ref"`
     (`apps/viewer/viewer.js:336`) while `BANNED_IN_RENDERED_TEXT` bans
     `source_ref`; if your widened walk reaches a citation-absent surface, that
     string should either redden or become an argued allowlist entry. Either
     resolution is fine; an unexamined one is not.

   **If you conclude a general guard is not tractable here, that is an
   acceptable finding only with a substitute.** The lesson must then say
   precisely *why* — which surfaces cannot be enumerated, which identifier
   shapes cannot be told apart from a word a human would write (the existing
   walks' `id.indexOf("_") === -1` skip is the precedent and the reason) — and
   name **the narrower guard you built instead**, with its own negative control
   and planted positive. "Not tractable" with nothing in its place is not an
   acceptable outcome for this item.

## Definition of done

- Every string in items 1-4 reads the corrected wording on the **live**
  projections at `C:\workspace\tolstack\data\projections\viewer\topologies.json`
  and `…\results.json`, not only on fixtures. Verified on the named cases:
  `pitch_link:fastener_grip` (item 1), the `dimensions from` lines listed in
  item 2 including `pitch_system | hub` and
  `vpa_output | flanged_bushing_unidentified`, the five zero-width sites in
  item 3, and `tan_link_to_pitch_plate:straight_bushing` in served mode
  (item 4).
- **Screenshots committed under `docs/sessions/lessons/`** for every copy change
  that lands on a rendered surface — items 1, 2, 3 and 4 at minimum, one image
  each showing the corrected string in place. A copy change on a rendered
  surface with no picture of it is not done.
- Items 5 and 6 each have **one** home: `VA.WORKSHEET_SOURCES` and
  `VA.UNVERIFIED_CONFIDENCES` exist as `VA.<NAME>` tables, every other spelling
  of those vocabularies reads them or is deleted (including the prose copy in
  `confidenceClass`'s comment and the local `WORKSHEET_SOURCES` in `tests.js`),
  and each is paired against its Python side by a `js_array_strings` row that
  fails if either half changes alone.
- Item 7's guard exists, with its negative control and its planted positive both
  recorded — or its documented substitute, on that item's terms.
- Tests green, value-level, all three tiers, counts reported:
  - `venv-win/Scripts/python.exe -m pytest -q` — **1155 passed** was the
    2026-09-16 batch-merge measurement; expect that plus your new coverage.
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` (fast tier).
  - `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
    (browser tier) — item 4 was measured in a real browser, and a copy change on
    a rendered surface is not witnessed by the node tier.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_reader_facing_copy_and_vocabulary.md`):
  the judgement calls and their reasons — which option you took for item 2 and
  why; whether the run ids stayed or went in item 4, and what the allowlist
  comment says if they stayed; the guard's negative-control and
  planted-positive evidence, quoted; if you built a narrower guard, why the
  general one was not tractable and what the narrow one does cover; whether
  widening the walk to the stack-side surfaces turned up sites nobody had
  filed; and the `tests.js` overlap with the parallel value-guard handoffs,
  named line by line, so the merge order is visible.
