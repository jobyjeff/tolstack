---
type: review
handoff: docs/sessions/active/HANDOFF_20260831_dag_topology_format.md
reviewer: review agent (dispatch), branch review/dag_topology_format
date: 2026-09-01
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-01 — dag_topology_format

The tolerance-topology archetype: `tolerance_stack/topology.py` (1130 lines),
`docs/topologies/` (2 topologies + 5 studies), `docs/DAG_TOPOLOGY.md`,
`tests/test_topology.py`, `ARCHITECTURE.md`/`README.md` rows, a lesson, and two
filed issues. **APPROVE, 0 blockers.** Six findings, all fixed inline on the
review branch and listed below with what changed.

This is the strongest handoff this repo has produced. Every claim I re-derived
held except six, of which two are real count errors and one is a real error-class
gap; the rest are missing pairings for facts that are currently correct.

---

## Scope note: this is not a tolerance stack

Checks 1–7 of the overlay are written for a stack. This handoff authored no
stack, edited none (`git diff --stat` shows nothing under
`docs/tolerance_stacks/`), and does not touch the SOP or the viewer — the fences
its handoff set. Every check is still addressed below, because "not mentioned" is
not "checked"; where a check has no stack to apply to, the *analogous* obligation
on the topology documents is what I audited.

## The mandatory checks

### 1. Every value traces to a specification, drawing callout, or an honest gap — **PASS**

Two authoring modes, audited separately.

**L1 (`topology_vpa_output_to_pitch_plate.json`) copies no value at all.** Every
one of its six valued edges is a `dimension_ref` into
`docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json`, resolved at load.
I confirmed by loading both and comparing `source_ref` objects: identical, `role`
included. It adds no citation, no confidence, no `source_ref` on any node, and no
transform. There is nothing here for check 1 to catch, by construction — and
`test_the_l1_topology_copies_no_value` is what keeps it that way, which matters
more than today's state (see check "guards observed failing").

**L2 (`topology_pitch_system.json`): 0 traced / 0 inferred / 23 untraced, out of
23 edge-value instances** — 15 `kind: "workbook"` and 8 `kind: "assumed"`. I
re-derived that from the loaded document, not from the prose. It is the honest
answer: the only source is `260825_End_Stop_JC.xlsx`, which
`WORKSHEET_end_stop_graft.md` measured at **0 traced / 0 inferred / 43 untraced,
out of 43** — and the document's own "0 of 43" quote matches that worksheet's
line 311 exactly.

**I re-transcribed every workbook citation against the workbook itself**
(`tests/debug_dump_tol_stack_xlsx.py` over
`C:\workspace\tolstack\data\inbox\tolerance_stacks\260825_End_Stop_JC.xlsx`,
main checkout). All fifteen cell references and every quoted row comment are
exact:

| edge | cell | sheet value | document's band | row comment quoted |
|---|---|---|---|---|
| `hub_lower_to_top_bearing_flange` | B43 | 0.2 | ±0.10 | — |
| `hub_top_flange_to_top_deck` | B44 | 0.1 | ±0.05 | — |
| `hub_top_deck_to_tan_link_mount_seat` | B45 | 0.1 | ±0.05 | — |
| `hub_blade_root_seat_position` | B17 | 0.12 | ±0.06 | "diameter MMC" ✓ |
| `end_stop_clearance` | B39 | 0.1 | ±0.05 | "tol +/-0.05" ✓ |
| `piston_length` | B38 | 0.2 | ±0.10 | "2 decimals => +/-0.1" ✓ |
| `pitch_plate_flange_to_link_hole` | B37 | 0.2 | ±0.10 | — |
| `pitch_plate_flange_to_gas_spring_bushing` | B62 | 0.2 | ±0.10 | in the sheet's TANGENTIAL section (row 47 onward) ✓ |
| `pitch_link_length` | B31 | 0.06 | ±0.03 | — |
| `pitch_arm_link_hole_to_clocking_hole` | B26 | 0.03 | ±0.015 | "need to correct- based on undersized hole for match drilling" ✓ |
| `blade_root_clocking_to_hub_seat` | B19 | 0.05 | ±0.025 | "essentially behaves as diameter position" ✓ |
| `blade_root_clocking_to_ring_gear_mesh` | B64 | 0.12 | ±0.06 | "blade roots =0.12, ring gear needs positional tolerace" ✓ |
| `gas_spring_body_height` | B41 | 0.2 | ±0.10 | — |
| `gas_spring_mount_position` | B61 | 0.2 | ±0.10 | — |
| `tan_link_mount_height` | B42 | 0.2 | ±0.10 | — |

