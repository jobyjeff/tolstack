---
type: review
handoff: docs/sessions/active/HANDOFF_20260923_mutation_witness_derived_enrollment_and_gating.md
reviewer: agent
date: 2026-09-23
verdict: APPROVE
blockers: 0
---

# Review — mutation_witness_derived_enrollment_and_gating

**APPROVE.** The design deliverable landed and I could break it on purpose in
the two ways that matter: a planted guard reddens `pytest -q` in a second naming
the exact file to write, and a reworded guard leaves a **loud** orphan rather
than `expect_red`'s old silent one. Four inline prose fixes, one issue filed,
two overlay entries added.

The one finding worth a reader's attention is not in the mechanism: `CLAUDE.md`
motivated the new bullet with a measured failure that a lesson **already on
`integration`** had corrected as false the day before. Fixed inline, and
promoted to a Recurring-bugs entry, because the shape (a correction lives in a
lesson nobody greps; the wrong claim lives in the issues everybody reads) is
going to recur.

## Which run this reviews

One run. `docs/sessions/active/` holds exactly the handoff I was seeded with and
nothing of that slug sits in `completed/`. The lesson arrives as `A`, not `M`,
so no earlier run's record was overwritten. Branch
`handoff/mutation_witness_derived_enrollment_and_gating` @ `9f930d3`, eight
commits, cut from `integration` @ `c7915c7` — which `integration` still pointed
at when I merged, so the merge was clean with **no conflicts** and nothing moved
underneath the work.

Containment checked before merging (`git merge-base --is-ancestor`): NOT merged,
so my merge was real and the verification below is not a no-op.

## What I ran

Pre-merge risky subset, per the overlay's *"a guard, a witness, or
`scripts/mutation_witnesses/`"* row plus the `ARCHITECTURE.md` row:
`pytest -q tests/test_mutation_witnesses.py tests/test_viewer_readme_doc_facts.py
tests/test_architecture_inventory.py` on the pre-work tree → **31 passed**. (The
new tests do not exist pre-merge, so this row establishes the baseline rather
than exercising the work; the value is all post-merge.)

Post-merge, on the merged tree in the review worktree, with `node_modules`
junctioned in from the main checkout so no tier was disarmed:

| run | where | result |
|---|---|---|
| `pytest -q` (full) | review worktree | **1212 passed, 1 failed** in 44.6 s |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | review worktree | **513/513** |
| `node apps/annotate/run_tests.cjs` | review worktree | **154/154**, no SKIP lines |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | review worktree | **25/25** suites, `EXIT=0` |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | review worktree | **115/115 witnessed**, `EXIT=0`, census holds, 0 orphans |

The single pytest failure is `test_viewer_js_suite.py::test_viewer_js_suite_is_
green`, red in every worktree by design since 2026-09-18 — the `[real]` tier has
no `data/projections/` here. It is covered by the 513/513 row, run through
`--repo` at the main checkout. **What the worktree still could not exercise:**
nothing else. The two `[real]`-dependent tiers were both armed through `--repo`,
and `data/` in the main checkout is untouched by any of my runs (newest file
there is 11:37, hours before the first).

## What I verified by breaking it

The canonical *"a new guard has been observed failing"* check, replayed
independently rather than taken from the lesson:

- **A guard added with no spec.** Planted `await test("a planted guard nobody
  enrolled", …)` in `apps/viewer/tests.js`. `pytest -q
  tests/test_mutation_witnesses.py` reds with
  `apps/viewer/tests.js: 514 declared, pinned at 513` and the instruction to
  enrol it, and `--unenrolled` answers `write scripts/mutation_witnesses/
  fast__a-planted-guard-nobody-enrolled__48378b62.json` — the same digest the
  lesson records, from an independent run. Reverted.
- **A guard reworded.** Changed four words of an enrolled guard's name in
  `apps/viewer/tests.js`. Two tests red together, from both sides:
  `test_no_spec_names_a_guard_the_tree_does_not_declare` names the orphaned spec
  file, and `test_every_expect_red_names_a_guard_the_enumeration_found` names
  the guard. This is deliverable 2's *"loud orphan, not a silent one"* and it is
  the thing `expect_red` could not do before. Reverted.
