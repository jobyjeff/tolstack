---
type: bug
priority: med
status: open
area: apps/viewer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260914_surfaces_that_state_something_false.md
---

# A hosted viewer still offers three 3D affordances the annotator can no longer service

`apps/viewer/` offers the annotator from three places: the detail pane's
**attach to 3D** / **annotate this →** on an untraced or uncited edge, the
component and node hover cards' own 3D affordance, and the toolbar's
**View in 3D** for a study. All three are gated on two facts already — the edge
is a gap, and the part has an installed mesh — plus, for the flyout form, a
boot-time probe that `../annotate/` is served beside the page.

None of them is gated on whether the annotator can *do anything* on this
origin. Since `surfaces_that_state_something_false` (2026-09-15) a **hosted**
annotate page states one sentence — annotating is not available on this site,
because it works by writing into the repository — and offers no folder grant.
So on a hosted viewer page all three affordances now lead somewhere that
politely says no.

This is a rewording of a pre-existing dead end rather than a new one: before
that handoff the same clicks led to a **Connect folder** button a hosted
visitor could not satisfy, which was worse. But the viewer now has the
information to withhold the control instead, and the standing rule is that an
absent feature shows **nothing** — the same rule that removed the mesh-less
link (`annotate_affordances_flyout_and_mesh_gating`) and the picker itself.

## Why `audience: strategy`

The mechanical fix is small — `VA.isLocalPage(window.location.protocol,
window.location.hostname)` is already exported, and the three call sites
already take gating predicates — but the right answer depends on a decision
nobody has made:

1. Withhold all three on a hosted page (consistent with mesh gating, and with
   the picker removal).
2. Keep them, on the grounds that a hosted **reader** may legitimately want to
   *look* at a study's chain in 3D even though they cannot bind anything — which
   becomes a real, useful case exactly when
   `ISSUE_20260910_annotate_has_no_http_read_transport` lands
   (`docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md`). Read is
   not write, and the flyout's `trace` verb is pure read.

Option 2 is probably where this ends up, which is why option 1 should not be
implemented reflexively first: the transport work would then have to undo it.
Decide the two together.
