---
handoff: viewer_http_transport
date: 2026-09-09
---

# Lessons — viewer_http_transport

## The bug that would have shipped: unbound native `fetch`

`storage/http.js`'s constructor originally did:

```js
this._fetch = opts.fetchImpl || (typeof fetch === "function" ? fetch : null);
```

Every fast-tier test passed with this (the node test tier always injects an
explicit `fetchImpl`, so the fallback branch never ran there). It was the
**browser** truth tier — specifically the new served-mode check, booting
`topology.html` with no `?mock=1` against a real local server — that caught
it: the probe silently failed both candidates and the page fell back to FSA
(`.banner--disconnected`), even though a plain `fetch()` from the same page,
at the same URL, worked fine. Root cause: calling `this._fetch(url)` invokes
the stored function with `this` bound to the adapter instance, and native
`fetch` brand-checks its receiver — an unbound call throws `TypeError: Failed
to execute 'fetch' on 'Window': Illegal invocation` in a real browser. The
adapter's own `_fetchQuiet` wrapper (`.catch(() => null)`, written to treat a
*network* failure as "this candidate doesn't resolve") swallowed that
exception too, so the symptom was silent: no error anywhere, just "neither
candidate matched." Fixed with `fetch.bind(window)` — the exact lesson
forge's own `apps/shared/transport.js` already carries in a comment, which I
read before writing this file and still reproduced the bug, because the node
tier's `fetchImpl` injection never exercises the real-`fetch` code path at
all.

