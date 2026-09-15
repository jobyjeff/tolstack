---
type: chore
priority: low
status: triaged
area: viewer/rebuild
reporter: agent
handoff: docs/sessions/HANDOFF_20260915_viewer_hygiene_pass.md
---

# `REBUILD_DONE = "done"` is a hand-copy of another repo's constant, and nothing pairs the two

Found in review of `viewer_popover_clamp_and_rebuild_terminal_state`
(2026-09-15). Not a defect in that work — the value is **right**, and it was
read from the server rather than guessed, exactly as the handoff demanded. The
gap is that nothing keeps it right.

## The copy, and its source

`apps/viewer/topology_app.js` now holds

```js
var REBUILD_DONE = "done";
```

with the full vocabulary (`idle | queued | running | done | failed`) in the
comment above it. The definition lives in **another repo**:
`C:\workspace\drawing-checker\webui\tolstack_rebuild.py`, module-level
`STATES = (IDLE, QUEUED, RUNNING, DONE, FAILED)`, `DONE = "done"`. The browser
tier's stub sibling mount carries a **third** copy of the same word
(`scripts/run_viewer_browser_tests.mjs`, `terminalState || "done"`), and it is
the stub the new scenario-3 assertion is measured against — so the test and the
client agree with each other whether or not either agrees with the server.

## Why it matters, in the handoff's own words

> A client that hard-codes a state string the server never sends fails closed
> forever, which is a worse bug than the one you are fixing.

That is now the standing exposure. Ask the universal question — *if the source
changes tomorrow, what breaks loudly?* — and the answer here is **nothing in
this repo**. `pollRebuild` takes the `rebuildFailed()` exit on any state that is
not `done`, so a rename in drawing-checker turns every successful rebuild into
"The rebuild failed. Try again…" with a green suite in both tiers and both
repos. It fails safe (loud to the reader, no stale projection presented as
fresh) rather than silently, which is why this is `low` and not `high` — but it
fails permanently and with no test pointing at the cause.

## What would close it

Some single thing that goes red when drawing-checker's `DONE` moves. Options,
in rough order of cost:

1. A test that reads `webui/tolstack_rebuild.py`'s `STATES`/`DONE` by AST from
   `C:/workspace/drawing-checker` and pairs it against the JS constant — the
   shape `tests/test_js_python_vocabulary.py` already uses for the six in-repo
   vocabularies, and `tests/test_dc_snapshot.py` is the precedent for a test
   that reaches into drawing-checker at all. Needs a decision about what it does
   when that repo is absent (skip is weak; the suite has no other cross-repo
   hard dependency).
2. The browser stub stops carrying its own `"done"` literal and imports the
   viewer's constant, so at least the two in-repo copies cannot drift from each
   other independently.
3. If neither is wanted, say so in **one** place — `apps/viewer/README.md`'s
   rebuild section is the candidate — that this string is an unpaired cross-repo
   copy and what its failure looks like, so the next person debugging "rebuild
   always fails" finds the cause in one grep instead of two repos.

Whoever picks this up should pick one and close the others out loud; the
tolerable outcome is a recorded decision, not three half-copies and a comment.
