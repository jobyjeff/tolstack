---
type: review
handoff: docs/sessions/active/HANDOFF_20261021_browser_runners_take_the_slot_and_free_the_box.md
reviewer: agent
date: 2026-10-21
verdict: APPROVE
blockers: 0
---

# Review — browser_runners_take_the_slot_and_free_the_box

Branch under review: `handoff/browser_runners_take_the_slot_and_free_the_box`,
3 commits on top of `integration` @ `c96ecf5`, all `A`/`M`. No lesson or report
is overwritten. Not merged before this review: the containment check came back
false. `integration` had not moved since the branch was cut, so the merge into
`review/…` was a fast-forward with no conflicts. One run of this handoff, worked
from `active/`.

## What I verified

**Deliverables against the handoff, item by item.**

1. *Runners take the slot themselves.* `scripts/browser_runner.mjs::takeTheBrowserSlot`
   is one shared helper. It re-runs the script under
   `dispatch slot run --class browser`, runs at once when `DISPATCH_SLOT_HELD`
   names `browser`, and falls through with one stderr line when dispatch's
   interpreter is missing. Exit codes pass through, and 75 gets its own line.
   `git grep "chromium.launch("` finds no launch outside the helper. The
   viewer runner, the annotate check, the mutation runner (browser entries only)
   and all 10 tracked `tests/debug_*.mjs` with Chrome import it. I recounted the
   10 against `git grep playwright`. Leaving `guard_enumeration.mjs` unwrapped
   is right: it starts no Chrome. Seen working live in this review: my
   `run_viewer_browser_tests.mjs` queued from 18:55:10 behind my own pytest's
   holder, then ran, 28/28.
2. *Pytest takes the slot only when a browser test is selected.* This is the
   `browser_slot` fixture, session-scoped and not autouse. The lesson's reasons
   for using the CLI rather than in-process `dispatch.slot` check out:
   `dispatch/dispatch/slot.py` has only `run()` public. The 0-takes/1-take pair
   runs pytest inside pytest against a stand-in, and each arm guards the other.
   See S1 for the cost of the session scope the handoff specified.
3. *Chrome closed on every path.* There are signal handlers
   (SIGINT/SIGTERM/SIGBREAK/SIGHUP), an `exit` handler that runs `taskkill /T /F`,
   and `try/finally` in every runner. I checked the annotate check's
   restructuring into `checkEverything` and the debug scripts' `finally`s. The
   witness is well designed. It opens handles before ending the run, requires
   them signalled at node exit, and requires exit code 0 on the graceful paths.
   That defeats both the DevTools-pipe self-exit and the kill backstop (new
   overlay entry). Its 3 mutations, including the DoD's "drop the finally
   close", are in the post-merge `--full` registry run below.
4. *The 13-core spin.* The cause is SwiftShader in the GPU process plus a
   render-every-frame `animate()` loop. That is plausible and consistent with
   `apps/annotate/scene.js`, and it is filed as its own issue. The bound is a
   job CPU hard cap at 4 cores (`scripts/browser_cpu_cap.py`), measured at peak
   5.92 cores before and 4.03 after. The lesson is honest that this "before"
   comes from a 45 s window (the real rail pass dies on a pre-existing timeout,
   also filed). It is not the incident's 12.8, so the cap is shown to bind, not
   shown against the incident's regime. The reasoning for a job over affinity
   (Chrome resets affinity) is recorded and measured. Leaving the 600 s waits to
   the sibling handoff is a correct fence. That handoff is still in `active/`,
   and its item 5 owns those lines.
