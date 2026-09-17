---
type: review
handoff: docs/sessions/active/HANDOFF_20260917_prose_guards_scope_out_strategy_briefs.md
reviewer: agent
date: 2026-09-17
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-17 — prose_guards_scope_out_strategy_briefs

**APPROVE.** Merged `handoff/prose_guards_scope_out_strategy_briefs` (`e6658b0`,
fast-forward from `5d5b746`) into `review/…`, then into `integration`. Suite
green at **1203 passed / 1 skipped** in the worktree, against the handoff's
baseline of 1199/1 — four tests added, none removed.

Two inline fixes (both prose/comment only, both reported below), one adjacent
issue filed, two overlay entries added.

## What I verified, and how

**The defect really reddens before, and really does not after.** Before merging,
I dropped a scratch `docs/strategy/BRIEF_20260917_review_scratch_witness.md`
carrying all four real claim shapes at once — the 09-17 hardware-count sentence
verbatim, the 09-15 byte-identity sentence verbatim, the absolute one-fold form,
and a retired `3 of 26` traced ratio — and ran the four production guards at the
pre-work tree: **all four red** (the byte-identity one only after `git add -N`,
since its corpus is `git ls-files`, which is itself worth knowing). After the
merge, with the same file in place: **all four green.**

**The coverage half, which is the half that could have been faked.** I then
moved that same file to `docs/tolerance_stacks/WORKSHEET_review_scratch_witness.md`
and re-ran: **all four red again.** So the narrowing was done to the corpus and
not to what counts as a claim — "scope the briefs out" was not implemented as
"stop scanning."

**Mutations on the deliverable itself** (`_CLAIM_SCAN_EXEMPT_GLOBS`):

| mutation | result |
|---|---|
| `()` — the whole deliverable silently reverted | 4 red, one per witness, one per module |
| `("docs/*",)` — glob widened past the briefs | 5 red, incl. the coverage guard and the rule-statement floor |
| `("docs/strategy/*",)` | **green** — equivalent today, since only briefs live there; the lesson names this and argues the narrower glob, correctly |

**Every consumer of the walk (deliverable 3).** I enumerated all `live_documents()`
call sites and searched for any other document walker (`os.walk`, an `.md` glob)
in `tests/` — there is none. Four claim-shape scans in three modules moved; three
call sites deliberately stayed, and each one is a presence/derivation guard whose
job is to be loud when the walk stops seeing a file:
`test_the_coverage_sets…_non_empty_and_complete`, `_surface_readme_text()` /
`test_every_enumerated_viewer_state_is_named_in_a_live_document`, and
`test_the_coverage_set_assertions_go_red_on_a_derivation_pointed_nowhere`. I
agree with every call, and the distinguishing question the lesson states
("recount a claim, or check a derivation still reaches a document?") is the right
one.

