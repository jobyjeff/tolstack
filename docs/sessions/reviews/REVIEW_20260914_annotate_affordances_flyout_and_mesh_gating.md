---
type: review
handoff: HANDOFF_20260914_annotate_affordances_flyout_and_mesh_gating
reviewer: agent (review/annotate_affordances_flyout_and_mesh_gating)
date: 2026-09-14
verdict: APPROVE
blockers: 0
---

# Review — annotate_affordances_flyout_and_mesh_gating

Two commits under review, both the author's (`4e86add` code + tests + docs,
`feeef81` lesson + issue) — nothing uncommitted in the tactical worktree, so no
commit-on-their-behalf was needed. `integration` had moved from `595051d` to
`4d74adb` while the handoff was in flight (`spec_crop_region_registry` staged
and activated, `debug_topology_real_render.mjs` tracked); merged `integration`
into the review branch first, then `handoff/…` — **both merges clean, ort, no
conflicts**, so there is no resolution to report. Containment checked before
starting: `git merge-base --is-ancestor handoff/… integration` = NOT merged, so
the merge-and-watch-it-go-green step was real.

Verdict: **APPROVE, 0 blockers.** Three should-fixes, all filed as issues; four
small things fixed inline (listed below). The deliverables are all three built,
the gating is data-driven at any mesh count, and the new guards were each
observed failing.

## The mandatory checks (1–7)

**Not applicable, and the overlay says so explicitly** — its own scoping
sentence binds checks 1–7 to work that *is* a tolerance stack. This is viewer
plumbing plus one derived projection field: no stack JSON, element, term,
`lmc`/`mmc`, check, verdict, worksheet, hardware entry or material entry was
touched. Each check, stated rather than skipped:

1. **Every tolerance traces to a spec/drawing callout** — no element value added
   or changed; no `source_ref` in the diff. The nearest thing to a provenance
   claim is the alias entry the builder now consumes, and that entry's evidence
   chain was audited in `REVIEW_20260910_mesh_part_alias_table.md` and is
   unchanged (byte-identical `aliases` array; I edited only the `notes`).
2. **Signs on every path term** — no term list touched. `fold()`, `summarize()`,
   `traverse()` untouched; `git diff` over `tolerance_stack/` is empty.
3. **LMC/MMC direction** — no element carries either in this diff.
4. **RSS actually computed** — unchanged; the rebuild's console summary still
   prints worst case + RSS per study and the projection diff (below) is
   `built_at`/`provenance` only.
5. **Nominal inside its own min/max** — no transcribed value touched.
6. **Quantised cotter/castellation constraints** — no joint re-analysed.
7. **Traced / inferred / untraced ratio** — re-derived by me from the one
   computing command (`tests\debug_report_tolerance_stacks.py --ratio`):
   **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across
   the three seeded stacks. Unmoved by this handoff, as expected.

## What the work is, and what I verified

### Deliverable 1 — mesh availability as a projection fact

`scripts/build_topology_projection.py` stamps `mesh: {installed, part_id}` on
**every** projected part (`MESH_FACT_FIELDS`, always both keys), resolving the
part id through `installed_meshes()` + `load_mesh_aliases()` + `resolve_mesh()`.

