---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-16 — citation_identity_correctness: a parts-list row keyed too narrowly, a superseded plate citation, and a washer band that diverges from its siblings

Source: the 2026-09-16 dispatch triage sweep, clustering three open issues in
`docs/issues/` that all land on this repo's one rule — a value's citation must
name the thing it actually came from, and the identity it names must be the
right one:

- `ISSUE_20260916_a_parts_list_row_is_keyed_by_part_number_alone_and_one_row_is_overwritten.md` (bug, **high**)
- `ISSUE_20260915_stacks_cite_the_prelim_215197_plate_while_the_released_plate_is_215735.md` (chore, med)
- `ISSUE_20260915_rotor_fastener_washer_band_diverges_from_its_siblings.md` (bug, med)

They are one session because they meet on one element. The citation that issue
1's dedup key collides on — `NAS1149V0332H`, find 32, 217755 sheet 8
SECTION T-T — **is** the `source_ref` of
`stack_rotor_fastener_length.json::washer_nas1149v0332_tt`, which is the element
whose band issue 3 fixes, and whose crop
(`crops/rotor_fastener_length__washer_nas1149v0332_tt.png`) is one of the four
live balloon crops issue 1 can silently mis-frame. Issue 2 rebuilds three of the
same projections. Splitting them would mean two sessions racing the one shared
projection in the main checkout, which is a known failure here
(`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`,
`docs/strategy/BRIEF_20260914_real_tier_shared_projection_coupling.md`).

Baseline: `master` at the 2026-09-16 batch merge (merge `2ccec0f`, 129 commits
from `integration`), measured **1155 passed, 0 failed, 0 skipped** on
`venv-win/Scripts/python.exe -m pytest -q`. `tests/test_viewer_crops.py` alone
is **73/73**. Every value quoted below was re-measured on that tree on
2026-09-16.

Scope: you own `scripts/build_viewer_crops.py::parts_list_row_for` (and only
that function, plus a docstring), `tests/fixtures/viewer_crops/detail_b_balloons.json`,
new test functions **appended** to `tests/test_viewer_crops.py`,
`docs/tolerance_stacks/stack_{tan_link_to_pitch_plate,vpa_output_to_pitch_plate,pitch_link_to_pitch_plate,rotor_fastener_length}.json`,
`docs/tolerance_stacks/WORKSHEET_{tan_link_to_pitch_plate,vpa_output_to_pitch_plate,pitch_link_to_pitch_plate,rotor_fastener_length}.md`,
`docs/topologies/topology_{pitch_link,vpa_output}_to_pitch_plate.json`, the nine
`docs/topologies/study_rotor_fastener_grip_u*.json`,
`docs/spec_library/intake_queue.json` (rank 11 only), `PROVENANCE.md`,
`data/inbox/drawings/` (the file and its `PROVENANCE.md`), and the named pins in
`tests/test_tolerance_stack.py` / `tests/test_export_stack_tabular.py` /
`tests/test_topology_prose_for_a_reader.py`.

Do **NOT** touch, because five `HANDOFF_20260916_*` handoffs are staged in
parallel and own them:

- `apps/viewer/` layout, CSS and views, `apps/viewer/topology*.js`,
  `apps/viewer/tests.js` — `topology_grid_scroll_and_grips`,
  `viewer_unwitnessed_surface_guards`.
- reader-facing copy in `apps/viewer/viewer.js` / `apps/viewer/views/*`,
  `tests/test_js_python_vocabulary.py`, `tests/test_topology_projection.py`'s
  `JS_PAIRINGS` — `reader_facing_copy_and_vocabulary`.
- `scripts/run_mutation_witness_tests.mjs`, `scripts/mutation_witnesses.json`,
  `tests/test_mutation_witnesses.py`, `scripts/run_viewer_browser_tests.mjs` —
  `mutation_witness_tier_reaches_its_checks`, and two other handoffs own named
  line ranges of the browser runner. Do not edit that file at all.
