---
type: review
handoff: docs/sessions/active/HANDOFF_20260923_claims_registry_guards_read_declarations_not_prose.md
reviewer: agent (review/claims_registry_guards_read_declarations_not_prose)
date: 2026-09-24
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-24 — claims_registry_guards_read_declarations_not_prose

R3 landed as asked. Every guard named in deliverable 3 reads declared claims and
none of them reads free English any more; the registry is not ceremony, because
all 33 declarations are re-derived from their named sources on every run; and the
one guard the change adds is enrolled in the same commit and both of its declared
mutations are WITNESSED. The four findings below are documentation that the
migration left behind, all fixed inline; nothing about what the code decides was
changed in review.

## What I verified, and how

**Merge.** `git merge handoff/claims_registry_guards_read_declarations_not_prose`
into `review/…` fast-forwarded with no conflict; four commits, `+2473/-1836`
across 32 files.

**The claim that matters — no guard in scope still reads prose.** Read the whole
diff of the five named modules and then grepped the surviving code for
document-text scanning. What is left reading a document's words is three
pre-existing guards outside deliverable 3 and each is a *presence* check rather
than a claim-shape scan: `test_hardware_entry_values_source_counts_match_the_description`
(builds phrases from recounted numbers and requires them in one file's own
`description`), the enumerated-state surface guard, and
`test_the_rule_section_points_at_the_list_that_enforces_it`. The claim-shape
scanners — `claims_in`, `_CLAIM_RE`, `_POINTER_RE`, `_DEFINITION_RE`,
`hardware_entry_count_claims`, `_COUNT_CLAIMS`, `retired_traced_ratio_claims`,
`_RETIRED_TRACED_RATIOS`, `rule_statements`, `passages_in`, `_quoted_spans`,
`_prose_blocks`, `is_claim_scanned`, `claim_scanned_documents` — are all gone,
along with all four exemptions they had accumulated. The AST walker that pairs
`DECLARED_COMBINING_EXCEPTIONS` against `thermal.py` survives untouched, which is
the part that should have.

**The registry, re-derived rather than read.**
`PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m tests.claims_registry`
reports **33 declarations across 21 documents, every one `agrees`** — 11
`traced_ratio`, 9 `hardware_entry_count`, 6 `one_fold_rule`, 4 `byte_identity`,
2 `mesh_routes`, 1 `smallest_chain`. Corpus: `git-tracked`, **274** files, the
same number in the tactical worktree and in this one.

**The mutation witness, run rather than trusted.**
`node scripts/run_mutation_witness_tests.mjs --only every-declared-claim` in this
worktree (armed with junctions to the main checkout's `venv-win` and
`node_modules`): **2/2 declared mutations witnessed**, both reddening
`test_every_declared_claim_agrees_with_its_source`. Worth saying that the second
one — the fenced `` ```claim `` anchor with `\n` newlines against a CRLF working
tree — resolves and patches correctly; that was the failure mode the lesson warns
about elsewhere and it does not bite here.

**The definability bar, checked in both directions.** A prose sentence stating a
fact is not read (`PROSE_NO_GUARD_READS` replays five real sentences, from both
the false-positive and the genuinely-stale side); a declared value its source
refutes is caught (`WRONG_ON_PURPOSE`, four metrics, each corrected *from the
source* rather than from a literal); a corpus pointed at an empty tree reddens
rather than passing; a subdirectory of a checkout walks rather than believing
`git ls-files`' answer about the enclosing repo. That last one is the sharpest
thing in the change: `git -C <shadow> ls-files` succeeds, answers about the
enclosing repo, and returns nothing, which would have been every declaration
guard green with nothing read. It is pinned.

**The five named issues.** Checked against the files rather than against the
report. `byte_identity_scan_has_no_quotation_exemption` is genuinely dead (no
scan to exempt from) — marked `status: resolved` with the reason, since the
resolution is neither of the two arms the issue was weighing. `a_qualifier_…`
and `the_one_fold_rules_absolute_form_…` are inexpressible now, not merely
caught, and `test_a_declaration_cannot_state_the_rules_absolute_form` pins that.
`the_free_form_block_value_exemption_…` is correctly carried forward and the
lesson is right that the report's summary of it is wrong — it is a DOM walk in
`apps/viewer/tests.js` (`VERBATIM_PROSE_CLASSES`, confirmed present), not a
document scan. `live_documents_walks_gitignored_scratch_…` is correctly reported
as *partially* resolved; I left it open and appended a dated note recording which
half is done, so nobody closes it as a side effect.

**Tests.** Pre-merge risky subset (the five migrated modules plus
`test_claims_registry.py`, `test_architecture_inventory.py`,
`test_sop_vocabulary.py`, `test_topology.py`): **378 passed**. Post-merge full
suite in this worktree: **1243 passed, 1 failed** — the failure is
`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, red by design in
any worktree because `data/projections/` is gitignored into the main checkout
(repo `CLAUDE.md`). After my inline fixes, the subset was re-run twice and is
green at 254 and then 250 passed (the second run dropped the two doc-facts
modules, which the last edits do not touch).

