---
type: review
handoff: docs/sessions/active/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
reviewer: agent (review/mutation_witness_enrollment_gaps)
date: 2026-09-18
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-18 — mutation_witness_enrollment_gaps

**APPROVE.** All six deliverables land, every one of the ten new witnesses was
re-verified by me rather than taken on the author's word, and the three new
pytest guards were each observed failing on a planted defect. Four inline
corrections, all prose-of-fact (listed below). One issue filed.

## What I ran

Merged `handoff/mutation_witness_enrollment_gaps` into
`review/mutation_witness_enrollment_gaps` — a clean **fast-forward**
`dbdb701..db6aa51`, no conflict, so the conflict carve-out never came up.

| | |
|---|---|
| `pytest -q` (worktree) | **1206 passed, 1 failed** — `test_viewer_js_suite_is_green`, the deliberate worktree red documented in `CLAUDE.md` (the `[real]` tier has no `data/`) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **455/455** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **22/22** browser checks, all sub-checks green |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | **64/64 declared mutations witnessed** — no miss, no `SKIPPED`, no `ANCHOR ROTTED` |
| `pytest -q` again, **with `tmp/mutation-witness/` on disk** | 1206 passed, same single red — see "The trap I went looking for" |

`node_modules` came from a directory junction to the main checkout, per the
lesson's §6; **removed before finishing.**

## The tier, entry by entry — the definition of done, met

64/64 is the headline, but the number that matters is that each of the **ten
new** entries witnessed on the check it declares, independently of the author's
run:

| entry | tier | reddened |
|---|---|---|
| `viewer-vocabulary-not-a-comparison-chain` | python | ✓ |
| `worst-verdict-ranks-worst-last` | fast | ✓ |
| `no-projection-banner-read-at-its-call-site` | annotate | ✓ |
| `annotate-flyout-waits-out-the-respine` | browser | ✓ |
| `rendered-text-guard-sees-a-run-id-shape` | fast `[real]` | ✓ |
| `rendered-text-guard-sees-a-schema-field-name` | fast | ✓ |
| `lightbox-zooms-about-the-stages-corner` | browser | ✓ |
| `crop-figure-carries-its-launcher` | fast | ✓ |
| `builder-emits-the-parts-list-companion` | python | ✓ |
| `builder-names-the-drawing-the-link-is-called-after` | python | ✓ |

Deliverable 4's *third* prediction (the lightbox's frame pixel sizing) is
correctly **not** entered: it does not reproduce, and it is owned by
`ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_unwitnessed_in_every_tier.md`,
already staged to `HANDOFF_20260918_visual_rules_nothing_checks.md`. The two
entry notes that quote that review's measurements
(`browser 16/17 on the anchor check`; `fast 450/453, both parity walks and the
no-op click check`) match `REVIEW_20260917_crop_lightbox_zoom_viewer.md` line
for line.

## New guards observed failing — five plants, all in a `git archive` scratch tree

The universal check says do not accept a guard on the strength of green. Every
new or materially-changed guard in this diff, broken on purpose:

| plant | what fired |
|---|---|
| truncate `crop-figure-carries-its-launcher`'s `expect_red` to 40 chars | `test_no_expect_red_is_a_truncated_check_name` — and its message quoted the full printed name back |
| point a python entry's `suite` at `tests/test_mutation_witnesses.py` | `test_every_python_entry_names_a_test_file_the_shadow_can_run` |
| point a python entry's `suite` at `scripts/build_viewer_crops.py` | the same test, **and** `test_every_expect_red_resolves_to_exactly_one_place` |
| flip the runner's `python: { suites: true }` to `false` | `test_the_two_sides_agree_on_which_tiers_take_a_suite` |
| delete the runner's whole `python:` harness row | `test_the_runner_and_this_module_hold_the_same_tier_vocabulary` + the suites-agreement test |

The runner's half of the re-entrancy refusal was exercised too: with a python
entry pointed at the pairing module, `--only builder-emits` prints
`REFUSED: … That module is this table's own pairing half …` and never builds the
shadow. Belt and braces, as the lesson claims.

