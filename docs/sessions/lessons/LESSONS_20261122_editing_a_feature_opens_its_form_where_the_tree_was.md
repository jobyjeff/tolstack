# LESSONS 2026-11-22 — editing_a_feature_opens_its_form_where_the_tree_was

Handoff: `docs/sessions/active/HANDOFF_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md`.
Worked 2026-11-23.

## What was built, in one paragraph

A feature row has a pencil (on hover or selection). A double-click, the pencil, or Enter on
the selected row hides the tree and draws the feature's **form** in the same column
(`VA.renderFeatureForm`, `apps/viewer/views/nav.js`, `#navform` in `topology.html`).
Opening it arms the pane at the feature's end. The arm is now the feature's **edit**
(`openEdit` / `editClick` / `editSnapshot` / `editCommit`, `apps/annotate/app.js`). The pane
holds the set as lines and posts it on its tree message as `edit`. The form draws that and
posts `edit take|drop|dismiss|ok` back. Nothing is written until the tick. The pure half
(the toggle, the line words, the tick's event plan) is in `apps/annotate/binding_state.js`
(`AA.editToggle`, `AA.editLinesOf`, `AA.editLineText`, `AA.planEditCommit`). The gesture
table is `docs/ANNOTATION_SURFACE.md`, "Editing a feature".

## The five old paths, and what each became

| path (handoff table) | now |
|---|---|
| a plain armed click (Pick a face, Correct) replaced the binding | a click puts the surface (the face and its joined segments) in the set, or takes it out. It never writes |
| a Take (including a mate line under an armed body) replaced it and ended the pick | gone from every surface. A suggestion is a line in the form, and a click puts it in the set. The pane verb `take` remains, reachable from the console and the hidden rail only (filed, below) |
| the bind bar under the scene replaced it | gone (`buildBindForm` deleted). The bar's bindings block is now read-only: its Correct had nothing left to write with, and its Flip and its proposals' Accept/Reject wrote beside the form |
| re-clicking a held face whose surface had unheld segments replaced it | a click on a held surface takes it out. A click on anything else adds it as a line |
| Add a face / Shift-click added (`addArmedFace`) | gone. Adding is just a click. `arm … add` and `AA.ARM_PICK_MODES` are deleted |

Also gone: the group offer bar (`#an-offer`, `group all|one`, `offerGroup`), the shell's
feature body (`VA.featureBodyPlan`, `renderFeatureBody`, `renderBodyPlan`, the mirrored-row
drawing `renderSceneTree` / `sceneList` / …, and ~180 lines of `.navtree__scene*` CSS with
the seven-circle/three-diamond mark vocabulary), the feature twisty, the armed line's states
("adding…", "added face N", "not on …", "reading face …").

## What the form does that the sketch does not show, and why

- **Next** (beside the tick, only when the part has another unbound, editable feature). It
  ticks, then opens the next one (`VA.nextUnboundFeature`). This is deliverable 7.
- **The tick can write more than one event.** A proposal can be ratified by one event only
  (`ratifies` is one id, and no schema change is allowed). So a set that holds faces that
  several open proposals name writes the set once, ratifying the surest, and then one more
  `bound` with the same set for each further proposal, each superseding the one before.
  Measured on v1's pitch plate spindle bore (four proposals on face 487): four events, one
  binding standing, no proposal left open. A plain set, or a set with one proposal, is
  exactly one event. A tick on an unchanged set that answers nothing writes nothing.
- **A proposal left alone stays open.** The old pick rejected every open proposal at the end
  when another face was bound. The form rejects only what the reader dismisses (✕ on a
  proposal line, recorded at the tick), as deliverable 6 says.
- **A feature holding one hole of a pattern is offered the rest when the form opens**, not
  only after a click on a hole. The hub's clocking (one hole in Jeff's log) opens offering
  "9 holes · r 2.7500 mm — like holes on one plane": two clicks after opening (the line,
  the tick).
- **A suggestion stands for its whole surface** (`surfaceNow`), as a click does. A mate row
  that named "face 784" would have added one segment of a shoulder.
- **Suggestions that say the same thing for the same reason are one line.** The bushing
  bores listed five identical "round · r 23.9713 mm · 2 segments — coaxial with …" lines;
  they are now one line of 10 segments.
- **A feature that disagrees** opens empty, with each set that disagrees as a suggestion
  ("bound before"). The tick writes Keep's event (`AA.buildFeatureSetEvent`).
