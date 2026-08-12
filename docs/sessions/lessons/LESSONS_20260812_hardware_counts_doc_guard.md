# LESSONS 2026-08-12 — hardware_counts_doc_guard

Handoff: `HANDOFF_20260812_hardware_counts_doc_guard.md`. Branch:
`handoff/hardware_counts_doc_guard`.

## The point, sharpened

The paragraph that went stale was **the one carrying the warning about going
stale**. `docs/tolerance_stacks/README.md:128` opened with a wrong count and
closed with *"Do not quote those counts from here: a test asserts them against
the file … because this very sentence had already gone stale once."* Both halves
were written by an author who understood the failure mode exactly. It went stale
anyway, for two months, and the test it pointed at was guarding a **different
file's** copy of the number.

So: a prose warning is not a guard, and *"a test asserts this"* is not a guard
either unless the test asserts it **here**. If you write a number into a doc,
either bring that doc into a scan or write no number.

## Deliverable 3 — the sweep, including the "none"

Scanned every live `.md` in the repo plus every `.json` under `docs/`, for eight
count-claim shapes. Result: **three** live copies, not the two that were known.

| where | what it said | verdict |
|---|---|---|
| `docs/tolerance_stacks/README.md:128` | *"Eight of the eleven inline entries … the other three are safe — one traced to the NAS6403 standard, two to their own source-control drawings"* | the known stale one. Now states **no count**; option 2 |
| `hardware_entries.json` → `description` | *"five of the fifteen"*, *"SIX entries are traced"*, *"Four entries are `not_transcribed`"*, **and "the four NAS bolts"** | correct. The first three were pinned by `test_hardware_entry_values_source_counts_match_the_description`; *"the four NAS bolts"* was **not** — the phrase pin lists three phrases and that is not one of them. The new scan recounts it |
| `hardware_entries.json` → `entries[4].library_ref_note` | *"the other fourteen do not (ten `inline`, four `not_transcribed`)"* | **the third copy nobody had looked for.** Correct today, unguarded until now. It is a `values_status` count rather than a `values_source` one, which is likely why it was never grouped with the other two. Now recounted |

Everything else holds **no** copy — that is a real result and it is worth
writing down so the next sweeper does not redo it: `ARCHITECTURE.md`,
`README.md`, `docs/SOP_TOLERANCE_STACK.md`, all four `WORKSHEET_*.md`,
`ARCHETYPE_thermal_fit.md`, `docs/spec_library/README.md`, `apps/viewer/README.md`,
`data/inbox/specs/README.md`, both `docs/strategy/BRIEF_*.md`, `materials.json`,
every `stack_*.json`, and the spec-library event files.

One borderline case, left alone deliberately (the handoff also forbids editing
it): **`docs/prompts/REVIEW_AGENT.md:349`** says *"this line said "eight of the
nine" until 2026-08-11 and it was five of eleven by then"*. That is a live
sentence containing a live count — but written in the **past tense against a
date**, which is the repo's correction convention, and its point is to send you
to the test rather than to state a share. The scanner does not flag it (the
workbook shape requires the word *entries* near the numbers). If the workbook
count moves again that sentence stays true, because it is dated. Judgement call;
flagging it here so the next reader sees it was a decision, not an oversight.

Historical copies were **not** touched, by the same scope rule
`test_every_document_quoting_the_traced_ratio_quotes_the_current_number` uses:
`docs/sessions/**`, `docs/issues/**`, `docs/reference/**` are what someone
believed on a date.

## Decisions not in the handoff

**`PROVENANCE.md` is excluded from the scan.** This is the one exclusion that
was not obvious. Its rows legitimately record transitions — *"eight of the
fifteen entries transcribing the workbook → **five**"* — as running prose, not
as blockquotes, so a naive scan flags them and the only "fix" would be to
falsify the ledger. Every row in that file is a dated *"this is what changed"*,
so it is history in the same sense the session dirs are. Same for the two
`data/inbox/*/PROVENANCE.md`.

