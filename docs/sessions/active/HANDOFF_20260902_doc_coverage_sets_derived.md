---
priority: med
depends_on: []
---

# HANDOFF 2026-09-02 — doc_coverage_sets_derived: two doc guards walk hand-kept lists, so an unlisted document is invisible rather than unpaired

Source: two issues that the second one identifies as the same shape as the
first, in its own words:

- `docs/issues/ISSUE_20260901_traced_ratio_doc_scan_uses_a_hand_kept_list.md`
- `docs/issues/ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages.md`

Baseline: tolstack trunk at the 2026-09-02 batch merge (`8693d16`, 570 passed /
1 skipped). Scope: whatever module owns `live_documents()`,
`tests/test_thermal_exception_list.py` (`RULE_PASSAGES`), and the doc-scan
guards' own tests. Do NOT touch `tolerance_stack/thermal.py`'s behaviour or
`DECLARED_COMBINING_EXCEPTIONS`' membership — `thermal_exception_declared`
landed those correctly on 2026-09-02 and they are not what is broken.

Bundled deliberately: these are **one defect in two places**. Fixing one and
leaving the other hand-kept would leave the class live, and the second issue
already points at the first as its precedent — so a point fix here would be
answering half a question that has already been asked twice.

## The shared shape

A guard's coverage set is a **literal maintained by hand**. A document or
passage that is not in the literal is not merely *unpaired* — it is **invisible**,
and the guard stays green. So the uncovered set grows on its own while nothing
ever goes red.

- **`live_documents()`** — the traced-ratio doc scan walks a hand-kept list, and
  **three live documents it is believed to cover are unread**. Two of the three
  are recent additions to the live set (`DAG_TOPOLOGY.md`, 2026-08-31;
  `CLAUDE.md`, tracked 2026-09-01). The bug this guard exists against is
  precisely "a stale number reached eleven files" — `1 of 17` survived three
  reviews.
- **`RULE_PASSAGES`** — a hand-kept dict of **three** entries. Four more
  sentences state the one-fold rule's absolute form today and nothing recounts
  them. The rule's *absolute* form is exactly what a reader writes when they have
  not read the exception, so an unlisted passage is the highest-value thing to
  catch and the thing this shape cannot catch.

Two documents also state the coverage **wrongly**, which is how the gap stayed
invisible: `docs/prompts/REVIEW_AGENT.md` claimed `docs/DAG_TOPOLOGY.md` "is in
`live_documents()`, so the traced-ratio and hardware-count doc scanners already
read it" — half true. Correct those claims as part of this handoff; a wrong
coverage claim is what makes the next reviewer skip the check.

## Deliverables

1. **Derive each coverage set instead of enumerating it.** For `live_documents()`,
   derive from the tracked-document set (glob the live doc locations) rather than
   from a list someone must remember to append to. For `RULE_PASSAGES`, derive
   the passages that state the rule — e.g. scan the live documents for the rule's
   phrasing and require each hit to be registered or conditional.

   **This is a design judgement, not a mechanical substitution**, and the
   handoff is not pretending otherwise: a derivation that is too broad will
   redden on prose that merely resembles the rule. Prototype it, report
   feasibility, and if a hand-kept list genuinely is the right answer for one of
   the two, say so with the reason — that is an acceptable outcome. What is not
   acceptable is leaving it hand-kept by default.

2. **Whatever the set is, assert it is non-empty and assert its size.** The
   failure mode is a guard running over the wrong or empty set and passing. A
   count assertion is what converts "the glob broke" from silence into red.

3. **Fix today's uncovered instances**: the three unread live documents, and the
   four sentences carrying the absolute form. The second issue notes those four
   "are right today and nothing recounts them" — so confirm each is genuinely
   correct before rewriting it, and where it is correct, register it rather than
   changing it.

4. **Correct the wrong coverage claims** in `docs/prompts/REVIEW_AGENT.md` and
   the other document the first issue names.

## Definition of done

- Neither guard's coverage set is a hand-maintained literal, or the one that
  still is has a written argument for why.
- Each set's size asserted, and each assertion observed red by pointing the
  derivation at a bogus location.
- The three unread documents read by the traced-ratio scan; the four absolute-form
  sentences registered or made conditional.
- No document claims coverage the guards do not have.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green (570
  passed / 1 skipped at baseline, plus your additions).
- Lesson (`docs/sessions/lessons/LESSONS_20260902_doc_coverage_sets_derived.md`):
  the derivation you chose for each, the feasibility finding from deliverable 1,
  the before/after count of covered documents and passages, and — if you kept a
  literal anywhere — the argument.

## Why the sweep bundled and prioritised this

The 2026-09-02 triage sweep found **eight live instances of this exact shape
across four repos** in a single pass (dispatch's prompt guards globbing only
canonical, forge's `EXPECTED_CHECKED_REPOS` — red on trunk right now — these two,
drawing-checker's three unfixed `setdefault` siblings, and more). tolstack holds
two of the eight, and they are the two where the *guard's whole purpose* is
document coverage. See
`dispatch/docs/sessions/lessons/LESSONS_20260902_triage_hand_kept_coverage_sets.md`
for the full inventory and the argument for why no single cross-repo refactor
exists. You are fixing this repo's share, not the class.