The four transform ratios likewise: **D10 = 1.67, F10 = 1.25** (both `deg/mm`,
row label "pitch motion ratio (vertical to angle) from CAD", H10 comment "full
sweep average"), **B11 = `=50/32` → 1.5625** with H11 "uses ratio of pitch arm to
blade root radius", **D11 = `=D10*$B11` → 2.609375**, **F11 = `=F10*$B11` →
1.953125**. The `properties` geometry (pitch arm radius 50 = B7, blade root
radius 32 = B8, pitch link 109.4 = K3 at 77° = K2/B9, gas-spring bushing
separation 34.7 = B66, pitch-link radius 83.1 = B67) is all present and correct,
and the "largest single angular contributor (0.72 deg)" claim on
`gas_spring_body_height` is right: D68 = 0.71988 is the largest value in the D
column, and row 68 really does sit outside `D72 = SUM(D17:D64)`.

**No invented number found.** Every `assumed` band says `PLACEHOLDER` in its note
and says why no source exists, enforced by
`test_every_placeholder_in_the_pitch_system_says_so`, which I observed failing
(below). The 8 `assumed` bands are all round stand-ins (0.10 / 0.20 mm) mirroring
a neighbouring row — visible as stand-ins rather than plausible as measurements,
which is the right choice.

One gap closed inline: the four **transform ratios** were correctly cited but the
citation guard only walked edges. See finding S3.

### 2. Signs on every path term — **PASS, and structurally improved**

**No sign is authored anywhere in either topology or any study.** They are
derived from edge orientation and the direction the walk crosses each edge
(`Edge.sign_from`). I verified the L1 chain by hand against the physical joint:
starting at `bushing_far_face`, the five clamped members are each crossed against
their authored (head-side-first) orientation and enter at −1; `fastener_grip` is
crossed with its orientation at +1. Total = grip − clamped stack = shank out,
which is exactly the term list of the stack's own `worst_case_shank_out`
(`{element: fastener_grip}`, `{path: total, sign: -1}`).

`Transform.ratio` is refused unless finite and `> 0`, for the same reason
`Term.coefficient` is — direction has one home. Verified the constructor rejects
`-1.67`, `0.0`, `nan`, `inf`.

### 2b. Coherent material corners — **N/A**

No transcription of a spreadsheet's own worst-case column. L2 reproduces no
workbook total and says so in three places, correctly: the diameter-MMC weighting
(`B16/(B16-B15)`) that the sheet applies to rows 17/19/20/21 is a per-term weight
v0 cannot express, and the affected edges say so in their own notes rather than
claiming equivalence.

### 3. LMC/MMC direction — **N/A, and the field is carried without being read**

`Dimension` keeps `lmc`/`mmc` as transcribed (L1 inherits whatever the stack
element carries; L2 authors none). Nothing in `topology.py` reads them.
`test_dimension_exposes_every_attribute_fold_reads` parses `fold`'s own source
and confirms it touches exactly `nominal`, `min`, `max`, `mid`, `half_range` — so
the "`fold()` must never read `lmc`/`mmc`" invariant is now checked by a reader
rather than asserted by a sentence. I re-ran that extraction myself; it is not
vacuous.

### 4. RSS actually computed — **PASS**

`summarize()` returns one `Interval` from the one `fold()`: nominal, worst-case
min/max/half, RSS centre/half/min/max, all populated. No verdict is computed
anywhere in this archetype, so there is no verdict reading RSS. Independently
re-derived the L1 study and got, field for field:

```
nominal -0.08239999999999958   wc_min -0.6366000000000014   wc_max 0.6531999999999982
rss_center 0.008299999999999752  rss_half 0.323881166479312
```

— bit-identical to `stack.check("worst_case_shank_out").interval`. That is the
handoff's headline claim and it holds without a tolerance.

### 5. Nominal inside its own min/max — **PASS**

`Dimension.__post_init__` refuses `min > max`. Every L2 dimension is
variation-only: `nominal == 0.0` and `min == -max`, pinned by
`test_the_pitch_system_dimensions_are_variation_only` and explained in
`provenance.variation_only`. No nominal was computed as a midpoint anywhere; the
known nominal geometry (109.4 mm, 50/32 mm radii, 34.7/83.1 mm) is in
`properties`, deliberately not in a band. L1's nominals are the referenced
stack's, untouched.

### 6. Quantised constraints where cotter/castellation hardware appears — **PASS**

The L1 joint is retained by MS9363-10 + MS24665-229. `topology_vpa_output_to_pitch_plate.json`'s
`notes[2]` states plainly that grip length alone cannot answer this joint and
that the binding constraint is castellation-slot vs cotter-hole alignment, which
neither the stack nor the topology models — and it is *load-bearing structure*
here, not a footnote: `bushing_far_face` is a `datum_feature` rather than a mate
precisely because the nut is deliberately outside the graph, and the node's own
note says so. Per the overlay's "a prior review's PASS is a claim" item I opened
the file at the location rather than grepping: the caveat sits in the document's
`notes`, which is the only prose surface a topology document has, and the study
that computes the residual carries `closes: shank_out` with no verdict of any
kind. Nothing here presents a grip verdict as the answer.

The analogous caveat for L2 is present too and stronger: "Its values are
placeholders and its structure is the deliverable… Do not quote a number out of
it", stated in `docs/DAG_TOPOLOGY.md` beside the example, in the topology's own
`notes[0]`, and in the worst-case study's `provenance.not_a_result`.

### 7. The traced / inferred / untraced ratio — **stated, re-derived**

> **L2 (`topology_pitch_system`): 0 traced / 0 inferred / 23 untraced, out of 23
> edge-value instances** — 15 workbook cells, 8 `assumed`.
>
> **L1 (`topology_vpa_output_to_pitch_plate`): 1 traced / 2 inferred / 3
> untraced, out of 6** — and **not a new measurement**: every one is the
> referenced stack element's own label, resolved at load. Counting these into the
> repo's ratio would double-count six element instances that are already in it.
>
> **Non-edge values, counted separately** (the overlay's demand): **0 of 4
> transform ratios** are traced — D10, F10, D11, F11, all `untraced`
> `kind: "workbook"` with PLACEHOLDER notes. Every degree either blade-angle
> study reports is scaled by one of them.

The repo's own headline is **unchanged** by this handoff, as it must be — no
stack element moved. Re-derived with `tests/debug_report_tolerance_stacks.py
--ratio` on the merged tree: *5 of 26 element instances across the three seeded
stacks are `traced`; 3 are `inferred` and 18 are `untraced`* (all stacks: 30
traced / 9 inferred / 20 untraced, out of 59).

Every `untraced` L2 value is a declared gap by construction — the document is
100% untraced and says so — and the ranked open questions are in the lesson's
§7 and in the two documents' own notes.

---

## Also verify

- **Tests, re-run by me.** `venv-win/Scripts/python.exe -m pytest -q` in the
  **review worktree**: **525 passed, 1 skipped** on the merged tree with my
  inline fixes (512 + 1 before my 13 added tests). The skip is
  `test_viewer_js_suite.py` — the node-fs tier, absent `data/` in a worktree.
  The JS suite run against the main checkout so that tier *does* run:
  **142/142 passed**, `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`.
  Under the integration-branch model the main checkout stays on `master`, so a
  main-checkout pytest run cannot see this tree; the JS `[real]` tier is the only
  data-dependent coverage in the suite and it is reported above with the tier
  confirmed running.
- **One intermittent red, pre-existing and already filed.**
  `tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed` failed
  2 of 6 full-suite runs and 1 of 8 isolated runs during this review. I
  reproduced it independently before reading the author's issue; it is
  `ISSUE_20260901_dc_snapshot_removed_entry_test_is_flaky_on_directory_mtime.md`,
  correctly filed rather than fixed, and correctly diagnosed (a directory-mtime
  assertion racing NTFS granularity). Three consecutive clean full-suite runs
  followed. Not this handoff's, not a blocker.
- **Guards observed failing — every new one, on a scratch mutation.** The
  deliverable here *is* largely a set of checks, so none was accepted on green:
  flipping one L1 edge's orientation reddens the value proof and the sign test;
  inlining a dimension reddens `test_the_l1_topology_copies_no_value`; removing
  `PLACEHOLDER` from an `assumed` note, and separately upgrading one confidence
  to `inferred`, each redden `test_every_placeholder_in_the_pitch_system_says_so`
  (the second only after the first is repaired — they are two assertions in one
  test); giving one edge a real nominal reddens the variation-only test; widening
  the doc's transform vocabulary by one word reddens both the pairing and its
  can-fail replay; deleting `topology.py`'s `ARCHITECTURE.md` row reddens
  `test_the_block_inventories_every_module_in_the_directories_it_lists`. All four
  guards I added were mutation-tested the same way (below).
- **No test pollution.** `git status` clean after every suite run;
  `_write_and_load` mutates through `tempfile`, never the repo; nothing writes to
  `data/`; no stray `workspace<repo>data`-shaped directory in cwd.
- **`ARCHITECTURE.md` and `README.md` inventories updated** — the recurring
  "new file in `tolerance_stack/`, unchanged inventory" trap was avoided, and
  `tests/test_architecture_inventory.py` covers it (verified by deleting the row).
  Both new schemas are in `README.md`'s schema table.
- **`data/inbox/specs/` untouched** (56 files in the main checkout, no diff, no
  rename). **`docs/reference/` untouched. `PROVENANCE.md` untouched** — nothing
  imported changed, so no row was owed.
- **drawing-checker is unwritten.** No SOP Step 0/8 snapshot was taken, and none
  was owed: this handoff authored no stack and opened no drawing (every L1
  citation is by reference; every L2 citation is a workbook cell or `assumed`).
  I checked the repo directly instead: drawing-checker's newest run is
  `20260831_231231_555786-001…BIRD_STRIKE` and its newest inbox drawing is dated
  2026-08-31 22:54 local — **both predate the session's first commit** (7f7dc99,
  2026-09-01 01:47), the run carries `"purpose": "eager"`, and neither concerns
  any part in this handoff. Not attributable to it.
- **Sibling landings.** `git log --oneline integration..master` is empty; nothing
  landed on trunk while this was in flight, so no cross-handoff contradiction to
  resolve.
- **Hygiene.** No harness fragment (`</invoke>`, `</content>`, `<parameter`) in
  any created file — `tail`-checked each and grepped the diff. No `{{`
  placeholders. No NUL bytes; `git ls-files --eol` reports `i/lf` on every new
  file. `git diff -w --stat` matches the plain stat, so nothing is hiding in a
  reformat.
- **Vocabulary drift.** `SOURCE_REF_KINDS` already contains `assumed`, so the L2
  documents needed no vocabulary change and none was made — the SOP fence held.
  `NODE_KINDS`/`EDGE_KINDS`/`TRANSFORM_KINDS` are each the definition, paired
  word-for-word and in order against `docs/DAG_TOPOLOGY.md`, with a can-fail
  replay. `role` stays `ELEMENT_ROLES`, validated against the same tuple.
- **`CLAUDE.md`.** The handoff's cheap add-on collided with this repo's
  documented ignore rule (README + this overlay + `_HISTORICAL_NAMES`). The
  author filled the file in the **main checkout** — the right place for a
  gitignored file — mirrored every durable fact into `README.md`,
  `ARCHITECTURE.md`, the SOP or `docs/DAG_TOPOLOGY.md`, and filed the policy
  conflict as
  `ISSUE_20260901_tolstack_claude_md_is_gitignored_while_sibling_repos_track_theirs.md`
  (`audience: strategy`). I verified the frontmatter on both filed issues against
  the contract: `type`/`priority`/`status`/`area`/`reporter` all spelled from the
  closed sets. This is exactly the right handling of a scope collision.
- **The not-a-solver fence is executable, not just written.** Branch ambiguity,
  broken chain (both shapes), cycle, unit mismatch and the derived-gap refusal
  are each exercised against the **real** pitch-system graph rather than a
  synthetic fixture, and each message names the node and the candidates. The
  brief's locked decision 2 ("write this into the repo docs") is pinned by a
  phrase scan on `docs/DAG_TOPOLOGY.md`.

---

## Findings

All six were fixed inline on `review/dag_topology_format`; none is a blocker.

### Should-fix

**S1 — `docs/DAG_TOPOLOGY.md:279`, `topology_pitch_system.json` `notes[0]`,
`study_pitch_system_gas_spring_branch.json` `provenance`: "three grounded loops"
where the graph closes four.** The pitch system's cycle rank is
`23 edges − 20 nodes + 1 component = 4`. The fourth is the **hydraulic-brake**
path (`pitch_plate_flange_to_brake_attachment` → `hydraulic_brake_body_height` →
`hub_top_deck_to_brake_mount`), which the same document models as a real branch
and counts in the same sentence's "four branch points". Five figures in that
sentence were right, which is how the sixth survived.
*Fixed:* all three sites now say 4 and name the brake; the gas-spring study's
ordinal ("the second of the three") is gone.

**S2 — `docs/DAG_TOPOLOGY.md:266`: the L1 topology has 7 interfaces, not 6.**
Six is the clamped stack's face count; the seventh is `shank_full_dia_end`.
*Fixed:* the L1 sentence is now a full derived inventory (6 parts, 7 interfaces,
7 edges, 0 branch points, 1 grounded loop, 1 gap edge), with the six-face reading
kept as the prose that follows it. The L1 document's own
`provenance.structure` ("as six interfaces") was reworded to "a chain of six
clamped-stack faces", which is what it meant.

**S2b — `topology_pitch_system.json`, part `hub` note: "three of this
topology's four branch points sit on it"; two do** (`hub_lower_bearing_flange`,
`hub_top_deck` — the other two are on the pitch plate connection and the
blade-root clocking interface). *Fixed inline.* Note that this one is a **subset**
claim and the guard added for S1/S2 deliberately cannot see it; recorded as such
in the overlay.

