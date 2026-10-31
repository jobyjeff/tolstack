---
type: feature
priority: low
status: deferred
area: apps/annotate
reporter: agent
audience: strategy
needs: agent
resolution: triage 2026-10-30: brief BRIEF_20260911_viewer_3d_and_card_content_reach consumed 2026-10-29 without curing this (the one-shell 3D reach covers model studies only; the two loose thermal-fit stacks are in no topology and apps/viewer/views/stack.js still renders no 3D affordance); reopened for re-triage; triage 2026-10-30: low, deferred by default to a date
class: served_surface_reach
defer_until: 2026-11-29
---

# Classic (loose) stacks have no 3D launch — the annotator navigates topologies only

Handoff `study_3d_flyout` shipped the per-study 3D launch ("View in 3D →",
the `trace` verb) for **topology studies** only. The handoff's own feature
line says "from a study/stack in the topology viewer", but a classic stack
launch has nothing to land on: `apps/annotate/`'s navigation is
topology → study → edge (its two `<select>`s and the `goto`/`select-*`
verbs), and `trace` reads a study's `selection` of topology edges. The
feature-identity schema already supports the other half
(`stack_element` keys, `AA.stackElementKey`), so this is a UI/verb gap,
not a schema one.

What a fix needs to decide (why `audience: strategy`): whether the annotator
grows a stack-mode navigation (a third nav axis in an app deliberately kept
minimal), or whether classic stacks reach 3D only once a topology re-expresses
them (the covered-stack nesting the viewer's nav tree already draws). Most
real stacks are loose today, so the choice decides how much of the corpus the
3D surface can ever reach.

Context: `apps/viewer/views/stack.js` (classic mode) renders no annotate
affordance at all today — this was true before `study_3d_flyout` and is
unchanged by it.
