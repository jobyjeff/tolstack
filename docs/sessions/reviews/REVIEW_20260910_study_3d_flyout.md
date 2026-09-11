---
type: review
handoff: study_3d_flyout
reviewer: agent
date: 2026-09-10
verdict: APPROVE
blockers: 0
---

# Review — study_3d_flyout (per-study 3D trace + annotator as viewer flyout)

One commit (`9aa477f`) on `handoff/study_3d_flyout`, cut from the current
`integration` tip — a clean fast-forward, no conflict, tactical worktree clean
(nothing to commit on the author's behalf). The work is viewer/annotate app
code plus docs: **no stack, no element values, no tolerance numbers** — the
seven mandatory stack checks are addressed below as explicit N/As, not
skipped silently.

## The mandatory checks

1. **Every tolerance traces** — N/A. The diff introduces no element, no
   `source_ref`, no numeric value with provenance semantics. The one number-
   like constant added is `GHOST_OPACITY = 0.22` / `MARK_COLOR` in
   `scene.js` — rendering style, not measurement.
2. **Signs on every path term** — N/A, no term list touched. The no-JS-
   arithmetic corollary was checked instead: the new viewer code
   (`probeAnnotateMount`, `annotateExecCommands`, flyout launch, both view
   branches) performs no arithmetic on any projection field.
   `AA.faceSubGeometry`'s index arithmetic is mesh geometry (annotate side,
   pixel/geometry class), combines no element values, and throws on the
   contract violation rather than drawing wrong.
3. **LMC/MMC direction** — N/A, no elements.
4. **RSS computed** — N/A, no checks.
5. **Nominal inside min/max** — N/A.
6. **Quantised constraints** — N/A (no hardware). The *analogous caveat*
   requirement is satisfied where it lives: a binding is identity, not a
   value source, and both new affordances' tooltips and the README restate
   it ("select + tag, no measurement").
7. **Traced ratio** — not applicable to this diff; no document in the diff
   quotes a ratio, so nothing to re-derive.

## What was verified (evidence, all re-run by me)

- **Suites, merged tree (this worktree):**
  `node apps/annotate/run_tests.cjs` **53/53**;
  `node apps/viewer/run_tests.cjs` **209/209** bare and **255/255** with
  `--repo C:/workspace/tolstack` (real tier ran);
  `node scripts/run_viewer_browser_tests.mjs` **14/14** browser checks in
  both modes (worktree-mock and `--repo C:/workspace/tolstack`), including
  the new `annotate flyout` suite (14/14 sub-checks);
  `pytest -q` **759 passed / 1 skipped** (worktree; the standing
  data-dependent skip). Every count matches the lesson's.
- **Main checkout (`master`) pytest: 750 passed / 1 failed** —
  `test_viewer_js_suite_is_green`, re-run standalone and read: master's
  `fixtures.js`/`topology_fixtures.js` lag the shared projection's
  `checks`/crop-summary fields written by integration-side builders, plus
  the known stale four-forks test
  (`ISSUE_20260908_pitch_system_four_forks_test_is_stale_not_a_race.md`).
  Same shape the previous review recorded (commit `3031405`); not caused by
  and not fixable from this branch (this handoff adds no projection fields
  at all — the viewer never reads `bindings.json`, by design).
- **The new layout guard was observed failing.** The handoff's central
  constraint — opening the flyout cannot shrink/reflow the DAG pane — is
  guarded only by the browser tier's box-measurement sub-check. Scratch-broke
  `dialog#annotate-flyout`'s `position: fixed` → the run failed exactly
  "opening the flyout moves the DAG pane by nothing at all" (13/14), then
  reverted. The guard bites and names the right thing.
- **The verb-table pairing needs no manual extension**: it derives both sides
  (`commands.register(...)` calls in app.js vs the README table's backtick
  spans), so the three new verbs (`ghost`, `mark-face`, `trace`) are paired
  automatically; its own can-fail replay (synthetic `teleport` verb) is in
  the suite. 13 verbs registered, table agrees.
