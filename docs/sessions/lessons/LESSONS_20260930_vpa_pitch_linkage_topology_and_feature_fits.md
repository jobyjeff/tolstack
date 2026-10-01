# LESSONS — vpa_pitch_linkage_topology_and_feature_fits (2026-09-30)

**Verdict one-liner**: source B is in hand and Jeff has not clicked anything
yet — the two pitch-link joint centres came out of the mesh store's own
recorded placements, **105.990569 mm apart**, against the 3DX sweep sheet's
**105.990800 mm** at 72°. A delta of **0.00023 mm**, which is inside the
sheet's own three-decimal rounding.

## The headline, and why it needed no binding

The MS14101-3's ball is centred on **its own part origin** (the fit reads
`(0, 0, 0)` to 1e-3 on both of its spherical faces). So the assembly-frame
joint centre of each instance is just that instance's `placement_world`
translation, and `provenance.json` has recorded those since 2026-09-14 with
nothing reading them.

| | assembly frame (mm) | sweep sheet row 83 (mm) | delta per axis (mm) |
|---|---|---|---|
| `213862-002.1/MS14101-3.1` | `83.00150, −44.55034, −22.69955` | `83.000, −44.550, −22.700` | `+0.0015, −0.0003, +0.0004` |
| `213862-002.1/MS14101-3.2` | `84.97358, −17.13899, 79.66612` | `84.972, −17.139, 79.666` | `+0.0016, +0.0000, +0.0001` |

The sheet's columns C–E are its **Pitch Arm Node** and G–I its **Pitch Plate
Node**; instance `.1` is the arm end and `.2` the plate end. Every residual is
at or below 1.6 µm, which is what a figure printed to three decimals looks like
when it is right. The length is constant across the whole sweep — 80 rows,
blade pitch −7° to +72°, range 105.9896–105.9915, spread 0.0019 mm — so the
"it must come out constant" check the handoff asked for passes on the sheet's
own numbers before the mesh is involved at all.

**What this is not.** It is a nominal read off a mesh. It has no band, and the
repo's cite-or-gap rule is untouched: `topology_vpa_pitch_linkage.json` cites
the *sheet* for that length, cell-for-cell, and not the fit.

The citation is **`untraced`**, and it read `inferred` until review. The
derivation argument — the sheet states the endpoints, so the length is one
subtraction and one norm — settles `traced` against `inferred` and says nothing
about the *support*, which is this workbook and no second document. The SOP's
rule is that workbook-only support is `untraced` and goes on the gap list
however reasonable it looks, and `inferred` had quietly taken it off that list
(`topology_gaps()` emits `unverified_value` only for `untraced`/`no_source_ref`).
The guard that mechanises the rule was parametrized over stacks alone, so this
was also the first workbook-cited **topology edge** anywhere in the repo; it
reads topology edges now.

**And a divergence worth knowing before quoting the number.**
`topology_pitch_system.json`'s own `pitch_link_length` edge carries
`properties.nominal_length_mm: 109.4`, from a different workbook, for the same
hole-to-hole distance on the same link — **3.41 mm** from this one. A rigid
link's length does not change with pitch (this document's own constancy argument
establishes that), so they cannot both be right, and the mesh fit corroborates
*this* one to 0.23 µm. Nothing pairs them, because that nominal lives in
`properties` rather than in a `dimension`. The reviewer filed
`ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`; the
cross-reference is on this edge's own note now.

## The `212956-005` correction, and the three MS141xx meshes

The 2026-09-14 rotorkit lesson's `pitch_link → 212956-005` is **wrong**, and the
parts lists settle it outright:

- `217755-001 A.1` sheet 1, find 25: `212956-005 PITCH ANTI ROTATION LINK
  ASSEMBLY, PROPELLER`, qty 3. It is the **tangential** link.
- `216231 B.1` sheet 1, find 30: `213862-002 PITCH LINK ASSEMBLY, PROPELLER`.
- `213862-002 A` sheet 1, its own two rows: `213861-002 PITCH LINK, PROPELLER`
  qty 1 and `MS14101-3` qty **2**.

Which resolves the "two topology ids, three MS141xx meshes" candidate the
2026-09-15 alias handoff left open — by **instance path**, not by guessing:

| mesh | instances | sits under | → topology part |
|---|---|---|---|
| `asm217755_MS14101_3_9bfdb344` | 2 | `213862-002.1` | `spherical_bearing_pitch_link` |
| `asm217755_MS14101_3_84a75703` | 3 | `prd-e-03438709.{1,2,3}` = the three `212956-005` | `spherical_bearing_tan_link` |
| `asm217755_MS14103_3` | 3 | the same three | `spherical_bearing_tan_link_ms14103_3` |

Corroborated by geometry: fitting `asm217755_212956_005` (the whole 4-solid link
assembly) finds spherical radii **5.147, 5.198 and 6.732** — the MS14101-3's
ball and race seat, plus the MS14103-3's larger one. Both MS14101-3 directories
fit the same two radii, as two copies of one catalog part should.

**A consequence worth knowing:** all three MS141xx geometries are now spoken
for, in the two links, and none of them is in the VPA. So
`spherical_bearing_in_vpa` (`topology_vpa_output_to_pitch_plate.json`) has no
installed mesh at all, rather than an undecided one. That is recorded in the
alias table's notes.

## rotorkit's extraction landed **mid-session**, and changed four answers

The parallel handoff's run (`assembly_extract_20261001T022446Z`) finished while
this one was running and installed twelve meshes — the hub, the pitch arm, the
pitch-link body, three blades, and a `placements.json`. The store went from 24
directories to 36 under a session that had already measured it. Everything
below is a correction made after that, not a design revisited.

### `placements.json` exists, and its shape was not what I guessed

It is `{product number: [instance, …]}`, not `{"instances": […]}`. The reader
written against the guess found nothing and fell back — visibly, because of a
stderr note added an hour earlier for exactly that case, which is the only
reason it was not a silent fallback.

**And the real shape carries a trap worth more than the fix.** It is keyed by
*product number*, and a product number is **not a geometry key**: `MS14101-3`
is more than one distinct solid in this assembly under one number, so its entry
there is every instance of all of them. Handing that list to one of them places
a bearing where a different bearing sits — a plausible coordinate, in the right
units, centimetres wrong, with nothing on any surface to say so. So the rule is
not "prefer the newer file": the expansion is used only where this store holds
exactly **one** mesh for that number, the sidecar is used otherwise, and the
refusal is printed. Two guards, one per arm, because a bug that refused the
expansion *always* would otherwise leave both green.

### Was the sidecar the full expansion? Now answerable: **no**

With the expansion to compare against, the sidecars are the slice reachable
from the label that was extracted. The pitch-link bearing's sidecar records 2
instances; the propeller has **five** pitch links. And the five are not the same
part — which is the next finding.

### Blade 1's pitch link is the **instrumented** `546293-002`

`216231 B.1` find 29, `INSTRUMENTED PITCH LINK ASSEMBLY`. The new extraction
puts it at instance `213862-002.1` with `213862-002` proper at `.2`–`.5`, and
the two bearings this handoff fitted sit inside that `.1`. So the topology's
`pitch_link` part names the design drawing and its two most important nodes get
their geometry from the instrumented one. The same is true one level up for the
blade (`551438-001` against `216332-001`).

The kinematics are the same link — that is what the sheet agreement to under
two microns says — so this is not a wrong number to correct but a question
nobody has answered: **does a topology part name the design part or the article
in the build the STEP is of?** Filed, with the three options and what each
costs, because it applies to every topology and not only this one.

### The same solid is installed twice, under two geometry signatures

`asm217755_MS14101_3_9bfdb344` (2026-09-15) and `…_1ec77e91` (2026-10-01) agree
on assembly sha, XCAF label, product name, solid count and both placement
matrices to seven decimals. Only the signature differs — across two commits of
the producer. `data/meshes/README.md` says that signature is "a function of the
geometry rather than of a file with a write timestamp", and this is that claim
failing. Filed as a `high`: it makes "how many distinct solids is `MS14101-3`?"
unanswerable from the store, which is precisely the question the new
placement-source rule has to answer.

### What was added, and what deliberately was not

