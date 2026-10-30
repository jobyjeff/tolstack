# Lessons 2026-10-30 — a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark

## Where the record lives, and why there

`apps/viewer/element_record.js`: `VA.elementRecords(topoProj, opts)` builds one
record per node and edge, keyed by the pane's own hover key (`node|<id>`,
`edge|<id>`), and `VA.elementRecord` builds one. It is built at **page time**
from the projections, and memoised on the identity of its inputs, so a hover
reads a record and never rebuilds the set. It is **not** a projection field:

- the contribution a record carries depends on which study the reader has
  open, so a projection-time record would need one copy per (element × study);
- the crop index is its own projection (`crops.json`), and the record would
  have carried a second copy of it;
- nothing in the record is computed. Every value is a projected one, carried
  as-is, so moving it into Python buys no arithmetic safety.

What the handoff called "the binding state" is only half there. No viewer
projection holds feature-identity events, so the record says whether a binding
is **wanted** and whether the part has a **mesh** to bind on, but not which face
is bound. Filed as `ISSUE_20261030_the_element_record_carries_no_bound_face.md`,
with a recommendation for a projection field.

## What the three tiers used to compose independently (the drift this ends)

| Fact | DAG hover (card) | Grid hover (card) | Click (preview pane) |
|---|---|---|---|
| "attach to 3D" offered | `needsAnnotation(confidence)` | same card | `needsAnnotation(confidence, edge)`: a valueless structural edge offered 3D on click and not on hover |
| a node's side pictures | each side's part picture | n/a | none: a node clicked showed less than the same node hovered |
| the citation | "cited at:" line | the chip opened a third model (`VA.citationCard`) | its own `citation()` block |
| part sourcing ("standard part — dimensions from …") | component card only | component card only | never |
| a floored bar's "not to scale" | the card's render note | n/a | never |

After this change, the Preview renders the record: `VA.renderTopoDetail`'s
node and edge branches read only the record. The DAG label and every mark's
`aria-label` are the record's title. The grid row's name and nominal/min/max
cells read the record too. The floored note is the one picture fact. It rides
in the label (`VA.hoverLabelText(title, note)`), because it is a fact about the
drawing and not about the edge.

## Hover / freeze / return, as built

- `topology_app.js`: the Preview shows one key, `paneHotKey || sceneHotKey ||
  selection`. The pane's `onHot` feeds the first. The scene's `annotate:hover`
  feeds the second. The selection IS the freeze.
- Return to the frozen element is delayed `VA.PREVIEW_RETURN_MS`, so a pointer
  crossing the gap between two marks does not flash it.
- Esc: an open popover first. With none open, Esc unfreezes, unless a modal
  dialog is open or a scene pick is armed (those own Esc).
- A click on the pane's empty canvas unfreezes, but not a drag
  (`VA.PREVIEW_CLICK_SLOP_PX`), and not a click on any mark or control
  (`PREVIEW_KEEPERS`). A mark's own `onclick` stops propagation as well.
- The right pane splits on model pages only (`.detail--split`). The results
  scroll in their own box, and the Preview takes `flex: 1 0 55%`. The stack
  page's pane is untouched.
- The scene: `scene.js` raycasts the model dots on every pointermove
  (`_modelHoverMove`, the same cheap ray the click uses) and reports changes
  only. `app.js` posts `annotate:hover` / `annotate:pick` through
  `postToShell`, which also records the last of each on
  `window.__shellMessages` for a harness.

## The label

- It sits beside the mark on the first of six sides that meets no other mark's
  box and stays inside the drawing (`VA.hoverLabelPlacement`, pure,
  fast-tested). Bounds are widened left to the pane's visible edge at hover
  time (`labelBounds`). The rails SVG is often much narrower than its pane, and
  a 48-character label never fits beside a mark inside it.
- That needed `svg.tv__rails { overflow: visible; clip-path: inset(0 0 0 -2000px) }`.
  Plain `overflow: visible` let the fitted study names (whose 6px-a-character
  estimate runs short) spill past the right edge into the grid. The inset clip
  keeps every edge clipped as before except the left one.
- It is drawn in the DAG's scaled layer and counter-scaled, so it reads at the
  micro step at any zoom.

## Checks and witnesses re-anchored (nothing deleted silently)

### Specs that named a retired guard, re-anchored

