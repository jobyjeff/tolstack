---
type: review
handoff: docs/sessions/active/HANDOFF_20260930_guard_census_pins_the_set_not_the_count.md
reviewer: agent
date: 2026-09-30
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-30 — guard_census_pins_the_set_not_the_count

One commit, `0d5ab78`, merged into `review/guard_census_pins_the_set_not_the_count`
with no conflict (`integration` had moved one commit, `a6a47d7 → fbbba37`, a
board move for the sibling handoff; nothing in the diff's file set).

`integration` then moved again mid-review — `fbbba37 → fb72445`, the sibling
`confidence_label_is_paired_to_its_vocabulary` landing plus two `sync: merge
master` commits — so it was merged **into** this review branch and the subset
re-run before the integration merge, per the canonical conflict guidance. **No
conflict, so no resolution to report**: the two file sets are disjoint
(`apps/viewer/viewer.js`, `apps/viewer/topology.js`,
`tests/test_js_python_vocabulary.py` against `scripts/guard_enumeration.mjs`,
`tests/test_mutation_witnesses.py`). Its arrival did make the post-merge tier
run owed twice — see below.

Verdict: **APPROVE**, no blockers. Two should-fix findings left unfixed and
filed as issues; one nit; one overlay entry added. The three arrivals the
handoff named are all genuinely closed, and I replayed each one by planting the
defect rather than reading the claim.

## What the fence bought, first

The handoff fenced out `apps/viewer/run_tests.cjs`'s `projectionFreshness` and
the witness specs. Neither is touched: `git diff --name-status` is eight files,
none of them a spec, and `apps/viewer/run_tests.cjs` is not in the set. The
sibling handoff (`projection_freshness_pairs_with_the_tree`) and this one share
no files, as staged.

## Deliverables, against the definition of done

**1 — pair `declared` against what the tier runs, and state the browser tier's
exemption in the code.** Done, and done better than the handoff asked. The
handoff asked for `declared` against the tier's printed *total*; `pairExecuted()`
compares *name sets* in both directions, which costs the same spawn and names
the guard instead of a delta. The browser exemption is stated in three places
that are paired against each other: the `GUARD_SOURCES.browser` comment
(`runner: null`, with both reasons and the note that the blocking one is
*relation*, not cost), `CENSUS_LIMITS.browser_scan_unverified`, and
`UNPAIRED_TIER` in `tests/test_mutation_witnesses.py` — pinned by
`test_the_pairing_covers_every_censused_source_but_the_one_it_says_it_cannot`,
so a *second* source quietly dropping out of the pairing is now red. That last
test is the one I would have asked for and did not have to.

**2 — gate or pin `enrollable`.** Done, and closed from two independent
directions: `DECLARED_GUARDS[tier].enrollable` on the scan side and
`test_no_fast_tier_runs_one_guard_name_twice` on the run side. Replay below
shows both firing on one planted duplicate.

**3 — decide arrival (1) on its merits.** A twelve-hex digest of the sorted name
set, with the tracked-name-manifest option rejected and costed in both the
lesson and the code comment (≈1 173 tracked lines across the three sources;
every rename a fixture edit; churn paid per guard forever against an arrival
that has never happened). I audited the rejected option's arithmetic:
516 + 151 + 506 = 1 173. The near-miss alternative (digest only the *unenrolled*
names) is named and dismissed for the right reason — enrolling a guard moves it
too. I agree with the choice; the digest's one loss (it names no name) is stated
in `CENSUS_LIMITS.digest_names_no_name` and points at `--unenrolled`.

**4 — compute the honest limits in the tooling.** `CENSUS_LIMITS`, five entries,
printed by **every** census run rather than behind a verbose flag, and paired
key-for-key by `test_the_census_emits_what_it_cannot_see`. I went hunting for a
sixth bypass and did not find one:

* `enrollable` is itself a cardinality — but enrollability is a function of the
  declaration text (`!interpolated && !twice`), so every way of moving the
  enrollable *set* without moving its count also moves a name, which moves the
  digest. The digest backstops it.
* A guard source gaining guards in a *second* file inside an existing tier is
  invisible to the scan and caught by the pairing (`ranNotDeclared`).
* A fourth pin added on the JS side with nothing asserting on it is caught by
  `test_the_census_pins_exactly_the_values_this_module_checks`.

**Lesson's last question — is "a count as a proxy for a set" a class here?** The
author answered "two, not three" and named what they checked. I spot-checked the
three: `test_the_projection_provenance_row_counts_and_names_its_importers` does
pin `named == actual` and derive the count from it; the `test_hub_bearing_*`
pins iterate a committed fixture by cell address; the JS `length === N` pins are
geometry over fixed fixtures. The conclusion holds, and the overlay entry was
updated to say the example is closed and the rule is not — see the disclosure
note at the end.

## Replays — every new code path observed failing

Per the universal check, I did not accept any of this on the strength of green.
Each defect was planted in the tree, the specific new check watched, and the
tree restored (`git status` clean after each).

| planted | what fired | what it said |
|---|---|---|
| **(1)** renamed one guard in `apps/viewer/tests.js` (delete + add, one change) | `test_the_enrollment_census_holds` | `declared` held at 516; *"the guard NAME SET is 3d285956a0d5, pinned at 9feff19206f8 — the count did not move, so this is a guard swapped for another or a guard renamed"*, plus the exact `pinLine` to paste |
| **(2)** second `test("<an existing name>")` | `test_the_enrollment_census_holds` **and** `test_no_fast_tier_runs_one_guard_name_twice` | two separate reds — `515 enrollable, pinned at 516` from the scan, and the duplicated name from the run |
| **(3)** `test('…')` in single quotes | `test_the_scan_and_the_run_agree_on_which_guards_exist` | census stayed green (as predicted); pairing red naming the guard and both possible causes |
| a declaration in dead code (`if (false)`), with the `[real]` projection copied in so the run was complete | same test, other direction | *"`apps/viewer/tests.js` declares '…' and `apps/viewer/run_tests.cjs` ran no such check … so the census is pinned above the truth"* |
| `RESULT_LINE` widened to three spaces (the parse/print divergence the code guards against) | `test_the_scan_and_the_run_agree_on_which_guards_exist` **and** `test_the_pairing_actually_ran_something` | *"read 0 PASS/FAIL lines … which reports 422 ran"* — the parse-check works, and the vacuous-pairing guard works |
| a **failing** viewer guard (`eq(VA.fmtPlusMinus(0.1), "PLANTED FAILURE")`) | **nothing** — 25 passed | the lesson's claim that a legitimately red fast tier produces no second census failure is true; the runner printed `421/422 passed` and the pairing stayed quiet |

The fourth row is the one that needed setting up: `declaredNotRun` is suppressed
whenever the tier reports a `SKIP`, which is the permanent state of a worktree,
so I copied `data/projections/viewer/` in from the main checkout to get a
complete run (`516 ran, 516 declared, both directions checked`) before planting
it. That copy was removed afterwards.

## Findings

### Should-fix — filed, not fixed

1. **`runTier` discards the child's exit status and stderr, so a *crashed* fast
   runner is reported as a `RESULT_LINE` divergence.**
   `scripts/guard_enumeration.mjs`, `runTier()`. `proc.error` covers only "could
   not start" and "killed on timeout"; a runner that started, threw and exited
   non-zero returns `failure: null` with an unusable stdout, and the downstream
   parse-check then blames the regex. Replayed with a module-scope `throw` in
   `apps/viewer/tests.js`: two tests go red (so the gate holds — this is a
   diagnosis defect, not a hole) and both name `RESULT_LINE`, while the stack
   trace that held the real cause was thrown away one function earlier. Outside
   the inline-fix boundary: it wants a test proving the crash case names the
   crash. Filed as
   `ISSUE_20260930_the_pairings_spawned_runner_reports_a_crash_as_a_parse_divergence.md`
   (`bug`/`low`), with the caveat that the ordinary non-zero exit must stay
   unread. Also promoted to the overlay's **Recurring bugs** list as a class —
   this repo now has several guards whose subject is another process's output.

2. **The count of checks a worktree drops is `~86` in the message a reader gets
   and `~94` in the two places written today.** `tests/test_viewer_js_suite.py:129`
   against `scripts/guard_enumeration.mjs:412` and
   `tests/test_mutation_witnesses.py:582`. `94` is right (516 declared − 422 run,
   measured here); `86` dates from 2026-09-18 and the tier has grown. The stale
   site is the pre-existing one and the one an agent actually reads, so this is
   file-don't-fix rather than an in-scope miss — but the diff *created* the
   disagreement, and nothing derives any of the three. Filed as
   `ISSUE_20260930_the_checks_a_worktree_drops_are_stated_as_86_in_the_one_place_a_reader_sees_and_94_in_two_others.md`
   (`chore`/`low`).

### Nits

* **`tests/test_mutation_witnesses.py:431`** (`test_no_spec_names_a_guard_the_tree_does_not_declare`)
  still says *"delete the spec and lower that source's **number** in
  `DECLARED_GUARDS`"*. Retiring a guard now moves three pins, and an author
  following that sentence lands on a `names` red they were not warned about.
  In scope for the handoff and inside the inline-fix boundary, but I left it:
  the identical sentence exists in `scripts/run_mutation_witness_tests.mjs:553`,
  which was fenced out, and fixing one of two copies is the worse outcome — the
  filed
  `ISSUE_20260930_the_mutation_witness_tier_gates_on_one_of_the_three_census_pins.md`
  already has to open that file, so both belong in the same pass. **Added to
  that issue's scope in my report rather than a new issue** (see below).
* `pinsMoved()` (JS) and the `(stated, against, what)` tuple list in
  `test_the_enrollment_census_holds` (Python) are two hand-written copies of the
  same three sentences. The *structure* is paired (`PINS` against
  `DECLARED_GUARDS`'s keys), which is the part that matters; only the prose can
  drift, and both sides are error text. Not worth a fix.
* `test_the_census_emits_what_it_cannot_see` measures "actionable" as
  `len(why.split()) >= 12`. A word count is a weak proxy, honestly cheap, and I
  would not change it.

### Not a finding — the author's own issues are right

Both filed issues are well-formed (frontmatter exact, `found_by` in this repo's
established form) and both are the honest disclosure the DoD asked for. The
`ISSUE_20260930_the_mutation_witness_tier_gates_on_one_of_the_three_census_pins`
diagnosis is confirmed: `scripts/run_mutation_witness_tests.mjs:544` still reads
`r.declared !== r.pinned` for its exit code, so arrivals (1) and (2) are red in
`pytest -q` and exit 0 in the tier. It *does* print them — `censusReport` now
emits every moved pin's sentence, which I saw on the planted rename. Worth
adding to that issue when it is picked up: the same file's line 553 message
("raise that source's number") is now stale for the same reason.

## Tests

`git diff --name-only integration...HEAD` matches three overlay rows, all run:
the **guard/witness** row, the **prose in a tracked document** row
(`apps/viewer/README.md`, `docs/prompts/REVIEW_AGENT.md`,
`scripts/mutation_witnesses/README.md`), and — for `tests/test_mutation_witnesses.py`
— the Python row's inventory pairing (inside the full suite).

**The tactical record.** The only tracked artifact the tactical agent left is
`LESSONS_20260930_…` (there is no handoff-side report file in this repo's
convention, and I did not see the agent's chat report). It describes every
replay it made and what each proved, but **records no full-suite command, no
checkout and no result counts** — the four DoD commands are never answered. So
the benefit of the doubt the cadence extends to a *recorded* run has nothing to
attach to here, and I ran the full suite on both sides of the merge rather than
only after it. This is a real omission rather than a convention this repo does
not have: the sibling handoff that landed the same day
(`LESSONS_20260930_confidence_label_is_paired_to_its_vocabulary.md`) records all
four of its own — command, checkout, counts, and which failure was the expected
worktree one. No issue filed, because the record's purpose is served by the
table below; the sentence is the feedback loop. Nothing
else in the record is inconsistent with the diff; the lesson's numbers all
re-derive (≈1 173 manifest lines, 31 browser unenrollables = 506 − 475, ~94
worktree-dropped checks, twelve hex characters).

| what | where | result |
|---|---|---|
| `pytest -q tests/test_mutation_witnesses.py` (risky subset, pre- and post-merge) | review worktree | **25 passed** |
| `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py` (doc/claims row, after my own overlay edit) | review worktree | **216 passed** |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | review worktree | **516/516 passed** — equals `DECLARED_GUARDS.fast.declared` exactly |
| `node apps/annotate/run_tests.cjs` | review worktree | **151/151 passed** — equals `DECLARED_GUARDS.annotate.declared` exactly |
| `node scripts/guard_enumeration.mjs --executed` | review worktree, armed | both fast sources *"both directions checked"*; browser *"not paired against a run"* |
| `pytest -q` (full suite), worktree as dispatch left it | review worktree | **1 250 passed, 1 failed** — the single failure is `test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the deliberate worktree red `CLAUDE.md` documents. It still names exactly one, which is the lesson's claim |
| `pytest -q tests/test_mutation_witnesses.py tests/test_js_python_vocabulary.py` + full `pytest -q`, after merging the moved `integration` in | review worktree | **29 passed**, then **1 250 passed, 1 failed** (same one). The total is a check in itself: the sibling's review recorded 1 243 on its own branch, this handoff adds exactly 7 test functions, and 1 243 + 7 = 1 250 — so neither merge lost a test |
| `pytest -q` (full suite), worktree **armed** (`node_modules` junctioned from the main checkout, `data/projections/viewer/` copied in) | review worktree | **1 251 passed, 0 failed** |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` (post-merge, the entry that owns it) | review worktree, `node_modules` junctioned | see below |

**What the worktree could not exercise.** Nothing, in the armed run — which is
unusual here and worth recording: junctioning `node_modules` and copying the
viewer projection in was enough to take the suite fully green in a worktree, so
the `[real]` tier and the browser TRUTH tier both ran. The main checkout sits on
trunk and a `pytest` typed there would have measured trunk, so I did not run one;
the diff touches no path resolution and reads no `data/`.

**Production data untouched.** `find C:/workspace/tolstack/data -newermt
"-15 minutes"` is empty after the full suite, and the main checkout's
`git status` is clean. Worth checking deliberately this time: the new
`pairing` fixture spawns two app test runners on every `pytest -q`, and the
annotate runner falls back to a hardcoded main-checkout path for its `[real]`
checks — so a worktree's pytest now reads the shared projection through a
subprocess. It only reads.

### The mutation-witness tier, post-merge

Run because the overlay's *"After you merge `integration` into your review
branch, re-run"* entry owes it, and because its own mechanical escape clause
does **not** apply here: `SHADOWED` names `["apps"]`, `["scripts"]` and
`["tests"]`, and the merge touches all three.

```
node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack
  -> 125/125 declared mutations witnessed   (exit 0)
     0 NOT WITNESSED, 0 TIER_ALREADY_RED, 0 ANCHOR ROTTED, no orphans
     census holds: 516/516, 151/151, 506 (475 enrollable) — no pin moved
     19.3 minutes, review worktree, node_modules junctioned from the main checkout
```

**Run twice, because `integration` moved between the two merges.** The numbers
above are the first run, against `handoff/…` merged onto `fbbba37`. The sibling
`confidence_label_is_paired_to_its_vocabulary` then landed on `integration` and
was merged in here, touching `apps/viewer/viewer.js` and `apps/viewer/topology.js`
— app code, inside `SHADOWED` — so the tier was re-run against the combined
tree. That is the whole point of the entry: two branches green apart can be
short a witness together, and the measured incident behind it
(`ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run`)
was exactly a review merge bringing siblings together.

```
after merging integration (fb72445) in
  -> 125/125 declared mutations witnessed   (exit 0)
     0 NOT WITNESSED, 0 TIER_ALREADY_RED, 0 ANCHOR ROTTED, no orphans
     census unchanged: 516 / 151 / 506 (475 enrollable)
     17.9 minutes
```

**No drop, either time.** The last recorded run is
`REVIEW_20260924_fixture_pairing_reads_a_fresh_projection.md`'s **125/125,
exit 0** — same count before and after both merges, so neither took a witness
with it, which is the only thing this tier can tell you that no branch's green
can. The sibling's own review gave its tactical agent's 125/125 the benefit of
the doubt and did not re-run; this run covers that merge as well as mine.

The tier's own census tail is worth noting as a second confirmation of the
change: it printed the three-value report (`enrolled / enrollable / declared`)
with no moved-pin markers. That tail is also where the remaining gap lives —
its exit code still reads `declared` alone, per the author's own filed issue.

## Two disclosures

**I edited the overlay** (`docs/prompts/REVIEW_AGENT.md`) to add one **Recurring
bugs** entry — the spawn-a-runner/crash-diagnosis class from finding 1. That is
my own artifact and is committed on the review branch.

**The tactical agent also edited the overlay**, which is out of any handoff's
declared file scope, and the overlay's own entry on this says to check it was
disclosed and to check every passage against the code. It was disclosed, in the
lesson, explicitly. Three passages, all accurate against the merged tree: the
risky-subset row (`per-source guard *set*`, count + enrollable + digest — a
pointer their own work broke, keep); the `scripts/mutation_witnesses/README.md`
step 4 rewrite (not the overlay, but the same judgement); and the
"claim wider than measurement" entry, which is the entry *written about them*.
That last one is the shape the overlay warns must not become a habit, so I read
it twice: it does not soften the rule, it marks the example closed, says so in
those words, and adds the transferable half ("when a count stands in for a set,
a digest of the set is usually cheaper than the set") that this handoff is the
evidence for. Kept. The `(513/513, 154/154)` figures it retains are the
2026-09-23 measurement and read as historical; they are 516/151 today.

## For the next reviewer

* `pairExecuted()` has **no `--repo` seam** — it spawns each runner bare, so the
  `declared ⊆ ran` direction (a scanner *false positive*, a name counted that is
  not a guard) is only ever exercised where `data/projections/viewer/` resolves:
  the main checkout, i.e. the operator's batch merge. `CENSUS_LIMITS.incomplete_run_pairs_one_way`
  says so. Adding the seam is the same design question already deferred in
  `ISSUE_20260918_a_worktree_could_run_the_real_tier_against_the_main_checkout_instead_of_only_failing_on_it.md`
  (`class:guard_cannot_fail`) — do not file a third.
* Arming a tolstack worktree to a genuinely full green is two commands and took
  under a minute: `New-Item -ItemType Junction` for `node_modules` against the
  main checkout, and `cp -r C:/workspace/tolstack/data/projections/viewer
  data/projections/`. The projection is trunk-built, so this is for *reading* a
  green, never for judging freshness — but it turns the cadence's "name what the
  worktree could not exercise" into "nothing".
