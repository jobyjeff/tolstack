# Type and colour in the web surfaces

> Read this before writing a CSS rule in `apps/viewer/` or `apps/annotate/`.
> It is short on purpose, and it states **no numbers** — every number it talks
> about lives in one stylesheet declaration, and a test pairs both apps against
> that declaration. Recording the values here too would give them two homes,
> which is the defect this repo has re-filed most often
> (`docs/prompts/REVIEW_AGENT.md`, "Documented vocabularies drifting from the
> seeded data").
>
> Settled by handoff `design_pass_typography` (2026-09-17), which is the
> tolstack half of a workspace-wide pass over Jeff's 2026-09-16 note: *"different
> emphasis, font/font size, line spacing, color, layout, etc. can play together
> to make ui design look professional and easy on the eyes."* That pass changed
> only styling — no behaviour, no copy, no layout mechanism — and what it left
> behind is this page plus the guard below it.

## Where the numbers are

| What | Its one home | What keeps it true |
| --- | --- | --- |
| The type scale (six named steps) | `apps/viewer/style.css` `:root`, `--t-*` | `tests/test_app_type_scale.py` |
| The measure (how wide prose may run) | `apps/viewer/style.css` `:root`, `--measure` | — (prose rules reference it; nothing else may hard-code a cap) |
| The colour palette and what each hue means | `apps/viewer/style.css`'s header comment, and `apps/viewer/topology.css`'s | the palette is the app's subject, not a style token; see below |
| Row geometry (row height, grip pixels) | `VA.RAIL_METRICS`, `VA.TOPO_GRIP` — **JS**, not CSS | `apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs` |
| The size of a drawn icon | `VA.WARNING_ICON_PX` — **JS**, not a type step | `apps/viewer/tests.js` (the attribute), `scripts/run_viewer_browser_tests.mjs` (the rendered box) |
| The size of a joint glyph on the DAG | `VA.INTERFACE_GLYPH_PX` (`apps/viewer/interface_glyphs.js`), its design box, drawn at the row pitch; the form mark's `VA.FORM_GLYPH_PX` — **JS**, the same kind of picture | `apps/viewer/tests.js` (the glyphs it places) |
| An edge's ink and its two weights, lit and unlit | `apps/viewer/topology.css` `:root`, `--edge-ink`, `--edge-lit-w`, `--edge-unlit-w` — the only channel a DAG edge has; confidence is the grid chip's | `scripts/run_viewer_browser_tests.mjs` (one ink, two weights, measured) |
| The body tints, and the grid's dividers and sub-stack rule | `apps/viewer/topology.css` `:root`, `--tv-body-*`, `--tv-divide-*`, `--tv-stack-rule*` — region tints like the leader bands, low chroma and never the accent; the DAG's `.tv__bodyfield--t*` (and a body's bridge) and the grid's `.tvrow--body-t*` read the same tokens. Sixteen, **assigned**: a body's tint is its place in its topology's `bodies[]` (`VA.bodyTint`, `VA.BODY_TINTS`), so the first sixteen bodies never share one; neighbouring slots are far apart in hue | `apps/viewer/tests.js` (a row's tint is its body's; the live model's bodies fit the count) |

| The scene tree's indent step, twisty and glyph columns | `apps/viewer/topology.css` `.navtree__scene`, `--tree-step`, `--tree-twisty`, `--tree-mark` | — (one declaration each; every nested level reads them) |
| The scene tree's mark colours | `apps/viewer/topology.css` `:root`, `--mark-*` — four are the 3D scene's own face marks (`MARK_COLORS`, `apps/annotate/scene.js`) | `tests/test_rail_row_looks_are_paired.py` (the colours, and the kinds and marks the stylesheet keys on) |

**An icon is a picture, and its size is not a step on the scale.** The alert
mark both apps wear (`VA.warningIcon`, 2026-09-22 -- the nav rail's rows, both
stack tables' source columns, the banner's stale-data line and the annotator's
element rail; `apps/viewer/warning_icon.js` is its one home) is drawn at a
pixel size because the alternative is worse in both directions: a `⚠`
*character* is sized by `font-size`, so making it legible at row size means
either accepting whatever the nearest existing step gives or adding a seventh
step — a scale decision taken by one icon, in a scale whose whole point is that
a step exists because a *kind of text* does. So a glyph-as-icon is the shape to
avoid, and `VA.WARNING_ICON_PX` is not a precedent for hard-coding text sizes:
the ban on a bare `px` font-size is unchanged and `test_app_type_scale.py`
still enforces it. (The other half of that decision is about colour, not size:
U+26A0 renders through whatever font the platform picks for it, which on
Windows is as often a colour emoji as a glyph — and a colour emoji overrules
the semantic colour the rule below requires.)

`apps/annotate/style.css` declares the same six steps by **copy**, not by
import: the two apps deliberately share no stylesheet (that file's header says
why), and `tests/test_app_type_scale.py` is what compares the two blocks and
refuses a bare `px` font-size in either app. So a seventh step is a design
decision made in three places at once — the stylesheet, the test's
`STEP_NAMES`, and this page — and cannot be made by accident in a rule.

## The six steps, by job

Each step exists because a **kind of text** exists, not because a size looked
right. Pick by the job; if no job fits, the answer is almost always that the
text is one of these jobs and you had not decided which.

- **micro** — a tiny label: a table column header, a chip, an id. The only
  place ALL-CAPS is allowed.
- **meta** — metadata, a caption, a disclosure's summary line, a section label.
- **dense** — a data row. Tighter than prose, still scannable.
- **body** — body, and every run of real prose.
- **title** — the title of a pane or a dialog.
- **page** — the page's own name, once.

Two rules ride on top of the ramp:

1. **At most two steps beyond body inside one component.** A component reaching
   for a third step is usually asking for spacing instead.
2. **Secondary is muted, never smaller-and-bolder.** The inversion this pass
   removed was a 10px 700-weight filled badge beside a 12px regular name: the
   badge felt like the headline and the name a reader navigates by felt like a
   footnote.

## Spacing

Deliberately **not** a token set, and this is a decision rather than an
omission. Padding and margin on the topology page are load-bearing *geometry* —
a grid row's height is the same number as `VA.RAIL_METRICS.rowHeight`, a grip's
width is paired against `VA.TOPO_GRIP`, and the browser tier measures both
directly. A blanket spacing vocabulary would fight guards that already own
those numbers and would buy nothing a convention cannot.

The convention this pass wrote to, and the one to follow:

- **Whitespace before chrome.** Separate two things with room; reach for a
  border only when room is not available. A section label with generous room
  above it needs no rule under it.
- **No boxes inside boxes.** A block inside a pane gets a **left spine** plus a
  tint, not a full ring. The pane is already a box.
- **Steps of 2px, in multiples of 4 where there is a choice.** Room between
  blocks is bigger than room inside them.
- **Line height ~1.4–1.6 for prose; data rows tighter.**

## Colour

The palette itself is the app's *subject*, not a style token: four saturated
hues mean provenance and nothing else may wear them, the rails are neutral so
they cannot compete, and the reasoning is written where the colours are declared
(`apps/viewer/style.css`'s header; `apps/viewer/topology.css`'s "Why the rails
carry no categorical palette"). Do not restate it.

What this pass **added** is one rule about **fill**, written above the chip
block it governs:

> A filled mark — a background of its own — is reserved for two claims:
> **provenance at its two worst states** (untraced, no citation) and **the
> answer** (a verdict). Every other mark is outlined in its own hue.

Everything else *qualifies* one of those two — a budget scope, a sensitivity
probe, a values status, an attention flag — and a qualifier drawn as loudly as
the thing it qualifies leaves a reader unable to tell which is which. Emphasis
is a budget; two claims spend it.

Corollaries worth stating. The first two are here because they were being
broken; the third because the 2026-09-30 hover pass had to answer it and the
answer is not obvious from the fill rule alone:

- **The accent is selection.** On the topology page it means *this, and not the
  others* — what is selected, and the selected study's path. A chip, an id or a
  heading wearing it at rest is a third claimant on a colour that only works as
  a binary.
- **Metadata is grey.** A material key, an id under a name, "authored in the
  topology" — these carry no state, so they carry no hue.
- **A pointer spends brightness, never a hue** (2026-09-30,
  nav_tooltip_once_and_rail_hover_emphasis). Hover is the third claimant the
  accent rule above keeps running into: it is not selection, it does not
  survive the pointer leaving, and a mark it could paint the accent would be
  saying "selected". So the topology page's hover emphasis is width and
  brightness only — a neutral one step up from the rails, a low-alpha halo,
  a low-alpha tint on a grid row — and a bar under the pointer keeps its
  provenance **hue**, lightened by the same neutral halo as everything else on
  its line rather than recoloured. The declarations and the argument are in
  `apps/viewer/topology.css`'s "one hover state, two surfaces".

**The grid's structure is drawn by background and line weight, never by
hue** (2026-11-03, the_kinematic_grid_is_a_stack_of_sub_stacks). A grid row's
background is its rigid body's tint — the same token the DAG's container for
that body is filled with, so a row and the field its bar sits in read as one
place — and the only other wash a row may wear is the untraced provenance
image layered over it. Structure is the line *above* a row: a hairline inside
one body, the heavier divider between bodies and wherever a sub-stack opens or
closes, and one left rule down a sub-stack's header and rows (dashed for a
declared gap). Dividers are inset shadows, never borders, so no mark moves a
row off its leader's seam. The sourcing legend under the grid names each chip
in reader words; it adds no colour.

**A tree says what a row is by its glyph and its depth, and what state it is
in by its mark — never by recolouring its words** (2026-11-06,
the_rail_reads_as_a_tree_of_bodies_joints_and_faces). Jeff, on the scene tree
in the nav: "no meaningful styling cues to give contrast between different
element/object types, the indention for nested elements is way too shallow.
Random checkboxes floating in space." So each kind of row the annotator sends
(`AA.RAIL_ROW_KINDS`) has one drawn glyph in one fixed column after the
twisty's, in neutral ink; each level is one indent step with a hairline guide
from its parent's twisty; the two navigating levels (body, joint) are the only
semibold rows. A face-bearing row's state (`AA.RAIL_MARKS`) is the colour of
its glyph — filled once a face is bound, open while one is only suggested or
still wanted — and the legend at the top of the tree names every mark. A
row's words stay ink and its state line stays grey, a suggestion's included:
a whole row turning amber was the "turned orange" Jeff could not decode.
Controls belong to rows: every checkbox is the row's last column, so they
line up at the tree's right edge at any depth; a row's buttons are one group,
shown over the end of the name when the row is pointed at (so showing them
moves nothing) and on a line of their own under it when the row is selected
or its pick is armed. Glyphs are drawn, not font characters, for the reason
the warning icon is (above).

## Monospace

For **genuine code or id content** only: a cell reference, a part number, a
field key an author typed, a transform's name. Not for a *label* — the field
labels beside those values are words (`VA.fieldLabel` humanises them), and
setting them in a mono face said "this is code" about the one half of each pair
that is not.

## Measure and alignment

- Prose is capped at `--measure` and left-aligned. Tables, code blocks and
  images are exempt: a column of numbers narrowed to a measure is worse than a
  long line.
- Numbers are right-aligned with tabular numerals (`.num`), so digits in a
  column line up.
- **No centred prose.** There is exactly one centred string left in either app
  and it is marked where it sits (`apps/annotate/style.css`'s
  `.an__scene-empty`): a one-sentence notice in the middle of an otherwise
  empty canvas, saying why the canvas is empty, is a label on a void.

## One theme

Both apps render **one** theme — dark — and there is no theme mechanism
anywhere in either of them: no `prefers-color-scheme` query, no `data-theme`
attribute, no palette switch. Contrast therefore has to hold in one place, not
two, and a rule written "for the light theme" is a rule written for nothing.
Whether a light theme is wanted is an open question, filed rather than assumed:
`docs/issues/ISSUE_20260917_both_apps_render_one_theme_and_no_mechanism_exists_for_a_second.md`.
