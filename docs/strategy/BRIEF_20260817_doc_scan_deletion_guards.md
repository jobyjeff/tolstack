# STRATEGY BRIEF 2026-08-17 — doc_scan_deletion_guards: the doc-scan guards can fail on a wrong number and not on a deleted one

**Routing note.** `docs/issues/ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`
is `type: feature`, `priority: med`, `audience: strategy`. Both signals point the
same way and triage did not have to weigh anything. Triage has **not** chosen among
the four candidate shapes below — the issue's own §"Why this is a design question,
not a patch" is the argument for why it must not, and it is correct.

Nothing here is blocking: the README this was found through is restored and correct
as of 2026-08-12.

## The hole, demonstrated rather than inferred

tolstack has two guards built to stop a live document stating a number that
disagrees with the computed one:

- `test_no_live_document_states_an_unguarded_hardware_entry_count`
- `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`

Both walk the live documents, find claim **shapes**, recount each stated number
against the data, and fail on disagreement. So:

> **A document that states nothing states nothing false.**

Reproduced during `restore_viewer_readme` (2026-08-12): removing the
`## Which bytes the number was read off` section from `apps/viewer/README.md` — the
exact section the Ghostwriter truncation removed — plus the `EXPORT UNESTABLISHED`
and `CTE NOT TRANSCRIBED` legend rows, then running the full suite:

```
350 passed, 1 skipped in 18.98s
```

Zero failures. That section is where *"26 of the 48 live citations have no export
block"* and *"15 of the 22 live established citations have none — 6 of the 9
distinct exports they name"* live. **Every one of those numbers is guarded against
being wrong and none of them is guarded against being absent.** (The single skip is
a `data/`-dependent test absent from a worktree, unrelated; the same suite is 351
passed in the main checkout.)

## Why this repo specifically

Not hypothetical. On 2026-08-12 a Ghostwriter editor window holding a pre-work
buffer wrote itself over `apps/viewer/README.md` **in the main checkout**, cutting
it from 305 lines to 228 and deleting exactly that section. It was caught by the
2026-08-12 triage sweep reading `git status` in the main checkout, **not by the
suite**, and the suite would have stayed green indefinitely. See
`ISSUE_20260812_ghostwriter_holds_a_stale_apps_viewer_readme_over_the_main_checkout.md`
and `docs/sessions/lessons/LESSONS_20260812_restore_viewer_readme.md`.

The failure class this repo names as its worst is *"a document asserts a stale
number"*. **Deletion is the same class one step further along**: the document now
asserts nothing, which reads to a future author as *this surface has no provenance
story* rather than *this paragraph went missing*. A guard that only checks the
numbers present cannot tell those apart.

## The four candidate shapes (the issue's, verbatim in substance)

1. **Required-heading manifest** — explicit, honest, hand-kept, goes stale.
2. **Derive the requirement from the data.** Every enumerated state the viewer has a
   branch for (`VA.EXPORT_STATUSES`, `values_status`) must be *mentioned by name* in
   the surface's README. Self-updating: add a state, the guard demands it be
   documented. Does not protect prose that documents no enumerated state.
3. **Guard the count of guarded claims.** Assert that `hardware_entry_count_claims()`
   over the live corpus yields at least the claims it yielded before — a document
   may move a number, but the corpus may not silently lose one. Catches deletion
   generically; needs a stored baseline, which is its own staleness surface.
4. **Do nothing at the test level** and treat this as a working-tree-integrity
   problem instead (the actual cause here was an editor, not an author).

**(2) and (3) are the two that do not require a human to remember anything, and
they are not exclusive.** The obvious fix — asserting a literal required heading —
is shape (1), and `live_documents()` was deliberately written as a *walk* rather
than a hand-kept list for exactly the reason that a hand-kept list goes stale (see
its docstring). Reintroducing one at the section level inherits that problem **and**
freezes prose structure, which is a real cost: these documents get restructured
legitimately.

## The question a strategy agent has to answer first

**Which sections are load-bearing, and what declares them so?** Every shape above is
a different answer to that, and it cannot be skipped by picking an implementation.
Shape (2) answers it "the ones documenting an enumerated state the code branches
on" — which is checkable and self-updating, and also admits it protects nothing
else. Shape (3) answers it "whatever was there last time", which needs a baseline
someone must be able to legitimately lower.

Two things to weigh that the issue does not:

- This repo already has a checklist entry for the hole
  (`docs/prompts/REVIEW_AGENT.md`, "A doc-scan guard cannot fail on a *deleted*
  section — only on a wrong one"). That makes the recurrence **visible to the next
  reviewer**; it is not the same as making it impossible, and the choice of whether
  the checklist entry is sufficient is itself a legitimate outcome — shape (4) with
  the reasoning written down.
- Shape (4) is not a cop-out here. The actual 08-12 cause was an editor holding a
  stale buffer over the main checkout, which no test can catch and which a
  working-tree-integrity check (or a habit) can. If the strategy agent picks (4),
  the deliverable is that check or that habit, written down — not silence.
