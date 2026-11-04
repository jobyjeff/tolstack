---
type: bug
priority: high
status: open
area: viewer/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20261103_a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there.md
class: fixture_drift
---

# The slide re-author leaves six viewer `[real]` checks red on integration

Found 2026-11-03 by the review of
`a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there`. This is not
that handoff's change. `the_slide_joint_is_the_mounts_bushings_against_the_piston_body`
changed `docs/topologies/topology_vpa_pitch_linkage.json` and the topology
builder. Its review and its lesson both list the viewer `[real]` tier under
"Not run" (they waited for the batch-merge rebuild). Once the projection is
built from the tree, that tier is red.

**Measured:** I exported `git archive integration` (`d9eb2196`) to a scratch
dir. I built every projection from the merged tree's scripts into a scratch
data root (`--data-root`), and the freshness line paired all four with the
tree. Then I ran `node apps/viewer/run_tests.cjs --repo <scratch root>`:
**623/629**. The merged review tree gives the same six reds (624/630). The
review branch adds no topology input, so these reds belong to integration:

- `[real] the pitch system's grouping is the leader rule at work…`: `62 !== 61`
- `[real] on pitch_system, a rendered row's band tint is its own leader band's…`:
  `61 leaders cut the grid into 62 bands: 63 !== 62`
- `[real] every number apps/viewer/README.md states about the spine…`:
  `README's before-total: 162 !== 160`
- `[real] the pitch system's five forks are marked`: `expected 24 branch points, got 23`
- `[real] every live dot answers the SAME on hover and on click…`:
  `vpa_pitch_linkage/pitch_plate_pilot_in_piston_id declares part
  pitch_plate_215177_001, which no edge incident on it carries: an authoring
  error in the topology document, not a display bug`
- `[real] the topology fixture's shapes still match the builder's`: the
  projection's `topologies[].nodes[]` now writes `[face, hardware_ref]`, and
  `apps/viewer/topology_fixtures.js` does not. Regenerate it, as its header
  says.

Four of the six are layout counts the re-author moved, and only the 169→172
pin was updated. One is a topology authoring defect: a node declares a part
that no incident edge carries. One is fixture drift: the builder emits new node
keys. The batch merge's `scripts/rebuild_projections.ps1` then
`node apps/viewer/run_tests.cjs` will be red on these six.

**Fix shape:** a tactical handoff in the slide re-author's scope
(`docs/topologies/`, `apps/viewer/tests.js` pins, `apps/viewer/README.md`'s
declared numbers, `topology_fixtures.js` regenerated). Verify against a
scratch-root projection built from the tree, the overlay's "Arming the
`[real]` tiers against the MERGED tree" recipe.

## The browser tier, same scratch root (2026-11-03)

`node scripts/run_viewer_browser_tests.mjs --repo <scratch root>` on the merged
review tree: **34/40**. Every failing suite fails the same way when re-run with
`--only` from the `git archive integration` export, so none of the six is the
review branch's:

- `topology file://` and `topology http`: 199/203 each. Four `[real]` pitch_system
  leader and band checks ("…the product graph's own 61 leaders"), the same
  layout shift as the fast tier above.
- `real render path (non-mock)` and `crop lightbox`: aborted on
  `locator.click: Timeout 30000ms exceeded`.
- `kinematic study page`: 21/23 ("on the first screen, the verdicts beside the
  model…", "the toolbar's Unused toggle…").
- `3D pane follows the selection`: a different subset red on each run. That
  is the flake already filed as
  `ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`.

I have not checked whether the two click timeouts and the kinematic reds come
from the slide re-author or from an earlier landing. Bisect them against a
scratch-root build of `integration`'s parents before fixing them as one defect.

**Knock-on for the witness gate.** While the viewer fast tier is red on
`[real]`, every `fast__*` entry reports `NOT WITNESSED (the tier was red before
the mutation)`. That includes guards that have nothing to do with topology
(the review's `--changed-since integration` run: `fast__a-joint-end-with-a-candidate-list-mirrors-as-a-row-with__d442f0db`
and three neighbours). The gate cannot prove any viewer fast guard until this
issue is fixed.

**Measured at `integration` = `d9eb2196`.** `each_stop_is_its_own_stack` landed
on `integration` after that, bringing layout pins and witness changes for the
piston body's chain. Before acting on this issue, re-measure on the current
tip with a fresh scratch-root build. Some of the six may already be closed.