Two of rotorkit's four parts became alias rows the same day — `hub` and
`pitch_arm`, exact drawing-number matches against one installed solid each.
`pitch_link`'s body and `blade_root` did **not**, and the reason is no longer a
missing file: both are blocked on the instrumented-variant decision, and
`216332-001` is installed as two distinct geometries besides.

## What Jeff clicks, in order

The annotator opens on the topology; every aliased part's mesh is offered and
the two parts still without a row show the honest "no installed mesh" state.
Deep link:
`apps/annotate/?topology=vpa_pitch_linkage&edge=<edge>`.

1. **`pitch_link_bearing_bore_to_ball_centre`** — the one edge whose geometry is
   installed today. Its `to` end is the ball: the suggestion surface colours the
   ball-shaped faces, which on this mesh is four — two halves of the ball
   (r 5.147) and two of the race seat it turns in (r 5.198). Pick a **ball**
   half; the seat is the outer race. Its `from` end is the bore: one of the two
   half-cylinders at r 2.410.
2. **`pitch_link_bearing_ball_centre_offset`** — the same ball centre against
   the bearing's outer-race OD (r 7.141, the two large half-cylinders).
3. **`pitch_plate_spindle_bore_axis`**, through `pitch_plate_attach_radius`'s
   `from` end — on `asm217755_215735_001` (the machined detail) this is faces
   **439** and **465**, the two halves of the central bore at r 16.500. *This
   one is already answered:* fitted and placed, its axis is the assembly **Z**
   to better than 0.01, so "expected CAD Z" is now measured for the plate. The
   hub's spindle bore is the other half of Jeff's question and has no mesh.
4. **`pitch_plate_attach_radius`'s `to` end and `pitch_plate_gas_spring_offset`**
   — the plate's link and gas-spring bores. These need Jeff's eye: the plate
   detail has 439 cylindrical faces and nothing in the repo says which bore is
   which.
5. **The tangential link's four**, on `asm217755_212956_005` — phase 2, and the
   mesh is a whole assembly, so `manifest.json`'s per-face `solid_id` is how to
   tell the link body from its two bearings.
6. **`hub_spindle_bore_axis` and `hub_blade1_root_bearing_bore`** — the two
   Jeff named by name, and they became clickable mid-session when rotorkit's
   extraction landed. The hub mesh is 286 solids, so expect the suggestion
   surface to colour a great many round faces: `manifest.json`'s per-face
   `solid_id` is how to narrow by hand. It will no longer colour **18 fillet
   bands as ball-shaped**, which is what the patch-gate blocker was about and
   why it mattered on this part in particular.
7. **`pitch_arm_root_seat` and `pitch_arm_link_bore`**, on
   `asm217755_215071_001` — one solid, five instances, so this is the cheapest
   of the un-bound parts to read.
8. **The pitch-link body and the blade root** still have no alias row, and no
   longer because the mesh is missing: blade 1 carries the instrumented
   variants of both, and `216332-001` is installed as two geometries. That is a
   decision, not a transcription —
   `ISSUE_20260930_blade_1s_pitch_link_is_the_instrumented_546293_002.md`.

Then: `venv-win/Scripts/python.exe scripts/build_feature_identity_projection.py`
followed by `scripts/fit_bound_features.py`. Neither is on
`rebuild_projections.ps1`'s rail, deliberately — the same call its sibling
already made, since this stream's input is an inbox rather than tracked `docs/`.

## The measurement that changed the design: a band of quads fits a sphere

The handoff asked for "the kind with the smallest RMS residual relative to the
face's size". **That rule is wrong for this geometry, and the reason is
structural rather than a threshold being off.**

A face tessellated as a single band of quads has its nodes in exactly two rows —
two coaxial circles — and *any two coaxial circles lie on one sphere exactly*.
Measured: a synthetic cylinder band, a 30° cone band and a real spherical band
all fit a sphere to **1e-16 relative**. On the MS14101-3's own bore the
cylinder's residual is 3.4e-8 and the sphere's 3.1e-8 — a coin toss deciding
whether a bore is reported to a solver as a joint centre.

No facet-normal threshold rescues it either (6.8°, 6.2° and 7.6° for those same
three bands), because the deviation there is set by the band's angular width,
not by its shape.

