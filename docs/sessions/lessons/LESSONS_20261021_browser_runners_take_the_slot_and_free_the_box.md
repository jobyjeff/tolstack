# Lessons — browser_runners_take_the_slot_and_free_the_box (2026-10-21)

## What landed, in one paragraph

`scripts/browser_runner.mjs` is the one helper. `takeTheBrowserSlot()` re-runs
the calling script under
`C:/workspace/dispatch/.venv/Scripts/python.exe -m dispatch.cli slot run --class browser -- node <same argv>`
unless `DISPATCH_SLOT_HELD` already names `browser`. It falls through unqueued,
with one stderr line, if that interpreter is missing, and passes the exit code
through (75 gets its own line). `launchBrowser()` caps the Chrome it starts
(below) and installs SIGINT/SIGTERM/SIGBREAK/SIGHUP handlers that close it,
plus an `exit` handler that kills (`taskkill /T /F`) whatever is still open.
Users: the viewer runner, the annotate check, the mutation-witness runner (only
when a selected entry's harness has `startsBrowser`), and all ten tracked
`tests/debug_*.mjs` that launch Chrome. Pytest gets `browser_slot`
(`tests/browser_slot.py`, re-exported by a new `tests/conftest.py`).

## The 13-core spin: the cause, and the bound

**Cause.** The spin is **not in the renderer**. It is Chrome's **GPU process**:
no GPU on this box, so WebGL is SwiftShader (software, multithreaded). And
`apps/annotate/scene.js` renders on *every* animation frame
(`animate = () => { requestAnimationFrame(animate); …render… }`), with no dirty
flag. With real meshes open a frame takes longer than a frame, so the GPU
process never idles. The incident's "renderer" (chrome 37192 ← chrome 21628 ←
node) was the GPU process, a direct child of the browser. Filed:
`ISSUE_20261021_the_annotate_scene_renders_every_animation_frame_whether_or_not_anything_changed.md`.

**Measured** with a 5 s per-process CPU sampler over one slot-held run of
`node apps/annotate/run_browser_check.mjs --real vpa-pitch-p1-20261016-235852`
(below-normal priority, under the slot). The load comes from the real rail pass,
which dies at ~45 s on a pre-existing timeout (filed below), so every run below
is the same ~45 s window:

| run | Chrome cores (5 s samples) | peak | where |
|---|---|---|---|
| before (no bound) | 4.35, 3.91, 5.92, 5.57, 5.01 | **5.92** | gpu-process 3.6–5.7 |
| affinity 0xF + `--in-process-gpu` | 4.67, 6.48, 5.32, 6.37, 6.78 | 6.78 | browser 4.4–6.5 |
| **job CPU hard cap, 4 cores (shipped)** | 3.64, 4.03, 3.89, 4.03, 4.00 | **4.03** | gpu-process 3.0–3.9 |
| the incident (for scale) | — | ~12.8 | — |

**Why a job and not affinity, which looked smaller.** Affinity is inherited, and
Chrome undoes it. Probed: runner node at mask `0xF`; browser, renderers and
utilities born `0xF`; the **GPU process `0xFFFFFFFF`**. With `--in-process-gpu`
the browser process itself went back to `0xFFFFFFFF` once GPU init ran, and
every renderer after it inherited that. So the shipped bound is
`scripts/browser_cpu_cap.py`: after launch it finds the new browser's process
tree (Toolhelp snapshot, ctypes) and puts it in a fresh job with
`JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | HARD_CAP` at `BROWSER_CORES/cpu_count`.
That job nests inside dispatch's slot and session jobs (Win8+). Its limits
survive the script exiting, and later children are born in it. One of Chrome's
utility processes refuses the nested job (ERROR_ACCESS_DENIED, every time,
already in a job of Chrome's own). It renders nothing, so only a refusal by the
*top* browser process warns.

**Not done here, on purpose:** the 600 s `bodies.length > 0` waits in
`realPass`/`captureShots`. Their diagnosis and failure naming are item 5 of
`browser_tiers_name_their_failure_instead_of_aborting` (in `active/` while this
ran), and with the cap a ten-minute wait no longer takes the box. Shortening
them here would have collided with that handoff's edit of the same lines.

## Chrome dies on its own when node does — so a naive witness proves nothing

Measured three times: hard-kill the node that launched an idle Chrome, and all 8
Chrome processes are **alive at the instant node exits** and gone 53–365 ms
later (the DevTools pipe closes). So "no Chrome with that profile a few seconds
later" passes with every close in the runner deleted. The witness
(`tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome`)
opens handles to every process of the runner's profile *before* ending it and
requires them **already signalled when `proc.wait()` returns**. The profile dir
is read off the browser's command line, since every child carries
`--user-data-dir=…playwright_chromiumdev_profile-XXXX`.

The exit handler is a backstop that would hide a missing graceful close. So the
two graceful paths (Ctrl-Break, throw-in-try) also require **exit code 0** from
the browser process: closed, not killed (`taskkill /F` leaves 1).

Mutations checked, each red with its own message (by hand, then as the
python-tier spec `python__test-a-runner-that-ends-leaves-no-chrome__b36c164d`,
**3/3 WITNESSED** through
`node scripts/run_mutation_witness_tests.mjs --only test-a-runner-that-ends --repo C:/workspace/tolstack`,
10 m 41 s, mostly slot wait):

1. the signal handler's `closeEveryBrowser()` dropped: "Chrome … exited 1, so it
   was killed by the exit handler rather than closed".
2. `process.on("exit", killWhatIsLeft)` dropped: "Chrome [3 pids] … was still
   running when its node exited".
3. **the runner's own `finally { await browser.close() }` dropped**: "exited 1 …
   the close this path owns did not happen". This is the DoD's "fails if the
   finally close is removed".

The incident's "Chrome outlived node by 24 min" is consistent with this.
Pipe-close shutdown is quick for an idle page, but a GPU process pinned by
SwiftShader on every core did not exit. The exit handler's `taskkill /T` is
what covers that case now, and the slot job behind it.

## Pytest: the CLI holder, not in-process `dispatch.slot`

`dispatch.slot` has no acquire/release API. `run()` spawns a child and holds the
slot for exactly that child's life, and the lock helpers (`_try_any`,
`_write_note`) are private. Importing it would also put dispatch's venv on
tolstack's `sys.path`. So the fixture runs
`dispatch slot run --class browser -- <this python> -c "print('held'); sys.stdin.read()"`,
waits for `held`, sets `DISPATCH_SLOT_HELD=browser` in `os.environ` (so runners
a test spawns go nested), and releases by closing the holder's stdin.
Session-scoped and not autouse: the first test that asks takes it.

