---
type: feature
priority: med
status: open
area: apps/viewer
reporter: agent
audience: strategy
---

# The viewer cannot build drawing-checker `/container/<id>` links — no container id reaches its data

The `viewer_hover_cards_and_deep_links` handoff names `/container/<id>` as the
**stable** deep-link shape into drawing-checker (its evergreen per-drawing
page; `/run/<run_dir>` is the immutable per-version page). The hover cards
ship with `/run/<run_dir>` links only, via the existing `VA.runUrl`, because a
container id is not derivable from anything the viewer reads:

- drawing-checker container ids are **opaque** (`dc_20260804T183824_4f1e9a`,
  minted in `data/containers/` attach events) — not a function of a drawing
  number, so the viewer cannot compute one from a citation's `document` field
  without guessing, which is the class of mistake this surface exists against.
- `crops.json` entries carry `run_dir`/`run_id` but no container id, and the
  crop builder was out of scope for that handoff ("do NOT touch the projection
  builders other than adding a new generator").
- drawing-checker exposes no by-drawing or by-run resolver route the served
  page could query (checked `webui/main.py`'s route list, 2026-09-10).

Two candidate fixes, one per repo — a strategy call on which side owns it:

1. `scripts/build_viewer_crops.py` (tolstack) already scans drawing-checker's
   tree to resolve `run_dir`; it could also fold `data/containers/`'s attach
   events and stamp a `container_id` onto each run-resolved crop entry (and
   perhaps onto export runs). The viewer then links `/container/<id>`
   preferentially, `/run/<run_dir>` as the immutable fallback.
2. drawing-checker could expose a resolver (`/container/for-run/<run_id>` or a
   redirect from `/run/<id>?evergreen=1`), letting the viewer keep linking by
   the run id it already holds.

Until one lands, the cards' run links go to the immutable page, which itself
offers the container/version navigation once opened — nothing is unreachable,
just one hop less stable than the brief wanted.
