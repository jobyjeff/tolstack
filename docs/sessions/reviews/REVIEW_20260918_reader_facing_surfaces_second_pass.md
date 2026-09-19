---
type: review
handoff: docs/sessions/active/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
reviewer: review agent (opus)
date: 2026-09-18
verdict: REQUEST CHANGES
blockers: 1
rounds: 2
---

# REVIEW 2026-09-18 — reader_facing_surfaces_second_pass

> **Two rounds.** Round 1 is below as written. **Round 2 is at the end of
> this file** — the round-1 blocker is fixed and verified, and a different
> one arrived with the merge. The verdict in the frontmatter is round 2's.

**REQUEST CHANGES.** One blocker, and it is narrow: the work is good and five
and a half of the six deliverables are done properly, demonstrated and guarded.
But retiring the crop head took two mutation witnesses with it that nothing on
the branch notices — **64/64 → 62/64**, measured on both sides — and the lesson
states the opposite. That is a guard regression on the one tier this repo has
spent two handoffs learning to trust, so it goes back rather than merging.

The branch is **not merged**. It is merged into
`review/reader_facing_surfaces_second_pass` (`dbaf44a`) for testing only;
`integration` is untouched at `08855d2`.

## What I ran

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **466/466** (455 at the branch point) |
| `node apps/annotate/run_tests.cjs` | **84/84** (81 at the branch point) |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **22/22** |
| `PYTHONIOENCODING=utf-8 … -m pytest -q` | **1206 passed, 1 failed** — `test_viewer_js_suite_is_green`, the by-design worktree red (no `data/projections/`); its message is entirely about the missing projection path and is independent of this diff |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | **62/64 — see the blocker** |

Also re-ran pytest **with `tmp/mutation-witness/` on disk**, which is the order
the overlay says finds the shadow-tree collection trap: still 1206/1, so
`pytest.ini`'s `norecursedirs` and `_SKIP_DIR_NAMES` survive this merge.

The merge into the review branch was **clean** — no conflicts, including in
`scripts/mutation_witnesses.json`, which both this branch and the already-merged
`mutation_witness_enrollment_gaps` edited (different regions). Nothing to report
under the conflict carve-out.

The mandatory stack checks (provenance audit, signs, LMC/MMC, RSS, traced ratio)
do not apply: no stack, topology, spec-library event or material entry changed.
`apps/viewer/fixtures.js`'s `DEMO_STAINLESS` gained a `library_ref`, and that is
a fixture — explicitly a claim about nothing real, argued in place.

## BLOCKER

### 1. Both crop-prefix mutation witnesses died with the crop head — 64/64 → 62/64

**Location:** `apps/viewer/views/detail.js:327`, `apps/viewer/views/topology.js:2076`,
`apps/viewer/tests.js:1737` and `:8588`, `scripts/mutation_witnesses.json`
(`stack-pane-crop-block-keeps-its-prefix`, `topology-pane-crop-block-keeps-its-prefix`).

Measured, both directions:

* at `08855d2` (`integration`, in a scratch worktree): both entries **WITNESSED**;
* on this merge: both **NOT WITNESSED — "the tier stayed GREEN with the mutation
  applied"**. I reproduced it outside the runner as well: apply the entry's own
  mutation (`"detail__crop-"` → `"detail__crop"`) in `views/detail.js` and the
  fast tier is **466/466**.

**Why.** `VA.PANE_CROP = { omitHead: true }` stops `VA.cropReference` appending
`div.detail__crop-head`, and that head was the only node in the block whose class
came from the `classPrefix` argument **at every origin**. The `-links` row renders
only where the origin can follow a link (the test's own comment says so,
`tests.js:1729-1736`), and `detail__crop-img` is a *separate literal* passed to
`VA.cropFigure` on the line above, not derived from `classPrefix` at all. So
`unseparatedPrefixes(root)` now has nothing to sweep in the node tier, and the
re-anchoring on `eq(all(root, "img.detail__crop-img").length, 1)` proves the test
was looking at *something* — not that it was looking at the thing the mutated
argument controls.

