---
priority: med
depends_on: [viewer_unwitnessed_surface_guards]
model: opus
---

# HANDOFF 2026-09-16 — js_guards_and_suite_isolation: two JS guards that certify a constant instead of the behaviour, and a browser suite that is red alone and green in a full run

Source: the 2026-09-16 dispatch triage sweep, dispositioning three open issues
in `docs/issues/`, all filed by 2026-09-15 sessions:

- `docs/issues/ISSUE_20260915_worst_verdict_ranks_by_an_unguarded_object_key_order.md`
  (bug, med; filed out of `viewer_study_verdicts_and_gaps`)
- `docs/issues/ISSUE_20260915_the_no_projection_banner_guard_pins_the_constant_not_the_call_site.md`
  (bug, med; filed out of `reviews/REVIEW_20260915_annotate_hosted_page_posture.md`)
- `docs/issues/ISSUE_20260915_annotate_flyout_suite_is_red_alone_and_green_in_a_full_run.md`
  (bug, med; filed out of `mutation_witness_tier_repair`)

Baseline: `master` after the 2026-09-16 batch merge, which measured **1155
passed** on `venv-win/Scripts/python.exe -m pytest -q`,
**407/407 passed, 0 skipped** on
`node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`, **65/65** on
`node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`, and **19/19**
browser suites on `node scripts/run_viewer_browser_tests.mjs`. (Issue 1 quotes
`367/367` for the viewer fast tier — that was measured on the 2026-09-15 tree,
before the batch merge. Use 407 as your starting line and say so if it differs.)

Scope: the `VA.worstVerdict` unit-test section of `apps/viewer/tests.js`,
`apps/annotate/run_tests.cjs`, and `testAnnotateFlyout` in
`scripts/run_viewer_browser_tests.mjs` (defined via the `SUITES` entry at line
4264) plus whatever row-identity code deliverable 3's investigation lands on.

**Why `depends_on: [viewer_unwitnessed_surface_guards]`, in one line:**
deliverable 1 adds checks to `apps/viewer/tests.js`, which
`HANDOFF_20260916_viewer_unwitnessed_surface_guards.md` owns wholesale this
sweep — it is the handoff that rewrites the `VALUE_GUARDS` (line 7485) and
`TOPO_VALUE_GUARDS` (line 9957) registries and the `SUITES` run loop, and two
branches editing those would conflict in one file and one array.

Do NOT touch, each with a named owner:

- The `VALUE_GUARDS` and `TOPO_VALUE_GUARDS` registries and the `SUITES` loop
  itself — `viewer_unwitnessed_surface_guards`. Your deliverable-1 test is a
  new standalone fast-tier check, not a registry row.
- `apps/viewer/viewer.js` and `apps/viewer/topology.js` —
  `HANDOFF_20260916_reader_facing_copy_and_vocabulary.md`. Deliverable 1 is
  test-only; `VA.worstVerdict`'s behaviour is **correct today** and must not
  change.
- `VA.renderTopoPane`'s box stack, sticky rails, drag grips and preview pane in
  `apps/viewer/views/topology.js` — `HANDOFF_20260916_topology_grid_scroll_and_grips.md`.
  Deliverable 3 may touch the row-identity path in that file if that is where
  the cause lives; it may not rework the pane layout.
- `scripts/run_mutation_witness_tests.mjs` and existing entries in
  `scripts/mutation_witnesses.json` —
  `HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md`. Append to
  `mutations[]` only if a deliverable below says so.
- `tolerance_stack/`, `tests/test_*.py`, `scripts/build_*_projection.py` —
  `HANDOFF_20260916_python_value_and_schema_pins.md` (its deliverable 1 owns
  `VERDICTS` in `tolerance_stack/stack.py` and the two test-side literals).
- `docs/reference/`, `data/inbox/specs/`.

## Why these three are one handoff, and why the other four issues of this sweep are not

Triage's first hypothesis was that six of the seven issues in this batch were
one cluster — *a value or domain pinned in the wrong place or not at all*. On
theme that reads well; **on files it is wrong**, and files are what makes a
merge conflict. The split that holds is by tier:
`HANDOFF_20260916_python_value_and_schema_pins.md` takes the four that live
entirely in `tolerance_stack/stack.py`, `tests/test_tolerance_stack.py` and
`scripts/build_topology_projection.py`; this handoff takes the three that live
in JS and the browser tier, where none of those files appear and where every
file is under a staged owner.

