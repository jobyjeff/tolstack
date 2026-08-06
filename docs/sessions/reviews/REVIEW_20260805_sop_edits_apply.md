---
type: review
handoff: docs/sessions/completed/HANDOFF_20260805_sop_edits_apply.md
reviewer: review agent (review/sop_edits_apply)
date: 2026-08-05
verdict: APPROVE
blockers: 0
---

# Review — sop_edits_apply

Work reviewed: `handoff/sop_edits_apply` (`61e7386`, `7aa4d9e`, `9abeb23`),
merged into `review/sop_edits_apply` off `master` at `13ace68`.

**Verdict: APPROVE.** 0 blockers. 3 trivial fixes applied inline (below), 3 nits
recorded and not fixed. 58 tests green.

This is not a tolerance stack — it is an SOP-editing pass — so the seven
mandatory stack checks are addressed below for completeness rather than applied
to a fold. The one part of this handoff that *is* a provenance artifact (the
`values_source` backfill) got the check-1 treatment in full: **every cited
workbook cell was re-read out of the xlsx.**

## What I verified

### Pre-work tests (the suggested flow)

Wrote 20 tests against the pre-merge tree asserting the handoff's definition of
done directly from the handoff text — all 13 entries carry `values_source`,
`source_ref`-shaped, workbook transcriptions labelled `workbook`; the SOP no
longer pins a test count; each of edits 1–14 present by content. **19 failed
before the merge, all 20 passed after.** The one that passed pre-merge was edit
10 (`REVIEW_AGENT` §3's earned `max == mmc` exit), which independently confirms
the author's claim that the `pitch_link_stack` reviewer had already applied it in
`6a5ce62` and that not re-applying it was correct, not a skip. Scaffolding
deleted before commit; it duplicated the author's own coverage and added brittle
prose matching.

Baseline suite 51 → 58 after merge, green both sides.

### The 14 edits

All 14 are in the tree, none rejected. Spot-checked each against the lesson's
proposed wording; the seven deviations the lesson documents are all real and all
improvements (edit 1 drops the "42 files" count rather than updating it; edit 4
and 14 merged into one Step 5c with the worked example moved out of the bullet
list; edit 5 cross-referenced to edit 9, which neither proposal knew about; edit
9's correlated-terms case demoted from bullet to paragraph because it is a
`fold()` limitation, not a fourth member of the list). Nothing was silently
skipped.

Edit 14's substance is right, and it is the one that mattered: SOP Step 5c now
says the binding bound is grip at `max` against the column at `min` — the larger
magnitude — and quotes 8.1939 mm. Confirmed against
`test_pitch_link_the_binding_link_eye_requirement_is_the_worst_case_end`, which
pins `grip.max - column.min == 8.1939 == -interval.min`. Prose and test agree.
`joint.assembly_export`, which the new Step 2 export bullet tells authors to use,
exists on the pitch-link stack.

### `values_source` — the provenance audit

**Every one of the eight backfilled entries' cited cells was re-read from
`260729_sample_tol_stack.xlsx` and matches exactly.** This is the check that
mattered most and it holds without exception:

| entry | cited | workbook says |
|---|---|---|
| `NAS1149V0332` | E11 `=0.032*25.4`, F11 `=0.004*25.4`, I11 names the part | exact |
| `NAS1149V0363` | E12 `=0.063*25.4`, F12 `=0.006*25.4`, I12 names the part | exact |
| `NAS6403U13H` | E23 `=0.812*25.4`, band from free-text `+/-.01` in D23, repeated at E52/D52 | exact |
| `NAS6403U14D` | E25 `=0.875*25.4`, D25 `+/-.01` | exact |
| `NAS6404U13D` | E73 `=0.812*25.4`, D73 `+/-.01`, E71 repeats the nominal | exact |
| `NAS77A4-015` | E63/G63/H63 hand-typed literals 4.762/4.71/4.81, no formula; I62 is the *header* row | exact |
| `MS21299C4K` | E67 `=(G67+H67)/2`, G67 `=(0.057)*25.4`, H67 `=(0.069)*25.4`; MS21299C4K named at **I64**, the spherical-bearing row | exact |
| `214820-002` | E7/G7/H7 literals 4.762/4.63/4.76, repeated at E39/G39/H39 | exact |

The three claims the lesson says "came out differently than a copy would have"
are all corroborated. In particular I64 really does name `MS21299C4K` on the
spherical-bearing row, so the entry's admission that attributing row 67's band to
that washer is itself *a reading* is honest and not padding. Likewise
`214820-002`'s `dimensions_mm.length` is `4.7625` (= .1875 in × 25.4) while the
workbook's own E7 is the literal `4.762` — two numbers for one feature, both kept
and now distinguishable. That is the correct outcome and it is the kind of thing
that only surfaces if you actually open the file.

Direction of confidence is conservative throughout: mixed-provenance entries
(parts-list nominal + workbook-only band) are cited at their weakest as
`kind: "workbook"` / `untraced` rather than the flattering `parts_list` /
`inferred`. That is exactly what edit 6 exists to prevent, applied to the file
that motivated it.

### The one factual claim outside the 14 edits

The SOP's printed-border range for 217755 sheet 4 was changed from `A–L × 2–15`
to `A–L × 1–16`. I read the border ticks off both exports with PyMuPDF
(read-only, from drawing-checker's venv): **numbers 1–16, letters A–L, on both
the 2026-AUG-3 and the 2026-JUL-23 POST exports.** The correction is right and
the old value was wrong. The accompanying instruction — read the ticks rather
than assume a range — is the right generalisation.

### Repo-wide claims, recomputed rather than read

- **Spec pile: 64 files / 249,105,891 bytes** in the main checkout — matches
  PROVENANCE's new sentence to the byte. `MS9363 Rev C.pdf` is present, so the
  `data/inbox/specs/README.md` move from the blocking list to the have-it table
  is correct.
- **SOP is 704 lines** — matches the lesson.
- **58 tests** — matches PROVENANCE's amended row.
- **Ratio across hardware entries: 1 traced / 0 inferred / 8 untraced out of 9
  inline entries, plus 4 explicit `null` for `not_transcribed`.** Matches "eight
  of the nine" in all four places that assert it (`hardware_entries.json`
  description, `docs/tolerance_stacks/README.md`, `docs/prompts/REVIEW_AGENT.md`,
  the lesson) and the `len(by_kind["workbook"]) == 8` assertion in the suite.
  Every entry carries a non-empty `gaps` list.

### Checklist items

- **`data/inbox/specs/` append-only** — not reorganised. The diff touches only
  the tracked `README.md`; the filesystem shows no rename or removal, and
  `git ls-files data/` is unchanged.
- **Nothing written into drawing-checker.** Its `data/inbox/specs/` holds only
  the founding `MOVED_TO_TOLSTACK.txt` (Aug 4 11:23); newest run is Aug 4 11:40
  (`pitch_link_stack`'s); the Aug 5 14:4x drawings in its inbox are the five
  hub-bearing PDFs Jeff landed in `d48fcd8`, not this session's. No run was
  created and no PDF added by this handoff.
- **`fold()` untouched**, still reads `min`/`max` only. The only `stack.py`
  change is a comment on `StackElement.role`.
- **PROVENANCE honesty.** All three files this handoff changed that PROVENANCE
  tracks (`hardware_entries.json`, `tests/test_tolerance_stack.py`,
  `tolerance_stack/stack.py`) had their Amended column moved **in the same
  commit** as the change (`7aa4d9e`, `7aa4d9e`, `9abeb23`). No byte-identical row
  is now false. The added paragraph distinguishing the 42-file/111 MB *move*
  figures from today's 64-file pile pre-empts a reader mistaking append-only
  growth for a falsified row — good.
- **No surviving `{{` placeholders** in the diff.
- **`forge check` clean in the worktree** (not just the main checkout).
- **Tests don't pollute `data/`** — `git status --short` clean after the run.
- **Findings use the diagnosis codes / `[read]` findings present** — N/A, no
  stack was built. The lesson's edit-by-edit section is the equivalent artifact
  and it is unusually specific about what it changed and why.

### The seven mandatory stack checks

Not applicable as such — no stack was built, no element was added, no check was
folded, no `nominal` was transcribed. Recorded explicitly so a reader can tell
"N/A" from "skipped":

1. **Tolerances trace to a document** — N/A for elements; applied in full to the
   hardware entries' `values_source`, see above. No invented number found.
2. **Signs on every path term** — N/A. No path or check was added or edited.
3. **LMC/MMC direction** — N/A. The one `stack.py` change is a comment; `fold()`
   still reads `min`/`max` only. Edit 10's `max == mmc` exit was verified present
   in the review prompt and is unchanged by the merge.
4. **RSS computed** — N/A. Edit 9's third caveat (a zero-width band is an
   *unknown* band, so RSS understates rather than merely misrepresents) is
   correctly stated and correctly cross-referenced from Step 2.
5. **Nominal inside min/max** — N/A. No nominal was transcribed or altered.
6. **Quantised cotter/castellation constraints** — N/A. The four cotter/nut
   entries stay `not_transcribed` with `values_source: null`; `MS9363 Rev C.pdf`
   landed the same day and the lesson is explicit that nothing here opened it.
7. **traced/inferred/untraced ratio** — reported above, computed by me.

## Findings

### Fixed inline on the review branch (trivial)

1. **`docs/SOP_TOLERANCE_STACK.md`, Step 2 `role` list.** "This list lives in
   three places (…): `StackElement.role`'s comment, and `tests/…`" named two
   after a colon promising three. Added the missing member (the SOP list itself).
2. **`docs/SOP_TOLERANCE_STACK.md`, Step 3 trap "a value matching is not a
   feature matching".** Says 215197 carries *three* distinct 4.06 callouts, then
   "matching on the number gets you to **one of two**". Pre-existing slice-1
   text, but edit 2's new Step 1 paragraph now leans on this trap by name, so the
   inconsistency became load-bearing. Corrected to "one of three", which is what
   the lesson itself says.
3. **`tests/test_tolerance_stack.py::test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry`.**
   The first loop guards `if src and …`; the second indexed
   `entries[ref]["values_source"]["kind"]` unguarded. Cannot fire today (the
   `pitch_link` fixture is frozen and refs only inline entries), but a
   `hardware_ref` to a `not_transcribed` entry — and `MS9363` is the named next
   document — would `TypeError` out of the test instead of failing it. Now
   `(… or {}).get("kind")`.

### Nits (not fixed)

4. **The suite now pins an inventory.**
   `test_every_inline_hardware_entry_cites_where_its_values_came_from` asserts
   `by_kind["spec"] == ["NAS6403U11D"]` and `len(by_kind["workbook"]) == 8`. That
   is a deliberate tripwire — four documents assert "eight of the nine" and they
   should move together — but SOP Step 4, which *requires* a hardware entry per
   standard part, doesn't warn the next author that adding one breaks a test. The
   lesson's own top follow-up (re-source `NAS6403U13H` / `NAS6403U14D` /
   `NAS6404U13D` from the standard already in the pile) will trip it. One
   sentence in Step 4 pointing at the assertion would close the loop the same way
   edit 8 closed it for `kind`. Left for whoever does that re-sourcing.
