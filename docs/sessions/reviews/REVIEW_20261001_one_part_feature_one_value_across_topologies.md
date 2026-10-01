---
type: review
handoff: docs/sessions/active/HANDOFF_20261001_one_part_feature_one_value_across_topologies.md
reviewer: agent
date: 2026-10-01
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-01 — one_part_feature_one_value_across_topologies

**APPROVE.** Every deliverable landed, the guard was observed failing on the
pre-fix tree and passing after, and the central provenance claim — the one this
whole handoff turns on — was re-derived independently at review, out of both
source workbooks, and holds to the digit. Three inline fixes, one new issue,
three overlay entries. No blockers.

This was a **provenance audit of a correction**, not of a stack: the question
was not "is the arithmetic right" but "is 105.9908 the number, and did anyone
actually open the document that says so". The answer is yes on both counts, and
the evidence is stronger than the handoff knew.

---

## What I verified, and how

### The number, re-derived from the cited cells

Not taken on the lesson's word. Read out of
`C:\workspace\atp-post\docs\references\250530_pitch_motion_ratios.xlsx`, sheet
`250530 pitch sweep`, with a standard-library `zipfile` + `ElementTree` walk:

| claim in the edge note | re-derived at review |
|---|---|
| `C83:E83 = (83.000, -44.550, -22.700)` | `[83.0, -44.55, -22.7]` ✓ |
| `G83:I83 = (84.972, -17.139, 79.666)` | `[84.972, -17.139, 79.666]` ✓ |
| `\|A − P\| = 105.99079988848088` | `105.99079988848088` ✓ (every digit) |
| constant over 80 rows, 105.9896–105.9915, spread 0.0019 | 80 rows, min `105.9896021032252`, max `105.99149162550738`, spread `0.00188952…` ✓ |

### …and the loser, which turns out to be weaker than the issue says

Read out of `data/inbox/tolerance_stacks/260825_End_Stop_JC.xlsx`, sheet
`End Stop Tol Stack`: `K2 = 77`, `K3 = 109.4`, `K6 = 109.4`, `B31 = 0.06`
("pitch link length tolerance") — all four exactly as cited, and the band
correctly left untouched at 0.06.

**The new fact:** `WORKSHEET_end_stop_graft.md` records `K6` as a *"Pythagorean
sanity check — passes"*, which reads to a reviewer as corroboration of 109.4.
It is not. Reading the **formulas** rather than the values:

- `K3` — hand-typed constant, **no formula**;
- `K4 = K3*COS(RADIANS(K2))`, `K5 = K3*SIN(RADIANS(K2))`;
- `K6 = SUMSQ(K4,K5)^0.5`.

`K6` re-derives `K3` from two cells computed out of `K3`. It passes for any
`K3` whatsoever. So `260825_End_Stop_JC.xlsx` makes exactly **one** independent
statement of 109.4 — a single typed cell — against two independent
measurements agreeing on 105.9908 to 0.000231 mm. The correction is on firmer
ground than the handoff argued for it. Recorded as a dated note on the
handoff's own issue, and as an overlay entry.

### The guard, observed failing

Per the universal check, not accepted on the strength of green. The new test
file was checked out onto the **pre-work** tree (integration, `3e54796`) with
the data untouched:

```
AssertionError: one part+feature stated at two different nominals:
    pitch_link / pitch_link_length:
      pitch_system properties.nominal_length_mm = 109.4
      vpa_pitch_linkage dimension.nominal = 105.9908
1 failed, 2 passed, 162 deselected
```

Reproduces the lesson's quoted red exactly. Green on the merged tree. The
pairing is keyed on **part + edge id** and reads both value locations; the
non-vacuity guard beside it asserts the `properties` half is reached and that
the pair which broke is still the pair being compared, which is the part a
`dimension`-only reader would have left open.

### "Nothing committed moved" — reproduced independently

The strongest claim in the lesson and the one the HITL item hangs on. I wrote
my own before/after comparison (load every `study_*.json`, `summarize` +
`check_study`, compare numeric and boolean leaves) and got the author's figures
back exactly:

