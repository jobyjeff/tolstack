# tolstack — viewer (`apps/viewer/`)

**Review a stack or a topology without opening a `.json`.** One page,
`topology.html`, one left-rail nav tree: every topology with its studies as
children, and every stack no topology re-expresses as a leaf beside them.
**One system, one entry** — a stack a topology *does* re-express is offered as
that topology and nowhere else, because the graph states everything the table
did. Picking a topology or a study draws the map + grid; picking a
leaf renders the elements table — folds, checks with verdicts, notes and gaps,
coloured by where each value came from. Either way,
clicking a row opens its full sourcing (citation, export provenance, drawing
crop) in the pane on the right, and every crop-bearing row also carries a
hover/click thumbnail trigger right there in the grid.

> **History:** this used to be two pages — `index.html` (stacks) and
> `topology.html` (topologies) — until handoff `viewer_consolidation`
> (2026-09-04) merged them into one page with two separate `<select>` pickers
> and a flat stack rail alongside it; handoff `viewer_v2_single_nav`
> (2026-09-08) then replaced both selectors and the flat rail with the one nav
> tree above, after Jeff found the two-selector page "a complete mess" to
> review in. `index.html` still exists and redirects to `topology.html`, so an
> old shortcut or bookmark still lands somewhere.

Static and build-free — plain HTML + classic scripts, no framework, no npm
build, no daemon of its own (the forge `apps/notes/` and `apps/dashboard/`
pattern). **Read-only**: neither transport below has a write path.

## Two transports, and the banner says which one is live

A load-time probe (`storage/http.js`, wired in `topology_app.js`'s
`chooseAdapter`) decides once, before the first paint, which way the page
reaches `data/projections/viewer/`:

- **served** — the origin that answered the page also answers a projection
  request. Probed against `topologies.json`, content-type checked (never
  status alone — a catch-all route can answer 200 + HTML for anything). No
  folder grant, no picker. Two mount shapes are known and both are tried, in
  order: drawing-checker's own (`http://127.0.0.1:8000/tolstack/viewer/topology.html`,
  a sibling `/tolstack/data/` mount), and a plain static server rooted at the
  repo (`python -m http.server` from `C:\workspace\tolstack`). This is a
  prerequisite for ever hosting the viewer, not just a local convenience.
- **FSA** — **`file://` only**: **Connect folder** grants read access to the
  tolstack repo root via the File System Access API, exactly as below.

Served mode is tried first whenever the page is not on `file://`. What happens
when it *fails* turns on the page's own protocol, and the decision lives in one
place (`VA.chooseTransport`, `storage/adapter.js`):

- on `file://`, FSA is the fallback — it is the only transport that can exist
  there, and the reader is by definition sitting at the machine holding the
  repo, so the picker is a grant they can actually give.
- on `http(s)`, **there is no fallback**. A hosted visitor has no tolstack repo
  to grant, so **Connect folder** is a control that cannot work for them no
  matter what they click. The banner states the fact in one sentence — *"The
  tolerance-stack data is not published on this site yet — there is nothing to
  show."* — and offers nothing else. (Measured 2026-09-14 on the hosted origin:
  every `/tolstack/...` URL answered 200 + the site index HTML, the catch-all
  shape the probe's content-type check exists to reject. It rejected it
  correctly; the bug was the picker that appeared afterwards.)

Nothing about that state is remembered — no flag, no storage. Once the origin
starts serving the projections, a plain reload enters served mode with no user
action.

The banner says which transport is live — a served page reads *"Served over
HTTP — no folder grant needed"*, inside the **Data source** fold (see below);
FSA mode is unchanged, the connect/granted flow already says so. Neither
transport offers a control it cannot service
(`adapter.capabilities()`, never the adapter's class): the one real capability
gap is that drawing-checker's own mount cannot reach `docs/` at all (only the
viewer app and its projection dir are mounted), so a worksheet is unavailable
there specifically — a repo-root static server can reach it, and FSA always
could.

## Launch (one-click, `file://`)

**Double-click `apps/viewer/topology.html`.** Classic scripts exist precisely so
this works with no server. For a desktop shortcut, run from the repo root:

```powershell
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Tolstack Viewer.lnk")
$sc.TargetPath = "$PWD\apps\viewer\topology.html"
$sc.Save()
```

## First use

```powershell
# 1. build what the viewer renders (fast, stdlib only)
venv-win/Scripts/python.exe scripts\build_viewer_projection.py

# 2. build the drawing crops (needs PyMuPDF -> drawing-checker's venv)
C:\workspace\drawing-checker\venv-win\Scripts\python.exe scripts\build_viewer_crops.py

# 3. for a system that has one, the topology + study folds (shares the crops above)
venv-win/Scripts/python.exe scripts\build_topology_projection.py

# 3b. the kinematic studies (reads the linkage sweeps under data/inbox/linkage-sweeps/)
venv-win/Scripts/python.exe scripts\build_kinematic_projection.py
```

4. Open the page, click **Connect folder**, pick the **tolstack repo root**
   (`C:\workspace\tolstack`), grant **read**. The banner turns into a **Reload**
   button and one closed **Data source** fold, and nothing else. Open the fold
   and it holds the build lines: *results built … · crops built … (26
   resolved — 22 sha256-verified, 4 with no sha to check; 22 unresolvable)*,
   then *crops by rule: source_ref_export 22 · spec_pile 4*, then which tree
   wrote each of the two files. A resolved count on its own says nothing about
   whether anything was **checked**, which is the whole difference between a
   crop of the export a citation names and a crop of a file that happens to
   share its name — so the verification counts sit beside it, out of
   `crops.json`'s own `summary`.

   Those five rows were always visible until 2026-09-16, when Jeff asked for
   them to go: *"These 5 lines at the top of the page are meaningless to the
   user. Delete."* They are **folded, not deleted** — the reader who came to read a
   stack never sees them, and the reader investigating a suspect projection is
   one click away. What still shouts on its own is the **stale-pair alarm**
   below, which fires only when the two stamps provably disagree; that one is a
   fact about the data in front of you, and a fold is not where it goes.

Every step is **wipe-and-rebuild** and each owns its own files, so any can
be re-run alone. Re-run step 1 after editing a stack JSON; re-run step 2 after a
new drawing export lands; re-run step 3 after editing a topology or study; re-run
step 3b after a kinematic study or a new linkage sweep lands.
`scripts/rebuild_projections.ps1` runs them all in order. The
banner says when each was built **and which tree built it** — the viewer never
guesses whether a projection is stale, it reports what the stamps say and lets
you judge.

### If a build refuses (exit 3)

`data/projections/viewer/` is **one directory shared by every live worktree**, so
since 2026-08-10 each builder that writes there stamps its own branch and HEAD
sha into its output and **refuses** to overwrite a projection built from a commit
this tree does not contain (`scripts/projection_provenance.py`, and
`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`,
which happened three times). The refusal names the other tree's branch, sha and
filesystem path and says what to run; the fix is normally *rebuild from that
tree instead*, or merge it in here first. `--allow-older-tree` overrides it,
loudly, for the one legitimate case — a deliberate rebuild from an older tree.

No folder grant handy? `topology.html?mock=1` renders a seeded demo — a
mechanism plus a demo stack no topology re-expresses — that exercises every
provenance state. Nothing touches disk.

## Deep links in — the URL contract

**This section is a contract a sibling repo consumes** — drawing-checker's
analyses panel links into this page with a stack selected
(`analyses_viewer_deep_link`, shipped in that repo -- `webui/analyses.py`,
pinned by `tests/test_analyses_panel.py` -- reads exactly what is documented
here). The params live in one constant (`VA.DEEP_LINK_PARAMS`,
`viewer.js`) and are pinned by tests in both repos: treat a rename or a
semantics change as **breaking**, and change this section with it.

`topology.html` answers seven selection params, over and above `?mock=1`:

| param | opens |
|---|---|
| `topology=<id>` | topology mode, that topology |
| `study=<id>` | …with that study selected (the grid on the chain's rows, the totals as that grid's own footer rows, the 3D pane's unlit parts dimmed). Requires `topology`. |
| `edge=<id>` | …with that edge selected in the detail pane. Requires `topology` — or `kinematic`, where it selects an edge of that study's model on the study's own page. |
| `node=<id>` | …with that interface selected. Requires `topology`; when both `edge` and `node` are given, the edge wins. |
| `stack=<id>` | stack mode — the elements table — on that stack. Resolves against the projection, not the nav, so it still reaches a stack a topology re-expresses (which has no row of its own). |
| `element=<id>` | …with that element's row selected and its sourcing in the right pane. Requires `stack`. |
| `kinematic=<id>` | a kinematic study's own page (see "Kinematic studies" below). Stands alone but for `edge`: given beside any other param, it wins and the banner says the rest was ignored. |

The rules a consumer can rely on:

- **Ids are the projections' own ids**: a topology/study/edge/node id as it
  appears in `topologies.json`, a stack/element id as it appears in
  `results.json` (the stack's `id` field, not its filename), a kinematic study
  id as it appears in `kinematic/kinematic_studies.json`.
- **Give `topology` or `stack`, not both.** If both arrive, the topology wins
  and the ignored stack is said in a banner notice.
- **An id the data does not contain degrades, loudly and safely**: the page
  opens on its defaults and a plain-words banner line says what the link asked
  for — never an error page, never a silent guess at a different node.
- Values are URL-decoded; the first occurrence of a param wins; an empty value
  reads as absent.
- `?mock=1` composes with all of the above (it picks the *dataset*; these pick
  the selection within it) and survives the `index.html` redirect.
- **Stable under any serving shape**: the contract is query params on the
  relative page — `/tolstack/viewer/topology.html?…` under the drawing-checker
  mount, `/apps/viewer/topology.html?…` under a repo-root static server, and a
  `file://` double-click all read identically. Under `file://` with no prior
  FSA grant the selection applies after **Connect folder** — the link is
  remembered until the first successful load, then consumed.

Examples:

```
topology.html?topology=vpa_pitch_linkage&study=pitch_system_gas_spring_branch
topology.html?topology=vpa_pitch_linkage&edge=end_stop_clearance
topology.html?stack=rotor_fastener_length&element=fastener_grip
topology.html?mock=1&topology=demo_mechanism&study=demo_base_to_tip
topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops
topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops&edge=pitch_link_length
```

The outbound twin, for building one of these links in code, is
`VA.viewerLink(params)` — same param names, round-tripped against
`VA.parseDeepLink` by the fast tier.

## The Preview — one record behind every mark

(`a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark`,
2026-10-30.) Jeff: *"[…] they're tracing the same data from 3d to 2d to grid
view, which means all of them should present the same additional data when
hovered or clicked. … the hover previews are
actually pretty jarring and obscure too much of what you're trying to look at
or select."*

- **One record per element.** Every mark of the model — a 3D anchor, a grid
  row, and through its entity anything the map draws — resolves by the pane's own
  `node|<id>` / `edge|<id>` key to ONE record (`element_record.js`,
  `VA.elementRecords`): title, kind, part (name, drawing or the documents its
  rows cite, picture, whether it has a 3D model), the two interfaces, the
  values as transcribed, confidence, citation, crop, whether a binding is still
  wanted, and the active study's reading of it. Built once per page state out
  of the projections, never per hover; nothing in it is computed. The Preview
  renders the record, a mark's accessible name and hover label are its title,
  and the grid row prints its name and numbers off it.
- **Hover previews, click freezes.** The right-hand pane splits: the results
  scroll above, the **Preview** stays below a rule. Pointing at — or focusing —
  any mark on any tier shows its record there: the crop at a legible size, the
  numbers, the citation. Clicking selects it, and the selection IS the freeze:
  the section head shows a pin and the element's name, other marks preview
  while the pointer is on them, and the Preview returns to the frozen element a
  beat after the pointer leaves every mark (`VA.PREVIEW_RETURN_MS`). Esc, a
  click on the model's empty canvas, or the pin itself lets go. The scene posts
  the anchor under its pointer and the anchor clicked (`annotate:hover`,
  `annotate:pick`), so a 3D anchor previews and freezes exactly as its pin on
  the map does; a kinematic study's contributor row previews its edge the same
  way.
- **No popups over the model.** The edge, component and node hover cards are
  gone. The only thing a hover draws on the map is its entity's highlight and,
  on a pin, its short label.
- **Accessibility.** Every focusable mark carries `role="button"` and an
  `aria-label` that is its record's title; a grid row is focusable too. Focus
  previews exactly as hover does, and Enter or Space clicks. A new mark is named
  from its record, never from a string of its own.

A node's Preview names **which parts meet there**: the sides derived from the
edges actually incident on it (`VA.nodeAdjacentParts` — the same adjacency the
boundary/internal rule reads, not the node's authored `parts` list), each with
what identifies its part and that part's own picture, so the pin and every row
of the part cannot disagree about it. An adjacent edge with no part is a
**clearance**, named (`VA.CLEARANCE_SIDE_LABEL`) rather than skipped, and there
is never a crop *of the interface itself*: an interface is a location, not a
value. The pane printed the authored `parts` list until handoff
`surfaces_that_state_something_false`, which is 74 of the
119 live nodes answering differently hovered and clicked (both models; 37 of 79 then) — one surface and one
record now.

A part with no drawing of its own is identified by the documents its own rows
cite (`VA.renderPartSource`): *"standard part — dimensions from NAS6403-NAS6420
Rev 4.pdf · sheet 3"* where every one is a standard sheet, *"dimensions from …"*
otherwise, each document qualified *unverified* where nothing readable stands
behind its numbers. A part number is never printed on two consecutive lines
(`VA.componentDrawingText`, `VA.citationWhere`'s second argument).

## Hover reference cards — what is left of them

(`viewer_hover_cards_and_deep_links`, 2026-09-10; drawing-checker's card
pattern.) The cards that remain serve controls that are not marks of the model
— a stack row's citation, a nav row's and a table row's alerts, a kinematic
verdict's limit, a contributor's missing band, a coefficient's curve — all
rendered into the one positioned popover node the crop popover already used,
all **hover-only chrome**: the popover is `position: fixed`, so an open card
cannot disturb the layout contracts.

**Two rules decide what a card says** (Jeff's de-slopification note,
2026-09-16):

1. **One document statement per card.** The where-line is the statement; the
   picture under it carries no caption naming the file it came from.
2. **One fold per card, and all the long-form prose is in it.** *"For now just
   put all the long form text into a collapsible element (data source)."* The
   record's note in full, the export/identity narrative and each crop's matching
   provenance go inside one closed **Data source** disclosure — the same word
   the banner's own fold wears (`VA.DATA_SOURCE_SUMMARY`). What stays in the
   open is the note's **lead sentence** (`VA.leadSentence`) and anything that is
   an **absence**. A disclosure is a fold, not a place to hide a gap.

**One hover surface, not two.** Since `nav_tooltip_once_and_rail_hover_emphasis`
(2026-09-30) that holds for the **alert mark** on all three surfaces it is worn
(`VA.alertBadge`: the nav rail's rows, the elements table's source cell, the
materials table's). Jeff, on the rail: *"there is a duplicate hover-over tooltip
(unformatted and formatted versions) that sometimes block each other. Keep just
the formatted one."*

- **Citation card** — on the elements table's sourcing confidence chip (the
  stack page; the topology grid's chip opened one too until 2026-10-30, and its
  row's Preview carries the citation now). The spec-sheet reference: the
  where-ref, the callout as printed, the note in full, the export/identity
  block (`VA.exportBlockNode`, the same builder the right pane uses, run links
  included) and the crop of the cited sheet where one resolved — for a spec
  citation that crop *is* the spec sheet.

Outbound deep links from cards: the drawing-checker **run** page wherever a
crop resolved through a run (`/run/<run_dir>`, `VA.runUrl` — the immutable
per-version URL; the evergreen `/container/<id>` needs a container id nothing
in the projections carries yet, a recorded gap), the source PDF as `file://`
link — **only on a `file://` origin**, where a `file:` navigation can actually
happen (see "Open the PDF only renders where the origin can follow it" below;
the copyable path that used to sit beside it is gone) — and the annotator
(`../annotate/index.html?…`, the existing relative shape).

### The stale-pair alarm never prints a command (`viewer_rebuild_affordance`)

Pasting `venv-win\Scripts\python.exe ...` into PowerShell straight from a web
page is not acceptable UI design (Jeff, 2026-09-10) — and the pasted text had
a bug of its own besides: two commands landed on one line with no separator,
because they were adjacent inline `<code>` elements with nothing between them.
The alarm box (`views/banner.js`'s `provenance()`) never shows a rebuild
command again, in either mode:

- **served, with drawing-checker's rebuild endpoint live** (probed —
  `adapter.capabilities().rebuild`, never assumed from the mount matching) —
  a **Rebuild** button drives the whole thing: click, POST, poll status,
  reload on success, a fixed plain-words sentence on failure.
- **everything else** (`file://`, a plain static server, or the mount without
  the endpoint) — one sentence, nothing to type.

## The one rule: the viewer computes nothing

`tolerance_stack.fold()` is the only arithmetic in this repo — *"there is exactly
one line where a sign can be wrong"* (`ARCHITECTURE.md`). A second fold written
in JavaScript would be a second such line, so there isn't one:

- every interval and every verdict is read out of `results.json`, which
  `scripts/build_viewer_projection.py` produced by calling `fold()`;
- element `nominal`/`min`/`max`/`lmc`/`mmc` are printed **as transcribed** —
  `String(n)`, no `toFixed`, no unit conversion, no band derived from limits;
- even the rounding happens in Python (fold outputs are rounded to 6 dp, term
  coefficients to 9 dp, at build time) so the browser is never the thing deciding
  how a number reads.

`tests/test_viewer_projection.py` pins the embedded stack as byte-identical to
the authored file, and re-asserts the ground-truth numbers *through* the
projection.

## The one nav

**The left column is the model's tree** (`#navtree`, `views/nav.js`; since
2026-11-10, `the_model_is_derived_once_and_the_left_column_is_its_tree`). At
the top a **picker**: every model (a topology), then, under *Other analyses*,
every stack no topology re-expresses. Choosing a model draws the DAG + grid
(topology mode); choosing a stack switches the centre pane to the
elements/paths/checks/gaps view (`views/stack.js`, stack mode). Under the
picker the chosen model's tree, read off the projection's one `model` block
(`model.js`, built once per load, never per paint):

```
[model picker]                 the models, then any analysis in neither
Rigid bodies
  body                          swatch in the body's DAG ink; show/hide in 3D
    Parts
      part                      number, then everyday name; show/hide in 3D
        ▸ feature  ○            one status mark: bound, suggested, none
            state line          the pane's words for it (a bound face, a
            candidate faces     suggestion count, an armed pick), the faces
            Pick a face…        it could be, then the one pick action
    Interfaces                  those inside the body
      interface / joint         a joint with several constraints opens to
        part · feature          them; each opens to its two ends
Joints between bodies           listed once
Studies                         the model's chain studies, its kinematic
                                studies, the sweep row
```

Every row is what its model entity is. **One selection and one hover** light
it (`state.focus`, "One selection, one hover, four surfaces" below), **in two
tiers** since 2026-11-12: what the one resolver (`VA.focusLightOf`) says the
entity *owns* is `--on` (selected) or `--hot` (hovered) -- a part's row and its
features', a body's and everything in it -- and what it *touches* is the
fainter `--on-touching` / `--hot-touching`: the interfaces to a part's
neighbours, their joint, the feature across each. **Every row selects** -- a
body's, a part's, a joint's, an interface's, a feature's -- and only the
twisty folds. A selection opens every fold on the path to every lit row
(interfaces, joints and groups, not only parts: `VA.navRevealPaths`) and
scrolls the first lit row not on screen into view; a hover opens nothing,
and a closed fold that hides a lit row wears a small mark instead
(`--holds`, `--holds-touching`). The reader's later fold still wins.

**A feature row is its own disclosure** (2026-11-10, Jeff: *"The features
inside of a part aren't shown as collapsible elements, and then when you click
them a second collapsible element appears underneath it with the same title.
It's jarring"*). While the 3D scene is open the row carries a twisty, and it is
open when it is the selected feature (the reader's fold wins after that). Its
body is the pane's rows for the feature, with the pane's own head row for it
**not** drawn — the feature row above is the one title — laid out the same way
whatever the feature has: the **state line** (the pane's second line for the
end: `no face bound`, `face 110 of 214698-002`, `candidates · 3`, `suggested ·
high`, `at the as-modelled pose for picking`), the end's own actions where it
has any (**Accept** on an open proposal), then its list — the **candidate
faces** if any, each with why it is there and a Take, and last the **one pick
action**, `Pick a face…`, in the same words whether nothing is bound, a face is
bound or a face is suggested (`Cancel`, pressed, while the pick is armed). The
hover-revealed Pick / Re-pick button the row used to wear is gone, everywhere
(`apps/annotate/app.js`'s `endPickAction` is the one place), as is the candidate
list's own ▸ in sweep mode: the list is always under the end, and the feature
row is the disclosure. No marks legend repeats under a row, and opening a row
never scrolls the column; only a selection the *scene* made brings its row into
view. With the scene closed the row is a leaf — there is no body to open, and
a control with nothing behind it is shown as nothing. In bind mode the body is
the pane's element rows for the edges at the feature's node -- the pane is
scoped to the selected node (`filter-element`) and the page cuts the rows by
the node's edges (`VA.sceneRowsForFeature`) -- each with its own disclosure and
its two ends' candidate lists; a second feature row opened in bind mode without
being selected has no rows to show.

Gone since 2026-11-10: the Models list, the component chip, the whole-rail
mirror ("All N interfaces", "In this model" / "Other parts"), the Stacks
section on a model those stacks are not part of, and the all/unbound/bound
filter.

A topology is extra authoring for a mechanism-shaped question, not a free side
effect of having a stack, so some stacks have one and some do not — and what
the rail offers is **one entry per system either way**. A stack a topology
re-expresses has no row: it is the same joint in another notation, and the
graph states every verdict, gap, excluded term and missing tolerance the table
stated (`tests/test_topology_conversions.py` pins that claim document by
document, so it fails rather than a reader quietly losing a gap list). A stack
*superseded* by a later take has no row either — `VA.SUPERSEDED_STACKS`
(`topology.js`) names the take that replaced it, and the same test checks both
documents really exist; the JSON is never deleted, it just stops being a rail
entry. Which stacks are re-expressed is read off the linkage already on hand:
an edge that re-expresses a stack element carries
`crop_key: {stack, element}`, and that IS the "this stack has a topology" fact,
so nothing new is authored to say so (`VA.navTree`, `topology.js`).

> **History:** until 2026-09-15 a re-expressed stack *was* offered, nested
> under its topology behind a "classic view" chip, because a study's own
> `checks` had no field in the topology projection and a verdict was reachable
> *only* through that nested table. The field landed on 2026-09-09
> (`topology_projection_emits_study_checks`) and the DAG page rendered it on
> 2026-09-15 (`viewer_study_verdicts_and_gaps`), leaving a second entry for the
> same joint with no argument behind it — and a wedge behind the click, which
> is what Jeff's review of that day reported. Handoff
> `viewer_nav_wedge_and_classic_retirement` removed the row and contained the
> wedge.

### Kinematic studies — a section of their own

(`the_viewer_shows_a_kinematic_study`, 2026-10-20.) Under the tree, one small
**Kinematic studies** heading and, beneath it, one group per topology, named by
the topology's title: a row per kinematic study, and — for a topology that has
published linkage sweeps but no study yet — one **Kinematic model** row. The
section is absent, with nothing said about it, whenever the kinematic projection
has not been built.

- **The projection** is `data/projections/viewer/kinematic/kinematic_studies.json`
  (`scripts/build_kinematic_projection.py`). It sits inside the viewer's own
  projection directory because that is the directory drawing-checker serves as
  `/tolstack/data/` — so it is read through whichever transport read
  `topologies.json` (`readKinematic()`, every adapter), and it bakes into the
  hosted bundle with no change on drawing-checker's side. Its `models` list is
  what the model rows come from: per topology, the runs whose
  `geometry.features[]` name it, newest first by timestamp.
- **A study row** opens the study's page (`views/kinematic.js`), the shape
  every study page has (2026-10-28, `the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances`):
  **the model** and its stack (the grid beside it) in the main column, and the
  **results** at the top of the right-hand pane, above the selection's preview
  — the study's name, the verdict per stop (the chain studies' own verdict
  chip and words, its margin and the limit it is judged against, and `BUDGET`
  where the check is a budget), the envelope chart, one readout row per stop
  (where it is on the sweep, the measure there, ± worst case, ± RSS) and one
  **Where these numbers come from** fold — the sweep run, the solver commit,
  the sweep's own analytic-against-finite-difference agreement, how the
  features were identified, the study's authored provenance, and the check's
  excluded terms as **Not in these numbers**. A chain study's page shows its
  verdicts at the top of the same pane, as the same strip (its totals stay at
  the grid's foot). The pane is a region of its own under the grid (since
  2026-11-14), so the results stay on screen while the model scrolls.
- **The model** (2026-10-26, `the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`).
  A kinematic study is a lit subset of its topology's one model, so its page
  draws that model's map, exactly as a chain study's page does, and the
  study's **lit set** (`VA.kinematicLitSet` — every contributor's edge, the
  edge each one borrows its band from, and every node either end of one stands
  on, every joint between two lit nodes, and the shortest path joining the lit
  set's pieces — `VA.litSetOfEdges`, `VA.bridgeLitSet`) is what the grid
  beside it and the 3D scene show. The settings bar's **Unused** toggle hides
  the unlit part of the scene and the grid instead of dimming it (see
  "Studies" below).
- **The grid is the study's stack** (2026-11-03,
  `the_kinematic_grid_is_a_stack_of_sub_stacks`). The grid beside the map is
  the study's one contributor table, the same rows and columns a chain study's
  grid has, at ONE pose at a time (the pose control, below; the first stop's
  own point by default). It reads as a stack: a **Linkage at this pose**
  header over the direct terms, then **Stop position** over one sub-stack per
  sub-study at that stop — an authored chain, or a declared gap (dashed, "not
  yet authored", no total). A sub-stack's header carries its own total in its
  own units and what it contributes here (`±0.82 mm → ±1.417 deg at the −7 deg
  stop`); one with more than three terms is folded until opened (▸/▾), and the
  reader's choice is remembered per study. Rows follow the chain, not the
  reach: `VA.kinematicStackOrder` is the one ordering rule, so two adjacent
  rows are two connected edges. **SENSITIVITY** (the signed coefficient
  at that stop, deg/mm; a chain row's ratio) sits before **CONTRIBUTION** (±
  deg). The grouping is drawn as brackets: thin rounded caps over a group's
  first row and under its last, inset a step per level, so the study holds
  its sub-stacks, a sub-stack the ones inside it, and a rigid body of more
  than one part its parts; a part boundary inside a group is a plain rule.
  **PART** (the number) and **DESCRIPTION** are two columns, said on a part's
  first row. Sourcing is one small mark per row in its state's colour (none
  for a traced value); a legend under the grid names every mark, and the
  row's Preview has the citation, the note and the crop. The stop's own fold
  and its verdict are the grid's foot.
- **The pose** (2026-11-05, `the_grid_and_the_dag_move_with_the_mechanism`).
  The transport is the 3D pane's alone (2026-11-08,
  `the_linkage_play_control_is_the_only_one_and_it_moves_everything`): its ◀ ▶ ▶|
  and scrub own the clock and the one pose, and the pane posts
  `{type: "annotate:pose", run, index, driver, playing}` on every frame, seek
  and step (`AA.embedPose`). The page has no transport of its own — over the
  envelope chart it carries the measure at the pose as a field that takes a
  typed angle (it pauses the pane and `seek`s it there) and one button per
  stop that puts the pose on it. The grid and a cursor on the chart read that
  one pose, a frame of play at a time; the map draws the model, which does not
  move with the pose. A pane on another run
  than the study's is refused (one muted line on the page, a console warning). A pose is a fractional sweep point
  (`VA.kinematicPose`): every number at it is the projection's own per-point
  number — `contributors[].by_point[]`, `envelope[]` — read linearly between
  the two points either side, never a fold. **On a stop's point the stack is
  that stop's fold**; anywhere else the linkage terms, their sub-stack and the
  foot are read at the pose (the foot is then the linkage alone, which is
  what the envelope folds), and the stop position's rows stay at their stop
  and say so (`· at the −7 deg stop`). A frame of the pane's play or a scrub rewrites the
  grid's numbers in place (`VA.applyStackText`); a typed angle, a stop
  button, a pause or a scrub gone quiet renders the pose itself. `?kinematic=…&pose=30`
  opens the page at 30 deg (the pose is written back into the URL when it
  settles; `scripts/filmstrip.mjs --pose` opens a scenario at one).
- **Rows reached from the page select in place.** A click on a term row —
  or on its jumper or connector on the map — selects that edge here: the page
  stays the study, the map and the grid mark it, and the preview pane shows its citation and
  crop (and its 3D attach, where the part has a mesh). Where a contributor has
  no value of its own and borrows its band from another edge, the pane names
  that edge as **band in this study**, one click from its citation, and the
  row's sourcing mark is that band's. `?kinematic=…&edge=…` opens the study
  with the edge already selected.
- **The envelope chart** is drawn live from `envelope[]` as inline SVG, in the
  `:root` type and colour tokens. x is the sweep's driver; y is the
  **deviation from nominal**, on an axis symmetric about zero that always
  reaches the limit (a ±0.24 deg band on an 80 deg axis would be a hairline).
  Worst case is the outer band, RSS the inner, the limit a dashed pair, and
  each stop a vertical line at its own driver value. **A stop whose position is
  itself a tolerance** — a contributor study that moves the sweep's own
  driver, the travel between the end stops, applies to it — is also a band on
  x (`VA.kinematicTravelBands`): the stop's `x_interval`, worst case and RSS,
  about its driver value, and across it the envelope carried on the stop's
  local slope (`driver_entry`). The envelope itself folds the direct
  contributors only, so the band starts at the envelope's own half-width
  there (`direct`) with no step. The worst case is a parallelogram whose far
  corners are the stop's swept worst case — the number its chip's margin is
  taken from — and the RSS a sheared ellipse whose top is the stop's RSS half;
  a stop whose interval is zero draws nothing. The band is labelled once, at
  the stop nearest the study's nominal. One line under the chart names the
  datum (`VA.kinematicDatumNote`): which stop the driver is measured from,
  which stop carries which band, and each declared gap, "the datum" linking
  the ruling where the page can reach the repo's documents. The x axis says what it spans when the
  travel study's nominal is not the sweep's. Hovering anywhere in the
  plot reads the nearest sweep point: the driver, the measure there, ± worst
  case, ± RSS, each with its unit. The SVG the builder writes beside the JSON
  is its evidence file and is not embedded.
- **A sensitivity's hover is its curve across the sweep**: the signed
  coefficient at every sweep point (the projection's
  `contributors[].by_point[]`) against the driver, zero drawn, the stops
  marked and the grid's stop emphasized — so a coefficient that changes sign
  between the stops is visible rather than a sentence somewhere. It opens as
  the page's one hover card (kind `curve`), which no table scroll box can
  clip.
- **A row with no band** reads **no band on file**, and the chip opens a card saying what would resolve it:
  the drawing each of the edge's parts names, and whether a copy of it is on
  file to be read (the builder's `gap_rows[].drawings`, off drawing-checker's
  drawing inbox) — "drawing on file, not yet read", "no drawing on file", or
  that the part names no drawing at all.
- **The Kinematic model row** opens the 3D scene in sweep mode on the
  topology's newest run (`VA.annotateLink({ sweep })`, whose already-open twin
  is `VA.annotateExecCommands`' `["sweep", run]`): the flyout where the
  annotator is served beside this page, a new tab where it is not.

### What a nav row wears: one status icon, and nothing else

**Every row on this rail carries at most ONE mark**, and it is not a word. A
study row, a loose-stack row: a single drawn triangle at the end of the row,
amber or red, and everything the row has to say is in the card it opens —
verdict first, then the alerts, each as a full sentence with its *why*.

* **No abbreviation ever lands on a row.** No verdict pill, no all-caps flag,
  no chip of any kind. A 300px rail that is always on screen is a place for
  names, and the names are what a reader navigates by.
* **The icon is drawn, not typed** — `VA.warningIcon`
  (`apps/viewer/warning_icon.js`, its own file since 2026-09-22 because
  `apps/annotate` wears the same mark), one SVG path sized in pixels. Two
  reasons, both about legibility rather than taste: a
  `⚠` character is sized by `font-size`, so it can only ever be as big as a
  step on the type scale (owned by `tests/test_app_type_scale.py`, and a
  seventh step added to enlarge one triangle is a scale decision taken by an
  icon); and U+26A0 renders through whatever font the platform picks for it,
  which on Windows is as often a **colour emoji** as a glyph — and a colour
  emoji ignores the semantic colour the level class sets.
* **No chip framing.** No border, no corner radius. A border around the only
  mark on a row is a second mark.
* **Two levels, semantic.** Red is a verdict of `fail` and nothing else; amber
  is everything else the row has to say. The colour's whole job is to tell a
  scan of the rail where to stop, so an emphasis every row earned would be an
  emphasis no row has.
* **A row with nothing to say wears nothing.** Not a quiet variant — nothing.

`VA.studyNavStatus` / `VA.stackNavStatus` (`topology.js`) decide a row's mark,
over one shared `navStatus()`: the two tiers differ only in where the verdict
comes from, and "every nav tier is consistent" is not a claim two copies of
that body could keep. The words are never restated there — a verdict line reads
`VA.VERDICTS`' own `word` and `says`, an attention flag reads `VA.ATTENTION`'s,
a stack's alert lines are `VA.summaryChips`' own text, moved.

| | |
|---|---|
| `fail` | **red.** The one state this rail spends red on |
| `marginal` | amber, and the verdict leads the card in plain words |
| `pass` | **no mark at all** — *unless* a flag stands against it, which is a pass that still asks to be looked at |
| `no pass/fail criterion recorded yet` / `does not sum` | amber. An absence is not an answer; the row also keeps its amber `--warn` tint, which is a state and not a badge |
| `unverified` / `no tolerance recorded` / `incomplete` | in the card. These are `VA.ATTENTION`'s three flags; they are still chips on the grid's edge **rows**, where there is room to read them. At STUDY scale they are rows of the findings table now (see "The study summary reads like a balance sheet"), each naming the thing it is about — which a badge over a list never could |
| a stack's `traced` / `inferred` counts, `checks GENERATED`, probe count | **not on the rail.** A scoreboard is not something a reader is asked to act on, and it is on the stack's own page, which renders the same `VA.summaryChips` unchanged |

**Why (2026-09-22, `viewer_nav_verdict_into_alert_and_icon`).** This rail has
been quietened twice. `viewer_study_verdicts_and_gaps` (2026-09-15) put the
verdicts and flags here at all, after Jeff asked for a roll-up; by 2026-09-16
each row printed every one of them as its own all-caps chip — on the live
projection, 21 verdict chips and 42 attention flags over 21 study rows, in
300px. (The flags were *filled* until `design_pass_typography` (2026-09-17)
outlined them.) `viewer_nav_alert_badge_and_angled_default` (2026-09-21) folded
the flags into one bordered `⚠` and kept the verdict as a chip — Jeff: *"the
alerts still haven't been replaced with a single triangle ! (hover over to see
details)"*. Looking at that result the next day he reversed the half it had
kept: *"get rid of the pass/fail in the left side menu (move it into the alert
along with all the other alerts). Also reformat the alert icon: get rid of the
rounded border around it, make the actual icon larger so it's legible (or
replace it with a proper icon/emoji rather than a character)."* Two badges per
row read as two competing marks, and the one carrying the words was the smaller.

That retired `VA.NAV_ALERT_VERDICT_STATES` rather than extending it: it existed
to split the states that fold from the states that stay a chip, and with no
chip left on the rail there is no split to make.

**The silent row is the one reversal, and it is deliberate.** 2026-09-15's
reading was that a blank row on a rail of verdicts reads as a row that passed —
true of a rail of verdicts, and not of a rail of things to look at. Today **no
live row is silent** (11 amber and 10 red across the 21 studies, both leaf rows
marked, measured 2026-09-22 and pinned in `tests.js`), so the quiet row is a
promise about data that has not arrived rather than a state a reader meets.

**A loose stack derives its own verdict** (`VA.stackVerdict`, over the same
`VA.worstVerdict` a study's comes from) **minus the sensitivity probes**, which
the stack page stamps `NOT A RESULT`. It has to: `hub_bearing_thermal_fit_m1`
fails a result check, and `hub_bearing_thermal_fit_m2` has no flag at all while
two of its result checks are `marginal` — an alerts-only leaf row drew that one
silent. A stack gets no "no criterion recorded yet" the way a study with
`checks: []` does, because nothing in the stack projection says a stack was
meant to have one.

**No click can leave the page without a repaint.** Each of the three handlers
(`onNavTopology` / `onNavStudy` / `onNavStack`, `topology_app.js`) moves the
state and then awaits a worksheet read, and all three go through `navigate()`:
on a failed read the banner says so and the page still paints the node that was
clicked; on a read that works the banner a previous failure wrote is retired.
Before that, a rejected read reached no paint at all — the rail's highlight
never moved and the only way out was F5.

## The topology mode

The third archetype's surface — read `docs/DAG_TOPOLOGY.md` first; this section
is only about how it is drawn. A topology or a study, picked from the nav tree
("The one nav" above), draws this; a leaf picked from the same tree (a stack
no topology re-expresses) switches to the elements table instead. Building it:

```powershell
venv-win/Scripts/python.exe scripts\build_topology_projection.py
```

Then reload the page. (`topology.html?mock=1` runs a demo mechanism with no
disk access, exactly like the stack view's own demo.)

The page shows a model three ways at once: the **map** in the DAG's region,
the **grid** of its dimensions beside it, and the **3D pane** when it is open.
The rails drawing that stood in the DAG's region until 2026-11-17 ("Classic"),
with its switch, its leaders, its zoom box, its length modes, its colour
overlays and its study animation, retired then
(`the_map_is_the_only_drawing_and_classic_retires`).

The settings bar (`#toolbar`, `VA.renderTopoToolbar`) carries what changes how
they are shown, and nothing else: **Rows** (comfortable or compact),
**Rows: labelled / values only**, **Fit** (the map, back to its region; the
`0` key too), **Side by side · 3D · DAG** while the 3D pane is open,
**Unused: dimmed / hidden** while something is lit, **Collapse assemblies /
Expand all** on a model with an assembly, **Groups** (which of the grid's
brackets are drawn: Bodies, Parts), **View** (the palette the bodies wear)
and **View in 3D** on a study with something to show.

### The map: the DAG region's drawing

Since handoff `the_map_draws_the_end_stop_model` (2026-11-16), and for every
model since 2026-11-17. The map draws bodies as districts, a box round every
part, pins on a box's perimeter where parts meet, jumpers inside a box for its
dimensions, and a connector per interface with the joint's symbol drawn large
on it; a joint with several constraints runs as a bundle. It is laid out from
the model view and the model's places on a coarse grid -- an authored file
beside the model (`docs/topologies/map_<model id>.json`), or, for a model with
none, one column per body computed by the topology builder -- fitted to its
region, and zoomed (the wheel) and panned (a drag) by the reader; Fit and the
`0` key fit it again. A part's name sits in whichever corner of its box its
jumpers leave clear, and a click anywhere in a box selects the part while a
drag from it pans. The one selection and the one hover light it by entity, in
the two strengths every surface wears. `docs/DAG_TOPOLOGY.md`, "The map", is
the rule; `apps/viewer/map.js` the layout, `views/map.js` the drawing,
`map.css` the look.

### The grid: edge rows, merged components, the walk's order

**A grid row is a dimension.** Since handoff `viewer_leader_line_grid`
(2026-09-10) the grid holds **one row per edge**, compact and evenly spaced;
an interface has no row of its own and is reached on the map, in the tree or
in the scene. A chain of n edges is n rows, which is roughly the row count of
the Excel stack it replaces.

**The rows are the walk's**, in its order: the builder's depth-first walk of
the model (`topoProj.layout`, body-major, `docs/DAG_TOPOLOGY.md`, "Bodies in
the walk and on the map"), each part's rows gathered into one run
(`VA.gatherParts`), and a study's lit rows made one band (`VA.bandLayout`,
"Studies" below). The walk is no longer drawn; its column search
(`columns_ordered_to_minimise_crossings`, 2026-09-30, counting the walk's own
fan-out, loop-closing and boundary crossings) still breaks ties in the row
order. What it reaches on the product model is declared and re-derived from
the committed document on every run:

```claim
metric: layout_crossings
topology: vpa_pitch_linkage
branch: 16
close: 70
leader: 50
```

**A part boundary is a group break, and that IS the component grouping**
(locked 2026-09-10). A node whose adjacent edges all carry one `part` is
*internal* (`VA.internalNodes`, topology.js); a node whose edges span two
parts, or a part and a clearance, is a boundary, and the plan records which
grid row it sits above (`VA.gridPlan`'s `leaders`, `VA.lastTopoRender.
boundaryEdge`) so a selected interface scrolls its row into view. The
**part** and **description** columns say a part once per contiguous run, with
brackets (`VA.gridBraces`) over its rows and its body's rows; a run the walk
splits is two brackets.

The grid itself is a real `<table>` (since 2026-09-04, handoff
`viewer_consolidation`) with real `<th>` headers, not a div-flex grid styled to
look like one — a rectangular selection of it pastes into Excel as columns, cell
for cell, which only genuine table markup does. The values are `nominal` /
`min` / `max`, three columns, printed exactly as transcribed (`VA.fmt`: no
`toFixed`, no band derived from the limits — the same rule the elements table
follows). Column widths live on a shared `<colgroup>`
(`views/topology.js`'s `COLUMNS`), one array driving both the head table and the
body table so the two cannot silently disagree about how wide a column is.
Every row's height is set inline from `VA.RAIL_METRICS.rowHeight`, and every
cell's content is clamped to that pitch, so the brackets, which are drawn off
row counts, land on their rows.

A row's crop is the Preview's, at the pane's width (since 2026-11-05): no grid
row draws a crop image. Hover or focus previews the edge's record in the
**Preview**, and a click freezes it there. An edge with no `crop_key` — a
workbook/assumed inline dimension, or a derived gap — gets no crop anywhere,
never a placeholder image (see "The preview pane reuses the crop plumbing"
below).

### The colours: there is no lane palette, and that is deliberate

Green, amber, red and magenta are **provenance** on this surface and nothing
else may wear them. So:

* **one colour per body, everywhere the body is drawn** (2026-11-08,
  `the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows`): its
  district and name on the map, its parts' boxes, its grid bracket, label and
  rows, from one of two palettes in `View → Palette` (Bold, or Colour-blind:
  Okabe–Ito first). The body's ink never fills a state: provenance keeps its
  marks;
* an edge's confidence is the grid's SOURCING mark, its band the grid's
  MIN/MAX;
* the selection is the accent, and that is a binary, so it needs no palette.

Since 2026-09-17 (`design_pass_typography`) there is one more rule about the
palette, and it is about **fill** rather than hue: a filled mark -- a background
of its own -- belongs to provenance at its two worst states and to a verdict,
and everything else is outlined in its own hue. The reasoning and the type scale
that came with it are in `docs/DESIGN_TYPE_AND_COLOUR.md`; the numbers are in
`style.css`'s `:root` and paired against both apps by
`tests/test_app_type_scale.py`.

Part identity is carried as text, on the row, on the map and in the preview
pane -- as the part's **name**, never its id. It printed the id until
2026-09-15; Jeff read the result and said what it was: *"2nd line
`bolt_nas6403u11d` appears to be some type of internal id that is meaningless
to user. […] replace these with a concise human friendly name (NAS6403U11D
Shoulder Bolt is fine)."* Every part `name` in `docs/topologies/` is a short
noun phrase now (`VA.componentLabel`), with what it shed demoted into `note`,
and an id is rendered nowhere a reader reads. It rides a heading's hover
title, which is where a deep link or a debugging session can still reach it.

Guarded from both sides, because the strings live in two places: the documents
by `tests/test_topology_prose_for_a_reader.py` (which also pins the four
pitch-link names by value) and the rendering by two banned-string walks in
`apps/viewer/tests.js` -- one over the fixture, one over every live topology's
grid, preview panes and hover cards.

**The element cell and its hover are one phrase.** The cell prints the edge's
`name` as authored and its hover title is the same string; nothing shortens it
on the way. What an author may put in a `name` is the rule in
`docs/SOP_TOLERANCE_STACK.md`, "Titling an artifact" — the span in the part's
own words, no part name, because the part cell beside it carries that.

### Studies

Picking a study **drops the grid to the chain's own rows**, each numbered with
its place in the sum (`#`), with its signed and scaled contribution printed and
the totals at the bottom (the balance sheet, below). The rows keep the walk's
order with the study's lit rows made **one band** (2026-10-28,
`VA.bandLayout`): the lit rows contiguous, in their walk order, the rest of
the walk above and below. A study that refuses to sum has no chain, so it
leaves the grid the whole walk — the error is the result. The map does not
re-arrange for a study; lighting a study as a route on it is a later handoff.

There is **no layout toggle**, and there is no second layout for it to pick
(Jeff, 2026-09-15: *"When you click a study/stack, the entire dag/model should
still be visible."*). The one fact an earlier version of this section got
backwards about the three `pitch_link_*` studies on `vpa_pitch_linkage`
(`ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_change_does_not_reproduce.md`)
is declared instead, so it is re-derived from the live topology projection on
every run rather than argued from memory — the smallest chain of the three is
`pitch_link_thread_region_t`:

```claim
metric: smallest_chain
topology: vpa_pitch_linkage
studies: pitch_link_
value: pitch_link_thread_region_t
```

**Dimmed or hidden** (2026-10-26). Wherever something is lit — a chain study,
or a kinematic study's page — the settings bar carries **Unused: dimmed** (the
default) or **Unused: hidden** (`VA.UNLIT_STYLES`, `VA.DEFAULT_UNLIT_STYLE`):
the 3D scene draws the parts outside the lit set faint or not at all, and the
grid's walk is the band alone. The lit set is *closed* first (2026-10-28,
`the_lit_set_closes_over_its_joints`): a joint whose two ends are lit is lit
(`VA.closeLitSet`). The choice is kept for the session.

**A study that refuses to sum is a result, not an error.** `BranchAmbiguity`,
`BrokenChain`, `CycleDetected` and `UnitMismatch` each render as a block carrying
the exception's own message — which names the node and the candidate edges — plus
what to do about it. An author lassoing interactively will hit branch ambiguity
constantly, and the message *is* the feature: which parallel path binds is a
mechanics question this tool does not answer (`docs/DAG_TOPOLOGY.md`, "Not a
solver").

### The study summary reads like a balance sheet

`HANDOFF_20260922_viewer_summary_balance_sheet.md`. Jeff, on what stood here:

> *"the entire page is still extremely busy and difficult to make sense of. The
> last part that really needs attention is the study summary (bottom pane).
> Still tons of long-winded text explanations, very unconventional and
> confusing layout (the weird ribbon of random values in circled elements at
> the top, no real thought put into the explanations). […] The components of
> the stack are already arranged into a table/grid, simply put the
> computed/rolled up values in the same grid at the bottom, like a balance
> sheet/invoice etc."*

So a study's answer is now on **two** surfaces, and which one holds what is the
whole design:

**The numbers are footer rows of the contributions grid** (`totalsFoot`,
`views/topology.js`). A real `<tfoot>` of the same body table, so the shared
`<colgroup>` puts every total under the column it totals — `worst case` and
`RSS` each fill the nominal / min / max cells and put their half-width in the
column a member row's own contribution occupies. A merged `component`-column
cell says `totals` once, exactly as a component group's cell does, and the
**bottom line** is one row per authored check: the verdict chip and the check's
label in the element column, the signed margin right-aligned across the three
value columns (the amount column of an invoice), and the criterion beside it.
A study with no authored check still gets a bottom line — `no pass/fail
criterion recorded yet` — because a blank there reads as a pass.

Two things are deliberate and easy to undo by accident:

* **the margin, not the criterion, takes the value columns.** Which of
  min/max a criterion bites on depends on the criterion's own direction, so a
  page that put the number under one of them would be stating a reading of the
  operator rather than printing the record;
* **the verdict chip is in the name cell, not the merged section cell.** A
  study may carry more than one check and they need not agree
  (`pitch_system_end_stop_minus7` carries two that do not), so a verdict merged
  over the block would be one row's answer printed over another's.

These rows sit below the last member row — the browser tier measures the
column alignment (`a total lands in the column it totals, to the pixel`).

**The pane below holds what is not a number**, in three blocks and no prose
between them:

* a **findings table** — one row per thing that makes this answer less than
  its digits suggest: the item's name, a one-line reason in
  `VA.GAP_KINDS`' own `says` vocabulary, and the author's full rationale
  behind the row's own disclosure. It replaced two generated paragraphs, and
  both are the acceptance cases the handoff named: the *"This answer does not
  include everything the joint needs, so it is a budget…"* preamble over a
  90-word excluded term, and *"3 dimensions in this chain are unverified — …:
  a; b; c."*. The preamble was the page's own words and is gone; the term is
  the **author's** and is rendered whole, split at its own ` -- ` into a name
  and a rationale (`VA.splitAuthoredFinding`). A term whose author wrote no
  separator is never cut at a guessed point: it comes through whole and the
  row's CSS clamps it, with the full text in the fold and on the hover.
  **Only an excluded term is split that way** — a chain row's finding names an
  **edge**, where the same ` -- ` is a naming convention
  (`name -- clarifier`) rather than a what/why one, so those names arrive
  whole down the very same path. Which of the three buckets the convention
  governs is declared per kind, in `VA.STUDY_FINDING_SOURCES`;
* **cards of parameter/value pairs** — what was measured (the two interfaces,
  by name; how many contributions; the units; the weakest input) and, per
  check, its own `configuration` plus a `Why` fold over the authored guidance.
  Both go through `VA.kvList`, the same free-form block renderer the stack
  page's joint block uses, so "humanise the key / say *not recorded* / never
  print a JSON blob" is decided in one place;
* the assembly-wide **What's missing** panel, unchanged.

**The ids left the surface.** The study's own id is the heading's hover title,
and `from → to` prints the two interfaces' **names** — the same "an id is a
deep-link handle, not a label" rule the node pane, the edge pane, the element
pane and the nav rail already followed, applied to the last surface still
breaking it. `closes` names the derived gap's **edge name** for the same
reason.

**The guard that keeps it this way** is structural rather than a string ban:
`[real] no study summary explains itself in a paragraph` renders every live
study's summary and refuses any `<p>` that is not inside a `<details>`. A
paragraph where a table belongs is not a phrase a banned-string list can see,
and that is the defect this pass existed to remove.

### The preview pane reuses the crop plumbing, and says so when it cannot

An edge that re-expresses a committed stack element **is** that element: same id,
same citation, same crop — its derived `crop_key` is the `{stack, element}`
pair `crops.json`'s `by_stack` is keyed by. An **inline** edge with a croppable
citation gets a `{topology, edge}` key into the separate `by_topology` space
instead (see "The row model" above for why the two spaces cannot merge). The
pane runs either through `VA.cropForKey`, so the resolved / unresolvable /
not-built / stale-index quartet is unchanged. Which of the two spaces answered
is **not** rendered: `VA.cropKeyText` states the claim ("this edge IS that
stack element" vs "the crop is of this edge's own citation") and printed it
above the picture until 2026-09-15, in the ids of a stack and an element —
internal plumbing, in internal ids, over an image that names its own document
on the line below. It is still the string a test reads.

An edge with no key is **not** a stale index and must not read like one. It says
which of the two it is: a workbook/assumed dimension (no croppable document
behind it) or a derived gap (no value to cite). A citation of kind
`assumed` says outright that there is no document behind it to crop — which is
much of the pitch system.

### Every crop says where on it to look, and how sure that is

(`viewer_reference_crops_in_context`, 2026-09-15.) A crop used to be the whole
answer: the rect was the claim, and a rect too tight to read was indistinguishable
from a rect that was wrong. Each crop now comes with the **boxes worth looking
at**, and each surface that shows a crop draws them over the picture — the
popover, the hover cards and both preview panes, through one builder
(`VA.cropFigure`).

Two kinds, and the difference is the point:

- **solid** — the citation's own callout text, or the balloon carrying its find
  number, was *found* at this rect on this page;
- **dashed** — somebody *declared* this rect (a spec-sheet crop region), or the
  citation named this printed zone and nothing on the page corroborated it.

That second one is a real state and a common one: a parts-list nomenclature is
cited at a balloon and printed on the parts-list sheet, so its zone never
corroborates. It used to be a clause in the folded provenance line; it is now
the border style of the box, because the picture is what a reader looks at.

The overlay is DOM, positioned in **percentages** of the image (`crops.json`
carries each box as a fraction of the crop as well as in PDF points), not pixels
burnt into the PNG: one crop is laid out at four different widths across this
page, and pixels are right at one of them. A surface that wants to cap a crop's
height caps its **width** instead, off the `--crop-ratio` the builder sets — an
`object-fit: contain` image is inset inside its element, and a percentage
overlay would then point into the letterbox.

Two things a crop can also carry:

- **a second image.** A crop framed on a balloon shows a number in a circle, so
  it comes with the **parts-list row** for that item — find number, part number,
  nomenclature, quantity — with the part number boxed.
- **a link called by the drawing.** Where the crop resolved through a
  drawing-checker run, the click-through reads *"215197 rev A.1"*, not "open
  run": a run is an internal artifact, and its id told a reader nothing about
  which drawing they were about to open.

### The page is a fixed layout, and nothing scrolls the document

`the_page_is_a_fixed_layout_and_nothing_scrolls_the_document` (2026-11-14),
Jeff's layout of 2026-11-09. The page is exactly the window, at every size,
and four regions each scroll by themselves inside it:

| Region | Where | Scrolls |
|---|---|---|
| the title and the model's tree | left column (`.tv__left`): the title above `#navtree`, the model picker pinned at the tree's top | the tree, vertically |
| the 3D pane | `#annotate-flyout`, beside the tree | its own scene |
| the map | `#topopane`, full height; the map's SVG fills it | the map in place: the wheel zooms, a drag pans |
| the settings, the grid and the Preview | the column right of the DAG (`.tv__main`): the banner, `#toolbar`, `#topogrid` (scroller `.tv__gridscroll`, its header pinned by CSS `position: sticky`), the study totals, then `#detail` | the grid both ways, its sideways scrollbar directly under its rows; the Preview vertically |

Every seam is a divider, wired once at boot (`wireDivider`) and remembered:
the tree's width (`#nav-divider`), the 3D pane's (`#flyout-divider`), the
right-hand column's (`#side-divider`, `VA.TOPO_PANE_WIDTH`, defaulting to the
grid's own width up to half the window) and the Preview's height
(`#detail-divider`, a row divider, `VA.PREVIEW_HEIGHT`). Every grid column is
resizable, Contribution starts narrow, and a dragged width lasts the session.

**Side by side · 3D · DAG** (`VA.PANE_VIEWS`), one control in the settings bar
while the 3D pane is open: side by side is the default; "3D" gives the pane the
DAG's region too, "DAG" gives the DAG the pane's (the pane is hidden, never
closed, so its scene survives). The choice is remembered
(`VA.PANE_VIEW_KEY`) and in the URL (`?view=3d`, `?view=dag`). Highlight and
selection run the same in all three: a hidden surface is still lit, the other
three are on screen.

A selection anywhere scrolls its grid row into view in the grid's region
(`scrollSelectionIntoView`) and pans the map to it when it is off the region
(views/map.js).

`scripts/run_viewer_browser_tests.mjs`'s `testHeightBudget` pins the region
contract: no document overflow either way, each region a scroll container
inside the window, one region's scroll moving no other, and the grid's rows
directly under their header.

**Row density** (`VA.ROW_DENSITIES`, `topology.js`): "Rows: Comfortable /
Compact" on the settings bar. Row height is one number that has to move in
three places at once (documented where it bites, `topology.js`):
`VA.RAIL_METRICS.rowHeight`, the `--tv-row` CSS variable, and the grid's
inline row heights. `VA.applyRowDensity` mutates `RAIL_METRICS.rowHeight`
**in place** rather than replacing the object, so the inline row heights and
the brackets — both of which hold a reference to that same object — pick up
the change with nothing to re-wire; `topology_app.js`'s `applyDensity()` is
the one DOM write left, setting the CSS variable to match. Density is a
display preference, not a fact about a topology or a study, so switching
topologies never resets it.

Scrollbars are themed to match the page everywhere they appear
(`scrollbar-color`/`scrollbar-width` plus the `::-webkit-scrollbar` pseudo
pair, both set once at `html`/`*` in `style.css`). The legend and the
worksheet each open in a `<dialog>` (`#legend-dialog`, `#worksheet-dialog`),
in the browser's top layer, so neither competes with the regions for space.


### A render crash cannot leave the page silently unchanged

`HANDOFF_20260909_viewer_error_surface_and_layout.md`: a live incident had a
stale-cached script throw from *inside* `render()`, and every path that could
have reported that — the boot chain's `.then(render)`, `onReload`'s
`load().then(render)` — had nothing after it to catch a throw, so the DAG
pane just stayed empty with a Reload button that did nothing. `render()` is
now one seam: it calls the real paint in a `try`/`catch`, and a throw from
*anywhere* inside it — not just a rejected promise before it runs — renders
`VA.renderCrashBanner` instead (plain words, the exception's own message, and
the "hard reload may clear a stale cache" hint, since that is what actually
fixed it). `onReload` and the boot chain both gained the `.catch(err => state.
error = …).then(render)` shape `gesture()` already had. One seam, not a
`try`/`catch` in every view — `scripts/run_viewer_browser_tests.mjs`'s
"render crash shows the banner" tier proves it by forcing `VA.renderTopoPane`
to throw and asserting nothing escapes as an uncaught page error.

### An experimental values-only row mode

An experimental **view setting, default off** (the settings bar's
"Rows: labelled" / "Rows: values only", `state.edgeValueOnly`): Jeff's
observation that this page used to run about 2× a typical Excel stack's row
count, because a spreadsheet lists only the dimensions *between* interfaces,
never the interfaces themselves. `viewer_leader_line_grid` retired the node
rows outright (the grid is edge rows only now — the bigger half of the same
observation), and this toggle remains as the smaller half: an edge's own label
is just its two adjacent node labels concatenated, so it hides it and lets the
row read as values only, with the label moved to the row's own hover
(`VA.edgeHoverTitle`). The part cell, and a row the projection cannot
resolve (`missing()`), are unchanged either way: hiding a label is only ever
dropping a redundant concatenation, never a grouping and never a diagnostic.

### One selection, one hover, four surfaces (`one_selection_one_hover_and_leaders_off`)

Since 2026-11-10 what is selected and what is hovered are **one state object**,
`state.focus = { selected, hovered }` (`topology_app.js`), each a model entity
`{kind, id}` — body, part, feature, dimension, interface or joint
(`VA.FOCUS_KINDS`, `model.js`) — or null, written by exactly one setter each
(`setSelected`, `setHovered`). The tree, the map, the grid, the Preview and the
3D scene each light from it (`applyFocus`, run on every change and after every
paint, so a repaint loses nothing) and each can set it: a tree row, anything
the map draws (a box, a pin, a jumper, a connector, a district), a grid row, a
scene anchor, the pane's own rail. A grid bracket is lit with its part or body
but is no control: its caps lie across the rows, which are the pointer's
targets there.
`state.selection`, the element form every view keys by, is derived in the
setter and written nowhere else; a body, a part or a joint selected has none.

**One resolver, two tiers** (`hover_and_select_light_the_same_things_on_all_
four_surfaces_and_nothing_goes_opaque`, 2026-11-12 — Jeff: *"all four display
regions … have elements that correspond to each other, and … all of them light
up simultaneously when you hover or select any of them, and … hierarchical"*).
`model.js` carries the only translation: which entity an element is
(`VA.focusEntityOf`: a shared node is the interface it is, a node on one part
that part's feature of it; a gap edge the interface, any other edge the
dimension; a container its part or body), which element an entity is shown as
(`VA.focusElementOf`), and — the one rule — what an entity **lights**
(`VA.focusLightOf`):

* **own** — the entity and everything it *contains*. A body its parts and the
  joints inside it; a part its features and dimensions; a dimension and an
  interface their two end features; a joint its interfaces; a feature its
  bound faces (`VA.focusFacesOf`).
* **touching** — what *meets* it without belonging to it. A part: the
  interfaces to its neighbours, their joint, the feature across each. A body:
  the joints to other bodies, their interfaces and far features. A feature:
  the interfaces it is an end of, the feature across each, the dimensions that
  end at it. A dimension: the interfaces at its ends. An interface: its joint
  and the dimensions ending at its features. A joint: the two parts it joins.

Hover and select both go through it, and every surface draws both tiers and
nothing else: own in the present highlight, touching visibly fainter (Jeff: *"a
less pronounced color for interfaces"*). The derivations are
`VA.focusElementKeysOf` (`{own, touching}` element and container keys for the
grid), `VA.mapLightKeys` (entity keys for the map), `VA.focusNavRowsOf` (row
keys for the tree),
`VA.navRevealPaths` (the folds a lit row is behind, outermost first — what a
selection opens) and `VA.sceneLightOf` (ids for the pane). Until 2026-11-12 a
part hover lit every edge of every part that touched any of its nodes, plus
whole rail legs — Jeff's "random rows" — because a node key led every row at
that node.

The pane is told by message: `model select node|clear` for the selection it
holds in its own rail, `highlight` for a selected edge while a run is loaded,
and one `light <json>` (`VA.sceneLightCommand`) carrying the hover's and the
selection's tiers — parts, bound faces, nodes and edges — which the pane
draws without deciding anything (`apps/annotate/app.js`'s `cmdLight`): an own
part glows at its **resting look** and its bound faces are overlaid harder than
it, a touching part ghosts, every other part goes faint; and nothing goes
opaque — a solid part is reachable only through the pane's own See-through
control (`AA.planActionLooks`). It works in both of the pane's modes. The pane
answers by message (its anchors' hover and pick, its tree's selected row); what
it keeps of its own — the sweep rail's `inspect`, the model layer's `selected`
— is the 2026-11-11 lesson's inventory. Lighting only: nothing on the map moves and
no grid row is added.

Within the grid and the map hover is **state**, not a `:hover` rule — Jeff,
2026-09-30: *"it would be awesome if the DAG and the table/grid shared their
highlighted state, so everything lit up together."* The grid has one lighter
(`lightKeys`, `views/topology.js`) with one door, the page's
`VA.lightTopoKeys`, handed the resolver's two key lists; the map has its own
(`VA.lightMap`, `views/map.js`), handed the entity. A row's or a mark's own
pointer *tells* the page (`onHot`, `onHotEntity`) and lights nothing of its
own, and the page lights every surface from it. Two levels, the two tiers:

* **`--lead`** — the own tier: the hovered dimension's row, its jumper and its
  two end pins; a hovered part's box, its rows and its features.
* **`--hot`** — the touching tier, at the lighter weight and tint: the
  interfaces at a dimension's ends, the dimensions arriving at an interface, a
  part's neighbours' interfaces.

The selection wears the same two tiers in the accent (`--selected`, and the
fainter `--touched`, on rows, brackets and everything the map draws). Nothing
is dimmed — a reader is tracing *one* thing through the others, not hiding
them. **Hover spends brightness and width only**: the accent means
*selected*, so a pointer may not paint anything with it. Hovering opens no
card either.

### Generated checks are generated in Python too

Some archetypes do not author their checks: a `thermal_fit` stack ships an empty
`checks` array on purpose, and `tolerance_stack.thermal` builds the term lists
from its own block at load time so the file cannot carry a stale coefficient. The
projection dispatches on the stack's `archetype` and runs that loader
(`ARCHETYPE_LOADERS` in `build_viewer_projection.py`) — so the checks are
generated **once, in Python, by the same code the tests pin**, and the viewer
renders them like any other. There is no archetype logic in JS.

Their terms carry real **coefficients** — `2` because a sleeve OD is bore + 2 ×
wall, a soak factor `1 + ΔT·α` per member per temperature, and a `k` / `1−k`
stiffness split — so every weighted term prints its weight
(`+ 2.0010712 × sleeve_wall_lower`). A weighted term rendered as a bare
`+ sleeve_wall` would look readable and be wrong by a factor of two, which is
worse than rendering nothing at all. The identical term table prints outside the
browser with:

```powershell
venv-win/Scripts/python.exe tests\debug_report_thermal_fit.py --terms --markdown
```

A stack declaring an archetype the projection has **no** loader for still renders
zero checks — and says exactly that, rather than "no checks".

### A stack's checks and paths are one table, and it reads like a balance sheet

`HANDOFF_20260922_stack_page_check_card_balance_sheet.md`, one page over from
the study summary above and against the same two complaints. What stood here
was a `Paths` table followed by one `<article>` per check, and each card
carried a head of five chips, five label/value boxes in a row, the excluded
terms, a row of term chips and the authored guidance whole and unfolded.
Measured on `hub_bearing_thermal_fit_m1` at 1600px, that page was **10,633 px
tall** with sixteen cards on it — and the sixteen printed only **four**
distinct guidance paragraphs between them, 6 / 6 / 2 / 2, because a generated
check's guidance belongs to the archetype's *stage* (and, for a probe, to the
stiffness ratio it moved) and not to the corner. The same page
measured **4,825 px** after this pass, on the same projection at the same
viewport (`tests/debug_stack_check_table.mjs --phase before|after`, which is
committed so the pair can be re-taken rather than believed).

**Checks and paths are rows of one table** (`resultsSection`,
`views/stack.js`). They fold the same arithmetic over the same elements and
print the same five numbers under the same column names, so two tables side by
side would have been two tables that look like the same thing and are not. The
one honest difference is that a check was folded against a criterion and a
path was not, which is worth exactly two columns; a path's verdict and
criterion cells say `—` and carry the reason on their hover, and a stack that
has both kinds gets a group row above each block saying which it is. A stack
with only checks — both thermal fits — gets no group rows at all, because
there is nothing to tell its rows apart from.

**The checks are not footer rows of the elements table.** That is the one part
of the study summary's idiom that does *not* transfer: a study's grid **is**
its chain, so its totals belong under it, but each of a stack's checks folds
its own subset of the elements (`element_terms` — sixteen checks of two to
four terms each over eight elements, on M1). Sixteen footer rows under that grid
would each be a total of a subset the reader cannot see, in columns that do
not line up. The link back to the elements is each row's own term list, in its
fold, with every sign and every coefficient.

**The record is a second `<tr>`, spanning every column, folded until the row
is clicked** — not a `<details>` in the name cell, which is what the findings
table one page over uses. That table has two columns; this one has nine, and a
fold in the first would have rendered a 47-word paragraph in a ~350px lane
with eight columns of white space beside it. Inside it: the check's id, every
excluded term whole, the zero-width sentence, the term list, the archetype's
`configuration` block and the guidance. Nothing in there is edited, truncated
or summarised — folding is the only move the renderer makes on authored prose,
and a `[real]` test walks every live check to say so.

**What may not fold is a budget's excluded terms.** A budget rendered without
the term it is a budget *for* is the misreading `verdict_scope` exists to
prevent, so the term's **name** is on the row, split at the author's own
` -- ` (`VA.splitAuthoredFinding`, the one piece of the findings-table idiom
that transferred unchanged); the whole authored string is in the fold and on
the row's hover.

**`table-layout: fixed` with a shared `<colgroup>`**, widths inline from
`RESULT_COLUMNS` and none of them in `style.css` — the same arrangement, and
the same reason, as the topology grid's `VA.TOPO_COLUMNS`. An auto-layout
table sized the name column to the *intrinsic* width of a 120-character
generated label whatever the one-line clamp said, and ran to 1850px. Measured
2026-09-22 on the same page: 1240px of results table against 1060px of
elements table, both in the same 702px scrollport. Both overflow it, which is
`BRIEF_20260916_topology_page_number_reach.md`'s territory and not this
page's to settle.

## Reading the colours

Provenance is the only saturated colour on the page; everything else is grey.

| | meaning |
|---|---|
| green `traced` | the value comes off the cited document |
| amber `inferred` | a reading or an argument sits between the document and the value |
| **filled red `UNTRACED`** | no document backs it. Filled, plus a row tint — an untraced value has to survive being skimmed |
| **filled magenta `NO CITATION`** | worse than untraced: no `source_ref` at all (code: `no_source_ref`) |
| **filled magenta `EXPORT UNESTABLISHED`** | the citation exists and the stack says outright that the *bytes* behind the value cannot be identified. A separate axis from confidence: an `inferred` citation can have a nailed-down export and a `traced` one can have none. See below. **On the right pane's block only** since 2026-09-16 — the elements table's own copy of it rolled into the row's one alert badge (next row) |
| outlined magenta `CTE NOT TRANSCRIBED` | a material whose `values_status` says nobody has read the CTE off a source. **On the right pane's block only** since 2026-09-22: the materials table's own copy of it folded into that row's one alert mark (next row), which is the last of Jeff's *"especially the ones in the source column that are always visible"*. It was **filled** until 2026-09-17, when `design_pass_typography` reserved a fill for provenance's two worst states and for a verdict — the confidence chip beside it carries the filled magenta, and one row was wearing that mark twice (`.chip--values-not_transcribed`). Worth knowing before reading either date as a visible change: no live material entry has ever been in this state. All six are `inline`, so this chip was only ever on the fixture's `demo_fit` |
| a drawn amber triangle | **one alert mark per row** on the elements table and the materials table (`flyout_resize_annotator_filter_and_deselect`, 2026-09-16; the materials table 2026-09-22). Jeff: *"roll all the alert badges into one single alert badge… Mouse over the icon has a popup that lists out the actual alerts."* One mark per row however many alerts it carries; the words are unchanged (`VA.rowAlerts`, `VA.materialRowAlerts` read `VA.ATTENTION`, `VA.EXPORT_CHIP_TEXT` and `VA.VALUES_CHIP_TEXT`) and moved into the hover card, which also shows each alert's *why* — a sentence the chips only ever carried as a native tooltip. A row with nothing to admit shows **nothing**. It was an **outlined** `⚠` **character** in a chip until 2026-09-22 and is a drawn path with no framing now, the presentation the nav rail took on first — see "What a nav row wears", above, for why a character cannot be made legible at row size, and `views/dom.js`'s `VA.alertBadge` for why the frame went with the character rather than separately. One builder (`VA.alertBadge`), one mark (`apps/viewer/warning_icon.js`, shared with `apps/annotate`), three surfaces |
| dashed blue `no tolerance recorded` | a value with no plus/minus behind it, so every interval it feeds is a **lower bound** on the real spread, never the real one. Still rendered as a chip in the right pane and on the DAG grid; on the elements table it is one of the two alerts the badge above carries. A separate axis from confidence, not a fourth confidence. It read `zero-width band` until 2026-09-16 on four of the five surfaces that state it while the DAG page said `no tolerance recorded` about the same element; all five read `VA.ATTENTION.no_tolerance` now, and the CSS class names (`chip--zero-width`, `num--zero-width`, `el-row--zero-width`, `tvrow--zero-width`) and the projection field `zero_width_count` deliberately keep the old word — nothing reads them as words |
| amber spine on the row + amber `BUDGET` | the check's `verdict_scope` is `budget`: a term is missing from the model, so read the magnitude as a budget for the missing term, never as a verdict on the joint — a `fail` here is true of the model and false of the hardware. The missing terms are named **on the row**, in the name cell, and never folded. Read off the schema (`complete: false` + `excluded_terms`) since 2026-08-13, never off the prose. It was a striped **card** with the terms under the numbers until 2026-09-22, when the checks became rows of one table (see "A stack's checks and paths are one table", above) |
| dashed amber spine on the row + amber `NOT A RESULT` | a `[SENSITIVITY]` probe: the same check with an undocumented input moved, so you can see how much of the answer rests on it. Its verdict is about that hypothetical, not about the joint. A dashed **card** until 2026-09-22, same pass |
| grey `checks GENERATED` | the term lists are not in the stack JSON — the archetype's loader built them (see above). Accent-**blue** until 2026-09-17: "the loader built these" carries no state, and on these pages the accent means selection (`design_pass_typography`; `.chip--generated`) |
| monospaced weighted chip | a term whose coefficient is not 1: `+ 2.0010712 × sleeve_wall_lower`. Hover says what a coefficient can be |

A path or check also shows the **weakest** confidence among its expanded inputs:
a check fed by four traced elements and one untraced one is an untraced result.

## "Annotate this →" — jumping into the 3D tool from a gap

An edge whose confidence is `UNTRACED` or `NO CITATION` (the two loud gap
states above) gets an `annotate this →` link in the topology-mode detail
pane (`views/topology.js`'s `renderEdgeDetail`, `VA.needsAnnotation`) — a
traced/inferred edge already has a citation, so the link only offers
something when there is a gap to close. The link (`VA.annotateLink`, the
same builder the flyout launch and the cards use) is relative
(`../annotate/index.html`), carrying `topology`/`edge`, plus `study` when one
is selected and `isolate=<part>` when the edge names an owning part — booting
`apps/annotate/` with that study open, the edge selected, and the part
isolated (handoff `annotate_deep_link_and_part_filter`;
`apps/annotate/README.md`'s own "Deep link in" section is the other end of
this). A binding made there is identity, never a value source
(`docs/ANNOTATION_SURFACE.md`) — this link does not change what number this
page shows, only helps someone establish which physical feature the row means.

### No dead 3D links

Every one of those affordances — the detail pane's (now the Preview's) and the
toolbar's study launch; the two hover cards that also carried one were retired
2026-10-30 — renders **only where there is something to open**
(handoff `annotate_affordances_flyout_and_mesh_gating`).
`scripts/build_topology_projection.py` resolves each topology `part` against the
installed meshes at build time, through the declared alias table and in the
annotator's own precedence (`docs/topologies/part_mesh_aliases.json`; direct
match, then alias, never fuzzy), and stamps the answer on every projected part:

```json
"parts": [ { "id": "gas_spring_mount_213668_002",
             "mesh": { "installed": true, "part_id": "machined_213668" } } ]
```

The block is **always present** — `{"installed": false, "part_id": null}` where
nothing resolved — so the page never has to read an absent key as a fact. A
`part_id` that differs from the part's own id is the alias table having done the
resolving. The page cannot compute any of this for itself: under
drawing-checker's data mount `docs/` is unmounted by design, so the alias table
is unreachable, and `data/meshes/` is in no projection this app reads.

Where a part's block says no mesh is installed, the page shows **nothing** about
3D — no greyed control, no sentence explaining a model that does not exist. That
includes the gap-flow affordance on an untraced/uncited edge: it exists to
*create* a binding, and an annotator with no geometry for the part cannot bind a
face, so the honest fix is installing the mesh. The row stays on the gap list
either way. The study launch follows the same rule one level up: a study none of
whose parts has a mesh would fly out an empty scene, so it is not offered.

Nothing here needs a code change when the mesh set grows: install the mesh (and,
where the two namespaces differ, add an evidenced alias entry), rebuild the
topology projection, and exactly that part's affordances turn on.

## The 3D flyout — the annotator as a side panel (study_3d_flyout)

Where `../annotate/` is **served beside this page** — drawing-checker's
mounts (`/tolstack/annotate/` next to `/tolstack/viewer/`), or any repo-root
static server — every annotate affordance upgrades in place:

- the toolbar's study affordance becomes **View in 3D →** (`#study-3d`): a
  side panel flies out tracing the selected study's chain — its parts
  ghosted, surfaces already bound to its elements opaque (the annotator's
  `trace` verb over the feature-identity projection). A part with no
  installed mesh after alias resolution, and an edge with no binding, degrade
  to the annotator's honest empty/absent states — never a guessed surface;
- the detail pane's `annotate this →` becomes **attach to 3D →**: the panel
  flies out with that edge selected and its part isolated, ready to click
  the surface;
- the hover cards' `annotate this in 3D →` / `view this part in 3D →` drove the
  **same** panel (handoff `annotate_affordances_flyout_and_mesh_gating`) until
  those cards were retired on 2026-10-30; the part-on-its-own view went with
  them (`ISSUE_20261030_the_preview_offers_no_way_to_see_a_part_on_its_own_in_3d.md`).

The panel is a non-modal `<dialog>` (`#annotate-flyout`) laid out as a
**column of the page's own row**: nav | scene | DAG + grid, left to right
(handoff `the_shell_seats_the_scene_beside_the_model`, 2026-10-26; Jeff: "a
single canvas that contains the 3d viewer and the DAG view, with the dag on
the right side"). It wears the page's background with no border at either
seam, and the right-hand pane stays where it is beside the grid — it holds
the page's results (2026-10-28; from 2026-10-26 until then it stood down
while the scene was open). At its floor (`VA.FLYOUT_WIDTH.min`) the DAG and
grid keep at least the scene's reserve beside the results pane; the browser
tier measures that on a live chain study at 1600 wide. Until then it was
pinned to the viewport's left edge with the page shifted out from under it
(pane | nav | DAG). It holds ONE
iframe of the real annotate app, created on the first launch and kept: the
folder grant, loaded meshes and camera survive across launches, because a
later launch drives the open panel over `postMessage` → `AA.exec` (the
annotator's own command vocabulary — the same verbs the boot URL's params run;
`VA.annotateExecCommands` mirrors `VA.annotateLink` param for param).

**A pane that stays** (handoff `the_3d_pane_opens_in_the_mode_the_study_wants`,
2026-10-20). **One handle** (2026-10-28, `the_scene_pane_is_one_flyout_that_
reads_over_http`): a slim "3D" tab on the seam between the nav and the model
opens the panel on whatever is selected, no row needed, and a chevron on the
panel's own divider closes it — the head's old 3D button and the panel's Close
button are gone. The panel's header strip carries the annotator's status (a
dot and one word, `annotate:status`; the sentence on hover) and the full-page
route as a small ↗ icon-link. Once open it stays open across the page's own
navigation and **follows the selection**: a kinematic study opens the
annotator's sweep mode on the run it folds, a chain study or an edge the goto
its row would post (which leaves sweep mode), all through one rule,
`VA.annotateParamsFor`, whose result `VA.annotateLink` boots a cold panel with
and `VA.annotateExecCommands` re-drives a warm one with. Open/closed and the
width are remembered per browser. The nav stays at the far left (it used to
stand down). Resting the pointer on an edge's row, rail mark or kinematic
contributor posts `highlight` (debounced, `VA.PANE_HOVER_DEBOUNCE_MS`), and
the panel's head line is the annotator's own `annotate:state` answer. On a
kinematic study's page a selection never moves the panel out of sweep mode:
`VA.annotateParamsFor` keeps answering the study's sweep whatever is selected,
and the selected edge is posted as a `highlight` instead — the one the panel
shows whenever the pointer is resting on nothing in particular.

**The annotator's rail is drawn in the nav** (2026-10-26). The iframe boots
with `embedded=1` (`VA.annotateEmbedHref`; the full-page ↗ link keeps
the plain url): the annotator then lays its rail out but does not show it,
hides its command box, takes the page's background, and sends the rows its
rail has just rendered as `{type: "annotate:tree", mode, armed, chips, rows}`. The
page draws them under the nav row the scene is showing — a kinematic study's
bodies, joints with their surfaces and parts, and contributors, with the type
chips; a chain study's elements and parts (`VA.renderSceneTree`). A gesture
on a row goes back as `{type: "annotate:rail", key, act, index?}` and runs
on the very rail row it mirrors, so the words and the effects stay the
annotator's: hover lights the thing in the scene, a click selects it, a
disclosure opens, a checkbox shows or hides, and a selection made in the
scene comes back marked. Every row that does something is reachable by Tab.

**Probed, never assumed** (`VA.probeAnnotateMount`): at boot the page HEADs
`../annotate/index.html` and requires an ok `text/html` answer — the same
posture (and the same catch-all-server trap) as `storage/http.js`'s data
probe. Under `file://`, or any server without the sibling mount, the probe
fails and everything above stays exactly the pre-flyout links (new tab) —
a working link, never a broken panel, and no trace of the feature the page
cannot deliver.

## Selecting an element

The elements table shows only a confidence chip, a kind chip, a short one-line
where-ref, and — on the rows that have something to admit — one **alert mark**,
a drawn amber triangle whose hover card lists the alerts in full with the
reason behind each. (The materials table's source column wears the same mark,
since 2026-09-22.) That is the whole compact row. Until 2026-09-16 the last of those
was instead up to two filled all-caps chips shouting from the row itself (a
loud export/identity chip and a `no tolerance recorded` chip, both at once on
the one row that carries both), which is the loudness Jeff asked to have rolled
up; the words did not change, only where they are read. Click anywhere on a row
to select it: the row
gets a visible outline, and the pane on the right (`views/detail.js`) fills in
with everything the row does not have space for — the callout as printed, the
citation's own note in full (not clamped), the export-provenance block below,
and the drawing crop itself, rendered inline rather than only behind a hover.
Nothing is selected when the page loads; the pane says so and tells you to
click a row.

## Which bytes the number was read off

A citation says *where on a page* a value is written. `source_ref.export` says
*which file that page was in* — and the two are not the same claim, because
filenames get re-exported over, so a drawing number and a revision do not
identify bytes. Selecting an element's row shows the export block in the right
pane, beneath its citation:

| state | what the block says |
|---|---|
| `established` | *Read from `X.pdf`* · **pinned to this exact file, by checksum** · *read by drawing-checker N times, most recently `<date>`*, or `VA.EXPORT_NO_RUNS_TEXT` when no run has used the file. The checksum **is** the identity; runs are corroboration, and 15 of the 22 live established *citations* have none — 6 of the 9 distinct exports they name. |
| `unestablished` | **filled magenta on the panel's block**: *FILE NOT IDENTIFIED — which file this value was read from cannot be established*, with the recorded `why` unclamped beneath it. The stack is stating outright that the bytes behind this number are unrecoverable. From the ROW it is one of the alerts behind the alert mark, in the same words and with that same `why`; the row's own filled chip (`.chip--export-unestablished`) is retired and rendered by no production path — `apps/viewer/style.css` keeps the rule, and says why. |
| no `export` key | *This citation names no file, so nothing here says which copy of the document the value was read from*. Stated, not alarmed: 22 of the 48 live citations are here — 21 workbook, 1 assumed — and for a spreadsheet or an assumed value there is no exported PDF to name. |
| no `export` key, `identity_rule: "spec_pile_filename"` | *A standard-spec document, identified by its filename*, with the argument beneath it. The **deliberate exception** — see below. 4 live citations, all `traced`. |
| anything else | loud: *export status `"X"`, which this viewer has no branch for*. `VA.EXPORT_STATUSES` is a table for the same reason `VA.CROP_RULES` is — an enumerated field needs a total function, because a silent default cannot be told from a handled case by reading the code. An identity rule the viewer has no branch for is loud the same way, through `VA.IDENTITY_RULES`. |

**Two of those sentences are the SUBJECT's, not the status's** (`VA.EXPORT_SUBJECTS`,
2026-09-18). The same builder renders a stack's `joint` block, whose
`assembly_export_ref` is the same shape — and *"which file **this value** was read
from cannot be established"* is about a number a joint block does not have. The
joint is the assembly context a stack is built across. It says *"No assembly file
recorded — nothing here says which drawing file describes the joint this stack is
built across"* instead, and it is **quiet**: the recorded `why` on both live
thermal stacks says the 217755 assembly drawing was never opened for this stack,
which is an absence somebody recorded rather than one somebody tried and failed to
resolve, and the loud tint is reserved for the second. Over a value, unchanged and
still loud. The rejected alternative was a special case at the joint block's call
site, which keeps one wrong sentence in the shared vocabulary and moves the problem
to the next non-value subject. **A third subject** would be the evidence this wants
a noun substituted into one sentence rather than a sentence per row; there are two.

### The spec-pile exception

`data/inbox/specs/` is **append-only**: nothing there is renamed, deduplicated or
re-exported over, so for a document in the pile the **filename identifies the
bytes** and there is no export to name. `SourceRef.export` says exactly that —
mandatory for `drawing`/`parts_list`, optional for `spec`.

Four citations are `traced` in that state, and until 2026-08-13 the rule that
makes the pair legitimate was statable only inside a **crop entry**
(`resolved_by: "spec_pile"`), one hop from the row a reader is looking at — so
the row read `traced` beside "nothing here identifies the bytes" and both halves
were true (`ISSUE_20260812_four_traced_spec_citations_carry_no_export_block`;
second sighting of "a fact about the citation reachable only through a crop").

`build_viewer_projection.py` now hoists it: a citation of `kind: "spec"` that
names no export gets a **derived** `identity_rule: "spec_pile_filename"` on its
`elements[]` row, and the viewer renders the sentence in place of the no-export
one. Nothing is authored and no vocabulary widened — `export.status` is still two
values and the four citations still carry no export block, which is the 2026-08-06
position (*a drawing number plus a revision does not identify bytes*) left intact.
An `export` block still wins wherever there is one: three live `spec` citations
carry one and are unaffected.

The rule itself is on the page, not only here: **"How to read the sourcing
column"**, the collapsed legend above the elements table.

Two deliberate limits:

* the block says the file is **pinned by checksum**, never *verified*. The
  viewer cannot hash a file, so that is the only honest claim available to it;
  *checked against the citation, byte for byte* belongs to the crop's own
  provenance below, where a script really did compare bytes -- that line is the
  crop entry's own `sha256_verified`, written by `scripts/build_viewer_crops.py`
  after it compared the file's digest with the citation's, and it is the only
  byte-for-byte claim on this page that anything checked. Neither line names
  the algorithm or prints the digest any more (2026-09-15): twelve hex digits
  are not something a reader of this page can do anything with, and the digest
  is in the stack file for anyone checking it.
* the runs line **names no run id at all** (2026-09-16). It says how many times
  drawing-checker has read the file and how recently, and offers at most one
  click-through, whose text is the *drawing* and its revision — the treatment the
  crop popover adopted a day earlier, for the reason a run is an internal
  artifact and its id tells a reader nothing about what they are about to open.
  The ids are on the line's hover, where someone with a drawing-checker shell can
  still read them.

  Why at most one link, and why the ids cannot simply be linked: an export
  carries a run *id* (`20260803_145243`); drawing-checker addresses a run by its
  *directory* name (the id plus the drawing), which only the crop entry knows. So
  only the run the element's own crop resolved through can be addressed at all.
  Building a URL from a prefix would be a guess, which is the class of mistake
  this whole surface exists against — that argument is unchanged; it is the ids
  in the rendered line that went.

The export block renders whether or not a crop resolved, which is the point: until
2026-08-12 these facts appeared **only** in the crop popover, so a citation whose
crop could not be pinned said nothing at all about its export — a fact about a
*citation* reachable only through a *crop*
(`ISSUE_20260811_viewer_shows_nothing_for_source_ref_export`).

## Materials — the provenance of a *number*

A stack whose archetype has **material properties** also gets a Materials table:
the `materials.json` entry verbatim (designation, CTE, the range it is a mean
over) beside its own sourcing — and the CTEs are the least-traced numbers in this
repo, so the table speaks the same colour language as the elements table. A
thermal fit's answer is a CTE *difference*, and the soak factor in a term's
coefficient is `1 + ΔT·α` from that table with the ΔT on the check's own row.

**The table is a table again, since 2026-09-18.** Its source column was the
multi-line composite cell the elements table retired a month earlier -- chips,
a where-line, the values line, the spec-library reference, the entry's note,
the designation's citation, its callout, its note and the outstanding request,
stacked in a 260px column. Measured on `hub_bearing_thermal_fit_m1` at
1600x1000 with the preview pane at its default width, the first row was **653px
tall** against 88-112px for an elements row on the same page, and all six of
its cells reported that height because one of them set it. It took the same
three-part answer the elements table took: a compact cell (chips and one
ellipsised where-line), the full argument in the preview pane, and a clickable
row to reach it. Both tables feed one pane and one selection -- clicking a
material replaces a selected element and the other way round. Rows are 111-169px
now.

A material's *name* and its *number* have different provenance, and the row and
the pane keep them apart -- the chips on the row, the sentences in the pane:

* **`values_status`** — what kind of record the CTE column is. `inline`: the
  number is the record. `library`: it is a **cross-check** of the projection its
  spec-library reference names, not the record. `not_transcribed`: **outlined magenta** (filled until 2026-09-17) — nobody
  read it off anything, so a number in the column is a placeholder and since
  2026-08-12 the schema lets the entry state none at all — though not one you
  will ever meet here, because a material with no CTE stops its stack loading
  (`thermal.material_soak_factor`) and so never reaches a projection. All three
  rendered identically until 2026-08-12. **The field's own name is not on the
  page** (2026-09-18): three of the five sentences this table can print named a
  schema key or `materials.json` at the reader, and only one of the five was
  reachable by any live or fixture entry, so the copy guard covering this
  surface was green over branches no data could reach. They say "values status"
  and "the spec library reference" now, and every branch of the table is
  scanned directly rather than through whatever rows happen to exist.
* **`library_ref`** — printed whenever it is set, *whatever the status says*:
  `spec_library:NAS6403U11D` is the provenance of a number, and reading the field
  only under `values_status: "library"` would be the same silent drop one field
  along. `library` with **no** reference is a self-contradiction the schema
  permits, so the viewer says so loudly.
* **the two temperature ranges, paired** — the range the source *quoted* the mean
  over, and the ranges this stack *applies* it over (`applied_over_c`, in accent
  blue beneath it). A mean CTE quoted over 20…100 °C and applied over 20…−20 °C is
  the quiet way a thermal answer goes wrong. The viewer prints both and compares
  neither: deciding whether one covers the other is arithmetic, and arithmetic
  happens in Python.
* **`designation_source`** — where the *name* came from, with its callout and
  note. Its confidence chip has been on the row since the table shipped; where the
  name came from had not.
* **`cindas_request`** — the outstanding ask for a real value, where the entry
  records one, unclamped in the pane. A CTE traced to nothing whose recorded
  next step is invisible is the same defect one layer down.

## Hover crops — and the same crop, inline, in the right pane

Each element has a **drawing crop** button, kept on the compact row alongside
the crop-trigger's own hover behaviour: hover, focus or click it (✕, `Esc`
or an outside click closes it). The popover shows the pre-rendered crop and
then **the reference, and nothing else** — "NAS6403-NAS6420 Rev 4.pdf · sheet
3" — with the click-throughs beside it: the drawing-checker run page when a
run is behind the citation (needs `cmd /c serve.bat` in that repo — see
`config.js`), plus the source PDF, **only where this origin can open one**.

Selecting the row does the same thing without a hover: the right pane fetches
and renders the same crop **inline**, through the same one builder
(`VA.cropReference`), so the image is visible the whole time the row is selected
rather than only while the pointer sits on the trigger. All four surfaces that
show a resolved crop go through that builder — this popover, the hover cards
and both preview panes — because they printed the same three lines in three
slightly different orders before, which is the drift a shared builder exists to
stop.

**A pane states its document once** (`VA.PANE_CROP`, 2026-09-18). The crop's
head — `214589-002-A.pdf · sheet 1` — restated the citation's own where-line
directly above it. The hover cards took this rule on 2026-09-16 and the
deliverable was scoped to cards, so both panes kept the defect for two days;
they pass the same constant now, so the two cannot drift apart again. The
panes keep the matching-provenance fold that a card drops, because with the
head gone that fold is the only thing still naming the exported *file*, which
is a different claim from the citation's *document* (`215197 A.1.pdf` versus
`215197`). The DAG pane's citation line also passes what the pane already said
to `VA.citationWhere`, so an edge whose part is named after its own drawing no
longer prints the part number on two lines.

**Two things left these surfaces on 2026-09-15**, both of them things Jeff read
and none of them a loss of a fact a reader wanted:

* *the always-rendered absolute path* (`C:/workspace/tolstack/data/...`). It was
  the fallback for a link that could not navigate — Jeff: "full workstation
  file paths — never rendered when the link works" — and the link now renders
  only where it does work, so the fallback has nothing left to fall back from.
* *the matching provenance, into a fold.* Which rule pinned the file, whether
  the bytes were checked, which region of the sheet was taken: all still said,
  all now behind one small disclosure (`VA.disclosure`, "How this crop was
  matched"). In the open it restated the concise line above it in jargon. A
  disclosure is a fold, never a place to hide a gap — an unresolved crop still
  states its reason in the open.

### Any crop opens at full size, zoomable (2026-09-16)

Jeff: *"selection box style sources (hilighted cells in the datasheet tables
etc) are moving in the right direction, but thumbnail is too small to be
legible… Maybe a button in the thumbnail that lets you launch it into a
separate, full size viewer (either a popup or separate page) that allows you to
zoom/pan?"*

Every crop on the page carries a small **⤢** button on the picture itself —
quiet until the figure is hovered or the button is focused, and a real
`<button>`, so the keyboard reaches it. It opens the crop near-full-viewport in
a modal `<dialog>` (`#crop-lightbox`, `views/lightbox.js`) with wheel and
button zoom, drag pan, and the same **where-line and click-throughs** the card
shows underneath it — nothing longer. `Esc` or the ✕ closes it; a click on the
backdrop does **not**, because a modal `<dialog>` stays open on one (measured,
Chrome 152), which is why the ✕ is there and not optional.

The button is on `VA.cropFigure`, the one builder every crop image on the page
goes through, which is why it is **one per picture rather than one per
surface**: the popover, the hover cards, both preview panes and a balloon
crop's parts-list companion all get it in the same change, and a balloon crop
offers two — each opening its own picture. The one crop image that is *not* a
`cropFigure` is the grid's inline `tvthumb`; it carries no launcher of its own
and does not need one, because clicking a grid thumbnail freezes the row's
Preview, whose figure has one.

**Zoom is one CSS transform on a wrapper around the crop's frame**, and that is
the decision the whole surface turns on: a `.crophl` highlight box is
positioned in *percentages* of that frame, so scaling an ancestor scales the
picture and the boxes drawn on it in one step. Nothing converts a `frac` into
a pixel anywhere, so there is no second coordinate system to drift. The
arithmetic — fit, zoom about the pointer, pan, and the clamp that keeps the
picture on screen — is pure (`VA.lightbox*`, `viewer.js`) and pinned value by
value in the fast tier; the browser tier measures the laid-out `.crophl`
against `crops.json`'s own `highlights[].frac` at fit, zoomed and panned.

Two smaller decisions worth knowing. `scale: 1` is **fit**, not one image pixel
per screen pixel, and the frame is sized in pixels to the fitted box rather
than height-capped with `object-fit: contain` — that insets the picture inside
its element, and a percentage overlay then points into the letterbox. And the
highlight's **border width** is divided back out by the current scale
(`--lightbox-scale`), because a 2px edge at 8× is a 16px amber frame across the
cell the reader zoomed in to read.

### "Open the PDF" only renders where the origin can follow it

The link did nothing at all when clicked from the drawing-checker-served
origin, and the reason is not the URL: **Chrome refuses every navigation from
an http(s) page to a `file:` URL.** Measured 2026-09-15 with this repo's own
browser tier, both transports, the real crop entry:

| origin | click |
|---|---|
| `file://` | opens the PDF — new tab and same tab alike |
| `http://` | nothing happens. Console: *Not allowed to load local resource* |

So the fix is not a better path, and it is not an explanation beside a dead
control either: `VA.originOpensLocalFiles` (storage/adapter.js, beside
`chooseTransport`, because what an origin can do is a property of the *origin*)
answers the question once, `VA.localFileUrl` returns null, and the affordance
is simply **absent** on a served page. That is the standing rule — if a feature
is absent from a build, show nothing about it — applied to a transport
capability rather than to a build flag. The reference line is unaffected: it
names the document in words on any origin, which is what a reader came for.

Note this is **not** `VA.isLocalPage`'s question. A loopback server is local to
the reader — same machine, same disk — and still cannot open a local file.

`crops.json` reports four different answers and the difference matters:

| status | what it means |
|---|---|
| `resolved` | there's a crop |
| `unresolvable` | the citation could not be pinned to a page **without guessing** — a finding about the stack, with the reason |
| `not-built` | nobody has run `build_viewer_crops.py` — a chore. The popover used to print the **command**, as a `<code>` block for the reader to copy into a terminal; removed 2026-09-15, because a terminal command in a web UI is against a standing rule and hover chrome is the worst possible carrier for one. The state is still stated; the banner is where a rebuild is offered, once, as a button where the origin can service it. |
| `no-entry` | `crops.json` predates this element, i.e. it's out of date |

A resolved popover then says **which rule** pinned the document and **whether
the bytes were verified** — a crop of a *guessed* export looks perfectly correct
on screen, so this is the fact the hover exists for:

| `resolved_by` | what the popover says |
|---|---|
| `source_ref_export` | *read from the export this citation names, `X.pdf` — checked against the citation, byte for byte*. The rule every export-resolved crop in the repo uses; the checksum is mandatory under it, so a crop can only exist if the bytes matched -- the comparison is `scripts/build_viewer_crops.py`'s, recorded as the entry's `sha256_verified`. |
| `spec_pile` | *from `data/inbox/specs/` by filename — no checksum on record to check against*. The pile is append-only, so a filename **is** the identity; there is nothing to check and the line says so rather than implying a check passed. |
| `joint_export_run` | *LEGACY RULE: export pinned by the joint block, not by this citation*. Still in the crop script for a stack written before 2026-08-06 (no `source_ref.export`, `document` == `joint.assembly_drawing`, and a `joint.assembly_export` naming a drawing-checker run). No stack in the repo reaches it today. |
| anything else | *resolved by `"X"`, a rule this viewer has no label for* — loud, and `VA.unlabelledCropRules()` puts it in the banner too. `provenance.sources_used`, deleted from the crop script on 2026-08-06, gets exactly this treatment: a branch for a value nothing can carry reads as "this case is handled". |

Placement is a second enumerated field, `located_by`, and `VA.CROP_PLACEMENTS` is
its table for the same reason `VA.CROP_RULES` is one — it was an `if`/`else`
chain until 2026-09-14, and a chain with no `else` says nothing about where a
crop came from, which reads as "the whole sheet":

| `located_by` | what the popover says |
|---|---|
| `zone_cell` | *showing the cited zone `D10`*, padded by a cell, plus whether the callout's own text was found **inside** that cell — corroboration, not a requirement (a parts-list nomenclature is cited at the balloon and lives on the parts-list sheet). |
| `declared_region` | *showing the declared region `"Grip Dash No. 13 row"`, matched on `"Grip Dash No. 13"`* — a rect a human recorded in `docs/spec_library/crop_regions.json` for a spec-pile sheet, which is how a fastener card shows the cited row instead of a photocopy of a sixty-four-row table. When the sheet has only one declared region and nothing in the citation named it, the line says *the only region declared for this sheet* instead: a weaker claim, and it must not read like a match. |
| `callout_text` | *located by the unique match for `"…"`* — the needle matched exactly once on the page. |
| `sheet_full` | the crop is the page, and the note says why: no text layer, an illegible border grid, a callout matching nowhere or everywhere — and, on a pile document, that no declared region applied. |
| anything else | *placed by `"X"`, a rule this viewer has no label for* — loud, exactly like an unlabelled `resolved_by`. |

Order: a **cited zone** first (it is what this citation said about itself), then a
**declared region**, then a **unique callout match**, then the whole sheet. A
region loses to a zone and beats a text search: it is declared configuration
somebody looked at, not a lucky hit, but it is about the document rather than
about this citation.

## Worksheets

The worksheet ("the agent's report") opens in its own `#worksheet-dialog`,
from the **Show worksheet** button in the topbar — offered in EITHER mode,
exactly when the page has a sheet to show. A topology can carry one itself,
since `topology_schema_v1` (2026-09-08): `pitch_system`'s own is
`WORKSHEET_end_stop_graft.md`, `provenance.worksheet`-declared on the topology
file the same way a stack's is. Since 2026-10-27 the subject is the **selected
study** (`VA.worksheetSubject`, `topology.js`;
`a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds`): a study whose
chain is one of the grip stacks folded into the product model offers that
stack's own sheet and renders its joint block in `#topojoint`, and with no
study selected, or a study over the mechanism's own chains, the topology's
sheet and joint stand. The page reads one field, each projected study's
`stack` (`id`, `title`, `joint`, `worksheet_file`, `worksheet_source`), which
`build_topology_projection.py`'s `study_stack` resolves from the study's
`dimension_ref` edges and the model's `provenance.grip_stack_joints`. A stack
with no sheet of its own (tan link take 2) shows its joint and no toggle,
never the model's sheet under a chain it does not document. The fast tier's
"[real] the three converted stacks' sheets are reachable" counts them off the
projection, study by study. The button hides when there is nothing to show
either way, in either mode — it used to be stack-mode-only, before a topology
had a `worksheet_file` field to read. The
worksheet used to live in the right-hand pane; that pane now shows an
element's or edge's full sourcing instead (see "Selecting an element" above).
It moved again with `viewer_v2_single_nav` (2026-09-08), from an inline
`<details>` below the elements table into a `<dialog>`: opening it can no
longer compete with anything else for space — a `<dialog>` sits in the
browser's own top layer, outside the page's flex column entirely — closed by
default so it never covers the table uninvited, but one click away, not gone.

`WORKSHEET_*.md` is authored prose, so it is read **live** from
`docs/tolerance_stacks/` or `docs/topologies/` rather than copied into the
projection: edit the markdown, reload, see it. Rendered with the
dependency-free markdown renderer vendored from forge's notes app
(escape-first, no sanitize pass). Where nothing in reach names a sheet, the
pane says so instead of borrowing an unrelated document's.

Which sheet belongs to a stack or a topology is decided by its own
projection builder, two rules deep and identical between the two: a
`provenance.worksheet` in the file wins (one worksheet legitimately covers
several documents — `WORKSHEET_hub_bearing_thermal_fit.md` covers both
thermal configurations, which are one analysis), otherwise `X.json` →
`WORKSHEET_X.md` by name. The pane says when the sheet was *declared* rather
than matched, so a name that does not match what it covers is explained
instead of suspicious.

A topology's own `joint` block (the same free-form assembly/context shape a
stack's is) renders above the DAG pane, collapsed by default — `{}` when a
topology spans more than one physical joint, as `pitch_system` does, which
renders as "no joint block" rather than an empty one. A study's own authored
`checks` (verdict vs. criterion) do NOT render anywhere yet: the projection
has no field for one (`ISSUE_20260908_topology_projection_never_emits_a_
studys_checks.md`) — the two-thirds of this deliverable the projection
already supports (`joint`, `worksheet_file`) are wired; this third is not.

## Tests

Two tiers (forge `CONVENTIONS.md` §7), plus a third that tests the tests:

```powershell
node apps\viewer\run_tests.cjs                          # fast tier (node + DOM shim)
node apps\viewer\run_tests.cjs --repo C:\workspace\tolstack   # ...from a worktree
venv-win/Scripts/python.exe -m pytest -q                # runs the fast tier too
                                                        # ...and is RED in a worktree by design
                                                        # since 2026-09-18: a skipped [real] tier
                                                        # is not a passed one (CLAUDE.md, Environment)

npm install                                             # once: playwright-core, no browser download
node scripts\run_viewer_browser_tests.mjs               # truth tier (installed Chrome, file:// + http)
node scripts\run_viewer_browser_tests.mjs --repo C:\workspace\tolstack   # ...from a worktree
node scripts\run_viewer_browser_tests.mjs --only "topology height budget"  # one suite

npm run test:mutations                                  # mutation-witness tier, every entry (--full): the scheduled sweep's run, not a landing's
node scripts\run_mutation_witness_tests.mjs --repo C:\workspace\tolstack --changed-since integration   # ...from a worktree: the entries this diff could have decayed
```

### The mutation-witness tier

The two tiers above ask *does the app still behave?*. The third asks the
question a green suite cannot answer about itself — *would this guard notice if
it didn't?* — and it exists because the answer turned out to be **no** in five
guards filed by five different review sessions between 2026-09-11 and
2026-09-15. Always the same shape: a guard's witness is coupled to an
incidental property of the app (a viewport where the document happened to be
short, a preference that happened to be at its default, a measurement that
re-derives whatever is on screen); the app changes *correctly*; the coupling
breaks; the guard goes on passing and witnessing nothing, with nothing red to
announce that the coverage left.

`scripts/mutation_witnesses/` holds one **mutation spec** per witnessed
guard — the exact edit it must redden on, the tier that owns it, and the name of
the check that must fail. The file is *named for the guard*
(`scripts/guard_enumeration.mjs` derives the name), so a spec and the guard it
witnesses cannot drift apart silently: a reworded check leaves its spec at a name
nothing matches, and `pytest -q` says so in a second with the name to rename it
to.
`scripts/run_mutation_witness_tests.mjs` copies everything a tier reads — its
`SHADOWED` list, which is where that set is written down — to a shadow tree
under `tmp/`, patches the copy, runs the owning tier — clean first,
which must be green, or nothing the mutation does proves anything — and fails
unless the **declared** check goes red. It takes `--repo` for the same reason
the other two do: some of the declared witnesses redden `[real]` checks, which
skip without a projection — no count here, because this tier gains specs
faster than any digit written in prose would stay true; the runner prints each
spec's derived name as it runs, and ends on the enrollment census. This tree is
never written to.

**A guard is enrolled by existing, plus one mutation spec in the same change.**
Nothing else — the identity is derived, so there is no id to pick and no shared
table to edit. `node scripts/run_mutation_witness_tests.mjs --unenrolled` prints
the file name to write for any guard that has none, and
`scripts/mutation_witnesses/README.md` is the page that says what goes in it. The
guard set per source is pinned in `DECLARED_GUARDS` — a count, an enrollable
count and a digest of the names, so a guard *swapped* for another moves a pin
too — and a guard added without a
spec reddens `pytest -q` rather than becoming somebody else's backlog: that gap
used to be recorded by hand, one issue at a time, and fourteen of those were open
at once. If you find a guard that shrugs off a hand mutation, that is exactly what
a spec is for.

**What runs where.** A landing runs `--changed-since <ref>` — every entry whose
mutation file, spec file or tier harness the diff touched — and `--only <guard>`
re-checks one. The whole registry (`--full`) is the scheduled sweep's
(`docs/prompts/WITNESS_SWEEP.md`): it held the machine's one browser slot for
hours on every landing, and a decay is a test-quality defect with no product
exposure, so a day's latency finding one is the better trade. The case the gate
cannot see is the one the sweep is for: `--changed-since` would not have
selected `browser__and-it-sits-to-the-panel-s-right…237dba65` on 2026-10-20,
when a layout shift left a spec whose own file was untouched blind. It arrives
as a `class: decayed_witness` issue, not as a reason to put `--full` back on a
merge.

A landing's run is also capped: `--budget-min` (default 30; 0 and `--full` mean no
cap) runs fast, python, then browser entries, prints each entry's wall time and a
top-15, and stops launching once the elapsed time plus the tier's mean per entry
would cross the cap. What it did not reach prints as `left to the sweep (budget)`
and the last line says all four numbers; a capped run whose reached entries are all
witnessed exits 0.

Its cheap half runs on every `pytest -q`: `tests/test_mutation_witnesses.py`
requires every declared `find` to still resolve to exactly one place in the
file it names, every `expect_red` to *be* a guard the tree declares, and the
guard census to hold. An anchor that rots — a rename in `topology_app.js` can rot
several at once — is a spec that quietly stopped being checked, which is the
tier's own failure mode one level up, so it goes red in a second rather than
waiting for someone to make time for a browser run.

The truth tier takes `--repo` for the same reason the fast tier does: it drives
`topology.html` against the **real** `topologies.json` as well as the demo, and
that file lives only in the main checkout. Without it the topology page's real
tier reports itself skipped and the demo tier still runs. The app's own files
always come from this tree either way.

The fast tier also drives `storage/http.js` and `VA.chooseTransport` against
real local servers it starts itself (`run_tests.cjs`) — both mount shapes, a
catch-all-HTML trap, a mid-session server stop, and one that starts dataless
and is *given* the projection mid-session, none of which a DOM shim's `fetch`
could stand in for. The truth tier adds two more: a static server rooted at the
repo instead of just `apps/viewer/` (`startRepoRootServer`), which boots
`topology.html` with no `?mock=1` and no folder grant at all — proving the
served-mode deliverable itself, not a stand-in for it — and the hosted origin
reproduced (`startHostedCatchAllServer`): the app reachable, every other path
answering 200 + site-index HTML. That one proves the posture only a real
browser can decide, because only a real `window.location.protocol` decides it:
**Connect folder** never appears, and a plain reload once the data lands enters
served mode with no user action.

The fast tier includes a **node-fs adapter** tier that drives the real
`data/projections/viewer/` through the same adapter contract the browser uses, so
"Jeff's actual stacks render" is asserted rather than assumed. It reports itself
skipped when the projection isn't there (e.g. from a worktree, where `data/`
lives only in the main checkout) rather than failing.

That tier also carries the two guards that keep `fixtures.js` honest, and they are
the reason a builder change can fail a *viewer* test (2026-08-12):

* `[real] every fixture shape still matches the builder's` compares the key union
  of each shape in `fixtures.js` against the live projection's. **If you add a
  field in `scripts/build_viewer_projection.py` or `build_viewer_crops.py`, add it
  to `fixtures.js` too** — the failure names the shape and the keys.
* `[real] no live value is one the viewer has no branch for` asks, per enumerated
  field, whether the live data holds a value the viewer cannot render. That is the
  half a key-set diff cannot do: the bug it exists for was a stale *value* in a
  field that was present and correctly named.

Both run only when the node-fs tier runs, i.e. only with `--repo`.

The truth tier is not optional theatre: it caught a NodeList-vs-array divergence
between the shim and real Chrome, and a hover popover that closed itself the
instant it opened.

**Not automatable:** the FSA directory picker needs a user gesture, so the
`Connect folder` path is verified by hand, not by Playwright — the same
limitation forge's notes app records.

## Layout

```
apps/viewer/
  style.css           the SHARED stylesheet — the colour system lives here
  index.html          retired: redirects to topology.html (was the stack viewer)
  topology.html       the ONE viewer's shell (nav, toolbar, the joint block,
                      three panes, legend + worksheet + crop-lightbox
                      <dialog>s)
  topology.css        that page's own rules: the nav tree, the toolbar, the
                      grid and its totals footer, the study summary
                      pane, the legend and worksheet dialogs (the crop
                      lightbox's rules are in style.css, beside the crop rules
                      they extend)
  test.html           browser test page; publishes window.__TEST_RESULTS__
  vocab.gen.js        GENERATED, and tracked: every vocabulary Python owns
                      that either app renders, written by
                      scripts/generate_js_vocabulary.py from the definitions
                      named beside each one. apps/annotate loads it as a
                      sibling the way it loads warning_icon.js. Change a word
                      in PYTHON and regenerate;
                      tests/test_js_vocabulary_is_generated.py is red on a
                      hand edit here and on a Python edit nobody regenerated
  config.js           paths and the drawing-checker webui base. Deliberately
                      no rebuild commands: they were strings this page
                      RENDERED at a reader, which is the shape ruled out for
                      every web surface here (config.js's own note carries the
                      argument and the date)
  viewer.js           pure view-model logic — no DOM, no IO, and no
                      arithmetic on a projection's numbers; the crop
                      lightbox's view (VA.lightboxFitSize / ZoomAt /
                      Pan / Clamp / Point / Transform) is the declared
                      exception here, and it is the same class as
                      topology.js's below — screen pixels only, never a
                      printed number and never a verdict
  topology.js         the same, for the topology mode: its vocabularies and
                      interface words (VA.INTERFACE_KIND_WORDS), the walk's
                      ORDER for the grid (VA.gatherParts / VA.bandLayout /
                      VA.layWalk), the grid PLAN and its brackets
                      (VA.gridPlan / VA.internalNodes / VA.gridBraces),
                      VA.looseStacks / VA.stacksCoveredByTopology
                      (which stacks have no topology, read off edges' own
                      crop_key) and VA.navTree (the nav's data shape)
  fixtures.js         the ?mock=1 demo STACK projection (every provenance state)
  map.js              the map's layout (VA.mapLayout), pure: boxes, pins,
                      jumpers, connectors, districts and the view's fit, zoom
                      and pan arithmetic -- screen pixels only, never a
                      printed number
  map.css             the map's look (colour, weight and state only)
  topology_fixtures.js  the ?mock=1 demo MECHANISM, generated by running the
                      real builder over it; topology_app.js merges the two
                      fixtures into one mock adapter at boot
  model.js            the ONE model object in the browser (VA.buildModel /
                      VA.buildModels): the projection's `model` block as lookups
                      by id, part and node, plus one status per feature folded
                      from the feature-identity projection -- pure, no DOM, and
                      the only reader of that block (model_view.py derives it)
  element_record.js   the ONE record every mark on every tier resolves to
                      (VA.elementRecords / VA.elementRecord), built at page time
  sweep_export.js     the point export, ONE module for this app and the annotator's
                      sweep bar (window.SweepExport): pick joint ends or bound
                      features, download their XYZ against blade angle, or the
                      reverse, as CSV -- values read verbatim from the run
                      file, nothing computed
  topology_app.js     boot + wiring for the whole page (formerly app.js's job
                      too — app.js is deleted; there is one boot file now)
  warning_icon.js     the alert mark's geometry and builder
                      (VA.WARNING_ICON_PATH / _PX / VA.warningIcon) — a file of
                      its own since 2026-09-22 because apps/annotate loads it
                      as a sibling, which it cannot do with views/dom.js
  storage/adapter.js  the read-only adapter contract, plus the one decision
                      above it: VA.chooseTransport / VA.TRANSPORT — which
                      adapter a page gets, and what a served page with
                      nothing published is told instead
  storage/fsa.js      File System Access (mode: read), handle persisted in IndexedDB
  storage/http.js     served transport — no folder grant, probed at load time
  storage/memory.js   in-memory mock (?mock=1, tests)
  storage/node_fs.js  real-checkout adapter for the node test tier
  views/              dom, banner, nav, stack, crop, cards, lightbox,
                      worksheet, detail, topology, map, kinematic
  vendor/markdown.js  vendored from forge apps/notes (namespace changed only)
  run_tests.cjs       fast-tier runner (node vm + DOM shim)
```

The stylesheet was inline in `index.html` until 2026-08-31 and has been a linked
file since, because the DAG mode needs the same colour system, the same chips
and the same right-hand pane stack mode does — and now, since the two
modes are one page, `style.css` is simply the whole app's stylesheet
(`topology.css` on top of it for the topology page's rules). A `<link>` is safe from
`file://`; an ES module import is not, which is the constraint this whole app is
shaped by.
