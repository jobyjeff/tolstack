---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-14 — viewer_transport_honest_hosted: a hosted page must never offer "Connect folder"

Source: Jeff, strategy session 2026-09-14: "tolstack site is still asking
for the 'connect folder' authorization even though it is now a hosted
site." Verified at the wire the same session: on
`https://drawing-checker.ai.joby.aero`, every `/tolstack/...` URL answers
200 + the site index HTML (the nginx catch-all — nothing tolstack-side is
baked yet; drawing-checker's `hosted_tolstack_bake` handoff owns fixing
that side). When the served-data probe fails on an http(s) page, the
viewer falls back to FSA and renders **Connect folder** — a control that
cannot work for a hosted visitor (they don't have the repo to grant).
Locally the served mount actually works
(`http://127.0.0.1:8000/tolstack/data/topologies.json` → real JSON), so
this is about the failure posture, not the happy path. Baseline:
`integration`. Scope: `apps/viewer/storage/` + `topology_app.js`
(`chooseAdapter`) + `views/banner.js` + tests. Do NOT touch viewer
layout/grid code (owned by the active/staged viewer handoffs); do NOT
touch drawing-checker.

## Deliverables

1. **FSA is offered on `file://` only.** On an http(s) page whose served
   probe fails, do not fall through to the FSA adapter's Connect-folder
   flow. Render the honest state instead: a plain-words banner line that
   the data is not published on this server (no file paths, no module
   names, no commands — the standing UI-copy rules), and nothing else —
   a disabled feature shows nothing, not a dead button. `file://` behavior
   is unchanged (FSA is the only possible transport there and the grant
   flow is legitimate).
2. **Keep the probe's content-type discipline.** The catch-all-server trap
   (200 + HTML for everything) is exactly what the probe's content-type
   check exists for and it worked correctly here — don't weaken it; the
   change is only what the page does AFTER a failed probe on a non-file
   origin.
3. **A later-fixed server is one reload away.** The banner state must not
   latch anything persistent (no stored "this origin is dataless" flag) —
   once the bake lands and the same URLs serve real JSON, a plain reload
   enters served mode with no user action.

## Definition of done

- Fast tier: the existing two-mount-shape + catch-all-HTML server fixtures
  (`run_tests.cjs` already starts real local servers) gain the case
  "http page, both probes fail → banner line, no Connect button, no FSA
  boot"; `file://`-shaped tests unchanged and green.
- Truth tier green (`--repo C:\workspace\tolstack`), including the existing
  served-mode boot proof.
- Lesson: the exact banner sentence chosen, and confirmation of the
  reload-recovers behavior against a local server started dataless then
  given data mid-session (the fast tier's mid-session server-stop fixture
  pattern, inverted).