- **1004 numeric/boolean leaves compared, 5 moved** — all five
  `result.chain[7].edge.properties.nominal_length_mm`, the corrected input
  echoed into the chain. No total, band, `nominal` sum or check verdict moved.
- The claim that **no code reads `properties`** holds where it matters most:
  `VA.edgeCard` (`apps/viewer/topology.js:2805`) exposes `edge.dimension.source_ref`
  and neither `edge.note`, `dimension.note` nor `edge.properties`. That is also
  what justifies the author's documented deviation (below).

### Other lesson claims, re-derived

| claim | verdict |
|---|---|
| S1's widening was already done by `64f6da9`, 2026-09-30 | ✓ — that commit adds `ALL_TOPOLOGY_FILES`, `test_a_topology_edges_workbook_only_value_is_untraced_too`, `test_the_topology_workbook_scan_is_not_vacuous` |
| exactly two `(part, edge id)` keys recur in the corpus | ✓ — `pitch_link/pitch_link_length` and `tan_link_mount_215175_002/tan_link_mount_height`; the latter has nothing comparable |
| `shank_out` appears in three topologies and is correctly outside the pairing | ✓ — three part-less `kind: "gap"` edges |
| zero existing mutation specs anchor in this branch's files | ✓ — 127 spec files, 138 mutations, 0 hits |
| `SHADOWED` omits every document the claims-corpus guards read | ✓ — read out of `run_mutation_witness_tests.mjs:137` |
| `python_not_censused`, so no pin moved | ✓ — `CENSUS_LIMITS`, `guard_enumeration.mjs:177` |
| 5 studies name the edge in `selection` | ✓ — the 5 that moved a leaf |
| "all 22 committed studies" | ✗ — **21**, corrected inline |
| "prints all 128 entries" | ✗ — **138**, corrected inline |

---

## Findings

### Blockers — none.

### Should-fix — one, filed

**`EDGE_NOMINAL_PROPERTY_KEYS` is a hand-written tuple with nothing pairing it
to the corpus, and its stated exclusion reason does not hold for one key.**
`tests/test_tolerance_stack.py`. The corpus states eight numeric values in edge
`properties`; one is inside the pairing. A second document writing its nominal
under any other key (`length_mm`, `nominal_separation_mm`, …) reproduces
`ISSUE_20260930…` exactly and **nothing goes red** — the non-vacuity guard
stays satisfied by the pair that already exists. Separately, the constant's
stated reason ("not the edge's own end-to-end dimension") is right for three
keys and wrong for `nominal_stroke_mm`: edge `gas_spring_mechanical_stroke`
runs full-extension-stop → mount flange and is *named* "full extension to full
retraction", so `61.67` **is** that edge's own nominal, and its only sibling
property is in degrees, so including it would create no intra-edge pair. The
mechanism that really forces a short list is that two mm keys on one edge get
compared against each other — a different claim, excluding a different set.
Filed as
`ISSUE_20261001_the_topology_nominal_pairings_properties_key_list_is_hand_maintained_and_already_excludes_one_edges_own_nominal.md`
rather than fixed: it needs a new test to be trustworthy, which is outside the
reviewer's inline-fix boundary.

### Accepted deviations — two, both declared by the author

**1. The guard ships unenrolled.** `CLAUDE.md` says a guard is enrolled in the
same change. Verified at review that the obstacle is real and not an excuse:
`SHADOWED` omits `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`,
`docs/DAG_TOPOLOGY.md`, `docs/SOP_TOLERANCE_STACK.md`, `docs/prompts/` and
`docs/sessions/`, so `tests/test_tolerance_stack.py` is red in the shadow before
any mutation is applied and the harness refuses the entry; and
`scripts/run_mutation_witness_tests.mjs` is fenced out of this handoff
(`mutation_witness_shadow_is_per_run` owns it). The author withdrew the spec
rather than leave a `NOT WITNESSED` entry to exit non-zero at merge time, wrote
both mutations out verbatim in
`ISSUE_20261001_no_pytest_guard_in_the_two_largest_test_modules_can_be_enrolled…`,
and pointed the guard's own docstring at it. That is the right trade and the
right channel. Worth knowing what it costs: because `python_not_censused` means
no pin moves, an unenrolled **pytest** guard reddens nothing — the author's
honesty was the only thing standing between this and a silent gap. Added to the
overlay.

