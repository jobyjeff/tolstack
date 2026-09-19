---
type: chore
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260918_reader_facing_surfaces_second_pass.md
---

# `apps/annotate/run_tests.cjs` is run by no gate, so the annotator's guards are only ever run by hand

`reader_facing_surfaces_second_pass` (2026-09-18, deliverable 4) added three
checks to `apps/annotate/run_tests.cjs` — the markup ban scan, the command-hint
registry pairing, and the `AA.*` word-table sweep — and they are good checks.
**Nothing in this repo runs that file.**

What does run, and what does not:

| runner | run by |
|---|---|
| `apps/viewer/run_tests.cjs` | `tests/test_viewer_js_suite.py`, every `pytest -q`; `npm run test:fast`; named in `CLAUDE.md` |
| `scripts/run_viewer_browser_tests.mjs` | `npm run test:browser`; named in `CLAUDE.md` as a pre-merge must-run |
| `scripts/run_mutation_witness_tests.mjs` | `npm run test:mutations`; anchors only in `tests/test_mutation_witnesses.py` |
| **`apps/annotate/run_tests.cjs`** | **nothing.** No pytest wrapper, no `package.json` script, not in `CLAUDE.md`'s list. `tests/test_mutation_witnesses.py` knows the string `"annotate"` as a *tier name* for witness entries, which is not the same as running the suite |

So the annotator's 84 checks — including everything that now stands between the
reader and `parts (data/meshes/)` coming back — are green only for as long as
somebody remembers to type the command. The viewer's equivalent has had a
pytest wrapper since it existed, and that wrapper was made a *failure* rather
than a skip on 2026-09-18 precisely because "a tier that cannot run is not a
tier that passed".

**The fix** is the viewer's, one file over: a `tests/test_annotate_js_suite.py`
that shells `node apps/annotate/run_tests.cjs`, fails when node is absent
rather than skipping, and fails on a reported SKIP the way
`tests/test_viewer_js_suite.py` now does. Add `test:annotate` to
`package.json` and the command to `CLAUDE.md`'s pre-merge list while you are
there.

**Watch for:** this suite has `[real]` checks of its own (the part-mesh alias
ones), which read gitignored `data/` and so cannot pass in a worktree without
a `--repo`-style seam. Whatever the wrapper does about that has to be the
*same* answer `test_viewer_js_suite.py` gives, or the repo grows two readings
of the same question.