- **Unbind** writes at once (`unbind`) and closes the form. It is the one control in the
  form that does not wait for the tick. Deliverable 6 calls it its own control.
- **History** is a folded disclosure: "bound <date> by <who> · a suggestion taken", then
  "n earlier". Where a suggestion came from is said only on a suggestion line.
- **The edit falls back to the feature's edge ends** (`editRecord`) where no feature-keyed
  record has been folded (a projection with edge-end records only, as in the pane's own
  fixtures). It reads bindings and proposals the way the old answer path did.

## Things that cost time

- **A double-click on a tree row is not a `dblclick`.** The first click repaints the tree,
  and Chrome counts clicks per element, so the second click lands on a new row and Chrome
  sends no `dblclick`. Worse, the pane shares the page's thread: measured in the walk, the
  two presses were stamped 1 ms apart and handled 617 ms apart, because the pane's work
  after the first click held the second back. So `onNavFeature` reads the two clicks by each
  click's own `event.timeStamp` (the row hands its click event on). A delegated `dblclick`
  on `#navtree` is a second way in. The browser suite passed this check twice before the
  walk caught it, at a moment when the pane was idle.
- **`renderNav` re-shows `#navtree` on every redraw.** It had to learn that the form owns
  the column (`form ? "none" : ""`). The first suite run had the tree drawn beside the form
  after the first pane message.
- **`node --check apps/annotate/app.js` does not parse it as a module.** It passed a file
  with a raw newline inside a string literal (a Python `-c` edit wrote `"\n"` as a real
  newline). `node --input-type=module --check < apps/annotate/app.js` catches it. The walk's
  page error ("Invalid or unexpected token") was the first sign.
- **`--data-root` is the `data` directory itself** (`…/tree1123/data`), not the root above
  it. Pointed one level up, the builders wrote a stray `projections/` there, which I removed.
- **The walk driver's served-log rewrite outlives a deleted event.** After removing the
  walk's two events from the scratch inbox, the scratch root's `log.json` still carried
  them, and the browser suites read that file. Rebuild `build_feature_identity_projection.py`
  and `build_kinematic_projection.py` into the scratch root afterwards.
- **`--only` takes one suite per browser-runner run.** Several `--only` flags run only the
  first.
- The browser suite's [real] cases must not assume what Jeff has bound. The tangential link
  mount's pattern, unbound when the retired suite was written, holds ten holes now. The new
  suite reads which features are bound from the served log and edits bound ones.

## Clicks, before and after (Jeff's three cases)

Counted from the feature's row. "Before" is the page at integration `23d8b0f3` (the previous
walk's `REVIEW_20261122_the_first_study_on_v2.md`, "Add a face, replayed", and the body's
code). "After" is this walk on the scratch copy of his log.

| case | before | after |
|---|---|---|
| tangential link mount pilot, two shoulders, nothing bound | twisty, Pick a face, click shoulder A (writes, disarms), Add a face, click shoulder B (writes): **5**, two events, and Add a face then a Take on a line *replaced* the set (his 0102–0104) | double-click, click A, click B, ✓: **3 after the form opens**, one event |
| …one shoulder already bound (Jeff's state) | twisty, Add a face, click B: 3, *if* he clicked in the scene and not a line | double-click, click B (or its suggested line), ✓: **2 after the form opens** (walk: 18 faces, one event, superseding 0104's binding) |
| gas-spring mount bushing bores | twisty, Pick a face, click (swept), plus "Take all" when the bore's pieces sit apart: 3–4 | double-click, the suggested line ("round · r 23.9713 mm · 10 segments"), ✓: **2 after the form opens** |
| tangential link mount fastener pattern, from one hole | twisty, Correct, click a hole, "Take all 10 holes" in the bar over the canvas: 4 | double-click, the "9 holes" line, ✓: **2 after the form opens** (walk, hub side: one event, 20 faces) |

## For the next link (right-click menus)

The menu should call the same pane verbs the form does, never write by itself:
`edit click <face>` (a surface in or out of the open edit), `edit take <key>` /
`edit drop <key>` (a suggestion or a line), `edit ok` (the tick), `arm off` (the X). With no
form open, "Edit <feature>" is the shell's `openFeatureForm(fid)` followed by
`edit click <face>`. Flip has no home yet; the issue below suggests the menu.