**The full-suite benefit of the doubt is void here and I ran the suite instead of
relying on a record.** There is no tactical completion report in
`docs/sessions/` or `.dispatch/` — the lesson records "216 passed" for four guard
modules with a sentence appended to `ARCHITECTURE.md`, which is a
deliberately-narrow experiment and not a full-suite run. Nothing about the work
suggests the suite was not run; the record simply is not there to read.

**What this run did NOT exercise**, named rather than counted as green: the
viewer `[real]` tier and the browser TRUTH tier (`node apps/viewer/run_tests.cjs`,
`node scripts/run_viewer_browser_tests.mjs`), and the mutation-witness tier as a
whole beyond the one spec above. The diff touches no JS and no rendered surface,
so the first two are low risk here; the third's two standing non-zero classes
(an orphaned spec, an unenrolled guard) are covered from the Python side by
`tests/test_mutation_witnesses.py`, which is green — `test_every_expect_red_names_a_guard_the_enumeration_found`
and `test_every_anchor_resolves_to_exactly_one_place` are what would have caught
this diff's many deleted tests leaving a spec orphaned, and they pass. The
operator's batch merge is still the place the whole tier runs.

**No data pollution.** `C:\workspace\tolstack\data\` has no file touched in the
window of these runs, and the main checkout's tree is clean.

## Findings — all four fixed inline, none a blocker

All four are the same class, and it is a new one for this repo's checklist
(appended to the overlay): **a retired guard left live documents still promising
it.** The migration correctly rewrote the documents that made *claims*; what it
missed were the documents that *described the guards* — which read as coverage
and are none. This is the exact shape `docs/tolerance_stacks/README.md`'s own
paragraph is about ("the stale sentence was the one carrying the warning not to
quote counts from here").

1. **should-fix — `docs/SOP_TOLERANCE_STACK.md`, the traced-ratio section, two
   sentences.** "`tests/test_tolerance_stack.py` pins both, so a doc quoting a
   stale number fails the suite rather than merely being wrong" and "A bare
   `3 of 26` in a live sentence fails the same test, which is why this one and
   the figure below it are quoted." Both are false as of this branch: nothing
   reads prose. The second is worse than merely stale, because it hands an
   author a convention and an untrue reason to follow it. Rewritten to say what
   is checked (the declaration, recounted) and what is not (any figure in a
   sentence), and to keep the quoting convention as house style with its
   enforcement date of death stated. Also noted there, because a reader of that
   paragraph will now ask: the seven-stack `30 of 61` has never been read by any
   test, before or after — that is pre-existing, not a regression.
2. **should-fix — `docs/tolerance_stacks/README.md:150`.** Told the reader
   `test_no_live_document_states_an_unguarded_hardware_entry_count` "fails the
   suite if any live document — this one included — grows its own copy of it
   again". Rewritten to point at the `claims` array and to say plainly that the
   no-count-here choice is now a convention rather than a guarded one.
   `PROVENANCE.md`'s row for this imported file is amended for the edit, per the
   repo's own insert-only guard, which caught me for exactly this.
3. **nit — `ARCHITECTURE.md:696` and `tests/test_architecture_inventory.py`'s
   module docstring** each cite a retired test by name
   (`test_every_document_quoting_the_traced_ratio_quotes_the_current_number`,
   `test_no_live_document_states_an_unguarded_hardware_entry_count`), and the
   docstring's "the same rule the hardware-count guard uses" now describes a
   rule only it carries. Re-pointed at the surviving guards. The overlay already
   records an earlier instance of this file's docstring naming a test that did
   not exist; this is the second sighting, which is why the new entry names the
   grep rather than the file.
4. **nit — two comments inside the change itself.**
   `tests/claims_registry.py::declarations_in_text`'s docstring said a blockquoted
   fence "parses as the same claim", which is the opposite of the module's one
   quotation rule, of `_FENCE_OPEN`, and of
   `test_a_blockquoted_declaration_is_a_quotation_not_a_claim` — verified by
   running the parser. And `_CLAIM_CORPUS_FLOOR`'s comment records the corpus at
   273 where it is 274; the missing file is this handoff's own mutation spec, a
   tracked `.json` under `scripts/`, which measured before enrolment. Both
   corrected. A third: `_RATIO_PUBLISHER_NAMES`' argument still described
   `asserted_stale` in the present tense as "the other half of the guard".

**Also fixed inline, not a finding against the work:** the repo's `CLAUDE.md`
bullet now states the blockquote rule. It is the one thing an author must know to
write *about* the format, and it lived only in the test module's docstring and in
the lesson. And `docs/DAG_TOPOLOGY.md`'s declaration sat between a sentence
ending in a colon and the table that colon introduces — the same placement defect
the author had already fixed once on this branch for `data/inbox/specs/README.md`
(`df8c158`); moved below the table.

**Lesson arithmetic, corrected by blockquote.** "Migrated (22 documents, 32
declarations)" against a real 21 and 33; the lesson's own itemised list is right
and the summary line was not (`ARCHITECTURE.md` is in three of the groups). Its
other measured claims hold: I recounted the byte-identity prose sites at trunk
with the retired regex and got exactly the **51** it reports, and the four
genuine file-level claims it kept are the right four.

## Issues filed

- `ISSUE_20260924_test_sop_vocabulary_is_the_last_guard_that_still_scans_prose_for_a_claim.md`
  (`chore`/`med`) — the lesson's own deferred item, which had no issue because
  the handoff fenced `docs/issues/` out of that session. It is the last
  prose-claim scanner and holds a third copy of the corpus scope logic the
  registry now owns.
- `ISSUE_20260924_a_new_claims_registry_metric_can_arrive_with_no_source_pairing_and_no_negative_control.md`
  (`bug`/`med`) — `test_every_metric_names_a_source_that_exists` passes
  vacuously for the three metrics with `source_paths=()`, and `WRONG_ON_PURPOSE`
  is hand-kept, so a seventh metric can arrive with neither a source pairing nor
  a mutation. The registry's own arrival rate, one level up from the documents it
  guards.
- `ISSUE_20260924_docs_strategy_is_inside_the_claim_corpus_so_a_brief_showing_the_format_can_redden_a_shared_branch.md`
  (`chore`/`low`) — the narrow residual of the old C2 exposure: a brief that
  shows the format outside a blockquote raises `ClaimError` for every worktree.
  The escape hatch is now documented; the scope decision (exempt
  `docs/strategy/`, or rely on the rule) is left open deliberately.
- `ISSUE_20260924_the_viewer_readmes_witness_count_prohibition_was_dropped_with_no_replacement.md`
  (`chore`/`low`, `audience: strategy`) — the one coverage loss with no
  replacement, so it has an owner rather than only a paragraph. The interesting
  question behind it is whether a *prohibition* is expressible as a declaration
  at all.

## For the next reviewer

Two things this change makes true that are worth carrying forward. First, a
wrong number in a *sentence* now reddens nothing, anywhere — so "the suite is
green" has stopped being evidence about any figure a document states in prose,
and when work claims a document is covered, ask which of source → declaration →
sentence is actually checked (only `traced_ratio` is `rendered`, i.e. has all
three). Second, this repo now **deletes** guards as a designed outcome, which
inverts the usual review question: the checklist has always asked what a new
guard can fail on, and the new entry asks what a *removed* guard's documentation
still promises.

## Verdict

**APPROVE.** Merged to `integration`. Deliverables 1–5 are all present and
verified by re-derivation rather than by reading the report; the coverage losses
the change accepts are stated in the code, in the lesson and now in four issues,
which is the honest half of R3 and the reason it is worth having.
