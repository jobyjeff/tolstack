---
type: bug
priority: med
status: open
area: tests/doc-guards
reporter: agent
---

# The traced-ratio doc scan walks a hand-kept list, so three live documents it is believed to cover are unread

Found during `review/claude_md_tracked` (2026-09-01), while verifying that the
newly-tracked `CLAUDE.md` is actually read by "the repo's doc-scan guards" as
its own header now claims.

## What is true

This repo has two doc-level scan families and they do **not** share a scope:

- `test_no_live_document_states_an_unguarded_hardware_entry_count` and the
  enumerated-state surface lookup walk `live_documents()` — an `os.walk` of the
  whole repo minus `_HISTORICAL_DIRS` / `_HISTORICAL_NAMES`. Its docstring says
  so deliberately: *"a walk rather than a hand-kept list: a count copied into a
  document nobody thought to enumerate is exactly how this bug recurs."*
- `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
  (`tests/test_tolerance_stack.py:1461`) builds its own `live_docs` **literal**:
  `ARCHITECTURE.md`, `docs/SOP_TOLERANCE_STACK.md`,
  `docs/prompts/REVIEW_AGENT.md`, `data/inbox/specs/README.md`, and
  `docs/tolerance_stacks/WORKSHEET_*.md`.

So a retired ratio (`1 of 17`, `3 of 26`) asserted in `README.md`,
`CLAUDE.md` or `docs/DAG_TOPOLOGY.md` is **not** caught. Verified by hand:
appending `3 of 26 element instances are traced` to `CLAUDE.md` and running the
suite leaves that test green (the hardware-count guard, which does walk, fires
on the same injected line and names `CLAUDE.md:140`).

## Why it is worth fixing rather than noting

The bug this guard exists against is precisely "a stale number reached eleven
files" — `1 of 17` survived three reviews. Two of the three unread files are
recent additions to the live set (`DAG_TOPOLOGY.md`, 2026-08-31;
`CLAUDE.md` became tracked 2026-09-01), i.e. the uncovered set grows on its own
while nothing goes red.

Two documents already state the coverage wrongly, which is how the gap stayed
invisible:

- `docs/prompts/REVIEW_AGENT.md` said `docs/DAG_TOPOLOGY.md` *"is in
  `live_documents()`, so the traced-ratio and hardware-count doc scanners
  already read it"* — half true. **Corrected in place during this review**;
  this issue is the underlying defect, not that sentence.
- `CLAUDE.md`'s new header says "the repo's doc-scan guards read it as a live
  document" — true of two scans of three.

## The shape of the fix (and the trap in it)

Not a one-line swap to `live_documents()`. The test has **two** halves over one
list and they want different scopes:

- the `asserted_stale` half ("no live doc asserts a retired figure") wants
  every live document, and would pass today on the full walk;
- the `missing` half ("every doc in the list states the *current* figure")
  wants the small curated set of documents that are **supposed** to publish the
  ratio. Feeding it `live_documents()` fails immediately on every file that has
  no business quoting a ratio — including `CLAUDE.md`, which deliberately
  points at the SOP instead of restating the figure.

So: split the list in two — `_RATIO_PUBLISHERS` (curated, drives `missing`) and
`live_documents()` (drives `asserted_stale`) — and extend
`test_the_traced_ratio_guard_can_fail` with a case proving the stale half now
fires on a file outside the curated set.