**S3 — nothing required a `Transform` to cite its ratio.**
`test_every_value_in_a_topology_carries_a_source_ref` walks edges. A
`Transform.ratio` multiplies every edge that carries it, so an uncited one
launders further than an uncited band. All four in the tree were already correct
(`untraced`, `kind: "workbook"`, `PLACEHOLDER` in the note); nothing held them
there. *Fixed:* `test_every_declared_transform_cites_where_its_ratio_came_from`,
observed failing when a `source_ref` is removed.

**S4 — a study naming an id its topology lacks escaped `StudyError`.** The three
id lookups a study document drives — an edge in `selection`, the edge in
`closes`, a transform in the `transforms` map — went through
`Topology.edge()`/`transform()` and raised a bare `KeyError` naming only the
topology. So the single likeliest authoring slip, a typo'd edge id, was the one
error that did **not** arrive as the class `topology.py` documents and the
`dag_viewer_poc` handoff is told to catch and render. *Fixed:* `_edge_named_by`
re-raises as `StudyError`, naming the study and which field held the bad id; the
transforms-map lookup does the same. Pinned by
`test_a_study_naming_an_id_its_topology_lacks_raises_a_study_error`.

**S5 — `Contribution.nominal`/`min`/`max` re-implement `fold()`'s per-term
convention with nothing pairing them.** They are a display, not a second
combiner — no two element values meet, so "Where computation may live" is
satisfied — but they hand-copy the rule (positive weight takes `max` to the
maximum, negative takes `min`), and a grid row is exactly what a reader checks a
total against. Change `fold` and every row keeps rendering the old rule beside a
moved total, silently. *Fixed:*
`test_a_contributions_own_numbers_sum_to_the_fold_it_lands_in`, over every
committed study, plus an assertion that each projected row carries its weight
(the "a term rendered without its coefficient is a wrong term list" rule).
Observed failing when `Contribution.min` is made unconditional.

