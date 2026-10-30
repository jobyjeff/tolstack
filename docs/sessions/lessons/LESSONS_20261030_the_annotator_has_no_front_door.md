# Lessons — the_annotator_has_no_front_door (2026-10-30)

`apps/annotate/index.html` is the shell's embedded pane and nothing else. Opened
without `?embedded=1` it redirects to `../viewer/topology.html` carrying
`topology`, `study`, `edge`, `kinematic` (from a `sweep`+`kinematic` link) and
`mock`, plus `pane=1`; the shell reads `pane=1` and opens the 3D pane once the
selection is applied and the annotate mount is known (`openWantedPane`,
`topology_app.js`). The drawing-checker mount `/tolstack/annotate/` still serves
the pane's document.

## What the handoff did not say, and what I decided

- **The shell needed one new param.** "Lands on the shell with the pane open"
  has no existing word: the shell had deep-link params for the selection and
  nothing that opens the pane. `?pane=1` is that word (viewer change beyond "the
  one link", flagged here because the handoff fenced `apps/viewer/`).
- **Params that do not travel.** `isolate`, `trace` and `t` are dropped (the
  pane re-derives them from the selection); a bare `sweep=<run>` with no
  `kinematic` has no shell word and lands on the shell's default selection with
  the pane open. A `sweep`+`kinematic` link rides as `kinematic=<study>`, the
  shell's own page for one.
- **A second link went too: the pane header's "↗" (open the whole annotator).**
  Not named in the handoff, but it is the same door ("the full annotator" is on
  the handoff's list of sentences to remove), and removing it had a side effect
  worth knowing: it was the first focusable element in the flyout `<dialog>`, so
  its removal moved the dialog's initial focus onto the drag divider and drew its
  accent hairline at rest (the browser tier caught it as the "no seam" check).
  The title (`#flyout-title`) now carries `tabindex="-1" autofocus` as a quiet
  first target.
- **Three more links still build the old URL** (edge detail's "annotate this →",
  the citation card, the kinematic contributor row) — filed, not touched
  (`ISSUE_20261030_the_viewers_other_links_still_name_the_annotator_page.md`).
- **The Connect-folder flow stays.** A pane booted non-served on loopback
  (no HTTP projections, FSA available) still needs it. The `.topbar` holds only
  that button now.

## `app.js`: kept and deleted

| | what | why |
|---|---|---|
| deleted | `el.topologySelect`, `el.studySelect`, `onchange` handlers, `renderTopologyPicker` (→ `selectFirstTopology`), `syncSelectTitle`, the select writes in `selectTopology`/`selectStudy`/`wholeTopology` | the dropdowns are gone; the shell's rows run `select-topology`/`select-study` |
| deleted | `el.autoSetup*`, `renderAutoSetup`, its call in `cmdAutoFilter` | the "Set up automatically" menu (setting and verb stay; see issue) |
| deleted | `el.console*`, `runConsoleCommand`, `AA.commandHint`, `AA.COMMAND_HINT_PREFIX` | the command box; `window.AnnotateApp.exec` and `annotate:exec` are the doors |
| deleted | `wireRailResize`, `AA.clampRailWidth`/`readStoredRailWidth`/`writeStoredRailWidth`/`RAIL_WIDTH_*`, `PREF_KEYS.railWidth` | the rail's drag handle; the shell draws the rows |
| deleted | `el.transportSub` writes, the standalone branch of `setBanner`, the "loaded N topologies" banner line, `EMBEDDED` and every `if (EMBEDDED)` | one posture: the pane |
| deleted | `AA.PARTS_COPY.noStudies` | only the study dropdown said it |
| changed | `highlight`'s "no binding" note: console line → `window.__lastHighlightNote` | the console was the only reader; a harness reads the note |
| added | `AA.shellUrl` (commands.js, pure, node-tested), `SHELL_URL` guard at module top and `if (!SHELL_URL) main()`, `window.__selection` (read-only: which topology/study) | the redirect; the browser checks read the selection off the handle instead of the dropdown values |
| kept | the rail itself (hidden, mirrored by `postEmbedTree`), parts panel, `#notice`, hint bar `#detail` (the sweep bar lives in it) and its display-settings panel, `#banner` (the hosted sentence), `#connect-btn` and the folder flow, `?mock=1`, `?autotest=1`, deep-link params (first boot of the iframe) | the pane's own boot needs them |

`index.html` lost the title, `#transport-sub`, the auto-setup `<details>`, both
`<select>`s, `#rail-handle` and the console; `style.css` lost `.an__resize`,
`.an__auto*`, `.an__console*`, `.topbar h1/.sub/__spacer`, the rail `select`
rules and the `body.an--embedded` lines hiding what no longer exists.
`body.an--embedded` stays as the one posture (always set) rather than flattening
the CSS — flattening was not needed to delete anything.

## Checks re-targeted

Every check that opened the page bare now opens it `?embedded=1` (the pane's own
document, top level); only `AA.shellUrl`'s node test opens it un-embedded.

- `apps/annotate/run_browser_check.mjs`: all 11 gotos; the rail-resize pass is
  now "the rail names what it lists" (the drag/clamp/remember checks went, the
  hover-reachability and studyless-head checks stayed, the study-select checks
  read `window.__selection`); `#banner` reads → `#notice-text`.
- `scripts/run_viewer_browser_tests.mjs`: 24 `url + "?` and 5 template gotos, plus
  the hosted-posture/served ones; suites touched by content, not just URL —
  `annotate flyout` (trace narration on the notice; file:// degradation is "no
  3D affordance"; the full-page link is gone), `annotate sweep rail` (no
  topology-lock check, "no element list and no scope bar"; bind-rail snapshot
  regenerated), `annotate top bar + entry context` (the switches are driven by
  the `auto-filter` verb and read from the stored setting), `annotate hosted
  posture` (the pickers and console assertions are gone; the Connect text now
  lands on the notice line), `the scene pane reads over HTTP`, `3D pane
  follows the selection` (`__selection`, `__lastHighlightNote`).
- `tests/debug_flyout_and_alerts.mjs`, `debug_reader_facing_second_pass.mjs`,
  `debug_typography_pass.mjs`: the URL only (hand-run tools, not run here).
- `apps/annotate/run_tests.cjs`: the console-placeholder, arrival-menu markup and
  rail-width checks replaced by "no standalone furniture" and the `shellUrl` check.
- `apps/viewer/tests.js`: the two checks that expected the toolbar link now
  expect none.

**The honest caveat.** The rail is `visibility:hidden` in the pane by design (the
shell mirrors it), so a Playwright script cannot click its rows on the pane's own
document. Both browser runners add a test-only stylesheet to **top-level** pages
(`window.parent === window`) that lays the rail out visibly the way the old
two-column page did. The pane inside the shell's iframe — what ships — is never
touched; the shell tier drives that. This is a harness choice, stated so nobody
reads "no test opens it un-embedded" as "no test shows the rail".

## Witnesses

Retired: `command box`, `rail width`; the arrival-menu markup check had none.
Renamed with their spec (git mv + `expect_red`): six browser guards. Re-anchored:
`resting on a contributor row with no binding` (the note moved from the console
to `__lastHighlightNote`) and `with no folder control anywhere` (the transport line
is gone; the mutation now shows Connect on a served pane). Added with a spec: the
two annotate guards and the two fast viewer guards. `DECLARED_GUARDS` re-measured
(fast names, annotate 265, browser 765/732). The browser guards added or reworded
without a spec are in `ISSUE_20261030_new_browser_guards_of_the_front_door_handoff_have_no_spec.md`.

## Found on arrival / pre-existing

- `annotate/run_browser_check.mjs` has two red checks on integration before this
  change (`the mock's bound face moves its node…`, `the anchors message…`) —
  already filed as `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`.
- The main checkout's `annotate rail filter + face deselect` showed one failed
  sub-check ("a real click on the face tints it") on a baseline run made while
  this worktree's suites ran concurrently; it passed in this tree every time.
  Treat as load-sensitive, not caused here.
- The two `test_mutation_witness_shadow_concurrency` tests failed in my first
  pytest run in this worktree (stale lock-pid handling); see the verification
  section for whether they reproduced.

## Gotchas for the next agent

- Editing here through a shell heredoc mangled `\n`, `\r`, `\b` escapes inside
  Python source (a `scripts\rebuild…` in `ops.toml` became a carriage return;
  caught only by `git diff --stat` showing 151 changed lines for a 10-line edit).
  Build backslashes with `chr(92)` and check `git diff --stat` after every
  scripted edit. Several worktree files are CRLF with an LF index — preserve each
  file's own ending.
- `node_modules` does not exist in a worktree; I linked it from the main checkout
  (a directory junction, git-ignored) to run the viewer browser tier and removed
  the link before finishing.

## Verification record (worktree, not the main checkout)

- `venv-win/Scripts/python.exe -m pytest -q` (main checkout's interpreter, no xdist
  in this venv), worktree, 324 s, run under contention with the browser tier:
  1684 passed, 1 skipped, 2 failed. The failures: `test_viewer_js_suite` (red in
  any worktree by design) and an ARCHITECTURE.md quantifier ("3D" in the new
  inventory row) fixed afterwards -- the affected files re-run green (22 passed).
  The two `shadow_concurrency` tests that failed in the first run passed in the second.
- `node apps/annotate/run_tests.cjs` 265/265; `node apps/viewer/run_tests.cjs`
  511/511 with the node-fs tier SKIPPED (no projection in a worktree).
- `node apps/annotate/run_browser_check.mjs`: 97/99, the two failures being the
  already-filed anchor checks (red on integration too).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, full,
  from the worktree: 35/37; the two reds were a hand-edit of mine (`.an__console`
  read in the 3D-pane suite, fixed) and a load flake in `crop lightbox`; both suites
  green on re-run alone.
- Witnesses `--changed-since integration --repo C:/workspace/tolstack`: 63/70
  witnessed, 70/72 reached in 30m38s (2 left to the sweep by budget). The 7 not
  witnessed: 4 fast entries because the node-fs tier was red in the shadow tree
  ("projection NOT paired with this tree" -- a worktree fact), 2 `[real]` browser
  entries that need the projection, and one that was MINE: the "canvas runs to
  the right edge" mutation, hidden by the harness's own column layout -- re-anchored
  on the scene column and WITNESSED. My two new fast specs were WITNESSED when run alone.
  Not run: the node-fs tier, the `[real]` tier and a main-checkout merge-gate run
  (`rebuild_projections.ps1` first); the batch merge owns those.

## Numbers

Lines removed: ~570 deleted vs ~250 inserted in `apps/` alone at the last count
(`git diff --shortstat integration`).
