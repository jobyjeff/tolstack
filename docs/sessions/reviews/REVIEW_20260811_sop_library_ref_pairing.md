---
type: review
handoff: docs/sessions/active/HANDOFF_20260810_sop_library_ref_pairing.md
reviewer: review agent (dispatch)
date: 2026-08-11
verdict: APPROVE
blockers: 0
---

# Review — `sop_library_ref_pairing`

Branch `handoff/sop_library_ref_pairing` (2 commits, `754b442` + `debb3b6`) merged
into `review/sop_library_ref_pairing` off `master` `7d3abef`. Nine files, +850/−39.

**The work under review is a documentation fix plus its mechanisation — not a
tolerance stack.** No stack JSON, no worksheet, no element, no `source_ref`, no
material property and no number in any stack changed on this branch (verified from
the diffstat: the only files touched are `PROVENANCE.md`, `README.md`,
`docs/SOP_TOLERANCE_STACK.md`, two `docs/issues/`, one lesson,
`docs/tolerance_stacks/README.md`, `tests/test_sop_vocabulary.py`,
`tests/test_tolerance_stack.py`). The seven mandatory stack checks are therefore
answered below by *scope*, not skipped — and the two that still bite a doc change
(check 7's "recompute any figure a doc asserts" and the schema-hygiene items) were
performed in full and produced this review's one finding.

---

## The seven mandatory checks

| # | check | verdict |
|---|---|---|
| 1 | every tolerance traces to a spec/drawing callout | **N/A — no element, `source_ref`, `confidence` or `export` changed.** Confirmed by diff: no `docs/tolerance_stacks/*.json` file is in it. `test_no_traced_element_cites_a_parts_list`, `test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered` and the export invariants all still green on the merged tree |
| 2 | signs on every path term | **N/A** — no path, check or term changed; no `checks` array touched |
| 2b | coherent material corners vs `fold()` | **N/A** — no fold, no re-derivation, no archetype code |
| 3 | LMC/MMC direction per element | **N/A** — no element carries a changed `lmc`/`mmc`. `fold()` untouched; the test that reads its source for `.lmc`/`.mmc` is green |
| 4 | RSS actually computed | **N/A** — no check result, no worksheet, no verdict prose changed |
| 5 | nominal inside its own min/max | **N/A** — no transcribed value changed. Notably the branch did **not** "fix" any datum to make a doc read better: `docs/tolerance_stacks/hardware_entries.json` is not in the diff at all, which is the right answer for a handoff whose subject is the prose *about* that file |
| 6 | quantised cotter/castellation constraints | **N/A — no joint under review.** The check's generalisation (an archetype's caveat next to the numbers) was applied to the doc instead, and is the one place this branch is genuinely strong: see check 7 |
| 7 | report the traced/inferred/untraced ratio | **PASS, re-derived** — see below |

### Check 7, done properly

Re-derived rather than quoted, per the standing correction in this overlay. The
ratio is unchanged by this branch, and I ran the one computing place to prove it
rather than asserting it from the diff:

> **5 traced / 3 inferred / 18 untraced, out of 26 element instances** (seeded
> slice-1 set), and **21 / 7 / 20 of 48** across all stack files —
> `tests\debug_report_tolerance_stacks.py --ratio`, unchanged from
> `fastener_citations_and_confidence`. `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
> is green, which is the mechanical confirmation that this branch did not disturb
> the SOP section it was told not to touch (§ "The traced ratio").

The **non-element** ratio is likewise unchanged (0 of 7 for the thermal stacks:
three CTEs, two operating temperatures, two stiffness ratios). Neither number was
copied from the handoff, the lesson or a worksheet.

The counts that this branch *does* put at risk are the hardware-entry ones, so I
recounted those from the file rather than from any prose:

```
15 entries — inline/drawing 2, inline/spec 3, inline/workbook 5,
             library/spec 1, not_transcribed/None 4