- `ARCHITECTURE.md`, `docs/ANNOTATION_SURFACE.md` and the named paragraphs of
  `apps/viewer/README.md` — `doc_facts_and_projection_stamps`. **Measured: you
  do not need them** (see deliverable 5's "what does not move").
- **The rest of `scripts/build_viewer_crops.py` and `tests/test_viewer_crops.py`
  belong to `viewer_unwitnessed_surface_guards`**, which owns both files and
  edits `_crop_from_citation` (companion emission, `drawing_no`) and the
  `highlights[]` / `classPrefix` guards. It does **not** touch
  `parts_list_row_for` — its own deliverable 1b says so in as many words
  ("`parts_list_row_rect` and `parts_list_row_for` are tested as pure functions
  and nothing asserts the builder calls them"). Stay inside that function,
  append your tests at the end of the module, and change no existing test there;
  whichever of the two merges second rebases rather than overwrites.

`data/` is gitignored and exists only in the main checkout — every input below
is cited by absolute main-checkout path, and anything you write into `data/`
goes there by absolute path (`--data-root` / `-RepoRoot`).

## Deliverables

### 1. The dedup key: a parts-list row is keyed by part number alone, and one of two real rows is deleted

`scripts/build_viewer_crops.py::parts_list_row_for` (line 822) builds

```python
by_number = {str(row.get("part_number") or ""): row for row in rows}
```

over a drawing-checker run's `parts_list`, then takes `find_no` off whichever
row survived the comprehension.

**This is the recurring class dispatch is tracking workspace-wide — an identity
or dedup key whose inputs are narrower than the thing it identifies (four
sightings across three repos). State the diagnostic in your lesson in these
terms, and answer it concretely:**

- **The key**: `str(row["part_number"])`.
- **The thing identified**: a parts-list **row**, which is a
  `(part_number, find_no)` pair. The key is narrower by exactly `find_no`.
- **The two distinct real inputs that collide on it**, measured 2026-09-16 in
  `C:\workspace\drawing-checker\data\runs\20260819_110144_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER\217755_A_balloons.json`
  (103 rows; `NAS1149V0332H` is the only duplicated part number in the file):

  | array index | `find_no` | `part_number` | `nomenclature` | `qty` | ballooned |
  |---|---|---|---|---|---|
  | 12 | **13** | `NAS1149V0332H` | `WASHER, FLAT, 6Al-4V, .203" X .438" X .032" 1.000" LONG` | 15 | page 8, `p8:SECTION R-R` |
  | 31 | **32** | `NAS1149V0332H` | `WASHER, FLAT, 6Al-4V, .203" X .438" X .032"` | 9 | page 4 `p4:DETAIL B`, page 8 `p8:SECTION T-T` |

- **Which one the writer deletes**: the dict comprehension inserts index 12
  first and index 31 second, so **the second insertion overwrites the first —
  the find-13 row is the one discarded**, and `by_number["NAS1149V0332H"]` is
  find 32. Today that is the correct answer for all four live citations, by
  luck of the order drawing-checker happened to write the array in. Reverse the
  array and the same citation resolves to find 13, with nothing failing:

  ```
  C:\workspace\tolstack\venv-win\Scripts\python.exe -c "
  import sys, json, pathlib; sys.path.insert(0, 'scripts')
  import build_viewer_crops as B
  b = json.loads(pathlib.Path(r'C:/workspace/drawing-checker/data/runs/20260819_110144_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER/217755_A_balloons.json').read_text(encoding='utf-8'))
  sr = {'callout': 'NAS1149V0332H  WASHER, FLAT, 6Al-4V, .203\" X .438\" X .032\"  (find 32, qty 9 across the assembly; balloon at SECTION T-T)', 'view': 'SECTION T-T'}
  print(B.parts_list_row_for(b, sr, 'NAS1149V0332')['find_no'])                                   # 32
  print(B.parts_list_row_for({**b, 'parts_list': list(reversed(b['parts_list']))}, sr, 'NAS1149V0332')['find_no'])  # 13
  "
  ```

  Run from `C:\workspace\tolstack`. Output measured 2026-09-16: `32` then `13`.

**Why the wrong answer is worse than "a different row".** find 13's only
page-8 balloon is in `SECTION R-R`, and the citation names `SECTION T-T`. So
under the losing order `balloon_answer` finds no balloon in the cited view,
falls back to every balloon of the item on the sheet (`chosen = in_view or
on_sheet`), and the crop is **framed on another view of the cited sheet** while
the companion image shows the find-13 row with its part number boxed and the
highlight's title reads *"found on the page: balloon 13"* — a solid
`verified_match` claim about the wrong part, under the cited element's own name.

**The fix.** The citation already says which row it means, and the tie-break
already exists one function away: `parts_list_row_rect` (line 906) takes a
`find_no` and breaks exactly this tie by the number printed in the `FIND`
column, refusing rather than guessing when a tie survives (its docstring names
this same 217755 pair). So:

- collect **all** rows matching a candidate part number — `candidate_part_numbers`
  (line 792) is unchanged and still returns `['NAS1149V0332', 'NAS1149V0332H']`
  for the washer, most-authoritative first;
- narrow by the find number the citation itself states, where it states one.
  All four live citations carry it in their own `callout` text: `"… (find 34)"`,
  `"… (find 32, qty 9 across the assembly; balloon at SECTION T-T)"`,
  `"… (find 60, qty AR; balloon at SECTION T-T)"`, `"… (find 29, qty 1)"`. The
  hardware register carries it as a real field too —
  `docs/tolerance_stacks/hardware_entries.json`, entry `NAS1149V0332`,
  `assembly_status.find_no: 32` — which is a cleaner input than a regex over
  prose if you can reach it from this call site; **suggestion to investigate,
  not binding**: report in the lesson which input you used and why. If you parse
  the callout, the find-number pattern is a module-level named constant, never
  an inline literal and never an end-of-line comment (repo CLAUDE.md, "A field
  vocabulary is a module-level constant").
- **refuse** — return `None` — on a tie that survives, the way
  `parts_list_row_rect` already refuses. A missing companion is honest; a wrong
  one is not, and `balloon_answer`'s contract already says a `None` here places
  the crop exactly as it did before, so refusing can only ever lose a located
  crop, never move one.

**The guard, which must redden on the real colliding pair.** The committed
fixture cannot exhibit the collision as recorded, and this is the trap in this
deliverable: `tests/fixtures/viewer_crops/detail_b_balloons.json` was recorded
(`_recorded: "2026-09-15, handoff viewer_reference_crops_in_context"`) from run
`20260803_145243_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER`, and **that export
has no duplicate**: 103 rows, one `NAS1149V0332H` (find 32). The duplicate
exists only in the two 2026-AUG-19 exports —
`20260819_110144` and `20260819_163414` — and the AUG-19 export
(sha256 `789efa194e39454e5386ae10e016a3a313c8be15c419452dfcd1cc60afb2c939`) is
the one the rotor washer's citation actually names. So either extend the fixture
with the real find-13 row (values exactly as in the table above, and update
`_source`/`_why` to name the AUG-19 run the second row came from — the fixture's
own convention is that every row is recorded, never invented), or record a
second fixture. Do not hand-write a plausible row.

The test must assert, on that pair:

1. the cited row wins — the find-32 citation resolves to find 32; and
2. **reversing the row order does not change the answer** (this is the
   assertion that reddens on today's code: it returns find 13); and
3. two distinct rows colliding on the key with **no** citation-side find number
   returns `None` — a refusal, not the last row. Today
   `parts_list_row_for(balloons, {}, "NAS1149V0332")` already returns `None`
   because the truncated part number reaches nothing; build the no-find-number
   case on the full `NAS1149V0332H` so it is the *collision* being refused and
   not a missing key. An existing test
   (`test_a_part_number_is_matched_exactly_never_by_prefix`, line 1068) pins the
   exact-match rule and must stay green untouched.

Demonstrate the guard **red on today's code, then green after the key is
widened**, and quote both runs in the lesson.

### 2. Re-cite the pitch plate: the released part is 215735-001/-002, not the PRELIM 215197

All three grip stacks trace their 4.06 mm lug thickness to the only 215197
export anywhere — `[PRELIM 2025-MAY-22] 215197 A.1.pdf`, held in
drawing-checker's **test fixtures**, over a year older than the assembly export.
The 2026-09-15 audit (`docs/tolerance_stacks/AUDIT_20260915_full_pass.md`) found
the released design's plate is a different part number, and its evidence is on
disk:

- `C:\workspace\drawing-checker\data\runs\20260813_180719_215177-A\215177_A_p01.json` —
  the 215177 PITCH PLATE ASSEMBLY's own parts list, 4 rows:
  find **1** = `215735-001`, *PITCH PLATE, PROPELLER, CW* (qty 1); find **4** =
  `215735-002`, *PITCH PLATE, PROPELLER, CCW* (`qty_alt` 1).
- `C:\workspace\drawing-checker\data\inbox\drawings\215735-A.pdf` — 522,823
  bytes, sha256
  `a06526c2682de7a91cd76e3aa9463b043f50061da316ccecbf544b46a921c004`. Title
  block: drawing `215735`, revision **A**, *PITCH PLATE, PROPELLER*,
  `MATURITY STATE: Released`, `ECN-215735-A`, 2 sheets — sheet 1 *OVERVIEW*,
  sheet 2 *PART DETAILS*. Two drawing-checker runs consumed it and both record
  that same sha256, so "which export" has a unique answer here:
  `20260813_180734_215735-A` (`ts 2026-08-14T01:07:56.112994+00:00`) and
  `20260819_153213_215735-A` (`ts 2026-08-19T22:32:36.201417+00:00`).

**The values hold — this is a citation-currency chore, not a value defect.**
Read off 215735-A's text layer, 2026-09-16 (`pymupdf`, from drawing-checker's
venv — this repo deliberately does not install it):

| callout | sheet on 215735-A | today's citation on 215197 |
|---|---|---|
| `3X 4.06 ±0.08` | sheet **2** | sheet 2, zone B4, `SECTION A-A` — `tan_link_to_pitch_plate::pitch_plate_flange`, 3.98/4.14 |
| `5X 4.06 ±0.10` | sheet **2** | sheet 2, zone D10, `SECTION A-A` — `pitch_link_to_pitch_plate::pitch_plate_flange`, 3.96/4.16 |
| `4.06 ±0.10` (near the `⌖⌀0.03 D` / `⌖⌀0.2 A B C` frames) | sheet **1** | sheet 2, zone D10 — `vpa_output_to_pitch_plate::pitch_flange_thickness`, 3.96/4.16, `inferred` |

No element's `nominal`/`min`/`max`/`lmc`/`mmc`/`plus_minus` changes. No
element's `confidence` changes (`traced`, `traced`, `inferred`).

What you must do, and the order inside it matters:

1. **Copy the PDF in, then cite it from this repo.** Copy
   `C:\workspace\drawing-checker\data\inbox\drawings\215735-A.pdf` to
   `C:\workspace\tolstack\data\inbox\drawings\215735-A.pdf` (copy in, never move
   or modify the original — that dependency is read-only and one-way), verify
   the sha256 on both sides, and add a row to
   `C:\workspace\tolstack\data\inbox\drawings\PROVENANCE.md` in that file's
   existing table grammar (`| file | drawing | rev | nomenclature (title block) |
   sha256 | bytes |`), plus its own dated "Copied 2026-09-16" section and a
   re-copy snippet, per SOP Step 3. Read the release date off the title block;
   do not infer it. `export.pdf` may then be cited as the repo-relative
   `data/inbox/drawings/215735-A.pdf` — `export_pdf_path` (line 301) resolves a
   relative cited path against the **main checkout's** roots only, never the
   cwd, which is the shape that survives a worktree.
2. **Re-read sheet/zone/view on 215735-A. Do not carry 215197's addresses
   across.** Today's three crops are all `located_by: "zone_cell"` with
   `zone_grid: "read"` and `callout_text_in_zone: true`; a zone copied from the
   old sheet that does not contain the callout on the new one degrades the crop
   to `sheet_full` and the reviewer loses the one thing the crop was for. Note
   two measured facts: 215735-A **sheet 2** is the sheet carrying `SECTION A-A`
   (sheet 1 carries no section view by that name), and the third callout has
   moved sheet — it prints on **sheet 1**, which is where the VPA element's
   "which feature" ambiguity now lives.
3. **Update the three `source_ref`s**: `document` `215197` → `215735`,
   `revision` `A.1` → `A`, `sheet`/`zone`/`view` as re-read, and a fresh
   `export` block (`status: "established"`, the pdf path, the sha256 above, both
   runs as `{run_id, ts}` objects — a bare run id is refused by
   `export_run_ids`, line 344). The VPA element's which-feature ambiguity note
   carries over unchanged in substance: 215735-A still prints two `4.06 ±0.10`
   callouts (sheet 2's `5X` group and sheet 1's single one), so the tolerance
   alone still cannot decide, and its `confidence: "inferred"` stays.
4. **`PROVENANCE.md` (repo root) must be amended in the same commit.**
   `docs/tolerance_stacks/stack_tan_link_to_pitch_plate.json` and
   `stack_vpa_output_to_pitch_plate.json` are imported files carrying live
   "changed since import" rows, and `tests/test_provenance.py::unamended_rows`
   fails when an imported file changes and its row does not. The same is true of
   `WORKSHEET_tan_link_to_pitch_plate.md` and
   `WORKSHEET_vpa_output_to_pitch_plate.md` if you edit them, and of
   `hardware_entries.json`. The grammar to follow is already in those rows —
   *"`source_ref` and `note` only; no numeric field, path or check changed"* —
   and the precedent is exact: `citation_export_provenance` (2026-08-06) was
   caught by its own reviewer for making this class of edit without amending.
   **Do not write a byte-identity claim you have not verified in the same block
   of prose**: `tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
   requires a sha256, a `git diff`, a test, a blob or `PROVENANCE.md` beside any
   such claim, and an unbacked one reddened trunk for a day
   (`ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md`,
   resolved `1f62803`).
5. **The restating work comes second, and it is not optional.** Every number and
   name another surface restates about these citations moves *after* the
   citation edit, in the same commit. Measured inventory:

   | site | what it says today | why it moves |
   |---|---|---|
   | `tests/test_tolerance_stack.py:531-536` | `(document, sheet, zone) == ("215197", 2, "D10")`, `callout == "5X 4.06 ±0.10"`, plus two `# 215197 sh2 …` comments | the address moved |
   | `tests/test_tolerance_stack.py:2167-2168` | `(document, sheet, zone) == ("215197", 2, "B4")`, `callout == "3X 4.06 ±0.08"`; docstring *"215197 is the one part drawing this repo holds for these joints"* | the address moved, and the sentence is now false — 215735-A is in this repo's own inbox |
   | `tests/test_tolerance_stack.py:1377` (`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`) | `set(cited) == {"20260409_170546", "20260409_172341", "20260730_133912"}` | **see below — this is the load-bearing one** |
   | `tests/test_export_stack_tabular.py:110` | `row["part_drawing"] == "215197"` | the tabular export re-reads the citation |
   | `tests/test_topology_prose_for_a_reader.py:62` | `"pitch_plate_215197": "215197 pitch plate"` | reader-facing component name |
   | `docs/topologies/topology_pitch_link_to_pitch_plate.json` | `parts[2].name` *"215197 pitch plate"*, `parts[2].drawing` `"215197"`, `parts[2].note` (names zone D10 of 215197 A.1 sheet 2), `provenance.part_identity` | the same physical plate, named by a superseded number on a reading surface |
   | `docs/topologies/topology_vpa_output_to_pitch_plate.json` | `parts[2].name` *"215197 pitch flange"*, `parts[2].drawing` `"215197"`, `parts[2].note` | same |
   | `docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json:22` | joint parts-list role *"… contains the 215197 pitch plate"* | states what the assembly contains today |
   | `docs/spec_library/intake_queue.json` rank 11 | `document: "215197 at a current revision"`, `unblocks: "Whether the three 4.06 flange groups still read as they did 14 months before the assembly export."` | that question is now answered, by a different part number |

   **The rule for prose, so you do not rewrite history to get green:** a
   sentence stating what the design *contains* or what a value *cites* moves. A
   sentence recording what a past session **read or reasoned** stays and gets a
   dated addition — e.g. `stack_pitch_link_to_pitch_plate.json`'s
   `identification_note` (which argues from "the pitch plate part drawing 215197
   carries a distinct 5X 4.06 ±0.10 flange group") and
   `stack_tan_link_to_pitch_plate.json:23`'s `drift_warning` ("Mismatches
   against 217755/215197 are recorded as findings…") are both records of a past
   reading. The repo's convention for that is the dated correction blockquote
   (`docs/reference/` is insert-only; `ARCHITECTURE.md` and the worksheets carry
   several).

   **Committed ids do not change in this handoff.** `pitch_plate_215197`,
   `pitch_flange_215197` (topology part ids, also `edges[].part` values) and the
   stack ids are deep links and annotate keys. Rename nothing; where a name
   moves and its id does not, say so in the note so the mapping is written down.
   Whether to schedule a one-time rename with a redirect layer is a live
   strategy question — `docs/strategy/BRIEF_20260916_link_name_authority.md`,
   filed by this same sweep. Do not pre-empt it.

   **Rank 11 of `intake_queue.json`: do not quietly flip `in_pile`.** `in_pile`
   is about the spec pile (`data/inbox/specs/`); a drawing in
   `data/inbox/drawings/` is not in the pile, and three modules read this file
   (`tests/test_spec_library.py`, `tests/test_spec_library_review.py`,
   `tests/test_spec_pile_gap_join.py`). Record the answer honestly — the request
   was for "215197 at a current revision" and what arrived is a **different part
   number**, 215735-A, which is a small instance of
   `ISSUE_20260915_nothing_notices_when_a_requested_drawing_lands_in_drawing_checker.md`
   (open, `audience: strategy`, **not yours** — do not build a watcher).

6. **The export-run invariant, which loses its subject and must not be allowed
   to pass vacuously.** `test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`
   (line 1320) collects every run id cited by any element of
   `stack_pitch_link_to_pitch_plate.json` and asserts (a) the set is non-empty
   — *"no run cited at all — this invariant would pass vacuously"* — (b) every
   cited run predates that session's first commit (`d6829f2`,
   2026-08-04T22:42:57Z) and (c) `cited["20260730_133912"]` predates tolstack's
   root commit (`e7bd996`, 2026-08-03T23:05:08Z), which is the strongest form:
   *a cited run existed before this repo did, so this repo cannot have produced
   it.* Its own docstring says the three 215197 runs are **"the only
   element-level one left"** after `pitch_link_known_bands` moved the other two
   elements off 217755. Re-citing `pitch_plate_flange` to 215735-A therefore
   empties that set, and the 215735-A runs (2026-08-14 and 2026-08-19)
   **postdate** both commits. Three of that test's assertions go red at once.

   Resolve this deliberately and record the reasoning in the lesson. Do not
   delete the assertions to get green, and do not weaken the test into something
   that cannot fail — a guard that fires on nothing is this repo's named
   anti-pattern and this very test carries a comment about it. The read-only
   argument still exists on other grounds (both 215735-A runs record
   `"purpose": "eager"` in their `run_meta.json` — drawing-checker's own policy
   wrote them, and tolstack has no write path into that repo; see
   `ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth.md`), but that is
   a *different* argument from "it predates us", and which one the test now
   makes has to be stated in the test, not assumed. If the honest form is
   narrower than today's, say what was lost and file an issue for the rest
   rather than leaving prose that overclaims.

### 3. The washer band: `rotor_fastener_length` still folds ±0 where both its siblings fold ±0.004 in

`handoff pitch_link_known_bands` (2026-09-15) applied the recorded
`NAS1149V0332` thickness band under Jeff's ruling that a sourced-but-unverified
value belongs in a stack loudly rather than omitted silently, and under the SOP
Step 5b amendment of the same date: **the same part+feature must carry the same
band in every stack that uses it.** Three stacks use the part; two agree:

| stack | element | min | max |
|---|---|---|---|
| `tan_link_to_pitch_plate` | `washer_thin` | 0.7112 | 0.9144 |
| `pitch_link_to_pitch_plate` | `washer_nas1149v0332` | 0.7112 | 0.9144 |
| **`rotor_fastener_length`** | **`washer_nas1149v0332_tt`** | **0.8128** | **0.8128** |

`rotor_fastener_length` was explicitly out of scope for that handoff, so the
divergence was recorded instead of fixed:
`tests/test_tolerance_stack.py::KNOWN_BAND_DIVERGENCES` (line 822) holds the
pair and names the issue file, and
`test_one_part_and_feature_folds_one_band_in_every_stack_that_uses_it` fails if
that row goes stale **in either direction** — when the divergence closes (line
867) or when the pair stops existing (line 882). `SHARED_BANDS` (line 776)
already carries `"NAS1149V0332": (0.7112, 0.9144)`.

Apply `0.7112 / 0.9144` to `washer_nas1149v0332_tt` with the citation treatment
its pitch-link sibling now carries — copy that element
(`docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json::washer_nas1149v0332`)
as the template, not from memory: `kind: "workbook"`, `document:
"260729_sample_tol_stack.xlsx"`, `sheet: "grip length tols old"`, `cell:
"E11/F11"`, `export: null`, `confidence: "untraced"`, `nominal 0.8128`,
`lmc 0.7112`, `mmc 0.9144` (additive member — MMC is the thickest, so
`mmc → max`), `plus_minus 0.1016`, and the provenance trail in the `note`
(E11 is `=0.032*25.4`, F11 `=0.004*25.4`, the workbook's comment column names
`NAS1149V0332` at I11; NAS1149 has never been in `data/inbox/specs/`, which is
what keeps it `untraced`). The gap stays **open** in
`WORKSHEET_rotor_fastener_length.md`, reworded from "no band known" to
"band workbook-sourced, NAS1149 not in the repo", exactly as the pitch-link
worksheet's gap 4 was.

That stack's **other** washer, `washer_ms21299c3` (1.6002, zero-width), is out
of scope and stays: MS21299 is genuinely absent, with no workbook value either.
So after this change the stack has exactly one zero-width element, not two.

**What this moves, all of it measured.** `sourced_clamped_stack` is
`washer_ms21299c3 + washer_nas1149v0332_tt`, so it stops being zero-width:
nominal **2.4130** (unchanged), min **2.3114**, max **2.5146**,
`worst_case_half` **0.1016**. The nine `grip_budget__u*` checks are
`sourced_clamped_stack − fastener_grip_u*`, each grip carrying ±0.254:

- nominal magnitudes do **not** move (dash 2 `0.7620` … dash 10 `13.4620`);
- worst-case magnitudes widen: dash 2's worst-case budget `1.0160` →
  **1.1176** (`3.429 − 2.3114`), dash 10's `13.7160` → **13.8176**
  (`16.129 − 2.3114`); the other end tightens (dash 2 `0.5080` →
  **0.4064**);
- **RSS stops equalling worst case**, which is a prose claim in the worksheet
  and not just a number: with two banded terms the RSS half-width is
  `sqrt(0.1016² + 0.254²) = 0.2735664`, not `0.3556`. Compute the table from
  `fold()`, never by hand — `tests/debug_report_tolerance_stacks.py` is the
  inspection tool for it (run by hand, never by pytest).

Then repin and delete the stale row. The sites, measured:

- `docs/tolerance_stacks/stack_rotor_fastener_length.json` — `paths[0].label`
  says the column is sourced members only (fine) but the **nine `guidance`
  strings** (lines 394, 411, 428, 445, 462, 479, 496, 513, 530) each restate
  `2.413` and the arithmetic; `grip_budget__u2h`'s says *"both zero-width so
  nominal=min=max=2.413 mm"*, which is now false.
- the **nine** `docs/topologies/study_rotor_fastener_grip_u*.json` carry a
  verbatim copy of that same `guidance` at line 28 of each. Both copies move
  together; if a test pairs them, let it.
- `docs/tolerance_stacks/WORKSHEET_rotor_fastener_length.md` — line 136
  (`= MS21299C3 + NAS1149V0332H = **2.4130 mm**, zero-width (both members are
  zero-width bands, so the path is too)`), the sentence *"RSS equals worst case
  exactly here, because the sourced column is zero-width"*, and **all nine rows
  × four numeric columns** of the budget table (`budget WC min`, `budget WC
  max`, `RSS min`, `RSS max`).
- `tests/test_tolerance_stack.py:1002-1003` —
  `got.min == got.max == pytest.approx(2.413)` and
  `got.worst_case_half == pytest.approx(0.0)`; the enclosing test
  (`test_rotor_fastener_sourced_clamped_stack_is_the_two_washers_only`) has a
  docstring whose premise ("Both washers carry a zero-width band") inverts.
- `tests/test_tolerance_stack.py:1023-1025` —
  `-checks[0].interval.min == 1.016` and `-checks[-1].interval.min == 13.716`.
  The `magnitudes == sorted(magnitudes)` and the two nominal pins stay.
- `tests/test_tolerance_stack.py::test_rotor_fastener_has_no_workbook_source_and_declares_its_zero_width_bands`
  — **its whole premise inverts** and it needs renaming, not patching:
  `"workbook" not in kinds` becomes false, `zero_width == {"washer_ms21299c3",
  "washer_nas1149v0332_tt"}` loses a member, and
  `confidences.count("inferred") == 2` / `count("untraced") == 0` become 1 and
  1. Rewrite it to pin what is true now and what is easy to lose: exactly **one**
  workbook citation in this file, named, carrying `untraced`, with its gap open —
  and a later pass that quietly promotes it to `inferred` or `traced` (which is
  what makes the viewer stop badging it) fails here. The precedent to follow,
  written for the identical move one stack over, is
  `test_pitch_link_carries_its_two_unverified_bands_loudly_and_not_as_traced`
  (line 655): keep the old rule's history in the docstring, state which ruling
  replaced it, and guard the half of the ruling that is easy to lose.
- `tests/test_tolerance_stack.py:1686` — the all-stacks confidence census
  `every == {"instances": 61, "traced": 30, "inferred": 17, "untraced": 14}`
  becomes `inferred 16, untraced 15` (`instances` and `traced` do not move).
  Add a dated `# Moved 2026-09-16` comment in that block's established style.
  **The seeded ratio does not move** — `SEEDED_STACK_FILES` is the three seeded
  stacks and `rotor_fastener_length` is not one of them, so the "5 of 26"
  figure the eleven ratio publishers quote is untouched by deliverable 3, and
  deliverable 2 changes no `confidence` label, so it is untouched by that too.
  **Do not edit `ARCHITECTURE.md`** (see the fence).
- `KNOWN_BAND_DIVERGENCES` — delete the row. Leaving it fails at line 867 with
  *"delete the row, the divergence is closed"*.
- `tests/test_tolerance_stack.py::test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry`
  (line 2748) is the anti-laundering guard and is scoped to the `pitch_link`
  fixture. After this change `rotor_fastener_length` is the **second**
  from-scratch stack folding a workbook-derived band, so it is the second
  candidate for the same guard. **Suggestion to investigate, not binding:**
  extend it to both stacks, keeping its non-vacuity half intact, or record in
  the lesson why one stack is the right scope.

### 4. Run the actuator, once, and quote its stamps

Deliverables 2 and 3 both change projected values, so this repo's actuator has
to run — a stale shared projection is what the `[real]` tier reads:

```
powershell -ExecutionPolicy Bypass -File C:\workspace\tolstack\scripts\rebuild_projections.ps1
```

From the **main checkout** (`C:\workspace\tolstack`); the script's preflight
fails from a worktree by design, because `venv-win` and `data/` exist only
there. It rebuilds `topologies.json`, `results.json` and `crops.json` in that
order — crops through drawing-checker's interpreter, because PyMuPDF lives only
there — fails loud on any non-zero exit including the provenance gate's exit 3,
and never passes `--allow-older-tree`. **Never pass it yourself**: a refused
rebuild stays refused and gets reported.

Run it **after** the suite is green, and **once** — not after each deliverable.
Then quote all three provenance stamps (`branch`, `sha12`, `dirty`,
`behind_trunk`) in the lesson and confirm they agree. For contrast, the stamp
on today's `C:\workspace\tolstack\data\projections\viewer\crops.json` is
`built_at 2026-09-16T08:55:25+00:00`, `branch master`, `head_sha 9c25aff9fe55`,
`dirty false`, `behind_trunk 0`.

Order inside the session: **deliverable 1 first** — it decides which parts-list
row a crop is framed on, and you do not want to regenerate `crops.json` twice
or bake in an answer that today is only correct by insertion order. Deliverables
2 and 3 are value-independent of each other (the rotor stack cites 217755, not
215197) and may be done in either order, but both restate pins in
`tests/test_tolerance_stack.py`, so do each one's own restating work before
starting the other.

### 5. What does **not** move, so you do not go hunting

Measured on this tree, 2026-09-16:

- **The four live balloon crops keep their find numbers** — `rotor_fastener_length/washer_ms21299c3`
  (find 60), `rotor_fastener_length/washer_nas1149v0332_tt` (find 32),
  `tan_link_to_pitch_plate/straight_bushing` (find 34),
  `vpa_output_to_pitch_plate/under_head_chamfer_washer` (find 29). Deliverable 1
  is a correctness fix with no visible change today; if a find number moves
  after your fix, stop — that is a finding, not a success.
- **No topology-space crop cites 215197** (`by_topology`: 24 citations, 6
  resolved, none on 215197). Only three `by_stack` entries do:
  `tan_link_to_pitch_plate/pitch_plate_flange`,
  `pitch_link_to_pitch_plate/pitch_plate_flange`,
  `vpa_output_to_pitch_plate/pitch_flange_thickness`.
- **The viewer's fixture tier is not live data.** `apps/viewer/fixtures.js`,
  `apps/viewer/tests.js:256` (*"215197 · rev A.1 · sheet 2 · SECTION A-A · zone
  D10"*), `:494` and `apps/viewer/README.md:709` are synthetic demo entries
  pointing at `C:/workspace/demo/215197.pdf`. They do not move with real data
  and they belong to parallel handoffs. Leave them. If a **`[real]`-tier** JS
  assertion breaks after the actuator run, do not fix it inside the browser
  runner (three handoffs own line ranges of that file) — report it in the
  lesson, with the failing label, for the operator to sequence.
- **The seeded traced ratio ("5 of 26") and its eleven publishers.** See
  deliverable 3.
- **drawing-checker is read-only.** Both the AUG-19 217755 export and 215735-A
  live there, and find 13's `nomenclature` carries a suspect `1.000" LONG`
  tail that looks like a neighbouring row bleeding into the band (that export's
  own `parts_list_rejected_rows` names that failure mode for find 16). Do not
  "fix" it and do not file it here as a tolstack defect; if it is worth saying,
  say it in the lesson as an upstream observation. The key collision is real
  either way — the find numbers and the part number are both printed.

## Definition of done

- **The dedup guard is demonstrated red then green on the real colliding pair.**
  Quote both runs of the guard in the lesson: failing on today's
  `by_number` comprehension (it returns find 13 under reversed rows) and passing
  after the key is widened to `(part_number, find_no)`. A refusal case is
  covered: two distinct rows, no citation-side find number, `None` returned.
- **Every changed citation is demonstrated against the real data by absolute
  main-checkout path.** For each of the three re-cited elements, show the
  callout found on 215735-A at the sheet/zone/view you wrote, read from
  `C:\workspace\tolstack\data\inbox\drawings\215735-A.pdf` (sha256
  `a06526c2682de7a91cd76e3aa9463b043f50061da316ccecbf544b46a921c004`), and show
  the rebuilt crop entry carrying `drawing_no: "215735"`,
  `drawing_revision: "A"`, `sha256_verified: true` and `located_by:
  "zone_cell"` with `callout_text_in_zone: true`. If any of the three can only
  be placed as `sheet_full` on the new export, say so explicitly rather than
  leaving a quietly worse crop.
- **The washer band is one band in all three stacks**, the
  `KNOWN_BAND_DIVERGENCES` row is gone,
  `test_one_part_and_feature_folds_one_band_in_every_stack_that_uses_it` is
  green with the row deleted, and the nine budgets are recomputed from `fold()`
  with the worksheet's WC/RSS columns and its RSS-equals-worst-case sentence
  corrected.
- **Tests: full suite green.** `venv-win/Scripts/python.exe -m pytest -q` from
  `C:\workspace\tolstack` — baseline **1155 passed**; report the new total and
  account for the difference (new guard tests, plus any test renamed in
  deliverable 3). `tests/test_viewer_crops.py` was 73/73 before your additions.
  A docs-only change can legitimately turn this suite red — that is the design
  here, not a nuisance.
- **The actuator ran, once, from the main checkout, and its three provenance
  stamps are quoted and agree.**
- Lesson (`docs/sessions/lessons/LESSONS_20260916_citation_identity_correctness.md`):
  the dedup diagnostic in the workspace-wide form — *which two distinct real
  inputs mapped to the one key, and which of them the writer deleted* — with
  the widened key and how the guard fails when two distinct inputs collide
  rather than silently taking the last; what you used as the citation-side find
  number and why; how you resolved the pitch-link export-run invariant and what
  it now claims that it did not before; whether `test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry`
  was extended to the second stack; and the three actuator stamps. Anything the
  next agent cannot derive from the diff.
