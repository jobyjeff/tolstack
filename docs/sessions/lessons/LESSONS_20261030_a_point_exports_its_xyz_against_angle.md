# LESSONS 2026-10-30 — a_point_exports_its_xyz_against_angle

## What was built

`apps/viewer/sweep_export.js` — one classic script, `window.SweepExport`, loaded
by both apps. DOM-free builder (`exportablePoints`, `buildCsv`, `fileName`) plus
one control (`renderControl`: an "Export points" button, searchable checkbox
picker, two orientations, Download). Wired into the kinematic results pane
(`views/kinematic.js`, fed by `ctx.readSweep` in `topology_app.js`) and the
annotator's sweep bar (`sweepExportSource` in `annotate/app.js`).

## Answers the handoff asked for

- **Exportable points on the product model:** the published P2 run carries 5
  joints → **10 joint ends** (P1: 8, S: 4). Bound features with a fitted nominal:
  **0** — `data/inbox/feature-identity/` holds proposals only, no standing binding,
  so the annotator's `extras` path (a `bound` anchor put through its subject's
  pose at every sweep point) has only a unit test, never a live one.
- **A bound feature on a body the sweep does not pose:** none exist today. The
  extras path takes the anchor's own `subject`; a node whose body is not posed
  gets its as-modelled point at every row (`AA.modelWorldPoints`), i.e. a constant
  column — correct for ground, silently constant for an unposed moving body.
  Nobody has bound one, so this is unmeasured, not fixed.

## Decisions not in the handoff

- **The viewer offers the control only where the transport has `readDataJson`**
  (the served mount). On file:// / folder-grant the control is absent rather than
  explained. The run file is read from `kinematic/sweeps/<run_id>.json`, which
  the kinematic projection already publishes for the annotator.
- **Viewer joint-end labels carry no part name**; the annotator's do (it knows
  which body rides each end). The viewer would have to repeat the pose math to
  say, and "the viewer computes nothing".
- **Frame sentence is read out of the artifact's own `frame` text** (regex on
  "the one … coordinate frame (…)"), not retyped; fallback is a fixed phrase.
- Column naming is `<joint>_<a|b>_end_X/Y/Z`, not the hand sheet's
  `plate_end`/`mount_end` — a joint end's a/b is the artifact's own words.
  tan_link **b** = plate end, **a** = mount end; pitch_link **a** = plate end.
- Values are printed at the hand sheet's decimals (3 mm; 3/3/4 for the angle
  columns). All 80 rows × 12 columns agree with
  `linkage/data/runs/vpa-pitch-p2-20261016-235852/tan_link_attachment_xyz.csv`
  (0 mismatches, checked by script against the published artifact).

## Gotchas

- `apps/viewer/tests.js` runs everything after line ~13094 inside the `[real]`
  freshness `else`; a new pure test belongs **before** `var nodeFs`, or it
  silently never runs in a worktree.
- In a worktree the browser tier needs `node_modules` (main checkout only). I
  used a directory junction and removed it afterwards; ESM ignores `NODE_PATH`.
- Source files are CRLF; `tests.js`/the runner edits must keep that.

## Not shown

- The annotator's sweep-bar control was not driven in a browser (the annotator
  suites need its mesh store); only the pure load-order/commit check runs there.
  The same module is what the viewer's browser check exercises.
- The viewer `[real]` fast check and the full node tier could not run green in
  this worktree (projection built from another tree → deliberate red). See the
  report for what ran where.