| Retired guard | Now |
|---|---|
| hovering the DAG's own bar opens the edge card with the crop body | hovering the DAG's own bar previews the edge's record |
| the crop's element IS the picture … (topology suite) | the card's crop element IS the picture … (popover suite, same CSS mutation) |
| the DAG-side card opens from its own rail bar in the short window … | the label covers no other mark on the DAG, and takes no pointer |
| opening a balloon crop's hover CARD fetches its parts-list companion … | previewing a balloon crop's row fetches its parts-list companion … (the same companion term, in `fetchPreviewImages`) |

### Specs that moved suite with their guard (same name, same mutation)

These three guard names are unchanged. Their suite is now
`popover mechanics (the stack page's citation card)`:

- a card with the pointer on it is not re-placed when one of its images settles
- a held trigger the pointer STOPS on opens after the grace period …
- an open card is placed in the WINDOW's frame, not the document's …

### The popover's own contracts moved

The topology grid's edge card was the only place the popover mechanism itself
was measured: out of flow, the room cap, the window frame, the hover-intent
corridor (steal / expiry / arrival / away), re-place under the pointer, and the
crop overlay. The popover is still live (citation, alerts, gap, curve cards and
the crop popover), so those contracts moved to a new suite on the stack page's
citation card. The corridor uses row 3's chip, whose card opens under row 1's
crop trigger. Every tripwire is re-measured there before what it certifies.

### Browser checks retired without a successor

- "an open card moves the DAG pane by nothing at all" and "leaders still land …
  with a card open", plus their DAG-side twins. These were the layout contracts
  of a card over the topology page, and no card opens there now. Out of flow is
  still pinned on the stack page.
- "a card carries exactly one disclosure …" and "a long note shows its lead
  sentence …". These were measured on the component card. The citation card's
  fold rule is pinned in the fast tier (`a citation card states its document
  ONCE and carries at most ONE fold`).
- The component card's three 3D-affordance checks (flyout button, closes behind
  itself, file:// new-tab link). The affordance went with the card. Filed as
  `ISSUE_20261030_the_preview_offers_no_way_to_see_a_part_on_its_own_in_3d.md`.
  "A part with no installed mesh shows NOTHING about 3D" is re-anchored to the
  row's Preview.

### Fast checks

The card models' tests (`edgeCard`/`nodeCard`/`componentCard`/
`renderHoverCard` for those kinds) are ported to the record and to the Preview,
one for one. The new names are in the guard diff, and twelve of them carry a
spec.

### New names that carry no spec (the pin is raised for them)

These are ports of retired checks that had no spec under their old names, plus a few tripwires and precondition checks. The pins in `scripts/guard_enumeration.mjs` are raised for them:

