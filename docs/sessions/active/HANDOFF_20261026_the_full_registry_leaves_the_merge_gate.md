---
priority: high
depends_on: [pitch_system_folds_into_the_pitch_linkage_model]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-26 — the_full_registry_leaves_the_merge_gate: a merge runs the witnesses it could have decayed; the whole registry runs on a schedule and files issues

Source: Jeff's 2026-10-26 note ("the mutation witness tests are constantly
the bottleneck to finishing handoffs … assess whether they are actually
adding useful test coverage or are just wasting time"), decided in the
2026-10-26 evening strategy session while the review of
`pitch_system_folds_into_the_pitch_linkage_model` had held the workstation's
one browser slot for two hours on its post-merge
`run_mutation_witness_tests.mjs --full` (312 entries, ~160 done after an
hour), with eleven handoffs chained behind it. Baseline: `integration` after
`pitch_system_folds_into_the_pitch_linkage_model` merges — it re-pins
`DECLARED_GUARDS` and renames specs, which is why this handoff waits for it.
Scope: `scripts/run_mutation_witness_tests.mjs`,
`tests/test_mutation_witnesses.py`,
`tests/test_mutation_witness_shadow_concurrency.py`, `pyproject.toml` /
pytest config (one marker), `docs/prompts/REVIEW_AGENT.md`,
`docs/prompts/WITNESS_SWEEP.md` (new), `CLAUDE.md`, `apps/viewer/README.md`
("The mutation-witness tier" section only),
`docs/issues/ISSUE_20261022_the_mutation_witness_full_registry_runs_past_its_thirty_minute_budget.md`.
Do NOT touch `apps/` beyond that README section, `docs/topologies/`,
`scripts/mutation_witnesses/*.json` (specs belong to the handoffs that add
guards), or `scripts/guard_enumeration.mjs`. dispatch's side (the `[[job]]`
registration, the scheduled task, the `sweep` budget tier, the board card) is
`dispatch/HANDOFF_20261026_the_full_registry_runs_as_a_nightly_job.md`,
sequenced behind you; do not edit dispatch files.

## The measurement this rests on

Full-registry wall times, all in the main checkout or a review scratch root:

| date | entries | wall | where |
|---|---:|---:|---|
| 2026-09-22 | 96 | 17 min | `LESSONS_20260922_mutation_witness_repair_and_enrollment.md` |
| 2026-10-20 | — | 65 min | dispatch `a_suite_past_its_budget_files_its_own_issue` |
| 2026-10-23 | 299 | 76 min | `ISSUE_20261022_the_mutation_witness_full_registry_runs_past_its_thirty_minute_budget.md` |
| 2026-10-26 | 312 | ~2 h | the `pitch_system_folds…` review, two agents on the box |

