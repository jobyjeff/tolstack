---
type: bug
priority: med
status: triaged
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
handoff: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
---

# `VA.cropReference`'s `classPrefix` argument is unguarded: pass the wrong one and all three tiers stay green

`viewer_component_names_and_reference_copy` (2026-09-15) factored the crop
reference, its links and its folded provenance into one builder,
`VA.cropReference(box, entry, config, classPrefix)` (`apps/viewer/views/crop.js`),
shared by four surfaces. The prefix **carries its own separator** — `"croppop__"`
for the popover and the hover cards, `"detail__crop-"` for the stack pane and the
topology preview pane — so it is the one argument with no natural shape to it.

The handoff shipped exactly that bug once and caught it by eye: `views/detail.js`
passed `"detail__crop"`, so the stack pane rendered `detail__crophead` and
`detail__croplinks` and the block came out unstyled. Its own lesson says so
(§7, *"the class prefixes are the part no test is watching"*), and the fix landed
— but nothing was added to watch them.

## Replayed in review, 2026-09-15

Scratch copy of the merged tree, one character removed from `views/detail.js`:

```
-    VA.cropReference(box, entry, config, "detail__crop-");
+    VA.cropReference(box, entry, config, "detail__crop");
```

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo <scratch>` | **386/386 passed** |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch> --only "app file://"` | **33/33 passed** |

Every assertion on that block reads `textContent`, which is right for copy and
blind to this. `.croppop__head` is pinned by the browser tier
(`run_viewer_browser_tests.mjs`, the popover); the `detail__crop-` prefix is
pinned nowhere, on either pane.

## The cheap fix

Assert the classes the shared builder actually produced, on each surface that
calls it — e.g. in the fast tier, render the stack pane and the topology preview
pane and require `div.detail__crop-head` and `div.detail__crop-links` to exist
(and `div.detail__crophead` not to). One sub-check per surface, two selectors
each.

Note the general shape for the overlay's sake: single-sourcing a renderer
replaces N hand-written class names with ONE argument, and the argument is then
the whole deliverable — the same failure mode as
`ISSUE_20260915_the_suites_label_pass_through_is_one_word_from_a_silent_revert.md`,
one layer down.