**2. The cross-reference went in `dimension.source_ref.note`, not `edge.note`.**
The handoff said "each document's edge note". Confirmed the author's reason:
`VA.edgeCard` renders `dimension.source_ref` through `VA.citationCard`, which
prints `source_ref.note`; `edge.note`, `dimension.note` and `edge.properties`
reach the projection and no surface. The vpa document's pre-existing
cross-reference was *moved* rather than copied, so the fact stays written once
and is now visible to a reader of the running app. Both documents read
standalone. Better than what was asked for.

### Inline fixes — three, all inside the boundary, none silent

1. **`docs/topologies/topology_pitch_system.json`** — a missing space joined two
   sentences (`…settle all three.Retraced 2026-09-06…`) in the corrected
   `pitch_link_length` citation note. One character, in the one note this
   handoff's deliverable 3 is about and the one that renders on the DAG edge
   card. Because that file is a projection input, the projections were rebuilt
   and both node tiers re-run after it (counts below).
2. **The lesson's two counts**, corrected in place with a dated reviewer block
   recording both and recording that the 1004/5 comparison was independently
   reproduced: "all 22 committed studies" → **21**, "prints all 128 entries" →
   **138**.
3. **`ISSUE_20261001_four_documents_outside_the_topologies…`** — a dated
   reviewer note: its table lists **five** documents, not four (all five
   re-greped and all five hold `109.4` at the lines named); and its "leave"
   disposition for `WORKSHEET_end_stop_graft.md` needs the stronger reason,
   because line 88 is a *gloss*, not a transcription, and the check it calls a
   sanity check is circular. The slug is left alone — the lesson already cites
   it.

### Nits

- The corrected `source_ref.note` is now **3449 characters**, the longest in the
  topology corpus by 2× (next: 2262, then 1674), and it renders in the DAG
  edge card. Every sentence in it earns its place and the handoff explicitly
  asked for a reader who remembers 109.4 to find the explanation at the edge —
  but this is the size at which a citation note becomes a document, and the
  surface has no affordance for one.
- The lesson's quoted red names `tests\test_tolerance_stack.py:2172`; the
  committed assertion is at **2190** (the docstring grew after the capture).
  Harmless — the message itself reproduces verbatim.
- `ISSUE_20261001_no_pytest_guard…` is a **142-character** filename, the longest
  in `docs/issues/` (next: 130). Still inside Windows' limit from a worktree,
  with ~30 characters of headroom; a longer worktree slug would not be.

---

## Test record

**Tactical record check (canonical cadence step 1):** the lesson records a full
suite at `effc7f7` — pytest `1 failed, 1440 passed`, viewer JS `522/522`,
browser TRUTH `25/25`, with the one failure identified as the documented
worktree red and the projections stamped and paired beforehand. It also states
**plainly that the mutation-witness tier was started and not finished**, and
what stands in its place. Consistent with the diff, no disarmed tiers, so the
benefit of the doubt applies and the full suite was not re-run pre-merge.

**Pre-merge risky subset** (overlay rows matched: Python under `tests/`;
topology data under `docs/topologies/`; a guard added; prose in a tracked
document; `PROVENANCE.md`):

| subset | result |
|---|---|
| `test_tolerance_stack` `test_topology` `test_topology_projection` `test_viewer_projection` `test_architecture_inventory` `test_provenance` `test_thermal_exception_list` `test_claims_registry` `test_mutation_witnesses` `test_ops_toml_serve_verb` | **524 passed** |

