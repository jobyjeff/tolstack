---
type: bug
priority: med
status: triaged
area: apps/viewer
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
---

# The unpublished banner's "and nothing else" half is unguarded — the old error sentence can come back with all three tiers green

`viewer_transport_honest_hosted` (2026-09-14) gives a served page with nothing
published one plain sentence **and nothing else**. Two halves, and only one of
them is pinned.

`topology_app.js`'s no-adapter branch tells the two states apart:

```js
if (transportKind !== VA.TRANSPORT.UNPUBLISHED) {
  state.error = "This browser cannot open a local folder — the viewer " +
    "needs Chrome or Edge. ?mock=1 still runs a demo.";
}
```

and `views/banner.js`'s UNPUBLISHED branch renders `state.error` when it is set.
So flipping that condition to `if (true)` puts a second sentence on a hosted
visitor's banner — one telling them to switch browsers and offering `?mock=1`,
neither of which is true of their situation.

**Measured in review (2026-09-15):** that exact one-word mutation ships
**100% green** — fast tier 260/260 and 314 with `--repo`, browser tier 17/17,
including `[hosted origin with nothing published]` at 6/6. Nothing in the tree
observes it. The browser sub-checks count buttons and grep for `Connect folder`
and for paths; none of them asserts what the bar does *not* otherwise carry.

The two guards that DO bite were verified in the same pass, so this is a gap in
one clause and not in the deliverable: removing the protocol guard in
`VA.chooseTransport` reddens 2 fast-tier tests and the browser case; disabling
`views/banner.js`'s UNPUBLISHED branch reddens 1 fast-tier test and 3 browser
cases.

## Shape of a fix

Either end works and neither needs new machinery:

- **Fast tier**, one test: render the banner with
  `{transport: UNPUBLISHED, connection: DISCONNECTED, error: "…"}` and assert
  the bar carries the one sentence only. That decides a real design question
  first — whether `state.error` should render on an UNPUBLISHED bar at all.
  Today it is unreachable (the boot guard is the only writer that can coincide
  with UNPUBLISHED, and `chooseTransport` cannot reject on an http page), so the
  `if (state.error)` line in that branch is dead code that exists to let this
  regression through.
- **Browser tier**, one sub-check inside `testHostedUnpublished`: assert the
  banner's own child count, or that its text is exactly the sentence.

Related, same review: `ISSUE_20260915_annotate_still_offers_connect_folder_on_a_hosted_origin.md`.
