# LESSONS — design_pass_typography (2026-09-17)

One typography / visual-hierarchy pass over `apps/viewer/` and `apps/annotate/`.
Styling only: no behaviour, no copy, no layout mechanism. What follows is what
the next agent cannot get from the diff.

## The single biggest finding was not a design choice — it was a leak

`VA.confidenceClass()` returns `conf--traced` / `conf--inferred` /
`conf--untraced` / `conf--no_source_ref`, and **four different kinds of element
wear the result**: a chip, a `<tr>` in the elements table, a `<tr>` in the
materials table, a `<tr>` in the topology grid, and an SVG `<line>`. The chip
rules were unscoped:

```css
.conf--untraced { color: #fff; background: var(--untraced); font-weight: 700; }
```

so `color: #fff` and `font-weight: 700` — written for an 11px pill — arrived by
inheritance on **every cell of every untraced row**. Measured on the live
`pitch_system`, 8 of the grid's first 10 rows and both of the materials table's
rows rendered entirely in 700-weight white; `conf--traced` and `conf--inferred`
tinted all eleven of a row's columns, numbers included, green or amber.

Nobody chose that, and no test saw it — the browser tier measures the row's
**background** layers (band tint composed under provenance tint, deliberately)
and never its text. Scoping the four rules to `.chip` fixed it in four lines and
is most of what the before/after screenshots show. The row's provenance is not
lost: it was never carried by the text, it is carried by the 3px spine in
`td:first-child`, the background tint, and the chip in the source column.

**The general lesson:** a class name that is a *vocabulary token* (`conf--X`
comes out of a constant) will be put on whatever element needs that vocabulary,
so a rule keyed on it alone is a rule you have not decided the scope of. Write
`.chip.conf--X`, not `.conf--X`.

## The scale, the measure, and the one rule about fill

Recorded in `docs/DESIGN_TYPE_AND_COLOUR.md`, which states **no numbers** — they
live in `apps/viewer/style.css`'s `:root` and `tests/test_app_type_scale.py`
pairs both apps against them. Summarised here only as *what was decided*:

* **six named steps** (`--t-micro` … `--t-page`), replacing nine `px` values
  declared for six kinds of text. Two of the nine had arrived by accident, not
  by decision: `apps/annotate/style.css` set no base size at all, so its element
  rail inherited the browser's 16px and was the **largest type on the page**,
  larger than the app's own title; and its detail-pane `h3` landed on 15.2px via
  the browser's `1.17em` default;
* **`--measure`**, one cap for every run of prose, in `ch`;
* **fill is reserved for two claims** — provenance at its two worst states
  (untraced, no citation) and *the answer* (a verdict). Everything else is
  outlined in its own hue. This is the rule the nav rail's attention flags now
  follow, and it is written above the chip block in `style.css` so the next chip
  is decided rather than guessed.

`--measure` is `72ch` and not `84ch`, and the arithmetic is worth keeping: `1ch`
is the width of a **zero**, which in a proportional face is about 15% wider than
the average letter. The first attempt at `84ch` measured 589px at `--t-dense`
and read as **~94 characters** — past the 90 the house rule allows, while
looking compliant in the stylesheet.

## What the pass measured, surface by surface

`tests/debug_typography_pass.mjs --phase before|after` re-takes every screenshot
in this directory and prints a **type census** per surface: how many distinct
sizes it renders, how many of its marks are filled, how many runs are 700-weight.
That census is why this pass has numbers instead of adjectives, and it is the
reason the probe is committed.

| surface | sizes before → after | filled marks | 700-weight runs |
| --- | --- | --- | --- |
| nav rail | 13/12/11/**10** → 13/11 | 61 → **17** | 61 → 17 |
| topology preview pane | **15**/13/12/11 → 16/14/13/12/11 | 1 → 1 | 4 → **1** |
| totals + verdicts + gaps | 14/13/12/11/**10** → 14/13/12/11 | 3 → **1** | 5 → **1** |
| hover card | 14/13/12/11 → unchanged | — | 2 → 1 |
| stack view | **17/15**/14/13/12/11/**10** → 16/14/13/12/11 | 50 → 45 | 130 → **46** |
| worksheet dialog | 18/**17**/**15**/13/12/11 → 18/16/14/12/11 | — | — |
| annotator rail | **16**/**13.3**/12/11 → 13/12/11 | — | — |
| annotator detail pane | **15.2**/**13.3**/13/11 → 16/13/11 | — | — |