### Nit

**N1 — `study_pitch_system_blade_angle_worst.json`,
`provenance.the_transform_demonstration`: "which is exactly what the source sheet
does column by column."** True of the **six** of its nine mapped edges the sheet
has a linear row for (B43, B44, B39, B38, B37, B31 → D-column, each × D10). Three
carry `assumed` bands: two have no row at all, and the third —
`blade_root_clocking_to_oml` — corresponds to row 22, which states **0.181 deg
directly and multiplies by nothing**. Applying D10 to that edge's stand-in
millimetre band is the study's own construction. The edge's source note already
says the band is a stand-in; the study's sentence overclaimed the method.
*Fixed:* the sentence now enumerates the six, the two, and the exception.

### Process note (not a finding against the work)

`integration` already carried
`a1f7db7 Merge branch 'handoff/dag_topology_format' into integration`, authored
2026-09-01 02:24 — i.e. the handoff was merged into the integration branch
**before** this review branch was cut from it, which is why
`git diff integration...handoff/dag_topology_format` is empty. No harm done here
(the verdict is APPROVE and the tree is green), but a REQUEST CHANGES verdict
would have had nothing to withhold. Worth knowing at the dispatch level; not
filed as a tolstack issue because it is not this repo's behaviour.

---

## What I changed on the review branch

