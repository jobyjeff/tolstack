---
type: chore
priority: med
status: resolved
area: viewer/topology
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
handoff: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `viewer_unwitnessed_surface_guards` moved to completed/; not independently verified.
---

# The topology grid's "no tolerance recorded" row badge has no guard in any tier

`viewer_study_verdicts_and_gaps` (2026-09-15) gave every affected grid row its
own loud badge (`VA.edgeAttention`, `apps/viewer/topology.js`) — deliverable 2,
"each affected **line item** carries its own badge in the grid" — and in the
same change **removed** the `chip--zero-width` chip that used to mark those rows
(`apps/viewer/views/topology.js`, the old lines ~1052-1056). The replacement is
right; it just has nothing standing on it.

**Measured** in `review/viewer_study_verdicts_and_gaps` by deleting

```js
if (edge.zero_width) badges.push(badge("no_tolerance"));
```

from `VA.edgeAttention`: `node apps/viewer/run_tests.cjs --repo
C:\workspace\tolstack` → **367/367 passed**. The zero-width marking simply
disappears from the grid, in every tier, silently.

The sibling badge *is* pinned, count for count: the new `[real]` test "a row
whose number has nothing behind it says so in the grid" asserts
`all(root, ".tvflag--unverified").length` equals the number of live edges for
which `VA.needsAnnotation(e.confidence)` holds. `.tvflag--no_tolerance` has no
such assertion.

**Fix shape:** the same assertion for the other half, on a topology that has
zero-width edges — `pitch_link_to_pitch_plate` has 2 and
`rotor_fastener_length` has 2 (`livePitch`/`pitch_system` has none, which is why
the existing test could not simply be extended; see the handoff's lesson §3 on
the two kinds not co-occurring).
