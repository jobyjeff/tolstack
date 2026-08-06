---
priority: medium
depends_on: []
---

# HANDOFF 2026-08-05 — stack_viewer_v0: static viewer for stacks/checks with provenance coloring + drawing-crop hovers

Source: Jeff's atomic note `20260804T173624_vwb8ia` ("next step for tolstack
is a viewer so that I can actually review the outputs without digging into
.json files") + live follow-up 2026-08-05: he wants **cross-references to
drawing-checker** — mouse-over a stack line → thumbnail of the drawing sheet
region carrying that tolerance, and/or a link to the full reference.
Baseline: `master` with `pitch_link_stack` merged. Scope: new `apps/viewer/`
+ a crop-projection script + tests; do NOT touch `docs/SOP_TOLERANCE_STACK.md`,
`docs/prompts/`, `hardware_entries.json`, or stack JSONs (parallel handoffs
`sop_edits_apply` / `spec_library_v0` own adjacent ground; read-only toward
everything you render).

## Shape (binding where stated)

- **Static app, forge `apps/` pattern** (binding — no framework, no daemon,
  no npm; File System Access API directory grant, like forge's notes app
  which is proven in Jeff's enterprise Chrome on `file://`). Model the FSA
  adapter seam on `forge/apps/notes/storage/` rather than inventing one.
- **The crop trick that makes hovers possible from a static page:** the app
  can't roam the filesystem, so hovers read **pre-rendered crops** from a
  projection: a script (suggested `scripts/build_viewer_crops.py`; needs
  PyMuPDF → run it with drawing-checker's venv, per the existing
  `debug_trace_stack_values.py` precedent) walks each stack element's
  `source_ref`, resolves it against the cited export/run under
  `C:\workspace\drawing-checker\data\` (worktree reality: absolute path),
  and renders a zoomed crop PNG + a locator JSON into
  `data/projections/viewer/` in THIS repo. Wipe-and-rebuild, derived not
  authored. The app then needs only tolstack's directory handle.
- Known honesty case: zone citations expire between exports (the pitch_link
  lesson's edit 11 — DETAIL B moved I6→H3 between two exports of the same
  revision). Where a `source_ref` doesn't pin an export, render against the
  stack's `joint`-block export if named, else show an explicit
  "crop unresolvable — citation names no export" state. Never guess.

## Deliverables

1. **Stack list + stack view**: elements table (nominal/min/max, role,
   kind), fold results, checks with verdicts, `notes`, gap list. Values
   verbatim from the JSONs — the viewer computes nothing (one `fold()` rule:
   no second arithmetic path, not even in JS).
2. **Provenance is the point**: color every element/value by
   `confidence` (traced / inferred / untraced) + flag zero-width bands and
   `INCOMPLETE` budget checks distinctly. Jeff reviews *sourcing* as much as
   arithmetic — make an untraced value impossible to miss.
3. **Hover crops** per element via the crop projection above; click-through
   links to the full reference: the drawing-checker webui run/container page
   when one is cited (plain `<a href>` to the served URL), else the raw PDF
   path shown for manual open.
4. **Worksheet rendering**: show the matching `WORKSHEET_*.md` beside the
   stack (markdown rendering exists in forge's notes app — same class of
   dependency-free renderer).

## Definition of done

- Opening the viewer against the real `data/` shows all three-plus stacks;
  `stack_pitch_link_to_pitch_plate.json` renders with its two INCOMPLETE
  budget checks visibly flagged, gap 1 (bearing width) visible, and hover
  crops working for the elements whose citations resolve (the NAS6403 grip
  header crop is the demo case).
- Crop script re-run is idempotent (wipe-and-rebuild) and skips-with-report
  when drawing-checker data is absent.
- Browser-tier tests per repo convention (forge's notes app shows the DOM
  shim + node-fs adapter pattern); suite green.
- Lesson: which `source_ref`s failed to resolve and why — that list is
  design input for the identity system (stable element addresses are the
  cure for zone drift).
