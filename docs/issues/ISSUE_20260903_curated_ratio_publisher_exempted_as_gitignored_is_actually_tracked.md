---
type: bug
priority: med
status: open
area: tests/doc-guards
reporter: agent
---

# `data/inbox/specs/README.md` is tracked, not gitignored — so the one curated publisher the guard exempts is the one it cannot catch

Found during `review/doc_coverage_sets_derived` (2026-09-03).

## What is true

`traced_ratio_publishers()` (`tests/test_tolerance_stack.py`) is the curated half
of the traced-ratio guard, and its written argument is explicitly shape 1 of
`ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`: a
presence check exists to catch *a document that stopped publishing the figure*,
which is why the set cannot be derived from the documents.

Both of its existence paths exempt one entry:

```python
_RATIO_PUBLISHER_NAMES = (..., "data/inbox/specs/README.md",)   # gitignored: present only in the main checkout
...
    if not p.exists():          # data/ is gitignored; absent in a worktree
        continue
...
    gone = [... if not p.exists() and p.relative_to(repo_root).as_posix()
            not in ("data/inbox/specs/README.md",)]
```

**The premise is false.** `git check-ignore -v data/inbox/specs/README.md`
returns nothing and `git ls-files data/` lists it: the file is tracked, present
in every worktree, and `live_documents()` finds it in both the worktree and the
main checkout (both walks return 44). The `# gitignored` comments predate this
handoff (the `continue` is inherited); the *named* exclusion in the new `gone`
assertion is new.

## Measured

Moving `data/inbox/specs/README.md` out of the worktree and running
`tests/test_tolerance_stack.py tests/test_thermal_exception_list.py` gives
**159 passed** — the `missing` half `continue`s past it, the `gone` assertion
names it in its own exclusion tuple, and the `live_documents()` floor of 40
absorbs the loss from 44. Deleting a curated publisher is silent in exactly the
case the curation argument was written for.

## Suggested fix

Drop the exemption on both sides — the `continue` in the `missing` loop and the
`not in ("data/inbox/specs/README.md",)` clause in `gone` — and delete the two
`# gitignored` comments. If some *other* `data/` publisher is ever added that
genuinely is gitignored, gate that one by `git check-ignore` rather than by a
remembered belief, and observe the guard failing on a deleted entry before
accepting it.
