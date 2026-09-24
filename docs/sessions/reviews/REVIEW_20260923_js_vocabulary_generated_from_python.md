---
type: review
handoff: docs/sessions/active/HANDOFF_20260923_js_vocabulary_generated_from_python.md
reviewer: agent (review/js_vocabulary_generated_from_python)
date: 2026-09-23
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-23 — js_vocabulary_generated_from_python

`handoff/js_vocabulary_generated_from_python` @ `ad62510`, five commits, onto
`integration` @ `4424ee4`. **Clean fast-forward**: `integration` had not moved
since the branch was cut, so there was no conflict and no resolution to report,
and the merged tree is byte-identical to the handoff branch.

## Verdict

**APPROVE.** The deliverable does what the handoff's decided rung says: the
twenty-six hand copies are gone rather than checked, the pairing is a
regenerate-and-compare, and a hand edit to the generated file is red on its own
— a direction that had no analogue before. Every guard it adds I watched fail.
Two should-fix findings, both filed as issues, neither a regression: the
inventory that is the handoff's first deliverable missed one table, and two of
the six AST readers skip where the other four raise.

## Test cadence

**The benefit of the doubt is void, and this is the sentence that says so:** no
tactical completion report is on the branch or anywhere I could read it (the
lesson cites its "§7", so it exists; it is not a tracked artifact). So I ran the
full suite rather than a subset. Because the merge is a fast-forward onto an
unmoved `integration`, pre- and post-merge trees are the same tree, and the runs
below are both.

Armed the worktree with a directory junction to the main checkout's
`node_modules` (gitignored, so this leaves no trace) and ran the `[real]` tiers
through `--repo`.

