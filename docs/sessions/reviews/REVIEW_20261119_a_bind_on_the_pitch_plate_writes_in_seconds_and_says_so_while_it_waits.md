---
type: review
handoff: docs/sessions/active/HANDOFF_20261119_a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits.md
reviewer: agent
date: 2026-11-19
verdict: APPROVE
blockers: 0
---

# Review: a bind on the pitch plate writes in seconds and says so while it waits

The handoff branch `064fd71f` (3 commits) is merged into `review/…` as
`b61ac17f`, tree `ab84e0bf`. `integration` had not moved since the branch was cut
(`38a21e61`). The handoff branch was not already in `integration` (checked with
`merge-base --is-ancestor`). This is the first review of this slug, with no earlier
attempt on this branch. Every artifact in the diff is new (`A`), apart from the
issue the handoff resolves.

## What was verified

**The code.**

- `storage/fsa.js` keeps each event file it has read, by name. The listing is
  read every time, so an agent's proposal written since the last read is still
  seen. `listFeatureIdentityEventSeqs` therefore still numbers past what is on
  disk now. That is the "numbering off a snapshot" check, and it passes.
- A file that does not parse still throws, and it is not kept.
- Directory handles are kept per root, and a missing directory is not kept.
- The writer, its bump rule, the seq reservation and `identityWriteBusy` are
  untouched, so the append-only and never-two-writes rules hold.
- `ExecQueue.runAfterLoad` waits for the load gate, and a load that fails fails
  the write.
- I checked whether a write that skips the queue can run before its mesh is
  ready. `cmdTake` and `surfaceSiblingsOf` classify faces through
  `ensureFaceClasses`. That reads the store directly, not the scene, so a Take
  posted while `isolate` is still loading still sweeps its sibling faces. The
  tactical's "Keep while the page is still opening its model" runs bear this out.
- `writeIdentityEvent` posts the record to the shell before the served-log
  rewrite. The rewrite is queued in write order on `publishTail`.
- The only sender of `annotate:exec` writes is the shell's `bodyCommand`. It holds
  one write at a time through `bodyWrite`. So the new rule, that a second write
  arriving mid-write is *dropped* as busy rather than queued, loses nothing today.
  I added it to the overlay for future senders.

**The tests and witnesses.** All three read as their names claim. The five new
witness specs are well-formed. I read the ExecQueue spec's mutation against its
test: the second half of the test is what reddens. The raised browser pin, for
the literal-`true` skip push, is argued in `guard_enumeration.mjs`.

**The lesson's arithmetic.** I re-derived it. Two numbers were wrong, and I
corrected both inline (below).

**Jeff's log.** `C:\workspace\tolstack\data\inbox\feature-identity\` had 101
files at the start and 101 at the end of this review. I wrote nothing there.

**Tolstack's mandatory stack checks (1–7)** do not apply. The diff carries no
stack, topology, element, band or spec-library event. Its numbers are
latencies, not tolerances, and none is cited as a value source.

## Tests

The tactical recorded a full-suite run (`2 failed, 2374 passed, 1 skipped`, 362
s, worktree). That record is consistent with the diff, so it gets the benefit of
the doubt.

**Pre-merge risky subset**, run in the tactical worktree on `064fd71f`:

| run | result |
|---|---|
| `node apps/annotate/run_tests.cjs` | 333/333 |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 606/606 |
| `pytest -q tests/test_bind_latency_vocabularies.py tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_mutation_witnesses.py tests/test_architecture_inventory.py` | 200 passed |

**Post-merge**, in the review worktree, with `node_modules` junctioned in. The
default tier was run against the code alone; my doc edits came after it. This
repo's conftest prints no contention header lines.

- **Default tier**: `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs -p no:cacheprovider`
  gave `2 failed, 2374 passed, 1 skipped, 4 deselected` in 461 s, inside budget
  (recorded). Exactly the tactical's counts. The two failures:
  - `test_viewer_js_suite_is_green`: the deliberate worktree red. The `--repo`
    run covers it.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`:
    drawing-checker logged a sixth 213668-002 run today. The diff does not touch
    it. The author filed it as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_…`, and it has no
    twin on `integration` or `master`.
