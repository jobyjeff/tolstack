---
type: bug
priority: med
status: open
area: tests/doc-scans
reporter: agent
found_by: docs/sessions/HANDOFF_20260917_prose_guards_scope_out_strategy_briefs.md
---

# `live_documents()` is an `os.walk` that ignores `.gitignore`, so a scratch `.md` left in the main checkout joins every claim-shape scan's corpus

Found while reviewing `prose_guards_scope_out_strategy_briefs` (2026-09-17),
which scoped the claim-shape scans out of `docs/strategy/BRIEF_*.md`. This is a
second, independent route into the *same* failure — a guard reddening on prose
that is not making a claim about this repo — and it was not in that handoff's
scope. Not fixed inline: it changes which documents a guard reads, i.e. a
guard's verdict on real trees.

## Measured

`live_documents()` (`tests/test_tolerance_stack.py:2266`) walks the tree with
`os.walk` and skips directories by a **hand-kept** name set (`_SKIP_DIR_NAMES`,
`_SKIP_REL_DIRS`). It never consults git. `tmp/` is gitignored
(`.gitignore:34`) and is not on either skip list, so today, in the main
checkout:

```
live_documents(C:/workspace/tolstack)   -> 94 files
live_documents(<any worktree>)          -> 92 files
only in the main checkout:
    tmp/mutation-witness/apps/annotate/README.md
    tmp/mutation-witness/apps/viewer/README.md
```

Both are untracked scratch copies a mutation-witness session left behind on
2026-09-16, and both are inside `claim_scanned_documents()` — so all four
claim-shape scans read them: hardware-entry counts, the traced-ratio stale
half, the one-fold-rule scan, and (via `git ls-files`, so *not* this one —
see below) the byte-identity scan.

## Why it matters

1. **The operator's batch merge runs in the main checkout.** A scratch copy of
   `apps/viewer/README.md` holding a now-stale hardware count or traced ratio
   reddens `test_no_live_document_states_an_unguarded_hardware_entry_count` on
   a file git does not track and no branch contains — unreproducible in every
   worktree, and indistinguishable from the class
   `prose_guards_scope_out_strategy_briefs` just closed. That class cost two
   blocked batch merges and thirteen duplicate issue filings.
2. **A mutation-witness copy is the *most likely* file to hold a deliberately
   wrong number.** The witness convention in this repo is to copy a document
   and break the thing the guard checks. Leaving the copy behind arms the
   guard against it.
3. **It makes the corpus size non-deterministic between checkouts**, which the
   floors and every measured figure in the docs are stated against. The
   tracked-tree numbers are 92 live / 68 claim-scanned in *both* checkouts;
   94 / 70 was this dirt.

`tests/test_provenance.py`'s byte-identity scan is immune by construction — it
derives its corpus from `git ls-files`, so an untracked file cannot enter it.
That asymmetry is the tell: one of the four scans already asks git what is
real, and three ask the filesystem.

## Smallest shape of a fix

Either make the walk gitignore-aware, or intersect it with `git ls-files`. The
second is the shape the repo already trusts (`claim_inventory()` /
`_scanned_paths()` in `tests/test_provenance.py`), it deletes `_SKIP_DIR_NAMES`
as a maintenance surface, and it makes "is this a live document?" answerable
by one authority instead of two. The cost to weigh: `live_documents()` would
stop seeing an untracked-but-real document, which today is nothing under
`docs/` but is a behaviour change worth a witness either way.

Whatever the shape, it needs the both-halves witness the 2026-09-17 handoff
established: a gitignored scratch `.md` carrying a wrong count is **not**
scanned, and the same file tracked **is**.

---

## Note, 2026-09-24 — the consequence is fixed, the title is still true

`claims_registry_guards_read_declarations_not_prose` (2026-09-23) replaced every claim scan's corpus with `tests/claims_registry.py::claim_corpus()`, which asks `git ls-files` rather than walking — so untracked scratch cannot join a claim scan's corpus any more, and `test_the_coverage_sets_the_doc_scans_walk_are_non_empty_and_complete` asserts this repo resolves to the git-tracked mode rather than to the walk.

**Left open on purpose.** `live_documents()` itself is still a bare `os.walk`, with one consumer: the enumerated-state surface guard, which wants "this README stopped being live" to be loud and is about what is on disk rather than what states a fact. Whoever closes this decides whether that caller wants the git-aware set too. Do not close it as a side effect of the 2026-09-23 handoff — the scan-corpus half is done, this half is not.