promoted (library_ref filled): ['NAS6403U11D']
```

Six traced-and-safe, five workbook, four not transcribed, exactly one promoted.
That is what `hardware_entries.json`'s own tested `description` says, and it is
what makes the finding below decidable.

---

## Also verify

- **Tests.** Re-run by me, not trusted: **343 passed, 1 skipped** in this review
  worktree on the merged tree (`venv-win\Scripts\python.exe -m pytest -q`). The
  lesson's "340 → 343" is correct and I re-derived the delta: `+3` is exactly
  `tests/test_sop_vocabulary.py`'s three tests; `tests/test_tolerance_stack.py`
  holds **72** `def test_` before and after (112 collected with parametrisation),
  so PROVENANCE's "no test added or removed" is true. Main-checkout figure recorded
  at the end of this report.
- **The new tests are red on the pre-work tree — verified independently.** Before
  merging, I ran the branch's scan against `master`'s files with the not-yet-existing
  helper stubbed out. It reports **9 asserted superseded-nullness claims across 2
  files** (`docs/SOP_TOLERANCE_STACK.md` lines 129, 537 ×5, 799, 877;
  `docs/tolerance_stacks/README.md:50`). The branch's own
  `test_the_scan_catches_the_reconstructed_sighting_three` replays the same thing
  out of git at `abfaf5a`. **This is not a vacuous check** — which matters, because
  this repo has now twice shipped a guard that could not fail.
- **The tripwire caught *me*, live.** While writing the overlay update below I
  quoted the superseded sentence verbatim in a checklist bullet;
  `test_no_live_doc_still_asserts_the_superseded_nullness_rule` went red naming
  `docs/prompts/REVIEW_AGENT.md:443` and both phrases. That is the strongest
  evidence available that the scan works on prose nobody anticipated. Rephrased,
  green.
- **Every test name the new prose cites actually exists.** A doc fix that cites a
  test is one more thing that can drift, so I resolved all six by grep:
  `test_only_the_one_entry_was_promoted` (`test_spec_library.py:576`),
  `test_the_nas6403_hardware_entry_defers_to_the_library` (`:540`),
  `test_material_entries_keep_library_ref_null_and_schema_v0`
  (`test_hub_bearing_thermal_fit.py:140`),
  `test_every_hardware_entry_has_a_gap_list_and_a_resolvable_values_status`,
  `test_hardware_entry_values_source_counts_match_the_description`,
  `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`. All
  present. `python -m tolerance_stack` (the SOP's new "rebuild and look"
  instruction) resolves — `tolerance_stack/__main__.py` exists.
- **The SOP's two Step 4 examples against the real entries, field by field.** I
  compared *every* key, including the ones the new test deliberately does not
  compare. Both examples' `values_status`, `library_ref`, `standard`, `dash`,
  `class`, `dimensions_in`, `values_source.{kind,document,sheet,cell,confidence}`
  match `hardware_entries.json` exactly. The differences are all genuine
  abridgement — truncated `gaps` and `note` prose, one `used_by` entry of two or
  three, a shortened `nomenclature`, and `NAS6403U11D`'s twelve extra
  `dimensions_in` keys plus `library_ref_note`/`dimensions_mm`. Nothing is
  contradicted; nothing invented. See the one nit below on the promoted example's
  `values_source.note`.
- **Deliverable 4 (the grep) re-run by me, not read.** The lesson's 23-row table is
  accurate. I re-grepped `library_ref` across `docs/prompts/REVIEW_AGENT.md`,
  `ARCHITECTURE.md`, `docs/tolerance_stacks/README.md` and `README.md` and every
  classification holds — including the load-bearing one: the identical sentence is
  **false about `hardware_entry` and still true about `material_entry`** (there is
  no materials library, and `test_material_entries_keep_library_ref_null_and_schema_v0`
  asserts it). The branch keeps those and explains why, which is the right call:
  the next reader would otherwise have "fixed" a correct line.
- **Schema hygiene / the pairing invariant itself.** `hardware_entry_problems()` is
  a strict superset of what the old inline test asserted (it now also demands the
  `library_ref` and `values_source` **keys be present**, not merely null), and the
  hard-coded "the remaining twelve are still `inline`" in the docstring — stale
  since the two bearings landed 2026-08-05 — is gone. Good: that clause was itself
  the repo's stale-count bug.
- **`data/inbox/specs/` not reorganised, and no `data/` write.** No `data/` path is
  in the diff. The pile is **64 files** in the main checkout (counted, not quoted).
  The suite left `C:\workspace\tolstack\data\` untouched — nothing under it has a
  mtime from today.
- **Nothing written into drawing-checker.** This handoff cites no run, no export
  and no drawing, so there is nothing for the snapshot-diff procedure to
  adjudicate; I checked by mtime anyway. One thing for the next reader so it is not
  misread: `C:\workspace\drawing-checker\data\inbox\specs\MOVED_TO_TOLSTACK.txt`
  carries **today's** mtime (11:31), but its content is the unchanged 2026-08-03
  marker and the writer is drawing-checker's *own* concurrent
  `gitignore_data_coverage` session (that repo's `docs/sessions/reviews/` and
  `tests/debug_gitignore_data_matrix.py` moved in the same window). Not a tolstack
  write.
- **Projections.** Not rebuilt and deliberately so: no stack, element or check
  changed, so `data/projections/viewer/*.json` cannot differ, and this review
  judges nothing the viewer shows.
- **`HEAD..master` before the verdict.** Empty — nothing landed on `master` while
  this review ran, so the merged tree is the shipping tree. (The lesson's §6 claim
  that `fastener_citations_and_confidence` merged *before* this branch started is
  correct; `abfaf5a` is its board commit.)
- **PROVENANCE.** The two amended rows are true, not just moved:
  `docs/tolerance_stacks/README.md`'s "prose only" and
  `tests/test_tolerance_stack.py`'s "no test added or removed and no number
  changed" both reproduce against the diff. `test_provenance.py` green.
- **`docs/reference/` untouched.** Correct — it states the old rule and is an
  insert-only import; leaving it is the right call and the lesson says why.
- **Scope stated**, both what was done and what was deliberately not
  (`fastener_citations_and_confidence`'s counts, `docs/reference/`, the board move).

---

## Findings

### should-fix — fixed inline in this review

**1. The doc fix introduced two fresh unguarded counts, sixty lines from its own
instruction not to.** `docs/SOP_TOLERANCE_STACK.md:538` read *"abridged from the
real `NAS6403U11D` entry, still the only one in this file in this state"*, and
`docs/tolerance_stacks/README.md:63` read *"a `library_ref` filled exactly where the
spec library holds the part **(one entry so far)**"*. Both are counts of the same
fact, both age silently, and both contradict the branch's own new rule bullet —
which tells the author that `test_only_the_one_entry_was_promoted` *"is where the
current count of promoted entries lives, so read it there rather than from a number
in this file"* — and the lesson's §5, which claims *"Counts kept out of the new
prose. Every temptation to write '14 of 15 entries are null' was replaced with a
pointer to the test that owns the number."* The failure mode is concrete: a second
promotion makes `test_only_the_one_entry_was_promoted` red, the author updates that
test, and nothing points them at either sentence.

*Fix applied:* both replaced with a pointer to that test. `PROVENANCE.md`'s
`docs/tolerance_stacks/README.md` row amended in the same commit (the file is an
import, so the row must move with it). Suite re-run green.

**2. The review overlay's own count was stale — the other half of
`ISSUE_20260811_the_values_source_counts_in_two_live_docs_are_stale`.**
`docs/prompts/REVIEW_AGENT.md:348` said *"Eight of the nine inline entries are
workbook transcriptions, so this is the common case"*; it is **five of eleven** and
has been since 2026-08-10, so the sentence's own argument no longer holds. The
handoff was right not to touch `docs/tolerance_stacks/README.md`'s copy — that is
`fastener_citations_and_confidence`'s prose — but the overlay is the reviewer's
file, and a checklist that hands the next reviewer a false constant is precisely
the failure this overlay already records ("a checklist that hands you a constant
will beat your own correct arithmetic").

*Fix applied:* rewritten to state no share at all and to point at
`test_hardware_entry_values_source_counts_match_the_description`, i.e. the issue's
own option 2. The issue is annotated **half done** and stays `open` for the
`docs/tolerance_stacks/README.md:128` half.

### nits

- **The promoted example's `values_source.note` is written, not abridged.** The SOP
  introduces the block as *"abridged from the real `NAS6403U11D` entry"*, and every
  other field is a genuine truncation — but the `note` is new explanatory text
  (*"where the inline numbers below were READ FROM. Still true after the promotion…"*)
  rather than a shortening of the real note. It teaches the right thing and the new
  test compares `note` on neither example, so nothing is false; "abridged" is just
  slightly stronger than what happened. Left as-is.
- **Nothing asserts that a filled `library_ref` resolves.** `hardware_entry_problems()`
  checks the `spec_library:` prefix and the pairing, not that the subject exists.
  Today the gap is closed by construction — `test_only_the_one_entry_was_promoted`
  pins the promoted set to exactly `['NAS6403U11D']` and
  `test_the_nas6403_hardware_entry_defers_to_the_library` resolves that one value by
  value — but the moment a second entry is promoted, the author updates the first
  test and nothing checks the new ref against the library. The SOP is honest about
  this (it says to rebuild and look, and claims no test), so it is a nit now and a
  real gap at the next promotion. Worth a one-line addition to
  `hardware_entry_problems()` then, not now.
- **`test_the_sop_step_4_examples_obey_the_invariants_they_teach` pins the example
  set by exact dict equality**, so adding a *third* Step 4 example fails the suite
  with a message about the pairing. Intended as anti-vacuity, and correct today;
  just know that is why it fires.
- **The scan's blockquote escape is per-line and its only escape.** A correction
  that quotes the old wording in running prose (a bullet, a table cell, a docstring)
  is read as the drift returning — as this review demonstrated on itself. That is
  the safe direction, and the lesson already says the scan is a tripwire and not a
  parser, so no change requested; it is worth knowing before you write about this
  rule anywhere in a tracked `.md`/`.py`/`.json`.

### Deliverable 5, judged

The handoff asked for a feasibility answer and warned "do not half-land it". The
branch lands a real answer rather than a hedge: the proposed
vocabulary-vs-data test **would not have caught this sighting**, and the lesson
proves it with a three-row table over the three actual sightings rather than
asserting it. The two obstacles it records (there is no `HardwareEntry` dataclass —
the only `library_ref` field in the package is `MaterialEntry`'s, on the side where
nullness is still correct; and the same sentence is true of one schema and false of
another) are both verifiable and both true. What did land — examples-as-fixtures,
plus a phrase tripwire replayed against the real drifted blob — is the part that is
mechanisable, and it is labelled as such. This is the right shape for a "report
feasibility" deliverable.

The definition-of-done proposal in §4 (update the sentence that states an invariant
in the same commit that changes it, **or name the handoff that owns that prose**)
is well-argued and the escape hatch is load-bearing — this handoff and
`fastener_citations_and_confidence` deliberately split one file, and a clause-free
version would have forced a spurious `depends_on`. It is a dispatch/handoff-template
decision, not this repo's to land alone; flagging it here so it reaches whoever owns
that template.

---

## Overlay maintained

`docs/prompts/REVIEW_AGENT.md` updated on this branch (three edits, committed here):

1. **Documented vocabularies drifting** — third sighting recorded, with the part
   that changes the reviewer's job: this variant has no data-shaped signal, so ask
   which *sentence* states an invariant, not just which enum. Plus a pointer to
   `tests/test_sop_vocabulary.py` and, explicitly, **what that scan does not see**
   (literal phrases only, blockquotes skipped, `docs/sessions|issues|reference`
   excluded) so its green is never read as "the prose was checked".
2. **Stale inventory numbers** — new variant: the count a *doc fix* introduces,
   with this review's two sightings, and the rule that "N so far" / "the only one" /
   "still the first" are counts.
3. The stale `values_source` share replaced with a pointer to the computing test
   (finding 2 above).

---

## Verdict

**APPROVE** — 0 blockers. Two should-fix findings, both fixed inline on the review
branch and both of the "prose ages" class rather than the "number has no document"
class; no invented value, no unsourced tolerance, no arithmetic touched.

The work does what the handoff asked and one thing more that matters: it declines
to pretend the class is fully mechanisable, and says exactly where the hole is.
That honesty is worth more than the two tests.

**For the next reviewer:** `tests/test_sop_vocabulary.py` is now a thing you can
trip. Before you write about `library_ref` in any tracked `.md`, `.py` or `.json`
outside `docs/sessions/`, `docs/issues/` and `docs/reference/`, either state the
pairing or put the old wording in a blockquote.
