---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-17 — prose_guards_scope_out_strategy_briefs: stop the claim-shape scans reading triage briefs as claims about this repo

Source: the 2026-09-17 triage sweep, naming a bug *class* after its second
instance in two days. Baseline: trunk at `efa5c4c` (today's batch merge of
`integration` -> `master`, 1199 passed / 1 skipped), with the second instance
already worked around by a prose reword (`537f11b`). Scope: `tests/` — the
document-walk helpers and the claim-shape scans that consume them. Do **NOT**
touch `docs/strategy/` (the briefs themselves are an inbox this repo does not
own), and do **not** change any claim shape's *meaning* or any guard's verdict
on a real tolerance-stack document.

## The class, measured twice

This repo's docs guards scan prose for *claim shapes* and recount each one
against the repo's data. The walk they scan is `live_documents()`
(`tests/test_tolerance_stack.py:2265`) — every live `.md` in the repo, plus
`.json` under `docs/`. That walk includes `docs/strategy/BRIEF_*.md`, which
triage authors and a strategy session consumes. Briefs write ordinary English,
and ordinary English matches claim shapes:

1. **2026-09-15 → 09-16, the byte-identity guard.**
   `tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
   went red on `BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`
   ("the viewer's behaviour is byte-for-byte what `viewer_transport_honest_hosted`
   shipped"). It **gated the 2026-09-16 batch merge of 129 commits**, which was
   reported `skipped-red`, and **eight sessions each filed their own issue** for
   it on `integration` while trunk had no record at all. Collapsed and fixed by
   reword in `1f62803`; see
   `docs/issues/ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md`.
2. **2026-09-17, the hardware-entry-count guard.**
   `tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count`
   went red on **the same brief**, line 152: "for a reason the other three do not
   have". `_COUNT_CLAIMS` carries the shape
   `rf"other\s+({_NUM})\s+do\s+not"` for "entries that do not defer to the spec
   library", and `_NUM` accepts spelled-out numerals — so "three" was recounted
   against `hardware_entries.json`'s `not_library = 28`. It gated today's batch
   merge of 104 commits until the reword, and **four more duplicate issues** for
   it already sat on `integration`. See
   `docs/issues/ISSUE_20260917_hardware_count_guard_red_on_master_from_unrelated_prose.md`.

Both instances are the same defect, and neither sentence was making a claim
about this repo's data. Cost so far: two blocked batch merges, thirteen
duplicate issue filings, and two prose rewords of a document whose prose is not
the guards' business.

## The call this handoff makes, and the one it rejects

**Decision (binding): the claim-shape scans stop reading `docs/strategy/BRIEF_*.md`.**
A brief is an *inbox artifact about an undecided question*, authored by triage
and consumed by a strategy session. It is not a live document that states this
repo's facts, and the guards' own docstrings frame them as protecting documents
that state repo facts ("a live document may state these counts -- it just cannot
state them wrongly").

**This repo already holds the principle; it just was never applied to the
claim scans.** The comment above `assert_coverage_set`
(`tests/test_tolerance_stack.py:2322`) argues for a *floor* rather than an exact
count in exactly these words: an exact count "would put that list straight back,
one indirection along, and the next `docs/strategy/` brief would redden a suite
it has nothing to do with." That is this bug, named by the author, and fixed for
the coverage assertion only.

**Rejected alternative: tighten each claim shape to require its subject** (e.g.
make the shape `other\s+(N)\s+do\s+not\s+defer`). Rejected because the shape set
is open-ended and grows — nine shapes today, and the guard's own docstring says
"a shape not listed in `_COUNT_CLAIMS` is not caught." Every shape added
re-opens the same exposure, and narrowing shapes trades this false-positive
class for a false-*negative* class on the real tolerance-stack documents the
guards exist for. If you find while implementing that a specific shape is
*independently* too loose for real documents, tighten that one as well, but do
not make it the fix.

Record both in the lesson so the next author can check the reasoning rather
than just inherit it.

## Deliverables

1. **A second walk for the claim scans, leaving `live_documents()` intact.**
   Suggested shape (investigate before committing to it): keep
   `live_documents()` exactly as it is — the coverage guard
   `assert_coverage_set("live documents", …)` and
   `_DOCUMENTS_THE_DOC_SCANS_COVER` depend on it, and a brief still *is* a live
   file for provenance-of-the-walk purposes — and add a sibling, e.g.
   `claim_scanned_documents()`, that is `live_documents()` minus
   `docs/strategy/BRIEF_*.md`. Point the claim-shape scans at the new one.
   Measured today at trunk `efa5c4c`: `live_documents()` = **94** files, of
   which **24** are `docs/strategy/BRIEF_*.md`, leaving **70**. Nothing else
   lives under `docs/strategy/` in this walk.
2. **Move the exclusion, not the floor.** `_LIVE_DOCUMENT_FLOOR = 40`
   (`tests/test_tolerance_stack.py:2366`) must keep applying to
   `live_documents()` unchanged. Give the new walk its own floor with its own
   one-line argument for the number; 70 today against a floor of 40 means both
   sets stay comfortably above it, so do not lower either.
3. **Every consumer of the walk, not just the two that went red.** Three guard
   families share it today — `test_tolerance_stack.py` (hardware-entry counts,
   traced ratio), `test_provenance.py` (byte-identity claims,
   `test_every_byte_identity_claim_in_a_live_file_names_its_verification`), and
   `test_thermal_exception_list.py:638`. Decide per family whether it is a
   claim-shape scan (repoint) or a coverage/derivation guard (leave). Say which
   you moved and why in the lesson — a family left behind is the third instance
   of this class waiting to happen.
4. **A witness that this stays fixed.** A test that feeds a brief-shaped
   document containing a sentence matching a claim shape — use the two real
   sentences, "for a reason the other three do not have" and "byte-for-byte
   what `viewer_transport_honest_hosted` shipped" — through the new walk and
   asserts it is not scanned, *and* feeds the same sentence in a real
   tolerance-stack document and asserts it still **is** caught. Both halves:
   the guard that only proves the exclusion proves nothing about the coverage
   it was protecting.
5. **Do not revert the two rewords.** `1f62803` and `537f11b` changed prose that
   was independently worth changing (`1f62803` dropped a byte-identity assertion
   about a *behaviour*, which bytes cannot carry). Leave both sentences as they
   now read.

## Out of scope, named so you do not chase it

The **duplicate-filing amplification** — thirteen issues for two defects,
because a session on `integration` cannot see an issue filed on another branch —
is a real and separate problem, already tracked as
`dispatch/docs/strategy/BRIEF_20260911_cross_branch_issue_dedup.md` (nine
sightings in one day on 2026-09-16). Do not design for it here and do not file
another issue about it.

## Definition of done

- The two real sentences that went red are demonstrably no longer scanned:
  reintroduce each one into a scratch copy of a brief and show the suite green.
- A real tolerance-stack document making the same wrong count is still caught,
  shown by the witness in deliverable 4.
- Full suite green from the repo root, value-level per repo convention
  (baseline to beat: 1199 passed, 1 skipped at `efa5c4c`).
- Lesson (`docs/sessions/lessons/LESSONS_20260917_prose_guards_scope_out_strategy_briefs.md`):
  the decision and the rejected alternative above in your own words; which
  guard families you repointed and which you deliberately left on
  `live_documents()`, with the test that distinguishes them; and the floor
  numbers for both walks with the argument for each.
