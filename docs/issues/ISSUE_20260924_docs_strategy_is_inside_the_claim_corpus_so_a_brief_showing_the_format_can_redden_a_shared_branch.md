---
type: chore
priority: low
status: open
area: tests/doc-scans
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260924_claims_registry_guards_read_declarations_not_prose.md
---

# `docs/strategy/` is inside the claim corpus, so a brief that shows the declaration format outside a blockquote reddens the shared branch

`tests/claims_registry.py`'s corpus exempts `docs/sessions/`, `docs/issues/`,
`docs/reference/`, `PROVENANCE.md`, `apps/viewer/vendor/` and `tests/`.
`docs/strategy/` is **not** exempt — and the prose scans this registry replaced
exempted it deliberately, because a brief is an inbox artifact about an
undecided question rather than a document that states this repo's facts
(`HANDOFF_20260917_prose_guards_scope_out_strategy_briefs`). Dropping that
exemption is right in principle: the new reader only reads fences somebody
opened on purpose, so ordinary English in a brief is safe in a way it never was
before.

The residual path is narrow but is the same failure the refactor was adopted to
kill. A malformed or unregistered `` ```claim `` fence anywhere the corpus
reaches raises `ClaimError` out of
`tests/test_claims_registry.py::test_every_declaration_in_the_tree_parses`, and
that reddens every worktree cut from `integration`, not just the author's. The
plausible writer of such a fence is a document *discussing the format* — and
the report this handoff descends from names dispatch's own prompt guards as the
next R3 adopter, so a triage brief proposing that is a realistic near-term
instance.

The escape hatch exists and is structural: a fence opened behind `> ` is a
quotation, not a declaration. It was documented only in
`tests/claims_registry.py`'s own docstring and in the handoff's lesson, i.e.
nowhere a document author reads; `review/claims_registry_guards_read_declarations_not_prose`
added it to the repo's `CLAUDE.md` bullet, which is the cheap half of the fix.

What is left is the scope decision, which is a judgement rather than a patch:
either exempt `docs/strategy/` (costless if a brief should never declare a repo
fact — consistent with the argument that put the old exemption there) or leave
it in and rely on the blockquote rule now that it is written down where authors
look. Deliberately not decided in review.
