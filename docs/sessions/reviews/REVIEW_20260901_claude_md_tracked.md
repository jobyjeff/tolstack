---
type: review
handoff: docs/sessions/active/HANDOFF_20260901_claude_md_tracked.md
reviewer: review agent (Claude Opus 5)
date: 2026-09-01
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-01 — `claude_md_tracked`

Reviewed `handoff/claude_md_tracked` (`b71f33e` + `1aa9ad4`) against
`docs/prompts/REVIEW_AGENT.md` and dispatch's canonical process.

**Note on branch state:** `integration` already carried the merge (`8c777df`)
when this review branch was cut from it, so `git diff integration...handoff` was
empty and the work was read as `b71f33e^..1aa9ad4`. Nothing was left uncommitted
in the tactical worktree — it is clean at `1aa9ad4`.

## The seven mandatory checks

Checks 1–7 (traceability, path signs, coherent material corners, LMC/MMC
direction, RSS, nominal-inside-limits, quantised constraints, traced ratio) are
written for stack work. **This handoff authored no stack, no element, no check
and no spec-parse event**, and touched no `docs/tolerance_stacks/` file. They do
not apply, and that is a scope fact rather than a skip: the diff is
`.gitignore`, `CLAUDE.md`, `PROVENANCE.md`, `README.md`, one issue, the overlay,
one constant in `tests/test_tolerance_stack.py`, and a lesson. Verified by
reading the full diff — no JSON under `docs/` changed, no traced ratio moved,
`data/inbox/specs/` untouched, nothing written into drawing-checker.

## What I verified

**Definition of done, item by item.**

- `git check-ignore -q CLAUDE.md` → exit **1**. The `.gitignore` "Agent
  bootstrap" stanza is gone; `CLAUDE.md` is tracked at `b71f33e`.
- Suite: **559 passed, 1 skipped** in this worktree with the main checkout's
  interpreter — the exact figure the commit message, the lesson and the new
  `PROVENANCE.md` clause all state. Re-run three times.
- The lesson exists, is one file, and answers both questions the handoff asked
  of it (what the suite asserted; how many content defects the pass found).

**Deliverable 3 — and the check that actually matters here.** The claim under
review is that dropping `CLAUDE.md` from `_HISTORICAL_NAMES` makes the doc-scan
guards read it. Per the canonical "a new guard has been observed failing" rule I
did not accept this on green: I appended a line reading
*99 entries are traced, and 3 of 26 element instances are traced.* to
`CLAUDE.md` and re-ran. Result:

```
FAILED tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
  CLAUDE.md:140: says 99 entries with a traced values_source; hardware_entries.json has 15
```

The guard fires, names the right file **and the right line**. Working tree
restored with `git checkout -- CLAUDE.md`; the injection is in no commit.

The same probe found what the work does *not* cover — see finding 1. The
retired ratio on that same injected line was **not** flagged.

**Deliverable 4 — the content pass, re-done independently.** Every factual claim
and every pointer in the 138-line file was checked against the tree, not against
the lesson:

| claim | verdict |
|---|---|
| all 8 document pointers + `ops.toml`, `setup.ps1`, `scripts/projection_provenance.py`, `scripts/build_viewer_crops.py` | all resolve |
| `scripts/build_*_projection.py` = topology + viewer; three `build_*` CLIs plus `spec_library.rebuild()` | four importers confirmed by grep; the file correctly states **no** count |
| "`ARCHITECTURE.md`'s inventory pairs it against the modules that actually import it" | true — `ARCHITECTURE.md:49`, `tests/test_architecture_inventory.py`, *"all four projection writers"* |
| SOP heading *"The traced ratio"* | `docs/SOP_TOLERANCE_STACK.md:63` |
| `ARCHITECTURE.md`, *"Where computation may live"* | line 200 |
| `REVIEW_AGENT.md`, *"Documented vocabularies drifting from the seeded data"* | line 688 |
| SOP is written for the first archetype, a linear grip-length stack, "and says so" | lines 121–123 |
| DAG: third archetype, 2026-08-31, hard fence "not a solver", rules out the natural next feature | `docs/DAG_TOPOLOGY.md:3`, `:15–16`, `## Not a solver` at `:50` |
| `Term.coefficient` positive, direction in `sign` | matches `ARCHITECTURE.md`'s `stack.py` table |
| trunk `master`, handoffs → `integration` | matches this session's own topology |
| `ops.toml` = forge CONVENTIONS.md **§8** | `CONVENTIONS.md:382`, *"8. Ops verbs, `ops.toml`…"* |
| `docs/reference/` insert-only; `data/inbox/specs/` append-only | both corroborated in the overlay |
| "matching drawing-checker and forge" | `git ls-files` in both: tracked |

