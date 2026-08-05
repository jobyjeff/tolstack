# Lessons — sop_edits_apply (worked 2026-08-05)

Handoff: `docs/sessions/completed/HANDOFF_20260805_sop_edits_apply.md`.
Branch: `handoff/sop_edits_apply`, cut from `master` at `d48fcd8`.

Apply the 14 SOP edits `pitch_link_stack` proposed on 2026-08-04, backfill
`values_source` across the hardware entries, and say whether the SOP still reads
as one document afterwards. A cheap application pass, as promised — no stack was
built and no value was sourced here.

## What landed

| commit | |
|---|---|
| `61e7386` | the 14 edits in `docs/SOP_TOLERANCE_STACK.md` (+197 lines) |
| `7aa4d9e` | `values_source` on all 13 hardware entries + 3 tests, and the doc rows that go with it |
| *(this one)* | the `role` vocabulary's third place, both issues closed, this lesson, handoff → `completed/` |

**All 14 edits are applied. None was rejected.** 58 tests green (51 at the
start). One edit — 10 — needed nothing, because the `pitch_link_stack` reviewer
had already applied it inline; details below.

## Edit-by-edit: what changed in wording, and why

Where an edit is not listed, the lesson's proposed wording went in essentially
verbatim, adjusted only for the surrounding sentence.

