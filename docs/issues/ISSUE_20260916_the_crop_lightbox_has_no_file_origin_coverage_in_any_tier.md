---
type: chore
priority: low
status: open
area: viewer/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_crop_lightbox_zoom_viewer.md
---

# The crop lightbox never opens on a `file://` page in any test tier

`apps/viewer/views/lightbox.js` shipped 2026-09-16 with a fast-tier suite
(15 checks, `apps/viewer/tests.js`) and a browser suite
(`crop lightbox (launch, zoom, pan on the live crops)`, 16 sub-checks). The
browser suite runs over **http only**, against a repo-root static server, and
for a reason: the launch affordance exists only on a crop figure that HAS an
image, and `?mock=1` — the only dataset the `file://` suites drive — carries no
crop PNGs at all. So no `file://` run ever calls `showModal()` on
`#crop-lightbox`.

What IS covered on `file://`: the module loads and every one of its fast-tier
rendering checks runs there, because `scripts/run_viewer_browser_tests.mjs`'s
`suite file://` loads `apps/viewer/test.html` from a real file URL and that
page now includes `views/lightbox.js`. So a script-order or classic-script
regression would be caught.

What is NOT covered: opening the dialog, the modal top layer, the suppressed
page scroll and the wheel/drag gestures, on the origin Jeff actually
double-clicks into. Nothing here is origin-dependent by design, which is why
this is `low` rather than a bug — but "nothing is origin-dependent" is the
claim, and no tier states it.

## The route to closing it

`testRealDataRenderPath` already boots the real projections over `fileBase`
through an injected fake FSA adapter (`VA.FsaAdapter = Fake`, a
`VA.MemoryAdapter` with `images: {}`). Give that fake's `readCropImage` one
real PNG — read in node, handed in as a data URL — and the `file://` page has a
crop figure with an image on it, hence a launcher, hence a lightbox to open.

An alternative that needs no fixture at all: give the `?mock=1` crop fixtures a
tiny inline PNG. That would light the launcher up on the demo tour as well,
which is arguably worth having on its own — a reader taking the tour currently
sees no crop pictures anywhere.

## Not the same problem as the annotator's

The annotate rail suites are `?mock=1`-only because the File System Access API
needs a user gesture no automated browser can supply. That is a hard block.
This one is just a missing fixture.
