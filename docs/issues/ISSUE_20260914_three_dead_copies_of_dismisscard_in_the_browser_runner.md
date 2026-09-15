---
type: chore
priority: low
status: triaged
area: tests/browser-tier
reporter: agent
handoff: docs/sessions/HANDOFF_20260915_viewer_hygiene_pass.md
---

# Three of the four `dismissCard` helpers in the browser runner are never called

Found reviewing `viewer_dag_hover_cards` (2026-09-14). That handoff added a
`dismissCard()` helper — move the pointer off the trigger first, *then* press
Escape — because an Escape sent while the pointer still sits on a rail mark can
be undone by the very next paint. The helper is right and the reasoning in its
comment is worth keeping. It was pasted into **four** suite functions in
`scripts/run_viewer_browser_tests.mjs`, and only one of them uses it:

| definition | calls |
| --- | --- |
| `testTheApp` (~line 356) | **none** |
| `testTheTopologyPage` (~line 815) | 7 |
| `testHeightBudget` (~line 1468) | **none** |
| `testRenderCrash` (~line 1647) | **none** |

The three dead copies are not a latent omission: none of those three suites
hovers a card trigger at all (their only `page.mouse.move` calls are the ones
*inside* the unused helper). So this is ~33 lines of duplicated dead code,
including three verbatim copies of an 7-line comment that will drift the moment
the dismissal rule changes.

`hoverRailBar`, from the same handoff, was correctly hoisted to module scope so
the mock and served-mode suites share one copy — `dismissCard` wants the same
treatment: one module-scope `dismissCard(page)` beside it, and the three unused
definitions deleted.

Not fixed in review: deleting code is a refactor, not a typo, and the
inline-fix boundary keeps refactors with the author.
