---
type: review
handoff: docs/sessions/active/HANDOFF_20260930_vpa_pitch_linkage_topology_and_feature_fits.md
reviewer: agent
date: 2026-09-30
verdict: APPROVE
blockers: 0
---

# Review — vpa_pitch_linkage_topology_and_feature_fits

> **Round 2 (2026-10-01): APPROVE, 0 blockers.** Both blockers fixed, all six
> should-fixes and all four nits addressed, and merged into `integration`.
> Round 1 is below unchanged, from "Round 1 — REQUEST CHANGES" on; the
> round-2 verification is the section directly under this note.

## Round 2 — APPROVE (2026-10-01)

The rework addressed both blockers, all six should-fixes and all four nits. On
the two blockers it went further than the findings asked, and in both cases the
extra distance is the part worth recording.

### B1 — fixed by removing the choice rather than repairing the key

I suggested stripping the suffix before counting. The author did something
better: **the expansion is no longer a placement source at all.** Every
placement now comes from the mesh's own sidecar, so mis-attribution is
impossible by construction rather than gated behind a count — and the expansion
is demoted to the *check* the sidecars could not perform alone (*is this
extraction's instance list the whole truth for its solid?*), matched by
**instance path**, which is the one key that crosses the suffix gap.
`product_mesh_counts()` and `PLACEMENT_SOURCES` are gone; I grepped and nothing
live still references them, and `tests/test_fit_bound_features.py` carries a
positive `assert "placement_source" not in occurrence`.

Verified against the live files, not the tests:

| verdict | count | which |
|---|---|---|
| `confirmed` | 8 | sidecar set == expansion entry exactly |
| `superset` | 3 | `MS14101-3_1ec77e91` (2 of 13), both `216332-001` geometries (1 of 4 each) |
| `not_found` | 0 | — |
| `absent` | 24 | the run wrote no expansion, or the mesh records no instance |

The three `superset` rows are precisely the population the old count was blind
to, so the new check reaches it and the docstring's "every unambiguous mesh came
back `confirmed`" holds. `occurrences_for()` now takes only `provenance`.
`test_a_placement_always_comes_from_the_mesh_that_owns_it` reproduces B1's exact
scenario on the live ambiguous mesh and asserts the placed instance set equals
the sidecar's. The refusal arm's failure message no longer advises retiring the
rule — it now says *"before retiring it, confirm it against the store rather
than assuming"*, which was the sharper half of the finding.

### B2 — fixed by deriving the threshold instead of tuning it

`>=` → `>`, in both readers, with the comparison now justified from the
row-count algebra rather than from a measurement: for R rows over S segments a
face has `2S(R-1)` triangles over `RS` nodes closed and `R(S+1)` open, so two
rows sit *at* 1.0 or below and three rows are above it for any real S. That is
the derivation the original comment was reaching for and got half of.

Re-measured independently, and every number reconciles:

| | planar | cylindrical | spherical | other | classified |
|---|---|---|---|---|---|
| Python, round 1 | 3866 | 6935 | 3046 | 21788 | 38.86% |
| Python, now | 3866 | 6930 | **2902** | 21937 | 38.44% |
| JS, now | 3866 | 6930 | **2902** | 21937 | 38.4% |

`3046 − 139 (B2) − 5 (S5) = 2902`, and `6935 − 5 = 6930`, so the commit's
"exactly 139 faces moved" is right and the remaining 10 are S5's. On the hub:
**spherical faces at `triangles_per_vertex == 1.0` went 18 → 0**, the lowest
accepted ratio there is now 1.0556, and 636 hub faces are correctly refused as
bands. The new witness `annotate__a-closed-band-of-quads-is-other-too…` mutates
the one character back and is `WITNESSED`; its note says plainly why the
open-band sibling could not have caught it.

### S5 was a real defect, not a stale claim

Worth flagging because the finding understated it. The ten divergences were not
cosmetic: Python tried each shape on its merits where the browser **stops** when
a shape's own sub-test fails, and on two faces Python answered with a 75 mm
sphere at RMS 0.68. `fit_face` is now `classifyOne` statement for statement, the
refusal vocabularies are paired, and a `[real]` check compares all 35635 faces.
I ran my own comparison against a fresh JS dump: **0 divergent faces**. The
pairing cost 165s and prompted three genuine efficiency fixes (`Mesh.face()`
was O(faces²), the range table and largest-face area were rebuilt per face, the
facet loop re-normalised vectors that are unit by construction) — 27.5s → 1.1s
on one part.

### The rest

- **S1** — relabelled `untraced`, with the note rewritten to separate the
  derivation (which settles traced-vs-inferred) from the support (which is the
  workbook alone), and stating that the fit is deliberately not leaned on. The
  suppressed gap row is back.
  `test_a_topology_edges_workbook_only_value_is_untraced_too` now parametrizes
  over every committed topology, sharing `_WORKBOOK_INFERRED_ALLOWED`, with a
  non-vacuity check beside it.
- **S2** — the divergence is written into the edge note under "READ THIS BEFORE
  TRUSTING THE NUMBER", with the magnitude, the evidence on both sides and the
  issue reference. The issue stays open for the decision itself, correctly.
- **S3** — `assert roots == topology.components()` replaces `>= 1`: a real
  layout-against-graph comparison, and stronger than the original `== 1`, since
  a walk root dropped or doubled now reddens. The dead local is gone.
- **S4** — both stages routed through `VOCAB.table("SURFACE_CLASSES", …)`, the
  branch tests `=== null`, and the pairing guard iterates the vocabulary,
  throws on a missing entry, and derives its `other` exemption from
  `SUGGESTION_RULES` rather than hard-coding it. The hole is closed derivably.
- **S6** — corrected to the measured values and reframed: *"the margin is thin
  by design, and it is not a margin."* The lowest accepted ratio store-wide is
  1.0357 (a ~1 mm spherical feature on the instrumented blade, 29 triangles
  over 28 nodes). `1.69` is gone. This is a better answer than the finding
  asked for — a false margin claim replaced by the derivation plus the true
  distribution.
- **All four nits** fixed, including the tests.js crossings comment, which was
  fixed by *removing* the digits and quoting the sentence's shape instead — the
  right move for a number the test derives live.
- **The merge conflict** is resolved and re-measured on the merged tree:
  **265 → 0, six of the six to zero**, with the handoff's regex improvement
  (both number words captured) surviving. The viewer tier re-derives those
  digits from the live projection and is green, so the re-measurement is
  checked rather than asserted.

### One thing the rework changed that was not mine to ask for

`64f6da9` also relaxed `order_columns`' guard in the merged-in sibling
handoff's code, from a per-term bound (`after[branch] + after[close] <=
before[…]`) to a strict bound on the total. `vpa_pitch_linkage` is the first
topology where the two differ — branch+close 36 → 39 while leader went 80 → 0 —
so the old assertion was asserting something the combined objective never
promised, and it would have reddened on the merged tree. The new form is the
right shape for a trade-off objective and is strict on the total. It is a
change to another handoff's guard, prompted by this merge and explained in the
commit message; I am flagging it rather than blocking on it, because the
alternative was shipping a red suite or weakening this handoff's own data.

### Round-2 test record

Post-merge, in this review worktree, with `node_modules` junctioned in from the
main checkout:

| run | result |
|---|---|
| `pytest -q` | **1437 passed, 1 failed** — the documented worktree-only `test_viewer_js_suite` skip-refusal, nothing else |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **522/522**, `[real]` tier ran, no TIER SKIPPED |
| `node apps/annotate/run_tests.cjs` | **157/157**, `[real]` tier ran |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 24/25, the one red being `[annotate rail filter + face deselect]`'s known-flaky "a real click on the face tints it"; re-run with `--only` per the overlay entry: **32/32 PASS**, so effectively 25/25 |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | **138/138 declared mutations witnessed**, exit 0, every tier reached including the browser arm (the junctioned `node_modules` armed it). Enrollment matches all three pins. This is the tier `CLAUDE.md` names as the merge gate’s own check. The author ran it independently on the branch tip (`13d0fae`) and got the same 138/138, on the third attempt after the shadow collisions below — so the figure has two independent runs behind it, mine on the merged tree |
| `tests/debug_report_tolerance_stacks.py --ratio` | 5/12/9 of 26 seeded; 30/16/15 of 61 — unmoved |

Pre-merge I ran the full `pytest -q` on the branch tip as well (1437 passed, 1
failed, same one), plus the annotate tier at 157/157 and its witnesses at
17/17. The projection the `[real]` tiers read was built by the handoff branch
at `6a164db`; the only files changed after it are an issue, the lesson and
`scripts/fit_bound_features.py`, none of which is a viewer-projection input,
and no sibling worktree holds the directory any more.

**Suite runtime roughly tripled**, 90s → ~245s, almost all of it the new
store-wide classifier pairing. That is a real cost for a real guard and the
author already paid down the worst of it; worth watching if a third `[real]`
pairing of this shape arrives.

### My own mistake this round

The author's lesson records two mutation-tier crashes they could not explain,
and a moment where they stopped two node processes they read as their own
orphans. Those were **mine**: I ran the witness tier inside the *tactical*
worktree in round 1 because that is where `node_modules` lives, and the runner
builds its shadow at one fixed path per repo root with no lock. They diagnosed
it correctly and filed it `high`
(`ISSUE_20261001_two_mutation_witness_runs_on_one_worktree_corrupt_each_others_shadow.md`).
I have extended the overlay's existing shadow-tree entry to say that running
the tier in the tactical worktree is a reviewer footgun specifically, with the
`mklink /J node_modules` route that avoids it.

---

## Round 1 — REQUEST CHANGES (2026-09-30)

**The deliverable's headline is right, and I re-derived it end to end.** Source B
is in hand: fitting face 26 of `asm217755_MS14101_3_9bfdb344` and applying the
mesh's own two recorded `placement_world` matrices gives two assembly-frame
centres `105.99056896582033 mm` apart, against the sweep sheet's
`105.99079988848088` — a delta of `0.000231 mm`. I opened
`C:\workspace\atp-post\docs\references\250530_pitch_motion_ratios.xlsx` and read
the cells: `C83:E83 = (83.000, −44.550, −22.700)`, `G83:I83 = (84.972, −17.139,
79.666)`, column labels `Pitch Arm Node` / `Pitch Plate Node` and `X Y Z`
exactly as the citation says, 80 rows over 4..83 ranging 105.9896–105.9915 for a
spread of 0.0019 mm. Every digit of the lesson's headline table reproduces. The
ball really is centred on its part origin, to 1e-6.

Two blockers are both in the *safety mechanisms* around that result rather than
in the result: the rule that decides which placement source is trusted cannot
see the ambiguity it tests for, and the sphere patch gate accepts the exact
shape it was written to refuse — 139 faces store-wide today, 18 of them on the
hub, which is one of the two parts Jeff was told to click.

## The mandatory checks

This work adds no tolerance stack, so checks 2, 2b, 3, 4 and 6 have no stack
elements to read. Each is addressed rather than skipped.

**1. Every tolerance traces to a specification or drawing callout — PASS, with
one confidence label wrong (S1).** The work adds no `StackElement`. The topology
carries exactly one dimension, `pitch_link_length`, cited `kind: "workbook"` to
a named sheet and named cells. I opened the workbook and verified it
cell-for-cell (above); the derivation `|A − P|` re-computes to
`105.99079988848088` → `105.9908`, and the constant-over-the-sweep argument the
note makes re-derives on the sheet's own numbers. Nothing is invented anywhere
in this change — the 28 valueless edges each name what would close them instead
of carrying a plausible zero, which is the right call. The `confidence` label is
`inferred` where the SOP says `untraced`; see S1.

**2. Signs on every path term — N/A.** No studies, no checks, no paths, no
`Term`. `fold()` is untouched (the diff does not reach `tolerance_stack/stack.py`
or `thermal.py`).

**2b. Coherent material corners — N/A.** Nothing is folded.

**3. LMC/MMC direction — N/A.** No element or dimension in this change carries
`lmc`/`mmc`. Confirmed `fold()` was not modified to read them.

**4. RSS actually computed — N/A.** No checks exist to report a triple for. The
document's `description` says it is studyless by design and
`docs/DAG_TOPOLOGY.md` now names that as a legitimate document kind.

**5. Nominal inside its own min/max — PASS.** The one dimension is
`105.9908 = min = max`; the `note` states why the band is degenerate (the sheet
carries a nominal and no tolerance) rather than inventing one, and the edge
shows on the gap list as `no_tolerance_recorded`.

**6. Quantised constraints where cotter/castellation hardware appears — N/A, and
the analogous caveat is present.** This topology names no slotted nut and no
cotter pin. The archetype's own un-settled question is stated next to the
numbers in three places: `fit_bound_features.py`'s module docstring ("it is not
a tolerance", "it is not a solver"), `docs/DAG_TOPOLOGY.md`'s new "the fence is
unchanged by any of it", and `CLAUDE.md`. Satisfied.

**7. The traced / inferred / untraced ratio — re-derived, unchanged by this
handoff.**

> Seeded (slice 1, 3 stacks): **5 traced / 12 inferred / 9 untraced, out of 26
> element instances.** All stacks: **30 traced / 16 inferred / 15 untraced, out
> of 61 element instances.**

Computed with `tests/debug_report_tolerance_stacks.py --ratio`, not copied. This
change adds no element, so neither number moves.

The topology's own value census, which the element ratio cannot see: **1 of 29
edges carries a dimension at all** (labelled `inferred`, and per S1 it should be
`untraced`); 28 carry none, each with a one-line note naming the drawing or the
fit that would close it. Only one gap row reaches the page, which the author
measured and filed as
`ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md` —
correctly, and that issue has proper frontmatter.

## Blockers

### B1 — `scripts/fit_bound_features.py:191` `product_mesh_counts()` groups by a label rotorkit has already disambiguated, so the placement-source guard cannot see the ambiguity it exists for

The rule is the right rule and the module docstring states it well: the full
expansion is keyed by product number, a product number is not a geometry key, so
use it "only when this store holds exactly **one** mesh for that number."

`product_mesh_counts()` implements that by counting `extraction.product_name` —
but rotorkit **appends a disambiguating suffix to that field precisely when one
number names more than one solid**, while `placements.json` is keyed by the bare
number. Measured in the live store:

| `extraction.product_name` | count the guard sees | `placements.json` key | instances under it |
|---|---|---|---|
| `MS14101-3` | 2 | `MS14101-3` | 13 |
| `MS14101-3_2` | 1 | — (missing) | — |
| `216332-001_36` | 1 | `216332-001` | 4 |
| `216332-001_41` | 1 | `216332-001` | 4 |
| `551438-001_29` | 1 | `551438-001` | 1 |

So the count can never see a solid rotorkit distinguished by suffix, which is
the whole population the guard is about. `216332-001` names two installed solids
and the guard reports 1 for each.

**Two consequences, both demonstrated.**

*Wrong geometry, one issue-resolution away.* The guard's only live firing today
is `MS14101-3` at count 2, and that count exists **solely because of the
duplicate-signature install this handoff itself filed as `high`**
(`ISSUE_20260930_one_solid_two_geometry_signatures_across_two_runs.md`). Resolve
that issue the obvious way — drop one of the two byte-identical `MS14101-3`
installs — and the count becomes 1, because the genuinely-distinct second solid
is `MS14101-3_2`. I ran `occurrences_for` with `counts['MS14101-3'] = 1`:

```
occurrences: 13 source: ['rotorkit_placements']
   .../213862-002.1/MS14101-3.1   ... .2/.3/.4/.5  (10 pitch-link bearings)
   217755-001/prd-e-03478614.1/prd-e-03438709.1/MS14101-3.1
   217755-001/prd-e-03478614.1/prd-e-03438709.2/MS14101-3.1
   217755-001/prd-e-03478614.1/prd-e-03438709.3/MS14101-3.1
```

The last three are the **tangential** link's bearings, handed to a mesh that is
the *pitch-link* bearing. That is the author's own words for the harm: "a
plausible coordinate, in the right units, centimetres wrong, with nothing on any
surface to say so."

*Misdiagnosis, reachable today.* For every suffixed name the expansion lookup
misses on the key, so the code takes the "no usable instance" fallback and
prints a sentence blaming the file's shape. Live, on a blade whose run does have
a `placements.json`:

```
note: a placements.json was found but carries no usable instance under
'216332-001_36' -- falling back to the mesh's own provenance. Check its shape
against rotorkit_placements()'s docstring before trusting this run.
```

The shape is fine. The key namespace differs. A reader sent to check the
docstring will find nothing wrong with it.

**Why the two arm tests do not catch this.** Both
`test_the_full_expansion_is_refused_for_a_product_number_that_names_two_solids`
and `..._is_used_where_the_number_names_one_solid` synthesise an expansion keyed
by *the store's own product names*, so the real key mismatch is invisible to
them. They are otherwise good tests — genuinely two-armed and non-vacuous — and
the refusal arm's own failure message makes this worse: remove the duplicate and
it reddens saying *"no product number in the store names two solids any more. If
that is real, this check has nothing to measure and should be retired with the
rule it guards"* — advice to retire a guard that is needed, at the moment it
stops working.

**Suggested fix.** Decide the ambiguity on something that identifies the solid
rather than on the label: require that the sidecar's own `instance_path` set be
a subset of the expansion's entry for the base number, and refuse (with the real
reason) when it is not. At minimum, count by the base number with the
disambiguating suffix stripped, and separate the "key not present" diagnostic
from the "shape unrecognised" one. Either way the test wants driving from the
real `placements.json`, not a synthesised one.

### B2 — `tolerance_stack/feature_geometry.py:153` / `apps/annotate/face_geometry.js` the sphere patch gate accepts a *closed* band of quads, which is the case it was written to refuse

`sphere_min_triangles_per_vertex: 1.0`, applied as `>=`. The justifying comment:

> A triangulated patch has at least as many triangles as nodes; a single band of
> quads has exactly two FEWER (2S triangles over 2S+2 nodes).

That is true of an **open** band. A **closed** band — S segments all the way
round — is 2S triangles over 2S nodes, exactly `1.0`, and `>=` puts it on the
pass side. Synthesised a closed 30° cone band, 48 triangles over 48 vertices:

```
sphere: r=15.9617 centre=[-0.0, -0.0, 12.441] max_res/r=2.226e-16  (gate <= 0.02)
patch gate: 1.0 >= 1.0 -> True
```

An invented centre 12.4 mm up the axis of a cone, accepted. It clears the plane
and cylinder arms first (a cone's normals are not perpendicular to one axis), so
the ordering does not save it, and the lesson itself measured a 30° cone band's
normal spread at 6.2° against the 20° gate.

**On real data this is not hypothetical.** Store-wide, **139 faces are accepted
as `spherical` at `triangles_per_vertex` exactly 1.0**, across 9 meshes — and
both readers agree, so it is not a Python-only artefact:

| mesh | closed-band faces accepted as `spherical` |
|---|---|
| `asm217755_551438_001` | 42 |
| `asm217755_216332_001_1ed2bfd5` | 33 |
| `asm217755_216332_001_1ff0bced` | 25 |
| **`asm217755_214373_002` (the hub)** | **18** |
| five others (incl. `asm217755_215175_001`) | 21 |

The hub's eighteen, with the radius each one offers a solver:

```
face  633  r=3.031   JS says: spherical      face 2048  r=63.669  JS says: spherical
face  645  r=3.031   JS says: spherical      face 2069  r=63.287  JS says: spherical
face  657  r=3.031   JS says: spherical      face 2136  r=65.161  JS says: spherical
face  661  r=3.018   JS says: spherical      face 2182  r=62.499  JS says: spherical
face 1732  r=8.015   JS says: spherical      ... 18 in total
```

**The blast radius is exactly this handoff's purpose.** The hub is one of the
two parts Jeff was told to click by name (`hub_spindle_bore_axis`,
`hub_blade1_root_bearing_bore`), and the lesson warns him to expect "a great
many round faces". For an edge whose words ask for a centre, the suggestion
surface will colour these 18 as ball-shaped; if he picks one,
`fit_bound_features.py` multiplies its invented centre by a placement and hands
the result to the solver as a joint location. A 62–65 mm "ball" on a hub is a
fillet band.

**The claimed margin is zero, not 50%.** The comment and the lesson both argue
"0.93 (every band) against 1.48 … — a 50% margin". The lowest
`triangles_per_vertex` among *accepted* spherical faces store-wide is exactly
`1.0`, 139 times. The 50% figure is measured on one bearing's four faces.

**The new witness is silent here by construction.**
`annotate__a-sphere-read-from-one-band-of-quads-is-other…` is `WITNESSED`, but
the band it exercises is the bearing's open one at 0.9286 — the arm that works.

**Suggested fix.** `>` rather than `>=`: a real patch is strictly greater, and
the measured minimum on a genuine spherical face is `1.2609` (MS14103-3's ball),
so the change costs nothing real. It needs a closed-band fixture in both
readers' suites — the existing band fixtures are all open — and the store-wide
class counts re-measured after, since 139 faces will move to `other`. Please
also re-word the comment: the argument wants to be about node *rows*, not about
the open case only.

## Should-fix

**S1 — `docs/topologies/topology_vpa_pitch_linkage.json` `pitch_link_length`:
`inferred` on workbook-only support, and the guard that mechanises the rule does
not reach topologies.** The SOP's table is unambiguous ("a number from a source
workbook and nothing else → `confidence: "untraced"`, and list it as a gap"), and
so is the 2026-09-15 amendment ("a value whose only support is 'the source says
so' is `untraced`"). The note's argument — the sheet states the endpoints, so the
length is one subtraction and one norm — settles `traced` vs `inferred` and says
nothing about workbook-only support; no second document is named as
corroborating, and the lesson explicitly declines to lean on the fit. All 7
existing `kind: "workbook"` topology dimensions in this repo are `untraced`;
this is the first `inferred`.

It is not a cosmetic label. `topology_gaps()` emits `unverified_value` only for
`UNVERIFIED_CONFIDENCES = ("untraced", "no_source_ref")`, so `inferred`
**suppresses a gap row this edge would otherwise carry** — it keeps only
`no_tolerance_recorded`. And
`test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered` is
parametrized over `ALL_STACK_FILES`, so the allowlist built to make every such
exception a deliberate, reviewable line never saw this one. Either relabel
`untraced`, or name the corroborating document in the note and register the
exception — and widen the guard to topology edge dimensions, which is where
the next one will also arrive.

**S2 — two committed topologies now state nominals 3.41 mm apart for the same
`pitch_link_length` on the same `pitch_link`, and neither mentions the other.**
`topology_pitch_system.json`'s `pitch_link_length` edge carries
`properties.nominal_length_mm: 109.4` at a 77° link angle, from
`260825_End_Stop_JC.xlsx` K3/K2, between `pitch_plate_link_hole` and
`pitch_link_arm_hole`. The new document says `105.9908` between the two sphere
centres. For a spherical bearing the ball centre is the hole axis, so these are
the same hole-to-hole distance — and a rigid link's length does not change with
pitch, as the new note's own constant-over-the-sweep argument establishes. The
mesh fit corroborates the new number to 0.23 µm, so 109.4 is very likely the
stale one; but nothing in the new topology, the alias table or the lesson
mentions it. The SOP amendment asks for exactly this: "record any you are out of
scope to fix as a listed divergence rather than an exemption." Nothing pairs
them today because the `pitch_system` nominal lives in `properties` rather than
in a `dimension`. Filed as
`ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`;
please add the cross-reference to the new document as part of rework.

**S3 — `tests/test_topology_projection.py:308` a real invariant was dropped for a
justification the committed document refutes.** `assert components == 1` became
`assert components >= 1`, justified by: *"One arrived — topology_vpa_pitch_linkage
carries three spherical bearings' own features beside the mechanism's chain,
which is four components."* `Topology.components()` on the committed document
returns **1**: commits `4bbc869` and `dfd5595` connected the bearings with the
four `*_centre_is_this_bearing` gap edges, and `docs/DAG_TOPOLOGY.md` correctly
says so in the past tense ("They *were* a separate component until…"). The test
comment was never reverted with it. `cycle_rank()` = 29 − 24 + 1 = 6, identical
to the old formula for all six topologies.

Two things follow. `components` is now computed and discarded — the comment
claims "the two are compared rather than conflated" and they are not compared at
all — and `assert components >= 1` can only fail if the layout drew zero rails
at row 0. The layout-against-graph connectivity cross-check the original
assertion gave is gone. Keep `cycle_rank()`, which is a genuine improvement;
restore a real comparison (the layout's component count against the graph's) and
fix the comment.

**S4 — `apps/annotate/suggestions.js:185` `NARROWING_RELATIONS` is keyed by hand
beside a sibling keyed by the generated vocabulary, and the new pairing guard
cannot see the gap.** Three functions down, the same diff writes
`AA.SURFACE_WORDS = VOCAB.table("SURFACE_CLASSES", {...})` with the argument
spelled out: *"a key omitted because it 'cannot happen' is how the next class
arrives silently."* `NARROWING_RELATIONS` covers planar/cylindrical/spherical and
not `other`, and the new guard iterates `Object.keys(perClass)` rather than the
vocabulary. So a fifth surface class added in Python with a `SUGGESTION_RULES`
row and no `NARROWING_RELATIONS` entry leaves the guard green, while
`end.note = AA.NO_RELATION_REASONS[stage][want.surface]` evaluates to
`undefined` and the surface prints `undefined` — which is precisely what the new
witness `every-null-in-the-relations-table-carries-a-reason` says it prevents.
`if (!relation)` also conflates a declared `null` with an absent key. Unreachable
today, which is why this is not a blocker: route both tables through
`VOCAB.table` and make the branch test `=== null`.

**S5 — the lesson's "Store-wide, Python and JS agree face for face" is false, and
nothing pairs them.** Measured face-for-face over all 35 meshes: they disagree on
**10 of 35635 faces** — Python classifies 5 as `cylindrical` and 5 as
`spherical` that JS calls `other`, all on `asm217755_551438_001`,
`asm217755_216332_001_1ed2bfd5` and `_1ff0bced` (the three rotorkit installed
mid-session). The lesson's class table is the **JS** reading
(3866/6930/3041/21798); `fit_part_faces` over the same store gives
3866/**6935**/**3046**/**21788**.

The only pairings that exist are of the thresholds
(`test_every_shared_threshold_holds_the_same_number_in_both_readers`) and of the
vocabulary. Nothing compares the two classifiers' *output* on any mesh. That
matters beyond the claim: `fit_bound_features.py` reads with Python and Jeff
picks with JS, so a face the surface offered can be fitted differently from the
way it was shown, and the ten divergences are on meshes he is being sent to
click. Either pair the two readers over the store (a `[real]` test comparing a
dumped classification, which is cheap — I wrote one in ~20 lines to measure
this) or drop the claim and say which reader the table is.

**S6 — the patch-ratio measurement quoted in `FIT_TOLERANCES` and in the lesson
does not reproduce.** Both say "0.93 (every band) against 1.48 / 1.57 / 1.69
(every patch, including both faces of the ball and both of the race seat)". The
bearing's four spherical faces measure `1.4783, 1.4783` (seat, r 5.198) and
`1.5714, 1.5714` (ball, r 5.147) — two distinct values, and **`1.69` appears on
no MS141xx mesh** (MS14103-3's four are `1.2609`). The band side, `0.9286`, is
right. This is the measurement B2's gate rests on, so it wants correcting in the
same pass.

## The merge conflict — I aborted it rather than resolve it

`git merge handoff/vpa_pitch_linkage_topology_and_feature_fits` conflicts in
`apps/viewer/README.md` and `apps/viewer/tests.js`. Both sides are the *same
sentence*, and neither is correct after the merge, so this is not a
pick-a-side resolution:

- **`integration`** has `columns_ordered_to_minimise_crossings` merged, which
  rewrote the paragraph to add `order_columns` and re-measured the pair as
  **139 → 0, five of the five to zero** over five topologies.
- **the handoff branch** says **167 → 98, four of the six to zero** over six
  topologies, measured without `order_columns`.

`apps/viewer/tests.js` re-derives all of those numbers from the live projection,
so the merged tree's `[real]` tier is red until they are re-measured against
`order_columns` *and* the sixth topology. That measurement is the author's to
make, and they will see the conflict as soon as they merge `integration` in — so
I left it for the rework rather than resolving it myself and shipping numbers I
would then be the only reviewer of.

Worth noting for that pass: the handoff's own tests.js hunk updated the quoted
comment from "92 → 43" to "96 → 43" — matching the README value that
`integration` had already superseded — and then changed the README to "167 → 98"
in the same diff, leaving the new comment stale again. The regex change itself
(capturing both number words instead of hard-coding `five`) is the right fix and
should survive the rebase.

## Nits

- `docs/topologies/part_mesh_aliases.json` note 4 says the resolved candidates
  "became the six rows at the foot of this table" — `hub` and `pitch_arm` were
  appended after, so they are the foot now.
- `Topology.components()`'s docstring says "Here rather than in a test because
  two tests need it". `components()` has exactly one caller, `cycle_rank()`; it
  is `cycle_rank` that two tests need.
- `docs/DAG_TOPOLOGY.md`'s six graph counts (12 parts, 24 interfaces, 29 edges,
  9 branch points, 6 grounded loops, 11 gap edges) **all verify** — I re-derived
  every one — but none is declared, so nothing re-derives them next time.
- `ISSUE_20260930_four_pitch_linkage_alias_rows_wait_on_rotorkits_extraction.md`
  still reads "Eight of them have an installed mesh … Four do not"; it is ten
  and two now. The correction blockquote at the top covers it.

## What else I verified, and what passed

- **All 20 alias rows' quoted shas resolve to a directory whose `provenance.json`
  `part_id` is the one the row maps to.** The three wrong ones the lesson
  confesses to are fixed, and the new
  `test_every_sha256_quoted_in_an_evidence_string_names_its_own_mesh` is
  non-vacuous on both the owners map and the quoted list. Good guard, written
  from the defect that produced it.
- **The `212956-005` correction is right and well-evidenced.**
  `placements.json['MS14101-3']` holds 13 instances — 10 under `213862-002.{1..5}`
  and 3 under `prd-e-03438709.{1,2,3}` — which is exactly the two-solids-one-number
  claim, confirmed independently of the parts lists.
- **The bearing ground truth reproduces exactly**: 36 faces → 4 spherical (ball
  5.147, seat 5.198), 6 cylindrical (bore 2.410, OD 7.141), 6 planar, 20 `other`,
  and the one refused-band ratio 0.9286.
- **Mutation witnesses: 16/16 WITNESSED**, including all five new annotate specs
  and the correctly re-anchored `the-narrowing-stages…` one.
  `--unenrolled` lists only pre-existing `browser` entries, so this handoff left
  no annotate guard unenrolled. `DECLARED_GUARDS.annotate` 151 → 156 with a new
  names digest matches the tier's own `156/156 passed`. The python-tier
  non-enrollment is a real, documented census limit
  (`CENSUS_LIMITS.python_not_censused`), honestly stated in the lesson.
- **The title** is a short noun phrase ("Propeller pitch linkage joints, blade
  1"), no genre clause, no units, no endpoints; what it sheds is in
  `description`. `id` is `vpa_pitch_linkage`.
- **Four filed issues all carry correct frontmatter** — closed-set `type`,
  `priority`, `status: open`, `area`, `reporter: agent`, and `found_by` naming
  the handoff rather than `handoff:`. The two that need design carry
  `audience: strategy`.
- **No production data polluted.** `tests/test_fit_bound_features.py` writes its
  synthetic inbox and its projection under `tmp_path`. The only shared write is
  the author's own run of the new builder into
  `data/projections/feature-geometry/fits.json`, a new path no other worktree
  touches. `data/inbox/specs/` is untouched; nothing was written into
  drawing-checker or rotorkit (the new script reads rotorkit by absolute path
  only).
- **`ARCHITECTURE.md` "all six → all seven projection writers"** is right: the
  three above plus `spec_library`, `feature_identity`, `fit_bound_features` and
  `export_stack_tabular`, and `PINNED_CLAIMS` was moved with it.
- **The 0.45 → 0.25 classification floor** is a legitimate move for the stated
  reason (the store gained a 286-solid hub and three blade assemblies whose
  swept surfaces are correctly `other`), with the measurement in the comment and
  the counter keyed off the generated vocabulary so a new class cannot hide. Note
  that B2's fix will move the rate again.

## Test record

**The tactical side records no full-suite run** — the lesson states tier
outcomes in prose but no command, checkout or counts — so the benefit of the
doubt is void and I ran the full suite pre-merge the old way, as the cadence
requires me to say.

| run | where | result |
|---|---|---|
| `pytest -q` | handoff worktree | **1 failed, 1419 passed** — the one failure is `test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented worktree-only skip detection (no `data/projections/viewer/`), exactly as `CLAUDE.md` describes |
| `pytest -q tests/test_fit_bound_features.py tests/test_feature_geometry.py` | handoff worktree | 22 passed |
| `node apps/annotate/run_tests.cjs` | handoff worktree (resolves the main checkout's store) | **156/156 passed**, `[real]` tier RAN — no SKIP lines |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only annotate` | handoff worktree | **16/16 declared mutations witnessed** |
| `tests/debug_report_tolerance_stacks.py --ratio` | handoff worktree | 5/12/9 of 26 seeded; 30/16/15 of 61 all |

**Not exercised, and why.** The viewer browser tier
(`scripts/run_viewer_browser_tests.mjs`) and the browser arm of the mutation
tier need `node_modules/playwright-core`, which exists only in the main
checkout; every browser witness reported "the tier was red before the mutation,
so nothing was proved". The viewer `[real]` tier was not run against the merged
tree either: the merge does not complete, and rebuilding the shared projection
to judge it would have clobbered the live projection that
`nav_tooltip_once_and_rail_hover_emphasis` is currently being reviewed against
(`ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red`). Those
two tiers, plus the re-measurement the README conflict needs, are what the
rework owes.

**No post-merge full suite**, because there is no merge: verdict is REQUEST
CHANGES.

## Verdict

**REQUEST CHANGES — 2 blockers.**

B1 and B2 are both the same shape, and it is this repo's most reliably recurring
one: a guard whose stated claim is wider than what it measures. In both cases the
mechanism was deliberately designed, documented in detail and tested on both
arms — and in both cases the key it compares (a disambiguated product label; a
ratio whose boundary is the refused case) cannot reach the thing the prose says
it reaches. Both are one small change plus a fixture away from doing what they
already claim.

The work underneath them is strong and the headline is correct — source B landed
before anyone clicked anything, which is a genuinely good outcome, and the
provenance discipline on the one cited number is the best I have seen in this
repo's topologies. Nothing here is invented. The six should-fixes are small
beside the two blockers and I would expect them in the same pass.

## Note for the next reviewer

Six entries went into `docs/prompts/REVIEW_AGENT.md` from this review. The two
worth reading before any geometry work here are the already-disambiguated-key
entry and the threshold-boundary one: both came from the same session's code,
both were argued for correctly in a comment, and both are invisible to a test
written from the same misunderstanding that wrote the code.
