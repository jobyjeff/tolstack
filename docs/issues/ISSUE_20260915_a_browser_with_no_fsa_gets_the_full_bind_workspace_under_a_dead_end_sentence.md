---
type: bug
priority: med
status: open
area: apps/annotate
reporter: agent
audience: strategy
found_by: docs/sessions/reviews/REVIEW_20260915_annotate_hosted_page_posture.md
---

# A loopback page in a browser with no File System Access API still shows the whole bind workspace under a sentence saying it cannot annotate

`annotate_hosted_page_posture` (2026-09-15) fixed this exact shape for the
**hosted** origin: the page said *"Annotating is not available on this site"*
and, two inches below, told the reader to click a face in a 3D view. The fix
withholds `#workspace` in `main()`'s hosted branch and moves the control wiring
below it.

`main()` has a second dead-end state that was out of that handoff's scope and
did not move with it: **a local page in a browser with no File System Access
API** (`if (!picked.adapter)`, `apps/annotate/app.js`). The banner is honest;
everything under it is the unmodified bind workspace.

## Measured (review, 2026-09-15)

Real Chrome, repo-root static server on `127.0.0.1`, `showDirectoryPicker`
deleted in an init script — the state Firefox and Safari are in permanently:

```
banner: This browser has no File System Access API -- the annotate surface needs
        Chrome or Edge, served over http(s) (not file://). Try ?mock=1 for a demo
        with no folder grant.
  #detail rendered:  true
  #detail text:      "Pick an element on the left, then click a face in the 3D view to bind it."
  console wired:     true
  canvases in #canvas-host: 1
```

So: the same contradicted hint, a live dev console into an app with no storage
behind it, and — unlike the hosted case — a real, empty 3D canvas that was paid
a WebGL context for.

## Why it is filed rather than fixed

Two reasons, and the second is the one that matters.

1. Scope. That handoff is fenced to the hosted origin, measured with
   `--host-resolver-rules=MAP hosted.tolstack.test 127.0.0.1`, and its review
   is not the place to widen it.
2. It is a **policy** question the origin-posture brief already frames and does
   not yet answer:
   `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`
   asks whether *"absent shows nothing"* applies to a capability absent **for
   this reader** rather than absent from the build. This is that question with
   the reader's **browser**, not their origin, as the discriminator — a third
   case beside the two the brief lists, and one where the honest answer might
   genuinely be different, since `?mock=1` is a real way forward the hosted
   reader does not have.

## One thing to fix regardless of the policy call

`scripts/run_viewer_browser_tests.mjs`'s `testAnnotateHostedPosture` asserts
its loopback half against `/Connect folder|File System Access/` — either state
satisfies it — and then asserts the **full workspace renders**. Today the test
browser has FSA, so it measures the ordinary pre-grant page, where showing the
workspace is correct (a grant is one click away). If the test browser ever
lost FSA the same sub-checks would be pinning this defect in place. Split the
wait so the loopback half asserts which of the two states it is in.