```
docs/DAG_TOPOLOGY.md                                   S1, S2 (derived inventories)
docs/prompts/REVIEW_AGENT.md                           overlay: 2 recurring + 4 architectural entries
docs/topologies/topology_pitch_system.json             S1, S2b
docs/topologies/topology_vpa_output_to_pitch_plate.json S2
docs/topologies/study_pitch_system_gas_spring_branch.json S1
docs/topologies/study_pitch_system_blade_angle_worst.json N1
tolerance_stack/topology.py                            S4 (_edge_named_by)
tests/test_topology.py                                 S1/S2, S3, S4, S5  (+13 tests)
```

## For the next reviewer

- **`dag_viewer_poc` is staged against this.** Two things it inherits that are
  worth checking when it lands: it must catch `StudyError` (S4 made that
  sufficient — before it, a typo'd edge id escaped it), and it must not recompute
  anything, because `Contribution.as_dict()`/`StudyResult.as_dict()` already
  carry the signed, scaled per-row numbers and S5 now pins them to the fold.
- **The structural-count guard has a stated blind spot.** It only reads a
  sentence that counts two or more different labels; a one-label sentence is
  treated as a subset claim, because reading those produced a false positive on
  its first run (`"modelled here as two parts"`). S2b is the kind of miss that
  leaves — recount subset claims by hand.
- **The three "what v0 cannot do" items are real and belong to strategy**, not to
  a bug fix: a weight computed from `properties`, a contributor that is not a
  chain edge (the gas-spring bushing tipping backlash, the source's own largest
  angular term), and a load-case label. The lesson's §7 ranks the open questions
  for Jeff; item 1 (which operating condition D10 = 1.67 belongs to) blocks every
  real number this archetype can produce and is still the open F1 from
  `endstop_graft_workorder`.
