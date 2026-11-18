---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_the_map_is_the_only_drawing_and_classic_retires.md
reviewer: agent
date: 2026-11-18
verdict: APPROVE
blockers: 0
---

# Review: the_map_is_the_only_drawing_and_classic_retires

Reviewed `handoff/the_map_is_the_only_drawing_and_classic_retires` at
`15fb19b8`: seven commits on `integration` `f8f8df1e`, 344 files, +2,775 /
−19,673. It was not already merged: containment was checked first. The
integration branch had not moved, so `git merge` fast-forwarded and the
trees before and after the merge are the same. My inline fixes are
`cb6aeb6b`. Everything below ran on `cb6aeb6b` (tree `91319c1b`) unless it
says otherwise.

## What I verified

- **Every model draws a map (deliverable 1).** `computed_map_places` and
  `load_topology_map` match the handoff: each body a column in declared
  order, top-level parts in tree order, a loose column, and one column when
  there are no bodies. An authored file overrides the places and nothing
  else. Four new or changed Python tests pin this. The map's JS reads
  `topoProj.map` either way. v1 shows in the branch's shots
  (`v1_3840_both`, `v1_3840_dag`), read by eye: it draws whole and no boxes
  overlap.
- **Classic is gone (deliverable 2).** `git grep` finds no live reference to
  `dagDrawingFor`, `topologyHasMap`, `DAG_DRAWING*`, `renderDagSwitch`,
  `fitDagTo`, `railsSvg`, `animateTopoPane`, `interface_glyphs` or
  `INTERFACE_GLYPHS` in `apps/` or `scripts/`, outside comments and tests
  that assert the absence. `interface_glyphs.js` is gone from both loaders
  and from `run_tests.cjs`. The control table matches the bar in
  `after_bar.png`.
- **The grid does not change (deliverable 3), re-derived independently.** I
  served the baseline tree (`git archive f8f8df1e`) and the merged tree
  against one scratch projection built from this branch. I read
  `#topogrid tr.tvrow` as text. v2 has 56 rows, v1 99, v1 with
  `pitch_link_shank_out` 6, and v1 with `pitch_system_blade_angle_worst` 12.
  Each list is **identical row for row**. My row selector counts fewer rows
  than the lesson's probe did (57 / 100 / 10 / 16). The identity holds
  either way.
- **The suites (deliverable 4).** A name diff of `enumerateGuards` between
  `f8f8df1e` and HEAD gives these numbers. Fast tier: 140 names gone and 19
  new, so 121 deleted and 19 renamed, matching the lesson and the 722 → 601
  pin. Browser tier: 209 gone and 76 new, a net −133, matching the 907 → 774
  pin. The runner no longer seeds Classic.
- **Docs and issues (deliverables 5 and 6).** `DAG_TOPOLOGY.md`'s "The map"
  is now the description of the DAG region. `CLAUDE.md`'s sentence was
  rewritten. `ISSUE_20261114_…` is resolved and the 11-16 issue's rows are
  updated. Three new issues carry correct frontmatter. Jeff's review page
  has the "After Classic retired" section: shots, bar before and after, the
  control table, and the v1 question for him.
- **Feature-identity log:** 84 files when I arrived, 84 at the end. The main
  checkout was clean on arrival and is clean at the end.
- **The lesson's arithmetic.** I re-derived the guard counts, the spec-file
  counts and the grid identity. Two corrections, both made inline (below).

## Tests

The scratch root was built from this branch, unlike the main checkout's
projections, which were built from `master`:
`data/scratch/cr_rv`. It holds inbox, meshes and the non-viewer
projections copied in, plus all eight builders run from the review worktree
with `--data-root`. Every stamp is at `15fb19b8`, none of them dirty.

- **Risky subset = the full post-merge run.** The merge was a fast-forward,
  so the pre-merge tree is the post-merge tree. After my inline edits I
  re-ran `tests/test_mutation_witnesses.py`,
  `tests/test_viewer_readme_doc_facts.py`,
  `tests/test_viewer_deep_link_contract.py` and
  `tests/test_architecture_inventory.py`: **70 passed**.
- **Default pytest tier** (review worktree, at `15fb19b8`):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`
  gave **2116 passed, 1 skipped, 1 failed in 443 s** (ledger: default,
  inside budget). The one failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
  documented worktree case ("node-fs tier -- no projection at …
  worktree/data/projections"). The fast tier below covers it. This repo's
  conftest prints no contention header lines.
- **Viewer fast tier:**
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/cr_rv`
  gave **601/601**. Its pairing line: "projection paired with this tree …
  @ 15fb19b86d98".
