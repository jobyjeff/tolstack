---
type: feature
priority: med
status: triaged
strategy: docs/strategy/BRIEF_20260817_doc_scan_deletion_guards.md
area: tests / doc-scan guards
reporter: agent
audience: strategy
---

# The doc-scan guards cannot fail on a deleted section — only on a wrong one

tolstack has two guards built to stop a live document stating a number that
disagrees with the computed one:

* `test_no_live_document_states_an_unguarded_hardware_entry_count`
* `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`

Both work the same way: walk the live documents, find claim *shapes*, recount
each stated number against the data, fail on disagreement. That design has a
hole with a sharp edge:

> **A document that states nothing states nothing false.**

Delete a document's whole provenance chapter and both guards go quiet. The
number they were guarding is no longer in the file, so there is nothing to
recount and nothing to disagree with. The suite is green on a README whose
content is gone.

## Demonstrated, not inferred

Reproduced during `restore_viewer_readme` (2026-08-12). Removed the
`## Which bytes the number was read off` section from `apps/viewer/README.md`
(the exact section the Ghostwriter truncation removed — see below) plus the
`EXPORT UNESTABLISHED` and `CTE NOT TRANSCRIBED` legend rows, then ran the full
suite:

```
350 passed, 1 skipped in 18.98s
```

Zero failures. That section is where `26 of the 48 live citations have no export
block` and `15 of the 22 live established citations have none — 6 of the 9
distinct exports they name` live. Every one of those numbers is guarded against
being *wrong* and none of them is guarded against being *absent*.

(The single skip is a `data/`-dependent test that is absent from a worktree, not
related. The same suite is 351 passed in the main checkout.)

## Why it matters here specifically

This is not hypothetical. On 2026-08-12 a Ghostwriter editor window holding a
pre-work buffer wrote itself over `apps/viewer/README.md` in the main checkout,
cutting it from 305 lines to 228 — deleting exactly that section. The truncation
was caught by the 2026-08-12 triage sweep reading `git status` in the main
checkout, not by the suite, and the suite would have stayed green indefinitely.
See
`ISSUE_20260812_ghostwriter_holds_a_stale_apps_viewer_readme_over_the_main_checkout.md`
and `docs/sessions/lessons/LESSONS_20260812_restore_viewer_readme.md`.

The failure class this repo names as its worst is "a document asserts a stale
number". Deletion is the same class one step further along: the document now
asserts nothing, which reads to a future author as *this surface has no
provenance story* rather than *this paragraph went missing*. A guard that only
checks the numbers present cannot tell those apart.

## Why this is a design question, not a patch

The obvious fix — "assert `apps/viewer/README.md` contains the heading
`## Which bytes the number was read off`" — is a hand-kept list of required
sections, and `live_documents()` was deliberately written as a *walk* rather
than a hand-kept list for exactly the reason that a hand-kept list goes stale
(see its docstring). Reintroducing one at the section level would inherit that
problem and would also freeze prose structure, which is a real cost: these
documents get restructured legitimately.

The question someone has to answer before writing code is **which sections are
load-bearing, and what declares them so** — candidate shapes, none obviously
right:

1. **Required-heading manifest** — explicit, honest, hand-kept, goes stale.
2. **Derive the requirement from the data.** Every enumerated state the viewer
   has a branch for (`VA.EXPORT_STATUSES`, `values_status`) must be *mentioned*
   by name in the surface's README. Self-updating: add a state, the guard demands
   it be documented. Does not protect prose that documents no enumerated state.
3. **Guard the count of guarded claims.** Assert that
   `hardware_entry_count_claims()` over the live corpus yields at least the
   claims it yielded before — a document may move a number, but the corpus may
   not silently lose one. Catches deletion generically; needs a stored baseline,
   which is its own staleness surface.
4. **Do nothing at the test level** and treat this as a working-tree-integrity
   problem instead (the actual cause here was an editor, not an author).

(2) and (3) are the two that do not require a human to remember anything. They
are not exclusive.

## Scope note

Filed from `restore_viewer_readme`, whose handoff explicitly scoped the fix out
("report the guard gap — do not build the fix here", deliverable 5). Nothing in
this issue is blocking: the README is restored and correct as of 2026-08-12.
