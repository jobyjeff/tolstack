---
type: bug
priority: low
status: resolved
area: viewer/topology
reporter: agent
handoff: docs/sessions/HANDOFF_20260915_respine_tween_fidelity.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `respine_tween_fidelity` moved to completed/; not independently verified.
---

# A settled tween store is not "the target store exactly" — it keeps the outgoing side's own node/edge keys

`VA.tweenPositions(from, to, e)` (`apps/viewer/topology.js`) deliberately carries
over any node or edge the **outgoing** store had and the target does not:

```js
Object.keys(from.nodes).forEach(function (id) {
  if (out.nodes[id] === undefined) out.nodes[id] = from.nodes[id];
});
// … and the same for from.edges
```

So at `e = 1` the result is **not** the target store. Its `byRow` is (that part
is keyed by the target's rows and asserted), but `nodes` and `edges` are a union.

## Measured

Adding two lines to the existing fast-tier test
`"a respine at e = 1 is the target store exactly — the animation adds no
geometry drift"` (`apps/viewer/tests.js`):

```js
eq(Object.keys(settled.nodes).sort(), Object.keys(s.to.nodes).sort(), …);
eq(Object.keys(settled.edges).sort(), Object.keys(s.to.edges).sort(), …);
```

fails immediately:

```
uniform: PROBE nodes key set:
  ["arm_tip","base_datum","base_post_seat","post_arm_pin","post_strut_bushing","strut_end"]
  !== ["base_datum","base_post_seat","post_strut_bushing","strut_end"]
```

`arm_tip` and `post_arm_pin` are two of the interfaces the chain drops — they
survive in the settled store at their **outgoing** y.

## Why it is worth fixing even though nothing drifts today

No rendered geometry is wrong: `VA.railGeometry` and `VA.leaderGeometry` both
iterate the *layout's* rows and look positions up by id, so a key with no row
behind it is never read — which three tiers confirm by pairing settled DOM
attributes against a no-animation render. The defect is that the test's **name
is the claim** and the test does not check it, so the guard's scope structurally
excludes the leak it is named for: `tweenPositions` could put arbitrary junk in
`nodes`/`edges` and that test would still pass. The same over-claim is in the
function's own header comment ("Shaped exactly like `VA.rowPositions`' output
plus two fields") and in `apps/viewer/README.md`'s *"the settled page is the page
a render that never animated produces"* — true of the DOM, not of the store.

`VA.lastTopoRender.positions` is this store during a transition, and the animator
reads it back as `from` when a respine interrupts a respine, so the carry-over
compounds across interruptions. Still inert, still not what the docs say.

## What would close it

Either drop the two `from`-only carry-over loops (nothing consumes them — the
rows a transition drops are drawn by the ghost, not from the store) and add the
two key-set assertions above; or, if the carry-over is wanted, say what reads it
and rename the test and the comment to the weaker claim they actually hold.

Found by the `viewer_study_respine_animation` review (2026-09-15).
