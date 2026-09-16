---
type: chore
priority: low
status: resolved
area: apps/viewer/vendor
reporter: agent
found_by: forge/docs/sessions/HANDOFF_20260914_markdown_vendor_self_contained.md
handoff: docs/sessions/HANDOFF_20260915_vendor_markdown_recopy.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `vendor_markdown_recopy` moved to completed/; not independently verified.
---

# Re-copy vendor/markdown.js from forge after markdown_vendor_self_contained

`ISSUE_20260914_vendored_markdown_summaryline_calls_a_missing_helper.md` (this
repo) documented that `apps/viewer/vendor/markdown.js`'s `summaryLine()` calls
`NA.firstLine`, a helper the file never defines. Forge's handoff
`markdown_vendor_self_contained` fixed the upstream boundary: forge's
`apps/notes/vendor/markdown.js` no longer defines `summaryLine` at all (it moved
to forge's `note.js`, next to `firstLine`, since a markdown renderer needn't own
note-summary logic).

Re-copy `apps/viewer/vendor/markdown.js` from forge's
`apps/notes/vendor/markdown.js` — **re-copy, not hand-patch**, so this repo's
own drift (if any) doesn't quietly diverge further. Do not blind-overwrite:
check the current file for any local divergences before replacing it, and
carry them forward into the freshly-copied file the same way they exist today.

After the re-copy, `apps/viewer/vendor/markdown.js` will no longer export
`summaryLine` — confirm nothing in this repo calls `NA.summaryLine` (the
original issue noted nothing does today) before landing the re-copy.