I found **no wrong fact** in the committed file. The two the author corrected
(four projection callers, not three; `parts_list` fixed in three days, not a
month) and the one removed (an unrecountable vocabulary-drift tally) are all
independently confirmed — `scripts/projection_provenance.py:40` says *"four
callers, not two"* in its own words.

**The lesson's cross-repo claims, spot-checked in dispatch (read-only).**
`dispatch/tests/test_command_spelling_docs.py:56` does carry
`UNCOVERABLE_REPOS = {"slack-sync", "jira-sync", "rotorkit", "wiki", "tolstack"}`
and `_covered_repos()` skips those repos wholesale — so the handoff's premise
("the guard globs tracked docs, so it is picked up automatically") is indeed
wrong and the lesson is right to say so. `EXCLUDED_FILES` does hold a bare
relpath. Nothing in dispatch was edited from here, per the handoff.

**Universal checks.** No production-data pollution: `git status` clean after
every suite run, `data/` untouched (the one skip is the viewer's data-dependent
tier, as documented). No hand-restated count was introduced — the diff *removes*
one and points the sentence at its owner, which is the pattern that universal
check asks for.

## Findings

### 1. should-fix (filed, not fixed) — "the doc-scan guards read it" is true of two scans of three

`CLAUDE.md:5` now says *"the repo's doc-scan guards read it as a live
document"*. Two do. The third —
`test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
(`tests/test_tolerance_stack.py:1461`) — builds a **hand-kept five-entry
`live_docs` literal** and never calls `live_documents()`, so `README.md`,
`CLAUDE.md` and `docs/DAG_TOPOLOGY.md` are outside it. Demonstrated: the
injected retired ratio above sat in `CLAUDE.md` with that test green.

This is a pre-existing guard-scope gap rather than a defect the handoff
introduced, and the fix is not a one-liner — the test's `missing` half wants a
*curated* list (documents that must publish the ratio) while its
`asserted_stale` half wants every live document, and swapping in
`live_documents()` fails the first half instantly, `CLAUDE.md` included. So,
per "file, don't fix":
`docs/issues/ISSUE_20260901_traced_ratio_doc_scan_uses_a_hand_kept_list.md`
(`type: bug`, `priority: med`), with the split-the-list shape written out.

The sentence in `CLAUDE.md` is not worth weakening — it is right about the
scans that gave the file its new status, and the issue is where the nuance
belongs.

### 2. fixed inline — the overlay asserted the wrong coverage

`docs/prompts/REVIEW_AGENT.md` (from `dag_topology_format`, 2026-08-31) said
`docs/DAG_TOPOLOGY.md` *"is in `live_documents()`, so the traced-ratio and
hardware-count doc scanners already read it"*. The traced-ratio scanner does
not read it. Corrected in place on this review branch, and a new **Architectural
errors** entry added ("Two doc-scan families, two different scopes") so the next
review injects the defect instead of trusting the sentence. This is exactly the
class of claim that tracking `CLAUDE.md` was meant to stop, caught one file over.

### 3. filed — one flaky test, unrelated

`tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed` failed
once mid-review at its *second* assertion (the parent directory's mtime moving),
then passed in isolation and on two subsequent full runs. Directory-mtime
granularity: `before` and `after` land in one filesystem tick. Not a regression
and not related to this handoff —
`docs/issues/ISSUE_20260901_dc_snapshot_removed_entry_test_is_mtime_flaky.md`
(`type: bug`, `priority: low`).

### Nits

- The resolved issue carries
  `resolved_by: docs/sessions/HANDOFF_20260901_claude_md_tracked.md`, a path
  that does not resolve — the handoff is at `active/` and is moved to
  `completed/` by this review. `ISSUE_20260813_check_completeness_schema` has
  the identical shape, so this is the repo's existing (broken) convention rather
  than a slip by this author. Left alone; not worth a one-off divergence.
- The lesson's dispatch-side follow-up (drop `"tolstack"` from
  `UNCOVERABLE_REPOS`) is real work that now has no ticket in either repo — it
  lives only in a lesson. Deliberate per the handoff's "do NOT edit dispatch",
  and the strategy session that cut this handoff owns it, so no issue is filed
  here; flagged for whoever runs the cross-repo sweep.

## Verdict

**APPROVE** — 0 blockers.

The work does exactly what the handoff asked, and deliverable 4 is the part
worth naming: the content pass was sequenced before the first tracked commit,
found three real defects in one day's worth of unreviewed content, and the fix
for two of them was to *stop stating the number* and point at the owner rather
than to write a fresher copy. That is the repo's own rule applied to the file
that states it. The one thing green did not prove — that the guards now read
the file — was verified by injection, and the gap that probe exposed is filed.

## For the next reviewer

The overlay's new **"Two doc-scan families, two different scopes"** entry is
load-bearing beyond this handoff: any future work claiming "the doc guards
cover X" must be checked by injecting the defect, because this repo has three
doc-level scans with three different notions of which documents are live, and
two documents have already asserted the wrong one.
