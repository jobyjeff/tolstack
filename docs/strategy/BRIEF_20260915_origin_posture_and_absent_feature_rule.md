# BRIEF 2026-09-15 — origin posture: what a surface shows when the capability is absent on *this* origin

Filed by triage 2026-09-15, consolidating three issues that all ask one
question from different corners: **the viewer and the annotator now know which
origin they are on, and nobody has decided what a surface should do with that
knowledge.** Each was filed separately out of `surfaces_that_state_something_false`
and `guard_mutation_witness_tier` (both completed 2026-09-15), each carries
`audience: strategy`, and each says in its own words that the mechanical fix is
small while the decision behind it is not. Staging them as three independent
handoffs would have three agents answering the same policy question three ways
in two sibling apps.

A strategy session should settle the policy once, then decompose. The tactical
half that is *already* decided has been staged separately as
`docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md`, which is
scope-fenced to `apps/annotate/` and explicitly told to leave the viewer's
asymmetry alone; do not re-open its two items here.

## The standing rule, and where it stops being obvious

Jeff's rule, which the annotator's own fast-tier check now asserts about its
notice: **a feature that is absent shows nothing about itself.** It is what
removed the mesh-less annotate link (`annotate_affordances_flyout_and_mesh_gating`)
and the folder picker. The three issues below are where "absent" turns out to be
a property of the *reader* and the *origin*, not of the build — and the rule
gives no guidance once the same page is capable for one visitor and not another.

## The three issues (read each; they carry the measured detail)

1. `docs/issues/ISSUE_20260915_a_hosted_viewer_still_offers_3d_affordances_the_annotator_cannot_service.md`
   (bug, med) — `apps/viewer/` offers the annotator from three places: the
   detail pane's **attach to 3D** / **annotate this →** on an untraced or
   uncited edge, the component and node hover cards' 3D affordance, and the
   toolbar's **View in 3D**. All three are already gated on two facts (the edge
   is a gap, the part has an installed mesh) plus, for the flyout form, a
   boot-time probe that `../annotate/` is served beside the page. **None is
   gated on whether the annotator can do anything on this origin.** Since
   2026-09-15 a hosted annotate page states one sentence — annotating is not
   available on this site, because it works by writing into the repository —
   and offers no folder grant, so on a hosted viewer all three affordances lead
   somewhere that politely says no. The issue frames the choice: (1) withhold
   all three on a hosted page, consistent with mesh gating and the picker
   removal; (2) keep them, on the grounds that a hosted **reader** may
   legitimately want to *look* at a study's chain in 3D even though they cannot
   bind anything — which becomes a real case exactly when the hosted 3D read
   path exists. `VA.isLocalPage(protocol, hostname)` is already exported and all
   three call sites already take gating predicates, so whichever way this goes
   the implementation is small.

2. `docs/issues/ISSUE_20260915_viewer_says_unpublished_on_a_loopback_origin_it_could_offer_a_picker_for.md`
   (bug, low) — `viewer_transport_honest_hosted` settled that an `http(s)` page
   whose served probe fails gets **no FSA fallback**, reasoning that *a hosted
   visitor has no tolstack repo to grant*. The reasoning is sound; the
   implementation reads the **protocol** while the reasoning is about the
   **reader**. On `http://127.0.0.1:...` the reader plainly does hold the repo,
   so "The tolerance-stack data is not published on this site yet" is a slightly
   false thing to say to someone sitting at the machine that holds it, and the
   picker that would work for them is withheld. The two sibling apps now answer
   differently about one origin **by construction**: `VA.isLocalPage` returns the
   strictest answer (`file://` only) to a caller that passes no hostname;
   `apps/annotate/` passes its hostname, and `apps/viewer/`'s `topology_app.js`
   deliberately does not, so the viewer's behaviour is byte-for-byte what
   `viewer_transport_honest_hosted` shipped. That asymmetry is defensible — the
   viewer's legitimate local page *is* `file://`, since it is built to run by
   double-click — but it is two apps answering differently about one origin, and
   the fix is one line in `chooseAdapter`. Deciding whether to write it is the
   strategy call.

3. `docs/issues/ISSUE_20260915_state_error_on_an_unpublished_banner_is_dead_code.md`
   (chore, low) — `apps/viewer/views/banner.js`'s UNPUBLISHED branch has
   `if (state.error) root.appendChild(VA.el("div", "banner__error", state.error));`
   and nothing reachable can set `state.error` while `state.transport` is
   UNPUBLISHED: the boot guard is the only writer that can coincide with it, and
   `chooseTransport` cannot reject on an http page. Two readings wanting opposite
   edits — **dead code** (delete it, and "one plain sentence and nothing else"
   becomes structural rather than conditional) versus **deliberate defence** (an
   error the app genuinely could not otherwise show would be swallowed silently,
   which is the failure this repo's error posture exists to prevent). It was
   deferred out of `guard_mutation_witness_tier`, which was told in as many words
   not to change app behaviour, so the guard exists and the design question is
   unowned. Note the coupling: item 2's answer changes what can reach an
   UNPUBLISHED bar, so answering 3 before 2 risks answering it twice.

## What the decomposition will need to say

- One predicate, stated once, for "can this reader do the write this surface
  offers?" — and whether it is the same predicate in both apps or deliberately
  two. The current answer is "two, by omission", which is the thing to make
  explicit or remove.
- Whether "absent shows nothing" applies to a capability that is absent *for
  this reader on this origin*, or only to one absent from the build. The
  hosted-reader-wants-to-look case in issue 1 is the strongest argument that
  they are different rules.
- Where the loopback carve-out lands: `apps/viewer/topology.js`'s
  `chooseAdapter` passing a hostname, or `VA.isLocalPage`'s contract changing so
  a missing hostname is an error rather than a strict default.

## Related, already routed — do not duplicate

- `docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md` — the
  drawing-checker mount's capability contract (http read transport for the
  annotator, worksheet reach, container links, terminal commands on other
  viewer surfaces). That brief is about *what the served surface can reach*;
  this one is about *what a surface says when it cannot*. They will share a
  decomposition session's attention and should not be merged: the capability
  work is mostly transport, this is mostly policy.
- `docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md` — the
  already-decided annotate-side fixes, staged and fenced.
