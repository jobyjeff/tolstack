# LESSONS 2026-08-25 — stack_viewer_layout_v2

Handoff: `HANDOFF_20260825_stack_viewer_layout_v2.md`. Landed: a compact
grid-like elements table (confidence chip + kind chip + one-line where-ref,
plus the loud export/identity chip where it must stay legible); the worksheet
moved below the table into a collapsed `<details>`; a click-to-select row
model with a new right pane (`views/detail.js`) that renders an element's full
sourcing — callout as printed, citation note unclamped, export-provenance
block, and the drawing crop rendered inline. `run_tests.cjs`: 142/142
(`--repo C:/workspace/tolstack`), python suite untouched at 459/460 (1 skip is
the pre-existing worktree data skip), browser truth tier 4/4 (26/26 app
sub-checks).

## The drawing-checker back-link: researched, and deliberately not built

Deliverable 3 asked for "a link back to the drawing-checker page for that
drawing," suggesting checking how the hosted app builds container/run URLs. I
had a fresh agent read `webui/main.py` and `pipeline/containers.py` in
`C:\workspace\drawing-checker` rather than guess. The route table:

| route | keyed by |
|---|---|
| `GET /run/{dir_name}` | the run **directory** name (id + drawing) — what `VA.runUrl` already builds |
| `GET /container/{container_id}` | an **opaque** `dc_<event_id>` string |

`/container/{id}` is exactly the "stable per-drawing link" shape the handoff
wanted — except `container_id` is minted from a creation event
(`dc_20260804T183824_4f1e9a`), not from a drawing number, and the module
docstring says this is deliberate: *"a container's key carries no part number,
title or revision, so no consumer can be tempted to derive identity from it"*
(forge DESIGN decision 5) — because a drawing number can re-base across builds
and a container can carry more than one as evidence over its life. There is no
`/drawing/<number>` route, no query-param lookup, and the one function that
matches a drawing number to a container (`match_container()`) is internal to
the pipeline's own attach step, never exposed over HTTP. **Given only
`source_ref.document`, there is no URL this page can build without guessing.**

So `views/detail.js` does not add one. What it does add: the same `/run/`
link the crop popover already builds, reused verbatim, wherever the element's
own crop resolved through a run — which is the one address this page can
honestly construct. If drawing-checker ever exposes a
`/container/by-drawing/{drawing_no}`-shaped lookup, that becomes the button to
add; inventing a `dc_...` id from a drawing number here would be the same
class of mistake as a crop of a guessed export.

## Layout decisions Jeff should look at

- **The row keeps the loud export/identity chip.** The handoff's suggested
  compact indicator was "confidence chip + kind chip + a short where-ref" —
  three things. I kept a fourth: the `EXPORT UNESTABLISHED` /
  `EXPORT STATUS UNKNOWN` / `IDENTITY RULE UNKNOWN` chip, because every prior
  handoff on this surface treated "impossible to miss from the row" as
  load-bearing for exactly those states, and dropping it to a click-through
  would have quietly undone that. If Jeff wants the row down to exactly three
  chips, the loud state still reaches the panel on selection — nothing is lost,
  just one click further away.
- **The crop-trigger hover popover stayed, alongside the new inline crop.**
  The handoff said the crop should render inline "not just the current
  click-to-open trigger," which I read as *add* inline rendering, not *remove*
  the trigger — so both exist now: hovering the row's small crop button still
  opens the old popover, and selecting the row also shows the same image
  inline in the right pane. This is arguably redundant once a row is
  selected. I left it in because removing a working, tested affordance felt
  like scope creep the other way; if Jeff finds it redundant, the trigger
  button and `views/crop.js`'s popover path are cleanly removable in one pass
  now that the panel covers the same ground.
