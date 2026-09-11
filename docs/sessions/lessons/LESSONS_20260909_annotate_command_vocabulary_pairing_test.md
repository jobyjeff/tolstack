# LESSONS 2026-09-09 — annotate_command_vocabulary_pairing_test

**Chose the static-parse option, not the boot-hook option** — and the reason
is mechanical, not a preference: `app.js` cannot be executed in
`run_tests.cjs`'s sandbox at all. It's an ES module (`import { AnnotateScene }
from "./scene.js"`) that calls `document.getElementById(...)` at top-level
load, and the runner's sandbox (see its own docstring) is a bare `{ console,
window: <itself> }` object with no DOM and no module loader — it only ever
`vm.runInContext`s the six DOM-free classic-script files. "Captured once at
boot via a test hook" would need a DOM shim plus an ES-module loader plus a
WebGL stand-in for `scene.js`, none of which exist here and which this repo's
own `step_tessellation` lesson gives a reason not to build (no real-browser
automation on this machine). So `commands.verbs()` — which already exists,
unused by any test — stays unused; the pairing reads both sides as **text**
instead.

That's exactly the choice `tests/test_sop_vocabulary.py` and
`tests/test_js_python_vocabulary.py` already made for their own JS/prose
pairings one repo layer down (never execute the source to learn its
vocabulary — read the literals), so this isn't a new pattern, just the same
one applied to `apps/annotate/README.md` vs `apps/annotate/app.js`'s
`commands.register(...)` calls instead of Python vs JS.

**Landed in `apps/annotate/run_tests.cjs`**, not a new file — the checks need
nothing `commands.js`'s existing sandbox doesn't already have (`fs`, `path`,
`here` are already in scope), so a second file would only have duplicated the
harness. No change was needed to `commands.js`'s `verbs()` method.

**The README table is one row per *usage*, not per verb.** `camera reset` and
`camera frame <part...>` are two rows for one verb; the select-* row lists
three verbs in one cell separated by `" / "`. The extractor takes every
backtick span in a row's first column and keeps that span's first
whitespace-delimited token, which handles all three shapes (a lone verb, a
verb-with-args, three verbs in one cell) without special-casing any of them.

**One parsing trap, caught by testing against the real file before trusting
the extractor:** naively splitting a table row on `|` breaks the `open-part`
row, whose cell contains an *escaped* pipe (`` `open-part <mesh-id\|part>` ``
— it's a synthetic `sha256|part_id` alternative, not a table separator). Fixed
with `/^\|((?:\\.|[^|\\])*)\|/` (an escaped-char alternative ahead of the
excluded-char class) rather than a plain `split("|")`.

**Verified per the handoff's own definition of done:** added
`commands.register("teleport_probe_only", cmdGoto)` to the real `app.js`,
confirmed the new pairing check went red (and, as an expected side effect,
so did the synthetic "can it fail" check below it — its own inserted verb
collided with the real extra one in the failure message, which is correct,
not a bug), then reverted app.js to a clean `git diff`. Also added a
permanent `check("the pairing above can fail ...")` using an in-memory
mutated copy of `app.js`'s text (never the file on disk) so a future verb
addition doesn't have to be manually caught again to trust the check still
works — the same "can it fail" shape `test_sop_vocabulary.py` and
`test_js_python_vocabulary.py` both carry.

**Full verification:** `node apps/annotate/run_tests.cjs` → 36/36 passed.
`venv-win/Scripts/python.exe -m pytest -q` → 750 passed, 1 skipped (same
shape as before this change — no pytest wrapper exists yet for annotate's JS
suite the way `test_viewer_js_suite.py` wraps the viewer's, so this stays a
manual-invocation runner; out of scope for this handoff, and not something
this handoff regressed).
