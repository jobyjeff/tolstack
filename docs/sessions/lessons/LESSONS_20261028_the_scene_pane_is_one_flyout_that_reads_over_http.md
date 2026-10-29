# LESSONS 2026-10-28 — the_scene_pane_is_one_flyout_that_reads_over_http

## The decision the handoff did not make: a read set, published by the kinematic builder

The handoff said to "probe the same served roots the viewer shell uses". Those
roots could not make a sweep play. drawing-checker's mounts are static file
trees with **no directory listing**, and the annotator *walks* two things a
folder grant lists: the installed meshes, and the published sweep runs. It
also reads two files that no mount reaches at all: the part-mesh alias table
(`docs/topologies/`) and the part names (`data/projections/parts/`). The runs
themselves (`data/inbox/linkage-sweeps/`) are not served either.

The fix needed no drawing-checker change.
`scripts/build_kinematic_projection.py` now also writes
`data/projections/viewer/kinematic/annotate.json` and
`kinematic/sweeps/<run>.json`:

- `annotate.json` is an index of the meshes (as `fsa.js`'s walk lists them),
  the alias table, the part names and the run list (as `AA.sweepRunEntry`
  names them).
- `sweeps/` holds each run byte for byte.

`projections/viewer/` is exactly the directory drawing-checker serves as
`/tolstack/data/` and its hosted bake copies, so the read set reached both the
moment it was built.

It went in the kinematic builder, not a builder of its own. That builder
already reads the sweep inbox and runs last on the rebuild rail, after the
part names it copies. A separate builder would have meant another
projection-provenance writer, another rail step, and the "nine writers" count
in ARCHITECTURE.md. The read set has no stamp gate of its own: it is written
in the same run, after the gate that guards `kinematic_studies.json`.

## Probe order, and what each transport can do

`AA.chooseTransport` → `VA.chooseTransport`, unchanged except that the `http`
candidate is no longer `null`.

| order | transport | wins when | reads | writes |
|---|---|---|---|---|
| 1 | HTTP (`apps/annotate/storage/http.js` wrapping `VA.HttpAdapter`) | `topologies.json` answers ok with a JSON content type, under `../data/` (sibling-data-mount) or `../../data/projections/viewer/` (repo-root-static) | topology + kinematic projections; meshes (`meshesDir`); the read set's meshes/aliases/names/runs. The feature-identity projection is read only on repo-root-static (`identityFile`), otherwise from the folder once granted | through an FsaAdapter writer, **only on a local page** (`VA.isLocalPage`), asked for inside the first bind's click (`existingEventFilenames` → `ensureWriter`). Hosted: a write throws `AA.READ_ONLY_WRITE` |
| 2 | folder grant (`fsa.js`) | nothing served, page local | everything, by walking | yes |
| 3 | none (`UNPUBLISHED`) | nothing served, page hosted | — | — : `AA.HOSTED_NOTICE` |

The HTTP adapter's `canWrite()` is **true** even with no writer. On a hosted
read-only scene the bind controls show, and a press answers in one line.
That is what the handoff asked for, and it is why the old "This transport
cannot write — Connect a read/write folder" note never renders on HTTP.

## Pane heights, measured

Measured on drawing-checker's mounts with the P2 kinematic study: the
document's `scrollHeight` / `clientHeight` inside the iframe.

| pane width | before (base `182be115`) | after |
|---:|---:|---:|
| 400 | 977 / 903 (74 px of scroll) | 915 / 915 |
| 560 | 957 / 903 | 915 / 915 |
| 1200 | 917 / 903 | 915 / 915 |

The clientHeight changed from 903 to 915 because the pane's header strip lost
its Close button. "After" was also measured on **drawing-checker's own
`mount_tolstack()`**: a bare Starlette app on a scratch port, pointed at a
scratch tolstack root through `DRAWING_CHECKER_TOLSTACK_ROOT`, stopped
afterwards. The run there loaded with no grant, 5 parts opened, the sweep
played, and the header said "folder needed".

One finding from the measurement: with the top bar hidden, the old
`calc(100vh - 70px)` stops overflowing and **leaves a 70 px dead strip** at the
bottom instead. So the browser guard asserts "fills the frame" (the bottom of
`.an` equals `innerHeight`) as well as "does not scroll". "Does not scroll"
alone would have passed without the fix.

## What the hosted read-only scene still lacks, and what the bake needs

- **Writes.** By design. A hosted visitor has no repo; a press says so.
- **Bindings.** No mount serves `data/projections/feature-identity/`, so a
  hosted scene, or a loopback one before its grant, shows every element
  unbound. Filed:
  `ISSUE_20261028_the_served_annotator_reads_no_bindings_because_no_mount_serves_the_feature_identity_projection.md`.
  The recommendation there is a drawing-checker mount registered before
  `/tolstack/data/`, the way meshes are.
- **The bake needs nothing new.** `tolstack_mounts()` already copies
  `projections/viewer/` (the read set included) and `data/meshes/`. The hosted
  site gets the scene at the next bake after a rebuild that ran this
  builder.

## Things that cost time

- **The edit guard reads a junction's `-Target` as a write.** Hook rule 1
  refused `New-Item -ItemType Junction -Target C:\workspace\tolstack\data\meshes`,
  because `data/meshes/README.md` is tracked. I copied instead: `cp -r` of the
  projections, the meshes and the sweep inbox into
  `data/scratch/scene_pane/`, about 114 MB. The `node_modules` junction was
  allowed.
- **The scratch repo root needs `docs/` too.** The viewer's `[real]` worksheet
  checks read `<root>/docs/...`. Without it, five checks fail as "worksheet
  must be readable".
- **The working tree is CRLF.** Python `read_text` / `write_text` round-trips
  silently. A JS helper that splits on a `\n` anchor finds 0 matches; the
  witness runner normalises, my helper did not.
- **No pytest-xdist in `venv-win`.** `-n 16 --dist loadfile` is not available
  here, so the default tier ran single-process: 307 s, inside budget.
- **The rail suite's "a real click on the face tints it" raced.** It read the
  colour buffer straight after the click, and was red 2 runs in 3 on this
  branch, green twice on base. Nothing on the pick path changed. The check now
  waits (2 s cap) for the effect it asserts.

## Enrollment

The annotate tier went from 239 to 246. Browser went from 673 to 687: 19
names in, 5 renamed out. Every new name has a spec, except the two
`[real] SKIPPED:` pushes, whose condition is the literal `true`; their pins
were raised with that said in `DECLARED_GUARDS`. Four specs were re-pointed
under new file names, and the no-projection banner's spec got a new anchor.

## Deliberate scope calls

- **Where the error line lives.** The pane's error line is at the top of the
  pane (`#notice`, inside the iframe), not in the shell's nav. Embedded, the
  annotator's rail is invisible: the shell mirrors its rows. Putting the line
  in the nav would have meant a new field in `annotate:tree` and a change to
  `views/nav.js`, which is outside this handoff's file list.
- **What the pane's line shows.** Every `setBanner` kind lands on it when
  embedded: errors, warnings ("pick an element first") and a write's "Wrote …".
  The boot's "loaded N topologies" line is skipped when embedded; the full page
  keeps it.
- **A folder-grant page embedded keeps its top bar.** Its Connect button is
  that page's only way in: a click in the shell cannot open a picker inside the
  iframe.

## Verification, as recorded

Every `[real]` and browser run here read projections from
`C:\workspace\tolstack\data\scratch\scene_pane\` (gitignored). That root
holds copies of `data/projections`, `data/meshes` and
`data/inbox/linkage-sweeps`, with the kinematic projection and read set
rebuilt there from this branch (`ade6ee9c`). It also has `docs/` and `apps/`
copied from this tree, plus `base2/`: a `git archive` of `182be115`, used for
the base comparisons. The shared projections in the main checkout were not
written. Delete the root after the review.

| tier | result | wall time |
|---|---|---:|
| `pytest -q` (worktree) | 1593 passed, 1 skipped (bearing re-extraction not installed), 1 failed: `test_viewer_js_suite`, the by-design worktree red; its tier is the row below | 307 s |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | 594/594 | — |
| `node apps/annotate/run_tests.cjs` | 246/246 | — |
| `node apps/annotate/run_browser_check.mjs` | 80/82: the two mock anchor checks, red on base too (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`) | 34 s |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | 33/34: crop lightbox launcher focus, red on base's full run too (already filed: `ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md`) | 294 s |
| `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo <scratch>` | 47/48 witnessed, 48/95 reached before the 30-min cap, 47 left to the sweep. The one NOT WITNESSED decay predates this branch (`ISSUE_20261028_the_contributor_row_highlight_witness_aborts_before_its_check.md`) | 1798 s |

The budget cap left some of this handoff's new specs to the sweep, among
them all nine of "the scene pane reads over HTTP", the hosted read-only three
and the flyout status check. The
`--only` runs above show their unmutated suites green, but their mutations
were not exercised here. Specs it did witness: all seven annotate specs and
the seam-handle display spec.
