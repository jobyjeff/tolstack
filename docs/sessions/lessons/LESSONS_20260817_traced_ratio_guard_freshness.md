# LESSONS 2026-08-17 — traced_ratio_guard_freshness

Handoff: `HANDOFF_20260812_traced_ratio_guard_freshness.md`. Branch:
`handoff/traced_ratio_guard_freshness`. The handoff named this file
`LESSONS_20260812_...`; it is dated by the session that ran, 2026-08-17, which is
the convention the rest of `lessons/` follows (`HANDOFF_20260803_pitch_link_stack`
→ `LESSONS_20260804_pitch_link_stack`).

## The question the handoff asked: could `_quoted_spans()` be shared outright?

**It is shared, and it is now one definition with two callers — which it already
was.** The handoff's worry was the right one but the diagnosis was half a step
off: `_quoted_spans()` was never duplicated. It was written on 2026-08-12 as a
module-level function for the hardware-count scan, and the traced-ratio scan
simply did not call it — it carried an *inline* `not line.lstrip().startswith(">")`
instead. So there was no second copy to merge; there were two **notions** of
"quoted" in one file, one of them a fragment of a line-loop rather than a
function.

That is worth naming, because it is the harder version of the bug to see. A
duplicated helper shows up in a grep. A helper plus one caller that reimplements
half of it inline does not: the sibling scan looked shared and was not, and the
difference between the two notions (double quotes) is precisely what had been
blocking the fix for a week.

What I changed, therefore, is not a merge but a **move**: `_quoted_spans()` now
sits above the first of its two callers rather than 250 lines below it, under a
comment naming both scans. Nothing about the function's body changed. The reason
to move it rather than leave a forward reference is that the next author adding a
third doc scan reads top-down; a helper defined after the code that needs it
reads like a private detail of the section it sits in, and that is exactly how
the traced-ratio scan came to grow its own blockquote check.

**What is still not shared, deliberately:** `live_documents()`. The two scans
disagree about which documents to read, and correctly:

* the hardware scan is *only* "no document may state this wrongly", so it walks
  the whole tree — a count copied into a file nobody enumerated is how that bug
  recurs;
* the traced-ratio scan has a second half — *"every one of these documents must
  state the current figure"* — and that half needs a curated list. You cannot
  demand that every `.md` in the repo quote the ratio.

Making the stale half walk `live_documents()` while the missing half keeps its
list is a real improvement and is **not** done here (out of scope, and it would
be a second behavioural change in the same commit). Left as a follow-up below.

## What the generalisation actually found

One live document was stating a retired figure as a bare claim:
`docs/SOP_TOLERANCE_STACK.md:96` — *"The 2026-08-10 change … took it from 3 of 26
to 5"*. True, dated, useful, and outside a blockquote, so the blockquote-only
rule could never have accommodated it. It is now written with the figure in
double quotes, which is the repo's convention stated mechanically, and the
section above it gained two lines saying so — otherwise the next editor "cleans
up" the odd-looking quotes and the suite goes red for a reason the file does not
explain.

That single find is the whole argument for the double-quote exemption. Every
*other* live occurrence of `3 of 26` (six of them, in `ARCHITECTURE.md`, the four
worksheets and `data/inbox/specs/README.md`) is already a blockquote, so a
blockquote-only rule would have looked like it worked, right up to the one
sentence it could not express.

## Decisions not in the handoff

**The match is anchored on both numbers, not on the denominator.** The old check
was the substring `"of 17"`. Two things wrong with that beyond only holding one
figure: it flags a perfectly correct `4 of 17` (a different ratio that happens to
share a denominator), and it cannot express any figure whose denominator matches
the *live* one — and `3 of 26` shares 26 with `5 of 26`. That second point is the
mechanical reason `3 of 26` could not simply be appended to the old check, and it
is not the reason the 2026-08-10 lesson gave. `_retired_ratio_pattern()` builds
`\b<traced>\b[^.\n]{0,40}?\bof\s+<instances>\b`, which also catches the wordier
`1 traced out of 17` the worksheets write.

The 40-character window is a judgement call. It is wide enough for
`N traced out of M` and `N traced of M` and narrow enough that
`3 traced / 7 inferred / 16 untraced out of 26` (35+ chars, and it appears only
in `docs/issues/` and `docs/reference/`, both out of scope) does not reach. If a
live doc ever writes that form, widen it — the tell will be a stale figure the
guard did not catch, so widen it *when you find one*, not pre-emptively.

**`_RETIRED_TRACED_RATIOS` is a hand-kept list, and that is not the same defect
this guard exists against.** It holds *history*, which does not move; the defect
is a cached copy of a *live* number. But it has an omission risk: when the ratio
moves next, the figure it replaces becomes unguarded and nobody is prompted. That
prompt now exists, and it is in the one place it can be read in time — the
`missing` half's failure message. Moving the ratio fails that half against every
live document, so the handoff that moves it is *guaranteed* to read the message,
and the message tells it to append the retired figure. There is also a cheap
inverse check (`current not in retired`) for the entry added one handoff early.

