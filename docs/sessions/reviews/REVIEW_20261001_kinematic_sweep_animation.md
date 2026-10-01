---
type: review
handoff: docs/sessions/active/HANDOFF_20261001_kinematic_sweep_animation.md
reviewer: agent
date: 2026-10-01
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-01 — kinematic_sweep_animation

Sweep mode in `apps/annotate/`: a published `linkage-sweep/v1` run played back
as a stick figure with the STEP bodies anchored to the solver's rigid bodies,
playback controls, and the two alias rows Jeff's 2026-10-01 ruling unblocked.
49 files, +5279/−13, eight commits on `handoff/kinematic_sweep_animation`.

**Verdict: APPROVE.** No blockers. Every deliverable in the handoff is built
and every line of the definition of done is met and measured. Four should-fix
findings are filed as issues (below); two things were fixed inline and are
named. This is the strongest piece of work I have reviewed in this repo: the
pure/impure split holds, the refusals carry reasons, the honest states are
real states and not excuses, and the lesson's numbers survived re-derivation
to the digit.

## This is not a tolerance stack

The overlay's mandatory checks (§1–7: `source_ref` on every value, signs,
LMC/MMC, RSS, nominal inside min/max, quantised constraints, the traced
ratio) are written for a stack and do not apply — nothing here authors a
value. The one provenance-shaped artifact is
`docs/topologies/part_mesh_aliases.json`'s two new rows, and those are audited
as rows below. `docs/reference/` untouched; `data/inbox/specs/` untouched and
unreorganised; nothing written into drawing-checker; **nothing written into
`data/` at all** — sweep mode has no write path, and after the full
suite, the annotate tier, the mutation tier and two browser-check runs,
`find C:/workspace/tolstack/data -newermt "-70 minutes" -type f` returns
**zero** files, while this worktree's own `data/` still holds only its ten
tracked placeholders.

## What I verified, and how

**The merge.** `git merge handoff/kinematic_sweep_animation` into
`review/kinematic_sweep_animation` — **clean, no conflicts**. `integration`
had moved `103d8d0` → `3b95509` since the branch was cut (four commits plus
board/issue churn), and **none of it touches `apps/`** — which matters below,
because it means the author's own browser-tier run covers the merged app code
exactly.

**Pre-merge risky subset** (overlay "Choosing the risky subset"; rows matched:
`apps/annotate/`, a CSS rule, a guard + `scripts/mutation_witnesses/`, stack
or topology data under `docs/topologies/`, prose in a tracked document):

| what | result |
|---|---|
| `pytest -q` over 13 named modules (vocabulary ×2, feature identity, part-mesh aliases, mutation witnesses, type scale, claims registry, tolerance stack, provenance, thermal exception list, topology, topology projection, viewer projection) | **609 passed** |
| `node apps/annotate/run_tests.cjs` | **177/177 passed, zero SKIP lines** — the `[real]` tier resolved its main-checkout fallback and really ran |
| `node scripts/run_mutation_witness_tests.mjs --only "sweep" --repo C:/workspace/tolstack` | **17/17 declared mutations WITNESSED**; census `annotate 32 enrolled / 177 enrollable / 177 declared` |

The subset row for `apps/annotate/` named `tests/test_annotate_js_vocabulary.py`,
**which has never existed** — `pytest` exits on the missing path and runs
nothing, so that row has been costing reviewers their whole subset. Corrected
in the overlay on this branch.

**Post-merge full suite**, in this review worktree:
`venv-win/Scripts/python.exe -m pytest -q` → **1 failed, 1444 passed in
265 s**. The failure is the documented worktree-only one,
`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` (no
`data/projections/viewer/` here; a skipped tier is not a passed one). The
author recorded 1 failed / 1440 passed on their branch; `integration`'s
`tests/test_mutation_witness_shadow_concurrency.py` collects exactly 4 tests,
so the two counts agree.

