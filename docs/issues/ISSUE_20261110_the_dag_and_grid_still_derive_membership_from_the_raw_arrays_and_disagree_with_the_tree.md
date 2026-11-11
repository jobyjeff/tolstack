---
type: chore
priority: med
status: deferred
area: viewer/dag
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
defer_until: 2026-11-24
class: two_vocabularies_for_one_fact
resolution: deferred 2026-11-10 (triage) -- med beyond BUDGET=3; viewer selection/layout files are the strategy thread's F1b/F1c sequence (dispatch/docs/strategy/HANDOFF_20261109_strategy.md)
---

# The DAG and the grid still derive membership from the raw arrays, and disagree with the tree

Handoff `the_model_is_derived_once_and_the_left_column_is_its_tree` (2026-11-10)
gave the page one model object (`apps/viewer/model.js`, from the projection's
`model` block) and made the left column its first reader. By design it left the
DAG's own derivations alone ("moving them onto the model is a later handoff").
This is that handoff's inventory, and the one place the page now visibly
disagrees with the tree.

## The disagreement a reader can see

A node two parts share is **two features** in the tree (one under each part,
both lit when selected) and **one pin** on the DAG, given to the part with more
interfaces (`VA.partPins`, `apps/viewer/topology.js`). On v2 the tangential link
mount's base face is listed under the mount and under the hub in the tree, and
drawn as the hub's pin on the DAG; the mount's dimension from it therefore
leaves the mount's block. The strategy draft's 2026-11-10 section ("68 answered")
places the fix in the DAG-as-map handoff: a shared face is a pin on each part,
joined like an interchange.

## Functions in `apps/viewer/topology.js` that read `nodes[].parts`, `edges[].part` or `bodies[].parts`

Measured 2026-11-10 by a scan of each `VA.<name> = function` body (25):

`topologyIndex`, `otherVariantParts`, `partMeshFact`, `studyHasMesh`,
`rowPositions`, `bandLayout`, `bodyLabelFields`, `bodyTint`, `bodyOfPart`,
`partSpans`, `partPins`, `blockLayout`, `blockStripWidth`, `dagOverlay`,
`collapseBodies`, `railGeometry`, `nodeAdjacentParts`, `gridPlan`, `gridBraces`,
`sceneRowElement`, `litPartIds`, `sceneTintCommand`, `navTree`,
`partReferences`, `nodeSideLabels`.

Of these, `bodyOfPart`, `bodyTint`, `partPins`, `partSpans`, `gridPlan`
(the part of a row), `gridBraces` and `litPartIds` answer the membership
question the model object already answers (`model.bodyOf`, `model.tint`,
`model.featuresOfNode`, `model.part(id).dimensions`); the rest read the arrays
for geometry or labels.

## In the pane (`apps/annotate/`)

13 sites still pose or group by their own rules (`rides_with`, occurrence-path
containment, the ride chooser, `parts[0]` as the face's part): `app.js`
`sweepBodies`/`anchorSweepBodies` region (around line 1716 and 1814),
`sweep.js` around lines 1272, 1308, 1318 and 2368 (`AA.pickEndPartIds`). The
strategy draft's F2 ("a kinematic study is a document, and the 3D scene reads
the model") is where these go.

## What to do

One handoff per surface, in the order the strategy draft gives: the DAG
(pins on each part, chords inside their part's block), then the pane. Each
replaces its derivations with reads of `VA.buildModel`'s lookups and deletes
the function it replaced; `tests/test_model_view.py` already pins the model's
numbers, so the DAG's new reads have a value to agree with.
