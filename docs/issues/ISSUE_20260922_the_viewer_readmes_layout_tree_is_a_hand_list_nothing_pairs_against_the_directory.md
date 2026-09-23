---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260922_stack_page_alert_marks_and_drawn_glyph.md
---

# `apps/viewer/README.md`'s `## Layout` tree is a hand-maintained file list that nothing pairs against the directory

Found reviewing `stack_page_alert_marks_and_drawn_glyph` (2026-09-22), which
added `apps/viewer/warning_icon.js` — a new **top-level** file in a directory
whose README claims to list them all — and did not add a row for it. That row
was added in the review (one line, inside the inline-fix boundary), so this
issue is about the guard, not about that file.

## The shape

`apps/viewer/README.md`'s `## Layout` block enumerates `style.css`,
`index.html`, `topology.html`, `topology.css`, `test.html`, `config.js`,
`viewer.js`, `topology.js`, `fixtures.js`, `topology_fixtures.js`,
`topology_app.js`, `storage/*`, `views/`, `vendor/markdown.js` and
`run_tests.cjs` — every top-level file in that directory except two:

* **`reader_facing_bans.js`** — missing since it was created, and the omission
  went unnoticed through every review that has touched it since; it is cited by
  name elsewhere in the same README.
* **`warning_icon.js`** — added 2026-09-22, filled in during review.

So the list is already wrong by one, which is the tell that nothing enforces
it: *if `apps/viewer/` grows a file tomorrow, what breaks loudly?* Nothing.
This is the repo's most-repeated defect shape stated in `CLAUDE.md` ("a
quantity written in prose that no test reads from the tree is a defect,
regardless of whether it happens to be right today") applied to a *list* rather
than a count, and `ARCHITECTURE.md`'s module inventory — paired against the
tree by `tests/test_architecture_inventory.py` — is the fix shape already in
this repo. That test's scope is the Python package, so it does not reach here.

## What would close it

A test that pairs the `## Layout` fence's leading tokens against
`apps/viewer/`'s own `glob("*.js")` + `glob("*.html")` + `glob("*.css")` and
the `storage/` / `views/` / `vendor/` directories, with the same exemption
posture `tests/test_js_python_vocabulary.py::viewer_sources` already uses
(`tests.js`, the fixtures) written as a named constant rather than inline. Two
directions to get right, per the review prompt's "a guard that settles a
structural question by matching text": a file present in the tree and absent
from the prose, **and** a row in the prose naming a file that no longer exists
— the second is how `index.html`'s retirement row would have to stay honest.

`apps/annotate/README.md` carries the same kind of tree (and was updated
correctly by that handoff), so the guard should cover both READMEs or say why
it does not. Note the standing caveat that **nothing scans
`apps/annotate/README.md`** at all
(`docs/prompts/REVIEW_AGENT.md`, "A measured number landing in the ONE app
README nothing scans").