**What the worktree could not exercise, named rather than totalled:**

- the viewer's node-fs `[real]` tier. `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack` → **428/429, 1 TIER SKIPPED** — the shared projection
  in the main checkout was not built from this tree, so it refuses rather than
  judging a stale one. Reproduces the author's number exactly. **Not a finding
  against this work**: rebuilding the shared projection from a branch while
  three other handoffs are live would make their `[real]` tiers compare against
  this branch, which is the already-filed
  `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`,
  and `ISSUE_20261001_main_checkout_projection_stamped_from_an_unlanded_review_branch_blocks_rebuild`
  says the rebuild is refused there anyway until the batch merge. It is an
  operator step at the batch merge, which is where `CLAUDE.md` puts it.
- the viewer browser TRUTH tier. It imports `playwright-core` by package name,
  which from a worktree resolves nowhere; the author ran it by junctioning the
  main checkout's `node_modules` in and out, and says in the lesson why a
  junction left behind is a hazard. **I did not re-create the junction.** The
  author's `25/25` stands on a tree whose `apps/` is identical to the merged
  one (see the merge note above), which is the strongest thing that can be said
  without re-arming it.

**The new browser check, run by me rather than taken on the report's word:**

- `node apps/annotate/run_browser_check.mjs` → **31/31 passed**, mock scene
  165.2 fps.
- `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p1-20261001-203656`
  → **38/38 passed**, and it **re-derived the whole occurrence table** — every
  residual in the lesson and the README reproduced to the digit
  (`pitch_plate` 0.0000, `blade_root` 0.7440, `pitch_arm` 0.0007, `pitch_link`
  0.0001, the two bearings 0.0001 / 0.0007, `gas_spring` refused at 42.574),
  `105.99051337042064` held to `8.99e-11` mm over 80 points, hinge moved
  `0.00e+0`, driver 64.466 → 0.000, **4.0 fps** with seven real meshes.

**The lesson audited** (canonical: a lesson's numbers are quoted forward and
checked by nothing). Every count in it re-derived: 157 → 177 census pin
(= +20 guards) ✓; 17 new spec files ✓ (`annotate__*.json` 15 → 32); 17/17
witnessed ✓; 3 unenrolled `[real]` guards = 20 − 17 ✓; 31 and 38 browser
checks ✓; 428/429 ✓; 165 fps and 4 fps ✓; 1 failed / 1440 passed ✓ against
1444 here. **One arithmetic error found, in the issue rather than the lesson**,
corrected inline — see "Fixed inline".

**Guards observed failing, not just green.** The 17 new pure guards are each
mutation-witnessed, and I read the mutations rather than the totals: they are
real inversions (composition order swapped, the acceptance radius dropped to
`if (false)`, the descending-driver test flipped, the nearer-point rule
broken), not cosmetic edits. The three new `[real]` guards are deliberately
unenrolled with the pin raised instead — the move `guard_enumeration.mjs`
explicitly allows and asks a reviewer to judge. **I judge it correct**: a
`[real]` guard over gitignored `data/inbox/linkage-sweeps/` would report
`NOT WITNESSED` on any checkout without the inbox, every pre-existing `[real]`
annotate guard is unenrolled for the same reason, and the author filed the
question against the tier rather than quietly absorbing it.

**Deliverable 0, audited as provenance.** Both new alias rows cite a drawing
number on both sides, a parts-list find, and the live `provenance.json` path;
I resolved both sha256s in the main checkout and both match
(`1a01fb1d…` → `product_name 213862-002`, five solids, instances `.2`–`.5`;
`1ed2bfd5…` → `216332-001_36`, 20 solids, instance `211587-001.3`). The
handoff asked for the shared-local-frame check to be **measured** before
trusting the substitution, and it was — the ball centres the row quotes are
the `105.991` the sweep's own readout then checks, which is a satisfying
closed loop. The 15-solid sibling is named in the row's evidence with the
reason it lost, as asked. `ISSUE_20260930_blade_1s_pitch_link_…`'s "Done when"
is genuinely met, including the half that needed writing
(`DAG_TOPOLOGY.md`'s new `Part` subsection — one file outside the handoff's
fence, and the author says so and why).