## The trap I went looking for — and both fixes are load-bearing

`pytest.ini` and the `tmp` entry in `_SKIP_DIR_NAMES` are the two things in this
diff a reviewer could most easily wave through, because **they are invisible
until the tier has run once** and `tmp/` is gitignored. Measured, with the
shadow on disk:

- `pytest -q -o "norecursedirs=<pytest's plain defaults>"` (i.e. the tree
  without `pytest.ini`) → **`Interrupted: 35 errors during collection`**. The
  lesson's "35 errors" is exact.
- `live_documents(repo_root)` returns **92** documents; with `tmp` removed from
  `_SKIP_DIR_NAMES`, **105** (+13). The corpus doubling the lesson describes is
  real and the fix is the whole of it.

Both fixes are outside the handoff's stated scope, and both are correct to have
made here: they are damage the in-scope change caused, not opportunism. The
`PROVENANCE.md` amendment for the second one is accurate — `test_tolerance_stack.py`
does collect **159** tests, unchanged.

## Findings

### Blockers

None.

### Should-fix — fixed inline (prose of fact only; nothing designed changed)

1. **`docs/prompts/REVIEW_AGENT.md`, the new review-merge item: "stayed gone
   four days … before anyone bisected it" is wrong, and it is written as
   `Measured:`.** The four days and three duplicate filings belong to the whole
   `card-layout` *guard* saga, first filed 2026-09-11. The regression the item
   is about entered at `afcbbb4` on **2026-09-15 22:28:36** and was bisected and
   filed at **23:14:03 the same night** — 46 minutes. The claim is carried
   faithfully from `ISSUE_20260916_a_review_merge_…`, which is where it
   originates; the handoff inherited it rather than invented it. *Fixed:* the
   clause is replaced with a dated correction that gives the real window and
   says not to quote the four days forward. The argument the item makes does not
   depend on it — the cost of a merge-only regression is that no branch's green
   can see it, not how long it hid. **The five cited shas all resolve, and
   `afcbbb4` is exactly the named merge; that half of the evidence is sound.**

2. **The lesson's summary line undercounts its own work: "one stale note
   corrected" where two were.** `sticky-rails-hold-a-scrolled-dag` (the filed
   one) and `crop-carries-the-boxes-worth-looking-at`. Commit `29a6c8e`'s
   subject says two. *Fixed* in the lesson's correction block.

3. **The lesson's §1 cost figure double-counts the tier run.** "≈45 minutes of
   agent time, plus one 11-minute unattended run" — but the 11m25s run sits
   *inside* the window the table measures (18:41:34 → ~19:25 ≈ 44 minutes). The
   honest split is ~44 minutes wall clock, ~33 active. This matters because §1
   exists to hand a number to
   `BRIEF_20260915_mutation_witness_enrollment.md`. **The headline survives**:
   44/10 ≈ 4 minutes an entry, which is the figure §1 already draws. Every other
   timestamp in that table matches the commits exactly. *Fixed* in the
   correction block.

4. **§4's "verified … by their author AND by a reviewer" does not hold for the
   two entries that missed.** A reviewer did replay three paste-ready entries
   against the pairing helpers — `REVIEW_20260916_js_guards_and_suite_isolation.md`,
   lines 92–98 — and all three of *those* witnessed first time. The two that
   missed came from
   `ISSUE_20260916_the_reader_facing_copy_guards_have_no_mutation_witness_entry.md`,
   authored by the tactical session itself (`80aa021`); that handoff's review
   never mentions the witness table, and no other review touched the issue
   before triage. *Fixed* in the lesson's correction block and in
   `test_no_expect_red_is_a_truncated_check_name`'s docstring, which carried the
   same clause. **The lesson's conclusion gets stronger, not weaker:** the trap
   caught the paste with one pair of eyes on it and not the paste with two,
   which is the argument for a guard rather than more review.

