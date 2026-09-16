---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
reviewer: agent
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — viewer_component_names_and_reference_copy

Five items off Jeff's live read of the pitch-link topology: human names in the
grid, one fact once per row, plain-words reference copy, the broken "open the
PDF" link, and a resizable preview pane. **APPROVE**, two inline fixes, three
issues filed.

## What I verified

**Merged first**, then ran every tier off this review worktree's own projections
(`scripts/build_viewer_projection.py` + `build_topology_projection.py` with
`--data-root <this worktree>/data`, `data/meshes/` sha directories copied in —
never the tracked `README.md`; the shared projection in the main checkout was
not touched).

| tier | before my fixes | after, and after merging a moved `integration` |
|---|---|---|
| `pytest -q` | 1 failed / 1093 passed | **1 failed / 1094 passed** — the one failure is master's, see below |
| `run_tests.cjs` (fixture) | 311/311 | 311/311 |
| `run_tests.cjs --repo <worktree>` | 386/386 | **386/386** |
| `run_viewer_browser_tests.mjs --repo` | 19/19 suites, both origins | **19/19**, `[suite]` 297/297 each, `[topology]` 179/179 each |
| `run_mutation_witness_tests.mjs --repo` | 21/22 | **21/22** — the miss is pre-existing on `integration`, bisected below |

The merge itself conflicted once, in `scripts/mutation_witnesses.json`: both
sides appended entries. Resolved by keeping both (22 mutations, JSON re-parsed).

### The claims I re-derived rather than read

* **Every new class noun is sourced.** "hex-head bolt", "plain bushing", "flat
  washer", "countersunk washer" all come off `hardware_entries.json`'s
  `assembly_status.nomenclature`, as the lesson says. So do the balloon facts
  the notes now spell out: NAS6403U11D find 38 / 5X / sheet 4 DETAIL B;
  214820-002 find 34 / sheet 4 DETAIL B; NAS1149V0332 find 32 / qty 9 / sheet 4
  DETAIL B; NAS6404U13D find 27 / sheet 5 DETAIL X; MS21299C3 find 60 / AR /
  SECTION T-T. `pitch_plate_215197`'s "5X 4.06 ±0.10 at zone D10 of 215197 A.1
  **sheet 2**" matches the citation exactly. Nothing in the rewritten prose is
  invented.
* **The lesson's counts.** 29 parts across five topologies OK; longest authored
  names 34 and 32 characters, under `MAX_PART_NAME_CHARS = 44` OK; seven
  `source_ref.note`s in `docs/tolerance_stacks/stack_*.json` still naming a
  field or a checksum, matching the filed carve-out OK.
* **`VA.elementDisplayLabel` over all five live topologies**, before/after, as
  the lesson asks. No manglings: `"plain bushing length (214820-002)"` -> `length`,
  `"fastener grip, NAS6403U11D (.688 in)"` -> `fastener grip`,
  `"cotter-hole centreline to bolt point (dimension M)"` unchanged,
  `"blade-root clocking holes to the hub bearing seat"` -> `clocking holes to …`
  (leading only, never inside a phrase).
* **The component card's identity line, over the live projection**, for all 29
  parts. Four read "standard part — dimensions from NAS6403-NAS6420 Rev 4.pdf ·
  sheet 3" (the bolt gets "sheets 1, 3", correctly — its cotter-hole dimension
  cites sheet 1). Two parts get no line at all. See should-fix 3 for the rest.
* **The new prose guard observed failing.** Injected
  `"per the referenced element's source_ref, C:/workspace/x"` into a live
  `parts[].name`: `tests/test_topology_prose_for_a_reader.py` goes 2 failed /
  204 passed and names the file, the part and the offending substring.

### Mutations I ran beyond the four the author declared

The overlay's rule is *count the contracts the deliverable states and mutate any
half without an entry*. Six undeclared halves, all covered:

| mutation | result |
|---|---|
| grid's merged cell back to `String(part)` (the wiring, not `componentLabel`) | 377/386 — 9 reds |
| `elementDisplayLabel`'s clause reduction disabled (`if (true) return true`) | 385/386, the named clause test |
| the component card's `else if (card.references.length)` -> `false` | 384/386, incl. the `[real]` one |
| `writeStoredPaneWidth`'s `setItem` disabled | 385/386 |
| boot's `readStoredPaneWidth` -> `null` | browser 178/179, "a reload gets the remembered pane width back" |
| the `<code>` id chip put back on all three card heads and both pane heads | 383/386, incl. both banned-string walks |

One further mutation stayed **green in every tier** — see should-fix 2.

## Fixed inline (nothing silent)