| tier | command | result |
|---|---|---|
| pytest (all but the node-driven tier) | `pytest -q tests/ --ignore=tests/test_viewer_js_suite.py` | **1219 passed** |
| viewer fast | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **514/514** |
| annotate fast | `node apps/annotate/run_tests.cjs` | **151/151**, zero `SKIP` lines |
| browser TRUTH | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **25/25** browser checks, `[suite http] 407/407`, exit 0 |
| mutation witness | `--only` on all four specs the diff touches, `--repo C:/workspace/tolstack` | **7/7 declared mutations WITNESSED** |
| enrollment census | `--unenrolled --repo C:/workspace/tolstack` | fast 514/514, annotate 151/151, browser 475/**506** — matches `DECLARED_GUARDS` and the lesson's §6 |

`tests/test_viewer_js_suite.py` is **red in the worktree** and expected to be:
it refuses a skipped `[real]` tier, and the projection lives only in the main
checkout. The tier itself is the 514/514 row above, run through `--repo`. That
is the only test in the suite this review did not exercise as green.

The browser tier matters more than usual here and I ran it despite no CSS
change: the whole "`apps/viewer/vocab.gen.js`, not `apps/shared/`" decision
rests on the browser runner's server root answering 403 above `apps/viewer`.
`[suite http]`, `[app http]`, `[topology http]`, the repo-root static server and
all five annotate scenes pass, so the new `<script>` tag really loads at the
served origin and across the `../viewer/` boundary from the annotator. No 403 in
the log.

**Data pollution:** main checkout's `git status` clean, nothing under `data/`
written in the last three hours. The witness runner's shadow tree lands in
`tmp/`, which is gitignored.

## What I verified beyond green

**Every guard, watched failing** — the canonical "a new guard has been observed
failing" check, done independently of the author's own can-fail tests:

* edited `tolerance_stack/stack.py`'s `VERDICTS` to `("pass","qualified","fail")`
  → `test_the_generated_vocabulary_module_is_up_to_date` red, with a diff naming
  both sides and the regenerate command. Reverted.
* deleted the `vocab.gen.js` `<script>` tag from `topology.html` → the loader
  guard **and** the order guard red.
* moved the tag to *after* `viewer.js` → the order guard alone red. Reverted.
* the hand-edit direction and the two `VOCAB.table` refusals are the four
  mutation specs, all `WITNESSED` above.
* `generate_js_vocabulary.py` with no flags is idempotent and leaves the tree
  clean under `core.autocrlf=true` (`26 vocabularies, 67 words`); `--check`
  exits 0 on a clean tree.

**The lesson's arithmetic, re-derived** (two corrections applied inline as dated
blockquotes — see "Fixed inline"):

* **26 vocabularies / 67 words** — both confirmed, independently by counting the
  registry and by the generator's own summary line.
* **11 viewer.js + 10 topology.js + 5 binding_state.js = 26**, and `for_app`
  returns 21 / 5 — confirmed.
* **`CROP_RULES` = 3, `CROP_PLACEMENTS` = 6** — matches the literal mint sites in
  `build_viewer_crops.py` exactly.
* **"three other shared files across the `apps/viewer` boundary"** — confirmed
  (`storage/adapter.js`, `reader_facing_bans.js`, `warning_icon.js`).
* **deliverable 4 "came back empty"** — confirmed. There are exactly four
  `.length === N` literals in `apps/viewer/tests.js` and none is
  vocabulary-shaped. (Two of the four are a live-projection count and a geometry
  count rather than DOM counts, so the *wording* is loose; the conclusion is
  right, and `ISSUE_20260909_hardcoded_structural_counts_...` still owns
  `branch_nodes.length === 5`.)
* **browser still pinned at 506 declared / 475 enrollable** — confirmed
  unchanged.
* **`DECLARED_GUARDS` fast 513→514, annotate 154→151** — matches the diff
  exactly (one guard added to `tests.js`; four deleted and one added in
  `run_tests.cjs`).

**`apps/viewer/index.html`** is a redirect with no scripts, so the `LOADERS`
table really is every page and runner that reads a vocabulary.

## Findings

### Should-fix (filed, not fixed)

1. **`VA.CONFIDENCE_LABEL` is keyed by the generated `CONFIDENCES` vocabulary
   and was not routed through `VOCAB.table`** —
   `apps/viewer/viewer.js:69`, two lines below
   `VA.CONFIDENCES = VOCAB.list("CONFIDENCES")`. It is the same shape as the ten
   tables that *were* converted, it is not in the lesson's "deliberately did NOT
   take" list either, and its thirteen indexed read sites all say
   `VA.CONFIDENCE_LABEL[x] || x` — so a fifth confidence would print the raw
   machine word (`no_source_ref`) at a reader instead of refusing to load. Not a
   regression (it was equally unpaired before), but the handoff's deliverable 1
   is an inventory whose completeness is the lesson's headline, and this one is
   missing from it. Outside the inline-fix boundary: converting it changes
   designed behaviour. Filed as
   `ISSUE_20260923_confidence_label_is_keyed_by_a_generated_vocabulary_but_not_paired_to_it.md`
   (`med`). It also notes `VA.NAV_VERDICT_LEVELS` as an unremarked composition,
   the shape `AA.BINDING_STATES` got a sentence for.

2. **`crop_rules` and `crop_placements` skip a value they cannot resolve; the
   other four readers raise.** Measured, not inferred: pointing `crop_rules` at a
   copy of `build_viewer_crops.py` with `"resolved_by": NEW_RULE` returns two
   words instead of three, with no error. Removing a word is loud (the byte
   comparison catches it); a *newly minted* one written as a variable is silent —
   the generated file stays correct-looking and the viewer gets no branch. Three
   of the six readers also have no can-fail test (`crop_rules`,
   `crop_placements`, `identity_rules`), which is what the lesson's §5 claim I
   corrected was about. Filed as
   `ISSUE_20260923_two_crop_vocabulary_readers_skip_a_minted_value_silently.md`
   (`low`), with the trap that scoping `crop_rules` to `resolve_pdf` — the
   obvious fix — would *drop* `source_ref_export`, which is minted one function
   over in `pdf_from_export`.

### Fixed inline (correction blockquotes in the lesson; both inside the boundary)

3. **"Net: -934 lines of test"** — the net across `tests/` is **-547**
   (+503 / -1050). 934 is the pairing machinery alone (1044 deleted from the
   three modules, less the 110 kept in `test_js_python_vocabulary.py`), which is
   a fair measure of what was retired but is not the suite's net.

4. **"Those readers are AST walks with their own can-fail tests"** — three of the
   six, not six, and they do not refuse alike. Corrected with the measurement and
   a pointer to finding 2's issue.

### Nits

5. `crop_rules`' docstring and its registry `where` string both say "the
   `resolved_by` literals in `resolve_pdf`", and that `where` is rendered into
   `vocab.gen.js` as the pointer a reader follows to the owner. One of the three
   (`source_ref_export`) is minted in `pdf_from_export`. Folded into finding 2's
   issue rather than filed separately.

6. `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain`'s vacuity guard
   is `assert len(tables) > 15`. The 21 generated vocabularies now satisfy it on
   their own, so it no longer says anything about the hand-authored half the
   character scanners read. Not worth a change today; worth knowing the threshold
   has stopped meaning what it meant.

7. `apps/viewer/README.md`'s `config.js` inventory line was corrected in passing
   ("rebuild commands" → "deliberately no rebuild commands"). Out of the
   handoff's scope, but it was stale against `config.js` and is now right.

### Noted, not a finding

The design deliberately trades a mis-keyed table for a **blank page** rather
than a degraded one: `window.TolstackVocab.viewer` is read at IIFE entry, so a
missing module throws before the render-crash banner can exist. That state
cannot ship — the byte comparison, the loader guards and both fast tiers all
catch it in the tree — and the author argues the trade explicitly. Recording it
so the next reader of `vocab.gen.js` does not rediscover it as a surprise.

## Checklist maintenance

`docs/prompts/REVIEW_AGENT.md`: the tactical agent had already rewritten the
"documented vocabularies drifting" entry for the post-generation world (its
(a)/(b)/(c)), which is the right shape. I added **(d)** — a per-value table
keyed by a generated vocabulary but never routed through `VOCAB.table`, with the
`VA.TABLE[x] || x` tell and the one grep that finds them — and a new entry for
**an AST reader that skips instead of raising**. Both are this review's own
findings; neither existed as a class before generation did.

## For the next reviewer

The four `inList` accept-lists the author filed
(`ISSUE_20260923_four_value_guard_accept_lists_...`) plus my two make six open
threads on this surface, and three of them want the same thing: a Python-side
constant that does not exist yet (`checks_source`), a registry row for a
vocabulary the *tests* read but the app does not (`SOURCE_REF_KINDS`), and the
`VOCAB.table` conversion of `CONFIDENCE_LABEL`. They are one small handoff, not
six.