- fast: an interface's sides, the grid's merged cell and a node's record all name a part the SAME way, off one derivation
- fast: a part's record states a document's sourcing in the words that document has earned
- fast: a floored bar is rendered marked: the --floored class, the break glyph, and a hover label that says not-to-scale
- fast: a thumbnail sits on the row for every crop-key'd edge, and on no others
- fast: a fetched crop upgrades its cell to the actual thumbnail image; an unfetched or unresolved one never shows a placeholder
- fast: a record reads a {topology, edge} crop key out of by_topology — the space the real inline edges' crops live in
- fast: a part's picture is derived from its OWN rows' resolved crops, and a part with none has none
- fast: a citation card states its document ONCE and carries at most ONE fold
- fast: the Preview does not repeat a part number the line above it already printed
- fast: the preview pane names the DERIVED sides its record names, not the node's authored `parts` list
- fast: nothing selected tells you what pointing and clicking do
- fast: [real] a pitch_system part's record derives a picture from its own rows' crops
- fast: [real] across every live topology, a part's record says it has a 3D model exactly where a mesh resolves
- fast: [real] every dot of every live topology has a record, and says boundary-or-internal from the projection alone
- fast: [real] no live edge's Preview says its document twice on its own reference lines
- browser: the elements table carries the two triggers these contracts are measured on
- browser: the citation card wants more height than there is room for on either side of its chip — the configuration the card-layout contracts below are only falsifiable in
- browser: Escape closes it
- browser: the citation card opens BELOW its row and just under the row's own alert mark — the layout the two approaches below are only distinguishable in
- browser: an unresolvable crop stays a word, never a placeholder image
- browser: with nothing selected and nothing pointed at, the Preview says so in one line
- browser: the Preview draws the crop wider than the retired card's 260px cap
- browser: no popover opens on a mark's hover
- browser: the bar's Preview and the same edge's row's Preview are the same record, character for character
- browser: no rail mark carries a native tooltip any more
- browser: leaving every mark takes the label down and empties the Preview
- browser: hovering a boundary dot previews the parts that meet there, with the picture only where one resolves
- browser: an internal dot's Preview says it is internal
- browser: clicking a dot freezes the Preview on it, pinned and named in the section head
- browser: clicking a grid row freezes the Preview on its edge
- browser: with a row frozen, hovering another row previews that one
- browser: ...and leaving returns to the frozen row
- browser: an edge with no crop_key gets no crop word or thumbnail
- browser: [real] hovering the edge's row previews it with the real crop and the document it is a crop OF
- browser: [real] hovering pitch_system's own bar previews the same record
- browser: [real] hovering a pitch_system boundary dot previews both parts that meet there
- browser: [real] a node's Preview pictures a side at most once, and only where a crop resolves
- browser: [real] a real spec citation reaches the row's Preview
- browser: [real] ...with the real crop of the spec page
- browser: a part with no installed mesh shows NOTHING about 3D in its row's Preview
- browser: [real] ...and off every anchor the scene says so, and the Preview lets it go
- browser: the grid's own inline thumbnail carries no launcher — it is not a cropFigure, and clicking it keeps the Preview that is
- browser: the Preview's launcher opens the same lightbox, on the same rect — so the grid thumbnail reaches full size in two clicks
- browser: the anchor's Preview and its DAG dot's are the same record
- browser: with an anchor frozen, another anchor under the pointer previews that one
- browser: ...and off every anchor the Preview returns to the frozen one
- browser: a second click on the frozen anchor lets it go, as the scene's own second click does
- browser: Escape lets an anchor-frozen Preview go too
- browser: an anchor the page's topology does not carry selects nothing

## Screenshots (1600x1000, the kinematic study, real data)

- `LESSONS_20261030_a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark_1_hover.png`
  shows the pitch-link bar hovered: its label beside it and its record in the Preview.
- `..._2_frozen.png` shows the same bar clicked: pinned, and named in the
  Preview's head.
- `..._3_frozen_plus_hover.png` shows the bar frozen with the pitch plate's
  link-attach bore dot hovered. The head still names the frozen bar, and the
  body is the dot's record with its part's drawing crop at full pane width.

## Verification notes

- Worktree runs need a projection built from this tree. Scratch root:
  `C:\workspace\tolstack\data\scratch\preview_root\` (junctions for
  `data/inbox`, `data/meshes`, `data/runs` and `docs`, with projections built
  there by this tree's builders with `--data-root`, AFTER a commit, because a
  dirty tree's stamp is refused). It was removed at the end.
- The fast tier's `[real]` half has three failures that are integration's, not
  this branch's: the `display_name` fixture drift
  (`ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures_so_the_real_tier_is_red_on_integration.md`).
  So, as on the leaders handoff, the witness runner cannot prove a fast entry
  from a worktree. Each fast and annotate spec was proved by hand: apply the
  mutation, require `FAIL  <expect_red>`, revert.
- The popover corridor on the stack page first used row 1's crop trigger
  above row 3's card. It was red 3 runs in 4, and the reason is geometry, not
  load. The trigger sat 66px above the card, past the corridor's reach, so the
  crop opened at once and was never deferred. The original grid layout had the
  trigger 20px above. The suite now uses the same row's alert mark, a few
  pixels above the card, with the `< 40px` tripwire restored, and it was green
  4 runs out of 4.
- The memo is load-bearing, and measurably so. With
  `VA.elementRecords`' memo removed, every grid row rebuilds every record, and
  the `[real]` tier went from about 1s to several minutes. That is the witness
  for "built once".
- A bar's preview has two routes: the hit path and the joint glyph at its
  midpoint. A mutation that drops the hit path's hover is masked by the glyph,
  so that spec renames the hit path instead.
- The kinematic page's shape check had to change. The results now scroll in
  their own box, so the contributor table can run past the Preview's top inside
  it. What holds is the order within the results and the results' box above
  the Preview.
