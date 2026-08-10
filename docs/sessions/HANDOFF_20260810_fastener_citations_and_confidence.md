---
priority: medium
depends_on: [provenance_byte_identical_test]
---

# HANDOFF 2026-08-10 — fastener_citations_and_confidence: three slice-1 values are sourceable from a spec already on disk, and three more are `inferred` on workbook-only support — including the same bolt labelled two ways

Source: two issues, merged at triage 2026-08-10 because they name the **same two
`fastener_grip_13` instances** and both recompute the headline traced ratio:
`docs/issues/ISSUE_20260806_three_more_slice1_fastener_values_are_now_sourceable.md`
(`chore`/med) and
`docs/issues/ISSUE_20260806_inferred_on_a_workbook_only_citation_is_the_same_defect_one_notch_down.md`
(`bug`/med). The second issue says so itself: *"doing that issue first makes this one
smaller, and the two should probably be worked together."* Splitting them would move
the ratio twice for two reasons in two commits, which is exactly the mistake the
08-06 `traced_labels_and_ratio` merge was created to avoid.

Baseline: `master`, plus `provenance_byte_identical_test` merged.
`traced_labels_and_ratio`, `citation_export_provenance` and `spec_library_v0` are all
merged and completed. Scope: `docs/tolerance_stacks/` (the two `tan_link_to_pitch_plate`
stacks and `hardware_entries.json`), the seeded worksheets, `PROVENANCE.md`, and
every document quoting the traced ratio. Do **NOT** edit
`docs/SOP_TOLERANCE_STACK.md`'s `library_ref` sections — the staged
`sop_library_ref_pairing` owns those (see "Coordination").

**Why `depends_on: provenance_byte_identical_test`:** this handoff changes both
seeded stack JSONs and both seeded worksheets — files `PROVENANCE.md` declares
byte-identical, and precisely the rows that went false in sightings 4 and 5 of that
issue's five-sighting table. Landing the test first means **this handoff is its first
real proof**: the author gets a failure telling them to amend the row, instead of a
sixth reviewer catching it. Both handoffs also edit `PROVENANCE.md`. That ordering is
the whole point of mechanising the check, so do not invert it for convenience.

## Part 1 — three values that can be traced for free

