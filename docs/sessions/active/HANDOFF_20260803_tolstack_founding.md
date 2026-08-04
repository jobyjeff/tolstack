---
priority: high
depends_on: []
---

# HANDOFF 2026-08-03 — tolstack_founding: migrate the tolerance-stack assets, write the SOP and the review checklist

Source: Jeff's atomic note `20260803T153839_cwzuzq` + strategy session
2026-08-03 (Jeff locked: found the repo now; **move** the specs folder,
**copy** everything else). This repo was stamped from forge `template/` and
git-initialized 2026-08-03 (root commit `e7bd996`); you are its first
tactical session. Baseline: that stamp. Scope: this repo, plus exactly one
sanctioned change outside it (the specs folder move, item 2 — gitignored
data, no drawing-checker commit involved). Do NOT edit drawing-checker code
or committed files; the copies below are one-way imports with provenance.

Primary source material — read before writing the SOP:
- `C:\workspace\drawing-checker\docs\sessions\lessons\LESSONS_20260729_tolerance_stack_slice1.md`
  (the slice-1 lesson: schemas, the LMC/MMC trap, findings F1–F16, source
  gaps, xlsx-reading gotchas)
- `C:\workspace\drawing-checker\docs\tolerance_stacks\` (README + the two
  worksheets + three stack definitions + hardware entries)

## Deliverables

1. **Repo conformance.** `setup.ps1` run (venv-win exists, pytest green on
   an empty/ported suite), `forge check` OK against this repo (the template
   deliberately doesn't stamp `docs/issues/` — add `docs/issues/.gitkeep`,
   per slack-sync's founding lesson), README states what this repo is:
   tolerance-stack authoring + review, spec-datasheet inbox. CLAUDE.md: the
   template's is gitignored ("ephemeral, replaced per-session by dispatch")
   — mirror every durable fact you write there into the tracked README /
   ARCHITECTURE.md (both jira-sync and slack-sync learned this the hard
   way).
2. **MOVE the specs dump** (it has never been consumed by anything):
   `C:\workspace\drawing-checker\data\inbox\specs\` →
   `C:\workspace\tolstack\data\inbox\specs\` (filesystem move; both sides
   gitignored data). Record the move + file count in the lesson and leave a
   one-line `MOVED_TO_TOLSTACK.txt` breadcrumb in the old location. This
   folder is Jeff's years-accumulated pile of fastener/hardware datasheets
   (often poor photocopies) — append-only from now on, never rename or
   clean up its contents.
3. **COPY the stack assets from drawing-checker** (originals stay — the
   append-only spirit; note each source path + drawing-checker's current
   master sha in a committed `PROVENANCE.md`):
   - `docs/tolerance_stacks/` (three `stack_definition` JSONs, the
     hardware-entries file, README, both worksheets) → this repo's
     `docs/tolerance_stacks/`
   - the `tolerance_stack/` Python package (the fold module) +
     `tests/test_tolerance_stack.py` + the four `tests/debug_*.py` tools →
     same layout here; port the 34 tests and get them green under this
     repo's venv-win
   - `data/inbox/tolerance_stacks/260729_sample_tol_stack.xlsx` + its
     `PROVENANCE.md` (gitignored contents, committed provenance — same
     rule as the original)
   - the slice-1 lesson file itself → `docs/reference/` (verbatim copy,
     header noting it's imported reference)
4. **Write the SOP**: `docs/SOP_TOLERANCE_STACK.md` — the procedure a fresh
   agent follows to build a stack *from scratch*, distilled from the
   slice-1 lesson + worksheets. Must cover, at minimum:
   - the four `/v0` schemas and how to use them (`stack_definition`,
     `source_ref`, `hardware_entry`, `check_result`); paths and checks are
     the same shape (one `fold()`, one place a sign can be wrong)
   - **store nominal/min/max lengths; keep lmc/mmc beside them as
     transcribed, never fold "MMC → max"** (the bushing-chamfer LMC 0.889 >
     MMC 0.635 example — a subtracted element inverts the mapping)
   - **every element value cites a `source_ref`** with
     `confidence: traced | inferred | untraced`; an untraced value is
     permitted only as an explicitly-listed gap. Values recalled from
     training data are NOT a source — fastener spec recall hallucinates;
     cite a datasheet in `data/inbox/specs/` or a drawing (via
     drawing-checker's run data), or record a gap.
   - verdict vocabulary: `pass | marginal | fail`, marginal = nominal
     passes but worst case doesn't; RSS is always computed alongside WC
   - the castellated-nut caveat: slotted/castellated nut + cotter pin
     *quantises* acceptable grip — a plain-nut continuous-grip model is a
     known modelling gap, state it when it applies
   - hardware entries: `values_status: inline` with per-entry `gaps` lists
     (the future spec-library intake queue); `library_ref` stays null until
     a library exists
   - practical gotchas worth keeping from slice 1: `item_no` vs `find_no`
     key mismatch in balloons JSON; printed border zones ≠ synthetic
     zone-mapper grid; xlsx shared formulas read empty via naive readers
5. **Write the review checklist**: `docs/prompts/REVIEW_AGENT.md` for this
   repo. Every review of an agent-built stack must check, at minimum:
   every single tolerance traces to an actual specification or drawing
   callout (nothing invented — this is the checklist's reason to exist,
   Jeff verbatim); signs on every path term; LMC/MMC direction per element;
   RSS actually computed (slice-1 F2: a label with no formula shipped);
   nominal inside its own min/max (F1); quantised constraints modelled
   where cotter/castellation hardware appears (F8/F16); the traced /
   inferred / untraced ratio reported in the review.

## Definition of done

- `forge check` OK; ported suite green (`venv-win\Scripts\python.exe -m
  pytest -q`, all 34 stack tests passing here); specs folder moved and
  breadcrumbed; `PROVENANCE.md` lists every copied path + source sha.
- SOP and review checklist exist with all the named content; a cold read
  of the SOP alone is sufficient to start the `pitch_link_stack` handoff
  (that session is the SOP's first consumer and its friction report is the
  SOP's first test).
- Lesson (`docs/sessions/lessons/LESSONS_20260803_tolstack_founding.md`):
  file inventory, anything in the slice-1 material that did NOT make the
  SOP and why, and any template-stamp gaps hit beyond `docs/issues/`.
