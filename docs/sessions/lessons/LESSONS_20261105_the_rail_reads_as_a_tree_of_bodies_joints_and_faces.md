# Lessons 2026-11-06 — the_rail_reads_as_a_tree_of_bodies_joints_and_faces

Source: Jeff's note `20261105T164140_sm8hkc` on the scene tree in the shell's
nav: no styling cues between kinds, an indent that is too shallow, "random
checkboxes floating in space", and "the second joint changed formatting (turned
orange)". The tree Jeff sees is the **shell's mirror**
(`apps/viewer/views/nav.js` `renderSceneTree`, `apps/viewer/topology.css`
`.navtree__scene*`), not the annotator's own rail. Since 2026-10-30 that rail is
laid out but never shown. Most of this change therefore lives on the viewer side.
The annotator only says what each row **is** and what **state** it is in.

## What "turned orange" was

It was the shell's `.navtree__scenerow[data-attention="true"] { color: var(--inferred) }`.
That rule coloured the whole row, words included, in the provenance amber
whenever the annotator sent `attention`. The annotator sent `attention` for
every state outside `AA.QUIET_BINDING_STATES`. The second joint's end had
dropped to `unbound` once its partner was bound, which the behaviour handoff
fixed. The deeper problem was that a state was carried by recolouring a row's
words, in a hue that means provenance on this page and is named nowhere. That
rule is gone. A row's words stay ink, and state is the colour of the row's
mark, named in a legend. Orange now means exactly one thing, **picked now**,
which is the 3D scene's own pick orange (`MARK_COLORS.picked`).

## Kind → style

The annotator tags its rows with `railLook(node, kind, mark)`. These are
classes, not `data-` attributes, because the mirror builds a row's key from its
`data-` attributes, and a look must not change a key. `railRow` sends `kind` and
`mark`, and the shell writes them onto `data-kind` / `data-mark`. Every glyph is
drawn in CSS, never a font character, for the same reason as `VA.warningIcon`.

| kind (`AA.RAIL_ROW_KINDS`) | level | glyph (neutral unless marked) | name |
|---|---|---|---|
| body | 1 | filled rounded square | dense, semibold |
| joint | 1 | ring | dense, semibold |
| contributor | 1 | dimension bar (`├─┤`) | dense, regular, value right |
| part | 2 | open square | dense, regular |
| end | 2 | dot in its mark's colour | dense, regular; state line micro, muted |
| candidate | 3 | diamond in its mark's colour | dense, regular; reason micro, muted |
| action ("Pick another face…") | 3 | none | dense, muted, ink on hover |
| element (bind mode) | 1 | dot in its mark's colour | dense, regular |

Group headings (BODIES, JOINTS, CONTRIBUTORS) are micro caps, muted, with room
above them and no rule. The component uses two type steps, dense and micro,
which keeps it inside the "two steps" rule. I did not use `meta` for
candidates: depth and the glyph already carry their level.

## The indent step

`--tree-step` (20px) per level, declared once on `.navtree__scene`. A nested
list hangs a 1px `--line` guide from the centre of its parent's twisty column
(`--tree-twisty`, 16px), so the step is the twisty's half-width plus padding.
A candidate face sits **40px** in from its joint: group headings are flat
items, so joint → end → face is two nested lists, two steps. (The first
version of this lesson and the CSS comment said 60px. The review caught it,
and the browser check now measures both steps on the live study: 20px and
20px.) Before, the step was 14px with no guide, under a 12px slot pad.

**Against the grid:** the grid's brackets are on the parallel branch
`the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`, not on this
baseline. Its per-level inset there is `VA.GRID_BRACE.inset` = 7px, a bracket
side's offset with the bracket itself carrying the nesting. Matching it would
bring back the depth Jeff called "way too shallow". So the two numbers differ
for now, and how they should agree is filed for strategy:
`docs/issues/ISSUE_20261106_the_rails_indent_step_and_the_grids_brace_inset_are_two_numbers.md`.
**The side-by-side shot is not delivered.** `06_rail_beside_grid.png` puts the
nav beside the pane at one zoom, but at 1600 px wide with the 3D pane open the
grid is the 59 px slit that the grid handoff is fixing, so no grid rows are
visible. The rail's tree only exists while the pane is open, so closing the
pane removes it too. I tried a closed-pane shot, but the handle click left the
pane open, so I dropped that shot. A real comparison needs the grid branch's
layout, and that belongs with the indent issue above.

## The legend (marks, `AA.RAIL_MARKS`)

The legend is one wrapping block of micro text under the filter chips. Every
mark is always listed, so it never changes height under the reader. The words
are the annotator's (`AA.RAIL_MARK_WORDS`, sent as `legend` on the tree), and
the shell composes none. A mark is **filled** once a face is bound and **open**
while a face is only suggested or still wanted.