**Post-merge full suite**, at the final tip `104eb14`, in this review worktree
with `node_modules` junctioned in and the projections rebuilt from this tree
immediately beforehand (`results.json` and `topologies.json` @ `104eb140d5fa`;
`crops.json` @ `effc7f75677d`, whose inputs this branch does not touch, and
`projection_freshness.cjs` reports all three paired with this tree):

| tier | command | result |
|---|---|---|
| pytest | `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` | **1 failed, 1440 passed** |
| viewer JS incl. `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **522/522** |
| browser TRUTH | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **25/25** |
| mutation witnesses (anchors) | `pytest -q tests/test_mutation_witnesses.py` | green (inside the 524) |
| mutation witnesses (targeted) | `--only "fast__real-"` and `--only "annotate__real-ground-truth"` | **12/12 witnessed** |

The one pytest failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
— the deliberate worktree red `CLAUDE.md` documents (the wrapper invokes the
viewer suite without `--repo`, finds no `data/projections/` here, and refuses
to call a skip a pass). **That tier itself is the 522/522 row above**, run
through `--repo` against the checkout that owns `data/`. No other tier skipped,
and `data/` in the main checkout is untouched apart from the two projections I
deliberately rebuilt.

**What I did not run, and why.** The full mutation-witness tier
(138 entries, ~1.5 min/entry, most of it Chrome). `CLAUDE.md` puts it at the
batch merge for that reason, and this overlay separately asks the reviewer to
re-run it after the integration merge — a real tension, and this diff is the
easiest case in which to resolve it toward the cheap answer: the branch touches
**no** `apps/`, `scripts/` or `tolerance_stack/` code at all, and **zero** of
the 138 mutations anchor in any file it changes (re-derived at review, not
quoted). The only live coupling is through the topology data a `[real]` witness
could read, so I ran every `fast__real-*` entry plus the MS14101-3 pitch-link
bearing ground-truth witness — 12/12 — and both full `[real]` tiers are green
against a projection rebuilt from this exact tree. **The browser entries were
not replayed; the operator's batch merge is where that lands.**

**One flake, not a regression.** `[annotate rail filter + face deselect]` /
"a real click on the face tints it" failed on **two consecutive** full browser
runs before my inline fix, then passed **32/32** under
`--only "annotate rail filter"`, and the full tier went 25/25 after the
rebuild. Known and filed:
`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`
(`deferred` to 2026-10-29) — the `?mock=1` demo triangle is edge-on to its
framing camera. Overlay updated: the existing entry said "re-run it once and it
passes", and two in a row is a higher rate than that implies.

---

## Merge

`git merge-base --is-ancestor` reported **not merged** before I started, so the
merge was mine and my verification was not a no-op. `integration` had moved by
one commit (`a6b805c` → `3e54796`, the board move staging
`declare_candidate_test_inputs`) — **no conflict**, nothing to resolve, nothing
reportable about the resolution.

## Overlay

Three new entries, plus two sightings appended to existing ones:

- *A pairing guard's reach into a free-form bag is a hand-written key tuple.*
- *A workbook "check" cell that re-derives its own input* — read the formulas,
  not the values, and how to do it with no `openpyxl` anywhere in the workspace.
- *A guard whose author could not enroll it* — verify the obstacle, and know
  that an unenrolled pytest guard reddens nothing.
- Structural-count entry: **second sighting of one digit** — both of this
  repo's study-count errors have been "22" for a 21-study corpus
  (`REVIEW_20260915_respine_tween_fidelity` was the first).
- Annotate rail-filter flake: sightings three and four, and the rate correction.

## For the next reviewer

The handoff's third lesson question — *does any other part+feature pair
disagree across the corpus?* — is answered **no**, and I re-derived it. Do not
re-ask it; ask instead whether the pairing can still *see* a new divergence,
which is what the one filed issue is about. The corpus's recurring-key census
is two keys wide, so the guard's non-vacuity rests on a single pair: if
`pitch_link / pitch_link_length` ever stops being stated in two documents, that
guard's assertion is the one that tells you, and it should be read as a prompt
to widen rather than to delete.
