---
priority: med
depends_on: [viewer_unwitnessed_surface_guards]
model: sonnet
---

# HANDOFF 2026-09-16 — doc_facts_and_projection_stamps: three documents state a mechanical fact that is measurably false, and nothing pairs any of them

Source: the 2026-09-16 dispatch triage sweep, dispositioning three open
docs-accuracy issues in `docs/issues/`, all filed by 2026-09-15 sessions:

- `docs/issues/ISSUE_20260915_architecture_md_still_says_every_mesh_is_a_tessellated_per_part_step_copy.md`
  (chore, med; filed out of `extracted_mesh_alias_rows`)
- `docs/issues/ISSUE_20260915_viewer_readme_mutation_tier_paragraph_is_stale_on_both_counts.md`
  (chore, low; filed out of `mutation_witness_tier_repair`)
- `docs/issues/ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_change_does_not_reproduce.md`
  (chore, low; filed out of `viewer_respine_whole_walk`)

Baseline: trunk `master` @ `9c25aff9fe55`, after the 2026-09-16 batch merge of
the 2026-09-15 sweep. The full suite measured **1155 passed, 0 skipped** on
that tree, and `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`
measured **407/407 passed, 0 skipped**. Both numbers are your starting line —
you are not fixing a red tree.

**Two projection issues that were routed here were verified resolved instead
and are NOT your work** (recorded so you do not re-do them):
`ISSUE_20260915_the_shared_projection_predates_the_shortened_part_names_so_a_real_test_is_red_on_integration.md`
and `ISSUE_20260915_the_shared_topology_projection_still_stamps_one_meshed_part_of_twelve.md`
were both fixed by the batch merge's `scripts/rebuild_projections.ps1` run. All
three projections in `C:\workspace\tolstack\data\projections\viewer\` now stamp
`branch=master head_sha=9c25aff9fe55… dirty=false`, built `2026-09-16T08:55Z`.
Do not rebuild a projection in this session and do not touch
`C:\workspace\tolstack\data\` at all.

Scope: **`ARCHITECTURE.md`**, **`docs/ANNOTATION_SURFACE.md`**, the **two named
paragraphs of `apps/viewer/README.md`** (the mutation-witness tier section
~line 1515–1538 and the "Studies" paragraph ~line 625–635, plus the commands
block at ~line 1500–1513), and **one new pytest module** you create under
`tests/`.

Do **NOT** touch — each is owned by a `HANDOFF_20260916_*` staged in parallel:

- `apps/viewer/tests.js`, `apps/viewer/viewer.js`, `apps/viewer/topology.js`,
  `apps/viewer/topology_app.js`, `apps/viewer/views/`, `apps/viewer/topology.css`,
  `apps/viewer/style.css`, `apps/viewer/topology.html` — split between
  `HANDOFF_20260916_topology_grid_scroll_and_grips.md`,
  `HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md`,
  `HANDOFF_20260916_reader_facing_copy_and_vocabulary.md` and
  `HANDOFF_20260916_viewer_unwitnessed_surface_guards.md`.
  **Your guards do not go in `apps/viewer/tests.js`**, even though the repo's
  existing README pairings live there. Put them in pytest instead (below).
- `scripts/run_mutation_witness_tests.mjs`, `scripts/mutation_witnesses.json`,
  `tests/test_mutation_witnesses.py`, `scripts/run_viewer_browser_tests.mjs`,
  `apps/annotate/run_tests.cjs` — `mutation_witness_tier_reaches_its_checks`
  and `viewer_unwitnessed_surface_guards`.
- Any other reader-facing viewer copy (`apps/viewer/README.md` beyond the three
  passages named above), `tests/test_js_python_vocabulary.py`, and the crop /
  topology value-guard test modules (`tests/test_viewer_crops.py`,
  `tests/test_topology_projection.py`, `tests/test_viewer_js_suite.py`) —
  `reader_facing_copy_and_vocabulary` and `viewer_unwitnessed_surface_guards`.
- `C:\workspace\tolstack\data\` (gitignored, shared by every worktree) and
  `docs/reference/` (insert-only).

`mutation_witness_tier_reaches_its_checks` claims `apps/viewer/` broadly in its
own scope line while forbidding itself `docs/` prose. `apps/viewer/README.md`
is the seam. **You own only the three passages named above in that file**; if a
merge conflict appears there it is textual and confined to those passages.

**Sequencing (set by the 2026-09-16 triage sweep, check the reasoning rather than just obeying it).**
`depends_on: [viewer_unwitnessed_surface_guards]` for one specific reason: your
deliverable about `apps/viewer/README.md`'s mutation-tier paragraph argues for
**deleting the digit** rather than updating it, and that handoff *appends* to
`scripts/mutation_witnesses.json`. The count has already been three different
values in two days (README says three, the filing issue measured twelve, this sweep
measured 27 with 7 naming a `[real]` check). Going after the append means you state
the argument against a count that has just moved a fourth time, which is the
strongest possible version of it.

## The framing that makes this session more than copy-editing

**A doc that states a mechanical fact is testable, and an unverified one costs
every future reader an action.** A wrong route, a wrong count, a wrong causal
claim each send a reader to look for something that is not there, or to trust a
number that moved. Two claims in the 2026-09-15 sweep were wrong in exactly
this way, and **both were written by careful agents who never ran the thing** —
the fact was plausible, adjacent to true, and nothing in the repo could
disagree with it.

So every correction below has **two halves**, and a correction delivered
without its pairing is **half the deliverable**:

- **(a)** state the corrected fact, re-derived from the tree in this session;
- **(b)** pair it with a **guard that goes red if the doc drifts again.**

This repo already does this and you copy its shape, not invent one:

- `tests/test_provenance.py` — the doc-scan guards (`test_every_byte_identity_claim_in_a_live_file_names_its_verification`),
  each with a **negative control** proving the scan can fail
  (`test_the_grep_catches_the_reconstructed_sighting_three`,
  `test_the_check_catches_the_reconstructed_sightings_four_and_five`).
- `tests/test_architecture_inventory.py` — reads `ARCHITECTURE.md`, asserts
  every extraction **non-empty before comparing** (a scan that silently finds
  nothing is a guard that passes against anything), and carries
  `test_the_quantifier_scan_can_fail` as its own negative control. Read its
  module docstring first: it states explicitly that it covers the module
  inventory block **only**, which is precisely why the rotorkit bullet below
  drifted unguarded.
- `tests/test_part_mesh_aliases.py` — has a `[real]` tier that pairs the
  tracked table against `C:\workspace\tolstack\data\meshes`, `skip`ping
  cleanly when that store is absent. That skip pattern is how a guard over
  gitignored `data/` stays runnable from a worktree.

Two standing rules from `CLAUDE.md` bind the wording you choose: **a quantity
written in prose that no test reads from the tree is a defect regardless of
whether it is right today**, and **never restate the thing being guarded** —
point at the owner and let the guard keep it true. Where the honest fix is to
delete a number rather than update it, delete it.

## Deliverables

1. **`ARCHITECTURE.md`'s rotorkit bullet is wrong about the route and about the
   copy step.** At `ARCHITECTURE.md` **lines 577–581**, the bullet reads:

   > **rotorkit** — `data/meshes/<sha>/` is tessellated from a STEP file by
   > rotorkit's `stepgeom.tessellate` (`scripts/tessellate_parts.py`, run from
   > rotorkit's own checkout and venv — OCP lives there, never here). This repo
   > never patches rotorkit or imports its code; it copies the binary mesh
   > output, unmodified, plus a provenance sidecar (`data/meshes/README.md`).

   Measured in the main checkout on 2026-09-16 by reading every
   `C:\workspace\tolstack\data\meshes\*\provenance.json`'s `produced_by`:
   **24 installed meshes, 22 produced by `scripts/extract_assembly_parts.py`
   and 2 by `scripts/tessellate_parts.py`.** So the bullet describes 2 of 24.
   There is also **no copy step on the assembly route** —
   `extract_assembly_parts.py` writes the `data/meshes/<sha>/` layout into this
   repo directly and idempotently; the copy-and-rename recipe survives only
   under the single-part heading in `data/meshes/README.md`. And
   `source_step_sha256` on an extracted mesh is **not** a STEP file's hash —
   there is no per-part STEP upstream of it; it is the sha256 of the extracted
   solid's canonical BRep (`stepgeom.assembly.shape_signature`).

   **Rewrite it as two routes with no count**, mirroring the wording
   `data/meshes/README.md` already uses (see its "Two ways a mesh gets here,
   and what the key hashes in each" at ~line 32, and its "Each directory is
   self-describing instead" at ~line 132). Each directory's own
   `provenance.json` is the authority for which route it took. **Do not write a
   routes-per-mesh count into `ARCHITECTURE.md`** — the table that used to
   carry one in `data/meshes/README.md` is the cautionary instance, recorded
   there.

2. **`docs/ANNOTATION_SURFACE.md` has the weaker form of the same error.** At
   `docs/ANNOTATION_SURFACE.md` **lines 84–89** ("The mesh format"), the
   sidecar is described as "(source STEP path, sha256, tessellation tier, the
   rotorkit command that produced it)", which reads as a per-part STEP that
   does not exist for 22 of 24 meshes. It already points at
   `data/meshes/README.md`, so the **cheapest correct fix is to let the pointer
   carry the detail** rather than restate it — that is also the `CLAUDE.md`
   rule. Suggestion to investigate, not binding: drop the parenthetical's
   "source STEP path" framing to something route-neutral, and let the existing
   `See data/meshes/README.md.` be the authority.

3. **A guard pairing both documents against the mesh store.** New pytest
   module (suggested `tests/test_mesh_route_doc_facts.py` — name it as you
   like, but **not** inside a module the scope fence above reserves). It must:

   - read `ARCHITECTURE.md` and `docs/ANNOTATION_SURFACE.md` from the tree,
     assert the passage was **found** (non-empty extraction) before asserting
     anything about it, and go red if either passage again asserts that a mesh
     comes from a per-part STEP, or that this repo *copies* mesh output, as an
     unqualified statement about the store;
   - derive the live route set from `C:\workspace\tolstack\data\meshes\*\provenance.json`
     `produced_by`, `skip`ping when the store is absent (worktree), in the
     shape `tests/test_part_mesh_aliases.py` already uses at its lines ~166 and
     ~193 — so a `pytest -q` from a worktree still passes and the `[real]` half
     bites in the main checkout;
   - carry a **negative control**: a reconstructed stale sentence the scan is
     asserted to reject, so the scan cannot silently match nothing. Copy
     `tests/test_architecture_inventory.py::test_the_quantifier_scan_can_fail`.

   Match shapes, not English — `test_architecture_inventory.py`'s docstring
   documents that fence and it applies here too. A scan that tries to
   understand prose will either miss or false-positive; a scan over a named
   phrase plus a route-name allowlist will not.

4. **`apps/viewer/README.md`'s mutation-tier paragraph restates a count that
   has already moved twice.** At `apps/viewer/README.md` **line 1534** the
   section "The mutation-witness tier" says:

   > It takes `--repo` for the same reason the other two do: **three of the
   > declared witnesses are `[real]` checks.**

   Measured 2026-09-16 from `scripts/mutation_witnesses.json`:
   **27 declared mutations, 7 of them naming a `[real]` check in `expect_red`**
   (4 browser preference/persistence, 2 fast-tier annotate-link, 1 browser
   sticky-rails). The issue that filed this measured **12 and 6** one day
   earlier. The number was right when written, has been wrong twice since, and
   nothing keeps it right — **so stop counting**: *"some of the declared
   witnesses are `[real]` checks"*, or point at the runner's own printed note.
   The JSON's `about` block already made this exact retreat once ("all
   eighteen" → "a full run of every suite") and its `tier` paragraph says
   outright *"no number is written out here, because nothing would keep it
   true."* Follow that.

   **And the count is about to move a third time.**
   `HANDOFF_20260916_viewer_unwitnessed_surface_guards.md`, staged in parallel,
   **appends** new entries to `scripts/mutation_witnesses.json`'s `mutations[]`.
   Whatever number you might measure today will be wrong by the time both
   sessions merge. This is not an argument for updating the digit carefully —
   it is the argument for deleting it, and your guard in item 5 is what makes
   the deletion stick.

   **Also fix the commands block** (~lines 1500–1513): it shows only the
   `--repo` form for this tier. `npm run test:mutations` — the entry point the
   tier hangs off (`package.json` `"test:mutations"`, present and correct) —
   appears nowhere in the README, while the two tiers above it in the same
   block each get the `# this checkout` / `# ...from a worktree` pair the repo's
   convention uses. Give the mutation tier the same pair, with
   `npm run test:mutations` as the bare form. `scripts/run_mutation_witness_tests.mjs`
   lines 16–22 already print exactly that pairing in its own header comment —
   mirror it. **Read that file; do not edit it** (scope fence).

