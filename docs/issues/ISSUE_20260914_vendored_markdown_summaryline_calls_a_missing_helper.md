---
type: bug
priority: low
status: resolved
area: apps/viewer/vendor
reporter: agent
handoff: forge/docs/sessions/HANDOFF_20260914_markdown_vendor_self_contained.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `markdown_vendor_self_contained` moved to completed/; not independently verified.
---

# Vendored markdown.js ships a summaryLine() that throws if anything calls it

Filed by the triage sweep of 2026-09-14 as the tolstack counterpart of
`atp-post/docs/issues/ISSUE_20260914_vendored_markdown_summaryline_calls_a_missing_helper.md`.
atp-post found the defect in its own copy; this sweep confirmed tolstack's copy
carries it too, so the fix is routed upstream rather than three times over.

`apps/viewer/vendor/markdown.js:232` ends with:

```js
NA.summaryLine = function (text) {
  var line = NA.firstLine(text);
```

`NA.firstLine` is **not defined in this file**. Upstream in forge it lives at
`apps/notes/note.js:175`, a sibling module that is not part of what gets
vendored — so the vendored file works in forge (where `note.js` is loaded
alongside it) and is a landmine everywhere it is copied alone.

Measured 2026-09-14, all three copies affected:

| repo | path | `summaryLine` at |
|---|---|---|
| forge (upstream) | `apps/notes/vendor/markdown.js` | line 230 |
| tolstack | `apps/viewer/vendor/markdown.js` | line 232 |
| atp-post | `apps/dashboard/vendor/markdown.js` | line 282 |

## Why this is latent, not broken

Nothing in tolstack calls `summaryLine` today. The first caller that reaches for
a one-line summary of a markdown blob gets
`TypeError: NA.firstLine is not a function`.

## Disposition

Routed to `forge/docs/sessions/HANDOFF_20260914_markdown_vendor_self_contained.md`,
which fixes the vendoring boundary in forge (the file's own header says "if it is
ever fixed upstream, re-copy rather than diverge") and adds a check that the
vendored file has no unresolved `NA.*` references. That handoff is also
responsible for filing the re-copy follow-up against this repo.

**When re-copying, re-copy rather than hand-patch — and preserve any marked
divergences this repo's copy carries.** atp-post's copy has three deliberate ones
(namespace, relative-URL `safeUrl`, intraword underscores); check this copy's
header for its own before overwriting, because a blind overwrite would silently
revert them.
