---
type: review
handoff: docs/sessions/active/HANDOFF_20260921_review_overlay_test_cadence.md
reviewer: agent (review/review_overlay_test_cadence)
date: 2026-09-21
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-21 — review_overlay_test_cadence

Work reviewed: `handoff/review_overlay_test_cadence` @ `4e7054a`, four commits,
four files (`docs/prompts/REVIEW_AGENT.md` +160/-15, two issues, one lesson).
Baseline `integration` @ `1d31b69`, which equals `master` — the handoff branch
already contained the integration tip, so the merge was clean and there was no
incoming range to check for semantic conflict (`git log --oneline HEAD..master`
was empty).

## The seven mandatory checks

**All seven are N/A, and the reason is not "docs-only".** They are the
stack-authoring checks — traced `source_ref`s, the re-derivation table, LMC/MMC,
the gap list. This handoff's entire deliverable is one prompt document plus two
issues and a lesson; it adds no element value, no stack, no topology, no spec
parse event, so there is nothing for checks 1-7 to bite on. The overlay's own
"When the work is a spec-library parse event (not a stack)" carve-out is the
nearest precedent and says the same thing. Recorded explicitly rather than
silently skipped, per "not mentioned is not checked".

What stands in for them here is the repo's one rule applied to prose: **every
factual claim the new text makes about the tree is either verifiable in the tree
or it is invented.** That is what I spent the review on.

## What I verified

### Every claim in the new mapping, against the tree

- **All 19 test modules and 6 runner/script paths the new "Choosing the risky
  subset" section names exist.** Checked individually; zero misses. For a
  section that is nothing *but* a list of paths, this was the main exposure and
  it is clean.
- **`--repo` support is stated correctly for all four runners.**
  `apps/viewer/run_tests.cjs` (`argv.indexOf("--repo")`, line 22),
  `scripts/run_viewer_browser_tests.mjs` (line 63) and
  `scripts/run_mutation_witness_tests.mjs` (line 112) take it;
  `apps/annotate/run_tests.cjs` has **no** occurrence of the string, exactly as
  the row claims. The row's harder claim is also true and is the kind that is
  usually wrong: annotate's `[real]` checks try the repo-relative path and then
  a hardcoded `C:\workspace\tolstack\...` fallback (lines 2409-2414, 2731-2732),
  and print `SKIP  [real] ...` while leaving the total green. Measured from this
  worktree with no flag: **154/154 passed**, every `[real]` check included —
  the lesson's number, reproduced.
- **The topology rewrite names a real assertion.**
  `test_the_number_of_closing_edges_is_the_graphs_cycle_count` is at
  `tests/test_topology_projection.py:294` and its body asserts
  `components == 1` with a comment saying it exists so a disconnected topology
  reds there. So the edit at the old ":4283" — replacing "run the full suite"
  with `pytest -q tests/test_topology.py tests/test_topology_projection.py` — is
  sound, and its fixture is built from the committed documents, not from
  gitignored `data/`, so it works in a worktree.
- **Both "traps" reproduce exactly.** Post-merge `pytest -q` in this worktree:
  `1 failed, 1208 passed` on `test_viewer_js_suite_is_green`, the handoff's
  number to the digit. Through the seam,
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **478/478**.
- **The lesson's own subset measurement reproduces.**
  `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py` -> **170
  passed**, the number the lesson quotes.

### The sweep, independently

I re-ran the sweep rather than accepting the count. Two greps over the pre-work
file (4528 lines, the line count the lesson quotes, confirmed): the command
grep, and the phrase grep the lesson recommends (`full suite|whole suite|entire
suite|both checkouts|all three tiers`).

**The count of four is right, and the fourth instance is real** — the
topology-connectivity entry in "Architectural errors to check" was not in the
filed issue, names no command, and is conditional. The lesson's point that the
command grep alone under-counts is correct and is the transferable half.

Three sites the sweep did not mention, all of which I judged **non-instances**
and am recording so the count is defensible rather than merely asserted:

- *"delete the guard and re-run the suite"* (the vacuity-check entry). The
  measured example resolves "the suite" to one module's 43 tests. Targeted, not
  a whole-suite order.
- *"mutate, re-run all three tiers"* (the counterfactual-edit habit). Scoped to
  one deliverable in a scratch copy; this is the mechanism the cadence wants.
