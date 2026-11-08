---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-08 — a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses: every kinematic grid row prints the nominal the skeleton measures and the band the fold actually uses, names where each came from, and a row that cannot refuses to show a contribution

Source: Jeff's forge note `20261108T001814_kpoev0` (2026-11-08), verbatim:
*"The pitch link length row claims the nominal length is 0. how does the linkage
cycle if the link has zero length, and why aren't nominal dimensions being
pulled from the kinematic skeleton/CAD?"* — *"the spindle axis to pitch link
bore length row has no values displayed at all, just blank spaces. Yet it has a
sensitivity value (-1.489) and a contribution (.149), how is this even
possible?"* — *"the fact that the analysis is still spitting out a confident
answer when the inputs are clearly garbage implies that the input values being
presented are not even what is being used in the calculation. Everything needs
to be driven by the underlying 3d model. It shouldn't be possible to display a
tolerance roll up with fake values, and if values are missing, it should fail
loudly (and be fixed)."* His screenshot
(`C:\workspace\forge\data\inbox\atomic-notes\attachments\20261108T001814_kpoev0\paste-20261107T205030.png`)
shows the "Linkage at this pose" sub-stack: `Pitch link · length · 0 / −0.03 /
0.03 · 1.330 · ±0.040 deg` and `Pitch plate · spindle axis to pitch-link bore
height · (blank) (blank) (blank) · −1.288 · ±0.129 deg`.

Baseline: trunk `master` at 2026-11-08; merge `integration` first — the active
`the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id`
re-points the study at `vpa-pitch-p2-20261105-204957`. Scope:
`tolerance_stack/kinematic.py` (load + the projection rows), `scripts/build_kinematic_projection.py`,
`apps/viewer/views/topology.js` (the element records / value cells of kinematic
rows only) and `apps/viewer/views/kinematic.js`, tests and the study JSON under
`docs/topologies/`; do NOT touch the play/pose transport (sibling
`the_linkage_play_control_is_the_only_one_and_it_moves_everything`), the DAG
layout, colours, or the chain studies' rows.

## Why the row lies (measured 2026-11-08)

- **The grid prints the row's own edge record, the fold uses something else.**
  Nominal / min / max come from the topology edge's `dimension`
  (`apps/viewer/views/topology.js:3613-3633`, `VA.elementRecords`); sensitivity
  and contribution come from the kinematic projection's per-stop rows. Nothing
  asserts the two describe the same band.
- **`pitch_link_length` has nominal 0.0 ±0.03 by convention.** The loader
  *enforces* "a kinematic contributor is a variation about the sweep's own
  nominal geometry, so its band is authored about 0.0"
  (`tolerance_stack/kinematic.py:762-768`). The convention is right for the
  fold and wrong for the eye: the **real** nominal lives in the sweep artifact,
  `geometry.names` / `geometry.values` in
  `C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261105-204957.json`
  — `pitch_link.length` 105.9905 mm, `tan_link.length` 61.4504 mm,
  `pitch_link.point_a[2]` 79.666 mm — and **no code reads `geometry.values`**
  (grep over `kinematic.py`, `build_kinematic_projection.py`, `views/kinematic.js`).
- **`pitch_plate_attach_height` has no dimension at all.** Its band is borrowed
  through `dimension_ref` from `pitch_plate_flange_to_link_hole` (0 ±0.1), as
  declared in the study's `contributors[]`
  (`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`).
  So the row's own record has nothing to print — blanks — while the contribution
  is 1.489 × 0.1 = 0.149 from the lender's band. Already filed low and deferred:
  `docs/issues/ISSUE_20261105_a_borrowed_band_term_says_no_value_in_its_preview_and_untraced_on_its_row.md`
  — **this handoff takes it.**
- **The two fail-loud checks that exist** refuse a contributor with no band and
  no declared `gap` (`kinematic.py:752-758`) and a band whose nominal is not 0
  (`:762-768`). **The one that does not exist** is the one Jeff asked for: that
  the displayed row values are the band actually folded.
