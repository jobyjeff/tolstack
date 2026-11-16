---
type: review
handoff: docs/sessions/active/HANDOFF_20261115_the_map_draws_the_end_stop_model.md
reviewer: agent
date: 2026-11-16
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the_map_draws_the_end_stop_model (round 1)

**What was reviewed.** `handoff/the_map_draws_the_end_stop_model` at `eb7708dc`
(three commits), plus the author's uncommitted lesson addendum, which I committed
on the author's behalf as `61477cbb` (thirteen lines added to the lesson; nothing
else was uncommitted in the tactical worktree). The branch is cut from the
integration tip `6e13e98e`; the fast-forward onto
`review/the_map_draws_the_end_stop_model` produced no conflict, and `integration`
did not move during the review. **Not merged into `integration`**: the verdict
is REQUEST CHANGES. Which run: the first of this handoff — one handoff in
`active/`, no prior commits on the review branch, every lesson, shot and spec
arrives as `A` in `git diff --name-status`.

## Verdict in one paragraph

The map is good work. The layout is pure and authored in one small file; the
renderer draws every entity once by the model's ids; the counts hold on the real
model and the fixture; the symbols are large and tell apart at arm's length in
the reference shots; the hover and the selection travel across all four surfaces
through the one resolver, both ways; the present DAG's suites run untouched on
one shared line of setup. Three things stop the merge, all the author's to fix.
First, a defect no tier saw: once the map has been drawn on a page, **Fit and
the `0` key are dead on Classic and on every other model until the page is
reloaded**. Second, the word **Classic** on the new switch trips a standing
guard that bans the word from every page, so two app suites of the whole browser
tier are red — the tier the author never ran. Third, **the lesson's test record
is the placeholder `RECORD_PENDING`**, the author's witness run measured a tree
older than the committed suite, and my own run of the thirty-five specs leaves
four mutations unwitnessed.

## Blockers

### B1. Fit and the `0` key stop working everywhere once the map has been drawn

`apps/viewer/views/map.js` sets `root.mapFit` (and `root.mapResizeObserver`) on
`#topopane` at every map paint; `apps/viewer/topology_app.js`'s `fitDag` calls
`nodes.pane.mapFit()` and **returns** whenever that is a function. `renderTopoPane`
(`apps/viewer/views/topology.js`) clears the root with `innerHTML = ""`, which
removes children and not properties, and never resets the expando. So after one
map paint:

| page | zoom then Fit | zoom then `0` |
| --- | --- | --- |
| Classic only, fresh page (control) | rails 436 px wide → **326** (refits) | refits |
| map drawn, then Classic by the switch | 436 → **436** (nothing) | nothing |
| map drawn, then the legacy model picked | 870 → wheel 1522 → Fit **1522** (nothing) | wheel 1740 → `0` **1740** (nothing) |

