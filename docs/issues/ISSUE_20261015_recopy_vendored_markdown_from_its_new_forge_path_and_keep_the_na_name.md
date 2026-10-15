---
type: chore
priority: low
status: open
area: apps/viewer/vendor
reporter: agent
class: unpaired_hand_copy
found_by: forge/docs/sessions/HANDOFF_20261015_markdown_upstream_move_reaches_downstream_copies.md
---

# Vendored markdown.js names a forge path and a global that no longer exist

forge moved its renderer on 2026-09-22: `apps/notes/vendor/markdown.js` (gone) is now
**`apps/shared/markdown.js`**, and its IIFE binds **`window.ForgeMarkdown.render`**
instead of attaching `renderMarkdown` to `window.NotesApp`. Nothing here is broken
today; the failure arrives with the next re-copy.

## The failure a naive re-copy produces

The new file assigns `window.ForgeMarkdown.render` and never defines
`NA.renderMarkdown`. The viewer's views still call `NA.renderMarkdown(...)`, so the
first render throws `NA.renderMarkdown is not a function`.

## The adaptation

Keep this repo's own namespace by re-exporting after the new file loads, as forge
does:

```js
NA.renderMarkdown = window.ForgeMarkdown.render;
```

## Also fix in passing

- `apps/viewer/vendor/markdown.js` line 1: `// VENDORED from forge apps/notes/vendor/markdown.js (local-v1, 2026-07-16)` — name `apps/shared/markdown.js`.
- Line ~38 (`behind NA.renderMarkdown`) and line ~302 (`NA.renderMarkdown = function (src)`) — both describe the old global.
- This copy carries **local-v2** (2026-09-18, paragraph ends at a blank line). Re-apply it on top of the re-copy, or check whether upstream has taken it; see `ISSUE_20260918_forges_notes_app_carries_the_same_markdown_paragraph_defect_this_copy_just_fixed.md` (deferred, `class:unpaired_hand_copy`), which also names the old path.
- The resolved `ISSUE_20260915_recopy_vendored_markdown_after_forge_self_contained_fix.md` names the old path too; it is terminal history, leave it.

forge's `apps/shared/markdown.js` header now lists this file as a verbatim copy.
