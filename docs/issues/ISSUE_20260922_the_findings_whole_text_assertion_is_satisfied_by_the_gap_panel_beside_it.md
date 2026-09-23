---
type: bug
priority: med
status: open
area: viewer/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_viewer_summary_balance_sheet.md
---

# The findings table's "nothing is lost" assertion is satisfied by the gap panel beside it, not by the row

`apps/viewer/tests.js`, `[real] every finding a study raises is one row, and
the count is the row count` (added by `viewer_summary_balance_sheet`,
2026-09-22) ends with:

```js
VA.studyFindings(study, index).forEach(function (finding) {
  ok(root.textContent.indexOf(finding.whole) !== -1,
     study.id + " drops the words of: " + finding.name);
});
```

with the comment *"Nothing a finding carries is only in the fold's summary:
the whole authored text is on the row, hover and all."*

That is not what it measures. `root` is the whole summary pane, and
`VA.renderTopoTotals` appends `gapsPanel(topoProj)` to it — the assembly-wide
"What's missing" list, which renders every `excluded_from_model` gap's text
**whole**. A findings row, by construction, never contains `finding.whole` as
one text run when the author wrote a ` -- ` split: the name is a `<summary>`
and the rationale a sibling `<p>`, so `textContent` concatenates them without
the separator. The assertion therefore passes only because a *different*
block on the same page prints the string — and it is silent in exactly the
case it was written for.

## Measured (2026-09-22, review of the handoff)

In the review worktree, `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`:

| mutation | this test |
|---|---|
| `findingRow`'s rationale `<p>` replaced with the literal `"MUTANT"` | **still green** (2 other tests red) |
| the same, **plus** `gapsPanel` removed from `renderTopoTotals` | **red** |

The second row is the proof: the string the assertion finds comes from the
gap panel.

## Fix

Scope the assertion to the row it is about — collect the row's own
`textContent` plus its `summary`'s `title` attribute (which really does carry
`finding.whole`) and assert against that pair, then re-run the first mutation
above and confirm it reddens. The row-count half of the same test
(`eq(all(root, "tr.tvfind__row").length, expected)`) is sound and needs no
change.

## 2026-09-22 triage sweep — left `open` deliberately; do not re-route

This is an instance of the meta-class recorded in
`dispatch/docs/sessions/lessons/LESSONS_20260922_triage_backlog_is_one_class.md`:
a guard whose truth is asserted by substring over a whole pane rather than
paired to the row it is about. That class is **already owned** by
`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`,
whose open decision is *detector vs. a third written convention vs. accept the
rate*. Point-fixing the ~160 workspace-wide instances now would pre-decide that
question by brute force, which is the anti-pattern the brief exists to end.

So this issue is **deferred to that brief's strategy decision**, not missed. It
carries no `strategy:` back-link on purpose — dispatch's close-out refuses to
advance an issue that has one, and this issue should stay visible to the sweep
that runs after the brief is decided. The next triage pass should read this
section and move on rather than filing a handoff for it.
