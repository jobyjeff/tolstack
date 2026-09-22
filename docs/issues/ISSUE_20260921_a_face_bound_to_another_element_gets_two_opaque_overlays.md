---
type: bug
priority: low
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260921_annotate_face_suggestions.md
---

# design: a face bound to a DIFFERENT element gets both a bound mark and a suggestion overlay, on the same face

## What happens

`apps/annotate/scene.js`'s `markFace(sha, faceId, role)` de-duplicates per
`(sha256, faceId, role)` since 2026-09-21 — deliberately, so the `suggested`
layer can be cleared without taking the `bound` marks down with it. The
suggestion planner (`suggestions.js`, `planEnd`) drops a candidate that is
already bound **to the element being suggested for**, and only that:

```js
var alreadyBound = ((record && record.bindings) || []).map(...)  // THIS element
```

So a face bound to some *other* edge is still offered as a candidate for the
element in hand — which is correct as a *suggestion* (one physical face can
legitimately be the feature of two dimensions) — and the display then draws
**two opaque overlays on one face**, at the same `polygonOffsetFactor/Units`
and therefore at the same depth: green ("a binding attaches here") and accent
("this could be it").

Reachable through the ordinary two-step a reader makes constantly:

1. `trace <topology>` — marks every bound face in the scope, role `bound`.
2. click an element on the rail whose part carries one of those faces and whose
   words ask for that face's surface class — `suggest` runs and adds role
   `suggested` on the same face.

## Why it is only `low`

Both overlays are opaque `MeshStandardMaterial` at identical depth, so the
outcome is a draw-order coin toss rather than a crash: the reader sees either
the accent (losing the "already bound" signal while suggestions are up) or
z-fighting speckle as the camera moves. Nothing is mis-written and no binding
state is touched — the fence holds, this is display only.

## Where the gap is in the coverage

`scripts/run_viewer_browser_tests.mjs`'s `annotate face suggestions` suite does
check that the two claims coexist — but on **two different faces** (the mock
fixture binds face 0 to the very element it then suggests for, so face 0 is
excluded by `alreadyBound` and face 1 is the candidate). The same-face case has
no fixture: it needs a second element on the demo part, or a second binding.

## What a fix is not

Do not stop suggesting a face because another element is bound to it — that
would be the display tail wagging the rule table, and the suggestion is right.
The decision is a *display* one and belongs with whoever owns the overlay
roles: either the `suggested` overlay is skipped where a `bound` overlay
already exists on that face (the same precedence `picked` already takes over
`suggested` in `cmdSuggest`), or the roles get an explicit draw order. Either
way it wants a browser-tier sub-check and a fixture that can reach the state.
