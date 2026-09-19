---
type: bug
priority: med
status: open
area: apps/viewer/vendor
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
---

# forge's notes app has the markdown paragraph defect this repo just fixed, and this copy now diverges from it

`apps/viewer/vendor/markdown.js` is vendored from
`forge/apps/notes/vendor/markdown.js` (local-v1, 2026-07-16). Before this
handoff the two were **byte-identical apart from the header note and the
namespace on the last line** — checked with `diff`, 2026-09-18.

## What changed here

local-v2 (2026-09-18, handoff `reader_facing_surfaces_second_pass`
deliverable 2): a paragraph ends at a **blank line**, not at a newline, and a
hard-wrapped list item is one item. local-v1 emitted one `<p>` per source
LINE, so a file hard-wrapped at ~80 columns rendered as a column of fragments
with a full paragraph margin between each, and an emphasis span straddling a
wrap was never parsed — the asterisks printed on screen. Measured on
`WORKSHEET_hub_bearing_thermal_fit.md`: **324 paragraphs and 38 stray `**`
runs before, 74 paragraphs and 0 after.**

## Why this is an issue rather than a note

The vendored header said, from founding: *"If it is ever fixed upstream,
re-copy rather than diverge."* This handoff diverged deliberately and rewrote
that note — but the instruction it replaced was pointing at a real risk, and
the risk is now live in both directions:

* **forge has the same bug.** Its notes app renders capture notes, which are
  shorter and less consistently wrapped, so it is less visible there — not
  absent. Any note whose author hard-wraps gets the same column of fragments,
  and any `**bold**` spanning a wrap prints its asterisks.
* **a future re-copy silently reverts this fix.** The header now says so in as
  many words, but a header is not a guard. The tests added here
  (`apps/viewer/tests.js`, the five `renderMarkdown` cases plus the `[real]`
  paragraph-bound check on the live worksheet) would catch a blind re-copy in
  this repo. Nothing catches it in forge.

## What a strategy agent has to decide

This is a **cross-repo** call and that is why it carries `audience: strategy`
rather than being fixed here: a tactical agent in a tolstack worktree cannot
edit `forge/`, and the two repos' vendoring relationship is a workspace-level
arrangement, not a tolstack one.

The options, as this session saw them:

1. **Port local-v2 upstream** and re-sync, so the two copies agree again and
   the original "re-copy, don't diverge" instruction is true once more. The
   diff is small: one `startsBlock()` helper, one `continuesItem()` helper, a
   paragraph gatherer, and a lazy-continuation arm in the list gatherer.
   forge's notes app would want its own tests, which it does not have today
   either — this repo had none for the renderer before 2026-09-18, which is
   exactly how the defect survived.
2. **Accept the divergence permanently** and say so in both headers, treating
   tolstack's copy as a fork. Cheapest now, and it makes every future upstream
   fix a manual merge.
3. **Neither, and let it rot.** Named only so it is visibly the option nobody
   chose.

## Where the pieces are

* `apps/viewer/vendor/markdown.js` — this repo's local-v2, with the divergence
  recorded in its header
* `C:\workspace\forge\apps\notes\vendor\markdown.js` — upstream local-v1
* `apps/viewer/tests.js` — the five fixture cases and the `[real]` bound
* `tests/debug_reader_facing_second_pass.mjs` — re-takes the before/after
  paragraph counts (`--phase before|after`)
