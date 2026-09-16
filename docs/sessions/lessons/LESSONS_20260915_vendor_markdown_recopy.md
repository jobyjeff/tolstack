# LESSONS 2026-09-15 — vendor_markdown_recopy

## What happened

Re-copied `apps/viewer/vendor/markdown.js` from forge's
`apps/notes/vendor/markdown.js` (main checkout, `C:\workspace\forge\`), now
that forge's `markdown_vendor_self_contained` moved `summaryLine` out of the
renderer and into `note.js`. Grepped `apps/`, `scripts/`, `tests/`, and the
viewer's own JS suite for `summaryLine` first — the only hit was the vendor
file's own definition, so dropping it is safe. `apps/viewer/views/worksheet.js`
only calls `VA.renderMarkdown`.

## Divergence list (this repo's local changes, carried forward)

Two, both intentional and unchanged from before this re-copy:

1. **The header vendoring note** (top-of-file comment naming forge as the
   source, the `NotesApp -> ViewerApp` namespace swap, and "re-copy rather
   than diverge"). Not present in forge's copy — it's tolstack's own note
   about the vendoring, so it stays.
2. **The IIFE's namespace**: `window.NotesApp` (forge) vs. `window.ViewerApp`
   (tolstack) on the file's last line.

Everything else is now byte-for-byte forge's file — including forge's
`buildList` rewrite (the `floor` parameter, fixing nested-list indent
resolution to use the minimum indent in a run rather than the first item's)
and the removal of `NA.summaryLine`. Neither of those is a tolstack
divergence; both arrived from forge as part of this re-copy. Confirmed via
`diff` with CRLF normalized (forge's checkout uses CRLF; tolstack's uses LF
per this repo's `core.autocrlf=true` and its pre-existing committed blob,
unrelated to this change) — the only lines that differ are the two named
above.

## Gotcha: the `\uE000` sentinel

`CODE_MARK` is the literal 6-character JS escape sequence `"\uE000"` in both
files' source text, not a raw PUA codepoint. Typing `\uE000` into a tool call
gets JSON-unescaped into the actual raw Unicode character before it reaches
the file — silently swapping the sentinel's on-disk representation. Caught it
by piping the line through `cat -A` and comparing UTF-8 byte sequences against
forge's source; fixed by writing a literal backslash (`\\uE000` at the JSON
layer) so the file keeps the escape-sequence text forge uses. Anyone re-doing
this copy by hand (not a plain file copy) should diff byte-for-byte, not just
visually — this file has exactly one line where "looks the same" and "is the
same bytes" can diverge.

## Recommendation for next time

No pinning test exists that would catch this file drifting from forge's
source again — the previous drift (this handoff's whole reason for existing)
sat undetected until a triage sweep noticed the missing-helper symptom.
Worth a lightweight guard: a test that reads both files' bytes (repo-relative
`apps/viewer/vendor/markdown.js` here, and forge's checkout path — gated the
way `docs/spec_library/README.md`-style cross-repo checks already are, or
simply skipped if forge's checkout isn't present) and asserts they match
modulo the two named divergences above. Not building it in this handoff —
it's a chore-shaped follow-up, not scoped here.

## Pre-existing, unrelated test failure

`pytest -q` shows one failure not caused by this change:
`tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`,
tripped by a "byte-for-byte" claim in
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`
that names no verification. Confirmed pre-existing on `integration` (commit
`df21a4a`) and already tracked —
`docs/issues/ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`
(itself noting a second duplicate issue). Did not file a third copy. Full run:
887 passed, 1 failed (the above), 1 skipped. The JS tier
(`apps/viewer/run_tests.cjs`) is fully green: 302/302 passed, 1 skipped
(node-fs tier, no local projection — expected in a worktree).