The entries should **not** be retired: the defect they describe is still real (in
a browser the links row would render as `detail__croplinks`, unstyled), and that
one-character defect has shipped here once before.

**Two things make this blocking rather than a should-fix.** The repo's own rule,
in the runner's exit text and in `docs/prompts/REVIEW_AGENT.md`'s merge item: a
drop in the witnessed count is the finding, and a guard that no longer reddens on
its declared mutation is not a guard. And the lesson says the opposite —
*"Mutation-witness tier: the two entries I re-pointed both re-witnessed"* and
*"both re-witness"* — which is exactly the kind of claim later sessions quote
forward without re-deriving.

**Suggested fix** (yours, not mine — it is a guard design decision and I would
want the tier re-run to believe it): make a prefixed node observable in the node
tier rather than anchoring on a node the argument does not build. The cheapest
shape is to render this pane once with a config whose `drawingCheckerWebui` is
set, so `VA.runUrl` resolves and `div.detail__crop-links` exists, then assert both
its presence and the sweep. Whatever you choose, the acceptance test is
`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only
stack-pane-crop-block-keeps-its-prefix` (and the topology twin) reporting
WITNESSED, with the lesson's sentence corrected to match.

## Should-fix

### 2. The thirteen new guards have no enrolling handoff left — filed

The handoff told you not to touch `scripts/mutation_witnesses.json` and to name
your new guards for `mutation_witness_enrollment_gaps` to enroll. You did that
well — the lesson's table gives the mutation for each, which is most of the work.
But that handoff reached `completed/` and merged the same day (`0b849fa`,
`62fd404`), so the rows have no owner. Filed as
`ISSUE_20260918_thirteen_new_guards_have_no_mutation_witness_and_their_enrolling_handoff_closed.md`.
No action needed in the rework beyond leaving the lesson's table as it is.

### 3. `apps/annotate/run_tests.cjs` is run by no gate — filed

Deliverable 4's three new checks live in a runner that **nothing** runs: no
pytest wrapper, no `package.json` script, not in `CLAUDE.md`'s pre-merge list.
`tests/test_mutation_witnesses.py` knows `"annotate"` as a tier *name* for
witness entries, which is not the same thing. Pre-existing rather than caused by
this work, but this work just put reader-facing guards there. Filed as
`ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate.md`.

## Nits

* **`apps/annotate/commands.js:302`** — `AA.COMMAND_HINT_PREFIX` / `AA.commandHint`
  were inserted into the **middle of `planIsolate`'s docstring**, severing it: the
  comment now reads *"…which already-open ones to"*, then seventeen lines about
  the command box, then *"show, and which already-open ones to hide."* Move the
  new block above the comment or below the function. Not fixed inline — you are
  reworking anyway, and the inline-fix boundary says a reviewer who rewrites is
  reviewing their own work.
* **`apps/viewer/reader_facing_bans.js`** — the checksum shape's description says
  *"twelve hex characters"* while the pattern requires 24 or more. Carried over
  verbatim from `tests.js`, so not yours; worth a word while the file is new.
* **The lesson's 324 against the handoff's 294.** I re-derived both renderers over
  the live `WORKSHEET_hub_bearing_thermal_fit.md`: **324 paragraphs before, 74
  after**, 149 → 168 `<strong>`, **zero** stray `**` runs, and the rendered word
  stream grows by 6 (the asterisks that were text becoming tags) with no text
  lost. So your number is right and the issue's 294 is the stale one — the lesson
  reconciles 750/653 for the row height and does not do the same here. One
  sentence.
* **The `after` screenshots for deliverables 1–6 predate the topbar fix** — shots 3
  and 5 still show `renders data/projections/viewer/` in the topbar. Not a defect
  (the topbar has its own before/after row in the evidence table), just worth
  knowing they are not one consistent tree.
