---
type: chore
priority: low
status: open
area: viewer/tests
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
---

# The component card's per-document "unverified" qualifier lost its only live witness

`apps/viewer/tests.js`, `[real] a part sourced to both a drawing and a workbook
qualifies the workbook and leaves the drawing alone`, needs a live part with
**no drawing of its own** whose rows cite both a verified and an unverified
document. Its only such part was `pitch_system | hub`. Since 2026-10-26 the hub
lives in `vpa_pitch_linkage`, which declares its drawing (214373-002), so no
live part qualifies.

The check is now a named SKIP in the node tier (the run's last line reads
`1 TIER SKIPPED -- NOT RUN, NOT PASSED`), not a pass. Nothing else stands on the per-document design: the
fixture tier has no mixed part, and the walk test passes under either design.

Fix shape: give `apps/viewer/topology_fixtures.js`'s demo mechanism one part
with no drawing whose two edges cite a traced drawing and an untraced workbook,
and move the assertion to the fixture tier. The `[real]` check can then stay as
an opportunistic second witness.
