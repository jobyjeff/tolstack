---
type: review
handoff: docs/sessions/active/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md
reviewer: agent
date: 2026-09-23
verdict: APPROVE
blockers: 0
---

# Review — mutation_witness_repair_and_enrollment

**APPROVE.** Three dead witnesses repaired, twelve guards enrolled, and the
post-merge tier is **108/108 with `EXIT=0`** — the first time this registry has
been clean. One should-fix found and fixed inline (a wrong `--only` cost claim
in the lesson). One finding I raised and then **retracted** against my own
measurement; it is written up below and in the overlay, because the way I got
it wrong is the reusable part.

## The session crashed and was relaunched — which run this reviews

This handoff ran **twice**: the first tactical session died mid-finish, and Jeff
relaunched it. Per the canonical "a handoff that has run before" check:

- The branch under review is `handoff/mutation_witness_repair_and_enrollment`
  @ `8f5d7e2`; the handoff worked is the one in `docs/sessions/active/`, which
  is the one I was seeded with. No mismatch.
- The relaunch's lesson arrived as **`M`, not `A`** — the shape that usually
  means one run overwriting another's record. It is legitimate here: the five
  deleted lines are the three `FILL_*` placeholders and the sentence they sat
  in, not an earlier complete reading. Nothing was destroyed.

**What the crash left behind is worth recording as a review hazard.** The first
session committed its lesson with literal `FILL_BROWSER`, `FILL_BRANCH` and
`FILL_ENTRIES` markers where the two long tier runs were to be pasted, and then
died. Every cheap signal said finished — clean worktree, five commits, a
`LESSONS_*.md` at the expected path, and a final commit message of the kind a
finishing session writes. Three Definition-of-done bullets rode on those three
slots. Added to the overlay as a one-line grep.

## What I verified