* **A seventh fix rode along:** `views/topology.js`'s `citation(…, partLabel)`, so
  an edge whose part is named after its own drawing stops saying the part number
  twice. In class, guarded by a new test, and mentioned only because it is not one
  of the six.

## What I verified, beyond the counts

**Every guard I could reach, mutated by hand and observed failing** — none of
these are enrolled, so green proves nothing on its own:

| mutation | reddens |
|---|---|
| revert `apps/viewer/vendor/markdown.js` to the branch point | 4 checks, including `[real] the live worksheet renders paragraphs by its BLANK LINES` |
| restore `parts (data/meshes/)` in `apps/annotate/index.html` | `the annotator's own markup prints no repo path…` (83/84) |
| restore `renders <code>data/projections/viewer/</code>` in `topology.html` | `this page's own markup prints no repo path…` |
| drop `VA.JOINT_EXPORT_SUBJECT` at the joint block's call site | `a joint whose export was never established says so in the JOINT's words` |
| drop `VA.PANE_CROP` at the stack pane's call site | `the stack pane states its document ONCE…` — the *new* half of that test is witnessed; only the prefix half is not (blocker 1) |
| put `materials.json` back in `VA.VALUES_STATUSES.inline.text()` | 3 checks, including the new every-branch scan |
| revert `DEMO_STAINLESS` to `inline` / null | `a spec-library reference renders whatever the status says` |

**Deliverable 3's non-vacuity claim holds.** The new
`every branch of the CTE sourcing vocabulary is scanned…` walks
`Object.keys(VA.VALUES_STATUSES)` plus both `library` arms plus an off-vocabulary
status, renders each on *both* surfaces, and scans the view-model's text as well
as the DOM; and it asserts `values_status` and `library_ref` really are in the
field-name list, so the scan cannot pass by scanning for nothing. The fixture half
is load-bearing too — reverting `DEMO_STAINLESS` reddens a check.

**Deliverable 2, re-derived independently of the suite** (numbers in the nits
above). The `[real]` bound is computed from the source's blank-line chunks without
the parser (144 chunks, 74 paragraphs) and asserts the document is wrapped enough
for the bound to bite, which is the right shape.

**Deliverable 6's register call.** The handoff pre-registered the per-subject
sentence and asked review to check it; the author additionally made the joint's
`unestablished` **quiet**, flagged that as going beyond the sentence, and gave the
argument (the recorded `why` is an absence somebody recorded, not one somebody
failed to resolve; `loud` is reserved for the second; one accent per view). I
agree, and the `why` still renders under the headline either way. The two-subject
assertion (`eq(keys.length, 2)`) is the right guard for a third subject arriving.

**Design read of the changed surfaces** (screenshots plus the live tiers): the
materials row now matches the elements row's density; the material pane's
hierarchy is heading / chips / where-line / muted sentence / record prose, muted
rather than smaller-and-bolder, one accent; the annotator's two strings are plain
words. No design issue worth filing.

**Renames swept:** no `selectedElementId`, `onElementSelect`, `mat-row__values`,
`mat-row__libref`, `mat-row__desig`, `el-row__srcnote`, `el-row__callout` or
`mat-row__request` survives in live code or CSS; the only hits are dated history
and the issues that named them.

**`VA.EXPORT_STATUSES.established.loud` became a function** — every consumer reads
the resolved boolean off the view-model (`viewer.js:903` is the only caller), so
nothing was left reading the old shape.

## For the next reviewer

* The overlay gained one entry for this: *a fix that SUPPRESSES a node takes every
  guard standing on that node with it, and an anti-vacuity anchor has to be derived
  from the argument under test.* Grep the suppressed selector across `tests.js`,
  `run_viewer_browser_tests.mjs` and `mutation_witnesses.json` **before** accepting
  an `omitX`.
* A directory junction (`New-Item -ItemType Junction`) is enough to get
  `node_modules` into a review worktree for the browser and mutation tiers. I
  removed mine, and the scratch worktree, before finishing.

---

# ROUND 2 — 2026-09-18, after `5420b76`

**REQUEST CHANGES again. One blocker, and it is not the same one.** Round 1's
blocker is **fixed and verified**; a *different* guard has lost its subject to
the same class of change, and this one only becomes visible at the merge.

`integration` moved while the rework was in flight — `08855d2` → `c484b8c`,
carrying `visual_rules_nothing_checks`. I merged that in first, then the rework.

## Round 1's blocker: closed

The fix is better than the one I suggested. Instead of moving the anchor,
`cropsWithRuns()` **supplies the missing input** — a `run_dir` on the crop entry,
so `VA.runUrl` resolves and `div.detail__crop-links`, which *is* built from
`classPrefix`, renders at every origin. The http browser run then exposed a
second half I had not seen: `topoCtx` leaves `config` undefined, so the topology
pane could only ever build a link over `file://`; that ctx now gets
`config: VA.CONFIG`.

