---
type: bug
priority: med
status: open
area: viewer/nav
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_nav_wedge_and_classic_retirement.md
---

# Two of `navigate()`'s three contracts are unwitnessed in every tier

`viewer_nav_wedge_and_classic_retirement` contained the nav wedge in
`topology_app.js`'s `navigate()`, and declared a mutation witness
(`nav-click-never-wedges`) for the rejection arm — verified WITNESSED. The
function states **three** contracts in its own comment, and only that one is
watched. Measured in review, on the merged tree, by mutating each line in a
`git archive` copy and running all three tiers:

| mutation | fast | `--repo` | browser |
| --- | --- | --- | --- |
| `}, navFailed);` → `});` (the declared one) | 308/308 | 382/382 | **14/14 → 11/14 FAIL** |
| `state.error = null;` deleted (no recovery) | 308/308 | 382/382 | **11/14 FAIL** |
| `state.worksheetText = null;` deleted in `navFailed` | 308/308 | 382/382 | **20/20 PASS** |
| the `try` around `loadWorksheet()` removed | 308/308 | 382/382 | **20/20 PASS** |

## 1. The stale-worksheet clear (the one that matters)

`navFailed` clears `state.worksheetText` because, as its comment says,
`loadWorksheet()` only *assigns* on success — so the previous node's markdown
would otherwise still be in the dialog under this node's title. That is
reachable and observable: `paint()` computes `hasWorksheet` from
`sheet.worksheet_file` (the projection, not the text), so after a failed read
on a subject that declares a sheet the toggle is still offered, and
`views/worksheet.js` renders `.worksheet__path` from the **new** subject and
`.worksheet__body` from `state.worksheetText` — the **old** node's prose. The
"could not be read from the connected folder" branch that line exists to reach
is skipped entirely. Deleting the line leaves all three tiers 100% green.

Cheapest fix: in the wedge suite's pass 1, for a reading row, open
`#worksheet-dialog` and require the "could not be read" sentence (or an empty
body) rather than a previous node's `<h1>` — then declare it as a second
`mutation_witnesses.json` entry on the same suite.

## 2. The synchronous-throw door

The comment justifies calling `loadWorksheet()` from *inside* the `try` with
"an adapter whose `readText` throws before it ever returns one (a null adapter,
an unready handle -- `VA.requireReady` throws)". Two corrections from reading
the adapters: `FsaAdapter.readText` and `HttpAdapter.readText` are `async`, so a
`requireReady` throw there arrives as a **rejection**, not a synchronous throw —
only `MemoryAdapter` (not `async`) and a null `adapter` can throw
synchronously, and a null adapter returns from `boot()` before any nav row
renders. So the guard is defensible defence-in-depth whose stated door is
narrower than the comment claims, and no tier can reach it today. Lower
priority than 1: either narrow the comment to the memory/node-fs adapters, or
add a fast-tier test that drives `navigate()` with a synchronously-throwing
`readText`.

Related: the same handoff's own lesson §5 explains why the suite's sub-check
names are literal strings, which is what makes adding an entry for 1 cheap.
