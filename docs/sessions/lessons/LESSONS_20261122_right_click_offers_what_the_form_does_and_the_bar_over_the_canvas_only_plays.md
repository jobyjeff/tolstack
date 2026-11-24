# LESSONS 2026-11-22 — right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays

Handoff: `docs/sessions/active/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md`.
Worked 2026-11-24.

## What was built, in one paragraph

One right-click menu, drawn by the **viewer page** for both a tree row and a face in the
3D pane (`VA.sceneMenuPlan`, `VA.rowMenuPlan`, `VA.placeMenu`, `VA.renderContextMenu` in
`apps/viewer/views/nav.js`; `openMenu`, `runMenuItem`, `formThen` in
`apps/viewer/topology_app.js`). A still right-click in the scene no longer picks: the
scene calls `onContextPick` (`apps/annotate/scene.js`) and the pane posts
`{type: "annotate:context", x, y, face, parts, onPart}` (`AA.contextMessage`). Every item
runs a handler the form or the tree already has. The bar over the canvas holds the play
controls, the pose and the view; the pane's head names what is shown and never the mode.
The gesture table in `docs/ANNOTATION_SURFACE.md`, "Editing a feature", has the menus'
rows and a paragraph on the bar.

## The bar, before and after (deliverable 4)

Measured on the scratch copy of Jeff's data at 1536 wide (shots `before_*` from
integration `48042976`, served from an exported copy of that tree; `after_*` from this
branch). Bind mode has three states that change the bar: rest, a form open, and an
element (a dimension) selected in the pane — the last is where every binding line lived.