- **The worksheet is a native `<details>`, not a JS-driven show/hide.** Its
  open/closed state lives on the DOM node itself (`app.js` sets it once at
  boot and listens for the native `toggle` event) rather than being forced
  every render from `state.showWorksheet` — clicking the `<summary>` directly
  works the same as the topbar button. Collapsed by default now, which
  flips the topbar button's resting label from "Hide worksheet" to
  "Show worksheet".

## A real layout bug the browser truth tier caught, not the fixture tier

`node apps/viewer/run_tests.cjs` was 100% green throughout, because the DOM
shim has no geometry — it cannot fail on "the row is visually behind another
element." `node scripts/run_viewer_browser_tests.mjs` did: clicking the
second element row timed out with `<aside id="detail"> intercepts pointer
events`.

Root cause, found with a five-minute throwaway Playwright script measuring
`getBoundingClientRect()`: the elements table (11 columns) is wider than the
space left beside a 520px right pane at an ordinary window width, and two
things were missing to handle that gracefully —

1. `.stackview` is now a flex **item of `.center`** (a column flex container),
   and a flex item's default `min-width` is `auto` (its content's width), not
   `0`. Without `min-width: 0` on `.stackview` itself, its wide table pushed
   `.center` — and the whole page — wider than the 290+center+520 the layout
   intends, which is exactly the mistake `min-width: 0` on the old top-level
   `.stackview` was already preventing before this handoff moved it under a
   wrapper.
2. Even with that fixed, the table's *intrinsic* width still exceeds the
   remaining space, and nothing clipped or scrolled the excess — so it kept
   rendering into the same screen region the sticky right pane occupies.
   `overflow-x: auto` on `.stackview` gives the excess somewhere to go.

Both are now in `index.html`. One residual: `getBoundingClientRect()` (and
Playwright's default click target, the box's geometric centre) reports a
row's **un-clipped** width regardless of `overflow-x`, so a click aimed at the
centre of a very wide row can still target a point past the visible edge — a
real user clicking on the *visible* part of a row never hits this, but a
naive automated click can. `scripts/run_viewer_browser_tests.mjs` now clicks
each row's first `<td>` (always inside the visible, left-anchored region of
whatever is currently scrolled into view) rather than the row itself.

**Left to watch:** at narrower windows the elements table now needs a
horizontal scroll to see the hardware/sourcing columns while the right pane is
open. That is a real trade-off of giving the right pane a fixed 520px, not a
bug — but it is a layout call, and Jeff may want the pane narrower, collapsible,
or the table's low-priority columns (LMC/MMC) droppable at that point instead.

## An incident, unrelated to the diff but worth carrying forward

I spent the first half of this session editing `C:\workspace\tolstack` (the
**main checkout**) instead of this worktree — a plain mistake, not a tooling
one; I had the two paths confused. A concurrent review session for a
different handoff ran `git checkout <sha> -- .` in that same main checkout for
an unrelated reason and, as a side effect, wiped my uncommitted edits there
back to `master`'s content (see that session's message in the transcript). No
data was actually lost: everything was still in this conversation's context,
and one untracked new file (`views/detail.js`) survived on disk because
`git checkout` does not touch untracked files. I replayed every edit into the
correct worktree, verified the main checkout returned to showing only that
other session's own pre-existing (not mine) uncommitted work, and reran the
full test matrix from the worktree. Nothing in the *shipped* diff is affected,
but it cost real time and is exactly the class of mistake
`LESSONS_20260812_viewer_export_and_material_provenance.md` already warned
about ("I edited the wrong tree twice") — that lesson's tell (*"the tell is
that `git status` in your worktree comes back clean after an edit"*) is worth
repeating because it is precisely how I would have caught this immediately if
I'd checked it before running `node apps/viewer/run_tests.cjs` and seeing
stale test names in the output.

## Left for the next agent

- The crop-trigger/popover-vs-inline-panel redundancy noted above.
- Materials, Paths, Checks, Gaps and Notes sections are untouched — this
  handoff's scope was the elements table's source column and the worksheet's
  position, and nothing else needed to change to satisfy it.