- **The mirror is faithful.** `resolve_mesh` is `AA.resolveMeshIdentifier`
  (`apps/annotate/commands.js:79-96`) line for line: direct sha256, direct
  `part_id`, then the alias table's `topology_part` → `mesh_part_id`, then
  `null`; never fuzzy. Read both side by side. One deliberate, documented
  difference: a mesh directory with no readable `provenance.json` or no
  `part_id` is **dropped** from the Python list, where the FSA adapter keeps it
  with `part_id: null`. Behaviourally equivalent for the only identifiers the
  projection resolves (a topology `part` id can match neither a null `part_id`
  nor an alias's `mesh_part_id`), and the docstring states the rule.
- **The gitignored-input trap is avoided** —
  `meshes_dir = Path(args.data_root) / "meshes"`, so the standard from-a-worktree
  recipe reads the main checkout. This is exactly the
  `ISSUE_20260906_feature_identity_events_dir_ignores_data_root` shape and it was
  got right. Ran the one-command check from the overlay: from this worktree,
  `--data-root C:/workspace/tolstack/data` found the real mesh
  (`3D: gas_spring_mount_213668_002 (alias -> machined_213668)`); with an empty
  scratch root it printed the stderr note
  `note: no meshes dir at … -- every part projects mesh.installed=false`.
  `rebuild_projections.ps1` passes no `--data-root` and runs from the main
  checkout, where the `REPO_ROOT/data` default is correct — the documented
  canonical invocation works.
- **The alias table follows `topologies_dir`, not `REPO_ROOT`** — which is what
  lets `test_installing_a_mesh_flips_exactly_that_parts_fact` run off tracked
  files plus `tmp_path`. Good call and it is tested both ways
  (`load_mesh_aliases(REPO_ROOT / "docs") == []`).
- **Real-data facts, re-derived by me, not read off the lesson:** 2 installed
  meshes (`machined_213668`, `blade_oml`), 1 alias entry, **1 of 29** topology
  parts resolves, **1 of 21** studies has a meshed part
  (`pitch_system_gas_spring_branch`, via `gas_spring_mount_position`). Every
  figure in the lesson reproduced.
- **Projection rebuild diff.** Rebuilt `topologies.json` from this review tree
  against the main checkout's `data/`; the provenance gate reported the prior
  build (`handoff/… @ 4e86add`) as already contained and overwrote it — the gate
  working. Key-by-key diff against the pre-rebuild file: **only `built_at` and
  `provenance` differ.** Nothing else regressed.

### Deliverable 2 — no dead 3D links

Four affordance sites exist in the viewer, and I enumerated them by grepping for
the carriers (`VA.annotateLink`, `VA.annotateExecCommands`, `onStudy3d`,
`onAttach3d`) rather than trusting the handoff's list: the toolbar study launch,
the detail pane's edge affordance, the edge hover card, the component hover card.
**All four are gated**, and the README's "every one of those affordances" is
therefore a complete enumeration. Nothing in `views/stack.js` or classic mode
offers an annotate affordance, so there is no fifth site.

The toolbar gate (`VA.studyHasMesh`) went one level past the handoff's list, and
that is the right reading of the handoff's title; I checked that the
`if (state.studyId)` block it now guards contains *only* the 3D affordance, so no
unrelated toolbar control disappears with it (the fixture-tier test pins that
too: `ok(root.querySelector("button.tvpick__mode"))`).

An errored study still projects its `selection` (`project_study` sets it before
the `try`), so `studyHasMesh` works on a study that raises — the gate does not
silently swallow the error-study affordance.

### Deliverable 3 — every surviving affordance drives the flyout

`views/cards.js`'s `annotateLine` now takes `{mount, onAnnotate}` and renders a
`<button>` when both are present, the same anchor otherwise;
`topology_app.js`'s `onCardAnnotate` hides the card and calls the existing
`launchAnnotate`. No new verb and no new param: the launch params are the same
ones `VA.annotateLink` carries, and `VA.annotateExecCommands` already handles the
component card's edge-less shape (`["goto", topo, "", ""]` — the URL boot path
has always produced exactly that for a part-only link, so this is not a new
command shape reaching `cmdGoto`).

**The two carriers read as one affordance — measured, not eyeballed.** A real
Chrome, `#croppop`'s `view this part in 3D →`:

| | color | text-decoration | font-size | box |
|---|---|---|---|---|
| button (mounted) | `rgb(110,168,254)` | underline | 13px | 125×20 |
| anchor (`file://`) | `rgb(110,168,254)` | underline | 13px | 125×17 |

