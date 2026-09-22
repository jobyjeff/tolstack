# Lessons — `annotate_face_suggestions` (2026-09-21)

Handoff: `docs/sessions/HANDOFF_20260921_annotate_face_suggestions.md`.
Built: `apps/annotate/face_geometry.js` (classify a mesh face),
`apps/annotate/suggestions.js` (the narrowing rules), a `suggested`/`picked`
overlay role in `scene.js`, the `suggest` / `auto-suggest` verbs and the
**Suggest likely faces** switch in the top bar's Display group. Five mutation
witnesses (`scripts/mutation_witnesses.json`) stand on the parts of it that are
fences rather than features.

What follows is what the next agent could not read off the code: the measured
numbers, the one design decision that went the other way first, and what the
agent-driving arc can stand on.

---

## 1. Classification hit rates on the real meshes

Measured over all 24 installed meshes, 11 075 faces, by
`apps/annotate/run_tests.cjs`'s `[real]` tier — which **re-measures on every
run and fails under a 45% floor**, so these numbers are not a claim that
decays. Re-read them with `node apps/annotate/run_tests.cjs`.

| | faces | share |
|---|---|---|
| planar | 2 481 | 22.4% |
| cylindrical | 3 632 | 32.8% |
| **classified** | **6 113** | **55.2%** |
| other | 4 962 | 44.8% |

Why "other" is 45% and why that is fine:

| reason | faces |
|---|---|
| facet normals do not lie in one plane — neither a plane nor a cylinder | 4 131 |
| too narrow an arc to place an axis | 449 |
| a sliver too small to be a feature | 267 |
| the cross-section is not one circle | 71 |
| parallel facet normals but the vertices are not in one plane | 42 |
| the cross-section is too flat to be a circle | 2 |

**The rate is a property of the mesh store, not of the classifier.** Per part it
runs 26–100%, and the spread is entirely about what the part *is*:

- `asm217755_NAS1149V0332H` (flat washer): **100%** — two flats, four
  half-cylinders, nothing else.
- `asm217755_MS21299C3` / `MS21299C4K` (countersunk washers): **75%** — the
  countersink is a cone, correctly `other`.
- `asm217755_214820_002` (plain bushing): **43%** — 6 of 14 faces classify, and
  the other 8 are its four chamfer rings (split in two each), every one a cone.
- the big machined parts (`215175_001`, `215735_001`, `machined_213668`, …):
  **52–61%**, the remainder being fillets along curved edges, blends and spline
  faces.
- `blade_oml`: **36%** — it is a freeform blade. Nothing is wrong.

**The classifier is exact where the shape is exact.** On the washer, the two
plane offsets are 0.813 apart (.032 in) and the radii read 2.578 / 5.5626
(the .203 / .438 in the parts list names, which are DIAMETERS); on the bushing the bore reads 2.4130 (.1900 in ID). All three
are pinned as ground truth in the `[real]` tier against the numbers the 217755
parts list already states. **They are a check on the geometry READER and
nothing else** — no stack value comes from them, and
`docs/ANNOTATION_SURFACE.md`'s decision 1 is untouched.

### Thresholds: two were wrong on the first try, both measured

`AA.FACE_CLASSIFY` holds every threshold in one frozen block. Two of them moved
after measuring, and the reasoning is the useful part:

- **`cylinderRadialFraction` 0.01 → 0.02.** A genuine cylinder's radial
  residual is ~1e-8 *relative* when the radius is large and climbs to ~1e-2 on a
  1 mm fillet — because float32 positions carry an **absolute** error set by the
  part's coordinate magnitude, and this test divides it by the radius. One
  percent cost about a thousand real bores and fillets. Above two percent the
  population is 41 faces and none of them is round.
- **`cylinderMinArcDeg` 25 → 10.** The Kåsa fit stays good far below 25° (the
  residual histogram does not widen until the arc is under 5°), and 25° refused
  ~700 real cylindrical walls whose axis the coaxial test then had no trouble
  with. What the guard is really for is the axis *position*, not the direction.
- **`planarNormalDeg` stayed at 1.0, and that was checked rather than assumed.**
  Forcing the planar test to accept everything and reading the facet-normal
  spread over all 11 075 faces: 2 441 faces are under 0.1°, 215 more under 1°,
  and 232 sit in 1–2°. Of those 232, 181 fail the flatness test — so 1° is a
  real valley and 2° would admit 181 not-quite-planes.