- *"Re-derive any corpus count yourself in both checkouts"* (the
  `live_documents()` dirt entry). Matches the phrase grep and does deny a
  reported number the benefit of the doubt — but what it orders is a
  `live_documents()` call, not a suite run, so it costs nothing the cadence is
  trying to save. Worth knowing it exists; not worth an edit.

### Definition of done, item by item

| DoD item | Verdict |
|---|---|
| No sentence denies the report the benefit of the doubt | PASS |
| No pre-merge full-suite order (or an argued exception) | PASS — no exception taken |
| Transcription reason survives as its own point | PASS — split into its own bullet, and improved: it now says *why* the `# JEFF E18` comment is what makes the suite a transcription check |
| Item 1 cross-references the post-merge entry | PASS — by quoted title, which survives renumbering |
| `:682-691` left unedited | PASS — byte-identical |
| Mapping concrete, names `--repo` and the rebuild | PASS, with one gap (F1 below) |
| Instance count for the whole file reported | PASS — four, and the fourth is the one the issue lacked |
| Ate its own cooking: subset pre-merge + full suite post-merge | PASS |
| Lesson written | PASS |

### Scope

The handoff said "you own `docs/prompts/REVIEW_AGENT.md` and nothing else. Do
NOT change any test or runner." The diff touches one prompt file, two issues and
one lesson. No test, no runner, no canonical dispatch file. Clean.

### The `master` / `integration` wording in item 3

The semantic-conflict entry still says `git log --oneline HEAD..master` and
"merge master". Pre-existing, untouched by the rewrite except in the half the
handoff asked for, and today indistinguishable (`integration` == `master`). Not
raised as a finding; noted so a later reader does not mistake it for something
this handoff introduced.

## Findings

### F1 — should-fix, **fixed inline**: the prose row named two of the three modules that share the doc corpus

`docs/prompts/REVIEW_AGENT.md`, "Choosing the risky subset" -> *Prose in a
tracked document*.

The row mapped a docs diff to `test_tolerance_stack.py` + `test_provenance.py`.
Three modules import `claim_scanned_documents()`, not two:
`tests/test_thermal_exception_list.py` is the third, and its
`rule_scan_sources()` reads the same walk. Measured this session —
`docs/prompts/REVIEW_AGENT.md` is inside that corpus, so **a reviewer editing
this very file could red a module the row does not name**, which is the one diff
shape the row was written for.

This clears the inline boundary twice over: it is the reviewer's own overlay
(explicitly carved out of the three prongs), and the fix is naming a module I
measured. Applied, plus the grep that regenerates the row
(`grep -rl claim_scanned_documents tests/`) and the measured fact that
`docs/sessions/`, `docs/issues/` and `docs/reference/` are *outside* the corpus
(`_HISTORICAL_DIRS`) — so a lessons-and-issues-only diff cannot red these.

Subset after the fix: **185 passed** across the three modules.

### F2 — nit, **fixed inline**: the backslashed viewer command

`node apps\viewer\run_tests.cjs --repo ...`, inside the entry that explains why
backslashes break under the Bash tool. The author found this and filed it
(`ISSUE_20260921_review_overlay_spells_the_viewer_runner_path_with_backslashes.md`)
rather than fixing it, on a file-don't-fix reading of their scope. The
distinction the canonical prompt draws is by *artifact*, not by scope, and the
overlay is mine: fixed. Their issue's other half — the same shape in
`tests/test_viewer_js_suite.py`'s docstring — is in a test file and is not mine
either, so the issue stays `open` for it, annotated with what was done.

Their supporting claim checked out: four pre-existing forward-slashed
invocations, one backslashed, and the sibling docstring prints the browser
runner with a backslash exactly as described.

### F3 — should-fix, **filed, not fixed**: a cross-referenced entry is factually stale

`ISSUE_20260921_stack_data_entry_still_says_pytest_records_a_skip_in_a_worktree.md`.

The new mapping's stack-data row points at the *"A STACK-DATA change is a
viewer-test change"* entry for the greps to run. That entry says a worktree
`pytest` records a `skip` "deliberately", and quotes the rationale — which
`real_tier_red_and_the_skipping_tier` **reverted** on 2026-09-18. Measured
above: it records `1 failed`. The overlay contradicts itself two thousand lines
apart.