Within this handoff, deliverables 1 and 2 are the *same defect shape in two
apps*: a guard that certifies a named constant and never pairs it to the call
site that renders or ranks it. Deliverable 3 is genuinely a different animal —
a shared-state/order dependence in the browser tier — and it is here because it
is the third JS-tier issue and because splitting it out would make a
single-deliverable handoff whose only real cost is investigation time. Read it
as two halves: two guard repairs, then one root-cause hunt.

## THE BINDING REQUIREMENT, and it applies to every deliverable below

**Every guard this session adds must be demonstrated reddening on a planted
mutation, and the plant must then be reverted.** Plant the exact edit the
deliverable names, run the named tier, copy the failing sub-check line
**verbatim** off the output, revert the plant, re-run, confirm green at the
baseline count. A guard nobody has watched fail does not count as done and must
not be reported as done.

This is not ceremony, and in this handoff it is the actual subject. tolstack has
a measured, repeatedly-filed class of **guards that survive their own
mutation**: five issues from five different review sessions inside one window
(2026-09-11 to 2026-09-15), three of them found only because a reviewer mutated
the code by hand and noticed the suite stayed green.
`scripts/mutation_witnesses.json`'s own `about` block records that count. Both
deliverables 1 and 2 below **are** members of that class — each was found by
planting an edit and watching a full green tier report it as covered. Writing a
replacement guard without watching it fail would reproduce the exact defect
being fixed.

## Deliverables

1. **Pin `VA.worstVerdict`'s ranking, which today rests entirely on an
   unguarded object key order.**
   `VA.worstVerdict` (defined at `apps/viewer/viewer.js:202`, called from
   `apps/viewer/topology.js:461`) picks a study's rollup verdict by
   `Object.keys(VA.VERDICTS).indexOf(check.verdict)` and keeping the **highest**
   index — i.e. it reads "worst last" off the insertion order of the object
   literal `VA.VERDICTS` at `apps/viewer/viewer.js:167`. That insertion order is
   the whole of the severity rule, and it is the one thing the new
   Python/JS pairing does not check: `tests/test_js_python_vocabulary.py`'s
   comparison in
   `test_the_js_status_table_spells_exactly_what_python_enumerates` is
   `set(expected) == set(actual)`, so **any permutation of the three keys is
   green**. (Note: the issue cites `apps/viewer/topology.js` as the definition
   site. It is not — that file holds the call. Confirmed 2026-09-16.)
   **Measured** in `review/viewer_study_verdicts_and_gaps` by reordering
   `VA.VERDICTS` to `fail, marginal, pass` — a plausible edit, being both
   alphabetical and "worst first" to match how the CSS block below it is
   written: `pytest -q tests/test_js_python_vocabulary.py` → **13 passed**, and
   the viewer fast tier → **367/367 passed**, while `worstVerdict` now returns
   the *best* verdict. Two live studies have two checks each —
   `pitch_system_end_stop_minus7` and `pitch_system_end_stop_plus72`, both
   `marginal` + `pass` — so with the reversed order each rolls up as **PASS** on
   the nav rail and at the head of the totals strip. A study with a marginal
   check reporting a clean pass is the exact misreading the rollup badge was
   added to prevent. Nothing catches it downstream either: the `[real]` nav test
   asserts only that at least one `.tvverdict--fail`, `--pass` and `--none`
   exists somewhere on the rail, and with 11 fails and 4 passes live that still
   holds.
   *Fix shape, from the issue:* a fast-tier unit test on `VA.worstVerdict` in
   `apps/viewer/tests.js` — `["pass","fail"]` → `fail`, `["marginal","pass"]` →
   `marginal`, `["pass"]` → `pass`, `[]` → `null`, an unknown word ignored.
   Three or four assertions, no data, no product change. The issue notes an
   order-sensitive variant of the Python pairing would also work; it is the
   heavier change, `tests/test_js_python_vocabulary.py` is owned by
   `reader_facing_copy_and_vocabulary` this sweep, and the ranking is a JS
   behaviour — so it belongs in the JS tier. Do not do both.
   *Mutation to plant:* the exact reordering above — `VA.VERDICTS` to
   `fail, marginal, pass` — then `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`.
   The new check must redden. Revert. `tolerance_stack/stack.py`'s `VERDICTS`
   docstring already records this order as load-bearing and points at the issue;
   do not edit that docstring (that file belongs to the Python handoff).

