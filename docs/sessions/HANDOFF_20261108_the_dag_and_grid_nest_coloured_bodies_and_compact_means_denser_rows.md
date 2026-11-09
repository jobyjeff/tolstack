---
priority: code-red
depends_on: [the_end_stop_model_names_its_datums_right_and_folds_its_riders]
model: opus
hitl: false
---

# HANDOFF 2026-11-08 — the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows: every body is a labelled coloured container holding labelled part containers, in the DAG and as grid braces alike; the zebra bands go; Compact shortens rows without shrinking the drawing; Groups off means that kind of outline is gone everywhere

Source: Jeff's live walk of the merged M1 page, strategy session 2026-11-08
evening, with the strategy session's own look at the same page (shots and
DOM counts below). Demo tomorrow afternoon (2026-11-09): this is the critical
path. Baseline: `integration` after
`the_end_stop_model_names_its_datums_right_and_folds_its_riders` merges
(v2 then has five bodies, no riders, in Jeff's order) — merge `integration`
before you measure anything. Scope: `apps/viewer/topology.js`,
`apps/viewer/views/topology.js`, `apps/viewer/topology.css` (everything
**except** the `.seam*` rules at ~892–904, owned by the sibling),
`apps/viewer/topology_app.js` **toolbar, View and density handlers only** —
do NOT touch `drawSeamLeaders`, `seamAnchors`, the `annotate:anchors`
listener or anything under `apps/annotate/` (sibling
`the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`
runs beside you and owns those), the topology files, the builders, or the
grid's value columns.

## What the merged page does today (measured 2026-11-08 19:30 PST, 1920 and 2560 wide)

- **Zebra bands**: 24 `.rail__band` polygons drawn under the v2 DAG at
  `rgba(255,255,255,.017)` / `.055`. Jeff, twice (11-05, 11-08): remove them.
- **Colour**: `View → Colour by` defaults to **None**; every body container is
  the same near-white stroke (`--group-body: #d7dde6`, 1px); body fills
  (`--tv-body-0..15`) are at .06–.075 alpha and off by default (`Group fill:
  None`). Jeff: *"the colors are still bleached out … Getting some contrast
  in the colors is likely to be higher impact than making the line weight
  excessively heavy."* Sixteen saturated body inks already exist
  (`--tv-body-ink-0..15`, topology.css ~157–172) and are used by nothing a
  reader sees by default.
- **Line weights**: containers 1px, leaders 1.5px, bars 4px. Jeff: *"Line
  weights are still very thin, though the layout is a bit less scrunched."*
- **Nesting**: the DAG draws a body field and, inside it, part blocks
  (`tv__block`, `tv__partfield`), but a one-part body (tangential link, pitch
  link) reads as a single rounded rect; the grid's braces are **body kind
  only** (`braceKinds = [tvbrace--body]`, 6 caps, 19 part rules, no labels).
  Jeff: *"Rigid body groups (the brackets) in the grid view have no labels,
  parts don't have brackets around them … the nested part containers and
  rigid body containers disappeared, there's now only one layer of container
  brackets … What we discussed was making a rigid body with a single part
  inside of it, so it should be two nested sets of braces."*
- **Compact**: `Rows: Comfortable → Compact` sets `rowHeight` 26 → 16 and
  every SVG metric follows it, so the whole drawing scales down uniformly
  (shot `v2_density_toggled`: same picture, smaller). Jeff: *"mostly just
  scales/zooms the entire dag uniformly which is redundant with just zooming
  the canvas."*
- **Groups filter**: unticking **Parts** in `Groups (4 of 4)` changes nothing
  on v2 (shot `groups_parts_off`: identical DAG) because parts are drawn as
  blocks and a block's outline is not a "part container" to the filter. Jeff:
  *"Group filtering still broken (when you hide parts, only some of the parts
  get hidden in the 2d dag)."*

## Deliverables

1. **The zebra bands are deleted.** `.rail__band*`, `--tv-band-a/b`, the
   `bands` output of `VA.leaderGeometry` and whatever draws them; the
   grid-row half is already gone (11-05). Retire their guards and specs
   rather than leaving them red.