- Side finding to carry, not fix: the sweep's `tan_link.length` 61.4504 sits at
  the top of the topology's cited 61.40 ±0.05 band and nothing compares them.

## Deliverables

1. **Every kinematic row prints a measured nominal.** For each linkage
   contributor, the projection carries the nominal the skeleton measures for
   that term — read from the sweep artifact's `geometry.names/values` by the
   term's declared geometry key (add that key to the contributor where it is
   missing; the study JSON is yours to edit) — and the row prints
   `nominal / nominal+min / nominal+max` in mm or deg. The fold stays about 0.0
   (the convention in `kinematic.py` is unchanged); only the *presentation*
   adds the nominal. The cell's hover says **where it came from**: "measured on
   the kinematic skeleton, sweep `<artifact id>`" — never "drawing", because it
   is not one, and a drawing citation still wins wherever one exists (CLAUDE.md,
   the one rule).
2. **A borrowed band says so on the row.** A `dimension_ref` contributor prints
   the lender's band in its own cells and names the lender in the ELEMENT cell's
   hover ("band from `<edge name>` (`dimension_ref`)"), never blanks. The
   sourcing mark it wears is the lender's.
3. **The row shows the numbers the fold uses — asserted, not assumed.** Build
   the row's displayed band and the term the fold consumed from the **same
   object** in the projection (one record carrying `nominal`, `band`, `source`,
   `sensitivity`, `contribution`), so the grid cannot print one and fold another;
   a test that mutates the displayed band without the folded one must redden.
4. **A row that cannot name its numbers refuses.** If a contributor has no
   skeleton nominal (no geometry key resolves) or no band, the projection emits
   a **refusal row**: the ELEMENT cell keeps the name, the value cells read
   `no value` with the reason on hover, **sensitivity and contribution are
   blank**, and the sub-stack's total and the study's verdict render as
   `incomplete` with the count of refused rows — a confident total over a
   missing input is the thing Jeff named. This is a refusal of a *display*, in
   his words, and he pays nothing for a misfire but the sight of the gap; it is
   what he asked for (2026-11-08) and the sentence above is the citation.
5. **Skeleton vs drawing, one line.** Where a term has both a skeleton nominal
   and a cited drawing band (the tan link: 61.4504 vs 61.40 ±0.05), the row
   prints the cited band's nominal and the hover says the skeleton measures
   61.4504 (+0.0504 from nominal, at the band's edge). A warning on the row,
   never a gate.

## Definition of done

- On the merged tree in the main checkout, projections rebuilt
  (`scripts/rebuild_projections.ps1`), the kinematic study page's "Linkage at
  this pose" rows read, for the republished sweep: `Pitch link · length ·
  105.99 / 105.96 / 106.02 mm`, `Pitch anti-rotation link · length · 61.40 /
  61.35 / 61.45 mm` (cited) with the skeleton's 61.4504 in the hover, and the
  `spindle axis to pitch-link bore height` row shows the borrowed 0 ±0.1 band
  with its lender named — **no blank value cell beside a contribution anywhere
  on the page**. Pin those strings value-level.
- Remove a geometry key from a copy of the study and the row renders as a
  refusal row with the sub-stack total `incomplete`; the fast tier has that case.
- `ISSUE_20261105_a_borrowed_band_term_says_no_value_in_its_preview_and_untraced_on_its_row`
  closed with a `resolution:` naming this handoff.
- Fast tier, `node apps/viewer/run_tests.cjs`, browser tier green in the main
  checkout; `--changed-since integration` witnesses pass.
- Lesson (`docs/sessions/lessons/LESSONS_20261108_a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses.md`):
  **a screenshot of the full grid on the merged tree** with every linkage row's
  three value cells legible (this is the deliverable Jeff reads), the table of
  term → geometry key → skeleton nominal, which contributors had no key before
  and what you added, and the skeleton-vs-cited deltas for every term that has
  both.