### Should-fix — filed, not fixed (needs a test, so outside the inline boundary)

5. **`mutation_witnesses.json`'s `about` block is a third, unpaired copy of the
   tier vocabulary — and says it isn't.** The block carries a bulleted list with
   one row per tier word, then states *"The tier words themselves are written in
   exactly two places"*. Nothing reads the `about` block, so a fifth tier or a
   rename leaves it describing a vocabulary that no longer exists with every
   pairing green. Pre-existing — the sentence said "two places" when the list
   held three words — but this handoff added a fourth bullet under it.
   `ISSUE_20260918_the_witness_tables_about_block_is_a_third_unpaired_copy_of_the_tier_vocabulary.md`
   (`chore`, `med`), with the reader's two gotchas written down.

### Nits (not fixed, not filed)

- The runner's `REFUSED:` message reads `<one id> declare …` — the verb is
  pluralised for the list form and is ungrammatical in the single-entry case,
  which is the only case anyone will hit.
- The second overlay edit (`## Architectural errors to check`'s existing
  card-layout block) splices "That is now a standing instruction" into the
  middle of a paragraph and leaves one over-long line; "the sibling merge" is
  opaque on first read.
- `SHADOWED`'s "194 KB against 5.2 MB" still reads correctly as a fact about
  `docs/topologies/` alone, but three `docs/` subdirectories now sit under it
  (~1 MB total). Not stale, just easier to misread than it was.

## What else I checked

- **Scope.** `pytest.ini`, `tests/test_tolerance_stack.py` and `PROVENANCE.md`
  are outside the handoff's declared four files. All three are consequences of
  widening `SHADOWED`, all three are minimal, and leaving them out would have
  shipped a red suite to anyone who ran the tier. Correct call. **No guard's
  assertion and no app code was changed** — the handoff's hard fence holds; the
  only `apps/` bytes touched in this diff are inside `find`/`replace` strings in
  the table.
- **Every referenced issue exists.** All 25 `ISSUE_*` names appearing in any
  entry's `issue` or `note` resolve to a file in `docs/issues/`.
- **All six routed issues carry `handoff:` back to this handoff**, so dispatch
  resolves them on Complete. `found_by:` is right on all six and on the new one.
- **Stale-note sweep, all 64.** Scanned every `note` for forward-looking or
  time-bound phrasing. The remaining `until` / `today` / `for now` hits
  (`pane-divider-visible-at-rest`, `flyout-*`, `a-link-a-respine-adds-fades-in`)
  are all past-tense statements of history, not live claims. The DoD's "check
  all of them" is met.
- **No test pollution.** `C:\workspace\tolstack` is `git status` clean after
  four tier runs and two suite runs.
- **The runner's uncovered outcome path is handled.** A python mutation that
  breaks collection produces `ERROR`, not `FAILED`, so no name parses — the
  runner reports `MISS.NEVER_REACHED` with "the suite ABORTED rather than
  failing a check", which is right.

## Checklist maintained

Three edits to `docs/prompts/REVIEW_AGENT.md`, all committed on this branch:

- The review-merge item's `Measured:` clause corrected (finding 1).
- **New:** *"A diff that widens a tree the repo COPIES has to be re-tested with
  the copy on disk"* — with both measurements above, and the order that finds it
  (run the tier, **then** pytest).
- **New:** *"A declaration two consumers read, where the cheap one compares it
  loosely and the expensive one compares it exactly."*
- **Refined:** the existing "copy `node_modules` into your review worktree"
  entry now offers the junction, with the reparse-point warning that makes
  removing it mandatory rather than tidy.

## For the next reviewer

You are the first to run the new item on yourself. It cost ~13 minutes of
wall clock here and found nothing — which is the expected outcome and not an
argument against it; the point is the merge-only class, and this merge was a
fast-forward, the one shape that cannot produce one. The first *real* test of
the rule will be a review whose merge is a true merge commit. When you get one,
say so in your report either way, so the rule accumulates evidence rather than
compliance.