Not a finding against this handoff — the entry is not a cadence sentence and was
out of its brief, and pointing at it was the right cross-reference to make. But
APPROVE ends this handoff's ownership, and rewriting the entry needs
re-derivation (the "structurally blind" framing has to survive a check against
the *main checkout*, where `data/` is present and the `[real]` tier does run
under pytest), which is more than an inline correction. Hence an issue.

### Nit, grouped

The new "Where the one full suite runs" subsection answers a question the
canonical prompt explicitly delegated to the overlay, and the lesson flags this
as the one place the file states something new rather than recording something
the repo knew. That flag is the right instinct and I am not asking for a change
— but the next reviewer should know that if the canonical cadence is edited
upstream, this subsection is the text that goes stale first.

## Test record

Per the canonical cadence.

**Tactical report's full-suite run:** recorded, with checkout and counts (main
checkout, plus the viewer tier through `--repo`), and consistent with the diff.
Benefit of the doubt given; not repeated. Two of its counts I happened to
reproduce anyway (170, 154/154) came out to the digit, which is worth recording
as evidence the record is worth trusting.

**Pre-merge risky subset** — diff shape is *prose in a tracked document*, so by
the mapping under review: `pytest -q tests/test_tolerance_stack.py
tests/test_provenance.py` plus `tests/test_thermal_exception_list.py`, the
module F1 adds. **185 passed**, on the pre-merge tree and again after every
inline edit.

**Post-merge full suite**, in this review worktree (the merged tree; the main
checkout sits on trunk):

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` ->
  **1 failed, 1208 passed**, the failure being `test_viewer_js_suite_is_green`
  on the worktree's absent projection — the designed worktree shape, not a
  regression.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` -> **478/478**.
- `node apps/annotate/run_tests.cjs` -> **154/154**, every `[real]` check run.

**Not run, with reasons stated rather than implied:**

- **Browser TRUTH tier.** The mapping selects it for an `apps/viewer/` or
  CSS/positional diff. This diff is four markdown files and touches no rule, no
  selector and no geometry.
- **Mutation-witness tier**, despite the overlay's standing "after you merge,
  re-run it" instruction. That entry states its own mechanical trigger: the tier
  can only see what the shadow tree holds, and `SHADOWED` is `apps`, `scripts`,
  `docs/topologies`, `docs/tolerance_stacks`, `docs/spec_library`, `tests`,
  `tolerance_stack`. This merge touches `docs/prompts/`, `docs/issues/` and
  `docs/sessions/` — **none of them** — so the merge cannot change the tier's
  answer, and a >10-minute run would have been ritual. The current trunk
  baseline is the author's own measurement, **70/73 at `1d31b69`**, filed as
  `ISSUE_20260921_three_declared_mutations_are_unwitnessed_on_trunk_after_the_batch_merge.md`.
- **Main-checkout `pytest`.** The new subsection's own rule: run it there when
  the diff touches path resolution or reads `data/`. This one does neither, and
  a run there would have measured trunk.

## Overlay maintenance

One new **Recurring bugs** entry, for a failure class this review surfaced and
the repo does not yet have: *a hand-enumerated list of test modules is a
vocabulary and it drifts* — F1, found in the same commit that introduced the
list. This is the repo's most-repeated defect family (`CLAUDE.md`, "A field
vocabulary is a module-level constant") in a new place: a module list cannot be
pinned by a constructor that refuses a missing row, so the only defence is the
grep that regenerates it, written beside the list.

## Verdict: **APPROVE**

Merged into `integration`. Zero blockers.

This is unusually good work for a prose handoff. Every path it names is real,
every number it quotes reproduces, it found a fourth instance the filed issue
did not have, it declined the exception the handoff offered and argued for
declining, and its two out-of-scope findings are both genuine — one of which
(70/73 on trunk, with one witness lost at a merge hours after a review recorded
it) is worth more than the handoff it came out of.

## For the next reviewer

Three things this review leaves live:

1. The mapping is now load-bearing. When you add a row, add the grep that found
   it — the new Recurring bugs entry says why.
2. `ISSUE_20260921_stack_data_entry_still_says_pytest_records_a_skip_in_a_worktree.md`
   is open, and the mapping cross-references the stale entry.
3. The handoff's transferable question — does mapping-by-diff-shape generalise —
   has an answer from this side too: **the mapping is only as good as its module
   lists are fresh**, and F1 says they go stale on day one. In a repo whose test
   files are *not* named after what they guard, expect that to be worse, not
   better.