- **A new guard nobody asked for: `degenerateAreaFraction` (1e-6 of the part's
  largest face).** The NAS6403U11D bolt carries two three-triangle faces that
  fit a circle of radius **0.003** in a part 25 long. They classified as
  cylinders and would have been two candidates a reader is invited to click and
  cannot see. 267 such faces across the store; they cost 0.0% of total area.

### The one classifier fact that makes any of this work

OCC puts triangulation **nodes exactly on the underlying surface** and lays a
cylinder out as a grid of quads split into triangles — so every facet of a
cylinder has two vertices at the same angular station, which makes that facet's
normal *exactly* perpendicular to the axis. That is why the axis can be read as
the least eigenvector of the facet-normal covariance and why the tolerances are
slack for numerical noise rather than for a tessellation error that grows with
`linear_deflection`. If a future mesh arrives from a tessellator that does not
do this, the cylinder test is the thing that breaks first.

A note for whoever widens this: `angularSpreadDeg` reports **360 minus one
station spacing** for a *closed* loop, not 360, because there is no duplicate
station at the seam. Left alone deliberately — the threshold it feeds is 10°.
In practice closed cylinders barely occur: OCC splits a bore at its seam, so
the live meshes are full of 180° halves.

---

## 2. The rule table, and how it is keyed

`AA.SUGGESTION_RULES` — two rows, matched in order, first hit winning:

| rule | surface | words |
|---|---|---|
| `diametral` | cylindrical | diameter, dia, bore, hole, od, id, shank, shaft, journal, barrel, thread, pin, cylindrical |
| `between_faces` | planar | thickness, length, width, height, depth, grip, flange, face, shoulder, gap, protrusion, step, land |

Three decisions inside that table that are not obvious from it:

1. **The INTERFACE's name is asked before the dimension's.** This was the
   single most useful realisation of the session. A topology edge is a
   dimension *between two interfaces*, a binding carries a `direction`, and the
   two ends routinely want **different surfaces**:
   `cotter-hole centreline to bolt point` reads as round at its `from` end
   (`cotter-pin hole centreline`) and says nothing useful at its `to` end. The
   edge name that spans them cannot tell them apart. So the class is resolved
   per *end*, and `end.where` records whether the interface or the dimension
   answered.
2. **Ambiguous words are omitted, not guessed.** `seat` is a bore on a bearing
   and a flat on a spring; `radius` is a fillet and a distance. A word that is
   right half the time colours the wrong faces half the time, and an element
   with no rule renders the ordinary view — which is the honest answer.
3. **`kind` is not read at all**, even though the handoff says
   "kind/description". The live vocabularies are four words — an edge is
   `structural` or `gap`, a node is `mating_surface` or `datum_feature` — and
   none of them distinguishes round from flat. A mating surface is a press fit
   as often as a bearing face. The *names* carry the signal; the kinds do not.

Also matched with **word boundaries**, not substrings: `dia` must not fire on
"diagonal" and `id` must not fire inside "rigid".

---

## 3. The narrowing stages, with the live counts

| stage | needs | planes | cylinders |
|---|---|---|---|
| `surface_class` | the element's words name a kind of surface | every flat face on the part | every round face on the part |
| `same_part_relation` | a face on **this** part bound at the other end of the dimension, or the other half of this interface | parallel to it | coaxial with it |
| `mating_fit` | a face on a **different** part bound at this interface | **nothing** (§4) | radius matches it |

Measured on the live pitch-link joint (`topology_pitch_link_to_pitch_plate`,
real projection + real meshes, all pinned in the `[real]` tier):

- **Diametral element, stage 1.** `cotter_hole_from_point`'s `from` end (the
  cotter-pin hole centreline) → **8 round candidates** on the NAS6403U11D bolt,
  out of 38 faces. Every one is cylindrical; no flat face is offered.
- **Length between faces, stage 1.** `washer_nas1149v0332` (washer thickness) →
  **2 flat candidates** on a 6-face washer, at both ends.
- **Stage 2, parallel.** Bind one end of the bushing's length →
  the other end goes **2 → 1**, and the face already bound is not offered again.
