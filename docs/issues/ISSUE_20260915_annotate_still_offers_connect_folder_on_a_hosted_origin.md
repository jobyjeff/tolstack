---
type: bug
priority: med
status: triaged
area: apps/annotate
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_surfaces_that_state_something_false.md
---

# The annotator still offers Connect folder on a hosted page — and the filed fix shape would keep it there

`viewer_transport_honest_hosted` (2026-09-14) settled the rule for
`apps/viewer/`: on an `http(s)` page whose served probe fails there is **no FSA
fallback**, because a hosted visitor has no tolstack repo to grant and a picker
they cannot satisfy reads as a page asking for access to their files.
`apps/annotate/` is the same app family on the same hosted mount
(`/tolstack/annotate/`, and it is embedded in the viewer's own 3D flyout), and
it still boots straight to a folder grant there — `apps/annotate/README.md`
still documents **Connect folder** as the way in.

That half is already known as a *transport* gap:
`ISSUE_20260910_annotate_has_no_http_read_transport.md` (`status: triaged`,
routed to `docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md`).
What that issue does **not** carry is the posture question this handoff
answered, and its stated fix shape now contradicts the answer:

> Shape of a fix: an annotate `storage/http.js` sibling of the viewer's —
> same two probe candidates … — **fall back to FSA**.

Implemented literally, an annotate page on the hosted origin with nothing baked
would land back on **Connect folder**, which is the exact defect the viewer just
removed. The two questions are independent: adding an HTTP transport fixes the
*happy path*; what the page does when the probe **fails** is a separate
decision, and `apps/viewer/storage/adapter.js`'s `VA.chooseTransport` is the
answer the viewer settled on.

Out of scope for `viewer_transport_honest_hosted`, whose handoff fenced it to
`apps/viewer/` explicitly. Filed so the posture half has an owner of its own.

## Shape of a fix

Lift the decision, not just the adapter: `VA.chooseTransport` already takes the
constructed candidates plus a protocol and returns `{adapter, kind, state}` with
no DOM and no page knowledge, so the annotator can call the same function. It
would need annotate's own answer to one thing the viewer does not have — the
grant there is the **write** path (bind/tag), not just a read — so on a hosted
page the honest state is "nothing published here" *and* "binding needs the
repo", which is a copy decision worth making once rather than twice.

Also update `ISSUE_20260910_annotate_has_no_http_read_transport.md`'s fix-shape
paragraph, or it will be read as the design.
