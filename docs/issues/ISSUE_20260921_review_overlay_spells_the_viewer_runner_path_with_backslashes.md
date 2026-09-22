---
type: chore
priority: low
status: open
area: prompts/review
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_review_overlay_test_cadence.md
---

# The review overlay spells the viewer runner's own script path with backslashes, in the entry that warns about backslashes

`docs/prompts/REVIEW_AGENT.md`, the *"The viewer's JS suite is green without
having read any real data"* entry, tells the reviewer to run:

```
node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack
```

The `--repo` **value** is correctly forward-slashed, and the two sentences
immediately after it are the whole explanation of why. The **script path** is
not. Under the Bash tool the shell eats those backslashes exactly the same way,
so the command becomes `node appsviewerrun_tests.cjs` and node exits
`Cannot find module`.

Not the silent-skip trap the surrounding text is about — this one fails loudly,
which is why it has survived — but it is a copy/paste command in the file that
documents the trap, and it is the only site: every other `node apps/...` /
`node scripts/...` invocation in the overlay is already forward-slashed (four
sites, checked 2026-09-21).

## Fix

One `sed`: `apps\viewer\run_tests.cjs` → `apps/viewer/run_tests.cjs` in
`docs/prompts/REVIEW_AGENT.md`. Left unfixed by the
`review_overlay_test_cadence` handoff, whose scope was that file's test-cadence
sentences only (file-don't-fix).

> **2026-09-21, `review/review_overlay_test_cadence`:** the overlay half is
> **done** — fixed inline in the review, where the overlay is the reviewer's
> own artifact. This issue stays `open` for the sibling below, which is in a
> test file and belongs to whoever owns that file next.

Sibling worth checking in the same pass, **not** the same file and explicitly
out of that handoff's scope (it forbade touching tests): the docstring of
`tests/test_viewer_js_suite.py` prints
`node scripts\run_viewer_browser_tests.mjs` as the TRUTH-tier command, same
shape.