## Findings

### Should-fix — all four filed as issues before this APPROVE

1. **Sweep mode re-applies every anchored part's material state on every
   animation frame**, and with `layer ghost on` reallocates a `THREE.Mesh` and
   a `MeshStandardMaterial` per part per frame.
   `app.js::applySweepFrame` calls `scene.setGhost` (which sets
   `material.needsUpdate = true`) and `scene.setSweepGhost` (which disposes
   and rebuilds rather than keeping in step) from inputs that cannot change
   between frames — a stored preference and an as-modelled placement.
   `scene._setRepeats`, three functions above, takes the opposite approach and
   says why. Cost, not incorrectness, but 4 fps is the number Jeff will feel.
   → `ISSUE_20261001_sweep_mode_reapplies_every_anchored_parts_material_state_on_every_animation_frame.md`
2. **Reduced-motion playback advances one point per animation frame.**
   `tickSweep`'s reduced-motion arm computes the wall-clock
   `AA.sweepAdvance(...)` and then overwrites its index with
   `AA.sweepStepIndex(...)`, so reduced motion plays the sweep *faster* than
   the animation it replaces (1.3 s vs 3.3 s at 60 Hz), ignores the speed
   control entirely, and runs at the display's refresh rate. Both halves are
   pinned; their composition lives in `app.js`, which the fast runner cannot
   boot and the browser check does not emulate the media query for.
   → `ISSUE_20261001_reduced_motion_playback_advances_one_point_per_animation_frame_so_it_ignores_the_speed_control.md`
3. **The pitch-link assembly and the two bearings it already contains are both
   drawn.** Measured, not inferred: `asm217755_213862_002` is
   `product_is_assembly: true`, `n_leaf_descendants: 3` (the body plus two
   `MS14101-3`), and `spherical_bearing_pitch_link` places the same two
   bearings again at their own occurrences *under* `213862-002.1` — coincident
   by construction. Falls out of two correct decisions meeting; the `pitch_link`
   row's evidence does not answer the assembly-or-detail question
   `ISSUE_20260930_four_pitch_linkage_alias_rows…` asked it to answer.
   → `ISSUE_20261001_the_pitch_link_assembly_mesh_and_its_own_two_bearings_are_both_drawn_in_sweep_mode.md`
