---
type: chore
priority: low
status: triaged
area: apps/viewer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
strategy: docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md
---

# `views/banner.js` renders `state.error` on an UNPUBLISHED bar, and nothing can ever set it there

Deferred out of `guard_mutation_witness_tier` (2026-09-15), which was told in as
many words not to change app behaviour: *"every item below is a guard that fails
to witness correct behaviour, so if you find yourself editing `topology_app.js`
or `views/` to make a test pass, stop"*. So the guard was added and the design
question left standing — filed here so it keeps an owner after that handoff
reaches `completed/`.

## The question

`ISSUE_20260915_unpublished_banner_has_nothing_pinning_and_nothing_else.md`
raised it while describing the gap that handoff closed:

> That decides a real design question first — whether `state.error` should render
> on an UNPUBLISHED bar at all. Today it is unreachable (the boot guard is the
> only writer that can coincide with UNPUBLISHED, and `chooseTransport` cannot
> reject on an http page), so the `if (state.error)` line in that branch is dead
> code that exists to let this regression through.

The line, in `apps/viewer/views/banner.js`'s UNPUBLISHED branch:

```js
if (state.error) root.appendChild(VA.el("div", "banner__error", state.error));
```

Two readings, and they want opposite edits:

- **Dead code.** Nothing reachable writes `state.error` while `state.transport`
  is UNPUBLISHED, so the line does nothing except widen the blast radius of a
  future mistake in `topology_app.js`'s no-adapter branch. Delete it, and the
  "one plain sentence and nothing else" contract becomes structural rather than
  conditional.
- **Deliberate defence.** An error the app genuinely could not otherwise show
  would be swallowed silently instead — which is the failure this repo's error
  surface exists to prevent (`viewer_error_surface_and_layout`).

## What is already true, so nobody re-derives it

The regression the line would let through **is now pinned**, in either reading:
the browser tier's `[hosted origin with nothing published]` suite asserts the bar
is one element with no `.banner__error` under it, and
`scripts/mutation_witnesses.json`'s `unpublished-banner-and-nothing-else` entry
declares the one-word mutation (`transportKind !== VA.TRANSPORT.UNPUBLISHED` →
`true`) it must redden on. So this issue is about whether the line earns its
place, not about coverage.

If the answer is "delete it", the mutation entry above stays valid unchanged —
the condition it mutates is in `topology_app.js`, not here — but the guard's
comment in `scripts/run_viewer_browser_tests.mjs` names both halves of the
mechanism and would need its second half updated.
