---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-23 — claims_registry_guards_read_declarations_not_prose: replace every prose-claim scan with a declared, machine-readable registry

Source: the 2026-09-23 strategy session that consumed
`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`
adopted the refactor agenda R1–R8 named in
`C:/workspace/dispatch/docs/reports/REPORT_20260921_bug_pareto.md`, with triage
as standing owner, and directed triage to stage R1, R3, R8 next (best ratio per
the report). This handoff stages **R3** — "tolstack (then cross-repo): a claims
registry, so no guard ever reads prose (kills C2, most of C)" (report, §5,
"R3"). Baseline: tolstack trunk at the 2026-09-23 triage batch merge, `76cb817`.
Scope: `tests/test_tolerance_stack.py`, `tests/test_provenance.py`,
`tests/test_thermal_exception_list.py`, `tests/test_viewer_readme_doc_facts.py`,
`tests/test_mesh_route_doc_facts.py`, and whichever live documents those scans
currently read (see deliverable 4). Do NOT touch `docs/issues/` — a parallel
session may be filing or updating issues there concurrently.

## The class, measured

Report §2's pareto table: pattern **C** ("a structural fact checked by matching
text") is 28 issues across 5 repos, and its sub-family **C2** ("a prose-scanning
guard reddened a shared branch") is 15 issues across 2 repos — `tolstack 14 ·
dispatch 1`, all filed 09-15→09-17. Report §3.3 states patterns A+B+C+C2
together are 218 of 438 classified issues (50%) — "not four problems... one
problem and its three attempted cures," with C2 the failure mode that surfaces
it: a textual guard is either vacuous (B) or matches the wrong prose (C2), and
both are invisible until a shared branch goes red (pattern O).

Report §5 "R3" states this refactor "would have prevented all 15 C2 issues
(three of them red-on-trunk events, 10 of them duplicate filings)." That split
is the strongest part of the case: a prose guard on a shared branch does not
fail once — three of the fifteen are `master`/`integration` going red before
any handoff touched them, and the other ten are the *same* underlying failure
re-filed by every session that met it independently on a branch that could not
see another session's issue. Report §5b: two tolstack guards —
`test_every_byte_identity_claim_in_a_live_file_names_its_verification` and
`test_no_live_document_states_an_unguarded_hardware_entry_count` — scanned
every live `.md` for claim-shaped English, and ordinary prose in a strategy
brief matched both.

R3 would additionally have prevented five named issues (report §5 "R3"),
quoted here so the tactical agent can verify the class against real files
rather than take it on faith:

- `byte_identity_scan_has_no_quotation_exemption` —
  `docs/issues/ISSUE_20260917_byte_identity_scan_has_no_quotation_exemption.md`
  (open). The byte-identity claim scan in `tests/test_provenance.py` has no
  quotation exemption at all — no blockquote, no `"…"` span — so the
  verbatim claim sentence cannot even be *discussed* in a document that scan
  reads.
- `a_qualifier_anywhere_in_a_15kb_block_covers_an_absolute_rule_statement` —
  `docs/issues/ISSUE_20260903_a_qualifier_anywhere_in_a_15kb_block_covers_an_absolute_rule_statement.md`
  (resolved by a point-fix, `HANDOFF_20260906_rule_scan_bullet_block_masking`).
- `the_one_fold_rules_absolute_form_survives_outside_rule_passages` —
  `docs/issues/ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages.md`
  (resolved by a point-fix, `HANDOFF_20260902_doc_coverage_sets_derived`).
- `the_free_form_block_value_exemption_hides_the_values_from_every_scan` —
  `docs/issues/ISSUE_20260916_the_free_form_block_value_exemption_hides_the_values_from_every_scan.md`
  (open) — an exemption meant to skip one thing hides an entire class of
  values from every scan that walks the same corpus.
- `live_documents_walks_gitignored_scratch_in_the_main_checkout` —
  `docs/issues/ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout.md`
  (open) — `live_documents()` (`tests/test_tolerance_stack.py:2276`) is a bare
  `os.walk` that never consults git, so untracked scratch left in the main
  checkout joins every claim-shape scan's corpus.

Every one of the five is the same shape twice over: a prose scanner's own
exemption/scope logic (quotation, qualifier reach, rule-vs-non-rule passage,
free-form block, git-tracked-vs-walked) is *itself* text-shaped and has its own
blind spots. Point-fixing the scope has already been tried twice on this exact
guard family (`HANDOFF_20260902_doc_coverage_sets_derived`,
`HANDOFF_20260906_rule_scan_bullet_block_masking`,
`HANDOFF_20260917_prose_guards_scope_out_strategy_briefs` — this last one
scoped `docs/strategy/BRIEF_*.md` out of the claim-scanned corpus rather than
changing what a claim scan reads) and each pass left a new blind spot, which is
exactly report §3.2 "Cycle 1": `A → C (textual pairing guard) → C2 (false
positive on prose) → fix: scope the scanner → C (the exemptions are now the
blind spots) → B (the guard can no longer fail) → A goes undetected again`.
This handoff is staged to break that cycle at its root rather than add a
fourth exemption.

## What R3 is (report §5 "R3", verbatim)

> Live documents that make a checkable claim declare it in a machine-readable
> block — frontmatter `claims:` or a fenced ```claim``` block naming the
> metric and the source — and the guard reads *only* those. Free prose is
> never scanned. English sentences stop being an API.

## Scope discipline — tolstack only

The report's own section title is "R3 — tolstack (then cross-repo)". This
handoff is scoped to **tolstack only**, for two reasons, both worth stating
explicitly rather than assuming:

1. **Mechanical**: a handoff session runs in a git worktree, and
   `dispatch/hooks/main_checkout_edit_guard.py` blocks a session from writing
   tracked files into another repo's main checkout. A cross-repo limb would be
   unexecutable as written from this worktree.
2. **Sequencing**: report §5 "R3" notes the identical shape applies to
   **dispatch's** prompt guards — `negation_cues_are_clause_scoped`,
   `two_prose_guards_still_match_outside_the_shared_instruction_vs_citation_rule`,
   `bare_worktree_add_detector_is_line_scoped`,
   `trunk_guard_reddens_on_the_sentence_that_forbids_the_command` — and that a
   prompt rule should carry "an explicit machine-readable directive rather
   than detecting instruction-vs-citation from English." tolstack is the
   **first adopter and the pattern-setter** here. Whether dispatch (or any
   other repo) follows is a separate, later decision — this handoff does not
   stage or presuppose it, and does not touch any file outside
   `C:\workspace\tolstack`.

## Deliverables

1. **The declaration format itself, decided and documented.** Pick one of:
   frontmatter `claims:` (a YAML-ish block at the top of the `.md` file, one
   entry per checkable fact, each naming its metric and its source) or a
   fenced ```claim``` block (inline, next to the prose it backs, same
   naming requirement). Record the choice and the **rejected alternative**
   in this handoff's own prose history (i.e., the lesson), per the template's
   guidance on recording small design calls — do not leave the choice
   implicit in the diff. Whichever is picked, the format must be able to
   express every claim shape the current scans already catch: a byte-identity
   assertion (source: a specific tracked file, or a specific historical sha),
   a hardware-entry count (source: `hardware_entries.json` via
   `hardware_entry_counts()`), a traced-ratio figure (source: the SOP's "The
   traced ratio" definition), and the one-fold rule's conditional form (source:
   `tolerance_stack/stack.py`'s `fold()`).
2. **A reader/validator for it.** A single module (or a clearly-named function
   group inside the existing shared-walk location,
   `tests/test_tolerance_stack.py` around `live_documents()` /
   `is_claim_scanned()` / `claim_scanned_documents()`) that parses the chosen
   declaration format out of a document and returns a structured claim: metric
   name, stated value, source. It must refuse a malformed declaration loudly
   (parse error, not silent skip) — a declaration the reader cannot parse is a
   bug in the document, not a reason to fall back to prose.
3. **Migration of tolstack's existing prose-scanning guards to read only
   declarations.** The guards that currently scan free English and must move:
   - `test_every_byte_identity_claim_in_a_live_file_names_its_verification`
     and `test_the_byte_identity_scan_does_not_read_a_triage_brief`
     (`tests/test_provenance.py:770`, `:798`) — currently derive their corpus
     from `git ls-files` filtered by `_SCANNED_SUFFIXES` and a `_HISTORICAL`
     prefix tuple, and scan for byte-identity assertions in prose via
     `claims_in()`.
   - `test_no_live_document_states_an_unguarded_hardware_entry_count` and
     `test_the_hardware_entry_count_guard_can_fail`
     (`tests/test_tolerance_stack.py:2991`, `:3037`) — currently regex-scan
     for count-claim shapes (`hardware_entry_count_claims()`) across
     `claim_scanned_documents()`.
   - the one-fold rule scan (`tests/test_thermal_exception_list.py`,
     `rule_statements()` / `RULE_STATEMENT_FLOOR` at line 543) — currently
     reads prose for a *statement of the rule* and demands it be conditional.
   - the traced-ratio `asserted_stale` scan in `tests/test_tolerance_stack.py`
     that recounts retired ratio figures against the live one.
   Each of these becomes: parse declarations only (deliverable 2), assert the
   declared value against its named source (deliverable 5), and stop walking
   prose for a claim shape at all. `tests/test_viewer_readme_doc_facts.py`'s
   witness-count and per-study-claim scans, and
   `tests/test_mesh_route_doc_facts.py`'s route-claim scans, are the same
   shape (a document asserting a checkable number or a checkable route in
   prose) — migrate them too; they are in scope even though the report's named
   issue list doesn't enumerate them by name.
4. **Migration of the live documents that currently make scanned claims.**
   Every document the scans above actually read today needs its claim
   converted from prose to a declaration: this includes (at minimum) whichever
   worksheet/README carries the hardware-entry count sentence, whichever
   document carries a byte-identity assertion, `ARCHITECTURE.md`'s one-fold
   rule statement, and any document restating a traced-ratio figure. Find the
   real current set by running the existing scans and reading what they flag
   before converting — do not guess the set from this handoff's prose.
5. **A guard that a declared claim's value is actually checked against its
   named source, so the registry cannot become decorative.** This is the
   deliverable that keeps deliverable 1 from being empty ceremony: a
   declaration naming a source but never compared to it is exactly as
   unverified as prose was. The check must re-derive or re-read the named
   source (the hardware-entries file, the sha of a named historical file, the
   SOP's traced-ratio definition, `fold()`'s conditional shape) and fail when
   the declared value and the source disagree — mirroring forge's
   `tests/test_review_sort_key_coercion.py` AST-walk precedent (report §3.1,
   §4.1: zero recurrences since 2026-08-26 because the check walks structure,
   not text).

## The guard is the point

Report §4 puts pattern C/C2's primary disposition as **refactor**: "stop
scanning prose; scan structure." The strategy decision that staged this batch
retired the point-fix arm on this exact class — six handoffs in nine days
(`HANDOFF_20260902_doc_coverage_sets_derived`,
`HANDOFF_20260906_rule_scan_bullet_block_masking`,
`HANDOFF_20260917_prose_guards_scope_out_strategy_briefs`, and the issues each
one spawned) with the arrival rate on this shape unchanged. Rung 1 of the
decided ladder is "make the shape inexpressible": a migration that converts
some documents to declarations but leaves any guard still reading free prose
for a claim has not killed the class — it has added a fifth exemption to a
family that has already rotated through four. Every guard named in deliverable
3 must end this handoff reading **only** declared claims, with no residual
prose fallback.

## The definability rule (acceptance bar)

From `dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`,
the brief this handoff's strategy session consumed — quoted because it is the
bar every deliverable above must clear:

> a pairing counts only if its coverage is derived from (or asserted equal to)
> the artifact's span, its predicate reads structure not substrings, and a
> mutation of the guarded value reddens it; a document asserting its own
> pairing counts as nothing.

Concretely: a document's `claims:` block is not self-certifying. The reader
(deliverable 2) must derive its notion of "which documents should carry a
declaration" from the same walk the old scans used (or a stricter, git-aware
replacement — see the `live_documents_walks_gitignored_scratch_in_the_main_checkout`
issue above, which is fair game to fix here since the new reader has to define
this walk correctly from the start rather than inherit the old bug), and the
value-vs-source check (deliverable 5) must be a mutation-witnessed guard: change
a declared value so it disagrees with its source, and the check must go red.

## Do NOT

- Do not weaken or delete a guard to make the suite green. The point of this
  handoff is moving **what each guard reads** (declarations instead of prose),
  not narrowing **what it checks**. A guard that stops catching a real stale
  value because its declaration-reading replacement is looser than the old
  regex is a regression, not a migration.
- Do not touch another repo's tracked files. `dispatch/hooks/main_checkout_edit_guard.py`
  blocks exactly this from a worktree; the R3 pattern for dispatch's own
  prompt guards is named above as future, separate work — not this session's.
- Do not touch `docs/issues/` — filing/updating issues there may be happening
  concurrently in another session on this repo.
- Do not migrate documents this handoff cannot verify are the real current
  claim sites (deliverable 4) by guessing from this handoff's prose; run the
  existing scans first and convert what they actually flag.

## Definition of done

- Every guard named in deliverable 3 reads only declared claims — verified by
  demonstrating that a claim written as free prose (no declaration) in a live
  document is **not** flagged by any migrated guard, and a declared claim with
  a value that disagrees with its named source **is** flagged (the
  mutation-witness proof required by the definability rule).
- The five named issues above are each either fixed as a side effect of the
  new shape (verify against the real file/behaviour each names, don't take the
  report's summary on faith) or explicitly carried forward with a one-line
  reason if the new shape doesn't reach them.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green in
  the main checkout (per tolstack's `CLAUDE.md`: a worktree's `pytest -q` is
  expected red on `tests/test_viewer_js_suite.py` by design — that is not this
  handoff's concern unless this migration touches viewer doc-facts guards, in
  which case verify in the main checkout). Also run, in the main checkout,
  `node scripts/run_mutation_witness_tests.mjs` — deliverable 5's guard needs a
  mutation spec enrolled under `scripts/mutation_witnesses/` per tolstack's
  standing rule ("a guard you add is enrolled in the same change").
- `ARCHITECTURE.md`'s module inventory and `PROVENANCE.md`'s import rows are
  updated for any new/moved module, per the repo's own pairing tests.
- Lesson (`docs/sessions/lessons/LESSONS_20260923_claims_registry_guards_read_declarations_not_prose.md`):
  the declaration format chosen and the rejected alternative with why; the
  full list of documents actually migrated (deliverable 4) versus the ones
  named speculatively in this handoff; which of the five named issues were
  closed as a side effect versus carried forward and why; and an explicit
  statement of whether any guard in scope still reads free prose at the end of
  the session (it should not — if one does, say which and why, so the next
  session doesn't have to rediscover it).