**No pytest test started Chrome before this handoff.** I checked every
`subprocess` call under `tests/`. `test_mutation_witness_shadow_concurrency`
drives the witness runner on a `fast` entry, `test_projection_freshness` on
`--check-shadow-covers-projection-inputs`, `test_mutation_witnesses` only
`guard_enumeration.mjs`. The fixture's first consumer is the new witness. Its
"no browser test selected → never touches the slot" claim is asserted by a
pytest-in-pytest against a stand-in `slot run` that logs each call (0 for a
plain test, 1 for a session with two browser tests).

**`guard_enumeration.mjs` was in the handoff's list and launches no Chrome.** It
spawns only the two fast runners, so it is not wrapped: wrapping it would queue
`pytest -q` behind somebody's hour-long browser run for nothing.

**The mutation-witness runner takes the slot only for a browser entry, and this
is load-bearing.** `test_two_concurrent_runs_against_one_repo_produce_a_named_refusal`
starts two runs at once on a fast entry and needs the second to reach the lock
and refuse. Had the runner always taken the slot, the second would have queued
behind the first instead.

## Queueing, observed

- Two `node apps/annotate/run_browser_check.mjs` started 1 s apart from two
  shells (18:04:43 and 18:04:44):

  ```
  (a) 18:04:43.556  PASS  the page booted into sweep mode with no uncaught error …  real 0m46.799s
  (b) 18:04:44.707  waiting for browser slot held by tolstack/tac-tolstack-browser_runners_take_the_slot_and_free_the_box (pid 27008, 0:01): C:\Program Files\nodejs\node.exe C:\workspace\tolstack-wo...
                    waiting for browser slot held by tolstack/tac-tolstack-browser_runners_take_the_slot_and_free_the_box (pid 27008, 0:31): C:\Program Files\nodejs\node.exe C:\workspace\tolstack-wo...
                    PASS  the page booted into sweep mode with no uncaught error …  real 1m32.031s
  ```

  (Both then hit the pre-existing rail timeout. The queueing is the point.) The
  second's cost is exactly the first's run, ~46 s.
- Nested: `dispatch slot run --class browser -- node apps/annotate/run_browser_check.mjs`
  ran straight through (18:06:35 → 18:07:22) with no wait line from the inner
  runner. A runner that re-execed itself there would wait on its own ancestor
  forever.
- Other agents' slot holds dominated every wall clock today. The three witness
  tests took 500 s of which ~30 s was work. Drawing-checker's `dev_verify` and
  `a_run_still_running…` sessions held the slot for minutes at a time.
- Killing the *wrapper* (`timeout 90 node scripts/run_mutation_witness_tests.mjs --full …`)
  left no node or Chrome behind. Blocked in `spawnSync`, the wrapper can't pass
  a kill on, so the re-run child polls the wrapper's pid
  (`TOLSTACK_BROWSER_SLOT_WRAPPER`) and stops itself. Dispatch's `slot run`
  then closes its job.

## The `--full` gate

