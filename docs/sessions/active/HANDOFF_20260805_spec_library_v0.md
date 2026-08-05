---
priority: medium
depends_on: []
---

# HANDOFF 2026-08-05 — spec_library_v0: event-sourced structured spec library, first entries from the standards already read

Source: promotion of `dispatch/docs/strategy/drafts/DRAFT_spec_sheet_pipeline.md`
(Jeff approved 2026-08-05; trigger met — the pitch_link_stack lesson restated
its gaps as a 12-row spec-intake queue, and NAS6403 has now been read by hand
in two sessions with a third read of the same file queued for the VPA joint).
Baseline: `master` with `pitch_link_stack` merged. Scope: new library code +
`data/` layout + tests; do NOT touch `docs/SOP_TOLERANCE_STACK.md`,
`docs/prompts/REVIEW_AGENT.md`, or `hardware_entries.json`'s existing entries
beyond deliverable 4 (a parallel staged handoff `sop_edits_apply` owns those);
never reorganize/rename anything in `data/inbox/specs/` (append-only).

**Worktree reality:** the spec pile exists only in the main checkout — read it
at `C:\workspace\tolstack\data\inbox\specs\` (42 files; from a worktree the
tracked README is all you'll see). Cite repo-relative.

## The design (from the draft, matured)

- **Parses are events, not edits.** One immutable parse event per
  (document, parser-version): suggested `spec-parse/v0`, envelope-shaped,
  carrying the structured extraction + who/what parsed it (agent-manual is
  parser v0 — see below) + per-value `source location` (sheet/page, table,
  row/column or note letter). Corrections are later events (same disposition
  culture as everything else). The **library projection** folds
  latest-per-document (field-level provenance preserved), wipe-and-rebuild.
- **Parser v0 is an agent, not a pipeline.** These are photocopied PDFs with
  no text layer; the working recipe is in the pitch_link lesson (fitz
  `get_pixmap(Matrix(2.2))` per page, `Matrix(6..8)` + `clip` per table
  region; read the notes sheet BEFORE the dimension table). PyMuPDF is
  deliberately not in this repo's requirements — run renders via
  drawing-checker's venv per the existing `debug_trace_stack_values.py`
  precedent. Automated vision extraction is a later increment; do not build
  it.
- **Every extracted value is reviewed like a stack**: the second-agent
  review (dispatch review flow) checks values against the renders — a
  library that launders misreads is worse than no library.

## Deliverables

1. **Schema + fold + tests.** `spec-parse/v0` event shape, the library
   projection, value-level tests (exact numbers from fixtures).
2. **First entries: the documents already consumed.**
   `NAS6403-NAS6420 Rev 4.pdf` — the NAS6403 values pitch_link traced (grip
   ±.010 w/ sheet-2 note (a) definition; cotter-hole `M .174/.154`, drill
   `P .080/.070`, note (j); the CODE block decode; `T (Ref) .323`; note that
   thread run-out is NOT in the standard — record absences too, they are
   what the SOP's gap discipline consumes) **plus the NAS6404 dash-13 row**
   (grip .812, length 1.182, M .180/.160, P .086/.076 — the pitch_link
   lesson's row 9, "free, one table row away", unblocks the VPA stack).
   JPS00094 Rev C is criteria-not-dimensions: capture the three sections
   stacks cite (§5.5.3.a, §5.5.5, §5.9.7) as quoted-criterion entries.
   **Plus `MS9363 Rev C.pdf` — Jeff dropped it into the pile 2026-08-05**
   (his warning: "another awful photocopy, good luck"). It is intake-queue
   rank 1: extract nut height, slot count, and slot depth for the `-09` and
   `-10` dash numbers — the thread-start-to-castellation geometry that
   governs every cotter-retained joint in the repo. If a value is genuinely
   illegible after the render recipe, record it as unreadable-with-crop
   rather than guessing — an illegible photocopy is an acquisition gap
   (better scan), not a license to infer.
3. **The intake queue becomes tracked state.** The 12-row table in
   `LESSONS_20260804_pitch_link_stack.md` ("Gap list, in spec-library-intake
   form") — encode it (in-pile / missing / entered, what each unblocks) so
   "what document closes which gap" is a query, not a lesson archaeology
   dig. MS9363 is rank 1 and is NOT in the pile — acquisition is Jeff's,
   surface it as a gap, don't fake it.
4. **Demonstrate the consumer seam on ONE entry:** fill `library_ref` on the
   `NAS6403U11D` hardware entry so its inline values demote to a
   cross-check (the slice-1 lesson's designed seam: "zero rework on the
   stack side"). Only that entry — the rest belong to `sop_edits_apply`'s
   backfill.

## Definition of done

- Library projection rebuilds from events; NAS6403/6404 values above appear
  with exact per-value source locations; a deliberate correction event
  demonstrably wins the fold.
- Intake queue queryable; MS9363 shows `in pile → entered` (it arrived
  2026-08-05); NAS1149 + MIL-S-8879 + MS21299 show `missing`.
- Suite green; review launched via dispatch flow after merge (standing
  tolstack rule).
- Lesson: schema decisions (per-family table vs per-document extraction —
  the draft left it open; record what you chose and why), time-per-document
  actually spent (calibrates whether automated vision is ever worth it),
  and any value you could not read from the photocopy. Also state plainly
  whether the MS9363 entries suffice to COMPLETE the pitch_link stack's
  `INCOMPLETE` shank-out checks — actually completing that stack is a
  follow-up handoff, not yours (stack JSONs are out of scope here), but
  your lesson is what triggers it.