Merged tree = `review/mutation_witness_repair_and_enrollment`, carrying handoff
`8f5d7e2` **and** `integration` `9f19647`. Both merges clean, no conflicts.
`integration` moved twice under this handoff — `findings_splitter_scopes_to_
excluded_terms` before the tactical's work, and `stack_page_alert_marks_and_
drawn_glyph` at 00:34, about five minutes before its final commit.

| run | where | result |
|---|---|---|
| `pytest -q` (full) | review worktree | **1 failed, 1209 passed** in 44.7 s |
| `pytest -q tests/test_mutation_witnesses.py` | review worktree | **15 passed** |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | review worktree | **501/501** |
| `node apps/annotate/run_tests.cjs` | review worktree | **154/154**, 0 SKIP lines |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | review worktree | **25/25**, `EXIT=0`, 2 min 20 s |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | review worktree | **108/108 witnessed**, `EXIT=0`, 21 clean runs |

The single pytest failure is `test_viewer_js_suite.py::test_viewer_js_suite_is_
green`, red in every worktree by design since 2026-09-18 (no `data/` here); the
tier it stands in for is covered by the 501/501 row above, run through `--repo`.
The fast tier reads **501**, not the lesson's 496 — the total *moved* because the
merge brought `stack_page_alert_marks_and_drawn_glyph`'s checks in, which is the
overlay's own way of confirming `--repo` actually took.

**Pre-merge risky subset** (overlay row "a guard, a witness, or
`scripts/mutation_witnesses.json`"): `tests/test_mutation_witnesses.py`, 15
passed, before the merge. The diff also touches
`scripts/run_viewer_browser_tests.mjs`, so the browser tier was owed and is in
the table above.

**The post-merge tier run is the one that matters here**, and it is the overlay's
standing instruction for a reason this handoff demonstrates twice over: the
registry's count went **up** across the merge (96 on `integration`, 108 merged,
a strict superset), no entry rotted, and `integration`'s own re-point of
`alert-badge-is-not-filled` onto `.rowalert` survived intact beside this branch's
new `the-nav-mark-wears-no-box`. Different files, different suites, no collision.

### The new guard was observed failing

The deliverable includes a check, so green was not accepted on its own. Four
mutations, in an isolated copy of the merged tree:

| break | result |
|---|---|
| `SKIP_DECLARATION` stops matching | `test_passing_over_the_skip_arm_is_load_bearing` **and** `test_every_expect_red_resolves_to_exactly_one_place` both fire |
| `expect_red` that exists only in a `skip(` arm | `..._resolves_to_exactly_one_place` fires (hits = 0) |
| `expect_red` truncated to a prefix | `test_no_expect_red_is_a_truncated_check_name` fires |
| baseline restored | 15 passed |

The new `if not starts: continue` in the truncation test opens no silent hole —
the zero-declaration case is caught loudly by the sibling, exactly as its comment
claims.

### Claims in the lesson I re-derived

All of these hold: 45 of 51 template-literal browser check names interpolate;
7 `skip("` declarations in `apps/viewer/tests.js`; 96 → 108; 12 of 15 candidate
rows enrolled; the twelve rows in the table match the twelve entries in the diff,
attributed to the right source issues.

The lesson's **correction of the handoff** is also right, and worth flagging as a
good catch rather than a finding: both the handoff and its source issue assert
the runner "prints the NOT WITNESSED list and still exits 0". It does not.
`process.exitCode = 1` is present at `1d31b69` — the commit the issue measured
on — and in `9c6c4a4`, the file's first commit. Nothing to change, and the lesson
says so instead of inventing a fix.

## Findings

### should-fix (fixed inline) — the `--only` cost advice is backwards

`LESSONS_20260922_…md`, "The baseline nobody had": *"`--only` is NOT obviously
the cheap way in any more — one `--only` pays the same clean-run floor for one
entry as the whole table pays for 96. Below ~10 entries `--only` still wins;
above that, run the lot."*

The floor is not paid up front. `baselines` is populated **lazily inside**
`for (const mutation of chosen)` (`scripts/run_mutation_witness_tests.mjs`
:395-413), so a run pays one clean run per distinct `(tier, suite)` *among the
chosen entries only* — one of them for a single `--only`, never the table's 21.
Measured on the merged tree: `--only alert-badge-is-not-filled`, a browser
entry, ran start to finish in **6 seconds including building the shadow tree**.

Fixed with a dated correction blockquote, which also keeps the useful half of
the original advice: a full table is still the only thing that catches a
merge-induced miss *elsewhere* in the registry, so "run the lot" is right about
coverage and wrong about cost.

### Retracted — a 7x timing discrepancy that was my own measurement error

I raised, and then withdrew, a finding that the lesson's full-tier wall clock
(16.7 min / 96, 17.8 min / 108) was unreproducible. My post-merge run of the
same 108 entries took **123 minutes** (00:45:52 → 02:48:52) on a machine reading
~18% CPU with 41 GB free and no other live shadow tree, and I had timestamped it
per entry and found browser entries apparently costing 3–7.5 min each. I wrote a
correction blockquote and filed an issue.

Both were wrong and have been reverted. The single `--only` above ran in **6 s**,
and the entire 25-suite browser tier in **2 min 20 s** — both consistent with the
recorded figures and not with mine. I could not attribute the 123 min: 42 chrome
processes orphaned by killed tier runs were alive throughout it, but they were
*still* alive during the fast runs afterwards, so that is a correlate, not a
cause.

Two things I should have done before writing it down, now in the overlay: get a
**per-entry** number with `--only` (six seconds) before making any claim about
the table; and not fit a floor/rate decomposition to two points 12.5% apart,
which cannot separate the terms and which produced a spurious "~7.9 min floor,
~5.5 s/entry" that I briefly believed.

### nit — a superseded check left in place, deliberately

`scripts/run_viewer_browser_tests.mjs:5523` still carries
`...and shows that element's part alone, in the scene and in the list`, which
the lesson establishes can no longer discriminate (the mock topology has one
part, and `cmdSuggest()` loads it anyway). It is no longer declared by any
entry, asserts something weakly true, and the entry's `note` documents exactly
why. Leaving it is defensible; I mention it only so the next reader of that
suite knows it is a known-weak check and not an oversight.

### nit — `area:` is spelled four ways for one component

The four source issues carry `guards/mutation-witness`,
`scripts/mutation-witnesses`, `scripts/mutation_witnesses` and
`tests/mutation-witnesses`. `area` is free text by contract, so none of these is
invalid, but they defeat grouping on the board. Out of scope for this handoff and
not worth an issue on its own — noting it for the next triage sweep.

## Notes for the next reviewer

- **The unenrolled guards from the handoffs that landed alongside this one all
  have owners.** `ISSUE_20260922_the_dag_attention_flags_fill_budget_claim_has_
  no_witness_anywhere` (open), `…_the_authored_split_regex_still_cuts_at_an_em_
  dash_which_nothing_witnesses` (open), `…_the_findings_splitter_scoping_guard_
  has_no_mutation_witness_entry` (open), `…_the_alert_badge_mutation_witness_
  anchors_at_the_retired_chip_rule` (resolved). Nothing was orphaned by this
  merge. The two this handoff filed —
  `…_forty_five_browser_check_names_are_interpolated…` (`audience: strategy`)
  and `…_the_markup_scan_twin_is_enrollable_now…` — both carry correct
  frontmatter and `found_by:` rather than `handoff:`.
- **108/108 is the new baseline to compare against**, replacing 93/96. It is the
  first clean full table on record, measured post-merge rather than on a branch.
- The four source issues are all `status: triaged` with `handoff:` back-links, so
  dispatch resolves them on Complete. No action needed.

## Overlay

Three entries added under "Recurring bugs to check": the `FILL_`-placeholder
grep; the don't-impeach-a-timing-with-one-run entry (written from my own
retraction); and a check for other worktrees' live tier runs before believing a
red, noting that killing a run does not reap its browsers.