**Both checkouts** (per the overlay's standing rule). `claim_scanned_documents()`
and the rule scan give 70/94 and 14 in `C:\workspace\tolstack`, 68/92 and 14 in
this worktree. `_DOCUMENTS_THE_DOC_SCANS_COVER` is fully inside the claim corpus
in both, and the exempt set is exactly the 24 briefs in both. The 94-vs-92 delta
turned out not to be what the author thought — see finding 2.

**Numbers re-derived rather than read:** 24 briefs; 9 `_COUNT_CLAIMS` shapes;
159 tests in `test_tolerance_stack.py` (matches the new PROVENANCE row);
1199 + 4 = 1203; `_LIVE_DOCUMENT_FLOOR` untouched at 40 and still applied to the
unfiltered walk. The suite leaves `C:\workspace\tolstack\data` exactly as it
found it (recursive listing diffed either side of a full run).

**Handoff compliance.** `docs/strategy/` untouched, both rewords (`1f62803`,
`537f11b`) left standing, no claim shape narrowed, `live_documents()` unchanged,
the out-of-scope duplicate-filing amplification neither designed for nor
re-filed. The predicate-plus-list shape (`is_claim_scanned` +
`claim_scanned_documents`) is a better answer than the handoff's suggested single
sibling walk, for the reason the lesson gives: the byte-identity scan derives its
corpus from `git ls-files` and had to make the same scope call from a different
starting set.

## Findings

### should-fix, fixed inline (prose only — no behaviour, no new test)

1. **`RULE_STATEMENT_FLOOR`'s 15 → 14 narrative does not reconcile.**
   `tests/test_thermal_exception_list.py:530` and the lesson both said the floor
   was 15 and "two of the fifteen were in the brief" — which reaches 13, not 14,
   and the docstring never closes the gap. Measured: the count *was* 15 when the
   floor was set (`c95ef61`, 2026-09-03), but ARCHITECTURE.md gained a fifth
   passage afterwards, so the live count was **16** at `5d5b746` while the
   constant still read 15. 16 − 2 = 14, which is today's count in both
   checkouts. The shipped number is right and the conclusion is right; only the
   subtraction was unstated. Fixed the docstring and added a correction
   blockquote to the lesson. The general point is now an overlay entry: a floor
   "set at the count" is the last re-measurement, not the current count.

2. **The 94/70 corpus figures are the main checkout's dirt, and the stated cause
   is wrong.** The docstring, the new floor's comment and the lesson all said a
   worktree sees two fewer live documents "because the `data/` documents are
   gitignored." Every `data/` document in this repo is *tracked*
   (`git ls-files data/` lists all three READMEs), so no worktree is missing
   one. Diffing the two document *sets* rather than the two integers names the
   real cause in one line:
   `tmp/mutation-witness/apps/{viewer,annotate}/README.md`, gitignored scratch a
   2026-09-16 session left in `C:\workspace\tolstack`. The tracked-tree corpus
   is **92 live / 68 claim-scanned, identical in both checkouts**. Corrected all
   three sites inline. Nothing shipped depends on the number —
   `_CLAIM_SCANNED_DOCUMENT_FLOOR = 40` is cleared either way and its argument
   is unchanged — which is why this is a fix and not a blocker. `PROVENANCE.md`'s
   row is left as written: it says "measured at `efa5c4c`", which is a true
   statement about what was measured, and that row is dated history.

### filed, not fixed (out of scope for this handoff)

3. **`live_documents()` walks gitignored scratch, so untracked dirt joins every
   claim-shape scan** —
   `docs/issues/ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout.md`
   (`type: bug`, `priority: med`). This is finding 2's root cause and it is a
   *second route into the class this handoff just closed*: a guard reddening on
   prose that is making no claim about this repo. The two files sitting there
   today are mutation-witness copies — i.e. the files most likely in this repo
   to hold a deliberately wrong number — and the operator's batch merge is the
   run that reads them. Not fixed here: it changes which documents a guard
   reads, which the handoff put out of scope. `tests/test_provenance.py` is
   immune by construction (`git ls-files`), and that asymmetry is the shape of
   the fix.

4. **The author's own filing stands and is well-made** —
   `ISSUE_20260917_byte_identity_scan_has_no_quotation_exemption.md`
   (`audience: strategy`). I checked the claim: `claims_in()` really does
   recognise only `_NEGATED_RE` over the preceding 24 characters, with no
   blockquote or `"…"` exemption, where the other three scans share
   `_quoted_spans()` / `passages_in()`. Correctly routed to strategy rather than
   fixed — and the consequence the issue names is real and was visible in this
   review: the verbatim 09-15 sentence can only live in the one file the scan
   exempts from itself.

### nits (not fixed)

5. `tests/test_provenance.py:664` — the new comment explaining the
   `docs/strategy/BRIEF_*` exemption ends with a blank line and so reads as
   attached to `_SCANNED_SUFFIXES` below it rather than to `_HISTORICAL` above.
6. `tests/test_provenance.py:840` cites a synthetic
   `docs/strategy/BRIEF_20260915_origin_posture.md`; the real file is
   `…_origin_posture_and_absent_feature_rule.md`. Harmless — the argument is a
   path fed to a predicate, not a file that has to exist — but a reader grepping
   for it finds nothing.

### not a finding, but worth recording

7. **The tactical agent edited this overlay** (`docs/prompts/REVIEW_AGENT.md`,
   three passages). Normally the reviewer's file — but the overlay *is* a live
   document these scans read and `_DOCUMENTS_THE_DOC_SCANS_COVER` names it, and
   all three passages stated the old coverage, including a checklist item
   titled "Two doc-scan families, two different scopes." Leaving them would have
   shipped a wrong coverage claim into the document that tells the next reviewer
   which scan reads what. I checked each rewrite against the code: all three are
   accurate, and the three-set list (`live_documents()` /
   `claim_scanned_documents()` / `traced_ratio_publishers()`) is the right
   framing. Finishing the change, not widening it.

## Overlay maintenance

Two entries appended to `## Recurring bugs to check`, both genuinely new classes
from this review: the corpus-measured-in-the-dirt footgun (findings 2/3) and the
drifted-floor arithmetic footgun (finding 1). Nothing pruned — no entry I applied
came back empty.

## Note for the next reviewer

`live_documents()` is now the *only* unfiltered consumer left, and its three
remaining call sites are all presence/derivation guards. If a fourth guard family
ever appears, the question to ask it is the lesson's, and the answer is one
predicate away. And until
`ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout.md`
closes: **before you believe any corpus count, list
`C:\workspace\tolstack\tmp`** — and diff the two checkouts' document *sets*, not
their sizes.
