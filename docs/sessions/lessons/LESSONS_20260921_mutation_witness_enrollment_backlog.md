# LESSONS 2026-09-21 — mutation_witness_enrollment_backlog

Transcription of the 26 orphaned rows from `reader_facing_surfaces_second_pass`
(13) and `visual_rules_nothing_checks` (13), whose enrolling handoff closed
under them. What follows is what the next reader cannot get from the diff.

## The count

26 rows, 4 excluded (named below), 22 enrolled as rows. One row (Set A's
`VA.PANE_CROP` row) names two surfaces and became two entries, so 22 enrolled
rows became **23 enrolled entries**. Table size: **73 → 96**.

`node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack`
(main checkout has `data/` and `node_modules/`; the worktree needs a
`node_modules` junction — see "Cost" below):

```
93/96 declared mutations witnessed
NOT WITNESSED:
  leader-style-survives-a-topology-switch — another check reddened, but not the declared one
  worst-verdict-ranks-worst-last — the tier never reached the witness
  arriving-at-an-element-shows-its-part-in-3d — the witness cannot see the difference
```

**All 23 new entries are among the 93 WITNESSED.** The 3 misses are
pre-existing — none of the 26 transcribed rows, none of this session's edits —
and already filed: `ISSUE_20260921_three_declared_mutations_are_unwitnessed_
on_trunk_after_the_batch_merge.md`, opened the same day this handoff was
staged, names these exact three by name with the same diagnoses. Nothing to
add there except that the count is now 93/96 rather than 70/73 — the
regression is stable, not spreading.

`venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py`:
**14 passed** (all pairing/shape checks, in the worktree, no browser needed).

## What was excluded, and why — 4 of 26

**Two were caught only by actually running the tier**, which is the reason
this handoff's "run the witness tier over the result" deliverable exists
rather than trusting the lesson's own "measured, not proposed" claim at face
value. Three days and one batch merge is enough for a `[real]` measurement to
rot.

1. **`annotate-word-tables-survive-the-ban-list`** (Set A, annotate's own
   check on `AA.BINDING_STATES`/`AA.BINDING_STATE_ALERTS`). Enrolled, then
   **NOT WITNESSED — stayed green.** Root cause, not guessed at: the check
   does `Object.keys(row).forEach(field => assertNothingBanned(row[field]))`
   where `row = table[key]`, assuming `row` is an object with string fields.
   Both tables are flat `{key: string}` maps, so `row` is a **string**, and
   `Object.keys("bound")` returns character indices — the scan bans one
   *character* at a time and has never been able to catch a multi-character
   literal like `data/`. Filed:
   `ISSUE_20260922_the_annotate_word_table_ban_scan_iterates_characters_not_sentences.md`.
2. **`attention-flag-is-not-filled`** (Set B, sibling of `crop-trigger-is-
   not-filled`, sharing its `expect_red` on purpose per the lesson). Enrolled,
   then **NOT WITNESSED — stayed green**, while its sibling `crop-trigger-is-
   not-filled` (same census, same suite) witnessed cleanly. Root cause:
   `.tvflag` is written only by `views/topology.js` (the DAG/topology grid);
   `apps/viewer/topology.css`'s own comment beside the rule says the
   elements/materials tables' flags "fold into one `.chip--alert` ⚠" instead.
   `testTypographyRules` navigates to a **stack** leaf, where no `.tvflag`
   has ever rendered — the fill census matches zero of them, so the mutation
   has nothing to bite regardless of the CSS. No other suite reads `.tvflag`'s
   fill state at all. Filed:
   `ISSUE_20260922_the_dag_attention_flags_fill_budget_claim_has_no_witness_anywhere.md`.
3. **`source-note-stays-a-preview`** (Set B). Excluded **before** enrollment,
   by reading the code: the CSS rule its `find` names
   (`max-height: 2.8em; overflow: hidden;`) now belongs to `.el-export__note`
   only — `reader_facing_surfaces_second_pass` (2026-09-18, the same day the
   Set B lesson measured this row) retired the composite materials source
   cell and rewrote the typography suite's rule 5 from *"the note clamps to
   ~3 lines"* to *"selecting a row puts more in the pane than the row
   carries, and no row is more than 2x the tallest elements row"* — an
   outcome check with no CSS clamp in its causal chain at all. **Then
   verified empirically anyway**, with a probe entry added and removed after
   confirming (`--only PROBE-source-note-stays-a-preview`): NOT WITNESSED,
   tier stayed green, exactly as the reading predicted. Not filed as a new
   issue — it is the same substitution `reader_facing_surfaces_second_pass`'s
   own lesson already names in `ISSUE_20260918_the_source_note_clamp_checks_
   lost_their_subject_when_the_composite_source_cell_was_retired.md`, one
   session before this row was even measured.