- Worktree, no `--only`: `REFUSED: a run of all 258 declared mutations belongs to the batch merge…`.
  It lists `node scripts/run_mutation_witness_tests.mjs --only <spec stem>` for
  each spec added or changed against `integration`: `git diff --name-only
  --diff-filter=AMR integration...HEAD` plus uncommitted/untracked under
  `scripts/mutation_witnesses/`. That is derivable. Shown with a throwaway
  untracked spec, which printed `--only zz_probe_only`. Exit 2.
- "Main checkout" = `.git` is a directory. A worktree's is a file, and an
  archive has none (also refused).
- What it does **not** derive: guards whose *checks* changed while their spec
  didn't. Those still need `--only` by name. The refusal says so when there are
  no touched specs.
- Callers updated: `CLAUDE.md`'s batch-merge line and `package.json`'s
  `test:mutations` now pass `--full`. `docs/prompts/REVIEW_AGENT.md`'s
  post-merge re-run passes `--full` (that run is the whole registry on purpose,
  and its argument stands). Its per-diff row is `--only "<guard>"`.
  `apps/viewer/README.md`'s worktree example is `--only`.
- **Overlap to know about:** `mutation_tier_gates_on_every_pin_and_survives_a_board_move`
  (staged) owns `scripts/run_mutation_witness_tests.mjs` per the sibling
  handoff's fence. This handoff's edits there are one import, `spawnSync`/
  `statSync`, the `startsBrowser` field on the browser harness, and one block
  just above the run IIFE. A rebase should be mechanical.

## For the drawing-checker and forge ports

- Copy the **shape**: one helper, slot re-exec at the top of every entry point,
  launch through the helper, and a **session fixture, not a wrapped `pytest`**.
- **Don't reach for affinity.** Chrome resets it. A job CPU cap works, and the
  better home for it is dispatch's slot job
  (`dispatch/docs/issues/ISSUE_20261021_the_browser_slot_could_cap_its_jobs_cpu_so_every_repo_gets_the_bound.md`,
  filed). If that lands, the per-repo cap script can go.
- A runner that only spawns other runners should take the slot **only when it
  will start a browser**, or concurrency tests built around it will deadlock or
  serialise.
- A witness for "closes Chrome" must assert *gone at node exit*, not *gone a
  few seconds later*, and must check the exit code where a kill backstop
  exists. Otherwise it is green with the close deleted.
- Python heredocs on this box mangle `\r\n` and `\\` (this session lost two
  regexes to it). Write patch scripts to a file, or use the Edit tool.

## Found while doing it (filed)

- `ISSUE_20261021_the_annotate_checks_real_rail_pass_times_out_on_the_element_list_head.md`.
  The annotate check (no flags) dies in `railRealPass` on `.an__rail .el-head`.
  It reproduced on the unmodified tree in this session's first baseline run.
- `ISSUE_20261021_the_annotate_scene_renders_every_animation_frame_whether_or_not_anything_changed.md`.
  The root cause the cap bounds.
- `dispatch/docs/issues/ISSUE_20261021_the_browser_slot_could_cap_its_jobs_cpu_so_every_repo_gets_the_bound.md`.
  Written into dispatch's main checkout as a new, uncommitted file, the one
  write a worktree session may make there. Dispatch's next triage commits it.

## Full-suite record

All in the worktree `C:\workspace\tolstack-worktrees\browser_runners_take_the_slot_and_free_the_box`,
at the commit before this lesson (code unchanged since). Every browser tier
took the slot by itself: none was wrapped by hand.

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider -rfEs`:
  **1 failed, 1519 passed, 1 skipped, 1267 s.** The wall clock includes slot
  waits behind other agents for the three new Chrome witnesses. The failure is
  the documented worktree red, `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
  (no `data/projections/viewer/` in a worktree; the tier is covered by the
  `--repo` run next). The skip is `tests/test_fit_bound_features.py:422`: the
  2026-10-01 pitch-link re-extraction is not installed in `data/`. It was
  there before and is untouched here.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **544/544**,
  node-fs `[real]` tier ran (projection paired with this tree @ `9ce82621a5aa`).
- `node apps/annotate/run_tests.cjs`: **205/205**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (main checkout's `node_modules` junctioned in for the run, then the link
  removed): **28/28 suites, no SKIP line, 219 s**, under the 4-core cap. The
  2026-10-20 lesson's uncapped run was 157 s. Different load, different hour,
  but the cap plausibly costs ~a third on this tier.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only …`
  for every spec whose mutation patches a file this branch changed:
  `test-a-runner-that-ends` **3/3**, `every-suite-prints-the-registry-key`
  **1/1**, `test-the-mutation-shadow-covers` **1/1**. The full registry was
  **not** run: that is exactly the per-branch run this handoff stops. The batch
  merge's `--full` covers it.
- `node apps/annotate/run_browser_check.mjs`: **red, pre-existing.** All mock
  checks pass, then `railRealPass` times out on `.an__rail .el-head` (filed
  above). It reproduced on the unmodified tree, and the 2026-10-20 lesson had
  it at 67/67, so it broke between then and this branch's base.