5. **A guard pairing the mutation-tier paragraph against the table.** Fold this
   into the module from item 3 or add a second one — your call, but **not** into
   `tests/test_mutation_witnesses.py` (fenced). It must go red if
   `apps/viewer/README.md`'s mutation-tier section again states a **count** of
   declared witnesses or of `[real]` witnesses. Note the trap the existing
   viewer pairing already recorded (`apps/viewer/tests.js` ~line 9578): pin the
   **noun** as well as the digit, because a scan for "some number" would pass a
   count printed under a string claim. `scripts/mutation_witnesses.json` is
   tracked, so this guard needs no `data/` and no skip. Include its negative
   control.

6. **`apps/viewer/README.md`'s "inconsistency" premise does not reproduce —
   decide which side is wrong BEFORE you edit either.** At
   `apps/viewer/README.md` **lines 630–634**, under "Studies":

   > And the report was about **inconsistency** as much as about hiding: two of
   > `pitch_link_to_pitch_plate`'s studies dropped rows while the third's chain
   > covered nearly everything, so the same control read as three different
   > behaviours.

   The issue reports this as **not a state the pre-change page could be in**,
   measured on the pre-change tree (`integration` @ `2dbd3d7`, extracted with
   `git archive` and probed through the fast `[real]` tier). Its measurement:
   in **chain mode** (what a nav click gave) **all three** studies dropped rows
   — 8 → 5, 8 → 4, 8 → 2 — and nothing faded at all; in **topology mode** (what
   a `?study=` deep link gave) **no** study dropped a row, all three faded, and
   `thread_region_t` faded 6 of 8. Either way `thread_region_t` is the
   *smallest* chain (2 of 8 edges), not the one that "covered nearly
   everything", and no reachable state had two studies dropping rows and a
   third not.

   **This is explicitly not a "correct the README" instruction.** The premise
   of the issue is that the README's stated inconsistency **does not
   reproduce** — which means the defect could be in the README *or* in the
   behaviour the README describes. **Determine which before editing either.**
   Re-derive the counts yourself against the current tree (the fast `[real]`
   tier and the live projection at
   `C:\workspace\tolstack\data\projections\viewer\topologies.json`) and record
   in the lesson what you measured and on which tree. Do not assume the
   README is the wrong half because it is the cheaper half to change.

   If the README is the wrong half: **keep Jeff's verbatim quote and the
   decision** — the quote alone carries it — and drop or hedge the causal
   reconstruction. The issue's own suggestion is *"the report also read the
   three studies as behaving differently from one another"*, asserting nothing
   about which covered what. If a measured version is wanted, the honest one is
   in the issue: under the old nav click every study dropped rows and none
   dimmed anything, so the page gave **no signal at all** about what a study
   excluded — a stronger argument for the change than the sentence there now.
   This passage is prose beside a user quote, not a number, so its pairing is
   the weaker kind: at minimum, guard that the paragraph does **not** assert a
   per-study row-drop or coverage claim naming `pitch_link_to_pitch_plate`'s
   studies. If you conclude a stronger pairing is not worth its cost here, say
   so in the lesson with the reasoning — that is an acceptable outcome for this
   item and only this item.