Verified three ways:

* **`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` on
  the merge: 64/64 declared mutations witnessed**, both pane entries named
  explicitly as WITNESSED;
* by hand, in a scratch copy of `apps/` (so as not to disturb the running tier's
  anchors): applying both prefix mutations takes the fast tier to **465/467**,
  reddening exactly the two checks that own the claim;
* both annotate guards still bite — restoring the old placeholder reddens *the
  annotator's own markup…* and *the command box says what it accepts…*.

The lesson now **opens** with the correction and names the root cause, which is
worth more than the fix and is why I am satisfied it will not recur: *"I ran the
two entries with `--only` after re-pointing them, saw WITNESSED, and wrote the
claim — but that run was before the re-anchor… Re-running a witness before the
last edit that touches its test is the same as not running it."* All round-1 nits
are addressed, and the screenshots were re-shot on one tree (shot 3's topbar now
reads *built projections*).

## BLOCKER

### 1. The typography suite's source-note clamp checks lost their subject — 9/9 at `integration`, 7/9 on the merge

**Location:** `scripts/run_viewer_browser_tests.mjs:5677-5705` (sub-checks 5a and
5b of `typography pass's visual rules (live stack view)`), against this branch's
deletion of `.el-row__srcnote` from `apps/viewer/views/stack.js`.

```
[typography pass's visual rules (live stack view)] 7/9 sub-checks passed: FAIL
    FAIL a row's source note really has more in it than the row shows — the witness…
    FAIL ...and it is clamped to a PREVIEW of at most three lines…
22/23 browser checks passed
```

Measured on both sides, same command, same `--repo`:

* at `c484b8c` (`integration` alone, scratch worktree, `--only typography`):
  **9/9 PASS**;
* on this merge: **7/9 FAIL**.

**Why.** The check reads `#stackview .el-row__srcnote:not(.el-row__srcnote--open)`
and gets `null`, because this work retired the composite source cell: the row's
note moved to the preview pane, and `.el-row__srcnote` is now rendered by nothing
— it survives only as a word in a `style.css` comment. The guard is *well*
written (it fails rather than passing when its subject is absent, which is why we
are having this conversation at all), but its claim — *a row's note is a preview,
so it is not the thing setting the row's height* — no longer has an instance,
because your change satisfied it more completely than the clamp did.

Neither branch can see this alone. `visual_rules_nothing_checks` wrote the guard
on 2026-09-18 while this branch, cut from `47134d6`, was deleting the node; that
handoff is merged and closed.

**Why it is yours rather than mine to resolve.** It is the *third* instance of
round 1's class in this one branch — a guard standing on a node this work removed
— and the second one nobody swept for. You did the sweep for `detail__crop-head`
after round 1; `el-row__srcnote` and `el-row__callout` went dead in the same
commit and were taken out of `VERBATIM_PROSE_CLASSES` and `style.css`, but
`scripts/run_viewer_browser_tests.mjs` was never grepped. You also hold the
argument for *why* the row note is gone, which is what the retirement or re-point
has to be written against.