| mode / state | control or line, before | now |
|---|---|---|
| head (every mode) | "Binding — Propeller Pitch System", "Binding — Travel between end stops", "Sweep — vpa pitch chunk2 p2" | **stays, minus the mode**: "Propeller Pitch System", "vpa pitch chunk2 p2" (`AA.embedState`) |
| bind, every state | ▾ Sweep ▶ (the play line, folded or open) | **stays** |
| bind, every state | "3 nodes not placed" (the model's placement chip) | **stays** (view) |
| bind, every state | **Help**, opening six lines on how to use the pane, then the Display switches | **Display**: the switches alone (See-through parts, Suggest likely faces, The model, Bound faces). The six lines are **gone** (a page never describes itself; they described a rail no surface shows) |
| bind, an element selected | the step prompt ("pilot bore to attachment bore already has the faces it needs. Click a face to bind another.", "… needs two faces, bound one at a time. Click the first one in the 3D view.") | **gone** — the form is on screen when something is edited |
| bind, an element selected | the strip "Binding · *element* ✕" and its "leave binding" | **gone** — the form's ✕ and Esc are the way out |
| bind, an element selected | "Faces that touch at …" with a numbered list of pairs | **moved to the form** (its Suggested lists contact faces); the scene still colours the pair, and `frame-contact` is a verb |
| bind, an element selected | the colour note ("n likely faces — …") | **gone** (it explained the page) |
| bind, an element selected | the bindings list ("pilot bore · face 263" × 10, the proposal "attachment bore · face 1569 · proposed by agent · medium", "Earlier bindings (18)") | **moved to the form** (Faces, Suggested, History) |
| bind, an element selected | the precedence note ("A drawing already cites this element … The drawing wins") | **no home yet — filed** |
| bind, an element selected | **Owner not in this set…** (a folded form that writes `owner_not_in_set`) | **no home yet — filed** |
| bind, a face clicked with no element | the banner "Pick an element on the left to bind this face to." | **gone** |
| sweep | twisty, the run's summary, the run picker, Export points, ◀ ▶ ▶|, the scrubber and its chip, speed, loop, the readouts, "22 of 24 parts placed" | **stays** (play, pose, view) |
| sweep | Help (five lines on scrubbing and the frame rule) | **Display**, the switches alone |
| sweep | "Face picking works at the as-modelled pose only — frame 80 of 80, 72.001 deg. **Go there**" | **stays as a pose control, without the rule**: "As modelled: frame 80 of 80, 72.001 deg. **Go there**"; a run with no as-modelled frame shows nothing (it said "faces cannot be picked here") |
| sweep | "This run names no topology, so the element list stays as it was." | **gone** (it described a hidden rail) |
| sweep, a form open | the same transport and readouts | **stays** (`after_sweep_form_open`) |

Deleted with the gone rows: `taskInstruction`, `TASK_NO_ELEMENT`, `planBindChoices`,
`planBindLeader`, `HELP_LINES`, `SWEEP_HELP_LINES`, `PICK_NEEDS_ELEMENT`,
`EMBED_MODE_WORDS`, `BIND_BAR_WORDS.binding/leave/leaveBack`, `SWEEP_NO_TOPOLOGY`,
`describeSuggestions`, `CONTACT_HEADING*`, `CONTACT_LISTED`, and in `app.js`
`buildBindStrip`, `buildContactBlock`, `suggestionLine`, `precedenceNote`,
`buildBindingsBlock`, `buildProposalRow`, `buildOwnerNotInSetForm(Fields)`,
`buildEndChoice`, `bindContext`, `correctionTarget`, `setWriteFailure`, `labeledSelect`,
`labeledInput`, `group`. Kept on purpose: `AA.buildOwnerNotInSetEvent` and
`AA.recordWithout` (the write path, out of scope), and the scene's leader method (filed).

## The menus as built

| opened on | items (the form's or the tree's words) | runs |
|---|---|---|
| a face of the edited part, form open | **Add to *feature*** / **Take out of *feature*** (by whether the set holds that face), **Isolate *part***, **Hide *part*** | `edit click <face>` — a left click's own verb; the tree's hidden-parts state |
| a face, no form, a feature selected on that part | **Bind to *feature***, Isolate, Hide | `openFeatureForm(fid, {click})`; once the pane's edit has read its faces, `edit click <face>` unless the set already holds it |
| a face on another part / no feature selected | Isolate *part*, Hide *part* | |
| empty space | **Show everything**, only while anything is hidden | |
| a feature's row | **Edit faces**; **Bind the suggested faces** (nothing bound, not disagreeing, and its open proposals name one face set, `VA.featureAcceptable`); **Unbind** (when bound) | `openFeatureForm`; `openFeatureForm(fid, {accept})` then `edit take <the one proposal line>` and the form's own `formOk`; the pane's `unbind` at `VA.featureFormEnd` — what the form's Unbind sends |
| a part's or a body's row | **Isolate**, **Hide** or **Show**, **Show everything** while anything is hidden | Isolate = every other meshed part into `state.hiddenParts`; Hide/Show = `onNavVisibility`, the box's handler |
| a joint's row | **Go to *part*** × 2 | `selectEntity` on the part |
| an interface row, a row with no form (no mesh) | no menu: the browser's own | |

- **A right-click on a row selects it first**, as a click would, so the row the menu is
  for is the lit one.
- **Placement**: just below-right of the pointer, flipped to its other side where it would
  run off what it was opened over (the pane for a face, the column for a row), clamped last.
  The right-clicked face is lit (`hover face`) while the menu is open.
- **Esc**: the menu takes focus when it opens; its own keydown stops Esc there, so the
  form's Esc waits for the next press. A click anywhere else (the scene included) takes
  focus away and closes it; so does a scroll of the column or a resize.
- **"Bind the suggested faces" runs the form's path, visibly**: the form opens, the pane
  reads the part (about 10 s on the upper piston head in the walk), takes the line, ticks,
  and the tree comes back with the row bound. Doing it headless would have meant a second
  copy of the tick's plan, which is exactly what "the same event the form's tick would
  write" rules out. The browser suite compares the two paths on a reload of the same data:
  identical.
- **Not in the menus**: Flip (`ISSUE_20261123_flip_has_no_place_in_the_features_form.md`
  suggested the menu; the handoff's list does not name it, so it stays filed there).

## Things that cost time

- **A still right-click already picked.** `scene.js`'s release handler never looked at the
  button, so before this change a right-click that did not move toggled a face exactly as a
  left one did. The branch on `press.button === 2` is now the first thing the release does;
  the browser suite's "a still right-click is the menu's, never a pick" guards it.
- **The menu lives in the shell, not in the pane.** It has to know the form, the selection,
  the feature's name, the tree's hidden parts and the model, which are all the shell's; the
  pane only knows where and what was under the pointer. A menu drawn over the iframe must be
  `position: fixed` and appended inside the open `<dialog>` (the pane's), or the dialog is
  drawn over it.
- **`bash -c` with a heredoc that holds Python and nested quotes failed twice** ("unexpected
  EOF while looking for matching `'`"); writing the script with the Write tool and running
  the file always worked (the memory note says the same).
- **Deleting checks by bracket counting over-ran a block** (a regex literal fooled it) and ate
  a neighbouring check. Cutting a `check(` … `});` block by its column-0 `});` is safe in
  `run_tests.cjs`; verify the count dropped by exactly what you meant.
- **Twenty browser checks → ten.** The first draft of the suite had one check per fact; each
  new guard needs a witness spec and a mutated browser run (~3.5 min). Folding each menu's
  offer and its effect into one check halved the witness bill without losing a mutation that
  could see anything.
- **The walk driver holds the browser slot until `/__ctl/quit`.** Quit it before any runner.

## Looked at (`shots/right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays/`)

Served by `tests/debug_walk_merged_page_20261114.mjs --root data/scratch/rc1124 --port 8931`
(baseline tree exported from `48042976`) and `--port 8932` (this tree); the scratch root's
feature-identity inbox was byte-identical to Jeff's when made. Every shot listed was read.

| shot | what it shows |
|---|---|
| `before_bind_rest`, `before_bind_feature_selected`, `before_bind_form_open` | the bind bar: ▾ Sweep ▶ Help, under "Binding — Propeller Pitch System" |
| `before_bind_dimension_selected`, `before_bind_help_open` | a dimension selected: the step prompt over three lines, the Binding strip, Faces that touch, ten bindings, Earlier bindings, Owner not in this set |
| `before_sweep_open`, `before_sweep_folded`, `before_sweep_form_open` | the sweep bar with Help and "Face picking works at the as-modelled pose only …" |
| `after_bind_rest`, `after_bind_form_open`, `after_closed_rest` | ▾ Sweep ▶ Display, under "Propeller Pitch System" |
| `after_menu_tree_feature` | Edit faces / Unbind beside the pilot bore's row, inside the column |
| `after_menu_scene_form_open`, `after_menu_scene_added` | Add to pilot bore / Isolate / Hide over the scene, flipped left off the pane's edge, the face lit beside it; then the second line in the form |
| `after_menu_scene_no_form`, `after_menu_bind_opened_form` | Bind to pilot bore; the form opened with that surface as a new line |
| `after_menu_scene_isolated`, `after_menu_scene_empty`, `after_show_everything` | the mount alone with the tree's boxes unticked; Show everything over empty space; all back |
| `after_menu_tree_part`, `after_menu_tree_joint`, `after_go_to_end` | a part's Isolate/Hide (then Show, Show everything); a joint's two Go to; the pitch arm selected |
| `after_menu_tree_suggested`, `after_accept_from_tree` | v1's upper piston head step face: Edit faces / Bind the suggested faces; after it, the row bound and "Saved · 1 faces" |
| `after_sweep_open`, `after_sweep_folded`, `after_sweep_form_open`, `after_menu_scene_sweep_playing` | the sweep bar with Display and "As modelled: … Go there"; a form open in sweep mode; a menu over the playing sweep |
| `after_sweep_playing_form` | play pressed with the form open: the form is gone (filed) |
| `after_3840_rest`, `after_3840_menu_tree`, `after_3840_form_open`, `after_3840_menu_scene` | the same at 3840 × 2160 |

Click-around findings:
- **Play with a form open drops the unsaved set** silently — baseline behaviour (the arm's
  transport rule), filed.
- **A large face is partly covered.** The menu keeps the point under the pointer and the face
  edge nearest it in view, but a ring that runs on to the right (`after_3840_menu_scene`) is
  covered for the menu's width. The placement knows a point, not the face's extent; filed
  with the small findings below.
- The sweep bar's head row still clips at the pane's rest width ("out an…", Export points
  off the edge) — already filed as `ISSUE_20261109_the_sweep_bars_head_row_clips_its_controls_at_the_scenes_400px_floor.md`.
- No page error in either walk (`errors` op, both servers).

**Jeff's log:** `C:\workspace\tolstack\data\inbox\feature-identity\` was 116 files before and
after. Listing sha256 `efe47ec6…` and contents sha256 `39e9abba…`, the same both times. The
walk wrote one event to the scratch inbox (`0116_piston_head_upper_step_face_accepted.json`,
the tree's accept); it was removed. The browser suites write to the pane's memory store only.

## Decisions the handoff left to me

- **Head line keeps the subject.** "Binding — " and "Sweep — " went; the study, topology or
  run name stays — it names what is shown, not the page.
- **Display, not Help.** With the usage lines gone the disclosure holds the switches and is
  named for them, in both modes.
- **The gate line stays as a pose control** (it is the "pose" the handoff keeps), without the
  rule about picking.
- **Show everything appears only while something is hidden** (a menu item that would do
  nothing is not shown); "Always" in the handoff is read as "on every face".
- **One new browser suite** ("the right-click menus …") in the existing tier, registered beside
  the form's; no new tier.

## Filed

- `ISSUE_20261124_owner_not_in_set_and_the_drawing_wins_note_have_no_surface_since_the_bar_went.md`
  (feature, med, strategy) — the two things the bar held with no home.
- `ISSUE_20261124_play_with_a_form_open_discards_its_unsaved_set_without_a_word.md` (bug, med).
- `ISSUE_20261124_the_scenes_bind_leader_is_drawn_by_nothing.md` (chore, low).
- `ISSUE_20261124_a_menu_over_a_large_face_covers_part_of_it.md` (bug, low).
- Addendum on `ISSUE_20261123_the_panes_hidden_rail_still_carries_binding_controls_no_surface_shows.md`.

- `ISSUE_20261124_the_scene_pane_over_http_suite_is_red_on_integration.md` (bug, med) —
  red identically on integration `48042976` and on this branch.

## Suite record

All on branch `handoff/right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`.
The browser and witness runners ran from the worktree with a `node_modules` junction to
the main checkout (removed afterwards).

- **Default pytest** (worktree, once, after the last code change):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q` —
  `1 failed, 2619 passed, 3 skipped, 4 deselected in 480.30s`. The one red is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, red in every worktree by
  design (its `[real]` tier reads `data/projections/`). Ledger row recorded, inside budget.
  `tests/test_mutation_witnesses.py` alone, after the specs: 49 passed.
- **Fast tiers**, after the last change: `node apps/annotate/run_tests.cjs` 329/329;
  `node apps/viewer/run_tests.cjs` 517/517 with the `[real]` tier skipped (worktree).
- **Browser suites** (`--only`, one per run, `--repo C:/workspace/tolstack`): the
  right-click menus 10/10 (after consolidation; 20/20 before it); 3D pane follows the
  selection 30/30; every study opens in 3D 11/11; annotate rail filter + face deselect
  32/32; annotate armed pick 18/18; annotate top bar + entry context 30/30; annotate face
  suggestions 26/26; a feature's form 14/14; the tree holds still 4/4; annotate rail holds
  still 9/9. **The scene pane reads over HTTP: red, 5 failed then aborted — identically on
  integration `48042976`** (filed). Its one changed sub-check (the sweep bar folds; it reads
  `.an__sweep-gate`) is therefore not verified by a run here.
- **Witnesses**, every spec this branch added or re-pointed (21): all 21 WITNESSED, over
  four runs. The first ran against the scratch root and was spoiled twice by me: its
  projections carried a dirty-tree stamp (built while I was editing), so the fast entry was
  red before mutation, and its served log still held my walk's event, so the menus suite
  skipped and ten entries "stayed green" in 1–3 s. After a clean rebuild the rest ran
  against the main checkout with `--budget-min 75` (the default 30 left six to the sweep).
  The bind-mode head-line spec was re-pointed (the `goto` announcement it mutated is no
  longer the only post — the study scope posts the state too). The 3D pane suite's clean run
  was red once in a witness shadow (the kinematic page's pane handle did not arm, the
  HTTP suite's symptom) and green on the next try. Census pins: fast 618/618
  `bb8b662cc26a`, annotate 329/329 `9240a22ba945`, browser 773/746 `cde3ed1dec8e`.
- **Not run here**: the whole browser tier and the `--changed-since` witness gate — the
  review's.
- **Jeff's log**: 116 files, listing hash `efe47ec6…`, contents hash `39e9abba…`, before and
  after.

## Rework after review (REQUEST CHANGES, one blocker)

- **The blocker:** "annotate hosted posture" pressed `.owner-not-in-set-form button`, and
  that form went with the bar. I ran `--only` for the ten suites I *edited*, and not for
  this one: none of its lines changed, but the DOM it reads did. A deletion reaches every
  suite that reads the thing deleted, so grep the suites for each deleted class or id, not
  only for the checks you edited.
- **The fix:** the check now presses the form's tick. It posts `arm <edge> <end>
  <topology>`, `edit click 0` and `edit ok` to the hosted pane as `annotate:exec` messages
  with an id, the way the shell does, on the first end whose part has a mesh. A tick
  writes only a changed set, and clicking face 0 puts it in or takes it out, so there is
  always something to write, whatever the log holds.
- **What the fix found:** the bar's Record form was the only caller of `setWriteFailure`,
  so once it was deleted a failed tick in the hosted pane showed the storage layer's raw
  sentence (`AA.READ_ONLY_WRITE`) as the banner, not c21a06bb's fixed line. I restored
  `setWriteFailure`. The pane's exec listener now uses it for every write verb, with
  `AA.WRITE_FAILURE_VERBS` ("Bind failed · binding is not available here"; the raw sentence
  on hover), and so does Enter. Non-write commands keep their own message. The reply to the
  shell is unchanged, so the form's own failure line is untouched. The existing fast check
  "a failed bind says its class in fixed words…" now pairs `AA.WRITE_FAILURE_VERBS` with
  `AA.IDENTITY_WRITE_VERBS`. No new guard, so the census pins stand.
- **Re-run:** fast tiers annotate 329/329 and viewer 517/517 (worktree, `[real]` skipped).
  Browser `--only "annotate hosted posture"` 15/15 and `--only "the right-click menus"`
  10/10, both against `data/scratch/rc1124`. Witness `--only` the hosted check's spec
  (`browser__real-pressing-a-bind-control-says-in-one-line-that-bindi__986db3a0`, mutation
  in `storage/http.js`, unchanged): WITNESSED in 31 s. Nothing was written to the scratch
  log, and Jeff's log is still 116 files, `efe47ec6…` / `39e9abba…`.
- **Not done here:** review findings 2 (the row menu's silent Unbind) and 3 (the menus suite
  is gated on Jeff's live log) stay filed. The dead `.bind-form` / `.owner-not-in-set-form`
  CSS also stays, because `apps/annotate/run_browser_check.mjs` (already broken, filed)
  still names `.bind-form__bind`.