## Looked at (`shots/editing_a_feature_opens_its_form_where_the_tree_was/`)

Served by `tests/debug_walk_merged_page_20261114.mjs --root data/scratch/tree1123 --port
8895` (this tree's apps, the previous link's scratch root, whose feature-identity inbox was
byte-identical to Jeff's). Every shot was read before this table was written.

| shot | what it shows |
|---|---|
| `a0` | the tree: one mark per feature, no twisty, the pencil on the hovered "pilot bore" row |
| `a1` | the pilot's form in the tree's place: name, ✓, ✕; part; "mates with propeller hub locating boss"; the held shoulder as one green line, "round · r 107.9754 mm · 9 segments"; the other shoulder suggested ("coaxial with propeller hub") |
| `a2`, `a3` | after one click on the other shoulder, a second line in ink. Hovering it lights that ring yellow in the scene and shows its ✕ |
| `a4` | after ✓: the tree back with "pilot bore" selected at the same y (365 → 365), both rings lit, "Saved · 18 faces" |
| `f_filmstrip_open_pick_tick_back` | a0–a4 as one strip |
| `b1` → `b2` | the bushing bores before and after merging same-worded suggestions (five lines → one, 10 segments) |
| `b3`, `b4`, `b5` | hovered, taken (five rings lit), Esc: the scratch log stayed at 117 files |
| `c1` | the tangential link mount's pattern, bound: one line "10 holes · r 2.9000 mm", with three single-hole mates of other sizes suggested |
| `c2`–`c5` | the hub's side holding one hole: "9 holes — like holes on one plane" offered on open, taken into one "10 holes" line, ✓, tree back |
| `d1`, `d2` | the tree and the form at 3840 |
| `e1`–`e3` | the click-around: an orbit with the form open keeps it; a shoulder taken out goes back to Suggested with its reason; ✕ writes nothing; no page error the whole walk |

Findings that I left:
- **Two shoulders read the same words** ("round · r 107.9754 mm · 9 segments" twice). Only the
  hover tells them apart. The sketch named them "outer" and "inner". An axial position word
  needs a frame to measure from. Filed with the small findings.
- **The bushing bores hold one r 25.39 mm face**, and the r 23.97 mm surface is what fits the
  piston body. That is data for Jeff, not a defect of the form.
- The form's title clips ("tangential link mount fastene…") at 300 px, with the whole name on
  hover.

**Jeff's log:** `C:\workspace\tolstack\data\inbox\feature-identity\` was 116 files before and
after. The listing sha256 was `efe47ec6…` and the contents sha256 `39e9abba…`, the same both
times. The walk wrote two events to the scratch inbox (`0116`, `0117`). They were removed,
and the scratch root's identity and kinematic projections were rebuilt.

## Decisions the handoff left to me

- **The pane holds the set; the shell draws it.** The scene's clicks, the surface reading and
  the writers are all the pane's. A set kept in the shell would have needed every one of them
  across the seam.
- **The pane's own (hidden) rail keeps its Take/Accept/Pick and its verbs.** No surface shows
  them now; retiring them means retiring three suites that drive them. Filed.
- **Flip is not in the form.** Filed with options (`audience: strategy`).
- **The bind-mode bar's owner-not-in-set form stays.** It records a different fact and has no
  other home.

## Filed

- `ISSUE_20261123_flip_has_no_place_in_the_features_form.md` (feature, strategy)
- `ISSUE_20261123_the_panes_hidden_rail_still_carries_binding_controls_no_surface_shows.md` (chore)
- `ISSUE_20261123_the_form_names_two_split_shoulders_with_the_same_words.md` (bug, low)
- Resolved by this change, with addenda: `…a_take_under_an_armed_add_a_face_replaces_the_set…`,
  `…the_shells_mate_lines_cannot_show_a_suggestion_without_a_take`,
  `…two_annotate_browser_suites_assume_live_features_are_still_unbound`,
  `…a_dimension_row_under_a_feature_wears_its_other_ends_bound_mark_beside_suggested`.
- The retired browser suites' coverage the form suite does not carry (the pre-lit mates on an
  armed side, the Parts filter's count, the pattern fit line in the Preview) is in that same
  issue.
- `tests/debug_*` walk scripts from earlier sessions still drive the feature body. They are
  dated, hand-run tools and are left as they are.

## Suite record

(filled in below)