- **The tier's own exit code, on the unenrolled class alone.** With the planted
  guard still in place, `--only worstverdict` reported **`1/1 declared mutations
  witnessed`** — nothing decayed — and still came back `EXIT=1`, from the
  `NOT ENROLLED` block, with `<-- PINNED AT 513` beside the moved row. That is
  deliverable 4 end to end: the exit code gates, and *"the two failure classes
  read apart"* is literally true of the output. Reverted.
- **The scanner is falsifiable and accurate.** `declared` is **513** and
  `apps/viewer/run_tests.cjs` executes **513/513**; `declared` is **154** and
  `apps/annotate/run_tests.cjs` executes **154/154**. Two sources, exact
  agreement — no false positives, no false negatives today. I also checked the
  three misses the regex could have: zero single-quoted declarations, zero
  non-literal first arguments (the only `test(name, fn)` hit is the function's
  own definition), and `printedIn`'s marker matches exactly the one hand-written
  FAIL line (line 314's template-literal spelling correctly does not match).

## Numbers in the lesson, re-derived

Per the canonical *audit the lesson's arithmetic* check. Everything checkable
checked out:

- **108 mutations / 103 guards** in the table this replaces — exact, recounted
  off `integration:scripts/mutation_witnesses.json`.
- **"no two entries shared a tier and a name while differing in suite"**, the
  measurement §2(b) rests the digest design on — exact: 103 distinct
  `(tier, expect_red)` and 103 distinct `(tier, expect_red, suite)`.
- **Five duplicate entries** forcing `mutations` to be a list — exact
  (multiplicities 3, 2, 2, 2 over four guards = five entries naming an
  already-named guard). The em-dash gloss *"three ways to break the topology
  switch, two to break the command-table ban"* names two of those four guards,
  not all of them; the count is right, the enumeration reads as exhaustive and
  isn't. Nit, not worth an edit.
- **31 of 506 browser guards unenrollable, 27 interpolated + 4 declared more
  than once** — exact.
- **109 specs carrying 115 mutations** — exact (108 + the seven declared here).
- **1212 passed / 1 failed** in the worktree — reproduced exactly.
- **5 issues cleared, 5 annotated and left open, 1 filed** — confirmed by
  reading the `status:` transition of all eleven touched files. The five left
  open are genuinely *missing an assertion*, not missing a row, which is §5's
  point and it is correct.

The handoff's **"13 open unenrolled instances"** was an over-count: two issues
matched that title exactly and were open, and the broader enrollment stream was
ten. The lesson quotes the handoff's 13 and answers the substance without ever
saying the number was wrong. Worth a sentence next time; not worth a change now.

## Findings

### Should-fix, all four fixed inline (prose only; nothing else was touched)

1. **`CLAUDE.md` motivates the new tier bullet with a claim a merged lesson had
   already corrected.** The bullet said *"nothing in the pipeline failed: the
   runner printed them and exited 0. It exits non-zero now"*. The runner has set
   `process.exitCode = 1` on `NOT WITNESSED` since `9c6c4a4`, the commit that
   founded the tier — confirmed by reading `integration`'s copy (three
   `process.exitCode = 1` sites, the third in the summary block) and
   independently by `LESSONS_20260922_mutation_witness_repair_and_enrollment.md`,
   which measured `EXIT=1` at the exact commit the claim was made against, named
   the real cause (*nothing calls the tier*), and wrote *"do not file a third
   issue about the exit code"*. That lesson was on `integration` before this
   branch was cut. Rewritten so the premise is true and the two genuinely new
   non-zero classes get the credit; the conclusion — the tier belongs on the
   pre-batch-merge list — is untouched and correct.