## Definition of done

- `ARCHITECTURE.md`, `docs/ANNOTATION_SURFACE.md` and the three named
  `apps/viewer/README.md` passages each state a fact **re-derived in this
  session** from the tree, with the re-derivation recorded in the lesson
  (route counts off `provenance.json`, witness counts off
  `scripts/mutation_witnesses.json`, study counts off the `[real]` tier).
- Every correction is **paired**: each of items 1/2, 4 and 6 has a guard that
  fails when the doc drifts back, and every new scan carries a **negative
  control** asserting the scan itself can go red. No item ships with (a) and
  without (b) — except item 6, where a reasoned "no stronger pairing" is
  allowed if it is argued in the lesson.
- `venv-win/Scripts/python.exe -m pytest -q` green from the main checkout,
  **≥ 1155 passed** (1155 was the 2026-09-16 batch-merge measurement; your new
  guards add to it). Report the exact number.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` still
  **407/407, 0 skipped** — you changed no viewer code, so any movement here is
  a finding, not a pass.
- Demonstrate each new guard **bites**: hand-revert one corrected sentence in a
  scratch copy (or via the negative control), show the guard red, restore.
  Record the red output in the lesson.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_doc_facts_and_projection_stamps.md`):
  the verdict on item 6 (README wrong, or behaviour wrong) **and the evidence
  that decided it**; every number you re-derived and how; which guard shape you
  copied for each pairing and where a shape did not transfer; and whether the
  `apps/viewer/README.md` scope seam with `mutation_witness_tier_reaches_its_checks`
  actually conflicted at merge.