- **Fast tiers**: 333/333 (no `SKIP [real]` lines) and 606/606 through `--repo`.
  The prose subset (`test_tolerance_stack`, `test_provenance`,
  `test_thermal_exception_list`, `test_claims_registry`), run after my overlay
  and issue edits: 222 passed.
- **Whole browser tier**: `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`.
  47/47 suites, 966 checks, exit 0, 1835 s. That is over the 1800 s budget by
  35 s. The runner recorded the ledger row itself (`2026-11-20T03:35:29Z`, tree
  `ab84e0bf`). I added the measurement to the open, deferred
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`
  rather than filing a twin. The new suite took 13.7 s. It printed:
  `TIMING pitch plate Keep: press -> event 1774 ms, press -> body 1307 ms`.
- **Witness gate**: `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration --budget-min 10`.
  It reached 9 of 24 entries; 8 were witnessed and 15 were left to the sweep.
  - The one NOT WITNESSED entry was
    `browser__real-and-the-head-line-follows-it-into-bind-mode-named-b__0260157c`.
    I baselined it with `--only` on a `git archive integration` export, and it
    was also NOT WITNESSED there (3m34s). It is pre-existing, not this diff.
    Filed as
    `ISSUE_20261119_the_head_line_follows_it_into_bind_mode_witness_is_not_witnessed_on_integration_again.md`.
  - Among the entries reached, the branch's fast spec was WITNESSED.
  - The branch's two browser specs were left to the sweep by the budget. The
    tactical's `--only` run of all five new specs is cited for them: 5/5
    WITNESSED in 3m02s.

## Findings

### Should-fix (filed; not blocking)

1. **The new `[real]` suite goes red once Jeff settles the bore's disagreement.**
   - Where: `scripts/run_viewer_browser_tests.mjs`, `testAPressThatWritesSaysSo`.
   - What: the skip condition reads every `bound` event ever written, but the
     press needs the *folded* body to read `disagree`. The log is append-only.
     After Jeff's next Keep or Unbind on that bore, which the last two handoffs
     made one fast click, the suite finds no Keep button and both checks fail.
     That turns the browser tier red for every landing.
   - This is the second sighting of the overlay's "`[real]` suite gated on live
     log state" entry, and its red variant. I refined that entry.
   - Fix: run against a log cut at 0100, or gate the skip on the folded body.
   - Filed: `ISSUE_20261119_the_pitch_plate_keep_browser_suite_goes_red_once_jeff_settles_the_bores_disagreement.md`.

### Fixed inline (correction blockquotes; no behaviour touched)

2. **The lesson says "Disk → body is 0.0–0.6 s on every press (target: within
   1 s)".** Its own table refutes this. In the loading-page Keep row, every body
   time (≥ 11 156 ms) is later than every disk time (≤ 10 708 ms). So the run
   that reached disk at 9 684 ms changed the body at least 1 472 ms later, past
   the target. I added a correction under that line.
3. **The resolved issue's Unbind row, and its `resolution:` field, quoted only the
   settled-page runs** ("2.0-2.3 s"). The lesson's Unbind range reaches 10 071
   ms. I corrected the field (`(settled page; up to 10.1 s while the page loads
   meshes)`) and added a correction blockquote to the issue body.

### Nit (not filed)

4. **A body press made before the pane has loaded reads `writing…` with nothing
   sent.**
   - Where: `topology_app.js` `bodyCommand` (`markWriting` in nav.js).
   - What: the button marks itself in the click. If `postToPaneWithId` then
     returns false (the iframe exists but `flyoutLoaded` is still false), nothing
     marks it failed. It stays `writing…` until the next repaint, which comes
     seconds later when the pane posts its tree.
   - It recovers by itself. Before this change, the same press did nothing at
     all. A one-line `failed` state in that branch would close it, but that is
     behaviour and wants a test, so I left it for the author.

### Design

Nothing filed. The new surface copy is one word per control (`writing…`, `not
written`, the reason on hover), with state colours only.

## Note for the next reviewer

- Identity writes no longer go through `ExecQueue`. The overlay entry under
  "'A part is open' is not 'the pane is settled'" now says so.
- The new browser suite's `TIMING` line is printed, not asserted, by design.
