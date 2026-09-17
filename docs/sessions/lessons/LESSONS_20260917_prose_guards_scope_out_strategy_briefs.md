# LESSONS 2026-09-17 — prose_guards_scope_out_strategy_briefs

Handoff: `docs/sessions/HANDOFF_20260917_prose_guards_scope_out_strategy_briefs.md`.
Baseline: trunk `efa5c4c`, 1199 passed / 1 skipped. Result: **1203 passed /
1 skipped** (four witnesses added, nothing removed, no existing assertion or
number changed except one floor, argued below).

## The decision, in my own words

A claim-shape scan asks a document *"you stated one of this repo's numbers — is
it still the number?"* That question only makes sense of a document that is
**trying** to state this repo's facts. A `docs/strategy/BRIEF_*.md` is not: it is
an inbox artifact about an undecided question, written by a triage sweep and read
once by a strategy session. It argues, it quotes beliefs it is questioning, and
it writes ordinary English — and ordinary English matches claim shapes, because
the shapes are phrasings like `other\s+(N)\s+do\s+not` and "byte-for-byte", not
structured assertions.

So the scans stop reading the briefs. `claim_scanned_documents()` is
`live_documents()` minus `docs/strategy/BRIEF_*.md`, and `live_documents()` is
untouched — a brief still *is* a live file, which is what the coverage guard and
the enumerated-state surface lookup need it to be.

The repo already held this principle; it had just been applied one place only.
The comment above `assert_coverage_set` argues for a floor rather than an exact
count because an exact count means "the next `docs/strategy/` brief would redden
a suite it has nothing to do with." That is this bug, named by its author, and
fixed for the coverage assertion alone.

## The rejected alternative, and why

**Tighten each claim shape to require its subject** — make the shape
`other\s+(N)\s+do\s+not\s+defer` rather than `other\s+(N)\s+do\s+not`.

Rejected on two grounds, and the second is the one that decided it:

1. **The shape set is open-ended and grows.** Nine shapes today, and the guard's
   own docstring says "a shape not listed in `_COUNT_CLAIMS` is not caught". Every
   shape a future handoff adds re-opens exactly this exposure, so tightening is a
   fix that has to be re-applied forever and will be forgotten once.
2. **It trades a false-positive class for a false-negative one.** A loose shape
   costs a red test naming a line — loud, annoying, survivable. A tight shape
   silently stops catching the real stale sentence in a real worksheet, which is
   the entire reason the guard exists, and the failure looks like green. The
   handoff left the door open to tighten a shape that is *independently* too
   loose for real documents; I looked and found none worth narrowing on its own
   merits, so I narrowed nothing. A shape's looseness is a feature over documents
   that are trying to state facts.

## Which families moved, which did not, and the test that tells them apart

The question to ask of a guard sharing this walk: **does it recount a claim
against the tree, or does it check that a derivation still reaches a document?**
The first is a claim-shape scan and reads the new corpus. The second is a
coverage/derivation guard and must keep the unfiltered walk, because its whole
job is to be *loud* when the walk stops seeing a file.

**Moved to `claim_scanned_documents()` (four scans, three modules):**

| scan | module | why |
|---|---|---|
| hardware-entry counts | `test_tolerance_stack.py` | recounts `_COUNT_CLAIMS` against `hardware_entries.json` — went red 09-17 |
| traced-ratio, `asserted_stale` half | `test_tolerance_stack.py` | recounts retired ratio figures against the live one |
| the one-fold rule scan | `test_thermal_exception_list.py` | reads prose for a *statement of the rule* and demands it be conditional |
| byte-identity claims | `test_provenance.py` | reads prose for a byte-identity assertion — went red 09-15 |

**Deliberately left on `live_documents()`:**

* `test_the_coverage_sets_the_doc_scans_walk_are_non_empty_and_complete` — it
  guards the walk itself. It now asserts **both** corpora (floor, and every entry
  of `_DOCUMENTS_THE_DOC_SCANS_COVER` present in each), plus that the claim
  corpus is a subset of the walk rather than a second walk.
* `_surface_readme_text()` / the enumerated-state guard — its comment already
  says why it reads through the walk instead of opening a path: it wants
  `LookupError` when `apps/viewer/README.md` stops being live. Filtering that
  corpus could only make it quieter, never more correct.
* `test_the_coverage_set_assertions_go_red_on_a_derivation_pointed_nowhere` —
  now watches both corpora come back empty on a tmp tree, because a filter that
  excluded *everything* would leave every claim scan green with nothing scanned.

**Two surprises about the third family, both worth knowing before you touch it:**

