# STRATEGY BRIEF 2026-08-12 — spec_pile_citation_identity: four `traced` citations name no bytes, and the rule that makes that correct is unstatable

> **EXPANDED 2026-08-13 (strategy session) — consumed.** Decision: option 2
> in its narrow reading — kind-aware rendering derived from the crop's
> `resolved_by: spec_pile`, hoisted to the citation row; NO enum/vocabulary
> change (so no dependency on `js_python_vocabulary_pairing`); no export
> block on the four (preserves the 08-06 exception). Staged:
> `docs/sessions/HANDOFF_20260813_spec_citation_identity_rendering.md`.

**Routing note.** `docs/issues/ISSUE_20260812_four_traced_spec_citations_carry_no_export_block.md`
is `type: bug`, `priority: med`, which routes tactical by default — but it
carries `audience: strategy` and offers two mutually exclusive resolutions plus
"doing neither is also defensible". Per `TRIAGE_AGENT.md`'s decomposition test,
a change to what a provenance vocabulary can *say* is a design call, not a
single-scope fix. Triage has **not** chosen between the options. What follows is
the case, the measurement, and the questions decomposition has to answer.

## The problem in one sentence

The spec pile's identity rule — *for these documents the filename identifies the
bytes* — is currently statable only inside a **crop entry**, never on the
citation itself, so four citations render as `traced` beside "nothing here
identifies the bytes" and both halves are true.

## The measurement

Recomputed from `data/projections/viewer/results.json`, 2026-08-12
(**main-checkout path**, `C:\workspace\tolstack\data\projections\viewer\results.json`
— gitignored, absent from any worktree):

| citations | 48 |
|---|---|
| `export.status: "established"` | 22 |
| no `export` key at all | 26 — 21 `workbook`, 1 `assumed`, **4 `spec`** |
| `export.status: "unestablished"` | 0 |

The four:

* `tan_link_to_pitch_plate:fastener_grip_13`
* `tan_link_to_pitch_plate:fastener_grip_14`
* `tan_link_to_pitch_plate_take2:fastener_grip_13`
* `vpa_output_to_pitch_plate:fastener_grip`

All four are `confidence: "traced"`. All four resolve a crop by `spec_pile`. The
other 22 no-export citations are `workbook`/`assumed`, where there is no exported
PDF to name at all — those are uncontroversial.

## Why it is a design question and not a data fix

Since `citation_export_provenance` (2026-08-06) this repo's stated position is
that **a drawing number plus a revision does not identify bytes**. The spec
pile's filename-identity rule is the deliberate exception. So:

- the four citations are *not wrong*; the spec pile is append-only and identity
  there really is the filename;
- but the viewer now renders `traced` and "this citation names no exported file"
  side by side, and a reader has no way to learn that the pair is legitimate
  here and alarming everywhere else;
- and the fact that makes it legitimate lives on the **crop** (`resolved_by:
  "spec_pile"`), one hop away from the row the reader is looking at.

That is the same "a fact about the citation is reachable only through a crop"
shape `ISSUE_20260811_viewer_shows_nothing_for_source_ref_export` was filed for
and `viewer_export_and_material_provenance` (2026-08-12) fixed one instance of.
Second sighting of the shape — worth naming as such during decomposition.

## The two candidate resolutions, and the third

1. **Give these citations an `export` block** naming the spec-pile PDF and its
   sha256, the way a `drawing` citation does. Cheap and uniform. But it asserts
   an exported-file identity for a document whose identity rule is deliberately
   *different*, which quietly erases the exception this repo argued for on 08-06.
2. **Let `SourceExport` (or the citation) carry the spec-pile rule explicitly** —
   a third `status`, or a `kind`-aware sentence — so `traced` + "no bytes
   identified" stops being a reachable pair. Honest, but it widens an enumerated
   vocabulary that is currently two values (`established` / `unestablished`,
   `tolerance_stack/stack.py`) and hand-copied into `VA.EXPORT_STATUSES`
   (`apps/viewer/viewer.js`).
3. **Neither** — decide the pair is acceptable and say so where a reader of the
   row can find it. Defensible, and cheapest, but it must be written down
   *somewhere the viewer surfaces*, not only in a lesson.

## Questions decomposition has to answer

1. **Does option 2 widen the vocabulary or the type?** A third `status` value is
   a vocabulary change; a `kind`-aware sentence rendered from the existing two
   values is not. These have very different blast radii and the issue conflates
   them.
2. **What happens to the 21 `workbook` and 1 `assumed` no-export citations?**
   Whatever rule is chosen, check it against those 22 before implementing —
   option 2's "third status" is tempting to apply to all 26, which would be a
   much larger claim than the issue makes.
3. **`unestablished` has zero live instances.** Adding a third status to a
   two-value enum whose second value has never occurred in data is a design smell
   worth pausing on. Is `unestablished` in fact the right home for the spec-pile
   case, with a better `why`?
4. **Sequencing against `js_python_vocabulary_pairing`.** If decomposition lands
   on option 2, the resulting handoff changes an enumerated vocabulary that is
   defined in Python and hand-copied into JavaScript. `docs/sessions/HANDOFF_20260812_js_python_vocabulary_pairing.md`
   (staged the same day) adds the test that pairs those two copies. **Land the
   pairing test first** — otherwise the new status is added to Python, forgotten
   in the JS table, and surfaces as the loud `unlabelled` block on a real
   reader's screen, which is exactly the failure that handoff exists to prevent.
   Say so in whatever handoff decomposition produces.

## Where it is already written down

`docs/sessions/lessons/LESSONS_20260812_viewer_export_and_material_provenance.md`,
"Left for the next agent" — the issue was filed to lift it out of a lesson,
because nothing scans lessons.