It runs **twice per landing** (the review's post-merge run and the batch
merge), holds the single browser slot for the whole run (drawing-checker's
candidate queued 2 h 04 m behind it on 2026-10-22), and 212 of the 312
entries are browser or annotate tier, serialized under that slot. Per-entry
cost is ~6 s with a ~2-minute floor (`docs/prompts/REVIEW_AGENT.md`, "Do not
impeach another session's tier timing"), so the time is the count.

What the full registry has caught that nothing cheaper did, since the
derived enrollment landed 2026-09-23 (every `NOT WITNESSED` / `decayed` line
in `docs/sessions/lessons/` and `docs/sessions/reviews/` was read for this):

- **One.** 2026-10-20, `the_3d_pane_opens_in_the_mode_the_study_wants`:
  `browser__and-it-sits-to-the-panel-s-right…237dba65` shifted the page
  300 px, the rail kept in the layout absorbed the shift, and the check
  stayed green. The spec's own file was untouched, so `--only` could not see
  it. A witness defect — the guard still guarded the product.
- The 2026-09-21 "three unwitnessed on trunk" were the same three
  never-enrollable entries known since 09-15, repaired by 09-23.
- Every other miss since was a disarmed tier (no `playwright-core`, no
  projection, no inbox, no interpreter in a worktree) or an aborted suite —
  false alarms the runner now names as such.

Thirteen of the 99 handoffs completed in this repo since 2026-09-14 were
maintenance of this tier. Jeff did not ask for the tier; it was the triage
sweep's bug-class handoff of 2026-09-14, and the 2026-09-23 strategy session
agreed to make enrollment mechanical rather than to remove it.

**The decision.** A witness that decays is a test-quality defect with no
product exposure. A day's latency on finding one is acceptable; two hours on
every landing is not. So: **the merge gate runs the witnesses the merge could
have reached; the whole registry runs on a schedule, off every landing's
path, and files an issue when something decayed.** The specs, the per-branch
`--only` discipline, the `DECLARED_GUARDS` census pin and
`tests/test_mutation_witnesses.py` all stay — they cost seconds and they are
what makes a new guard's witness real at authoring time.

## Deliverables

1. **`--changed-since <ref>`.** A new selection mode on
   `scripts/run_mutation_witness_tests.mjs`: run every entry that this tree's
   diff against `<ref>` (`git diff --name-only <ref>...HEAD`, plus the
   working tree) could have decayed — (a) a mutation's `file` is in the
   diff; (b) the spec file itself was added or changed; (c) the entry's tier
   harness changed (write the tier → harness-files map once, in the runner:
   `apps/viewer/tests.js` and `run_tests.cjs` for `fast`, the annotate
   equivalents for `annotate`, `scripts/run_viewer_browser_tests.mjs` for
   `browser`, the pytest files a `python` entry names). Print the selection
   first, one line per entry with which arm selected it, then run exactly
   those. When nothing qualifies print `0 of <N> entries can be reached by
   this diff against <ref>` and exit 0 — that is a result, not a refusal.
   Works from a worktree with `--repo` like `--only` does. `--only` and
   `--full` stay. The refusal of a bare run off the main checkout now
   recommends `--changed-since integration` ahead of the `--only` list.
   `--full` in the main checkout prints a one-line notice that the
   scheduled sweep owns it (not a refusal — the sweep is the caller).
   **State the counter-case in the runner header and the README section:**
   `--changed-since` would not have selected `237dba65` on 2026-10-20; that
   is the case the sweep catches, the next morning, as an issue. Write it so
   the next reviewer who meets a decay does not put `--full` back on the
   gate.
2. **The sweep prompt, `docs/prompts/WITNESS_SWEEP.md`.** What a dispatch
   sanctioned job does in the **main checkout** `C:\workspace\tolstack`,
   unattended: confirm the checkout is on `master` and clean (stop and say
   so otherwise); `git pull --ff-only`; `scripts/rebuild_projections.ps1`;
   `node scripts/run_mutation_witness_tests.mjs --full` (the runner takes
   the browser slot itself); `pytest -q -m sweep` (item 5); then
   `C:/workspace/dispatch/.venv/Scripts/python.exe -m dispatch.cli suite-time record tolstack --tier sweep --seconds <n> --command "<exact>" --handoff witness_sweep --role job`
   (the `sweep` tier is the dispatch sibling's deliverable; until it lands,
   record with `--tier merge` and say so in the row's command string).
   **On any `NOT WITNESSED`, `ANCHOR ROTTED` or `UNENROLLED` line:** one
   issue, `docs/issues/ISSUE_<YYYYMMDD>_witness_sweep_<n>_entries_decayed.md`,
   `type: bug`, `priority: med`, `area: tests/mutation-witness`,
   `class: decayed_witness`, `reporter: agent`, body = the verdict lines
   verbatim, the trunk sha, the wall time, and the `--only` line for each
   entry. If an `open` or `triaged` issue of that class already exists,
   append a dated section to it instead of filing a second. Commit on
   `master` and push; a refused push leaves the commit local (the server
   commits board moves to this checkout's `master` the same way). **On
   green**, no issue. **Every run** appends one row to
   `C:\workspace\tolstack\data\witness_sweeps.jsonl`:
   `{"ts", "sha", "declared", "witnessed", "seconds", "issue": <path or null>, "summary": "<one line, e.g. '312/312 witnessed in 71 min'>"}`
   — the dispatch sibling's job card reads the last row's `summary` and
   `ts`, so the field names are a contract; put them in a `claim`-free
   comment in the prompt, not in prose the corpus guards would read.
   Read `dispatch/dispatch/prompts/_ISSUE_FRONTMATTER.md` for the issue
   contract before writing the prompt's issue template; `found_by:` for a
   job-filed issue is this handoff's path.
3. **The review overlay, `docs/prompts/REVIEW_AGENT.md`.** Rewrite the
   checklist entry "After you merge `integration` into your review branch,
   re-run `… --full`" (currently near line 1575): the post-merge run is
   `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since master`
   on the merged tree, the report quotes the selection and the count, and a
   drop *within the selection* is still REQUEST CHANGES on the merge. Keep
   the measured `afcbbb4` story and the 46-minute correction — they are the
   reason the gate exists at all. Add one sentence: a review never runs
   `--full`; the whole registry is the sweep's
   (`docs/prompts/WITNESS_SWEEP.md`), and a decay it finds arrives as a
   `class: decayed_witness` issue. Change the pre-merge row ("A guard, a
   witness, or `scripts/mutation_witnesses/`", near line 484) to
   `--changed-since integration` with `--only <guard>` as the way to
   re-check one. Search the overlay for "whole registry" and "full
   registry": the 2026-10-20 rule "a layout change that adds or keeps a
   column must run the whole registry before handing back" becomes "runs
   `--changed-since` like any other change; the sweep covers what the diff
   cannot reach, within a day" wherever it was copied in.
4. **`CLAUDE.md` and `apps/viewer/README.md`.** In `CLAUDE.md`'s "Two test
   tiers cannot run in a fresh worktree" bullet, the fourth merge-time
   command becomes `node scripts/run_mutation_witness_tests.mjs --changed-since master`;
   the following bullet ("The mutation-witness tier is on that list because
   a witness decays…") is rewritten to say where the full registry runs now
   and why the gate runs the reachable subset — keep the decay argument,
   drop the "run it at the merge and not per-branch" conclusion, which this
   handoff reverses. The README's "The mutation-witness tier" section and
   its `npm run test:mutations` comment line say the same. Check
   `tests/test_viewer_readme_doc_facts.py` and the claims registry after the
   edit; a count you move is declared, not written.
5. **The tier's own slow tests leave the default tier.** The two cases in
   `tests/test_mutation_witness_shadow_concurrency.py` measured 201 s and
   34 s in the default `pytest -q` on 2026-10-22 (the over-budget issue's
   `--durations` table) — a third of the ten-minute budget, on a test of
   the runner's lock. Add a pytest marker `sweep` (registered in the pytest
   config so `--strict-markers` stays clean), mark both, and make the
   default tier deselect it by default (`addopts = -m "not sweep"` or the
   conftest equivalent — pick the one that keeps a bare `pytest -q
   tests/test_mutation_witness_shadow_concurrency.py` able to run them when
   named explicitly, and say which in the lesson). The sweep prompt runs
   `pytest -q -m sweep`. Re-measure the default tier once in the main
   checkout afterwards and record it with `suite-time record --tier default`.
6. **The over-budget issue closes.**
   `ISSUE_20261022_the_mutation_witness_full_registry_runs_past_its_thirty_minute_budget.md`
   → `status: resolved`, `resolution:` naming this handoff: the full
   registry no longer runs on a landing's path; its budget is the `sweep`
   tier's. Update the issue's `defer_until` line out (resolved issues carry
   none). Run dispatch's `check-issue` on it.

## Definition of done

- `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  from this branch's worktree (with `--repo C:/workspace/tolstack`) prints
  the selection and runs it; this branch touches no app file a spec
  mutates, so the expected output is the empty arm — quote it in the
  lesson. `tests/test_mutation_witnesses.py` gains cases for the three
  selection arms and the empty arm against a synthetic diff (a temp repo
  with two commits is enough; the runner's existing `--list` plumbing
  shows how entries are enumerated without running them).
- `--changed-since master` on the merged tree in the main checkout, once,
  after `pitch_system_folds…` has landed on `integration`: wall time
  recorded with `suite-time record --tier merge`, and in the lesson beside
  the 2-hour figure it replaces. Expect minutes.
- `pytest -q` green in the main checkout with the two `sweep` cases
  deselected, and `pytest -q -m sweep` runs exactly those two.
- `docs/prompts/WITNESS_SWEEP.md` is complete enough that a sonnet job
  agent with no other context performs the sweep end to end; dry-run the
  prompt's steps by hand **except** the `--full` run itself (two hours of
  the slot; the first real sweep is the dispatch sibling's DoD) — i.e.
  confirm the preamble refuses a dirty checkout, the issue template passes
  `check-issue`, and the JSONL row writes.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_full_registry_leaves_the_merge_gate.md`):
  the selection algorithm as implemented (the tier → harness map), the
  empty-arm output, the measured `--changed-since master` wall time, the
  default tier's time before and after item 5, and the one 10-20 case
  restated as the sweep's job.