Same accent, same underline (the anchor's is the browser default — `style.css`
has `a { color: var(--accent) }` and no `.croppop__link` rule to reset it), same
type, 3px taller line box, no overflow of the card. The CSS comment's claim that
the button is "stripped back to the link's own look" holds.

## Guards observed failing (the universal check)

Every new guard was broken on purpose and watched go red. Nothing accepted on
the strength of green.

| Break | Result |
|---|---|
| `VA.MESH_FACT_FIELDS` → `["installed"]` | `test_the_js_copy_spells_exactly_what_python_enumerates[MESH_FACT_FIELDS]` red, naming `part_id` in both directions |
| drop `row["mesh"] = mesh_fact(...)` from `project_part` | `test_every_projected_part_carries_the_block_and_absent_is_stated` + `test_installing_a_mesh_flips_exactly_that_parts_fact` red |
| `VA.partHasMesh` → `return true` | fast tier 236/243; real tier 284/294; browser tier 13/16 with the new sub-check `a part with no installed mesh shows NOTHING about 3D on its card` named |
| `annotateLine`'s `launch` → `false` (un-rewire the card) | fast + browser tiers red on `a card's 3D affordance drives the ONE flyout` (the browser one would otherwise have been a `waitForSelector` timeout) |
| every live part flipped to `installed: true` in a scratch projection | `[real] across every live topology…` red on its **withholding-half** witness: *"every live part has a mesh, so the withholding half of this pairing went unexercised"* |

That last one is the measurement the overlay demands of a strengthened guard:
the `[real]` pairing goes red for being **unable to see** the defect, not green
for not finding it, and both of its witnesses were exercised in both
directions. The technique is worth reusing and is now in the overlay — copy
`data/projections/viewer/*.json` to a scratch dir, edit one field, and point
`run_tests.cjs --repo` there; app source always comes from the worktree
(`NODE_FS` vs `VIEWER_SRC`), so no shared-`data/` write is needed.

**Wait predicates in the new browser checks** read sound against the
2026-09-11/14 rule: `#croppop button.hovercard__3d` and `#croppop a.hovercard__3d`
are render products (one synchronous renderer sets the class and fills the node),
and the `post` absence check waits on `#croppop.hovercard--component` whose class
is likewise a render product, with the previous card already hidden
(`display: none`) so the default visible-state wait cannot resolve on it. And the
failure direction is safe: a premature resolve would sample the `base` card,
which *does* offer 3D, so it would go red rather than pass wrongly.

## Test results (re-run by me, in this worktree, on the merged tree)

- `venv-win/Scripts/python.exe -m pytest -q` → **781 passed, 1 skipped**. The
  skip is the standing worktree one (`test_viewer_js_suite_is_green`, node-fs
  tier had no projection), verified with `-rs`.
- `node apps/viewer/run_tests.cjs` → **243/243** (node-fs tier skipped).
- `node apps/annotate/run_tests.cjs` → **57/57**, including its own `[real]`
  alias tier — confirming the annotator's command vocabulary was used as-is.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
  **16/16**, flyout suite **18/18** sub-checks, topology 118/118 both modes. Run
  from the review worktree behind a `node_modules` junction to the main checkout,
  **removed with `.Delete()` before finishing** per the lesson's own warning.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **291/294**,
  and **not one of the three failures belongs to this branch** (see below).
- **Test pollution:** hashed all 143 files under the main checkout's `data/`
  before and after a full pytest run — byte-identical. `git status` in the
  worktree clean; no stray `workspace<repo>data`-shaped directory.
- **drawing-checker:** the diff contains no path under it and nothing here can
  write there; took my own snapshot anyway (`snapshot_drawing_checker.py take`,
  **5994 entries**, 2026-09-14T23:54Z) since reading that repo is the activity
  that could.

### The `[real]` tier's three failures, attributed

The lesson predicted one (`stacks[].description`) and its cause checks out
independently: `build_viewer_projection.py` on this merged tree emits no such
field (the only `description` in it is an `argparse` kwarg), and
`results.json`'s provenance names `handoff/stack_title_style_pass @ 164a07b`. I
did not take the "pre-existing, unrelated" label on faith — the main checkout's
own clean `master` fails the same test the same way (**281/283**, on
`description` *and* `mesh`), reproducing the issue's own measured figure.

A **third** live handoff then rebuilt `crops.json` mid-review
(`handoff/spec_crop_region_registry`, `built_at 23:58:47`, `dirty: true`),
taking the tier from 293/294 to 291/294 on an unchanged tree with two more
cross-worktree failures (`region_label`/`region_match`, and
`located_by = "declared_region"` in the **value-guard** tier). So the three
viewer projections were simultaneously stamped by three different trees. I
appended that measured third instance to the handoff's own issue
(`ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`) and
added the "print all three provenance stamps before reading a `[real]` result"
rule to the overlay. None of it is a finding against this work.

## Findings

### should-fix

1. **Two of the three new `[real]` mesh tests name today's mesh set, under a
   comment saying the block is count-free.** `[real] an untraced edge whose part
   has NO mesh offers nothing at all` asserts `partHasMesh(livePitch, "hub") ===
   false`; its sibling asserts the alias target is `machined_213668`. Measured:
   copying the live projection to a scratch root with **only** `hub`'s block
   flipped to installed reddens the first — i.e. the sibling
   `assembly_step_part_extraction` handoff installing a hub mesh breaks a guard
   for a correct reason, which is how guards get deleted. The per-part pairing is
   genuinely count-free and needs no change. Filed
   `ISSUE_20260914_real_mesh_edge_tests_break_when_the_mesh_set_grows.md`; the
   fix shape (pick the edges by behaviour, keep a "some part's `mesh.part_id`
   differs from its id" assertion for the alias fact) is in the issue. I narrowed
   the block comment and the lesson's sentence inline but left the tests to the
   author — a logic change to a guard is not a reviewer's.

2. **`parts[].mesh` joined no value guard.** `TOPO_VALUE_GUARDS` has eight rows
   and no row for the newest enumerated field the page switches on. The row's
   value here is less the boolean's value set than its "no live value found —
   either the collector is wrong or the builder stopped writing it" arm. The
   overlay's own rule: *whether a field is covered is no longer yours to
   enumerate; read the rows* — and *when a newcomer joins a class the repo
   guards, check it is in each guard.* This is the third sighting of that
   pattern (after `viewer_fixture_shape_guards` 2026-08-12 and
   `check_completeness_schema` 2026-08-13) and is now appended to that overlay
   entry.

3. **An absent `mesh` block and "no mesh is installed" are one silent state.**
   `VA.partMeshFact` returns `MESH_FACT_ABSENT` for both, and the page says
   nothing either way — so a `topologies.json` built before this field (which is
   *every* copy until someone rebuilds, because nothing rebuilds the projection)
   makes all 3D affordances vanish with no explanation. The author reasoned about
   this in a comment and chose silence, which is defensible for the *no mesh*
   case and matches the handoff's standing "a disabled feature shows NOTHING"
   rule; what is unsettled is the *stale projection* case, where this repo's
   established answer is a loud `VA.unlabelled*Text` plus a banner rollup
   (`viewer_source_ref_export_label`, and the `VA.VERDICT_SCOPES` miss in
   `check_completeness_schema`). Not blocking: nothing is misread, only absent,
   and it self-heals on a rebuild. Filed with (2) as
   `ISSUE_20260914_mesh_fact_has_no_value_guard_row_and_an_absent_block_is_silent.md`.

### Fixed inline (all four stated, none silent)

- **`data/meshes/README.md`** said *"`apps/annotate/` is the one consumer."* —
  false as of this handoff, which makes `build_topology_projection.py` a second
  reader of every directory's `provenance.json`. The stale-quantifier class the
  overlay logs most; corrected in place, naming the new reader.
- **`docs/topologies/part_mesh_aliases.json`**'s `notes` listed the alias table's
  consumers as `apps/annotate/commands.js` alone. Added the builder's
  `resolve_mesh`. (`notes` is not pinned by any test; the `aliases` array is
  untouched, byte for byte.)
- **`apps/viewer/topology.js`**'s comment above `VA.MESH_FACT_FIELDS` said a
  missing block "is a stale projection, not 'no mesh' — `VA.partMeshFact` below
  is where that distinction is made." `partMeshFact` is where the two are
  deliberately **merged**. Reworded to say what the code does (see should-fix 3).
- **`apps/viewer/tests.js`**'s `[real]` block comment and the lesson's
  "needs no test edit" sentence, narrowed to the one test they are true of, with
  the measured counterexample and the issue named (see should-fix 1). The lesson
  edit is a dated review blockquote, not a rewrite.

### Nits

- `VA.partMeshFact` rebuilds the whole `VA.topologyIndex` on **every** call, and
  `VA.studyHasMesh` calls it once per selected edge — so a 10-edge study rebuilds
  a 43-node/43-edge/29-part index ten times. The index's own docstring exists to
  discourage exactly this ("built once per render rather than scanned per row,
  because … a linear scan per row is quadratic for no reason"). Immaterial at
  these sizes and at these call sites (one detail pane, one hover, one toolbar
  render), which is why it is a nit and not filed; but passing the index in is
  the shape the neighbour asks for.
- `VA.MESH_FACT_ABSENT` is a shared module-level object returned by reference. No
  consumer mutates it today, and the fixture-tier test compares against it by
  identity-free `eq`. Worth knowing before someone writes
  `fact.installed = true`.
- `ARCHITECTURE.md`'s `build_topology_projection.py` row still describes only the
  script's output and its sibling imports; the durable operational fact that the
  projection now depends on `--data-root`'s `meshes/` is documented thoroughly in
  `apps/viewer/README.md`'s new "No dead 3D links" section and in
  `docs/ANNOTATION_SURFACE.md`, so nothing is unfindable — but that row is where
  a reader looks for a script's inputs.

## Documentation

`apps/viewer/README.md`'s new **No dead 3D links** section is accurate: I checked
its JSON example against a live projected part, its four-affordance enumeration
against the grep above, and its "the page cannot compute this for itself"
argument against `apps/annotate/config.js` (`partMeshAliases` is under `docs/`)
and the projection contents. `docs/ANNOTATION_SURFACE.md`'s replaced paragraph
correctly retires the old *"most links land on the honest empty-state"* sentence
that this handoff falsified, and keeps the empty state as the annotator's answer
to a hand-typed identifier. No `{{…}}` template residue, no `</invoke>` /
`</content>` harness leak in any created file (`tail`-checked and grepped).
`git diff -w --stat` matches `git diff --stat` to within 2 lines, so nothing is
hiding inside a reformat. `data/inbox/specs/` and `docs/reference/` untouched.

## For the next reviewer

- The overlay gained two **Recurring bugs** entries (the count-free-claim-per-
  block check, and the scratch-`--repo` counterfactual harness), one appended
  sighting on the `VALUE_GUARDS` architectural entry, and the three-tree
  projection-contention rule under "The projections are stale unless you rebuild
  them". Apply the last one *first* next time: print all three provenance stamps
  before reading a `[real]` result, or you will spend the run attributing other
  agents' fields.
- The one thing I could not verify is the handoff's DoD clause naming
  drawing-checker's own mount (`http://127.0.0.1:8000/tolstack/viewer/`) — that
  needs its server up, and it is the item the lesson correctly hands to Jeff. The
  structural equivalent (both apps served as siblings off one static root, the
  probe passing, the flyout driving one panel) is what the browser tier's
  `startRepoRootServer` case measures, and it is green.