| mark | word | colour token | = scene mark |
|---|---|---|---|
| bound | bound | `--mark-bound` | `MARK_COLORS.bound` |
| picked | picked now (a binding this session wrote) | `--mark-picked` | `MARK_COLORS.picked` |
| proposed | agent's suggestion | `--mark-proposed` = `--accent` | `MARK_COLORS.suggested` |
| contact | touching face | `--mark-contact` | `MARK_COLORS.contact` |
| declared | face named (the end's node declares `face.part`) | `--mark-declared` = `--ink` | — |
| open | no face yet | `--mark-open` = `--muted` | — |
| recheck | check again (owner not in set / needs re-confirmation) | `--mark-recheck` | the scene's warning red |

`tests/test_rail_row_looks_are_paired.py` holds the four scene colours equal
to `scene.js` and pairs both vocabularies with the stylesheet's selectors.

## Controls belong to rows

- **Checkbox:** always the row's last control (`order: 1`), so every checkbox
  is in one column at the rail's right edge at any depth.
- **Buttons:** one group, `.navtree__sceneacts`. At rest it is invisible, and
  it shows over the end of the name on hover or focus, so showing it moves
  nothing. On the selected row, or on a row whose pick is armed, the group
  takes a line of its own under the name, at the right.
- **The "floating checkboxes":** the old rule that wrapped an armed row
  (`:has(> .navtree__scenebtn[aria-pressed="true"])`) also fired on a **part**
  row whose **Isolate** was pressed (the bordered Isolates in
  `before/03_upper_list.png`), so that part's checkbox and buttons dropped onto
  a second line under its name. The rule is now scoped away from parts.

## Decisions not in the handoff

- **A candidate's reason line is muted** in both the shell and the annotator.
  The routed issue's second half was eight accent lines in a list. The
  candidate's diamond carries whose suggestion it is.
- **The candidate-list twisty is a drawn chevron**, in the same 16px column as a
  body's and a joint's. The button keeps its words as `aria-label` / `title`.
  The annotator's own `.tree-row__twisty` widened from 10px to 16px (the routed
  issue's first half, for the copy nobody sees).
- **The annotator's own rail does not draw the new looks.** It is not
  user-visible. Filed: `docs/issues/ISSUE_20261106_the_annotators_own_rail_does_not_draw_the_kind_glyphs_or_state_marks.md`.
- **`data-attention` is still sent and still set**, because tests and the
  browser tier read it. It just no longer paints anything.

## Shots (`shots/the_rail_reads_as_a_tree_of_bodies_joints_and_faces/`)

Taken with `node tests/debug_rail_look.mjs` (new; boots like `debug_rail_walk.mjs`
on the memory adapter). Every step writes a full-page PNG and a `_nav` crop.

- `before/`: the same walk on the old look (`debug_rail_walk.mjs`).
- `01_at_rest`, `02_all_joints_open`, `03_end_list_open_hover` (a candidate
  hovered, Take shown over it), `04_two_ends_bound` (both pitch link ends
  `picked now`, the lower one selected with its Re-pick on its own line),
  `05_mid_pick` (Cancel / hide others on the armed row), `06_rail_beside_grid`.
- `rail_walk.png` / `rail_walk.json`: the behaviour handoff's filmstrip
  re-filmed on the new look (`node scripts/filmstrip.mjs --scenario
  tests/debug_rail_walk_scenario.mjs --real-time --frames 8 --interval 2500
  --columns 4 --width 2800 --viewport 1200x850 --name rail_walk`).

## Gotchas

- **A worktree's browser tier needs `node_modules`.** I linked it as a
  junction to the main checkout's (`mklink /J`). A junction is a directory to
  git, so `node_modules/` hides it, unlike the symlink the last lesson reports.
  I removed it before handing back.
- **The fake DOM in `apps/viewer/run_tests.cjs`** supports no child combinator
  in `querySelectorAll` and has `childNodes`, not `children`.
- **A shell heredoc mangles `▸`** on this box (the codepage on stdin), so a Python
  patch that matched on it found nothing. Edit such lines with the Edit tool.
- **An inserted line between two anchored lines rots a witness.** I added
  `railLookInto` between the `<details>` row's two lines and broke
  `browser__real-a-joint-selected-in-the-scene-is-selected-in-the-na__554d823a`'s
  anchor, so I moved it below them.

## Verification record (2026-11-06, from the worktree, on 4c665682 plus docs)

- **Full suite:** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
  gave `1 failed, 1733 passed, 1 skipped, 2 deselected in 517.77s` (wall 518 s,
  recorded as `default`, inside budget). The one failure is
  `tests/test_viewer_js_suite.py`, the worktree's deliberate red: no
  projection under the worktree's `data/`. `tests/test_app_type_scale.py` and
  `tests/test_rail_row_looks_are_paired.py` are green in it.
- **Fast tiers:** `node apps/viewer/run_tests.cjs` gave 516/516 (node-fs tier
  skipped in the worktree). `node apps/annotate/run_tests.cjs` gave 293/293.
- **Annotate browser check:** `node apps/annotate/run_browser_check.mjs` gave
  96/99 in 2337 s. The three failures are the known deferred ones: the mock's
  anchor geometry and the anchors message (ISSUE_20261028), and the
  reduced-motion speed control.
- **Viewer browser TRUTH tier:**
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` gave
  39/42 in 3054 s (recorded as `merge`, over budget, filed
  `docs/issues/ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`).
  All three failures were mine, and all three are fixed:
  - **`suite file://` and `suite http`:** my new kind/mark test called
    `.map` on `childNodes`. The fake DOM hands back an array, and a real
    browser hands back a NodeList. Each suite is now 502/502 on `--only`.
  - **The bind-mode rail snapshot:** element and part rows now carry
    `rail-kind--*` / `rail-mark--*` classes, so the snapshot moved. I rewrote
    it with `--write-bind-rail-snapshot`, and its diff is only those classes.
    The sweep-rail suite is 24/24 without the write flag.
- **Witness gate:** `node scripts/run_mutation_witness_tests.mjs
  --changed-since integration --repo C:/workspace/tolstack` reached 27 of 38
  entries in 28m49s, witnessed 21, and left 11 to the sweep. Six came back
  NOT WITNESSED, all because a baseline was red, not because a guard failed:
  - **Five fast entries** (`d442f0db`, `a6c0094f`, `13efc637`, `d7d247f8`,
    `ed8e4a27`): the fast tier's `[real]` half refuses the main checkout's
    projection (built from `eb3059ff`/`ee7ccf3c`), and rebuilding it from a
    worktree is not allowed. I witnessed each by hand in the worktree:
    apply the declared mutation, run `node apps/viewer/run_tests.cjs`, see the
    named check FAIL with a green baseline, then restore the file. All five
    were witnessed.
  - **`browser__real-and-leaving-it-takes-the-light-down__3c44a05c`:** its
    suite's baseline was red once on a different check, "[real] clicking a
    contributor row…". That check passed in the full tier run and in a
    standalone rerun. Re-run alone, the entry was WITNESSED (2m57s).
- **The `node_modules` junction** was removed before handing back
  (`cmd /c rmdir node_modules`).

## Rework after review (2026-11-06)

`docs/sessions/reviews/REVIEW_20261106_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md`
requested changes for one blocker. Every visual deliverable could be reverted
with every gated tier green: the helpers were pinned, but the wiring that
carries them to Jeff's page (`railLookInto`, `legend:`) and the stylesheet's
rule bodies were not. What changed:

- **Seven `[real]` checks on the live kinematic study** were added in the
  shell's tree, in `annotate rail holds still`. They run after the Take, with
  the joint open, one end picked and the other end's candidates listed. Each
  has a spec aimed at its wiring line or its rule, and all seven are
  WITNESSED:

  | check | the spec's mutation |
  |---|---|
  | rows carry their kind, and every end carries a mark | the list-item `railLookInto(node, row)` call deleted |
  | the end taken this session is `picked`, filled in pick orange | `sessionEventIds()` returns `[]` |
  | the legend draws every mark once | `legend: []` |
  | each level steps in at least 18px (measured: 20 and 20) | `--tree-step: 14px` |
  | each kind draws a glyph | the body's `::before` content set to `none` |
  | an attention row's words stay ink | the old `data-attention` → `--inferred` rule restored |
  | an Isolate'd part stays one line | the armed wrap's `:not([data-kind="part"])` removed |

- **Gotcha, the Isolate check:** the first version clicked the real Isolate
  and measured once `aria-pressed` read true. Mutated, it still passed: by
  the time of the read, the pressed state had cleared, and the rule never
  fired. Also, the checkbox's `order: 1` keeps it on the name's line
  regardless, so what the part exclusion actually stops is the button group
  dropping to its own line. The check now sets the pressed state, measures
  and restores, all in one synchronous evaluate, and it asserts both the
  checkbox and the buttons. That is what turned it WITNESSED.
- **Gotcha, the evaluate that reads every row** must be null-safe. With
  kinds removed, `find(…, "end")` returned nothing, and the throw aborted the
  suite before the push. The runner then reported "never reached the
  witness" rather than a red.
- **Scoped selectors:** every `[data-kind]` / `[data-mark]` rule is now under
  `.navtree__scene`.
- **The indent arithmetic** is corrected above, to 40px from a joint to its
  candidate face.
- **The side-by-side shot is delivered.** The grid branch landed and is
  merged here, and at 2560 wide the grid has room for its rows:
  `07_rail_beside_grid_2560.png`.