5. **`REVIEW_AGENT.md` was superseded mid-flight and the merge silently did the
   right thing.** The handoff branch was cut before `master`'s `13ace68`, which
   split `docs/prompts/REVIEW_AGENT.md` into a dispatch *overlay*. The handoff's
   version still opened "**This file *replaces* the canonical prompt**" and
   restated the canonical process — a statement `13ace68` made false. `ort`
   resolved to master's overlay form and dropped the restatement, the duplicated
   `Universal checks` section, and a reworded recurring-bugs entry; the handoff's
   two genuine additions (the `values_source` schema-hygiene bullet, the stale
   42-file count) both landed. **The outcome is correct and the lesson's claims
   about this file are all true post-merge** — but it was line-range luck, not a
   decision. No action; recorded so the next reader isn't confused by a lesson
   describing a header that isn't there.
6. **Lesson overclaims very slightly**: "Nothing was added at the top level"
   sits a few lines after the lesson itself refers to "the three … sections at
   5b/5c" — Step 5c *is* a new `##` section. Immaterial; the surrounding
   coherence argument is sound and I agree with its conclusion (no structural
   pass needed yet; Step 2's length and the 20-item trap list are the two things
   to watch).

## Checklist maintenance

No genuinely new failure class this review. Two second sightings, both already
on the list and both found nothing this time:

- *Stale inventory numbers in lessons and provenance* — this handoff actively
  hunted them (the 42-file count in three places, the pinned test count, the
  `hardware_entries.json` description) rather than adding any. I recomputed every
  count the branch asserts; all correct.
- *Documented vocabularies drifting from the seeded data* — the `role` list, the
  original sighting, is now closed in all three places, including a test. The
  checklist entry stays: it is still the right warning, it just has no open
  instance.

No entry added and none pruned. The checklist is doing its job as written.

## Note for the next reviewer

The SOP's 14 edits have been *applied* but not *followed*. The next from-scratch
stack is the real test, and its friction report is worth more than this one — a
point the lesson makes itself and I agree with. When that stack lands, check
whether Step 5c's budget-check shape and Step 2's zero-width-band rule survive
contact with a joint that wasn't the one they were written from.
