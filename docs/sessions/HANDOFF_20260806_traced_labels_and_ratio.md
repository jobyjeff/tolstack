---
priority: high
depends_on: []
---

# HANDOFF 2026-08-06 — traced_labels_and_ratio: fix three mislabelled `traced` elements, then make the headline ratio reproduce

Source: two issues, routed together by the 2026-08-06 triage sweep because the
second cannot be settled until the first moves the counts —
`docs/issues/ISSUE_20260804_three_seeded_elements_are_traced_but_their_bands_are_not.md`
(high) and
`docs/issues/ISSUE_20260805_architecture_traced_ratio_disagrees_with_the_stacks.md`
(low). Baseline: `master` @ `de7f7f1`. Scope: the three slice-1 stack JSONs, the
seeded worksheets, `ARCHITECTURE.md`, `WORKSHEET_pitch_link_to_pitch_plate.md`,
the SOP, and tests. Do NOT add or change any `export` / `joint` provenance field
(owned by the parallel staged handoff `citation_export_provenance`), and do NOT
touch `scripts/build_viewer_projection.py` or `apps/viewer/` (owned by
`viewer_generated_checks`).

## Part 1 — three elements claim `traced` while their own note says otherwise

`docs/prompts/REVIEW_AGENT.md` check 1 is explicit:

> a value from a parts-list part number, with the tolerance band coming from
> somewhere else, is **`inferred`** — not `traced`; … `traced` requires the
> actual band to be in the cited document.

Three seeded elements break that rule, and each says so in its own
`source_ref.note`:

| stack | element | `confidence` | its own note |
|---|---|---|---|
| `tan_link_to_pitch_plate` | `fastener_grip_14` | `traced` | *"The grip +/-.010 is untraced (NAS6403 spec absent)."* |
| `vpa_output_to_pitch_plate` | `fastener_grip` | `traced` | *"the +/-.010 in is untraced (NAS6404 spec absent)."* |
| `vpa_output_to_pitch_plate` | `under_head_chamfer_washer` | `traced` | *"the +/-.006 in band is untraced (MS21299 spec absent from this repo)."* |

All three cite `kind: "parts_list"`, document 217755. The parts list gives the
nominal in the nomenclature (`.875" GRIP`, `.812" GRIP`, `.063"`) and **no band**
in any of the three cases.

`traced` is the one label this whole repo exists to protect. These three are
*honest* — the note says the band is untraced — but the machine-readable field
says otherwise, and the field is what anything downstream reads.

**Two of the three can now be properly traced, free**, because `pitch_link_stack`
put `NAS6403-NAS6420 Rev 4.pdf` to work:

| element | fix |
|---|---|
| `fastener_grip_14` | re-cite to `NAS6403-NAS6420 Rev 4.pdf` sheet 3, row *Grip Dash No. 14* → grip **.875**, column header `Grip ±.010`. Verified by the `pitch_link_stack` reviewer in the same crop that confirmed dash 11. Stays `traced`, legitimately, with `kind: "spec"` |
| `fastener_grip` | same file, **NAS6404** column, dash 13 → grip **.812**, length **1.182**, `M .180/.160` |
| `under_head_chamfer_washer` | **MS21299 is not in the pile.** Downgrade to `inferred` and keep the band as a listed gap |

Verify each re-citation against the actual crop before writing it — do not take
this table on trust. It came from a review, not from the document, and "a text
layer is a locator, not a reading" is a checklist item here.

Then add a test asserting **no element carries `confidence: "traced"` with a
`kind: "parts_list"` ref** — or, if a parts-list *nominal* with a documented band
elsewhere is a case worth keeping, say so in the SOP and give it a distinct
shape. Decide, don't leave it implicit.

`check_result` is produced, not stored, so relabeling `confidence` changes no
arithmetic and no verdict. The seeded worksheets' ratio lines will need updating
with the JSONs.

## Part 2 — the headline ratio does not reproduce

`ARCHITECTURE.md` ("Known modelling gaps") states:

> The binding constraint on nearly every value is the **absence of a
> fastener-spec library**: 1 of 17 element instances across the three seeded
> stacks is `traced`.

and `WORKSHEET_pitch_link_to_pitch_plate.md` repeats it. Counting the three
slice-1 stacks (`tan_link`, `tan_link_take2`, `vpa_output`) as they sat on disk
on 2026-08-05:

| | count |
|---|---|
| element **instances** | **26** |
| distinct element ids | 18 |
| instances with a `hardware_ref` | 10 |
| `traced` | **4** |
| `inferred` | 6 |
| `untraced` | 16 |

Neither number in the claim reproduces: not the denominator (17 vs 26 / 18 / 10)
nor the numerator (1 vs 4). `PROVENANCE.md` records all three stack files as
byte-identical to their drawing-checker import, so this is not drift — the claim
either counted something no longer stated, or was wrong when written. The quoted
1 appears to be the count of values traced to a **part drawing or specification**
(only `pitch_plate_flange`, 215197), which is the honest number and is what
`test_the_only_traced_part_drawing_value_is_the_pitch_plate_flange` pins — but
nothing says so, so a reviewer who computes the ratio the checklist tells them to
compute gets a different number from every document in the repo.

**Recompute every figure in that table yourself after Part 1 lands** — it is
pre-Part-1 and will be wrong by construction once you relabel. Do not copy it
forward. ("Recompute any count a doc asserts; don't read it" is at three
sightings on this repo's checklist, and the worst variant so far was a count
about a projection the repo can recompute in one line.)

Then: decide what the denominator should be (instances is the most useful, and
matches what a reviewer sees per stack in the viewer), restate both numbers, and
say **which is which** — e.g. "N of 26 element instances across the three seeded
stacks are `traced`; M are `untraced`". Better still, define it in **one place**
and have the other documents reference that definition, so the next divergence
is impossible rather than merely unlikely.

Amend the same sentence everywhere it appears — `ARCHITECTURE.md`, the
pitch-link worksheet, the SOP, the seeded worksheets, both lessons — and **note
the correction** rather than silently editing a number a review already read.

## Definition of done

- The three elements carry correct `confidence` values, two re-cited to
  `NAS6403-NAS6420 Rev 4.pdf` with verified sheet/row/column, one downgraded to
  `inferred` with the band listed as a gap. Each re-citation verified by crop and
  the crop command recorded.
- A test fails if a `traced` element cites `kind: "parts_list"` (or the SOP
  states the exception and a test pins *that*).
- Every occurrence of the traced ratio in the repo states the same number, and
  that number reproduces from `docs/tolerance_stacks/*.json` by a command written
  into the lesson. `grep -rn "of 17" .` returns nothing stale.
- The definition of the ratio (what counts as traced, what the denominator is)
  lives in exactly one place and the rest reference it.
- Full suite green (`venv-win\Scripts\python.exe -m pytest -q`) with `master`
  merged in first, and the viewer's per-stack provenance scoreboard rebuilt
  against the main checkout so it agrees with the prose.
- Lesson (`docs/sessions/lessons/LESSONS_20260806_traced_labels_and_ratio.md`):
  the before/after counts, the definition adopted, and the correction note —
  including the fact that the repo's headline calibration figure was
  understated 4x for its first month and how that happened.
