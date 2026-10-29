# Lessons — a_study_is_a_translucent_group_on_the_dag (2026-10-28)

## What shipped
`VA.studySpans` / `VA.studyGroups` / `VA.GROUP_FILTERS` (`apps/viewer/topology.js`),
a `Groups: bodies | studies | both | none` toolbar button remembered per topology
(`tolstack.viewer.groupFilter`), and `rect.tv__studyfield` drawn in `railsSvg`
after the body fields and before every mark. Default: both when something is lit,
bodies otherwise. Hidden mode draws only the selected study's group.

## Spans per study on the real model (vpa_pitch_linkage)
23 groups (22 chain studies + the kinematic study) paint 76 rects on the kinematic
page (selected study: **1** span, the band) and 83 on a grip-budget page. So an
unselected study averages 3–4 fields: it sits wherever the arrangement leaves it.
A collapsed body's pill is never a lit row, so it ends a run.

## Colour and alpha (flagged judgement)
The handoff said "palette tokens, no new literal". The design doc reserves the
provenance hues and says the accent is *selection*, so: chain = `--zero`,
kinematic = `--accent`, thermal = `--muted` (reserved; thermal fits are loose
stacks with no topology edges, so no group is ever drawn for one). Fill/stroke
alpha via `color-mix`: 9%/40% normally, 16%/70% selected. The app has one (dark)
theme. Reviewer may prefer a different pairing for kinematic.

## Surprises
- A study field must take the pointer (hover lights the study's bars/rows through
  `hot.studyOfEdge` leads), so body names are appended after the groups, and the
  pan handler treats `tv__studyfield` as empty space.
- Study title sits on the field's top border (baseline y1+3) so it does not
  collide with the body name at y1+9; it elides at min 84px.
- A worktree cannot arm the `[real]` tier: the shared projection was built from
  another tree. I built a private copy (`build_kinematic_projection.py
  --data-root <scratch> --allow-older-tree`) and ran `[real]` + the browser
  suite against it; the 6 failures there are crops/worksheets the copy lacks.

## Still hard to read (next round)
22 translucent groups at once is a haze on the product model; the unselected
studies' many small fragments overlap and their labels collide. Candidates:
only label the selected group, draw others on hover, or filter by tag chips.

## Not done / to run in the main checkout
Mutation witnesses (10 new specs) could not be run in a worktree (the tier is red
before any mutation); the four main-checkout tiers need a projection rebuild first.