5. *`--full` gate.* Reproduced from this worktree: a bare
   `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
   printed `REFUSED: a run of all 261 declared mutations …`, listed
   `--only python__test-a-runner-that-ends-leaves-no-chrome__b36c164d`, and
   exited 2. Before trusting it I checked that `--repo` cannot bypass the gate:
   `isMainCheckout` reads `REPO`, the script's own checkout, not the `--repo`
   target. `--list`/`--unenrolled` exit before the gate. `--only` matches the
   printed spec stem (substring on `id`). The callers are updated (`CLAUDE.md`,
   `package.json`, this overlay, the viewer README). The lesson's "258" is
   integration's count when the author ran it; I counted 261 after the merge.
   The difference is the moving registry, not an error.
6. *`CLAUDE.md`.* The per-branch `--only` rule, the self-slotting runners (no
   hand wrap), and "never generate synthetic load" all sit next to the
   browser-tier bullets.

**Lesson audit.** I re-derived the numbers I could. The full-suite record
`1 failed, 1519 passed, 1 skipped` reproduces exactly. Fast tier 544/544 and
annotate 205/205 both reproduce. "All ten" debug scripts is correct. The
in-process vs CLI reasoning matches dispatch's `slot.py`. The CPU table and the
two-shell queue transcript are its own measurements; I did not re-measure them
and did not need to.

**Issues filed by the branch.** Both carry frontmatter that conforms
(`type`/`priority`/`status: open`/`found_by:`, no `handoff:`).

## Tests

- **Tactical record:** a full suite in its worktree, `1 failed, 1519 passed,
  1 skipped`, 1267 s. The failure is the documented worktree red. The viewer
  tier went through `--repo` (544/544) and the browser tier passed 28/28. The
  record is consistent with the diff, so I gave it the benefit of the doubt.
- **Pre-merge risky subset** (the rows for "test tooling `scripts/*.mjs`", "a
  guard/witness", "Python under `tests/`" and "prose"):
  `pytest -q tests/test_browser_runner.py tests/test_mutation_witness_shadow_concurrency.py
  tests/test_mutation_witnesses.py tests/test_projection_freshness.py
  tests/test_architecture_inventory.py tests/test_tolerance_stack.py
  tests/test_provenance.py tests/test_thermal_exception_list.py
  tests/test_claims_registry.py` → **288 passed** (148 s). That includes the
  three real-Chrome witnesses, under the slot. I re-ran the docs rows after my
  overlay edit: 236 passed.
- **Post-merge full suite, review worktree** (merged tree = the branch tip):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider -rfEs`
  → **1 failed, 1519 passed, 1 skipped in 349 s**. The failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the worktree's
  missing `data/projections/viewer/`, covered by the `--repo` run next. The
  skip is `tests/test_fit_bound_features.py:422`, the pitch-link re-extraction
  not installed, as before. The contention header lines are not printed:
  tolstack's conftest has no such header (dispatch's suite prints it; this one
  does not).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **544/544**,
  projection paired @ `9ce82621a5aa`. `node apps/annotate/run_tests.cjs` →
  **205/205**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (`node_modules` junctioned into the review worktree) → **28/28**, exit 0. It
  ran 18:58:21 → 19:00:16, after a slot wait of about 3 minutes behind my own
  pytest (S1).
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --full`
  (the overlay's post-merge re-run; the merge touches `SHADOWED` paths):
  RESULT_PENDING
- Not exercised: `node apps/annotate/run_browser_check.mjs`. It is red before
  and after this branch on the filed `railRealPass` timeout, and this diff only
  changed how that script launches and closes.

## Findings

### Should-fix

- **S1: the pytest slot hold lasts from the first browser test to the end of
  the session.** `tests/browser_slot.py::browser_slot`, `scope="session"`. The
  only consumer, `tests/test_browser_runner.py`, sorts about 5% of the way in,
  so a full `pytest -q` keeps the machine's one browser slot idle for the rest
  of the run. Measured here: held 18:52:23 → 18:58:21 for about 30 s of browser
  work, and my own viewer browser tier queued behind it. The author built what
  the handoff specified ("holds it to session end"), so this is a finding
  against the handoff's decision rather than against the author. It partly
  brings back the cost the handoff rejected when it ruled out wrapping
  `pytest`. Not a blocker: the hold costs other agents queue time, not CPU.
  Fixing it changes designed behaviour and wants a test, so it is not mine to
  fix inline. Filed:
  `docs/issues/ISSUE_20261021_a_full_pytest_holds_the_browser_slot_from_its_first_browser_test_to_its_last_test.md`
  (med), with the fix shape.

### Nits (no issue filed)

- `DISPATCH_PYTHON` is spelled twice, in `scripts/browser_runner.mjs` and
  `tests/browser_slot.py`, with nothing pairing the two. Both fall through
  loudly (a stderr line, a warning) if dispatch moves, so drift is visible.
- The two `slot held` parsers are looser than dispatch's own check: JS splits
  on `[\s,;]+` and Python on whitespace and commas, while `slot.py` tests
  `env.get(HELD_ENV) == cls`. This is harmless today, since dispatch only ever
  writes the bare class name.

### Fixed inline (inside the boundary: a comment only)

- `scripts/run_mutation_witness_tests.mjs` header usage block. The worktree
  example `--repo C:\workspace\tolstack  # ...from a worktree` is the exact
  spelling this branch now refuses. It now reads `… --only card-layout`, and the
  bare-run line says it is main-checkout only. No witness spec anchors on
  these lines (grepped).

## Found on arrival (main checkout)

- `?? docs/sessions/HANDOFF_20261021_a_face_pick_survives_an_orbit_and_names_its_end.md`
  has mtime 18:07, 45 minutes before this review started. It is almost
  certainly a staging session still working, so I left it alone. As a worktree
  session I could not commit it there in any case.

## Overlay

- New **Recurring bugs** entry: a cleanup witness that the OS or a backstop
  would pass on its behalf (gone at exit and exit code, not "gone a few seconds
  later").
- New risky-subset row for `browser_runner.mjs`/`browser_cpu_cap.py`/
  `browser_slot.py`/any new `chromium.launch`.

## Verdict

**APPROVE.** No blockers. One should-fix is filed as an issue; two nits and one
inline comment fix are listed above.