- **Annotate fast tier:** `node apps/annotate/run_tests.cjs` gave
  **324/324**, with no SKIP lines.
- **Whole browser tier:**
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack/data/scratch/cr_rv`
  gave **45/45 suites, 960 checks, 1603 s**. The runner wrote its own ledger
  row: `2026-11-18T02:21:11Z`, tier merge, sha `cb6aeb6b`, tree `91319c1b`,
  inside budget. The tactical run was 45/45 and 960 checks at `6b7f732e`.
- **Witness gate:**
  `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration --budget-min 10`
  gave **exit 0, 3/3 witnessed**, with 191 of 194 entries left to the sweep
  (budget). One entry,
  `fast__a-feature-row-selects-its-node-…__c5a1c9bc#1`, took 15m54s in the
  runner. Applying the same mutation by hand to an export of HEAD makes the
  fast tier fail in **29 s** (600/601, the named check red), so the guard
  does not hang. The time went to a runner or contention stall, not to the
  diff. The entries this branch wrote or re-pointed were witnessed by the
  tactical agent with `--only`: 25 entries, all witnessed, ledger row
  `2026-11-18T01:34:32Z`. That run and the anchor pairing in
  `test_mutation_witnesses.py` are what I rely on for them. The remaining
  191 are the sweep's.

## Findings

### Should-fix (filed, not blocking)

1. **`scripts/filmstrip.mjs`'s built-in scenarios all time out.**
   `bootKinematic` waits for `#topopane svg.tv__rails`, which nothing draws
   any more. Their probe also reads `rail__bar--on` and `.tv__zoomsizer`.
   `CLAUDE.md` tells every viewer handoff to film transitions with this
   tool. A custom `--scenario` that does its own setup still works. The fix
   means re-pointing scenarios at the map, a behaviour change in a tool, so
   it fails the inline prongs.
   Filed: `ISSUE_20261118_the_rails_left_residue_in_live_code_and_filmstrips_built_ins_wait_for_them.md`.
2. **Rails residue in live code** (same issue):
   - `topology.css`'s two `.tv__rails` rules.
   - Two helpers this diff orphaned: `VA.blockColumns` and
     `VA.kinematicPoseLengths`.
   - About ten comments that still describe the rails, leaders, respine or
     `interface_glyphs.js` as live, including `views/topology.js`'s file
     header and `map.js:82`.
   - About twenty hand-run `tests/debug_*.mjs` probes that wait for
     `svg.tv__rails`.
   Each is small, but together they are a rewrite of descriptions I would
   have to judge, so I filed them rather than editing.

### Nits

- The review page's shots `v1_3840_both` and `v2_3840_both` were taken at
  `6b7f732e`. They still show the old empty-study line ("…highlighted on the
  rails…") and the old Preview line ("Point at a dot, a bar or a row…"). Both
  strings were fixed in `88d2c9d1` and are correct in the tree. Only the
  pictures are stale.

### Fixed inline (all three prongs: no behaviour change, no test needed, a few lines)

- `apps/viewer/README.md` line 8: "draws the rail diagram + grid" now reads
  "draws the map + grid".
- `apps/viewer/README.md` line 163, the `study=<id>` deep link: "emphasized
  on the walk (chain lit, the rest dimmed …)" is now "selected (the grid on
  the chain's rows, the totals …, the 3D pane's unlit parts dimmed)". The
  map lights no study; that is the route the handoff fenced out.
- `scripts/guard_enumeration.mjs`: the fast pin's comment said "26
  renamed". The name diff gives 19.
- The lesson's "Witness specs 962 → 825" is 824 at `15fb19b8`, because
  `15fb19b8` retired one spec after the count was taken. I added a
  correction blockquote.

## Checklist upkeep

I extended the overlay's "a retired guard leaves live documents still
promising it" entry. When a surface retires, also grep `scripts/*.mjs` (the
filmstrip case) and count `VA.<name>` references on the base and on HEAD to
find helpers that lost their last caller.

## Verdict

**APPROVE.** The deliverables are met, the grid identity was re-derived
independently, and every tier is green on the merged tree. The two
should-fixes are filed.