4. **Design, three rows, filed and waved through** per the canonical rule that
   a design finding never blocks: the readouts grid pairs label with value only
   when `auto-fit` resolves to an **even** column count (four at the
   screenshot's width, five one step wider, and then every label sits beside
   somebody else's number); `sweepSummaryParts` renders the producer's raw
   mechanism slug `vpa_pitch_chunk0_p1` at the reader where every other name
   goes through `AA.measureLabel`; and the global `keydown` transport excludes
   only `INPUT`/`SELECT`/`TEXTAREA`, so Space is claimed from the bar's own
   buttons and `<summary>` elements.
   → `ISSUE_20261001_design_three_things_on_the_sweep_bar_the_screenshots_happen_not_to_show.md`

### Second sighting, not re-filed

**`apps/annotate/README.md` states measured numbers nothing scans** —
`ISSUE_20260921_annotate_readme_measured_numbers_are_paired_by_nothing.md`
(open, `deferred`, `class:unpaired_hand_copy`). The new "What it measured"
section roughly triples that issue's population (~15 numbers), and states the
fallacy out loud: *"re-derived by the check itself — it prints them — rather
than read from here."* Printing is not asserting, and `run_browser_check.mjs`
is run by no gate at all. Appended to the existing issue as a dated second
sighting rather than re-filed, and the overlay now carries the entry.

### Nits

- `sweepFrameAt` lerps `axis_world` between points without renormalising, so a
  scrubbed frame's axis is slightly non-unit. It reaches only the tooltip's
  printed digits.
- `sweepCandidateOccurrences` keys its `seen`/`names` sets on bare `{}`
  objects, so an occurrence literally named `constructor` or `toString` would
  be mis-tested. Instance names are drawing numbers; noted for the next person
  who widens the shape.
- `sweepTrails` trails `point_a_world` only, so a distance link's far end has
  no path. Defensible — the handoff said "each joint's path" and a joint has
  one bead — but it is a choice the docs do not state.

## Fixed inline (nothing fixed silently)

1. **`CLAUDE.md` said a now-false thing.** Its "Where a feature is, in the
   assembly" bullet claimed `fit_bound_features.py` is "the **one place** a
   placement matrix is applied; the annotator applies none." Sweep mode is the
   second place, and the author correctly updated `ANNOTATION_SURFACE.md`
   ("Placement is applied in two places now") and left its sibling standing —
   the overlay's own "a mechanism fact corrected in one doc and left standing
   in its sibling" entry. Rewritten to the two-place statement with a pointer
   at `ANNOTATION_SURFACE.md`'s "Sweep mode". Stale prose, no behaviour,
   no test needed.
2. **Three mangled paths in the lesson.** `C:\workspace\tolstack` had been
   written through an unquoted heredoc, so `\t` became a literal tab and all
   three main-checkout commands in "The suites" read `C:\workspace<TAB>olstack`
   — uncopyable, and the lesson's own closing section warns about exactly this
   heredoc trap. Replaced with the forward-slash spelling.
3. **An arithmetic error in the author's own issue.**
   `ISSUE_20261001_four_sweep_mode_gaps…` row 1 read *"27 of 177 enrolled
   before this change, 32 of 177 after"*. Both terms are wrong: the pin was
   **157** before, and `annotate__*.json` held **15** specs, not 27 — 32 now,
   which is the +17 this handoff enrolled. Corrected with a dated blockquote,
   the established fix.
4. **`ISSUE_20260930_four_pitch_linkage_alias_rows_wait_on_rotorkits_extraction.md`
   was fully satisfied and nothing was going to close it.** All four rows now
   exist; the issue sat `status: open` describing a world where two are
   missing, with no back-link. Set `status: triaged` and added
   `handoff: …kinematic_sweep_animation.md`, so dispatch resolves it on
   Complete — the same mechanism its sibling `ISSUE_20260930_blade_1s_…`
   already uses for the same work — plus a dated note recording what the two
   rows actually point at.

Items 1–3 clear all three prongs (no designed behaviour changed, no test
wanted, a few lines). Item 4 is an issue-file disposition, which the canonical
puts in a reviewer's hands.

## Overlay updated

Three new **Recurring bugs** entries, and one correction:

- two pure helpers both pinned with their **composition in `app.js`** pinned by
  nothing — look for the arm that throws one of them away (finding 2);
- a **per-frame function re-applying state that cannot change per frame**, with
  a sibling in the same file doing it right (finding 1);
- `apps/annotate/README.md`'s measured table, **second sighting**, with "do not
  re-file, say Nth sighting" attached;
- the `apps/annotate/` risky-subset row corrected — it named a test file that
  has never existed, which makes `pytest` run **nothing**, and a reader's whole
  subset evaporate while the command looks like it worked.

## For the next reviewer

The handoff's "Left behind, all filed" section is accurate and the three issues
are real issues with real frontmatter — spot-check them anyway, because the
*contents* carried the one wrong number I found. `run_browser_check.mjs` is
worth running yourself on any future `apps/annotate/` diff: it is 31 checks that
need nothing but Chrome, it runs in about a minute, and it found three defects
the pure tier structurally could not see. It is run by no gate, which is row 4
of the author's own gaps issue.
