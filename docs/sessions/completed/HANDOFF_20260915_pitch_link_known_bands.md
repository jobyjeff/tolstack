---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-15 — pitch_link_known_bands: apply the recorded bushing and washer bands; the no-workbook experiment is over

Source: Jeff's 2026-09-15 review (forge note `20260915T145908_fwc7qp`): "the
tolerance stack notes zero width band (4.7625+/-0?) but I just opened the
drawing and it's very clearly 4.76 +0/-.13. The last row (washer) also shows
zero band which Im certain is incorrect." The note's third attachment is his
screenshot of the 214820-002 drawing, SECTION A-A, callout `4.76 +0.00/-0.13`
circled. Baseline: `master` @ `3141e51`. Scope: this session owns
`docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json`,
`WORKSHEET_pitch_link_to_pitch_plate.md`, `hardware_entries.json` notes, the
pinning tests, and one scoped SOP amendment (below). Do NOT touch the viewer
(`apps/`), other stacks' JSON, or `data/inbox/specs/` (append-only; no spec
file exists to add yet).

## Context — why the bands are zero-width, and why that ends now

The zero-width bands were **not** an extraction error. The values Jeff wants
have been in the repo since founding — `hardware_entries.json` entry
`214820-002` carries `length_min: 4.63 / length_max: 4.76` and entry
`NAS1149V0332` carries `thickness_tol: 0.1016` (±0.004 in), both from Jeff's
own workbook (`data/inbox/tolerance_stacks/260729_sample_tol_stack.xlsx`,
cells E7/G7/H7 and E11/F11, `confidence: "untraced"`). The pitch-link stack
refused to use them because (a) Jeff's founding note for that stack said
"there will be no excel sheet to cheat off of" — it was a deliberate
from-scratch experiment — and (b) `docs/SOP_TOLERANCE_STACK.md` Step 5b
(:879-893) bans laundering workbook values through hardware entries, naming
this exact element at :893. The sibling stacks (`tan_link*`, `vpa_output*`)
use these same bands openly. **Jeff has now adjudicated it from the drawing
itself**: 4.76 +0/−0.13 is real, the zero-width rendering is wrong for these
elements, and the same part must not carry a real band in one stack and ±0
in another. He ratified the general shape in his 2026-09-15 follow-up:
"include the worksheet values but then very loudly (via badges etc) announce
that that line item, and the entire study is incomplete/unverified" — the
loud badging is `viewer_study_verdicts_and_gaps`' deliverable; this
handoff's job is to make sure the data those badges read (per-element
confidence, unverified-source markers) is present and correct in the stack
JSON and survives into the viewer projection.

## Deliverables

1. **Bushing 214820-002 plain-bushing length gets its band**: min 4.63 /
   max 4.76 (store lengths; transcribe, never fold). Reconcile the nominal
   honestly: the stack carries 4.7625 (= .1875 in exactly), the drawing
   callout is 4.76 +0/−0.13 — record what each source says in the element's
   citation trail and pick the drawing's form for the stored values, since
   the drawing is now the adjudicated source. `source_ref` cites the
   hardware entry AND Jeff's 2026-09-15 drawing reading (note
   `20260915T145908_fwc7qp`, attachment 3 — an operator-verified callout;
   the drawing PDF itself is still not in `data/inbox/specs/`, so
   `confidence` stays honest (`untraced`/operator-confirmed wording in the
   note field), and the ranked gap for acquiring the 214820-002 drawing
   STAYS OPEN — reworded from "no band known" to "band operator-confirmed;
   drawing not yet in repo".
2. **Washer NAS1149V0332 thickness gets its band**: 0.8128 ± 0.1016
   (0.7112 / 0.9144), same citation treatment (workbook cells E11/F11), gap
   4 reworded the same way.
3. **The pinning tests move with the data.** The SOP says a test pins the
   zero-width bands so a tidy-up cannot fill them in — this is that
   deliberate, cited change: update the pins to the new values, cite this
   handoff in the test comment.
4. **Worksheet + stack-level notes updated**: the "every worst-case interval
   is a LOWER bound" caveat now applies only to whatever zero-width inputs
   remain (if none remain in this stack, remove it); check results
   recompute; `complete`/`excluded_terms` on the two checks are unchanged
   (the spherical-bearing exclusion is a separate, still-open gap — do NOT
   invent that element here).
5. **SOP amendment — the placeholder policy** (`docs/SOP_TOLERANCE_STACK.md`,
   dated amendment blocks at Step 5b AND Step 5c): Jeff's 2026-09-15 ruling,
   quoted for the record: "it's ok to use unverified numbers as placeholders,
   but they need to be very loudly identified as unverified/incomplete.
   Current design omits them entirely and then fails silently which is worst
   of both worlds."
   - Step 5b: the pitch-link no-workbook experiment concluded 2026-09-15 by
     operator verdict. A value recorded with provenance (workbook cell,
     catalog, operator statement) MAY be applied to a stack element with its
     true confidence carried and displayed; the same part+feature must carry
     the same band in every stack that uses it.
   - Step 5c: "never create a placeholder element" is **rescinded** for the
     case where a sourced-but-unverified value exists — include the member
     with those values marked unverified rather than omitting it;
     omission + `excluded_terms` remains only when literally no number
     exists anywhere. (The member *additions* themselves are
     `stack_fable_audit`'s work, not this handoff's.)
   - Untouched: the core prohibition on inventing values from training-data
     recall. A placeholder still needs a named source; it just doesn't need
     a verified one. Do not restructure the SOP (a strategy brief owns that).

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q` green; the recomputed shank-out
  and cotter-hole totals are pinned at their new values (state them in the
  lesson with the before/after deltas).
- Rebuilt viewer projection (main checkout, `--data-root
  C:\workspace\tolstack\data`) shows both elements with real min/max and no
  zero-width chip.
- A cross-stack consistency test exists: for 214820-002 length and
  NAS1149V0332 thickness, every stack using the part carries the same band
  (value-level, naming the stacks).
- Lesson: before/after totals, the nominal-reconciliation choice, and any
  friction with the SOP amendment wording.