2. **One colour per body, everywhere the body is drawn, by default.**
   `Colour by` defaults to **Body** on every model (keep the other choices).
   The body's ink colours its container stroke in the DAG, its name label, its
   grid brace and brace label, and the body-attribute tint of its rows when
   `Colour by: Body` is on. **Two palettes** in `View → Palette`: `Bold` (a
   plotly/matlab-class categorical set — the existing sixteen inks are the
   starting point; raise them to full saturation and check 3:1 against the
   page background) and `Colour-blind` (Okabe–Ito, eight hues, then the Bold
   set's remainder). Group fill defaults to **Parts**, with the body ink at an
   alpha that reads as a tint (~.14–.18), not the current .065 — judge it on
   the page, not in the token file. The 3D tint sharing these inks is **not**
   this handoff's (M2); say so in the lesson.
3. **Line weights, modestly.** Body containers 1.5px, part containers 1.25px,
   rails and leaders as they are, bars as they are. Jeff ranked contrast
   above weight; a container that is coloured no longer needs to be thick.
4. **Two nested layers, always — DAG and grid.** Every body is an outer
   labelled container (name in its ink, top-left, never over a glyph); every
   part inside it is an inner labelled container (drawing number, or the
   part's `display_name` when it has one); a one-part body still draws both.
   In the grid the same two layers are braces: the body brace outermost with
   its name, each part's brace inside it with its number, caps thick enough
   to read (Jeff's 11-05 PowerPoint sketch, cited at
   `docs/sessions/completed/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md:25,30`,
   draws them thick and coloured; what landed is 1px). Labels sit in the
   gutter left of the PART column; the PART/DESCRIPTION cells keep their text.
   The study brace (kinematic/chain) stays as the third, outermost kind where
   a study is open.
5. **Compact is denser rows, not a smaller drawing.** `Rows: Compact`
   compresses the row pitch (26 → 18px; grid text at `--t-dense`) and **only**
   the row pitch: dot radii, glyph sizes, label font, column gutter and
   stroke widths are the same pixels at either density. Zoom is the canvas's
   business (`Fit`, the wheel). If a rail metric is derived from `rowHeight`
   today, decouple it. A browser check pins that the column pitch and the dot
   radius are equal at both densities.
6. **Groups off means gone.** Unticking **Parts** removes every part outline
   (blocks' outlines and part fields alike, and the part braces in the grid);
   unticking **Bodies** removes every body outline and body brace; both off
   leaves the rails, nodes and bars alone. The count of each outline class is
   0 in that state (a browser check), on v2 and v1.
7. **Click around before you call it done** (CLAUDE.md, 2026-11-03): open v2,
   toggle every View setting, both densities, every Groups combination, hover
   and select a row, switch to v1 and back; look at each shot; write down
   what you saw that this handoff did not ask about.

## Definition of done

- Projections rebuilt in the main checkout (`scripts/rebuild_projections.ps1`),
  the merged `integration` tree served at
  `http://127.0.0.1:8000/tolstack/viewer/topology.html?topology=vpa_end_stop_v2`.
  Screenshots at 1600 and 2560 wide of: the default page (Colour by Body,
  fill Parts, Bold palette, Comfortable), Compact, Colour-blind, Groups with
  Parts off, Groups with Bodies off, and v1 default — **each looked at by
  you, and the lesson says what each shows in one line**. The DAG and the
  grid show the same five body colours; every body and every part has a
  labelled outline; no label overprints a label or a glyph at the default
  zoom.
- `.rail__band` count 0 everywhere; Compact's column pitch equals
  Comfortable's; outline counts 0 under the Groups states above (browser
  checks, enrolled with witness specs).
- Fast tier, `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs` green in the main checkout;
  `--changed-since integration` witnesses pass.
- `apps/viewer/README.md`'s colour section and `docs/DESIGN_TYPE_AND_COLOUR.md`
  say the new rule in a sentence each (one colour per body, two palettes, no
  bands); the `--tv-band-*` comment block is gone with the tokens.
- Lesson (`docs/sessions/lessons/LESSONS_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md`):
  the shots with one line each; the palette values and the contrast each
  holds; what Compact decoupled; what the click-around found.