**Lesson for the next transport-probing adapter: a node-tier test that always
injects `fetchImpl` cannot catch a real-`fetch`-binding bug by construction.**
The browser truth tier's served-mode check (`testServedModeBoot`,
`scripts/run_viewer_browser_tests.mjs`) is not redundant with the node tier's
two-server fixture (`tests.js`'s http-adapter block) — they prove different
halves of the same adapter, and this bug only existed in the half the node
tier cannot reach.

## Where each probe candidate actually resolves

Confirmed both in the automated tiers and by hand against a live server this
session:

| candidate | resolves under | does not resolve under |
|---|---|---|
| `../data` (sibling-data-mount) | drawing-checker's own mounts (`VIEWER_MOUNT=/tolstack/viewer`, `DATA_MOUNT=/tolstack/data`, verified live against `http://127.0.0.1:8000/tolstack/viewer/topology.html` with `DRAWING_CHECKER_TOLSTACK_ROOT` pointed at this worktree — see below) | a plain `python -m http.server` from the repo root (there is no `/apps/data/` there) |
| `../../data/projections/viewer` (repo-root-static) | `python -m http.server` from `C:\workspace\tolstack` (verified: `apps/viewer/topology.html` reaches `data/projections/viewer/*` two levels up) | drawing-checker's mounts (its `../../` walk from `/tolstack/viewer/` lands outside `/tolstack/` entirely, which drawing-checker does not serve) |

Order matters and is deliberate: candidate 1 is tried first because it is the
narrower, more specific shape (drawing-checker's own mounts, and the surface
Jeff actually uses today); candidate 2 is the general fallback. Both were
measured, not assumed, per the handoff's own instruction.

## Demonstrated against drawing-checker's real mount

Ran drawing-checker's own server (`webui.main:app` via uvicorn) with
`DRAWING_CHECKER_TOLSTACK_ROOT` pointed at this worktree (a copy of the main
checkout's `data/projections/viewer/` staged into this worktree's own
gitignored `data/` for the demo only — nothing tracked, nothing written to
any other worktree) and loaded
`http://127.0.0.1:8000/tolstack/viewer/topology.html` with Playwright, cold,
no query string:

```
banner class: banner banner--ready
banner text:  Served over HTTP — no folder grant needed. Read-only. …
DAG row count: 15
nav tree present: true
page errors: []
```

Zero manual steps, as the definition of done asks. (The banner's own
"9 commit(s) behind master" note is a fact about which branch the copied
projection was built from, unrelated to this handoff.)

## Capability differences between the two transports

- **Reads**: identical — three projection JSONs, crop images (a `HEAD` proves
  presence without decoding pixels, same reasoning `NodeFsAdapter` already
  uses), all through the one shared adapter contract.
- **Worksheets**: the ONE real gap. `capabilities().worksheets` is `false`
  under the sibling-data-mount candidate (drawing-checker's mount reaches only
  the viewer app and its projection dir, never `docs/`) and `true` under
  repo-root-static and FSA. `topology_app.js` reads this before deciding
  whether to offer the "Show worksheet" toggle at all — the same "neither
  mode offers a control it cannot service" rule forge's own two-transport apps
  use — rather than offering a toggle that opens to "could not be read."
  Filed as `ISSUE_20260909_served_via_drawing_checker_cannot_reach_worksheets.md`
  (`type: feature`): it is a real, permanent loss on the surface Jeff reaches
  for most, and fixing it is a drawing-checker mount decision, out of this
  handoff's scope.
- **Connect/reconnect**: HTTP's `connect()`/`reconnect()` just re-run `init()`
  (the probe); neither is ever reached from the UI, since a *picked* HTTP
  adapter is only ever already `READY` — the connect-folder banner simply
  never renders in served mode, which is what "disappears entirely" (the
  handoff's own wording) turned out to mean in practice: no new banner branch
  needed, the existing `READY`/`DISCONNECTED` split already does it.
- **Failure surfacing**: deliberately asymmetric across the adapter's own
  methods. `_readProjection` (results/crops/topologies) distinguishes a 404
  ("not built yet", same as every other adapter) from any other failure
  (thrown, reaching `load()`'s rejection and the banner's error text) — this
  is what makes a mid-session server stop show the crash/error banner instead
  of silently reading as "unbuilt." `readCropImage`/`readText` never throw,
  matching FSA/node-fs's existing "absence is normal" contract; a crop or a
  worksheet failing to resolve already had an honest sentence in the views
  before this handoff, and a network failure there is indistinguishable from
  absence on purpose (a broken image or a "could not be read" line, not a
  crashed page, for a part of the UI that was always optional).

## What hosting the viewer would still need

Beyond this handoff's transport (per its own "prerequisite for ever hosting
the viewer" framing):

- **Cache headers.** `HANDOFF_20260909_tolstack_mount_cache_control` (staged
  in drawing-checker, explicitly out of scope here) fixes the exact hazard a
  hosted deploy would hit hardest: `StaticFiles` with no `Cache-Control` lets
  a browser skip revalidation on a heuristically-fresh JS file, so a version
  skew across files (old `views/stack.js` + current everything else) throws at
  runtime. This handoff's own probe/read design does not route around that —
  it is orthogonal — but a hosted deploy needs both.
- **CORS**, if the viewer is ever served from a different origin than its
  projection API — `storage/http.js` assumes same-origin (root-relative
  `fetch()` paths, no explicit `mode: "cors"` or credentials handling).
  Nothing in this handoff exercises a cross-origin case.
- **The worksheet gap above**, if worksheets matter on whatever hosted mount
  ships first.
- **HTTPS / mixed content**: untested here (both servers in this session were
  plain `http://127.0.0.1`); the fetch-based design should work unchanged
  under `https://`, but nothing in this handoff proves it.

## Test-tier notes

- The node fast tier's http-adapter block (`tests.js`) needed THREE real
  local servers (`run_tests.cjs`): one serving both mount shapes' fixture data
  (no path collision — one is nested under `data/projections/viewer/`, the
  other is not), one that answers `200 text/html` to every path (the
  catch-all trap the content-type check exists for), and one that 404s
  everything (proving "neither candidate resolves" is read as
  `DISCONNECTED`, not an error). A fake `fetch` could not have caught the
  binding bug above — see the top of this file.
- The mid-session-stop test closes the real server
  (`closeAllConnections()` before `.close()`, to avoid hanging on a
  kept-alive socket) rather than pointing at a dead port — the SAME origin
  has to succeed then fail, which a swap to a different, never-listening port
  cannot simulate.
- The browser truth tier's new `startRepoRootServer` serves this worktree's
  own `apps/` etc. from `REPO`, but resolves any `/data/...` path against
  `DATA_REPO` instead (the same `--repo <main checkout>` escape hatch every
  other real-data check in that file already uses) — a worktree has no
  `data/` of its own, so without this split the served-mode real-data check
  would always report itself skipped from a worktree.
- `node_modules/` (hence `playwright-core`) needed `npm install` in this
  worktree, same as the previous handoff's own lesson recorded — still true,
  still worth restating for the next worktree.