- **Stage 2, coaxial.** Bind the bolt's shank at `thread_region`'s `from`, then
  `fastener_grip`'s `to` goes **8 → 6** — the two cotter-hole faces (axis at 90°
  to the shank) drop out.
- **Stage 3, same radius.** The bolt's shank reads 2.4065 and the bushing's bore
  2.4130 — 0.27% apart, which is what a fit looks like — and the bolt's **8
  round faces narrow to 4**, the shank's own. The cotter hole (0.9525) is
  correctly excluded.

**The honest gap in that last bullet.** Stage 3's cylindrical leg has no
naturally-occurring case in the live topologies: the only two diametral
cross-part interfaces in the repo (`topology_pitch_system`'s
`pitch_plate_link_hole` and `pitch_link_arm_hole`) each have one half on
`pitch_link`, which has no installed mesh. Every one of the pitch-link joint's
five cross-part interfaces is a **flat** mating face, where stage 3 can narrow
nothing (§4). So the planner's stage-3 path is exercised end to end by a
**synthetic topology over the real bolt and bushing meshes** in the `[real]`
tier, clearly marked as such. When a real diametral cross-part interface with
two installed meshes arrives, that check is the shape it will take.

---

## 4. The narrowing this app cannot do — read this before "fixing" it

Jeff's note asks for "coaxial cylinders or coplanar/parallel planes" when the
other half of an interface is bound on the adjacent part. Only the cylinders
are available, and the reason is structural rather than an omission:
**`apps/annotate/` applies no assembly placement transforms.** Every part is
drawn at its own local origin, side by side. A plane's normal and offset belong
to one mesh's frame, so `parallel` and `coplanar` are *unaskable* across two
parts. Exactly one relation survives: two mating cylinders have the same
**radius**, because a radius is a property of one face rather than of a pair of
frames.

So `AA.NARROWING_RELATIONS.mating_fit.planar` is `null`, written out with its
reason, and the surface says so in everyday words
(`AA.NO_MATING_PLANE_RELATION`). A mutation witness
(`two-flat-faces-on-different-parts-are-not-compared`) reddens if someone fills
the null in.

Whether to apply the placements — `provenance.json` records
`placement_location` for every extracted instance and nothing reads them — is
**design work, not a fix**: it changes what the camera verbs mean, it needs a
"which of 29 instances" answer that feature identity deliberately does not
have, and it is available for the assembly-extracted meshes only. Filed:
`docs/issues/ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`.

---

## 5. The design decision that went the other way first

The handoff says "the body renders transparent" while suggestions are active, so
the first build faded the suggested body **unconditionally** and restored it
afterwards, tracking which bodies it had faded. That is defensible on its own
terms — a bore's inner wall is behind the part, so an opaque body hides the very
candidates the page is pointing at.

**The browser tier caught what it costs.** With suggestions on, unticking
**See-through parts** did nothing a reader could see: the suggestion display
faded the body again immediately. A control that does nothing is worse than a
body you have to rotate.

So translucency has **one owner** — the `transparency` verb and its checkbox —
and the suggestion display asks for whatever that says. It is on by default, so
the handoff's display state is what a reader meets; a reader who turns it off
gets solid bodies with the candidates still coloured on every face they can see.
The deviation from the handoff's literal wording is deliberate and this is the
record of it.

Two things to carry forward from that:

- **A display state has to be checked after the thing that draws it runs
  again**, not only after the setting changes. The first version of the
  mutation witness for this only unticked the switch — and the *mutated* build
  passed it, because nothing had re-run `suggest` yet. The witnessing sub-check
  is the one that deselects and re-selects the element afterwards.
- The suggestion display therefore **never calls `setGhost(sha, true)`**. If you
  see that literal appear in the suggest path again, this is the regression.

---

## 6. What the agent-driving arc (draft arc 4) can rely on

- **Two verbs, both un-gated by the checkbox.** `suggest` recomputes and paints
  for the selected element and returns the whole plan; `auto-suggest <on|off>`
  is the reader's setting. A verb typed by hand does what it says — the same
  rule the `select-*` verbs follow — so a driver never has to discover or
  change a preference to get a suggestion.
