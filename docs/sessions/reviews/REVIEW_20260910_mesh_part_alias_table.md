---
type: review
handoff: HANDOFF_20260910_mesh_part_alias_table
reviewer: agent (review/mesh_part_alias_table)
date: 2026-09-10
verdict: APPROVE
blockers: 0
---

# Review — mesh_part_alias_table

One commit under review (`c6a5a11`, committed by the author — no
on-their-behalf commit needed). Merged into the review branch cleanly (ort, no
conflicts); `HEAD..integration` was empty at merge time, so no sibling landed
underneath. Verdict: **APPROVE, no findings.** Nothing fixed inline, nothing
filed.

## The mandatory checks (1–7)

The work is not a tolerance stack — no stack JSON, no element, no term, no
worksheet changed — so checks 1–6 and the traced ratio exit as not
applicable. The overlay's own scoping sentence says they bind "when the work
under review is a tolerance stack"; this is annotate-app plumbing plus a
tracked config artifact. What carries over is the spirit of check 1, because
the handoff itself says so: **an alias is an identity claim and needs
evidence.** That is audited below as the core of this review.

## The identity audit (the review's center of gravity)

The table ships **one alias**: `gas_spring_mount_213668_002` →
`machined_213668`. I re-verified the evidence chain myself, both sides, from
the primary files, not the lesson:

- **Topology side**: `docs/topologies/topology_pitch_system.json`'s part
  entry carries `drawing: "213668-002"`, `revision: "A.1"`, name
  "MOUNT, GAS SPRING, PROPELLER 213668-002" — exactly as the entry's
  `evidence` string claims.
- **Mesh side**: the main checkout's
  `data/meshes/6d5b1321…f549cf/provenance.json` records `part_id:
  "machined_213668"`, source STEP `213668-002_2026-07-23_Released.stp`,
  label "213668-002 MOUNT, GAS SPRING (single solid)" — exactly as claimed.
- The drawing number 213668-002 appears **independently** on both sides
  (authored topology vs. rotorkit tessellation provenance), which is a real
  identity argument, not a name-similarity guess.

The negative claims re-derived too:

- **"zero exact matches"** between the two vocabularies: recomputed over all
  5 `topology_*.json` files (29 part ids) against the 2 installed meshes'
  part_ids — intersection is empty. Confirmed.
- **`blade_oml` left unmapped**: `blade_root`'s own note says "Part identity
  not established" — the lesson's refusal to map it is correct, and mapping
  it would have been the invented identity the handoff forbids. Confirmed.
- The demonstrated deep-link edge exists: `gas_spring_mount_position` in
  `pitch_system` carries `part: gas_spring_mount_213668_002`. Confirmed.

## Universal checks

- **Tests don't pollute production data.** The new `[real]` tiers *read*
  `data/meshes/` and write nothing; `git status` clean after runs, no stray
  `workspace<repo>data` dirs. Pass.
- **A new guard has been observed failing.** All four new guard surfaces
  broken in scratch and observed red with the right message:
  - bogus `topology_part` →
    `test_every_topology_side_key_is_a_live_topology_part` fails naming
    `no_such_part` and pointing at `docs/topologies/`;
  - bogus `mesh_part_id` →
    `test_every_mesh_side_value_matches_an_installed_meshes_part_id` fails
    naming the pair and listing the installed part_ids (and it **ran** in the
    worktree — the absolute main-checkout fallback works, it did not skip);
  - same bogus entry → the node `[real]` check fails (42/43) naming the
    alias and the remediation;
  - a sha256 as `mesh_part_id` →
    `test_every_entry_is_complete_and_the_topology_keys_are_unique` fails
    with the map-to-part_id rationale.
  The anti-vacuity guard (`…extraction_is_not_vacuous`) protects the
  topology-side pairing from an empty scan; the mesh-side test carries its
  own `assert installed` anti-vacuity clause. Pass.
- **Hand-restated counts.** The lesson's suite lines recomputed exactly:
  `node apps/annotate/run_tests.cjs` **43/43** (with the `[real]` alias check
  running, not skipped) and pytest **759 passed, 1 skipped** in the review
  worktree (the 1 skip is the pre-existing `test_viewer_js_suite` worktree
  skip, as the lesson says). "Zero exact matches" is derived and dated;
  "5 topology files → the other four topologies" recounted (5 on disk). No
  stale figure found. Pass.

## Also verified

- **Scope fence held.** The diff touches nothing in `apps/viewer/`, no
  projection builder, and no `topology_*.json`/`study_*.json` — the new file
  in `docs/topologies/` is the handoff's own suggested home, and the lesson's
  claim that the topology globs are prefix-scoped (so the alias table is
  invisible to them) is proven by the green suite with the file present.
- **`commands.js` stays DOM-free and fetch-free**: the table is injected as a
  third parameter; loading lives in `app.js`'s `loadAll()` through a new
  storage-contract method implemented in **both** adapters (fsa + memory) and
  documented in `adapter.js`. There is no third adapter to miss. A missing
  table resolves to `null` → `[]` (never an error), matching the README.
- **Precedence as specified**: direct sha256 → direct part_id → alias table →
  null. The fixture tests deliberately alias keys that also match directly,
  so precedence inversion would be caught, and substring/fuzzy matching is
  pinned out in both directions.
- **No parallel state path** (command-layer architectural entry): the only
  call-site changes are inside existing `cmd*` handlers and
  `resolveMeshOrThrow`; no direct `state.scene` mutation added.
- **Docs**: `data/meshes/README.md` gains the install-time rule (alias, never
  rename) as deliverable 5 asked; the annotate README's now-false "nothing in
  this repo maps one to the other yet" sentence was caught and rewritten by
  the author — exactly the doc-drift class this repo tracks.
- **No harness artifacts / placeholders** in any created file (`</invoke>`,
  `<parameter`, `{{` — all absent).
- **drawing-checker untouched** (no interaction of any kind in this diff);
  `data/inbox/specs/` untouched; `docs/reference/` untouched.
- **Main-checkout suite**: not separately runnable for this branch —
  `C:\workspace\tolstack` sits on `master`, which will not contain this work
  until the operator's batch merge. The environment-sensitive halves (the
  data-reading `[real]` tiers) were exercised from the worktree against the
  main checkout's real `data/meshes/` via the absolute-path fallback, which
  is the exact path a worktree session will take.

## Findings

None. No blockers, no should-fixes, no nits worth the ink.

## Note for the next reviewer

The alias table is now a third vocabulary surface (topology `part` ids,
mesh `part_id`s, and the bridge). Its two pairings are structural and were
observed failing, so drift is loud — but the **evidence strings are free
text** and only a reviewer can re-walk them. When the table grows an entry,
re-verify the claimed drawing-number chain against both primary files the way
this review did; a fluent evidence sentence over a wrong pair is exactly the
invented-identity failure the table exists to prevent, and no test can see it.

Overlay not edited this review: no new failure class surfaced (clean run
against the existing checklist).