Measured on the real projection with a Playwright probe at 1920 × 1080 (the
recipe is in the overlay entry I added: draw the map, switch, wheel, Fit, read
the rails' rect). `mapFit` on the pane reads `"function"` in both failing rows.
The present DAG's own Fit is one of the things the handoff said must stay
unchanged, and the legacy model has no map at all. The resize observer the map
leaves behind re-fits a detached SVG on every region resize — harmless, but the
same leak.

Why no tier saw it: the map suite tests Classic only after a **reload**, and the
click-around's step 21 switched to Classic and did not press Fit. The fast tier's
`bare.mapFit === null` check covers a no-map render through `renderTopoMap`, not
a Classic render through `renderTopoPane`.

**Fix (author's):** reset `root.mapFit = null` and disconnect
`root.mapResizeObserver` on the Classic path of `renderTopoPane` (or have
`fitDag` ask `ctx.dagDrawing` rather than the expando); add a browser check on
the SAME page — map, Classic by the switch, wheel, Fit, the rails re-fit, then
the legacy model — with its spec, run under `--only`.

### B2. The switch's word "Classic" reddens the app suites on every page

The whole browser tier on the merged tree: **44/47 suites**. `app file://` and
`app http` fail one sub-check each, `and says nothing about a classic view
anywhere on the page` —
`document.body.textContent.toLowerCase().includes("classic")`, the 2026-09-15
retirement check for the classic stack view's chip
(`viewer_nav_wedge_and_classic_retirement`). The Map · Classic header is now on
every topology page, the `mock=1` fixture included, so the word is there. The
pair settles it: on a `git archive integration` export against the same scratch
root `app file://` is **41/41**; on the merged tree it is 40/41. The handoff's
DoD says "The present DAG's suites green with no check re-worded"; the author
ran only `--only "the map (Map"` and never the whole tier.

The guard is of the class the overlay names — a chip's absence proved by a
substring — and the label is the handoff's own word, so which side moves is a
small design call: rename the second drawing (the handoff never asked for the
word on the page, only for a two-way switch) or re-aim the guard at the retired
chip's structure (`option[data-nav-kind="stack"]`-style, as the sibling check
two lines above it already does). My recommendation is the guard: it bans a
word, and the lesson, the issues and `docs/DAG_TOPOLOGY.md` all call the
present DAG "Classic" now. Either way, the whole tier runs once before the
hand-back and the record says so.

### B3. The lesson's test record is a placeholder, and the witness evidence is incomplete

`docs/sessions/lessons/LESSONS_20261115_the_map_draws_the_end_stop_model.md`
ends at `RECORD_PENDING`. The tactical prompt requires the record and the DoD
requires every new guard's spec "passed to the witness runner in one
invocation". What the author's scratch (`data/scratch/map_20261116/`) shows:

- `pytest_early.log`: `1 failed, 2009 passed, 1 skipped` in the worktree, the one
  red being the designed worktree red on `test_viewer_js_suite_is_green`.
- `witness_cmd.txt` (04:56) and `witness.log`: the 35-spec run started at 04:57,
  **before** the suites were committed (`4e1f1a23`, 05:02) and the label fix
  (`eb7708dc`, 05:04), so its shadow tree measured an earlier suite. All 15 fast
  mutations came back `NOT WITNESSED (the tier was red before the mutation)` with
  `projection NOT paired with this tree` — the scratch root had been built with
  uncommitted changes (`build.log`: "this tree has uncommitted changes"). Its
  final tally, written after the session handed back: `17/40 witnessed, 40/41
  reached in 29m05s`.

So the benefit of the doubt was void and I ran everything (test record below).
Against the committed tree, on a paired projection, **37 of the 41 mutations are
WITNESSED**, the four that aborted on the author's run among them. Four are
not:

| spec | runner's verdict | why, and what to do |
| --- | --- | --- |
| `browser__real-an-anchor-picked-in-the-scene-selects-its-feature-s__db3fe0a2` | another check reddened, not the declared one | the mutation re-keys **every** pin by `node`, so the counts check ("each once") fails first. Mutate the scene-pick path, not every pin's key. |
| `browser__real-in-the-dag-view-the-map-takes-the-wider-region-re-f__c56e121b` | the witness cannot see the difference (tier stayed green) | the mutation stops the resize observer, but a pane-view switch repaints and the paint re-fits an `auto` view anyway. The observer matters for a resize **without** a repaint (a divider drag); either check that, or mutate the paint-time re-fit. |
| `browser__real-with-the-3d-pane-open-beside-it-the-region-still-dr__01e344a4` | another check reddened, not the declared one | "Classic whenever the pane is open" changes nothing until the next repaint, so the declared check (read right after the pane opens) still sees the map and a later check fails. Mutate what the check reads, or make the check repaint first. |
| `browser__real-the-wheel-over-the-map-zooms-it-in-and-the-far-part__4824180f` | the tier never reached the witness | the suite **aborted at step 5** (`locator.hover` on the hub pin's hit circle, "waiting for element to be visible and stable", 5 s) — before any wheel, so not the mutation's doing. The same abort hit the author's run on `8c88aa27`. The hover right after the 3D pane opens needs an anchored wait (the map's `data-zoom` stable, the pin's rect stable) rather than `settle(1500)` and a 5 s hover. Fix the wait, re-run the spec. |

**Fix (author's):** fill the test record with real runs on the committed tree
(the pytest line, the two fast tiers, the witness verdicts for all 35 — the
runner's 30-minute budget needs two `--only` invocations for this many, say
so), re-aim the three specs, anchor the step-5 hover, and add B1's new check
and spec and B2's resolution to the list.

## Should-fix (filed as issues, so they outlive the handoff)

- **The interface rule is written three times.** `load_topology_map` re-derives
  "a node two parts share or a gap edge" instead of reading the `model_view`
  it calls one line later, and `tests/test_topology_map.py` writes it a third
  time; nothing pairs the copies. Filed
  `ISSUE_20261116_the_builder_and_its_test_restate_the_model_views_interface_rule.md`
  (`med`); the rework may close it in passing.
- **A body's tint is derived a third way.** `map.js` step 8 computes
  `i % (VA.BODY_TINTS || 16)` over the model view's bodies while `VA.bodyTint`
  indexes the raw `topoProj.bodies` and `model.js` already exposes `model.tint`.
  On v2 the three agree (checked by eye against the tree's swatches in
  `click_01_landing.png`). Appended to the open
  `ISSUE_20261110_the_dag_and_grid_still_derive_membership_from_the_raw_arrays_and_disagree_with_the_tree.md`.
- **The pressed-control colour is a literal, now at seven sites** (`#363b45` in
  `map.css`, copied from `topology.css` and `style.css`). The map's copy is the
  house pattern, not a finding against the handoff; the class is. Filed
  `ISSUE_20261116_design_the_pressed_control_background_is_a_colour_literal_at_seven_sites.md`
  (`low`, `area: design`).
- **Found while building the scratch root, outside the handoff:**
  `fit_bound_features.py --data-root` stamps `inputs_absent` off the repo root,
  so from a worktree it reports four inputs absent that it read. Filed
  `ISSUE_20261116_fit_bound_features_stamps_inputs_absent_off_the_repo_root_not_its_data_root.md`
  (`low`).
- **The whole browser tier is over its budget by 29 s** (1829 s against 1800,
  the runner's own ledger row says `over: true`); the map suite is 76.6 s of
  it. Appended a dated measurement with the top of the timing table to the
  open `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`
  rather than filing a twin.

## Nits (for the rework round; none blocks)

- `docs/DAG_TOPOLOGY.md`, "The map": "the **browser tier** counts … on the real
  model and on the fixture" — the fixture's count is the fast tier's
  (`tests.js`); the browser tier counts the real model only.
- `ISSUE_20261114_the_dag_draws_no_nested_outline_for_a_part_inside_an_assembly.md`
  was moved to `status: resolved` (the handoff authorised that) but its
  `resolution:` line still reads "deferred 2026-11-15 (triage) …"; say what
  resolved it.
- The lesson's entity table, hub row: the log shows the hub's three jumpers
  lead too (`map lead` lists three `dimension:` keys); the row names the box,
  the name and the pins only. Not wrong, incomplete.
- A left- or right-side pin's label sits at the box's mid-height inside the
  box; on a minimum-height box with a two-line name the label may touch the
  name's second line. Not measured — worth one hover on the piston cover in
  the rework's click-around.
- The `wire()`d hit rect and the name group both take `tabindex=0`, so a part
  is two tab stops. Design-level; not filed.

## The mandatory checks

This handoff is viewer code, a layout file and a projection field; it adds no
stack, no element value, no `source_ref` and no material property. Each check
was still asked:

1. **Every tolerance traces** — no element values in the diff; the layout file
   carries places (grid cells) and one symbol word, both authored drawing
   instructions, labelled as such in its `provenance` block. Pass (nothing to
   trace).
2. **Signs on every path term** — no terms. `fold()` untouched
   (`git diff integration...HEAD -- tolerance_stack/` is empty). Pass.
   2b. **Coherent corners** — no transcription. N/A.
3. **LMC/MMC direction** — no elements. Pass.
4. **RSS computed** — no checks added. Pass.
5. **Nominal inside min/max** — no elements. Pass.
6. **Quantised constraints** — no hardware. The analogous caveat for this
   archetype is "a second drawing of the same model, never a second model",
   stated in the layout file, the module header, `DAG_TOPOLOGY.md` and the
   README. Pass.
7. **Traced ratio** — unchanged by this diff; no stack touched, so I did not
   recompute it.

## Also verify

- **Titles**: no stack, topology or study title changed; the layout file has
  a `description`, not a title, and is not listed in the nav. Pass.
- **Tests, cadence**: the tactical record is void (B3) so the full default
  tier ran here before any merge; test record below. The fast tiers ran
  through `--repo` on a scratch root built from the merged tree; the whole
  browser tier and the witness gate ran once. The diff touches far more than
  `docs/`.
- **Green is not the whole verdict**: the new pytest module pins the builder's
  refusals against the real v2 file and a tmp copy, the fast tier pins the
  geometry on a six-feature model and the fixture, the browser suite counts
  the real model against `model.counts`. The numbers pinned are structural
  (counts, sides, pitches), each derived from the model view, none restated
  from prose. Pass, with the three-copies finding above.
- **Scope stated**: the lesson names what is fenced and
  `ISSUE_20261116_what_the_map_does_not_draw_yet.md` carries it — the
  canonical "fenced work has an issue" check passes.
- **`data/inbox/specs/` not reorganised**; **nothing written into
  drawing-checker** (the diff touches neither; the scratch build read
  drawing-checker read-only). Pass.
- **Schema hygiene**: the new `topology_map/v0` schema string is present and
  checked by the builder; the fixture carries the same shape. Pass.
- **Vocabulary**: the six `INTERFACE_KINDS` reach the map through the generated
  vocabulary (`VOCAB.table`); `contact` and `pattern` are the map's own and the
  fast tier pins the symbol table's key set against `INTERFACE_GLYPHS` plus
  those two. `VA.DAG_DRAWINGS` / `VA.NO_MAP_LABEL` are module constants, not
  inline literals. Pass.
- **Claims**: no `claim` fence added or changed; `tests/test_claims_registry.py`
  passed in the full run.
- **Handoff fences respected**: `apps/viewer/topology.js`, `railsSvg`, the
  grid, the tree, `apps/annotate/` and `topology_vpa_end_stop_v2.json` are
  untouched; no present-DAG browser check was re-worded (the only edit to the
  runner outside the new suite is the one `localStorage` line in the `newPage`
  wrapper, which the handoff allowed). The layout file is named
  `map_<id>.json`, not the suggested `topology_<id>.map.json`, for the reason
  the lesson gives (every reader globs `topology_*.json`);
  `test_the_layout_file_is_not_named_like_a_model` pins it. Accepted.
- **Handoff deliverables walked**: (1) three reference iterations with shots
  and a table of what changed; (2) layout authored, small, beside the model,
  refused by the builder when incomplete; (3) every entity once, counted; (4)
  one selection both ways across four surfaces, table re-filled from the page;
  (5) switch in the region's header, Map default with zero suites edited; (6)
  `DAG_TOPOLOGY.md` "The map" and the ARCHITECTURE row. All present. The
  DoD's six-region table, filmstrip, click-around and exploratory shots are
  present and read with vision; the 1920 × 1080 side-by-side region is the
  thumbnail the handoff expected. The DoD lines that fail are "the present
  DAG's suites green" (B2) and the lesson's test record (B3).

## Universal checks (the ones that bit, and the ones that did not)

- **Tests pollute nothing**: every tier wrote to the scratch root and pytest tmp
  dirs; the main checkout's `data/projections/viewer/` mtimes are unchanged
  (17:18–19:32 on 11-15) and its `data/inbox/feature-identity/` newest event is
  still `0083_…` of 11-15 19:32, in the main checkout and in the scratch copy.
- **No agent's mess to Jeff, no operator-facing refusal**: the builder's new
  refusals fire on a layout file an agent authored wrongly, at build time, in
  front of the agent; the "No map" button is disabled with a title, not a
  refusal. Pass.
- **A new guard observed failing**: 37 of 41 mutations redden their declared
  check; the four that do not are B3's table. The builder's refusals are each
  exercised by a tmp copy in `test_topology_map.py`.
- **A count restated by hand**: the three-copies finding above. The guard
  pins (`DECLARED_GUARDS` fast 705 → 714, browser 868 → 896 / 837 → 865) match
  the nine fast tests and twenty-eight browser pushes I counted in the diff;
  the lesson's "thirty-five written, nine fast and twenty-six browser" matches
  the files added; the `--unenrolled` census lists exactly the two the lesson
  names (the skip arm and "nothing threw").
- **The lesson's arithmetic**: the six-region table reproduces line for line
  from `shots2.log`; the v2 counts (5 / 15 / 34 / 22 / 17) match the model
  view and the suite's `drawn` line; the ground-body row (41 lit, 10 touching,
  5 tree rows, 12 grid rows) reproduces from `click_log.txt`; the pin counts
  move as the diff says. One omission (the hub row's jumpers, nit above). The
  lesson's own "Test record" is B3.
- **A word banned by a text-matching guard**: B2; promoted to the overlay.
- **The changed surface reads as designed**: hierarchy by weight and ink, the
  accent for selection alone, labels hidden until hover or lit, truncated
  names carry the whole label as a tooltip. The one design filing is the
  colour literal (above).

## Test record

Scratch root `C:/workspace/tolstack/data/scratch/map_review_20261116` — inbox,
meshes and the non-viewer projections copied from the main checkout, `docs/`
copied from the merged tree, `venv-win` junctioned; every builder run from the
review worktree with `--data-root`; the kinematic projection rebuilt once more
after my overlay commit so no stamp read `dirty`. The fast tier's pairing line:
`projection paired with this tree: results.json @ 61477cbb8153, topologies.json @
61477cbb8153, crops.json @ 61477cbb8153, kinematic/kinematic_studies.json @
aa7847372db6`. The main checkout's projections were not touched and still
predate the `map` block; whoever lands this runs `scripts/rebuild_projections.ps1`
there first. Baseline for the pairs: `git archive integration` (`6e13e98e`)
exported to `data/scratch/map_review_base_20261116` with a `node_modules`
junction, run against the same scratch root.

| tier | command (review worktree) | result |
| --- | --- | --- |
| default | `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs` | `1 failed, 2027 passed, 1 skipped, 4 deselected in 439.33s`; the one red is `test_viewer_js_suite_is_green` (no projection in a worktree, by design). 440 s, inside budget, recorded (`--role review`). |
| fast, viewer | `node apps/viewer/run_tests.cjs --repo <scratch>` | 714/714 passed, projection paired (above) |
| fast, annotate | `node apps/annotate/run_tests.cjs` | 323/323 passed, no SKIP line |
| witness, the 35 new specs (1) | `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --only __60d76792 … (35)` | `31/32 witnessed, 32/41 reached in 28m52s; 9 left to the sweep` (the runner's budget); the miss is `db3fe0a2`. Exit 1, 1749 s. |
| witness, the 35 new specs (2) | `… --only __01e344a4 … (the 9 unreached)` | `6/9 witnessed, 9/9 reached in 11m56s`; misses `c56e121b`, `4824180f`, `01e344a4`. Exit 1, 738 s. |
| witness gate | `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration --budget-min 10` | `18/18 witnessed, 18/57 reached in 9m37s; 39 left to the sweep` — a capped run whose reached entries are all witnessed, exit 0, 616 s. Selected the 15 fast map mutations, two browser map entries and `bd77c7ea`; the notes say 81 `topology_app.js` and 117 `views/topology.js` entries anchor more than 30 lines from every hunk. |
| browser, whole tier | `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | **44/47 suites, 1118 checks, 1829 s** (over the 1800 s budget by 29 s; the runner recorded its own `merge` row, `over: true`, tree `2ad6e521`). Red: `app file://` 40/41, `app http` 40/41 (B2), `the model drawn alone and led` 22/23. The map suite 27/27. |
| pair, `app file://` | baseline export, `--only "app file://"` | 41/41 on integration — B2 is this diff's. |
| pair, `the model drawn alone and led` | baseline export and merged tree, `--only` | 22/23 on **both**, the same hover sub-check — not this diff's; already filed on integration as `ISSUE_20261115_the_model_drawn_alone_and_led_two_hover_lighting_checks_red_on_integration.md` (open). |

Risky subset, pre-merge, by the overlay's mapping: `apps/viewer/` → the viewer
pytest files are inside the default run above; `apps/annotate/` not touched;
the CSS row and the new map row → the browser tier; the guard row → the witness
runs; a projection builder → `test_projection_provenance.py`,
`test_rebuild_projections_script.py`, `test_rebuild_terminal_state_pairing.py`
(inside the default run) and the rebuild itself (the scratch build). Since the
handoff branch sits on the integration tip, the "merge" is a checkout of the
same tree, so one set of runs covers pre- and post-merge.

Found on arrival: the main checkout was clean (`git status --porcelain
--untracked-files=all` empty, on `master` at `793a1435`). The tactical worktree
carried one modified file, the lesson, committed on the author's behalf (above).
The tactical session's witness runner was still alive on arrival (pids 33716 /
39364 / 7236, shadow tree `tmp/mutation-witness-39364` in its worktree); I left
it to finish, which it did at 05:26 with the tally quoted in B3.

## For the next reviewer

Round 2 should: probe B1 on the same page (the overlay entry gives the recipe);
run the whole browser tier, since B2's resolution touches either every page's
header or a guard the app suites carry; confirm the lesson's test record names
real runs on the committed tree with all 35 specs witnessed (two invocations are
acceptable if the 30-minute budget splits them); re-run `--only "the map (Map"`
and B1's new check under `--only`; and check that
`ISSUE_20261116_the_builder_and_its_test_restate_the_model_views_interface_rule.md`
was either closed by the rework or left open on purpose. The whole tier on this
tree is on the ledger (2026-11-16T14:38:42Z, 1829 s, tree `2ad6e521`), but the
rework's tree will differ, so it runs again.

## Re-run 2026-11-16 — round 2

Round 1 was REQUEST CHANGES, 3 blockers; all three are closed below. The seed
named `80e5d950`; while my runs on it were in flight the author's session
committed `40162c99` on top (07:18), so this round reviewed **both**: `80e5d950`
first (merge `8bbef3ea`), then the tip (merge `7deb9924`, tree `1aa735fe`).
`integration` is still `6e13e98e`; neither merge conflicted.

**What changed (`61477cbb..40162c99`, 5 commits).** `VA.releaseMap(root)`
resets the map's Fit, view, light and resize observer and `renderTopoPane`
calls it after clearing the root (B1); the app suites' classic-word guard
counts the word everywhere but `#dag-drawing` and is renamed to say so (B2,
the resolution I recommended); the three unwitnessable specs are re-aimed
(`selectFromScene` dropped; the fit capped under the DAG view's with the check
computing the expected fit by the rule; the pane-open check repaints before
it reads); the post-pane hover polls the element's rect until stable; the
builder and `test_topology_map.py` read `model_view(...)["interfaces"]`; the
flank-pin label sits below its pin; the three nits (`DAG_TOPOLOGY.md`'s
tier sentence, the resolved issue's `resolution:` line, the hub row's
jumpers) are fixed; the lesson carries the round-1 and round-2 records; the
click-around is re-shot with two added hovers (27 steps). `40162c99` alone:
the two new Fit checks assert what Fit promises (the walk inside the pane; the
legacy rails back under their arrival width) instead of the landing width,
Fit is dispatched in-page, and the renumbered round-1 shots are removed.

**B1 — verified.** The probe from round 1, on the real projection at
1920 × 1080: control (Classic only) 436 → Fit **326**; map then Classic by the
switch 436 → Fit **326**, `0` key the same; legacy model after the map, wheel
650 → 1136 → Fit **236**, the pane's `mapFit` null in every row. The fast guard
and the two browser checks carry one spec each (`242c2092`, `efee81d8`,
`a1fab9df`), all WITNESSED (below).

**B1's own detour, found at `80e5d950` and fixed by `40162c99`.** On the
clean tree at `80e5d950` both new browser checks were red (deterministic: the
whole tier and an `--only` re-run), because they compared Fit's result with the
landing width and the page lands 5 px off its fit at the suite's viewport
(rails 330 → wheel 502 → Fit 325). Six browser witnesses behind them came back
"red before the mutation". The author's `--only` runs recorded 29/29 at
`80e5d950` (ledger, 15:11Z, 15:13Z) — on a window where the two happened to
agree — and the record predated the checks. `40162c99` asserts the promise
(rails inside the pane; the legacy rails under their arrival width); on the tip
the suite is **29/29** and all six specs are WITNESSED. Promoted to the overlay.

**B2 — verified.** `app file://` 41/41 and `app http` 41/41 in the whole tier
on the tip; the renamed check passes on `mock=1` with the switch present.

**B3 — verified.** The lesson's record names real runs on committed trees
(pytest 2027 passed twice, the two fast tiers, five map-suite runs, witness
batches with their verdicts and the reasons each needed another). My own:
all 35 round-1 specs plus the 3 new ones are WITNESSED across this review
(37/41 in round 1, the 4 misses and the 3 new ones 6/6 + 1/1 here).

**Should-fixes.** The interface rule now has one home; I marked
`ISSUE_20261116_the_builder_and_its_test_restate_the_model_views_interface_rule.md`
resolved. The tint copy and the colour literal stay as filed (the lesson says
so too).

**Whole browser tier on the tip: 46/47.** The one red is `the model drawn
alone and led`, the hover sub-check already filed on integration
(`ISSUE_20261115_…two_hover_lighting_checks_red_on_integration.md`, open) and
red on the integration baseline in round 1. The `kinematic study page` red of
the `8bbef3ea` run (the graph width not surviving a reload) paired **27/27 on
the integration baseline and 27/27 on a merged re-run**, so it was a flake and
is not filed. Wall time 1853 s, over the 1800 s budget by 53 s — appended to
the open budget issue as this handoff's third measurement.

### Test record, round 2

Scratch root rebuilt from `8bbef3ea` with every stamp `dirty: False`
(`40162c99` touches no projection input, so the pairing held for the tip:
`projection paired with this tree: … @ 8bbef3eaffab`). The main checkout's
projections are still untouched and predate the `map` block — **the batch
merge runs `scripts/rebuild_projections.ps1` before its tiers.**

| tier | tree | result |
| --- | --- | --- |
| default | `8bbef3ea` | `1 failed, 2027 passed, 1 skipped, 4 deselected in 441.15s` (the worktree red); 442 s, recorded |
| fast, viewer | `8bbef3ea` / `7deb9924` | 715/715 both, paired |
| fast, annotate | `8bbef3ea` | 323/323 |
| Fit probe | `8bbef3ea` | the three rows above, all refit |
| click-around (`tests/debug_map_shots_20261116.mjs --only click`) | `8bbef3ea` | 27 steps, no throw; the two new flank-pin shots read clean |
| witness, 7 new / re-aimed specs | `8bbef3ea` | fast `242c2092` WITNESSED; 6 browser "red before the mutation" (the two Fit checks, above) |
| map suite `--only` | `8bbef3ea` | 27/29, the two Fit checks red, twice |
| kinematic pair | base / `8bbef3ea` | 27/27 / 27/27 (flake) |
| witness, 6 browser specs | `7deb9924` | **6/6 WITNESSED**, 9m30s |
| witness gate `--changed-since integration --budget-min 10` | `8bbef3ea`, `7deb9924` | 20/20 witnessed, 20/63 reached, exit 0, both runs |
| map suite `--only` | `7deb9924` | **29/29** |
| browser, whole tier | `7deb9924` (tree `1aa735fe`) | **46/47**, 1120 checks, 1853 s; the one red filed on integration |

**Verdict: APPROVE (round 2).** Landing on `integration` follows.
