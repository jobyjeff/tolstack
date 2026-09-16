---
priority: med
depends_on: [mutation_witness_tier_repair]
model: opus
---

# HANDOFF 2026-09-15 — annotate_hosted_page_posture: make the whole annotate page as honest as its banner

Source: triage sweep 2026-09-15, consolidating two bugs filed out of
`surfaces_that_state_something_false` (completed 2026-09-15). Baseline: trunk
after the 2026-09-15 batch merge, **plus** `mutation_witness_tier_repair`
merged. Scope: `apps/annotate/` (`app.js`, `index.html`, its config and views)
and the `testAnnotateHostedPosture` suite in
`scripts/run_viewer_browser_tests.mjs`. Do NOT touch `apps/viewer/topology.js`,
`apps/viewer/views/`, `apps/viewer/tests.js` or `apps/viewer/README.md`
(`respine_tween_fidelity_round2` and `viewer_value_guard_rows_and_replays` own
those), and do not re-litigate the viewer-side origin policy — that is an open
strategy question, see below.

**Why `depends_on: mutation_witness_tier_repair`:** that handoff single-sources
the browser tier's suite labels and adds the missing `expect_red`↔tree pairing.
This handoff renames and adds sub-checks inside `testAnnotateHostedPosture`,
which is exactly the edit that silently orphans a `scripts/mutation_witnesses.json`
entry today. Landing the pairing first means your renames redden a
millisecond-scale pytest instead of a ~7-minute browser sweep somebody runs
later. Both handoffs also edit `scripts/run_viewer_browser_tests.mjs`.

Read both issues in full — they carry the measured element-by-element state:

- `docs/issues/ISSUE_20260915_the_hosted_annotate_page_still_instructs_the_reader_to_bind_a_face.md` (bug, med)
- `docs/issues/ISSUE_20260915_annotate_banner_renders_a_terminal_command_for_the_user_to_copy.md` (bug, med)

## Deliverables

1. **The hosted page must not instruct the reader to do what it has just said
   is unavailable.** Measured in real Chrome on a non-loopback origin
   (`--host-resolver-rules=MAP hosted.tolstack.test 127.0.0.1`, the technique
   `surfaces_that_state_something_false` added to
   `scripts/run_viewer_browser_tests.mjs`), serving this repo's tree at
   `/apps/annotate/index.html`. `#banner` correctly reads *"Annotating is not
   available on this site — …"*, `#connect-btn` is `display: none` and
   `#transport-sub` is empty. Below that honest sentence the page still shows:
   - the detail pane's **"Pick an element on the left, then click a face in the
     3D view to bind it."** — instructions for a 3D view that, on this origin,
     genuinely does not exist (`AnnotateScene` is deliberately never
     constructed, so there is no canvas at all);
   - `#topology-select` and `#study-select`, visible and empty;
   - `#console-input` + `#console-run` ("Run"), visible and **live** —
     `main()` wires them before the hosted early-return.

   The rule to apply is the one this app's own fast-tier check already asserts
   about the notice: **a feature that is absent shows nothing about itself** —
   the same rule that removed the mesh-less link
   (`annotate_affordances_flyout_and_mesh_gating`) and the folder picker. Bring
   the page around the notice under it. Note that none of this chrome is new;
   what changed is that the page now *knows* and *says* it cannot annotate,
   which turned unreachable instructions into contradicted ones. Decide per
   element whether "shows nothing" means removed from the DOM or replaced with
   the one honest sentence's continuation, and say which rule you applied where
   — a hosted reader with an empty, live console is the item most worth arguing
   about, because a wired-but-useless control is a different defect from a
   misleading hint.

2. **The "no projection" banner must not render a terminal command.**
   `apps/annotate/app.js`'s `loadAll()` does:

   ```js
   setBanner("No topology projection found. Build it: " + AA.CONFIG.rebuild.topologies, "warn");
   ```

   which puts `venv-win\Scripts\python.exe scripts\build_topology_projection.py`
   on the page for the user to copy. That is the exact shape Jeff ruled out for
   every repo's web surface: **never render terminal commands in a web UI** —
   wire the action to a button/endpoint, or degrade to plain words.
   `apps/viewer/`'s `views/banner.js` docstring records the 2026-09-10 sighting
   and the decision that followed; this app's banner was not in that pass.
   `AA.CONFIG.rebuild` holds two such strings (`topologies`, `bindings`) and the
   first is rendered.
   A button would be better but needs a rebuild endpoint this app has no
   transport for (`docs/issues/ISSUE_20260910_annotate_has_no_http_read_transport.md`,
   triaged to `docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md`),
   so **plain words are the honest interim**: the projection has not been built
   in the connected folder, and that is a thing done in the repo, not on this
   page. Then answer, in the lesson, whether `AA.CONFIG.rebuild` should keep
   holding the command strings at all once nothing renders them — and if you
   remove them, check nothing else reads them first.
   Repro for the banner: serve the app (`ops.toml`'s serve verb), connect a
   folder whose `data/projections/viewer/topologies.json` does not exist, read
   the banner.

## Out of scope — do not decide these here

Three sibling findings from the same handoff are `audience: strategy` and are
routed to `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`:
whether the **viewer** should withhold its three 3D affordances on a hosted
page, whether the viewer should offer an FSA picker on a **loopback** origin
(`VA.isLocalPage` is passed no hostname by `topology_app.js`, deliberately), and
whether `views/banner.js`'s `state.error` line on the UNPUBLISHED branch is dead
code to delete or a deliberate defence. Your changes are confined to
`apps/annotate/`, where the posture is already decided; leave the viewer's
asymmetry exactly as it ships.

## Definition of done

- The hosted-origin browser check (`testAnnotateHostedPosture`, run with the
  `MAP hosted.tolstack.test 127.0.0.1` resolver rule) asserts, element by
  element, that nothing on the page instructs an action the page has said is
  unavailable — covering at minimum the detail-pane hint, the two selects and
  the console input/button. Paste the suite's printed sub-checks into the
  lesson.
- A local-origin run of the same app is unchanged: the annotator still works
  end to end on `file://` and on loopback, with the full 3D pane, selects and
  console. Name the check that proves it.
- The "no projection" banner contains no backslash-path, no `python.exe`, and no
  command of any kind, with a check pinning that (a substring assertion on the
  rendered banner text is enough, and matches how `apps/viewer/` pinned its
  own).
- `venv-win/Scripts/python.exe -m pytest -q` green (baseline 880 passed,
  1 skipped); the fixture tier and the annotate runner green.
- Lesson (`docs/sessions/lessons/LESSONS_20260915_annotate_hosted_page_posture.md`):
  the per-element rule you applied and why (removed vs reworded), what you
  decided about `AA.CONFIG.rebuild`, and anything you found on the hosted page
  that you deliberately left alone because it belongs to the origin-posture
  brief.
