---
priority: low
depends_on: []
model: sonnet
---

# HANDOFF 2026-09-15 — vendor_markdown_recopy: re-copy vendor/markdown.js from forge now that the upstream boundary is fixed

Source: triage sweep 2026-09-15, dispositioning
`docs/issues/ISSUE_20260915_recopy_vendored_markdown_after_forge_self_contained_fix.md`
(chore, low). Baseline: trunk after the 2026-09-15 batch merge. **Forge's
`markdown_vendor_self_contained` is merged to forge trunk as of this sweep**, so
the upstream file is in its final shape and this is unblocked. Scope:
`apps/viewer/vendor/markdown.js` and whatever test pins that file. Do NOT touch
anything else in `apps/viewer/` — four other handoffs are staged against that
directory this sweep (`annotate_hosted_page_posture`,
`respine_tween_fidelity_round2`, `viewer_value_guard_rows_and_replays`,
`mutation_witness_tier_repair`), and this one is deliberately a single-file job.

## Background (already established, do not re-derive)

`docs/issues/ISSUE_20260914_vendored_markdown_summaryline_calls_a_missing_helper.md`
(resolved) recorded that this repo's `apps/viewer/vendor/markdown.js` has a
`summaryLine()` calling `NA.firstLine`, a helper the file never defines. Forge
fixed the boundary rather than the symptom: forge's
`apps/notes/vendor/markdown.js` no longer defines `summaryLine` at all — it
moved to forge's `note.js`, next to `firstLine`, on the reasoning that a
markdown renderer needn't own note-summary logic.

## Deliverables

1. **Re-copy, do not hand-patch.** Replace `apps/viewer/vendor/markdown.js`
   with forge's `apps/notes/vendor/markdown.js`. Read forge's copy from the
   forge main checkout (`C:\workspace\forge\apps\notes\vendor\markdown.js`) —
   it is a tracked file there, but you are in a tolstack worktree, so the
   absolute path to forge's checkout is how you reach it. Copying rather than
   patching is the point: it stops this repo's copy drifting further from
   upstream.

2. **Do not blind-overwrite.** Diff the current file against forge's first and
   identify any local divergences this repo has introduced. Carry each one
   forward into the freshly-copied file, the same way it exists today, and list
   them in the lesson — including "none", if that is the answer, because
   "we checked and there were none" is the fact the next re-copy wants.

3. **Confirm the removal is safe before landing it.** After the re-copy the
   file will no longer export `summaryLine`. The original issue noted nothing in
   this repo calls `NA.summaryLine` today — verify that yourself (grep the whole
   repo, including `apps/`, `scripts/` and both test tiers) rather than trusting
   the note. If something does call it, stop and report rather than inventing a
   local re-definition: re-introducing the helper here is exactly the drift this
   handoff exists to end.

## Definition of done

- `apps/viewer/vendor/markdown.js` is byte-identical to forge's
  `apps/notes/vendor/markdown.js` except for any divergence you deliberately
  carried forward and named. State the comparison result explicitly (a
  `Get-FileHash` on both, or a diff with no output).
- Nothing in the repo references `NA.summaryLine`; show the grep.
- `venv-win/Scripts/python.exe -m pytest -q` green (baseline 880 passed,
  1 skipped) and the JS tiers green.
- Lesson (`docs/sessions/lessons/LESSONS_20260915_vendor_markdown_recopy.md`):
  the divergence list (or "none"), and whether anything in the repo should pin
  this file against forge's so the next drift is caught rather than noticed —
  a recommendation is enough, do not build it here.
