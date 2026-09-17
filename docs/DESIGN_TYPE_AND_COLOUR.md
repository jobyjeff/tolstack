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

Two corollaries worth stating, because both were being broken:

- **The accent is selection.** On the topology page it means *this, and not the
  others* — what is selected, and the selected study's path. A chip, an id or a
  heading wearing it at rest is a third claimant on a colour that only works as
  a binary.
- **Metadata is grey.** A material key, an id under a name, "authored in the
  topology" — these carry no state, so they carry no hue.

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