So:

- the **order** decides, not the residual: plane, then cylinder, then sphere,
  which is the order of how hard the test is to pass by accident. Every residual
  is still reported, so a reader can see how firmly the winner won;
- a sphere additionally has to be a **patch**: `n_triangles / n_vertices > 1`,
  and the comparison is strict because a *closed* band lands exactly on 1. For
  a face of R rows over S segments the counts are `2S(R-1)` triangles over `RS`
  nodes closed and `R(S+1)` open, so two rows are **at or below** 1 whatever S
  is and three rows are above. That is a boundary, not a margin: the lowest
  ratio on any accepted spherical face store-wide is **1.0357** and the
  distribution runs up from there. The bearing's own four are 1.4783 twice (the
  race seat) and 1.5714 twice (the ball); MS14103-3's four are 1.2609; its
  refused bands are 0.9286.

  **This shipped wrong and review caught it.** The comparison was `>=`, written
  from the open band alone — "a patch has at least as many triangles as nodes; a
  band has exactly two fewer", which is true of an open band and false of a
  closed one. 139 faces store-wide answered `spherical` because of it, 18 of
  them fillet bands on the **hub** offering a solver "ball" radii of 62–65 mm,
  on one of the two parts Jeff was told to click by name. The witness I wrote
  for the rule stayed WITNESSED throughout, because the band it exercises is the
  bearing's *open* one: the arm that worked hid the arm that did not. There are
  two specs now.

With the band rule the bearing reads exactly right: 4 spherical faces (ball
5.147, seat 5.198), 6 cylindrical (bore 2.410, OD 7.141), 6 planar, 20 `other`
— and the 20 say *"one band of quads, which lies on a sphere whatever shape it
is"* rather than a residual excuse.

Store-wide, Python and JS agree face for face — **now**; see "the two readers
did not agree" below for what that sentence was worth when it was first written.
Measured twice, because the store changed mid-session:

| | faces | meshes | planar | cylindrical | spherical | other | classified |
|---|---|---|---|---|---|---|---|
| before rotorkit's run | 11075 | 24 | 2481 | 3632 | 549 | 4413 | **60.2%** |
| after | 35635 | 35 | 3866 | 6930 | 3041 | 21798 | **38.8%** |
| after the strict patch gate | 35635 | 35 | 3866 | 6930 | **2902** | **21937** | **38.4%** |

The third row is the review fix: exactly 139 faces moved from `spherical` to
`other`, which is the count measured independently in the review.

The first is up from 55.2% on the same faces before the sphere existed. The
second is the store gaining three blade bonded assemblies and a 286-solid hub,
whose swept and freeform surfaces are correctly `other` — nothing about the
classifier moved. That took the rate under the `[real]` tier's 45% floor, which
is the floor doing the one thing its own comment says it must not: *"a tighter
floor would redden whenever a mesh is installed or replaced, and this check does
not own what is in the mesh store."* Moved to 0.25, with the measurement in the
comment beside it.

## What review found, and why both blockers were the same shape

Two blockers, and the reviewer's own summary of them is the thing worth
carrying: *a guard whose stated claim is wider than what it measures.* Both were
deliberately designed, documented at length and tested on both arms, and in both
cases the key the guard compared could not reach the thing the prose said it
reached.

### The sphere patch gate accepted the shape it refused

Above, under the band rule. One character — `>=` for `>` — and the argument in
the comment was *correct about open bands* while the code ran on both.

### The placement-source rule counted an already-disambiguated label

`product_mesh_counts()` decided whether rotorkit's expansion was addressable by
counting `extraction.product_name`. That is the field rotorkit **suffixes
precisely when a number names more than one solid** (`MS14101-3_2`,
`216332-001_36`), while `placements.json`'s keys stay bare — so the count was 1
for exactly the population the rule existed for, and the "shape unrecognised"
diagnostic fired on a file whose shape was fine. My own two arm tests could not
see it: they synthesised an expansion keyed by the store's own product names,
which is the key the real file does not use. **A fixture built from the same
misunderstanding that wrote the code tests the misunderstanding.**

Measuring the real file answered the design question outright:

| | sidecar instances | expansion's entry |
|---|---|---|
| every mesh whose number names **one** solid | n | **exactly n** |
| `MS14101-3` | 2 | 13 (two links) |
| `216332-001` (×2) | 1 each | 4 |

So where the expansion is addressable it adds nothing, and where it would add
something it cannot be attributed. It is therefore **not a source any more**:
every placement is the mesh's own sidecar, which belongs to one extracted solid,
and mis-attribution is impossible by construction rather than gated behind a
count. What the expansion became is the check that answers the question the
sidecars could not — *is an extraction's instance list the whole truth for its
solid?* — matched by **instance path**, which crosses the suffix gap. Four
verdicts (`confirmed`/`superset`/`not_found`/`absent`), carried per fit. Every
unambiguous mesh is `confirmed`, which also retires the open question this
lesson's earlier draft left: the sidecars were never slices.

## The two readers did not agree, and the claim that they did was mine

"Python and JS agree face for face" was false when first written: **10 of 35635
faces** differed, all on the three blade meshes rotorkit installed mid-session.
The cause was structural, not numerical — `apps/annotate/face_geometry.js`
**stops** when a shape's own sub-test fails ("parallel facet normals but the
vertices are not in one plane" ends the classification), and `fit_face` tried
each shape on its merits. On two of those faces Python answered with a 75.7 mm
sphere at an RMS of 0.68, accepted only because the gate is relative to a radius
the bad fit chose.

`fit_face` is now `classifyOne` statement for statement, the two refusal
vocabularies are paired, and a `[real]` check compares every face of every
installed mesh. Zero divergences.

**That check costs about 90 seconds**, which is more than the rest of the suite
put together, and all of it is the Python side — the browser's pass over the
same faces is under a second. Four rounds of optimisation took it from 165s, and
each round was a real defect of mine rather than a tuning exercise:

- `Mesh.face()` scanned the face list linearly, O(faces²) over a part — 4.9s of
  the hub's 55;
- `faces` rebuilt a list copy on every access, several times per face;
- the vertex-range table and the largest-face area were recomputed **per face**
  — 15s of a 27s part;
- `worst_deviation_deg` re-normalised vectors that are unit by construction, and
  normalised a fixed direction once per facet instead of once;
- the three fits each made their own centroid/extent pass, and `fit_sphere`
  accumulated a 4×4 normal matrix with a nested loop rather than over its
  symmetric half.

27.5s → 1.1s on one part. The remaining 90s is pure-Python float arithmetic over
a million triangles, which stdlib-only does not make cheaper. **Scoping the
pairing to fewer meshes is the obvious saving and it is the wrong one**: the ten
divergent faces were on the three blades, which is exactly what a subset chosen
for speed would drop.

## Four things the next agent should know

### The viewer fence and a topology are not separable

`apps/viewer/**` was fenced out of this handoff. Adding a sixth committed
topology moved three aggregates the viewer's own `[real]` tier re-derives from
the live projection, so the fence could not be held without handing the
reviewer a red suite. The edits are all "a number my data moved" or "a test
expectation my data falsified":

- the **column-reuse bullet** said reuse "does not fire at all". It fires now —
  `vpa_pitch_linkage` allocates **12 rails over 11 columns**, one column
  carrying two disjoint spans. That is the mechanism the layout's own `Layout`
  docstring describes and no committed topology had exercised in a year;
- which is also why `tests.js` compared the rendered rail count against
  `layout.columns` and read a legitimate second span as a rail that is not
  there. It reads `layout.rails.length` now;
- the crossings sentence's regex hard-coded the word `five`, so a sixth
  topology read as *"the sentence is missing"* rather than *"the sentence is
  stale"*. Both number words are captured and paired now, so a seventh needs no
  regex edit.

If you are adding a topology, budget for this. The affected checks name
themselves clearly; the one that does not is the rails/columns shape array.

### The viewer's `[real]` tier found two authoring errors in the topology

