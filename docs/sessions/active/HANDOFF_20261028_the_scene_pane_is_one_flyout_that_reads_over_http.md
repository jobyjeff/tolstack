---
priority: high
depends_on: [a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing]
model: opus
hitl: false
---

# HANDOFF 2026-10-28 — the_scene_pane_is_one_flyout_that_reads_over_http: no scroll bar, no banner, no stray buttons; the pane reads the served data and asks for the folder only when you bind

Source: Jeff's 2026-10-28 review of the hosted viewer, items "3d canvas" 1–3
and the flyout-controls item; traced the same day. Baseline: `master` with
`a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing` merged.
Scope: `apps/annotate/index.html`, `apps/annotate/style.css`,
`apps/annotate/app.js` (boot/transport ~:4480–4830, `renderSweepBar`
~:1671–1808, `renderSweepReadouts`, the embedded-mode CSS hooks),
`apps/viewer/storage/adapter.js`, `apps/viewer/topology.html` (the head
button and the `<dialog>` chrome), `apps/viewer/topology.css` (the dialog
rules ~:1111–1196), `apps/viewer/topology_app.js` (pane open/close/drive
~:1211–1332, `syncSceneColumn` ~:1463), their tests. Do NOT touch
`apps/viewer/topology.js`, `apps/viewer/views/topology.js`,
`apps/viewer/views/kinematic.js` or `tolerance_stack/` — the DAG chain of
handoffs staged today owns them. Do not change which pages the pane opens
on or what study it follows.

## What Jeff sees, and what is underneath

1. **A vertical scroll bar on the pane's right edge, which the 2D→3D leader
   lines cross.** It is the iframe document's own scroll bar, not the
   viewer's: `apps/annotate/style.css:92–99` sizes the workspace
   `height: calc(100vh - 70px)`, assuming a one-line top bar plus a one-line
   banner; at the pane's 400–560 px width the transport line (`#transport-sub`,
   app.js ~:4807) and the banner (~:4507–4511) wrap, the document outgrows
   100vh and the body scrolls. Nothing in the embedded CSS (~:599–609) sets
   `overflow: hidden`. Right-drag pan already works — `scene.js:203` uses
   vendor OrbitControls defaults (`RIGHT: PAN`).
2. **The sweep bar takes too much of the pane.** `renderSweepBar` builds
   three layers (summary line + run select + Help; transport/scrubber/speed/
   loop; the readouts `dl`, the "Go there" gate line, the "N of M parts
   placed" disclosure) and only Help and the parts-placed `<details>`
   collapse.
3. **"read/write · data/inbox/feature-identity/ writes land in the connected
   folder" + "Connected" + "no feature-identity projection yet (nothing
   bound, or not rebuilt)".** The annotator boots through `VA.chooseTransport`
   with **no `http` candidate** (app.js ~:4602–4606;
   `docs/issues/ISSUE_20260910_annotate_has_no_http_read_transport.md`,
   triaged). Its only real transport is the File System Access folder grant,
   even when the viewer shell around it is served over HTTP from
   drawing-checker's 8000 — so the banner is the only grant/re-grant control
   and the only error channel, and on a non-loopback host (`AA.isHosted`)
   the workspace is hidden entirely (the shared site's baked viewer shows no
   scene). Jeff: "we're always running the hosted server now" — the pane
   should read what the server serves.
4. **Two open/close controls in two places**: `#pane-toggle` ("3D") in the
   viewer head (`topology.html:26–27`) and `#flyout-close` + `#flyout-fullpage`
   ("Open full page ↗") in the dialog's own title row (~:60–72). The dialog
   is a flex column, `width: min(560px, 40vw)`, clamped 400–1200 by
   `VA.FLYOUT_WIDTH`, with a drag splitter `.flyout__divider`
   (`the_shell_seats_the_scene_beside_the_model`, 2026-10-26).

## Deliverables

1. **The annotator reads over HTTP first.** Add the `http` transport
   candidate to the annotator's boot, probing the same served roots the
   viewer shell uses (`../data/topologies.json`, the meshes under
   `/tolstack/data/meshes/`, the feature-identity projection when it exists)
   — the shell's `apps/viewer/storage/http.js` is the adapter to reuse, not
   copy. Reads need no grant. **A write still needs the folder**: the first
   bind/supersede/delete asks for the grant at that moment (one inline prompt
   on the action, the existing `connect()` path), and after a grant the
   session writes as before. Hosted non-loopback: the scene renders
   read-only (parts, sweep, anchors, leaders); binding controls say so in
   one short line when pressed. This resolves
   `ISSUE_20260910_annotate_has_no_http_read_transport.md` — set its status
   on merge. Static/file:// mode keeps today's behaviour byte-for-byte.
2. **The banner leaves the embedded pane.** With HTTP reads the transport
   line and the Connected button are not needed in the pane; replace the
   banner band with a **status dot + one short word** in the pane's header
   strip ("live" / "read-only" / "folder needed", hover for the sentence),
   and route every `setBanner(…, "error")` into a one-line inline message at
   the top of the rail that can be dismissed — the error channel must not
   vanish (exec replies ~:4488, rail gestures ~:4476, sweep controls all use
   it). The full-page annotator keeps its banner.
3. **The iframe document never scrolls.** `.an` fills the frame (`height:
   100%`, grid rows sized to content, body `overflow: hidden`); the inner
   `.an__hintbar` scroll region stays the one scroller. Pin it: a browser
   case measures `document.scrollingElement.scrollHeight ===
   clientHeight` inside the pane at 400 px and at 1200 px width.
4. **One flyout, one handle.** Remove `#pane-toggle` from the head and
   `#flyout-close` from the dialog. The pane opens and closes from **one
   handle on the seam** between the nav rail and the model: a slim vertical
   tab reading "3D" when closed; when open, the existing divider carries a
   chevron that closes it. Keep width clamp, stored width, stored open
   state and `syncSceneColumn`. "Open full page ↗" moves into the pane's
   header strip as a small icon-link (it is the only route to the full
   annotator; do not drop it). Browser specs ~:4995–5020, 6092–6110 and the
   "3D pane follows the selection" suite (~:10904) pin today's chrome — update
   them to the new handle, keep their layout assertions.
5. **The sweep bar collapses to its summary line.** One twisty on the
   summary line folds the controls and the readouts away; collapsed state
   shows the summary plus the current frame's blade pitch and actuator
   travel as two inline figures; state remembered per session. The "Go
   there" gate line stays visible in both states (it is a warning). Update
   `apps/annotate/run_browser_check.mjs:225–250` ("transport, scrubber,
   speed and loop are one line") to assert the expanded state and add the
   collapsed one.

Design rules: `docs/DESIGN_TYPE_AND_COLOUR.md`; no new type sizes; the
handle and status dot use existing tokens.

## Definition of done

- Served from drawing-checker's 8000 (`C:\workspace\drawing-checker`, the
  viewer at `/tolstack/viewer/topology.html`) with **no folder grant**: open
  the kinematic page → the pane shows the mechanism and the sweep plays; no
  document scroll bar at any pane width; the header strip shows the status
  dot; a bind attempt prompts for the folder once and then writes.
- `file://` full-page annotator unchanged (run its existing browser check).
- Hosted posture spec (~:7990–8025) updated: non-loopback shows the scene
  read-only instead of hiding the workspace.
- All four main-checkout tiers green after a projection rebuild; `pytest -q`
  green.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md`):
  the probe order and what each transport can/cannot do, in a table; the
  measured pane heights before/after; what the hosted read-only scene still
  lacks (write path) and what drawing-checker's bake needs to carry for it.