- **1 (spec pile lives in the main checkout)** — verbatim, plus one thing the
  proposal did not ask for: the *"42 files"* in the sentence being replaced is
  now 64 and would have been wrong again by the next handoff, so the count is
  gone entirely (*"several dozen files and it grows; `ls` it rather than trusting
  any count written down"*). Same reasoning as edit 13's first item, applied to
  the sentence edit 1 was already rewriting.
- **2 (identity by counting)** — verbatim, plus a worked-example paragraph
  pointing at `pitch_link_to_pitch_plate`'s `joint.identification_note`. The
  proposal listed five counts in the method and then said *"four independent
  counts agreeing"*; the stack's own note gives four numbered corroborations, so
  the example names those four and the method keeps the full list of places to
  look. Not a contradiction — one of the five (the place count in the view) is
  how the balloon prefix is read, not a separate document.
- **3 (limits-only nominal)** — verbatim, under a bolded lead-in
  (*"When the source states limits only"*) so it reads as a case of the rule
  above it rather than a reversal of it.
- **4 (Step 5c) + 14 (which end binds)** — merged into one new section, as the
  proposals intended: edit 14 is written as *"Step 5c, new bullet"*, so it is the
  fifth bullet. The worked example (−8.1939 … −7.4859 mm, and the 0.708 mm
  understatement in the first draft) moved out of the bullet list into a
  following paragraph, because it is evidence for the whole section and not for
  one bullet.
- **5 (zero-width bands)** — verbatim, as its own subsection at the end of Step 2
  rather than a paragraph inside the `source_ref` subsection, and with a
  cross-reference to the RSS caveat that edit 9 adds. The two edits describe the
  same failure from opposite ends and neither proposal mentioned the other.
- **6 (transitive workbook ban)** — the Step 5b table row is verbatim. The
  proposal's *"plus a bold sentence in Step 4"* became two bullets in Step 4's
  rule list, because the field it depends on (edit 7's `values_source`) had to be
  documented there anyway, and one sentence could not both introduce the field
  and state the ban.
- **7 (`values_source`)** — applied as a real schema requirement, not a
  provisional field. See the next section for the one design decision it needed.
- **8 (kind list in three places)** — verbatim, plus one sentence extending it to
  the `role` list, which the SOP was still describing as drifted (*"stack.py's
  comment predates it and lists only the first seven"*). Making that sentence
  true was cheap: `StackElement.role`'s comment gained `nut_geometry` and
  `test_element_role_comes_from_the_documented_vocabulary` is now the third
  place. This is the original sighting of the drift class edit 8 is about, and
  leaving it as a documented defect while adding a rule against it would have
  been odd.
- **9 (RSS's third kind)** — verbatim, plus the worksheet's fourth case
  (`bolt_length_11` and `bolt_grip_11` are not independent, because
  `T = length − grip` is a reference dimension) as a following paragraph. The
  lesson recorded it immediately under edit 9 as *"a fourth, narrower one"* but
  did not write it as a bullet; it is a limitation of `fold()`, not a fourth
  member of the list, so it sits outside the bullets.
- **10 (REVIEW §3's `max == mmc` exit)** — **already applied.** The
  `pitch_link_stack` reviewer fixed it inline in `6a5ce62`, and
  `docs/prompts/REVIEW_AGENT.md` §3 has carried the earned-exit paragraph since.
  Verified word for word rather than re-applied; the reviewer's version is
  stronger than the proposal (it requires the reviewer to *confirm* the absence
  by looking for a chamfer/relief/counterbore, and to check the negative signs).
  Not a rejection — an edit that landed before this handoff existed.
- **11 (zones expire between exports)** — verbatim, as a `source_ref` bullet, and
  named the field the pitch-link stack actually used for it (`joint.assembly_export`)
  so the instruction points at a live example. Step 1's zone bullet and Step 3's
  zone trap both gained a pointer to it — a warning in one step about a value
  written down in another is worth two cross-references.
- **12 (balloon `nX` prefixes)** — verbatim as the fourth Step 3 trap.
- **13 (the three small ones)** — all three. The test count is gone from Step 0
  with a sentence saying why no number belongs there; the 215197 fixture path and
  the "run directories hold page images and extracted JSON, not always the PDF"
  warning are a new **Where the PDFs are** block under Step 3 item 2; `--crop` is
  a block beside it, framed as the Step 1 tool it is.

Two extras came from the issue that tracked this work
(`ISSUE_20260804_apply_the_sop_friction_report.md`), not from the lesson, and
both are applied: **Step 0's pinned test count** (same as 13's first item) and
**217755 sheet 4's printed border range**, corrected from `A–L × 2–15` to
`A–L × 1–16` with an instruction to read the border ticks rather than assume a
range.

Beyond the 14, the quick-reference trap list gained **six** entries (15–20) for
the new material. That list calls itself *"the traps, in one list"*, so a trap
added to Step 3 and missing from the list is the same drift the repo keeps
filing bugs about.

## `values_source`: one decision the proposal left open

Edit 7 says *require it whenever `values_status == "inline"`*. Nine entries are
inline; **four are `not_transcribed`** and hold no values at all. The handoff's
definition of done says all 13 carry the field, and a `values_source` on an entry
with no values would be a citation with no content.

Both are satisfied by an **explicit `null`** on those four — the `library_ref`
convention already in this schema, so *"nothing to cite"* reads differently from
*"nobody filled it in"*, which is precisely the ambiguity the issue said the
half-landed field was creating. The test asserts the key is present on all 13,
non-null exactly when `values_status == "inline"`, `source_ref`-shaped (keys a
subset of `SourceRef`'s — which is how the stray `sheets` key on `NAS6403U11D`
turned up and got renamed to `sheet`), and carrying a valid kind, confidence and
document.

The other decision, asked in the issue: **`hardware_entry` stays `/v0`.** The
field is additive, every reader of this file is in this repo, and nothing breaks.

**Every cited cell was re-read out of the workbook** with
`tests/debug_dump_tol_stack_xlsx.py`, not copied from the stack JSONs — which
matters, because the stacks cite the *element's* source and the entry needs the
*value's*. Three of the eight came out differently than a copy would have:

- `MS21299C4K`'s band is workbook row 67 (`=(0.057)*25.4` / `=(0.069)*25.4`),
  but the workbook names MS21299C4K at **I64**, the spherical-bearing row — the
  comments column is a loose hardware list, not row-aligned (slice-1 F5). So even
  attributing that band to this washer is a reading, and the entry now says so.
- `214820-002`'s `dimensions_mm.length` is `4.7625` = the parts list's .1875 in
  × 25.4 exactly, while the workbook's own `E7` is the hand-typed literal
  `4.762`. Two different numbers for the same feature, both kept, now
  distinguishable.
- `NAS77A4-015`'s three values are hand-typed literals with no inch source and no
  formula behind them anywhere in the sheet, and the part is absent from the
  parts list — nothing corroborates any of it.

Mixed-provenance entries are cited **at their weakest**: where a parts-list
nomenclature corroborates the nominal but the band is the workbook's, the entry
says `kind: "workbook"`, `confidence: "untraced"`, and the note says which is
which. Eight of nine inline entries therefore now say *workbook* out loud. That
is the deliverable, not a blemish on it: Step 5b's transitive ban is only
checkable if the entries admit what they are.

And it is now checked, not just documented:
`test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry` asserts
that where `pitch_link_to_pitch_plate` points at a workbook-sourced entry it
takes the parts-list nominal and **not** the band, so the element is zero-width —
with a second assertion that the two such elements are exactly
`bushing_214820` and `washer_nas1149v0332`, so the test cannot pass vacuously if
a future stack stops using those entries.

## Does the SOP still read as one document?

It accreted 197 lines across nine insertion points and is now 704 lines.
**It is coherent, and it does not need a structural pass yet** — but the reason
is worth stating, because "not yet" is doing work in that sentence.

What holds it together is that every edit landed inside the step that already
owned its subject, and each new rule points at the worked example that produced
it. Read cold, the order still tells a story: bound the joint (1), write the
elements (2), trace them (3), file the hardware (4), fold and check (5), and the
three "what if the world is not tidy" sections at 5b/5c. Nothing was added at the
top level, and no step now contradicts another; the two edits that *could* have
collided — zero-width bands in Step 2 and the RSS caveat in Step 5 — were
cross-referenced instead.

Two strains to watch, neither yet a defect:

1. **Step 2 is now the longest step by a distance** — element shape, LMC/MMC,
   nominal (two subsections), `source_ref` (four bullets, one of them a
   five-line warning about exports), and zero-width bands. If it takes another
   edit, split it: *element shape* / *sourcing an element*.
2. **The traps live in three places** — Step 2's warnings, Step 3's four traps,
   and the 20-item quick-reference list. That list is now long enough that it is
   a second document rather than a reminder, and it duplicates prose that has
   grown since it was written. The next structural pass should decide whether it
   is an index (pointing at sections) or a checklist (standing alone), because it
   is currently drifting toward being both.

The one thing a next author should know that the SOP still cannot tell them: it
has been *applied* once (this handoff) but not *followed* since it was edited.
The next from-scratch stack is the real test of these 14 edits, and its friction
report matters more than this one.

## Adjacent fixes, and why each was in scope

Applying the edits made four other statements in the repo false. All four are
fixed here, and all four are the "stale doc claim" class the review checklist
already tracks:

- `hardware_entries.json`'s own `description` still said *"none of them come from
  a fastener standard document, because no NAS/MS standard PDF exists in this
  repo"* — untrue since 2026-08-04.
- `PROVENANCE.md`'s three amended rows (`hardware_entries.json`, the test file,
  `stack.py`), all changed again by this handoff. Its spec-pile row also now says
  in words that *"42 files, 111,575,456 bytes"* pins the **move**, not the current
  contents (64 files / 249,105,891 bytes today) — a reader counting the directory
  would otherwise read append-only growth as a falsified provenance claim.
- `data/inbox/specs/README.md` listed **MS9363** as still missing and blocking.
  `MS9363 Rev C.pdf` landed in the pile on 2026-08-05, so it moved to the
  have-it table (marked *not yet read by any stack*), MIL-S-8879 was added to the
  blocking list, and the paragraph now says to `ls` before concluding a document
  is absent. No file in the pile was renamed, moved, or removed — only the
  tracked README changed.
- `docs/prompts/REVIEW_AGENT.md` carried the same stale 42-file count, and its
  schema-hygiene list had no `values_source` item. Both fixed; the new item tells
  a reviewer to *use* the field, not just check it is present.

## Follow-ups this handoff deliberately did not do

- **Re-source `NAS6403U13H`, `NAS6403U14D` and `NAS6404U13D` from the standard.**
  All three carry a workbook `±.010` grip band, and `NAS6403-NAS6420 Rev 4.pdf`
  — already in the pile — has the grip/length table for every dash number, with
  NAS6404 in the same file. `NAS6403U11D` shows exactly what a re-sourced entry
  looks like. Each entry's `values_source.note` now says this in place. This is
  spec-library intake work, not SOP-editing work, and it needs someone to read
  the photocopy.
- **`MS9363 Rev C.pdf` is unread.** It landed the day this handoff ran and it is
  the document that governs both cotter-retained joints (nut height, slot count,
  slot depth). Nothing here opened it.
- **`ISSUE_20260804_three_seeded_elements_are_traced_but_their_bands_are_not`**
  stays open. It is about element `confidence` values in the seeded stacks, not
  about hardware entries, and `values_source` does not settle it — though it now
  gives a reviewer the evidence to argue it entry by entry.
- **The 215197 revision question** (only a `[PRELIM 2025-MAY-22]` export exists,
  in drawing-checker's fixtures) is unchanged; Step 3 now says where that file is
  rather than pretending it is somewhere better.

Closed by this handoff: `ISSUE_20260804_apply_the_sop_friction_report` and
`ISSUE_20260804_hardware_entry_values_source_not_backfilled`.