**The exemption is "inside a quotation", not "inside a blockquote".** The
traced-ratio test uses the blockquote rule. That is not enough here, because two
of the three live copies live in **JSON**, where there is no blockquote — and
`library_ref_note` already preserves its own superseded number the only way JSON
allows, inline double quotes: *`that clause read "The other twelve entries keep
values_status inline"`*. So a claim is exempt if the number sits inside a
blockquote line **or** a `"…"` span. Without that, the note's own correction
record would have been a permanent failure and someone would have deleted the
evidence to get the suite green.

**JSON is scanned field-by-field, not as text.** The scan parses `docs/**/*.json`
and walks string values, reporting `file [entries[4].library_ref_note]`. Reading
the raw file instead would have made the outermost `"` of every JSON string a
quotation span, exempting the entire file — i.e. the guard would have passed
against the two documents it most needed to read.

**Both denominators are accepted.** *"five of the fifteen"* (all entries) and
*"five of the eleven"* (entries carrying a `values_source`) are both correct;
the shape checks the numerator against the workbook count and lets the
denominator be either. Do not "fix" one to match the other.

## What the guard does not do

It matches **shapes this repo has actually written** (`_COUNT_CLAIMS`), not
English. Invent new phrasing for one of these counts and it is not caught — add
the shape. The honest claim is *"the ways this repo has gone stale before are
now mechanical"*, not *"prose is safe"*. Second, smaller hole: the `"…"`
exemption pairs quotes within a single line, so a live claim that happens to sit
inside a same-line quoted span passes silently. Both are stated in the test
docstring; neither is worth more machinery until it bites.

`test_the_hardware_entry_count_guard_can_fail` exists because of the definition
of done — a guard nobody has watched fail is not a guard. It replays the stale
README sentence verbatim and asserts both directions: flagged as a claim,
silent when the same sentence is quoted as a correction.

## Demonstrations run (definition of done)

1. Flipped one entry's `values_source.kind` from `workbook` to `spec` in the
   working tree → the guard failed naming
   `docs/tolerance_stacks/hardware_entries.json [description]: says 5 entries
   sourced kind=workbook … has 4` **and** `says 4 entries traced to the NAS
   standard … has 5`. Reverted with `git checkout --`.
2. Re-inserted the old stale sentence into the README → failed naming
   `docs/tolerance_stacks/README.md:128 … says 8 … has 5`, `:129 … says 3 … has
   6`, `:129 … says 1 … has 4`. Reverted.
3. Full suite green against the real tree: **345 passed, 1 skipped**, measured
   **in the worktree** (`handoff/hardware_counts_doc_guard`) with the main
   checkout's interpreter. The skip is the one data-dependent test, which runs
   where `data/` is populated — a pasted suite line is checkout-specific here, so
   always say which one produced it. `review/hardware_counts_doc_guard` re-measured
   both after the merge; see that review report for the main-checkout figure.

## Gotchas for the next agent here

- **`venv-win` is gitignored, so it does not exist in a worktree.** Run the
  suite with the main checkout's interpreter from inside the worktree:
  `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`. The
  `CLAUDE.md` command (`venv-win\Scripts\python.exe`) is written for the main
  checkout.
- **`test_this_branch_amended_the_row_of_every_imported_file_it_changed` will
  fail you.** Both `docs/tolerance_stacks/README.md` and
  `tests/test_tolerance_stack.py` are imported files; changing either requires
  appending an *"Amended again \<date\> (`handoff`)"* clause to its
  `PROVENANCE.md` row. The failure message tells you the row and the format.
- The scan walks the tree with `os.walk` and prunes `venv-win/`,
  `node_modules/`, `data/runs/`, `data/projections/` and friends. If you add a
  large generated directory, prune it there too or the test gets slow.

## Filed, not fixed

`docs/issues/ISSUE_20260812_the_traced_ratio_guard_carries_a_stale_ratio_in_its_own_comment.md`
— `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
computes `current` correctly and then annotates the line `# "3 of 26"`, which
has been `5 of 26` since 2026-08-10. Harmless (the value is computed), and
exactly the wrong place for a cached copy of a number. Out of this handoff's
scope, so it is filed rather than fixed.
