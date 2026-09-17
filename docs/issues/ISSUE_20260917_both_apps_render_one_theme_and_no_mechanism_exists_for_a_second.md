---
type: feature
priority: low
status: open
area: apps/viewer
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_design_pass_typography.md
---

# "Contrast holds in both themes" has nothing to hold in: both apps render one theme, and no mechanism for a second exists anywhere

## The finding

`HANDOFF_20260916_design_pass_typography` carried, among its principles,
*"contrast holds in both themes"*, and in its definition of done: *"Before/after
screenshots for each major surface … **both themes** for at least the topology
page."*

There is no second theme, and no way to select one. Searched across
`apps/viewer/`, `apps/annotate/`, `scripts/` and every `.md` in `docs/`:

* no `prefers-color-scheme` media query;
* no `data-theme` / `.theme-*` attribute or class, and nothing that writes one;
* no second palette, no palette switch, no persisted preference;
* the only mention of "theme" in the whole repo's prose is *themed scrollbars*
  (`HANDOFF_20260909_viewer_error_surface_and_layout`, Jeff: "plain/out of
  style") — a scrollbar matching the one theme, not a theme system.

The four `:root` palettes (`apps/viewer/style.css`, `apps/viewer/topology.css`,
and the literal hexes in `apps/annotate/style.css`) are a single dark set.
`apps/annotate/style.css` gained `color-scheme: dark` on 2026-09-17, which tells
the platform to render native form controls dark — it is a statement that there
is one theme, not the beginning of two.

So the screenshots that handoff committed are of the one theme each app has, and
that is recorded in its lesson rather than quietly presented as a full set.

## Why it is filed as a question, not done

The "both themes" phrasing is almost certainly inherited: this handoff was one
of five staged across the workspace from Jeff's 2026-09-16 note, sharing one
principle list, and other repos' surfaces may well have a light mode. Whether
**tolstack's** should is a real design question with a real cost, and it is not
a typography question:

* the four saturated provenance hues are chosen against a dark ground and are
  the app's subject, not decoration — green/amber/red/magenta at these
  saturations on white do not hold the same relative loudness, and
  `.conf--untraced`'s filled `#fff`-on-red inverts to something that needs a
  different fill entirely;
* the two alternating band tints are *pure white at 1.7% and 5.5% alpha*,
  deliberately hueless so they cannot be read as provenance
  (`apps/viewer/topology.css`, "the two alternating band tints"). On a light
  ground they vanish and their replacement has to be re-argued, including the
  "near the floor of visible" constraint that note records;
* the crops are white-background PNGs inset on a dark page, which is currently
  free contrast and on a light page is none.

None of that is hard, but all of it is *deciding* rather than *styling*, and a
theme is a thing a reader has to be able to choose — which is a control, a
persisted preference and a browser-tier arm, not a stylesheet.

## What would close this

Either a strategy answer that one dark theme is the product (in which case this
closes as `closed`, with the "both themes" phrasing dropped from the shared
principle list for this repo), or a handoff that designs the second palette
against the three constraints above and adds the control.

## Where the pieces are

* `apps/viewer/style.css` — `:root`, the provenance palette and its reasoning
* `apps/viewer/topology.css` — `:root`, the band tints and "Why the rails carry
  no categorical palette"
* `apps/annotate/style.css` — `:root`, `color-scheme: dark`, and this app's own
  functional colours (literal hexes, not the provenance palette)
* `docs/DESIGN_TYPE_AND_COLOUR.md` — "One theme"