2. **Pair the annotator's no-projection banner constant to the one call site
   that renders it.**
   `annotate_hosted_page_posture` (2026-09-15) removed the terminal command
   from the "no topology projection" banner and pinned it two ways in
   `apps/annotate/run_tests.cjs`: `assertNoCommandOrPath(AA.NO_PROJECTION_NOTICE, ...)`
   at line 413 — an assertion on the **constant** — and `AA.CONFIG.rebuild === undefined`
   (line 423) plus a static scan of `app.js` for the string `CONFIG.rebuild`
   (line 430) — an assertion on the **supply route that produced the original
   bug**. Nothing pins that `loadAll()`'s no-projection branch actually renders
   that constant. The check's own comment claims the guard closes the hole
   (*"a check on the sentence alone would pass again the moment somebody
   re-adds `"Build it: " + a command`"*), but removing `CONFIG.rebuild` closes
   only the `CONFIG` half of it; a bare string literal at the call site is the
   other half, and it is **one character cheaper to write than the original
   defect was**.
   **Measured** (review, 2026-09-15): `apps/annotate/app.js:741` — which today
   reads `setBanner(AA.NO_PROJECTION_NOTICE, "warn");` — restored to the
   pre-handoff shape with the command inlined instead of read from config, and
   `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` returned
   **65/65 passed**. `pytest` cannot see it (the copy is JS) and the browser
   tier cannot either: no suite reaches the connected-folder-with-no-projection
   state, which needs a real File System Access grant. So the defect that
   handoff was written to remove returns verbatim with **every tier green**.
   *Fix shape, from the issue:* the handoff's own DoD asked for "a substring
   assertion on the rendered banner text". The rendered banner is expensive to
   reach; the call site is not, and the existing check already reads `app.js` as
   text for the `CONFIG.rebuild` scan. Three lines inside that check:
   ```js
   if (!appSource.includes("setBanner(AA.NO_PROJECTION_NOTICE")) {
     throw new Error("loadAll()'s no-projection banner no longer renders AA.NO_PROJECTION_NOTICE");
   }
   ```
   *Mutation to plant:* the measured one — inline the command string at
   `app.js:741` in place of the constant — then
   `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`. The check
   must redden. Revert, confirm 65/65.
   *On declaring a standing witness:* the annotate fast tier **cannot** own a
   `scripts/mutation_witnesses.json` entry today
   (`ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`,
   which `mutation_witness_tier_reaches_its_checks` is fixing in parallel). So
   do **not** append an annotate entry to `mutations[]` in this session — it
   would be a dead entry. Record in the lesson that this guard's witness is
   pending on that handoff, and name the `find`/`replace`/`expect_red` strings a
   future session should use, verbatim, so declaring it is a copy-paste.
   **Why this generalises, and say it back in the lesson:** a guard on a named
   constant certifies the constant, never that the surface reads it. Whenever a
   handoff's answer to "the copy must not say X" is to lift the copy into a
   constant so a testable tier can see it, the lift is what moves the assertion
   away from the defect — ask what pairs the constant to its one call site.
   Deliverable 1 is the same shape with a key order in place of a sentence.

3. **Find the shared state that makes the `annotate flyout` suite pass in a
   full run and fail alone. Do not make "run it in full" the answer.**
   `node scripts/run_viewer_browser_tests.mjs --only "annotate flyout"` aborts
   before any sub-check runs:
   ```
   [annotate flyout (repo-root mount + file:// degradation)] ERROR: locator.click:
     Error: strict mode violation: locator('tr.tvrow[data-id=\'arm_pin_to_tip\'] .tvcell--name')
     resolved to 2 elements:
       1) <td title="arm pin to tip" class="tvcell tvcell--name">pin to tip</td>
       2) <td title="arm pin to tip" class="tvcell tvcell--name">pin to tip</td>
   0/1 browser checks passed (--only "annotate flyout")
   ```
   The failing line is `scripts/run_viewer_browser_tests.mjs:3213` (the same
   locator recurs at 3279 and, with a different child, at 1508).
   `arm_pin_to_tip` is a **fixture** edge (`apps/viewer/fixtures.js:414`,
   `demo_mechanism`), so this is the `?mock=1` page rendering that row twice —
   two `tr.tvrow` with the same `data-id`, which the page's own row identity
   says cannot happen. **Whatever produces the second row is the defect;** the
   strict-mode violation is only the first thing to notice it.
   Measured 2026-09-15, Chrome 152.0.7977.83 via `channel: 'chrome'`: the full
   19-suite run bare with the projection present → **19/19**, `annotate flyout`
   **18/18**; `--only "annotate flyout"` six times → **1 pass, 5 ERROR** as
   above; `--only` against `integration` (`git archive integration` into `tmp/`,
   app source from there, `--repo` at this tree) → **ERROR, byte-identical
   message**. So this is **not** caused by `mutation_witness_tier_repair` —
   that branch only changes how the suite receives its label.
   `data/meshes/` present or absent makes no difference (both states observed
   failing), so the missing-mesh hypothesis is out. Two prior issues in this
   suite were wait-predicate transients
   (`ISSUE_20260911_annotate_flyout_banner_check_samples_a_transient.md`,
   resolved); this one is not — five reproductions in six.
   **This is order dependence or shared state, and that is what you are looking
   for. The fix is to find the state, not to mandate that the suite always runs
   in a full run.** "Green in a full run" is not the same claim as "green", and
   a suite that only passes with fifteen other suites ahead of it is not a
   suite, it is a coincidence. An instruction in the runner or the README
   telling people not to use `--only` on it is an explicitly rejected outcome.
   *Leads, in the order the issue recommends eliminating them:* a render that
   runs twice on the mock boot (the second row is a second render, not a second
   edge — the projection has no `arm_pin_to_tip` at all and `fixtures.js`
   declares it once; `tr.tvrow` is minted in one place,
   `apps/viewer/views/topology.js:976`); the repo-root server's page being
   loaded before its first paint settles; and state carried in the shared
   `browser` object across suites.
   *Why this is worth med and not a flake nit:* the mutation-witness tier runs
   suites **one at a time** — that is the entire purpose of
   `mutation_witnesses.json`'s `suite` field ("so one mutation costs one suite
   rather than a full run"). A suite that only passes in a full run cannot carry
   a declared witness at all: the runner's clean run comes back RED and every
   entry naming it is reported `SKIPPED: the tier is already red with NO
   mutation applied`. Today no entry names `annotate flyout`, so it costs
   nothing yet — and `annotate_hosted_page_posture` is staged against that very
   area, so the moment someone declares one it is a dead entry with a confusing
   message.
   *Proof obligation:* `--only "annotate flyout"` must pass **six consecutive
   times** (the same count that established the failure), and the full run must
   still be 19/19. Then plant a mutation that reintroduces the duplicate row —
   whatever the cause turns out to be, inverted — and show the suite reddening
   on it **when run alone**. Revert.

## Definition of done

- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` green at
  **407/407 plus deliverable 1's new check(s)**; state the new number.
- `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` green at
  **65/65 plus deliverable 2's check**; state the new number.
- `node scripts/run_viewer_browser_tests.mjs` → **19/19**, AND
  `node scripts/run_viewer_browser_tests.mjs --only "annotate flyout"` →
  passing, six runs in a row, output counts quoted.
- `venv-win/Scripts/python.exe -m pytest -q` still **1155 passed** — this
  session should not move that number. If it does, something crossed into the
  Python handoff's scope; say what.
- Every mutation named above: planted, the failing sub-check line copied
  verbatim, reverted, re-run green. **Three plants minimum.** Any deliverable
  whose plant did not redden is reported as NOT done, with the reason, rather
  than shipped with a written guard.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_js_guards_and_suite_isolation.md`):
  1. the verbatim failing line for each of the three plants;
  2. **the named cause of deliverable 3** — which shared object, which double
     render, which unsettled paint, in as many words, with the evidence that
     identified it. "Fixed by adding a wait" without a named cause does not
     close that issue, and neither does "passes now". If the honest answer after
     real effort is that the cause is not yet identified, say exactly that and
     what was ruled out — a re-filed issue with five eliminated hypotheses is
     worth more than a silent wait;
  3. whether any **other** suite in the 19 is order-dependent — you will have
     the runner in hand; a cheap `--only` pass over the list answers "is
     `annotate flyout` the only one", which is the question the next reviewer
     will have;
  4. the `find`/`replace`/`expect_red` strings for deliverable 2's pending
     mutation-witness entry, ready to paste once
     `mutation_witness_tier_reaches_its_checks` has merged;
  5. one sentence on the shared shape of deliverables 1 and 2 — a guard on a
     constant is not a guard on the surface that reads it — and where else in
     this repo that pattern is likely sitting.