4. **The viewer's markup-scan twin** (Set A row 13, `"this page's own markup
   prints no repo path, module path, id or command at the reader"`).
   Excluded before a mutation was even tried: `tests/test_mutation_witnesses.
   py::test_every_expect_red_resolves_to_exactly_one_place` requires an
   `expect_red` to resolve to exactly one place in its check-source file, and
   this name resolves to **two** — `apps/viewer/tests.js` carries both a
   `skip(...)` call (fired when `VIEWER_SRC` is not injected — the browser
   tier) and a `test(...)` call (fired when it is — the node-fs tier) with
   the **identical string**. Not a decay case: this was never enrollable,
   on any tree, because the check's own two branches share one name. Not
   filed as a bug — the dual name is presumably intentional (so a reader of
   either branch's output sees the same check title) and fixing it is a
   guard edit, out of this handoff's fence.

None of the four needed a table edit to "make the tier green" — they are
simply absent from `scripts/mutation_witnesses.json`, with the reasoning
above (and, for #1 and #2, a filed issue) standing in for the row.

## Trap 5 resolved cleanly: the `annotate` tier already works

The handoff flagged `ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_
mutation_witness` as a question to work through before enrolling Set A's
three `apps/annotate/run_tests.cjs` rows. That issue's own `## Resolved`
section (2026-09-16, `mutation_witness_tier_reaches_its_checks`) already
answers it: a third tier word, `annotate`, distinct from the viewer's `fast`,
with its own `CHECK_SOURCE` row and two witnessed entries already standing on
it (`annotate-banner-says-nothing-to-paste`,
`annotate-carries-no-command-to-render`) since that date. So two of the three
rows (`annotate-markup-names-no-repo-path`,
`annotate-console-placeholder-from-the-registry`) enrolled with `tier:
"annotate", suite: null` exactly like those two precedents, no new
machinery needed. The third (`annotate-word-tables-survive-the-ban-list`)
is excluded for the unrelated reason above (#1) — the tier word was never
the obstacle for any of the three.

## Two more measurements for the brief

`docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md` asked
for a second cost point beyond the 2026-09-18 pass's ≈4 min/entry, and for how
many rows fail to reproduce.

- **Rate**: session wall clock was dominated by reading, not writing — each
  entry needed its check's exact current source (many had drifted in small
  ways since the lessons were written: line numbers, surrounding refactors,
  one check's own name changing) before a `find`/`replace` could be trusted.
  23 entries enrolled, all pytest-clean on the first full run, all 23
  WITNESSED on the first full browser-tier run (after fixing an unrelated
  `node_modules` junction mistake — see "Cost" below). Call it ≈2-3x the
  2026-09-18 rate per entry, mechanical work is *reading* work here, not
  typing.
- **Decay rate**: **4 of 26 (15%)** did not reproduce three to four days
  after being measured, on a mix of causes — one genuine pre-existing check
  bug (never worked), one coverage assumption that stopped holding (page
  moved), one mechanism that was already superseded the same day it was
  measured, and one structural impossibility that was never about decay at
  all. Three of the four needed the actual tier run to find; reading the code
  alone caught the fourth. That is worth more to the brief than "13 minus 13
  disjoint from tests added" — it says the *measured* rows decay too, not
  just the untested rules that motivated the brief in the first place.

## Cost: the node_modules junction, twice

Running the mutation-witness tier from this worktree needs a `node_modules`
junction to the main checkout (documented already in
`LESSONS_20260918_reader_facing_surfaces_second_pass.md`). Two new things
worth recording:

- **`New-Item -ItemType Junction` via PowerShell worked; `mklink /J` via
  Bash's `cmd.exe` did not** — it silently created a junction pointing at a
  mangled path (`/c/C:/workspace/...`), because Git Bash's path translation
  ran on an argument `cmd.exe` needed verbatim. The failure mode was not an
  error — the command "succeeded" and printed nothing wrong — it just
  resolved to nothing when `node` tried to walk through it. Use PowerShell
  for this, not Bash.
- **Two `run_mutation_witness_tests.mjs` invocations against the same
  worktree, overlapping in time, corrupt each other.** I started a full run
  before noticing the junction was broken, then started a second (fixed)
  run without stopping the first. The second run's `rm -rf tmp/mutation-
  witness` deleted the shadow tree out from under the first run's `finally {
  undo(); }`, which then threw `ENOENT` trying to restore a file it had
  patched. Both had been writing to the same log file too, so the output
  was interleaved and unusable. Lesson: treat the shadow tree exactly like
  the worktree's git state — check nothing else is using it
  (`tasklist | findstr node` is enough) before starting a run, and never run
  two invocations against one worktree concurrently.

## What I did not touch

`git diff --stat` on this branch: `scripts/mutation_witnesses.json` and two
new files in `docs/issues/`. No suite registration was needed in
`tests/test_mutation_witnesses.py` — `"typography pass's visual rules (live
stack view)"` was already in `scripts/run_viewer_browser_tests.mjs`'s
`SUITES` registry when this handoff started (`visual_rules_nothing_checks`
registered it the same day it wrote the six rows that need it; the handoff's
own trap 1 warning to register it first was already satisfied). No guard, no
check, no file under `apps/` changed.

## Verified

- `venv-win/Scripts/python.exe -m pytest -q` — **worktree**, 1208 passed, 1
  failed (`test_viewer_js_suite_is_green`, red in every worktree by design
  since 2026-09-18 — the `[real]` node-fs tier has no `data/` to read here).
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` — **main
  checkout**, 478/478 passed.
- `node apps/annotate/run_tests.cjs` — **main checkout**, 154/154 passed.
- `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` —
  **main checkout**, 25/25 suites, 0 failures (includes the new suite's
  9/9 and the crop-lightbox suite's 20/20, both carrying this session's new
  entries' mutations reverted back to clean).
- `node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack`
  — **worktree** (via a `node_modules` junction to the main checkout), full
  table, clean single-process run: **93/96 witnessed**, exactly the 3
  pre-existing/already-filed misses, all 23 new entries WITNESSED. A fourth
  candidate entry (`source-note-stays-a-preview`) was added as a probe,
  confirmed NOT WITNESSED, and removed — see exclusion #3 above.
- `tests/test_mutation_witnesses.py` — **worktree**, 14 passed, both before
  and after the two BLIND entries were removed.

Shadow tree (`tmp/mutation-witness/`) and the `node_modules` junction were
both removed from the worktree before finishing; neither is tracked.