1. **`test_provenance.py`'s byte-identity scan does not use `live_documents()` at
   all.** The handoff said three families share the walk; in fact that scan
   derives its corpus from `git ls-files`, filtered by `_SCANNED_SUFFIXES`
   (`.md`, `.py`, `.json`, `.js`, `.cjs`, `.toml`, `.txt`, `.ps1`) and by its own
   `_HISTORICAL` prefix tuple. It reads far more than live documents. That is why
   the shared thing is a **predicate**, `is_claim_scanned(rel)`, and not just a
   filtered list — one definition of the scope call, consulted from two different
   starting sets. `claim_inventory()` was split into `_scanned_paths()` +
   `claim_inventory()` so the exemption can be *asserted* rather than being
   indistinguishable from a path the derivation never reached.
2. **The rule scan in `test_thermal_exception_list.py` was moved for cause, not
   for symmetry.** A brief is where the one-fold rule's *superseded absolute
   form* is most likely to be written on purpose:
   `BRIEF_20260826_thermal_never_combines_invariant.md` exists precisely because
   the absolute form was believed, and a brief arguing an undecided question has
   to be able to state the belief it questions. Under the old corpus that brief
   contributed two live passages to the scan and the next absolute sentence in a
   brief would have reddened it — the third instance of this class, already
   loaded.

## The floors, and the one that moved

* **`_LIVE_DOCUMENT_FLOOR = 40`, unchanged** and still applied to
  `live_documents()`. 94 files at `efa5c4c` (92 in a worktree — the two `data/`
  documents are gitignored).
* **`_CLAIM_SCANNED_DOCUMENT_FLOOR = 40`, new, deliberately the same number.**
  70 files after the exclusion (68 in a worktree), so both sets clear 40 by a
  wide margin; lowering either would be lowering a floor nothing is pressing.
  It is its own constant rather than a reference to the first so the two corpora
  can move independently, which is the point of having split them. The number's
  job is unchanged: catch the derivation coming back empty or a fraction of
  itself, not fence the corpus's size.
* **`RULE_STATEMENT_FLOOR` 15 → 14, and this one had to move.** That floor is set
  *at* the count on purpose, so a deleted passage reddens. Two of the fifteen
  were in `BRIEF_20260826_thermal_never_combines_invariant.md`. The number moved
  because coverage went out of scope by decision — not because a passage was
  deleted, which is the failure the floor exists to catch. The docstring says so,
  with the date, so the next author does not read `14` as evidence that something
  was lost.

> **Corrected during `review/prose_guards_scope_out_strategy_briefs`
> (2026-09-17) — two numbers above are wrong, both re-derived by measurement.**
>
> 1. **The corpus sizes are 92 / 68, not 94 / 70, and the reason given for the
>    worktree delta is wrong.** Every `data/` document in this repo is
>    *tracked*, so no worktree is missing one. The two extra files the main
>    checkout reported were
>    `tmp/mutation-witness/apps/{viewer,annotate}/README.md` — gitignored
>    scratch a 2026-09-16 session left behind. `live_documents()` is a bare
>    `os.walk` that never consults git, so untracked dirt joins the claim-scan
>    corpus in whichever checkout happens to be holding it. The tracked-tree
>    count is 92 live / 68 claim-scanned and is **the same in both checkouts**;
>    the handoff's own `efa5c4c` figures inherited the same dirt. Filed as
>    `docs/issues/ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout.md`,
>    since it is a second route into exactly the class this handoff closed.
>    Nothing shipped depends on the number: `_CLAIM_SCANNED_DOCUMENT_FLOOR = 40`
>    is cleared either way, and the reasoning for the floor is unchanged.
> 2. **`RULE_STATEMENT_FLOOR` went 16 → 14, not 15 → 14.** "Two of the fifteen"
>    does not reach 14, and the missing step is that the floor had *drifted*:
>    the count was 15 when the floor was set at `c95ef61` (2026-09-03), but
>    ARCHITECTURE.md gained a fifth passage afterwards, so the live count was
>    **16** at `5d5b746` while the constant still read 15. Two of those 16 were
>    in the brief, and 16 − 2 = 14 — today's count in both checkouts, which is
>    what this handoff re-pinned it to. The conclusion stands (coverage moved
>    out of scope, nothing was deleted); the arithmetic needed the drift to be
>    stated, because a floor "set *at* the count" only holds until the next
>    passage lands, and that is the standing cost of this floor's shape.

## What each witness actually asserts

Every one of the four asserts **both halves**, because either alone proves
nothing — "scope the briefs out" could have been implemented as "stop scanning"
and a one-sided witness would have agreed:

* `test_the_claim_scans_skip_a_triage_brief_and_still_catch_a_real_document`
  (`test_tolerance_stack.py`) — the real 09-17 sentence, verbatim, in a
  brief-shaped file and in a `WORKSHEET_*.md`, on a tmp tree. Asserts the brief
  is still in `live_documents()` and not in `claim_scanned_documents()`; that the
  worksheet is the only file flagged; and that the shape still matches the
  sentence, so the corpus was not narrowed by narrowing what counts as a claim.
  It also asserts `not_library != 3` up front, so the exclusion half cannot go
  vacuous on the day `hardware_entries.json` happens to hold 3.
* `test_no_document_that_states_this_repos_facts_is_exempt_from_the_claim_scans`
  — the same thing against the **real corpus**, which a tmp tree cannot give
  you: that briefs actually exist here (an exemption glob matching nothing is a
  comment, not a fix), and that the exemption removes *only* briefs. A glob
  widened to `docs/*` reddens here.
* `test_the_rule_scan_does_not_read_a_triage_brief` — the absolute rule form, in
  a brief and in an `ARCHITECTURE.md`, with only the second caught.
* `test_the_byte_identity_scan_does_not_read_a_triage_brief` — the real 09-15
  sentence; asserts the briefs are **tracked** (so this is an exemption, not an
  empty glob), that none reaches `_scanned_paths()`, and that the sentence is
  *still* an unbacked asserted claim, so moving it into a document that states
  repo facts brings the guard straight back.

## Gotchas for the next agent here

* **`fnmatch.fnmatchcase`, not `fnmatch.fnmatch`.** `fnmatch` runs
  `os.path.normcase` first, which on Windows makes the exemption
  case-insensitive and on Linux does not. `BRIEF_` is the convention; a file
  spelled otherwise is scanned, which is the loud direction. Noted in the
  docstring.
* **The glob is `docs/strategy/BRIEF_*.md`, not `docs/strategy/`.** Only briefs
  live there today, so the two are equivalent — but a *decided* policy document
  dropped in that folder tomorrow should be scanned like any other live document,
  and `test_no_document_that_states_this_repos_facts_is_exempt_from_the_claim_scans`
  will make that the loud default rather than a silent gap.
* **You cannot quote a byte-identity sentence in a file that scan reads.**
  `claims_in()` in `test_provenance.py` is the one claim scan with **no
  quotation exemption** — no blockquote, no `"…"` span, only a negation directly
  before the phrase. So the verbatim 09-15 sentence lives in
  `tests/test_provenance.py` (the scan's `_SELF` exemption) and the comment in
  `test_tolerance_stack.py` paraphrases it instead. Filed as
  `docs/issues/ISSUE_20260917_byte_identity_scan_has_no_quotation_exemption.md`
  (`audience: strategy`, with the arguments both ways) rather than fixed here:
  changing it changes a guard's verdict on real documents, which this handoff put
  out of scope.
* **Prose outside `tests/` had to move with the corpus.**
  `docs/prompts/REVIEW_AGENT.md` stated the old coverage in three places,
  including a checklist item literally titled *"Two doc-scan families, two
  different scopes — check which one you mean."* That item now lists three sets
  (`live_documents()`, `claim_scanned_documents()`, `traced_ratio_publishers()`)
  and who reads each. A wrong coverage claim is what makes the next reviewer skip
  the check, and `_DOCUMENTS_THE_DOC_SCANS_COVER` names that file, so this was
  finishing the change rather than widening it.
* **`PROVENANCE.md:96` needed an amendment** — `tests/test_tolerance_stack.py` is
  an imported file and `test_this_branch_amended_the_row_of_every_imported_file_it_changed`
  catches you in the act. `test_provenance.py` and `test_thermal_exception_list.py`
  have no rows.
* **The two prose rewords (`1f62803`, `537f11b`) are left exactly as they read.**
  Both changed sentences that were independently worth changing — `1f62803`
  dropped a byte-identity assertion about a *behaviour*, which bytes cannot
  carry.

## Verification beyond the suite

The handoff's definition of done asked for the real sentences reintroduced into a
scratch brief. Done: a throwaway `docs/strategy/BRIEF_20260917_scratch_witness.md`
carrying **all four** claim shapes at once — the hardware-count sentence, the
byte-identity sentence, the absolute one-fold form, and a retired traced ratio
(`3 of 26`) — and the full suite green at 1203/1 with it in the tree. Confirmed
the same file matches all four shapes and would have reddened all four guards
under the old corpus, and that it is still in `live_documents()` while absent
from `claim_scanned_documents()`. The scratch file was deleted, not committed.

## Left to do

Nothing from this handoff. One adjacent finding filed (the quotation-exemption
asymmetry above). The duplicate-filing amplification — thirteen issues for two
defects, because a session on `integration` cannot see an issue filed on another
branch — was named out of scope and is tracked at
`dispatch/docs/strategy/BRIEF_20260911_cross_branch_issue_dedup.md`; not touched,
and no second issue filed for it.