The stack view's 45 remaining filled marks are the untraced/uncited confidence
chips on a stack that is mostly uncited. That is the design, not a leftover.

## Gotchas the next agent will hit

* **`.hovercard` is on `#croppop` ITSELF.** `views/cards.js` re-classes the one
  shared positioned node per card kind rather than nesting a card inside it, so
  `#croppop .hovercard` matches nothing and a `waitForSelector` on it hangs
  forever. Use `#croppop.hovercard`.
* **`.rail__barhit` is `stroke: transparent`**, so Playwright calls it invisible
  and refuses to hover it; `{ force: true }` moves the pointer but did not open
  a card in practice. The grid's confidence chip (`.chip.cardtrig`) is a
  reader's other route to the same `VA.citationCard` and hovers normally.
* **Escape closes a modal `<dialog>`.** A "park the pointer" helper that presses
  Escape (the popover's own dismiss, and the right thing everywhere else) closed
  the worksheet dialog the shot was about; the first take of shot 13 is the page
  behind it. For a dialog shot, move the mouse and `blur()` without Escape.
* **Blur before shooting anything you just clicked.** The first take of the
  totals shot carried a bright rounded focus ring around "What's missing" that
  looked exactly like a design decision.
* **`h3` does two unrelated jobs in the viewer** — a section label ("Elements",
  "Materials", …) and the preview pane's element *name* — and a third in the
  worksheet body, where markdown emits 26 of them in the live thermal-fit
  document. Making `h3` a tiny uppercase label (which is right for the first
  job) silently turned all 26 document headings into 12px grey chips. All three
  now have their own rule. If you touch a bare element selector in this
  stylesheet, grep `VA.el("h3"` first.
* **`git checkout <sha> -- a b` then `git checkout HEAD -- a` leaves `b`
  reverted and staged.** Used deliberately here to re-shoot the "before" phase
  off the baseline stylesheets (there is no other honest way to get a
  comparable pair), and it cost one round of re-applying edits to
  `topology.css`. Restore **every** path you checked out, in one command.
* **`node_modules/` is gitignored**, so a worktree has none and the browser and
  mutation tiers cannot start. `New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules`.
  This is now written in six lessons.

## Decisions taken that the handoff did not specify

* **The attention flags were quietened, the verdict badge was not.** The handoff
  said to tune "weight, size, color temperature of what remains" and named the
  loud alert styling as the sore spot; `viewer_study_verdicts_and_gaps`
  (2026-09-15) had deliberately made both loud. The split follows Jeff's own
  sentence — *"roll all the alert badges into one… Styling for the alert text
  themselves can then be a bit less obnoxious"* — and the distinction the open
  issue draws: a verdict is **the answer**, a flag is an **alarm about** it.
  Consolidating the three flags into one badge is still
  `ISSUE_20260916_the_viewer_nav_rail_may_be_the_left_side_menu_jeff_called_loud`
  and was not done here.
* **The dead `.chip--export-*` rules were left filled on purpose.** They exist
  only as a record of the treatment the elements table retired on 2026-09-16,
  and `tests/debug_flyout_and_alerts.mjs` reconstructs the old row *through
  these exact classes* to shoot its before/after pair. Re-tuning them would
  quietly rewrite the "before" half of a committed screenshot. Their live
  sibling `.chip--values-*` **was** re-tuned. The shared rule is now two rules,
  and the reason is written between them.
* **`tests/test_app_type_scale.py` is a new guard nobody asked for.** The
  handoff asked for a doc note; a note stating six numbers that no test reads is
  this repo's own named defect (`CLAUDE.md`: *"a quantity written in prose that
  no test reads from the tree is a defect"*). So the numbers went into one
  stylesheet declaration, the note points at it, and the guard pairs both apps
  against it — and refuses a bare `px` font-size, so the scale cannot be widened
  by a rule.

## Surfaces left alone, and why

* **A light theme.** The handoff's definition of done asked for both themes, and
  there is no second theme and **no mechanism for one** anywhere in either app:
  no `prefers-color-scheme`, no `data-theme`, no palette switch, no persisted
  preference. The only "theme" in the repo's prose is *themed scrollbars*. The
  committed screenshots are therefore of the one theme each app has, and the
  question is filed rather than assumed —
  `ISSUE_20260917_both_apps_render_one_theme_and_no_mechanism_exists_for_a_second`
  sets out the three real constraints (the provenance hues are chosen against a
  dark ground; the band tints are white at 1.7%/5.5% alpha and vanish on white;
  the crops are white PNGs whose contrast is currently free).
* **`.mat-row__applied`'s accent blue** — the soak ranges a scalar CTE is
  *applied* over, printed under the range its source quoted it for. By the rule
  this pass wrote it is a third claimant on the accent and should be grey. It
  was left because its own comment makes a real argument (*"the pair IS the
  comparison, and the viewer states both without deciding whether one covers the
  other"*), the right colour for "these two may disagree" is arguably amber
  rather than grey, and re-deciding it means understanding a thermal claim
  rather than a type rule. Next pass's call, stated here so it is not
  re-discovered as a fresh finding.
* **`.topbar .sub`'s `renders data/projections/viewer/`** — an internal path in
  user-facing copy, which the standing rules do forbid. Left because it is
  **copy**, explicitly out of scope, and because it is the app's own
  self-description rather than an instruction to a reader. Not filed separately:
  the annotator's much worse instance is
  `ISSUE_20260917_the_annotators_console_and_parts_label_print_code_at_the_reader`,
  and whoever settles that settles this.
* **`.an__scene-empty` is the one centred string left in either app** — a
  one-sentence notice in the middle of an otherwise empty canvas, saying why the
  canvas is empty. The house rule forbids centred *prose*; this is a label on a
  void, and there is nothing to left-align it against. A `max-width` on the
  overlay was tried and reverted: the box is the canvas-sized backdrop, so
  capping it uncovers the canvas.
* **Row heights in both stack tables.** The elements table's rows are 88–112px
  and the materials table's are 488–653px for one line of data. CSS took the two
  bites it had (the citation note's preview clamp went 4.6em → 2.8em, and the
  name column got a 190px floor so a phrase stops wrapping to four lines); the
  shape is a composite source cell and the fix is the restructure the elements
  table already made —
  `ISSUE_20260917_the_materials_source_column_is_a_750px_tall_composite_cell`.
* **The crop lightbox and the annotator flyout.** Swept and found compliant:
  both are chrome around a picture or an iframe, their type is a head row and a
  caption, and neither carries a second claim to compete with the first. No
  before/after pair was shot for them because there is no change to show.

## Test-tier state

Green on all four, with **one pre-existing pytest failure that is not this
session's and not touched by it**:

```
tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
  docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152:
  says 3 entries that do not defer to the spec library; hardware_entries.json has 28
```

It is red on the baseline commit (`b3b60e0`) and red after, identically; the
file it names is a strategy brief this branch never opens. Stated as a diff
fact, not from memory.

| tier | result |
| --- | --- |
| `pytest -q` | 1198 passed, 1 skipped, **1 pre-existing failure** (above). +6 from the new guard. |
| `node apps/viewer/run_tests.cjs` | 368/368 |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 22/22 checks |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | 54/54 declared mutations witnessed |

No vocabulary constant and no projection field changed — `git diff` touches
neither `tolerance_stack/`, `scripts/`, `docs/tolerance_stacks/`, nor any
`VA.*`/`AA.*` table. The only non-CSS app change is three lines in
`apps/annotate/app.js` adding a class name to an existing paragraph.

## Re-taking the screenshots

```
node tests/debug_typography_pass.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons --phase after
```

Thirteen surfaces, deterministic (same viewport, nav id, row and scroll for
both phases) so the pair differs only where the stylesheet does. To re-take the
`before` half you have to put the baseline stylesheets back — see the
`git checkout` gotcha above, and restore every path in one command.
