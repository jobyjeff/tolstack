---
handoff: annotate_affordances_flyout_and_mesh_gating
date: 2026-09-14
---

# Lessons — annotate_affordances_flyout_and_mesh_gating

## The projection field, as shipped

`scripts/build_topology_projection.py` stamps **every** projected part with

```json
"mesh": { "installed": true, "part_id": "machined_213668" }
```

`{"installed": false, "part_id": null}` where nothing resolved. Two keys, both
always present (`B.MESH_FACT_FIELDS`, hand-copied as `VA.MESH_FACT_FIELDS` and
paired by `tests/test_topology_projection.py`'s `JS_PAIRINGS`).

Three shape decisions the handoff left open, and why:

- **Both keys always, never `{installed: false}` alone.** The handoff suggested
  the short form; a uniform key set is what lets `tests.js`'s key-union guard
  stay a key-union guard, and it means no reader ever has to decide what an
  absent key means.
- **No `via: "direct" | "alias"` field.** It was tempting and it would have
  been a third vocabulary to keep paired. It is also already derivable and
  already visible: `mesh.part_id !== part.id` **is** "the alias table did this",
  and the builder's stdout prints `3D: <part> (alias -> <mesh part_id>)` off
  exactly that comparison. A field no consumer reads is the defect this repo
  logs most.
- **`resolve_mesh` mirrors `AA.resolveMeshIdentifier` including the sha256
  pass**, which a topology `part` id can never hit. Half-mirroring a contract is
  how two copies drift; the pass costs one loop over two meshes.

Where each side reads its inputs: meshes from `<data-root>/meshes/*/provenance.json`
(so the CLI's `--data-root` carries it and a test hands `build()` a tmp tree),
aliases from **`topologies_dir / part_mesh_aliases.json`** — not a repo-root
constant. That is what makes a fixture topologies dir able to carry its own
table, and it is why `test_installing_a_mesh_flips_exactly_that_parts_fact` can
run entirely off tracked files plus `tmp_path`, with no `data/` at all.

## What was rewired to the flyout, and what deliberately stayed a link

Rewired: **both hover cards** (`views/cards.js`'s `annotateLine` now takes an
`{mount, onAnnotate}` pair and renders a button instead of an anchor when both
are present; `topology_app.js`'s `showCard` passes `state.annotateMount` and a
launcher that closes the card, then calls the existing `launchAnnotate`). That
was the whole of the gap — the toolbar and the detail pane were already on the
flyout since `study_3d_flyout`.

Stayed links, on purpose:

- **Everything, wherever `VA.probeAnnotateMount` failed** — file:// without the
  sibling app, a server without the bake. That is the pre-existing degradation
  contract and the browser tier still measures it.
- **`apps/annotate/`'s own internals.** The card hands `VA.annotateExecCommands`
  the same params the link hands `VA.annotateLink`; no new verb, no new param.

## The gating went one level further than the handoff's list, deliberately

The handoff named card / thumbnail / detail-pane. The **toolbar's study launch**
is gated too (`VA.studyHasMesh`: does the study's `selection` name any edge whose
part resolves?). A study none of whose parts has a mesh flies out an empty scene
— the same dead end one level up, and the handoff's title is the rule. One meshed
part is enough: the annotator's `trace` verb already names the missing parts in
its own banner, so a partially-meshed chain is honest, not dead.

The other judgement call: an edge with **no `part` at all** (a clearance/gap
edge) gets nothing, because there is no part to have a mesh and nothing to
isolate. On real data that is exactly one row — `pitch_system`'s
`end_stop_clearance`, untraced, across a clearance — and its link had nothing
to isolate before this handoff either.

## The shared projection is contended, and it bit this session

`stack_title_style_pass` was active in its own worktree and rebuilt
`results.json`/`crops.json`/`topologies.json` from ITS branch while this one was
running. The provenance gate then **refused** this session's rebuild — correctly,
loudly, naming both trees. Rebuilt with `--allow-older-tree` (which only touched
`topologies.json`, this handoff's own file) and left `results.json`/`crops.json`
alone: nothing here changes them, and clobbering them would have destroyed
another live agent's verification for no gain.

Consequence a reviewer will see: **`node apps/viewer/run_tests.cjs --repo
C:\workspace\tolstack` is 293/294**, and the one failure is
`stacks[].description` — a field `stack_title_style_pass` added, which this
branch has never heard of. `C:\workspace\tolstack`'s own clean `master` checkout
fails the same test the same way, which is the proof it is not this branch's.
Filed as `ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`
(`audience: strategy`): the gate fixed silent clobber, but the `[real]` shape
guard's greenness is now a function of who rebuilt last, and neither agent can
fix it without breaking the other.

## Running the browser tier from a worktree (it isn't obvious)

`scripts/run_viewer_browser_tests.mjs` imports `playwright-core`, and Node
resolves that from the **importing file's** directory upward — so from a worktree
it fails `ERR_MODULE_NOT_FOUND` with no hint that the package is one directory
tree over. `node_modules/` is gitignored and exists only in the main checkout.
Running the main checkout's copy instead is worse than useless: it silently tests
the main checkout's *code*, and looks green.

What worked: a junction, made and then removed in the same session —

```powershell
New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules
# ...run the tier, both modes...
(Get-Item <worktree>\node_modules).Delete()
```

**Delete it before you finish.** `rmdir /s` does not follow a junction but
`shutil.rmtree` and several Node removers do, so a junction left behind at
worktree cleanup is a plausible path to deleting the main checkout's
`node_modules`. Use `.Delete()` on the DirectoryInfo (or `cmd /c rmdir`), never
`Remove-Item -Recurse`, which follows it.

## Verified

- `node apps/viewer/run_tests.cjs` **243/243**; `--repo C:\workspace\tolstack`
  **293/294** (the one failure is the cross-worktree `description` above).
- `node apps/annotate/run_tests.cjs` **57/57** (untouched, confirming the
  annotator's command vocabulary was used as-is).
- `node scripts/run_viewer_browser_tests.mjs` **16/16** in both modes, the
  flyout suite now **18/18** sub-checks (was 14): a card's 3D affordance is a
  flyout button, it drives the one panel and closes the card, a meshless part's
  card says nothing about 3D at all, and under `file://` it is a `target=_blank`
  link again.
- `venv-win/Scripts/python.exe -m pytest -q` **781 passed, 1 skipped** (the
  standing `test_viewer_js_suite` worktree skip).
- Real data: exactly **1 of 29** topology parts, and **1 of 21** studies, offer 3D —
  `gas_spring_mount_213668_002`, through the alias to mesh `machined_213668`.
  The builder prints that line; the `[real]` tier's per-part pairing pairs every
  part's fact against whether its component card offers the affordance,
  count-free, so the sibling `assembly_step_part_extraction` handoff growing the
  mesh set needs no edit to *that* test.

  > **Narrowed in review, 2026-09-14.** The sentence above originally claimed the
  > whole `[real]` tier needed no test edit. Two of its three new tests are
  > edge-specific and do name the current mesh set: installing a `hub` mesh —
  > exactly what the sibling handoff will do — reddens
  > `[real] an untraced edge whose part has NO mesh offers nothing at all` for a
  > correct reason (measured in review against a scratch projection). Filed as
  > `ISSUE_20260914_real_mesh_edge_tests_break_when_the_mesh_set_grows.md`.

## What only Jeff's eyes can judge

With drawing-checker's server up, `/tolstack/viewer/topology.html`: pick
`pitch_system`, hover the component cell for `gas_spring_mount_213668_002` →
**view this part in 3D →** should open the side panel, not a tab, and the card
should vanish behind it. Hover any other part's cell (`hub`, `pitch_link`) →
the card should show identity and thumbnail and **say nothing about 3D**.
Then pick study `gas spring branch` → **View in 3D →** still there, still the
flyout; pick `blade angle worst` → **no 3D affordance at all**, because its
chain never touches the one meshed part (measured: 1 of 21 live studies keeps
the launch, and it is the same study the handoff's own click path names).
What is not machine-checkable: whether the button *reads* as the same
affordance as the link it replaces (it is the link's colour, underlined, in the
card's own type), and whether a card with no 3D line looks finished rather than
truncated.
