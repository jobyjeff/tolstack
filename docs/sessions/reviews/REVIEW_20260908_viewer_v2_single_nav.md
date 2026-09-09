---
type: review
handoff: viewer_v2_single_nav
reviewer: agent
date: 2026-09-08
verdict: APPROVE
blockers: 0
---

# Review — viewer_v2_single_nav (loopback)

Loopback review of the fix for the prior REQUEST CHANGES
(`review/viewer_v2_single_nav` `a905a86`). New commit on the handoff branch:
`15fc611` ("wire deliverable 4 (joint block, worksheet) for topology mode").
Merged `handoff/viewer_v2_single_nav` into this review branch — clean merge,
no conflict, no carve-out needed (fast-forward-shaped, `ort` merge commit
only because of the earlier `review:` commits already on this branch).

This is not a tolerance-stack authoring handoff (display/layout only,
building on `topology_schema_v1`'s schema), so mandatory checks 1–7 remain
N/A, as in the prior review.

## What I verified

- **The blocker is fixed.** `VA.jointBlock` (`views/stack.js`) is exported
  and reused by a new `VA.renderTopoJoint` (`views/topology.js`), mounted at
  `#topojoint` above the DAG pane. Confirmed against the real projection:
  `vpa_output_to_pitch_plate`'s joint renders its `assembly_drawing`;
  `pitch_system`'s empty `{}` joint renders "no joint block" rather than
  fabricating one. The worksheet toggle now reads whichever projection is
  current (`loadWorksheet`/`render` in `topology_app.js`) and shows/hides
  based on `worksheet_file`, in either mode; `pitch_system`'s
  `WORKSHEET_end_stop_graft.md` opens and renders. The `checks` third is
  correctly named as an undone, cross-referenced gap (code comment above
  `VA.renderTopoTotals`, README's Worksheets section, and
  `ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`, which
  I read — well-formed frontmatter, correctly explains why it's a projection
  gap and not a viewer-scope one).
- **The false README sentence is fixed.** Grepped the full tree for "topology
  has no worksheet"/"no worksheet of its own" post-fix: no hits. The
  Worksheets section now correctly describes the shared toggle and the
  two-rule `provenance.worksheet` convention as identical between stacks and
  topologies.
- **Guard is not vacuous** (universal check). Disabled the
  `VA.renderTopoJoint(nodes.topojoint, topoProj)` call in a scratch edit and
  re-ran `run_viewer_browser_tests.mjs --repo`: 6 sub-checks failed exactly
  as expected (both the "stays silent" and the "names its assembly drawing"
  assertions, across both `file://` and `http` tiers). Restored the file
  (`git status` clean afterward, confirmed byte-for-byte via `git diff`).
- **Tests, re-run myself:**
  - `node apps/viewer/run_tests.cjs`: **162/162** (was 158/158) — matches the
    commit message.
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **204/205**
    — matches the commit message exactly. The one remaining failure is the
    same pre-existing branch-count race named in the original lesson's §7
    (confirmed pre-existing in the prior review, unchanged here). The second
    failure the prior review caught (`topology_fixtures.js` shape drift) is
    now fixed — confirmed by reading the diff: `joint: {}`,
    `worksheet_file: null`, `worksheet_source: null` added to the fixture's
    one topology, `configuration: {}` added to each of its three studies,
    with an honest comment explaining why it's a hand-patch (source docs no
    longer exist to regenerate from) rather than a re-run of the builder.
  - `venv-win/Scripts/python.exe -m pytest -q`: **681 passed, 1 skipped** —
    unchanged, as expected (no Python touched).
  - `node scripts/run_viewer_browser_tests.mjs` (no `--repo` and `--repo
    C:/workspace/tolstack`): **9/9** both ways.
- **The lesson's corrected counts check out.** §7/§9 now state 197/199 (not
  198/199) for the pre-fix state and 204/205 post-fix, both of which I
  independently reproduced above — the should-fix from the prior review is
  resolved, not just asserted.
- **No data pollution**: worktree `git status` clean after every run; main
  checkout's only untracked item is an unrelated staged handoff file from a
  different session.

## Nits

None beyond what the prior review already covered.

## Overlay

No new failure class surfaced by this loopback beyond what `a905a86` already
recorded (the projection-emits-but-viewer-doesn't-read entry) — that entry
now describes a resolved instance, left in place as-is since the shape is
still worth watching for in future handoffs.

## Verdict

**APPROVE.** All tests green, the blocker resolved with tests that
demonstrably catch a regression, the should-fix resolved, no new findings.
Merging into `integration`.