**I did the sweep for you, so the fix is bounded.** Every selector this branch
deleted, across all three guard files:

| deleted selector | live guard standing on it |
|---|---|
| `el-row__srcnote` | **`run_viewer_browser_tests.mjs:5678`** — the blocker |
| `el-row__callout`, `mat-row__values`, `mat-row__libref`, `mat-row__desig`, `mat-row__request` | none |
| `detail__crop-head` | none live; one *prose* mention (see the nit below) |

**Suggested fix, and the choice is the point.** The two remaining clamped
previews are `hovercard__note` (a hover card) and `el-export__note` (the *pane's*
export note) — neither sits in a table row, so neither carries the row-height
argument the check was written for. So I think the honest resolution is to
**retire the pair with the reason stated in the suite's own comment** — the row
no longer renders a note at all, and the claim is now carried by `[real] the
materials ROW keeps only what decides whether to click it` and its elements-table
twin in the fast tier — and to file an issue so the retirement is visible to
whoever owns the typography rules. If you think it should be re-pointed instead,
say to what and why; that is a defensible other answer and it needs to be argued
rather than assumed. Either way the acceptance test is
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
reporting **23/23**.

## Nits

* **`scripts/mutation_witnesses.json:468`** — the `contract` prose on
  `stack-pane-crop-block-keeps-its-prefix` still describes the pane as rendering
  *"`detail__crop-head` / `detail__crop-links`"*. The entry itself works (the
  mutation and `expect_red` are right); the sentence describes a node
  `VA.PANE_CROP` retired. One line, while you are in the file.
* **Fixed inline, and saying so:** `apps/viewer/tests.js:1751` claimed
  `cropsWithRuns`' shape is one *"the builder really emits (three live entries
  carry exactly `resolved_by: "source_ref_export"` with a run_dir)"*. Recounted
  against the live `crops.json`: **six** entries carry a `run_dir`, all of them
  `resolved_by: "source_ref_export"`, across **three** drawing-checker runs and
  four stacks. The argument is unaffected — the shape is real — but the number was
  wrong, so I corrected it in place rather than spending a third round on one word.
* `VA.JOINT_EXPORT_SUBJECT = "joint"` is *not* a twelfth instance of
  `ISSUE_20260918_va_joint_export_key_is_a_twelfth_hand_copy_of_a_python_constant…`
  — it is a viewer-internal subject key with no Python twin, paired by the
  viewer's own `eq(keys.length, 2)` check. Noted because the two constants now sit
  three lines apart in `views/stack.js` and a future reader will wonder.

## Round 2 tiers, on the merge

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **467/467** |
| `node apps/annotate/run_tests.cjs` | **84/84** |
| `PYTHONIOENCODING=utf-8 … -m pytest -q` | **1208 passed, 1 failed** (the by-design worktree `[real]` red) |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | **64/64 witnessed** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **22/23 — the blocker** |

## The merge conflict I resolved, and why it chose what it chose

`docs/prompts/REVIEW_AGENT.md`, merging `integration` (`c484b8c`) into the review
branch. Both sides **appended** to the end of `## Recurring bugs to check`, at the
same anchor: `visual_rules_nothing_checks`' review added four entries (skipped
browser suites counted as green, the unpaired confidence-token list, the
sibling-habit claim, the re-take-a-screenshot-twice entry) and round 1 of this
review added one (a fix that suppresses a node takes its guards with it).
Resolution: **keep both, integration's four first and mine last**, so the newest
entry sits at the end of the list. Nothing was dropped and no entry was edited — a
pure append collision, not a disagreement about intent.

## Housekeeping

The scratch worktree at `C:/workspace/tolstack-worktrees/_rev_base2` and both
`node_modules` junctions are removed, and `tmp/mutation-witness/` is deleted.
`integration` is untouched at `c484b8c`; the work sits on
`review/reader_facing_surfaces_second_pass`, which now carries `integration` plus
the rework plus this report.