1. **`apps/viewer/README.md`, two blocks.** This pass's new wording *"checked
   against the citation, byte for byte"* was quoted into the README with nothing
   naming the comparison in the same block, which added **two items** to the
   already-red
   `test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`.
   The lesson attributes that test's redness entirely to master's strategy brief;
   it names every unbacked claim it finds, and on this branch it found three.
   Both blocks now name the crop entry's `sha256_verified` and
   `scripts/build_viewer_crops.py`, which is what actually compared the bytes.
   The rendered string in `viewer.js` escapes the guard only because
   `sha256_verified` happens to sit on the same line. Correction blockquote
   added to §7 of the lesson; new overlay entry for the shape.
   **The remaining failure is master's**, already filed by the author
   (`ISSUE_20260915_a_strategy_briefs_byte_for_byte_claim_reddens_the_suite_on_master.md`).

2. **`docs/topologies/topology_pitch_link_to_pitch_plate.json` — a semantic
   conflict this merge produced.** The rewritten `bushing_214820_002` note ended
   *"so the length is transcribed from the assembly parts list and its band is
   on the gap list"*, which was true of the branch's tree and false of the merged
   one: `pitch_link_known_bands` landed on `integration` mid-flight and the
   stored form is now the drawing's 4.76 +0.00/−0.13 as the operator read it,
   with the parts-list nominal demoted to source (1) of the element's own note.
   Reworded to say what is true now; the gap-list half is unchanged and still
   correct.

## Should-fix (all filed, none fixed — APPROVE ends the handoff's ownership)

1. **`card-layout-out-of-flow` no longer witnesses; the mutation tier is 21/22.**
   Not this handoff's. Bisected by `git archive <rev>` into scratch trees:
   WITNESSED at the merge-base `473106e`, at the handoff tip, at `f629942` and at
   `0573826`; NOT WITNESSED from **`afcbbb4`** onward — the *review* merge that
   brought `viewer_study_verdicts_and_gaps`, `respine_tween_fidelity_round2` and
   `annotate_hosted_page_posture` onto one line. The mutated run goes red as
   `[topology file://] ERROR: locator.hover: Timeout`, aborting before the
   declared sub-check is reached. Each of the three siblings was green alone, and
   a review merge is the one place the mutation tier is not re-run.
   `ISSUE_20260915_the_card_layout_out_of_flow_mutation_witness_stopped_witnessing_on_integration.md`,
   plus a refinement to the existing overlay entry on post-merge re-runs.

2. **`VA.cropReference`'s `classPrefix` is unguarded.** The one bug this pass
   introduced and caught by eye (`views/detail.js` passed `"detail__crop"` where
   the separator belongs, rendering `detail__crophead` unstyled). Replayed in
   review: put it back and the fast tier is **386/386** and `[app file://]`
   **33/33**. Every assertion on that block reads `textContent`. `.croppop__head`
   is pinned by the browser tier; the `detail__crop-` prefix is pinned nowhere,
   on either pane.
   `ISSUE_20260915_the_shared_crop_renderers_class_prefix_argument_is_unguarded_in_every_tier.md`,
   plus an overlay entry.

3. **"dimensions from &lt;workbook&gt;" reads as sourcing on parts whose every
   value is `untraced`.** The `standardPart` branch is right and is Jeff's own
   example. The fallthrough branch says *"dimensions from
   260729_sample_tol_stack.xlsx · sheet grip length tols old"* for
   `spherical_bearing_tan_link` — three lines above that part's own note reading
   *"Its width is untraced"* — and for `flanged_bushing_unidentified`, whose card
   is titled *"part not identified"*. Seven live parts, every one of them wholly
   untraced and on the gap list. Nothing is false; the card simply makes the same
   sourcing statement for a traced drawing citation and for a workbook
   transcription this repo refuses to call traced, and it carries no confidence
   chip. The string it replaced claimed nothing.
   `ISSUE_20260915_the_component_card_says_dimensions_from_for_a_part_whose_every_value_is_untraced.md`
   — two options in it, both a few lines.

## Nits

* The bolt's card reads "sheets 1, 3" where the handoff's example said "sheet 3".
  That is the honest answer (the cotter-hole dimension M is on sheet 1) and the
  sheet ordering is deliberate. No change wanted — recorded so the next reader
  does not "fix" it.
* `[214820-002 plain bushing] "straight bushing length"` comes back unchanged on
  `tan_link_take2` while the same part's row on `pitch_link` reduces to `length`,
  because "straight" is not one of the component's words. Correct by the rule,
  mildly inconsistent to a reader. Authoring question, already owned by
  `ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`.
* The four issues the handoff filed carry correct frontmatter — `found_by`, not
  `handoff`, and every enum value is in its set.

## For the next reviewer

* The shared projection in `C:\workspace\tolstack\data` still shows the **old**
  part names; `project_part` copies `name` verbatim, so it is one rebuild, not
  lost work. The class is already owned by
  `ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red`.
* Building a review tree's own projections is cheap and is what made this review
  possible without fighting the live sessions: the two builders with
  `--data-root <worktree>/data`, `data/meshes/`'s sha directories copied in (not
  the tracked `README.md`), `crops.json` + `crops/` copied from the main
  checkout. `git archive <rev> | tar -x` plus `cp -r node_modules` makes the same
  thing for any historical revision, which is how the bisect above was done —
  four runs, about ten minutes.
