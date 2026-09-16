---
type: review
handoff: docs/sessions/completed/HANDOFF_20260915_vendor_markdown_recopy.md
reviewer: agent
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — vendor_markdown_recopy

## Scope

Single-file chore: replace `apps/viewer/vendor/markdown.js` with forge's
`apps/notes/vendor/markdown.js` (main checkout), carrying forward tolstack's
local divergences and confirming the dropped `NA.summaryLine` export has no
callers. Not a tolerance-stack review — the tolstack-specific mandatory
checks (source_ref/signs/LMC-MMC/RSS) don't apply to this deliverable.

## What I verified

- **Byte comparison against forge's source.** Pulled
  `C:\workspace\forge\apps\notes\vendor\markdown.js` and diffed it
  (CRLF-normalized) against the handoff's copy. The only differences are the
  two named in the lesson: tolstack's top-of-file vendoring-note comment
  (7 lines, absent upstream) and the IIFE namespace on the last line
  (`ViewerApp` vs `NotesApp`). Everything else — including forge's
  `buildList` rewrite and the removal of `summaryLine` — is byte-identical.
  Lesson's divergence list is accurate.
- **`CODE_MARK` sentinel.** Both files carry the literal 6-character source
  text `\uE000` (verified with `od -c`, not by eye) — the lesson's own
  gotcha did not regress into the shipped file. (I *did* reproduce this exact
  gotcha myself, in the review overlay edit — see "Notes" below.)
- **`NA.summaryLine` has no callers.** Grepped the whole repo (`apps/`,
  `scripts/`, `tests/`, docs) for `summaryLine`; the only pre-merge hit
  outside docs/issues was the vendor file's own definition. `worksheet.js`
  calls only `VA.renderMarkdown`. Safe to drop.
- **No pinning test exists for this file's exact contents** (confirmed: no
  test references `renderMarkdown`, `firstLine`, or `markdown.js` beyond
  `run_tests.cjs` loading it as a script and `test.html`'s `<script src>`).
  Consistent with the lesson's recommendation to add one as a future chore —
  correctly not built in this handoff (out of scope, chore-shaped).
- **Merged `handoff/vendor_markdown_recopy` into this review branch** — clean
  fast-forward, no conflict.
- **Python suite:** `887 passed, 1 failed, 1 skipped`. The failure
  (`test_every_byte_identity_claim_in_a_live_file_names_its_verification`) is
  pre-existing and unrelated — introduced by `df21a4a` (2026-09-15 triage
  sweep authoring `BRIEF_20260915_origin_posture_and_absent_feature_rule.md`),
  predates this handoff's branch point, and is already tracked by
  `ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`.
  Matches the lesson's count exactly.
- **JS tier:** `node apps/viewer/run_tests.cjs` → 302/302 passed, 1 skipped
  (node-fs `[real]` tier, no local projection — expected in a worktree).
  Matches the lesson's reported numbers.

## Findings

None. No blockers, no should-fix, no nits.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md` was already well-populated. Added one new
**Recurring bugs** entry: typing a `\uXXXX` escape sequence into an Edit/Write
tool call JSON-unescapes it into the raw codepoint, silently changing
on-disk bytes with no visible diff. I hit this myself while writing the
entry's own prose (the `CODE_MARK` example text) — my first attempt at
this edit silently substituted the raw U+E000 character for the literal
`\uE000` text, confirmed via `od -c`, and had to be fixed with a small
Python script rather than a re-typed Edit call. Recorded as a live
demonstration of exactly the footgun the entry describes.

## Merge

Fast-forwarded `review/vendor_markdown_recopy` onto
`handoff/vendor_markdown_recopy` (18697eb) before verification; both test
tiers green modulo the pre-existing unrelated failure above. Proceeding to
merge into `integration` and push.
