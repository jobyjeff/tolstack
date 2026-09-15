---
type: bug
priority: med
status: open
area: viewer/topology
reporter: agent
---

# `chainable()`'s false branch — a refusing study staying on the walk — is unwitnessed in every tier

`viewer_study_respine_animation` made a study click change `state.layoutMode`,
and guarded it (`apps/viewer/topology_app.js`, `onNavStudy`):

```js
state.layoutMode = chainable(studyId) ? "chain" : "topology";
```

with a comment stating the design: *"A study that REFUSED has no chain to lay
out (the error is the result), so it stays on the whole-topology walk, which is
the same condition the toggle disables itself for."* The behaviour is correct.
**Nothing pins it.**

## Measured

Mutating the line to `state.layoutMode = "chain";` — i.e. a refusing study also
claims the chain layout — leaves every tier green:

| tier | result with the mutation |
|---|---|
| `node apps/viewer/run_tests.cjs` | 292/292 (structurally blind: `topology_app.js` is not loaded) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 353/353 |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **18/18 suites** |

The handoff's own lesson lists 21 one-line mutations each observed failing,
including *"the study click choosing the chain layout"* — that mutation exercises
the `"chain"` **value**, not the `chainable()` **predicate**, so the sweep passed
over this branch without noticing.

## Why it matters

With the mutation in place, clicking a study that refuses to sum
(`demo_ambiguous`, and the real `pitch_*` refusals) leaves the toolbar reading
**"Showing: study chain"** while `layoutFor()` falls back to `topoProj.layout`
and draws the **whole walk** — and the button is `disabled` for a refusing study
(`studyOk()` is false), so the reader cannot correct the label. A caption that
names a serialisation the page is not drawing, with no way out, is the same class
of defect as the floored-bar mark: the page claiming something it is not showing.

## What would close it

A browser-tier sub-check in `testRespine` (or in the existing refusal block of
`testTheTopologyPage`) that clicks a refusing study and asserts both halves:
the toggle still reads *"Showing: whole topology"*, and the row count is the
topology's edge count rather than anything chain-shaped. Mutate
`chainable(studyId) ? "chain" : "topology"` → `"chain"` and confirm it goes red.

Found by the `viewer_study_respine_animation` review (2026-09-15); everything the
handoff's own deliverables asked for *is* witnessed — five independent wiring
mutations were observed failing during that review. This is the one guard the
author added on their own initiative, which is why it escaped.