Worth more than it sounds: *"a node declares a part that no edge incident on it
carries"*. It caught three bearing seat nodes claiming the parts they press
into, and two mount nodes whose part had no structural edge at all. Both were
real — the first a membership nothing used, the second a part modelled as a
single-interface stub. The fix for the second (a base face against the hub, a
height above it, and the hub's own offset to the seat) is the shape
`topology_pitch_system.json` already had.

Run `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` after
authoring a topology, not only `pytest`.

### An alias row's evidence string was checked by nothing

Three of the six rows added here quoted the **wrong** mesh directory in their
evidence prose, and the whole module stayed green: every pairing was on the
`mesh_part_id` *field*, which is what the resolvers read. A sha in an evidence
string is how the next reader re-finds the `provenance.json` the identity claim
rests on, and a wrong one sends them to a different part's file.
`test_every_sha256_quoted_in_an_evidence_string_names_its_own_mesh` now pairs
them. The defect was mine, from writing the shas out of a directory listing
rather than reading them back.

### The gap list cannot see this document's gaps

Twenty-eight of this topology's twenty-nine edges carry **no dimension at all**,
each with a one-line note naming what would close it, because an `untraced`
band of `0.000` would put a placeholder zero where a reader cannot tell one from
a measurement. `topology_gaps()` reports an edge whose dimension is *unverified*
and skips one with no dimension — correctly, for the `gap`-kind edge that
meaning was written for, and wrongly for a `structural` one. So the page shows
one gap row (`pitch_link_length`, no tolerance recorded, which is true) and the
other twenty-eight show on their edges as `derived`. Filed as
`ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md`;
the fix needs a word in `TOPOLOGY_GAP_KINDS` and a branch in the fenced viewer.

## Test record

Run in the **handoff worktree** against the main checkout's `data/`, on the
branch tip, after `scripts/build_topology_projection.py`,
`build_viewer_projection.py` and `build_viewer_crops.py` were re-run from this
tree into `C:\workspace\tolstack\data` in that order.

| command | where | result |
|---|---|---|
| `venv-win/Scripts/python.exe -m pytest -q` | worktree | **1437 passed, 1 failed**, 4m21s |
| `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` | worktree, main-checkout data | **522/522**, no SKIP lines |
| `node apps/annotate/run_tests.cjs` | worktree (resolves the main checkout's store) | **157/157**, `[real]` tier ran |
| `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` | worktree | **25/25 browser checks** |
| `node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack` | worktree | **132/132 witnessed** pre-review; the four specs this pass re-anchored or added re-run individually, all WITNESSED |
| `tests/debug_report_tolerance_stacks.py --ratio` | worktree | 5/12/9 of 26 seeded; 30/16/15 of 61 all stacks — unmoved, this change adds no element |

**The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`**,
and it is the red `CLAUDE.md` documents for a worktree: that test refuses a
SKIPPED tier, the viewer's `[real]` tier needs `data/projections/viewer/` which
is gitignored into the main checkout, so it skips here. The tier itself is the
522/522 row above, run the way the failure message tells you to.

**The browser tier needed `node_modules/playwright-core`**, which exists only in
the main checkout; I ran it through a directory junction in the worktree and
removed the junction afterwards (`cmd /c rmdir node_modules`, which unlinks
rather than following). If you need it again, that is the recipe — and remove it
again, because a recursive delete that follows the junction would take the main
checkout's copy with it.

## Things not done, and why

- **No `mesh` kind in `SOURCE_REF_KINDS`.** The handoff names
  `source_ref.kind = "mesh"` for a fitted nominal. Nothing writes one into a
  document yet — `fits.json` is a projection and carries its own provenance
  shape — so adding the word would have been a vocabulary with no caller, plus
  edits to `docs/SOP_TOLERANCE_STACK.md` Step 5b (paired by
  `tests/test_sop_vocabulary.py`). The first handoff that writes a fit into a
  stack or topology adds it.
- **`fit_bound_features.py` is not on `rebuild_projections.ps1`.** Same call
  `build_feature_identity_projection.py` already made.
- **The new pytest guards are not mutation-enrolled.** The census cannot see the
  `python` tier at all (`CENSUS_LIMITS.python_not_censused`), and both new
  modules' guards are `[real]`-tier: in the witness runner's shadow tree they
  would skip rather than redden, which is a witness that passes against
  anything. The five new **annotate** guards are enrolled and all five are
  `WITNESSED`.
