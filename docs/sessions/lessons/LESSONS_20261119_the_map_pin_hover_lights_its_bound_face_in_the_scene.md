# LESSONS 2026-11-19 — the_map_pin_hover_lights_its_bound_face_in_the_scene

## The cause: the check's premise was stale. It was not a product regression or the log

- The page posts the right light. A message probe in the pane showed the
  hover's `light {"hover":{"own":{…"faces":[{"sha256":"e28285d1…","faceId":144}]}…}}`
  arriving the moment the pin was hovered.
- The pane draws it, but late. The pane runs every `annotate:exec` through one
  serial `AA.ExecQueue`. Opening the model posts `isolate parts …`, and
  `scopeToParts` opens the model's parts one by one and then the **rest of the
  mesh store**, inside that one entry. The check's `sceneReady` waits only for
  `listOpenParts().length > 0`, so it hovered while `isolate` was still running.
- Timeline on a quiet box (ms from the pane opening): `isolate` posted at 3000
  and answered at 20898. Hover posted at 15434, drawn at 20945, which is 5.5 s
  against a 5 s wait. On a busy box the same hover waited 34 s, and one mesh
  took 25.5 s to load on its own.
- The binding was not the cause. Event seq 77 (topology edge
  `hub_boss_in_tan_link_mount_pilot`, face 144) still stands, and seq 79 (the
  11-16 Keep) repeats it. Jeff's events 0084–0100 (11-17 evening) do not touch
  the hub.
- No commit touched `apps/` between the green `1f8c6381` and the red
  `69c6f779`. The handoff's suggested `git log` range is empty for code.
  Load-time variance pushed a check that was already marginal past its limit.
  "Deterministic" in the issue meant red three runs in a row on that box. It
  did not mean timing-free: one probe run that added 1.5 s of extra settle
  passed.

## The fix

Before hovering, the check posts `{type: "annotate:exec", id, command:
["scene-view"]}` into the pane and waits up to 180 s for the
`annotate:result` with that id. That result comes back only after everything
the page posted earlier has run. The 5 s light wait and the clause are
unchanged, and the diagnostic line now prints `pane settled <bool> after <ms>`.
The viewer ignores `annotate:result`, so the sentinel has no side effect.

This pattern fits any `[real]` check that asserts what the scene draws right
after the pane opens. A one-open-part check is not "settled".

## Not fixed here (filed)

A real reader sees the same thing: for the first tens of seconds after the
pane opens, a hover lights the tree, grid and map but not the scene. Filed as
`ISSUE_20261119_a_hover_waits_behind_the_pane_opening_its_model_before_the_scene_lights_it.md`
(`audience: strategy`). The staged bind-latency handoff may find the same
queue under its presses.

## Records

- Jeff's log `C:\workspace\tolstack\data\inbox\feature-identity\`: 101 files
  before, 101 after.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the map (the counts"`
  (worktree, main checkout's projections): 28/30 before (the pin-hover clause,
  and once its "pointer leaving" sibling), 30/30 after (`pane settled true
  after 9581ms`).
- Witness `--only` for this guard: WITNESSED in 3m25s, clean run green.
- Fast tiers: `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`
  605/605, `node apps/annotate/run_tests.cjs` 331/331.
- Default tier, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
  in the worktree: `1 failed, 2372 passed, 1 skipped, 4 deselected` in 653.7 s.
  The failure is `test_viewer_js_suite` (the deliberate worktree red, covered
  by the `--repo` run above). The skip's reason was not captured. Over budget
  by 54 s, appended to `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`.
- The handoff asks for the whole browser tier "once at the end with its ledger
  row cited". The repo prompt gives the whole tier to the review, so this
  session ran only the `--only` suite.

## Gotchas

- `git show HEAD:<file> > <file>` restores the content with LF line endings,
  and under `core.autocrlf=true` the file then reads as modified. Use
  `git checkout -- <file>` for your own scratch edits.
- The venv has no pytest-xdist, so `-n 16 --dist loadfile` is refused.
- A probe patch made with `str.replace` hit every copy of a repeated
  snippet: the same pane-open lines are in several suites.
