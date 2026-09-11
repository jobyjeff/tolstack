---
handoff: viewer_hover_cards_and_deep_links
date: 2026-09-10
---

# Lessons — viewer_hover_cards_and_deep_links

## The inbound contract as shipped (drawing-checker's handoff reads this first)

Six query params on `topology.html`, one constant (`VA.DEEP_LINK_PARAMS`,
`apps/viewer/viewer.js`), documented as a contract in `apps/viewer/README.md`
§"Deep links in — the URL contract":

- `topology=<id>` · `study=<id>` · `edge=<id>` · `node=<id>` (topology mode;
  study/edge/node require `topology`; edge wins over node)
- `stack=<id>` · `element=<id>` (stack mode — **this pair is what
  `analyses_viewer_deep_link` consumes**; ids are `results.json`'s stack `id`
  fields, NOT filenames)
- `?mock=1` composes (dataset vs. selection); `index.html` redirect carries
  the query through.

Selection semantics: parsed once at boot (`VA.parseDeepLink`), validated id by
id against the loaded projections (`VA.resolveDeepLink`, pure), applied by the
**first successful load** — so under `file://` + FSA the selection lands after
Connect folder, and a later Reload never re-yanks. An id the data does not
contain degrades to the defaults plus a plain-words `banner__notice` line —
deliberately NOT `extraAlarms`, which render under the "needs a rebuild"
headline: a mistyped link is a fact about the link, and rebuild advice would
be wrong. Outbound twin `VA.viewerLink(params)`; round-tripped in tests.

Verified end to end with zero seams in the browser tier's served-mode suite:
`topology.html?topology=pitch_system&study=pitch_system_gas_spring_branch`
over a real repo-root static server boots the HTTP transport and lands with
the study selected and its five total chips on screen.

## Card sources: what exists vs. what remains a gap

- **Edge cards — exist.** The load-bearing fix was `VA.cropForKey`: crops.json
  has had TWO key spaces since 2026-09-08 (`by_stack` keyed `{stack, element}`,
  `by_topology` keyed `{topology, edge}` for inline edges) and the viewer read
  only the first — so all six of the real pitch_system's croppable edges
  (every one is `{topology, edge}`) rendered as "no-entry — the index is
  stale", a live misreading this handoff retired. 33 sha-verified by_stack
  crops + 6 by_topology crops at time of writing.
- **Second-side crops — a gap, by data, not by rendering.** `VA.edgeCard`'s
  `crops` field is a LIST and `views/cards.js` renders every entry, so the
  card needs no shape change when a second side arrives — but an edge carries
  ONE citation and crops.json records one crop per citation, so no second
  entry can exist yet. Where the mating side's citation is even *authored* is
  a schema question → `ISSUE_20260910_second_side_crops_not_in_the_index.md`
  (strategy).
- **Component cards — exist, drawing-crop-derived.** Thumbnail = the resolved
  crop of one of the part's OWN edges' annotations (a crop of that part's
  drawing by construction; never filename/prefix matching). Real data: five
  parts get real thumbnails this way — `hub`, `vpa_piston`,
  `pitch_plate_215177_001`, `gas_spring` and `gas_spring_mount_213668_002`,
  one per resolved pitch_system crop whose edge carries a part (the sixth
  resolved crop, `end_stop_clearance`, is a clearance and carries none;
  list corrected in review — it originally named 2 of the 5). Mesh/annotator
  renders are NOT derivable — no snapshot verb exists
  (`study_3d_flyout` lesson) → `ISSUE_20260910_component_mesh_thumbnails_
  need_a_snapshot_verb.md`. A part with neither gets no thumbnail, no
  placeholder.
- **Citation cards — exist, both modes.** Trigger is the sourcing confidence
  chip (topology grid AND classic elements table); content reuses the factored
  builders (`VA.exportBlockNode` / `VA.exportRunsLine` out of views/detail.js,
  `VA.cropBlock` out of views/crop.js) so an export state cannot read
  differently across surfaces. For a spec citation the card's crop IS the spec
  sheet (the four spec-pile crops), which is what makes it the "spec-sheet
  card".

## No generator script was added

Deliverable 4 was conditional ("**any new** thumbnail generator obeys…") and
none was needed: component thumbnails derive from crops already in the shared
projection, so there is no new writer, no provenance-gate change and no
ARCHITECTURE.md inventory row. The mesh-render generator, if ever built, has
its obligations spelled out in the snapshot-verb issue above.

## Deep links OUT: `/run/`, not `/container/` — and why

The brief calls `/container/<id>` the stable drawing-checker shape, but
container ids are opaque event-minted strings the viewer's data never carries,
and deriving one from a drawing number would be a guess — the exact class of
mistake this surface bans. Cards ship `/run/<run_dir>` links (existing
`VA.runUrl`, immutable per-version page, which itself offers the evergreen
navigation) → `ISSUE_20260910_dc_container_links_not_derivable_from_viewer_
data.md` (strategy: crop builder stamps container ids, or d-c exposes a
resolver).

## The popover went `position: fixed`, and a browser test forced it

"Cards must not disturb the layout contracts" is now measured: the browser
tier opens each card and asserts the DAG pane's box moved by **zero pixels**
and leader correspondence still holds. That measurement failed against the
original `position: absolute` popover — a tall card opened near the fold
lengthens the DOCUMENT, and the scrollbar it summons reflows every pane. Fix:
`#croppop` is `position: fixed` with viewport coordinates in `position()` and
a `max-height: calc(100vh - 24px); overflow-y: auto` so tall crops stay
reachable. Second measurement trap: drive the card by **hover, not click**,
when measuring — a click also selects the row (its normal job) and the detail
pane repopulating is legitimate layout movement that drowns the signal.

## Decisions the handoff did not spell out

- **Card triggers are specific elements, not whole rows or rail bars**: the
  crop trigger (edge card), the merged component cell (component card), the
  confidence chip (citation card). The rail bars keep their native `<title>`
  hover — `VA.edgeHoverTitle` is a landed "one hover surface, not two"
  contract, and a card popping on every row-crossing would be noise.
- **Cards always render annotator LINKS, never the flyout**, even where the
  mount probe passed: a card is transient hover chrome, and the detail pane
  (which persists) is where the attach-to-3D flyout upgrade already lives. The
  edge card offers its annotate link under the same `VA.needsAnnotation`
  gap-only rule as the pane.
- **The mock mechanism keeps `crop_key: null` on its inline edges** — their
  fixture citations are workbook/no-source, which the real builder would never
  key, so patching one in would teach the fixture a state the builder refuses.
  The `{topology, edge}` path is exercised by fixture-tier tests that address
  `fixtures.js`'s existing `by_topology` entries directly, by the `[real]`
  fast tier, and by the served-mode browser tier over the real pitch_system.
- The gap component cell (a clearance) keeps its plain title — no part, no
  card, and the web-UI rule says show nothing about an absent thing.

## Suite counts at finish

`node apps/viewer/run_tests.cjs` 234/234 (283/283 with `--repo
C:/workspace/tolstack`); `node scripts/run_viewer_browser_tests.mjs --repo
C:/workspace/tolstack` 16/16 suites (incl. new "deep links" ×2 and the
served-mode DoD demonstrations); pytest 759 passed, 1 skipped (the standing
worktree skip).