2. **The same premise, in the 2026-09-23 annotation on
   `ISSUE_20260918_a_tier_that_can_only_fail_at_a_merge...`** ("the 2026-09-22
   measurement … no longer reproduces", of a measurement that never reproduced).
   Same correction, with the pointer to the lesson that settles it.
3. **`scripts/mutation_witnesses/README.md` describes the derived file name as
   carrying "a digest of all three".** `specFileName` digests `tier` and
   `expect_red` and **deliberately not `suite`** — the exclusion that lets
   `--unenrolled` print the exact file name, which is the whole difference
   between a census and an instruction (lesson §2(b), and the code comment says
   so at length). A reader believing "all three" would conclude the opposite of
   the design. Corrected, with the reason.
4. **`docs/prompts/REVIEW_AGENT.md`: one continuation line lost its six-space
   indent** in the reworded "cheap half compares loosely" entry. Whitespace;
   this is my own artifact anyway.

### Should-fix, left unfixed — filed as
`ISSUE_20260923_the_guard_census_pins_a_count_not_a_set_so_three_arrivals_are_silent.md`

**`DECLARED_GUARDS` pins a cardinality where the thing it stands in for is a
set.** Three arrivals move no number: a delete-plus-add in one change; a new
guard whose name collides with an existing one (the enumeration deduplicates by
design, so `declared` holds while `enrollable` drops — and nothing pins or gates
`enrollable`); and a declaration shape the scanner does not match. All three are
future holes rather than present misses — the tree is clean today — but the gate
is now the *only* thing between a new guard and the backlog this rework exists
to end, so its limits deserve the same written treatment `python` got in
`ISSUE_20260923_the_guard_census_cannot_see_a_pytest_guard.md`.

The issue also names the free pairing left unclaimed: `declared` equals the two
fast tiers' own printed totals exactly, and nothing asserts it — which is to say
the scanner's accuracy is currently a reviewer's hand measurement, the exact
shape this repo keeps converting into a standing check. It needs a new test, so
it is outside the inline-fix boundary.

### Nits (no action taken)

- `scripts/mutation_witnesses/browser__every-suite-prints-the-registry-key...json`'s
  `contract` prose still says `mutation_witnesses.json` — a stale path inside a
  newly-created file. The other live-document references were all updated.
- `docs/ANNOTATION_SURFACE.md` now quotes a guard's name in prose and truncates
  it without an ellipsis (the real name continues *"— it never selects, never
  highlights, never builds an event"*). It reads as a complete quotation. The
  string it does print is a true prefix, so a grep still finds it.
- The README's step 5 spells `--repo C:\workspace\tolstack` with backslashes.
  Correct for this repo's primary shell and consistent with every other doc
  here, but it is the spelling the overlay's own first Recurring-bugs entry
  warns silently skips the `[real]` tier under the Bash tool. Not changed:
  changing it in one document and not the other twenty is the worse outcome.

## Two observations that are not findings

**The tactical agent edited the reviewer's overlay.** `docs/prompts/REVIEW_AGENT.md`
is the review agent's artifact by the canonical prompt's own statement. Eight of
its references were to a path this handoff renamed, so leaving them stale would
have been worse, and every edit I read is accurate — including two that
correctly mark earlier entries *resolved at the root*. Recording it because
"review checklist content written by the author being reviewed" is a thing worth
noticing, not because anything in it is wrong.

**The retirements are net-positive and worth naming.** `test_every_id_is_unique`
and `test_no_expect_red_is_a_truncated_check_name` both went, and neither is a
loss of coverage: uniqueness is now structural (two specs for one guard derive
to one file name, so they cannot coexist), and truncation cannot satisfy set
membership. The bare `ValueError` inside the second one
(`ISSUE_20260922_the_truncated_check_name_guard_crashes...`) left with it. Test
count went 15 → 18. *Making two halves compare the same thing beats adding a
third check that watches them disagree* is the reusable sentence in this
handoff.

## For the next reviewer

Two entries added to **Recurring bugs to check**: a corrected claim re-asserted
as motivation for a new change (grep `docs/sessions/lessons/` before accepting a
measured failure as a premise), and a derived-identity mechanism gated on a
count rather than a set.

The overlay's *"a guard, a witness, or `scripts/mutation_witnesses/`"* risky-subset
row now also says **any diff that adds a guard at all** belongs in it — the
tactical agent wrote that, and it is right. Read it as: when a diff adds a guard
and the suite is green, find out whether the author wrote a spec or raised the
pin. Raising the pin is allowed and is a claim that the guard cannot be
witnessed — review the claim.
