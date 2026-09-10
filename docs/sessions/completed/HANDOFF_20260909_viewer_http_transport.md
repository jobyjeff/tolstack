---
priority: med
depends_on: [viewer_error_surface_and_layout]
---

# HANDOFF 2026-09-09 — viewer_http_transport: the viewer loads projections over HTTP when served, FSA only as fallback

Source: 2026-09-09 strategy session. The topology viewer is consumed through
drawing-checker's server (`http://127.0.0.1:8000/tolstack/viewer/topology.html`),
which ALSO already serves the projections read-only at `/tolstack/data/…`
(verified live 2026-09-09: `GET /tolstack/data/topologies.json` → 200,
`application/json`, ~576 KB) — yet the viewer's only real storage adapter is
File System Access (`apps/viewer/storage/fsa.js`), so every user must grant a
folder by hand, and a wrong/absent grant renders an empty page. Jeff approved
the structural fix: a served/HTTP transport, chosen by a load-time probe, FSA
kept as the `file://` fallback. Precedent: forge's apps' two-transport pattern
(served vs static, one load-time probe, adapters report `capabilities()`,
views hide what the transport can't do — see forge `apps/README.md`). This is
also a prerequisite for ever hosting the viewer. Baseline: integration tip
(includes `viewer_error_surface_and_layout` per depends_on).

Scope: `apps/viewer/` (a new `storage/http.js`, boot wiring in
`topology_app.js`/`viewer.js`, banner copy) + its test tiers. Do NOT touch
drawing-checker (its mounts already serve what's needed; a cache-header fix is
staged there separately) and do NOT touch `apps/annotate/`.

## Deliverables

1. **`storage/http.js`** implementing the same adapter interface as
   `storage/fsa.js` (read the three projection JSONs + crop images), fetching
   relative to the page so it works under ANY mount prefix. Probe candidates,
   in order (suggestion — measure and record what actually resolves):
   - `../data/<file>` — matches drawing-checker's mounts
     (`/tolstack/viewer/` pages, `/tolstack/data/` projections);
   - `../../data/projections/viewer/<file>` — matches serving the repo root
     (e.g. `python -m http.server` from `C:\workspace\tolstack`).
   Crops: `crops.json` entries reference crop image files; resolve them
   through the same base that won the probe (`/tolstack/data/` serves the
   whole `data/projections/viewer/` dir including `crops/`).
2. **Load-time probe picks the transport.** On boot over http(s), try the
   HTTP adapter first (a cheap probe fetch of `topologies.json` with
   content-type check — never status alone; drawing-checker's nginx lesson:
   a catch-all can answer 200 + HTML for anything); fall back to FSA when the
   probe fails or on `file://`. In served mode the connect-folder banner
   disappears entirely; in FSA mode nothing changes. The banner states which
   source the data came from in plain words ("served" vs the granted folder).
3. **Reload re-reads over the live transport** (including the crops), and the
   error surface from `viewer_error_surface_and_layout` covers HTTP failures
   (a mid-session server stop must produce the banner error, not a blank).
4. **Tests**: node tier covers the http adapter against a local static server
   fixture (both probe layouts); browser tier gets a served-mode boot
   (Playwright can serve the repo root — no FSA dialog needed, which
   incidentally lets the browser tier finally exercise the real non-mock boot
   path). Pin that `?mock=1` still works.

## Definition of done

- Served through a repo-root static server, the page boots to a fully
  rendered DAG with ZERO manual steps (no folder grant); under `file://` the
  FSA path still works.
- Demonstrated against drawing-checker's real mount from the main checkout
  (`http://127.0.0.1:8000/tolstack/viewer/topology.html`) — record the result
  in the lesson (this is the surface Jeff actually uses).
- Full JS suite + pytest green.
- Lesson (`docs/sessions/lessons/LESSONS_20260909_viewer_http_transport.md`):
  which probe candidates resolved where, capabilities differences between the
  two transports (anything served mode can't do), and what hosting the viewer
  would still need.