I looked for a way to derive the retired list rather than keep it, and there
isn't one that is honest: the only source for "what this repo used to say" is git
history, and reading git history to decide what prose may say is a much larger
and more fragile machine than two lines of list.

**The stale comment was deleted, not corrected** — option 2 of the issue, as the
handoff argued for. The line now calls `_current_traced_ratio()`, whose docstring
says why no literal belongs beside a recount. Correcting it to `# "5 of 26"`
would have re-armed the thing that went off.

**Added `test_the_traced_ratio_guard_can_fail`**, matching the sibling
`test_the_hardware_entry_count_guard_can_fail`. The handoff asked for three
manual probes; probes vanish when the session ends. The test replays the same
three shapes (bare claim → flagged; blockquoted → silent; double-quoted →
silent), plus the older figure in its wordy form, plus a negative case for the
`(11 + 6 = 17 of 26)` arithmetic that explains the founding denominator and must
not be read as a ratio claim.

**Closed the source issue** (`ISSUE_20260812_the_traced_ratio_guard_carries_a_
stale_ratio_in_its_own_comment.md`, `triaged` → `resolved`) with a dated note.

## Demonstrations run (definition of done)

All three probes appended a line to `ARCHITECTURE.md` in the working tree, ran
`-k quoting_the_traced`, and reverted with `git checkout -- ARCHITECTURE.md`:

1. `PROBE: the seeded stacks trace 3 of 26 element instances.` → **red**, naming
   `ARCHITECTURE.md:444: 3 of 26`.
2. The same sentence as a blockquote (`> PROBE: …`) → **green**.
3. The same sentence inside double quotes (`PROBE: that sentence read "…the
   seeded stacks trace 3 of 26 element instances" until 2026-08-10.`) → **green**.

A fourth demonstration was not staged and is the better one: the change itself
went red on first run against the untouched tree, naming
`docs/SOP_TOLERANCE_STACK.md:96`. The guard's first failure was a real one.

`grep` over the eight live documents for `3 of 26|1 of 17|out of 17|out of 26`
returns 17 lines; every one is a blockquote line, a double-quoted phrase, or the
**current** figure written long (`5 traced out of 26`,
`WORKSHEET_pitch_link_to_pitch_plate.md:464`).

Full suite: **434 passed, 1 skipped**, measured **in the worktree**
(`handoff/traced_ratio_guard_freshness`) with the main checkout's interpreter,
`C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`. 123 tests
collected from `tests/test_tolerance_stack.py`. The one skip is
`test_viewer_js_suite`'s node-fs tier, which needs a populated `data/`.

## Gotchas for the next agent here

- **`venv-win` is gitignored and absent from a worktree.** Run the main
  checkout's interpreter by absolute path from inside the worktree.
- **`test_this_branch_amended_the_row_of_every_imported_file_it_changed` will
  fail you** for touching `tests/test_tolerance_stack.py`. `PROVENANCE.md:96`
  is the row; the failure message gives the exact clause format.
  `docs/SOP_TOLERANCE_STACK.md` and `ARCHITECTURE.md` are **not** imported files
  and have no row — only `docs/tolerance_stacks/*`, the package, and the tests do.
- **`data/inbox/specs/README.md` is tracked** despite living under `data/`, so it
  is present in a worktree and the scan really does read it. The
  `if not p.exists()` guard in the traced-ratio test is therefore currently
  inert; don't delete it on that evidence, and don't assume the reverse for any
  other `data/` path.
- **Writing about this guard trips this guard.** The SOP sentence explaining that
  a bare `3 of 26` fails the test had to put its own example in double quotes.
  Expect that, and prefer it to weakening the pattern.

## Follow-ups (filed, not fixed)

- **Let the stale half walk `live_documents()`.** The `missing` half needs the
  curated list; the `asserted_stale` half does not, and a retired ratio in a
  document nobody enumerated is exactly the bug (`1 of 17` reached eleven files).
  This is a small change with a real chance of surfacing more live bare claims,
  which is why it wants its own handoff rather than a ride-along commit.
- `ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md` is
  **half-answered for this guard and nobody has noticed**: the traced-ratio
  scan's `missing` half *does* fail when a live document loses its ratio
  paragraph, because it demands the figure be present. That is the issue's
  candidate shape (1), a required-content manifest, already in service for one
  number in eight documents. Worth reading before designing shapes (2) and (3) —
  it is evidence about how a hand-kept required-content list actually ages here,
  and this session's answer is "well, because moving the number forces you to
  visit every entry".
