---
type: chore
priority: low
status: open
area: apps/annotate
reporter: agent
---

# The command layer's documented verb table has no structural pairing against `commands.register(...)`

Found in review of handoff `annotate_deep_link_and_part_filter`
(2026-09-08); should-fix in
`docs/sessions/reviews/REVIEW_20260908_annotate_deep_link_and_part_filter.md`,
not blocking.

The handoff's own lesson calls out that this vocabulary "is now agent-facing
API — name it carefully," and documents the ten registered verbs
(`open-part`, `show`, `hide`, `isolate`, `camera` (`reset`/`frame`),
`select-face`, `select-topology`, `select-study`, `select-edge`, `goto`) by
hand in three places: `apps/annotate/README.md`'s table,
`docs/sessions/lessons/LESSONS_20260908_annotate_deep_link_and_part_filter.md`'s
table, and the `commands.register(...)` calls themselves in `app.js`. All
three agree today, but nothing pairs them: `CommandLayer.prototype.verbs()`
(`commands.js`) exists and is called exactly once, inside the "unknown
command" error message, never by a test. This is the same shape as
`apps/annotate/binding_state.js`'s vocabulary constants before
`annotate_vocab_pairing_test` closed that gap
(`ISSUE_20260906_annotate_js_vocab_has_no_pairing_test.md`) and the repeated
pattern named in this repo's own review checklist ("Documented vocabularies
drifting from the seeded data") and `CLAUDE.md` ("A field vocabulary is a
module-level constant... this repo's most-repeated defect").

**Fix**: a small `run_tests.cjs` check that parses `apps/annotate/README.md`'s
verb-table column (or, cheaper, just asserts `commands.verbs()` — captured
once at boot via a test hook — equals a literal list matching the README) so
a verb added/renamed in `app.js` with no doc update fails structurally,
mirroring `test_the_sop_spells_the_same_vocabularies_the_code_enforces`'s
shape one repo layer down.