- **Real-data claims in the lesson re-derived** by running
  `AA.planStudyTrace` myself over the main checkout's live
  `topologies.json` + installed meshes + shipped alias table:
  `pitch_system_gas_spring_branch` → **1 ghost** (`6d5b1321…` via the alias
  table), **4 missing parts** (same four names), **0 marks, 7 unbound
  edges**; `data/projections/feature-identity/bindings.json` confirmed
  absent (the honest all-unbound state is the real state). Exact match.
- **Command-layer discipline** (the "expect a third parallel path" entry):
  the postMessage listener routes everything through `AA.exec`; `cmdTrace`
  composes `cmdSelectTopology`/`cmdSelectStudy` by direct call, the same
  shape `cmdGoto` already uses; no UI control or boot path mutates
  `state`/`scene` outside a `cmd*` handler. `resolveMeshIdentifier` accepts
  raw sha256s, so `trace` re-driving `ghost` with plan sha256s resolves.
- **Degradation is probed, not assumed**: `VA.probeAnnotateMount` requires ok
  + `text/html` (the catch-all-server trap), degrades under `file://` and
  absent fetch, injects a **bound** fetch at the call site (the
  `viewer_http_transport` unbound-fetch lesson applied); both fast-tier
  branch tests and the browser tier's real `file://` degradation pass.
- **Flyout state survives re-render**: `#annotate-flyout` and its iframe are
  static-HTML siblings of the render roots (the `viewer_rebuild_affordance`
  lesson's shape), so the probe's post-paint `render()` upgrade cannot
  destroy the panel.
- **Hygiene**: `data/inbox/specs/` untouched (no data paths in the diff);
  nothing written into drawing-checker (no d-c path in the diff, no pipeline
  run this session; the d-c mount itself landed via its own merged handoff,
  out of scope per the handoff's do-not-touch list); no junk dirs left by the
  runs (no `workspace*data` strays; worktree `data/` still tracked-docs
  only); no harness artifacts (`</invoke>`, `{{`) in created files; file
  tails clean; `ops.toml` change is comment-only, verb set closed;
  both filed issues carry correct frontmatter (`feature`/`med`/`open`,
  `feature`/`low`/`open`+`audience: strategy`), and the classic-stack
  issue's claim "views/stack.js renders no annotate affordance" verified by
  grep (zero matches).
- **Sibling landings**: `HEAD..master` is board/issue bookkeeping only (the
  ordinary master-lag shape); nothing code-bearing landed in parallel.

## Findings

**Blockers: none.**

**Fixed inline (both comment-only, within the three-prong boundary):**

1. `apps/annotate/run_tests.cjs` — the pairing-test preamble said "The ten
   verbs are hand-documented in three places"; the handoff itself takes the
   count to 13. Made the sentence count-free (the stale-count family; the
   pairing test itself owns the number).
2. `apps/viewer/viewer.js` — `annotateExecCommands`' comment claimed the
   mirror with `annotateLink` is "paired by tests so they cannot drift".
   tests.js pins each side separately over today's param shapes; a param
   added to one function alone fails nothing. Reworded to say exactly what
   the tests do and don't catch, and added an overlay entry for the shape
   (two hand-mirrored carriers of one vocabulary).

**Nits (no action required, recorded for the record):**

- The un-ghost-on-`isolate`/`open-part` behavior (a real design decision the
  lesson highlights) has no machine check: app.js is structurally outside
  the fast tier and the browser tier doesn't reach scene material state.
  Consistent with the handoff's "test what the tiers can reach"; Jeff's
  click path covers it visually.
- If `loadAll()` throws *after* a successful connect, queued flyout commands
  wait forever with no reply (the `whenLoaded` gate only resolves on
  completion or the empty-projection branch). The failure is visible in the
  annotator's own banner, and the viewer today sends fire-and-forget, so no
  practical harm; worth knowing if a future consumer starts awaiting
  `annotate:result`.

## Note for the next reviewer

The lesson's "headless WebGL works on this machine" paragraph is real and
re-confirmed (the browser tier rendered the three.js scene and ran `trace`
end-to-end over `?mock=1`, twice, both modes) — stop repeating the "cannot
drive the annotate app in a test" folklore. What genuinely remains manual:
visual quality (ghost opacity, mark colour), OrbitControls feel, anything
behind an FSA grant. Jeff's one manual pass is spelled out at the end of the
lesson and is still worth doing before leaning on the flyout in review work.