- **`suggest` returns machine-readable data, not a rendering.** Per end:
  `direction`, `interface`, `surface`, `rule`, `where`, `stage`, `relation`,
  `references` (each with `sameMesh`), `considered`, `candidates`, `note`. Plus
  the flat de-duplicated `faces` paint list and a top-level `note`. A driver can
  read "8 round faces, narrowed to 4 because the bushing bore is bound on the
  adjacent part" straight out of it without screen-scraping.
- **The whole plan is reachable with no scene.** `AA.planFaceSuggestions` is
  pure: topology + bindings + mesh list + a face-classification map in, plan
  out. `AA.classifyPartFaces` needs only the three typed arrays. A driver (or a
  headless agent) can plan without a WebGL context at all.
- **Classification is cached per session per mesh**, in `state.faceClasses`, and
  read through the storage adapter rather than through the scene — so a
  reference face on a part that is not open still narrows. Cost measured: 0–42 ms
  per mesh, 2 376 faces / 80 k triangles worst case.
- **`scene.listMarks(role)` is the observable.** Three roles — `bound`,
  `suggested`, `picked` — so a driver (and the browser tier) can ask what is on
  screen and in which colour, rather than inferring it.
- **The fence is a guard, not a comment.** `run_tests.cjs`'s `THE FENCE` check
  reads the suggest path statically and fails if it references `select-face`,
  `highlightFace` or any event builder; the mutation witness
  `a-suggestion-never-selects-a-face` applies the exact temptation (auto-select
  when the narrowing gets to one) and must redden. A driver arc that wants to
  bind must go through the existing write path, deliberately.

---

## 7. Smaller things worth knowing

- **`computeFaceVertexRanges` moved out of `scene.js`** into
  `AA.faceVertexRanges` (`face_geometry.js`): the classifier needs the same
  cumulative sum over the manifest, and `scene.js` is an ES module a test
  cannot load. `scene.js` calls it through `window.AnnotateApp`, the way it
  already called `AA.faceSubGeometry`.
- **Do not classify a part with `AA.faceSubGeometry`.** It scans every triangle
  to find one face's, which is right for the one face a reader marked and is
  O(faces × triangles) — 192 million iterations on the 2 376-face pitch plate.
  `classifyPartFaces` buckets triangles by face id in two passes instead.
- **The mock fixture grew, for the browser tier.** The demo topology gained a
  `nodes` table with reader-facing names (the rules ask an interface for its
  name, and bare ids say nothing) and the demo mesh gained a second face
  *beside* the first (face 0 is already bound by the fixture, so with one face
  there was never a candidate to suggest; stacking it in front would occlude
  the face the deselect tier aims a real click at). One `run_tests.cjs` check
  rode on the fixture having no node table — it is now written out explicitly
  rather than riding on a fixture's shape.
- **`scene.loadPart` had to be made idempotent under concurrency, and that is
  a consequence of this feature.** `select-edge` starts the suggestion display
  and a click handler has nothing to await into, so from 2026-09-21 there are
  routinely TWO callers asking for one part: `goto`, which opens the element's
  part, and `cmdSuggest`, which opens the part its candidates are on. The
  already-open check is synchronous and `this.parts.set` is three awaits later,
  so both could build a `THREE.Mesh` — and the second would be unreachable
  through `scene.parts`, hence impossible to hide, frame or dispose. `loadPart`
  now shares one in-flight promise (and drops it on failure, so a re-grant can
  retry). Worth knowing for the witness: the race is real but **not reliably
  reproducible** — the mutated build stayed green through a real element
  arrival, so the guard drives the contract directly (two `loadPart` calls
  started before either finishes) instead of hoping the timing lands.
- **A locator that depends on a panel having one control breaks on the second
  one.** `#hint-panel input[type=checkbox]` was a strict-mode violation the
  moment a second Display switch existed. The suites now address a setting by
  the words on it.
- **Running the browser tier from a worktree** needs `node_modules`
  (gitignored, main checkout only). A junction from the worktree to
  `C:\\workspace\\tolstack\\node_modules` works and lets
  `--repo C:\\workspace\\tolstack` serve THIS tree's `apps/` against the main
  checkout's projections. Remove the junction before finishing — a recursive
  delete of the worktree that follows it would take the main checkout's
  `node_modules` with it.

## Still to do (all filed, none left as prose)

- `ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md` —
  §4 above, `audience: strategy`.