`NAS6403-NAS6420 Rev 4.pdf` has been in `data/inbox/specs/` since founding (read it
at `C:\workspace\tolstack\data\inbox\specs\` — **gitignored, absent from your
worktree**). It is one document covering NAS6403 through NAS6420: **sheet 3** is a
grip/length table with a shared `Grip ±.010` column and one `LENGTH ±.015` column per
basic number; **sheet 1** carries the per-basic-number dimension table including `M`
(cotter-hole centreline to point) and `T (Ref)`; **sheet 2** is the CODE block and
notes.

| stack | element | today | what the document gives |
|---|---|---|---|
| `tan_link_to_pitch_plate` | `fastener_grip_13` | `inferred`, `kind: parts_list`, band from the workbook | sheet 3 row *Grip Dash No. 13*: grip **.812** under `Grip ±.010`, NAS6403 length **1.135** → `kind: spec` / `traced`, same values |
| `tan_link_to_pitch_plate_take2` | `fastener_grip_13` | `inferred`, `kind: workbook`, cell E52 | same row; take 2 is the same bolt as take 1 |
| `tan_link_to_pitch_plate` | `thread_transition` | `untraced`, `kind: assumed`, a 1/16 in rule of thumb | sheet 1 gives `T (Ref)` = **.323 in** for NAS6403 (grip end to point). **Not the same quantity** — `T` is the whole thread region, the allowance is the run-out inside it |

1. **Re-cite both `fastener_grip_13` instances** to `NAS6403-NAS6420 Rev 4.pdf` sheet
   3, verifying against a crop:
   `tests\debug_trace_stack_values.py --crop "3,140,190,70" --zoom 8` renders the
   dash-number rows. **The scan has no text layer, so a text search finds nothing and
   proves nothing** — read the crop.

2. **Decide `thread_transition` on the merits, and do not quietly relabel it.** `T
   (Ref)` is not the quantity the stack needs. Either derive the allowance from sheet 1
   with the reasoning written into the element's note, or leave it `untraced` and say in
   the note that the standard does not give this quantity directly. Note it is
   currently **the single most pessimistic term in the tan-link shank-out checks** (its
   "nominal" is its maximum, min is 0), so a change here moves a check result, not just
   a label — report the before/after.

3. **Backfill `hardware_entries.json`, which now disagrees with the stacks it
   serves.** `NAS6403U14D` and `NAS6404U13D` still carry
   `values_source: {kind: "workbook", confidence: "untraced"}` while the stack elements
   citing those part numbers have been `traced` to the standard since 2026-08-06.
   Fixing it moves the file's own prose counts ("THREE entries are traced",
   "1 traced / 0 inferred / 8 untraced out of 9") **and the tests that pin them**.

## Part 2 — three elements `inferred` on workbook-only support

`docs/SOP_TOLERANCE_STACK.md` is explicit: *"a value whose only support is 'the source
workbook says so' is `untraced` — no matter how reasonable it looks."* Three element
instances violate it:

| stack | element | `kind` | `confidence` | its own `source_ref.note` |
|---|---|---|---|---|
| `tan_link_to_pitch_plate` | `washer_thin` | `workbook` (E11) | `inferred` | *"The parts list says .032 MIN; the workbook models it as .032 +/-.004. The NAS1149 standard is not in this repo, so the +/-.004 is untraced."* |
| `tan_link_to_pitch_plate_take2` | `straight_bushing` | `workbook` | `inferred` | — |
| `tan_link_to_pitch_plate_take2` | `fastener_grip_13` | `workbook` (E52) | `inferred` | — |

Each is defensible as a *judgement* — the parts list corroborates the part's existence
and its nominal — but none says so in the field a consumer reads, and **the first
one's note explicitly ends "the +/-.004 is untraced"**. That is the exact shape the
08-06 correction was about, one notch down: `test_no_traced_element_cites_a_parts_list`
closes the `traced` + `parts_list` hole and nothing guards this one.

**The sharpest version: the same bolt is labelled two different ways in two stacks of
the same joint.** `fastener_grip_13` is `kind: parts_list`/`inferred` in
`tan_link_to_pitch_plate` and `kind: workbook`/`inferred` in
`tan_link_to_pitch_plate_take2`. Take 2 is a restatement of take 1, so one of the two
is wrong about where the number came from. Part 1's deliverable 1 resolves this
instance by re-citing both to the spec — **do that first and this row disappears**,
which is why the issues were merged.

4. **Decide `washer_thin` and `straight_bushing`, per element.** Either the support
   really is the parts list (then `kind: parts_list`, and cite the balloon the way
   `tan_link:fastener_grip_13` does), or it really is only the workbook (then
   `untraced`, and it joins the gap list). **Do not split the difference.** The SOP's
   one hard rule is that `untraced` must appear on the gap list, so an element
   labelled `inferred` on workbook-only support is a value that has quietly left it.

5. **Consider mechanising the corner.** The rule the repo actually wants is
   *"`confidence` must be consistent with `kind` and with the `source_ref.note`"*, and
   only the `traced`/`parts_list` corner is mechanised. A test asserting
   `kind == "workbook"` ⟹ `confidence == "untraced"` states this corner. Prototype it
   and report — the note-vs-field half is not mechanisable and stays a review check
   (`docs/prompts/REVIEW_AGENT.md` check 1), so say in the lesson what the test does and
   does not cover.

6. **Recompute the ratio last, once, after Parts 1 and 2 are both settled.**
   `tests\debug_report_tolerance_stacks.py --ratio`, then update **every** document that
   quotes it — the list and the rule are in `docs/SOP_TOLERANCE_STACK.md` § "The traced
   ratio". The doc-level test will fail until you do. These three `inferred` elements are
   3 of the seeded stacks' 7, so the move is not small.

## Coordination

`HANDOFF_20260810_sop_library_ref_pairing` (staged, `bug`/med) edits
`docs/SOP_TOLERANCE_STACK.md` at lines 66, 409, 442–445, 691 and 743 — the
`library_ref` sites. **Deliverable 6 edits the same file's § "The traced ratio".**
Different sections, no `depends_on` set in either direction, but whichever lands
second will rebase across the other: check the ratio section survived, and do not
"tidy" the `library_ref` prose while you are in there.

## Definition of done

- Both `fastener_grip_13` instances cite `NAS6403-NAS6420 Rev 4.pdf` sheet 3, with the
  crop that verifies it named in the lesson; the same bolt has the same provenance
  shape in both stacks.
- `washer_thin`, `straight_bushing` and `thread_transition` each have a stated
  decision and a note that matches the field. No element is left `inferred` on a
  `kind: workbook` `source_ref` unless you argue explicitly why the SOP's rule does not
  apply to it.
- `hardware_entries.json` agrees with the stacks it serves; its prose counts and the
  tests pinning them are updated in the same commit.
- The ratio is recomputed **by you, not copied**, and every document quoting it agrees.
  Report before/after.
- The shank-out check results are reported before/after for `thread_transition` — a
  label change that silently moves a check result is the failure mode here.
- `PROVENANCE.md` rows amended for every file this touches that claims byte-identity.
  The test from `provenance_byte_identical_test` must be green; if it fires, that is
  the mechanism working, not an obstacle.
- Full suite green. `venv-win` is gitignored — run
  `& C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` against your
  worktree's code.
- Lesson (`docs/sessions/lessons/LESSONS_20260810_fastener_citations_and_confidence.md`):
  the per-element decisions and reasoning; the `kind == workbook` test's coverage
  boundary; and the pattern the source issue named, which is the durable part —
  **"a document arriving in `data/inbox/specs/` does not re-cite anything by itself, and
  nothing in the repo notices that it could."** A sweep asking "for every
  `untraced`/`inferred` element, is the document that would close it now in the pile?"
  would have caught all five of these at once. Say whether that sweep is worth building
  and, if so, file it.
