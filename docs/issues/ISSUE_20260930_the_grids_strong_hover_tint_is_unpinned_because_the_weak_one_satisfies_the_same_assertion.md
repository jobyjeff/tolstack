---
type: bug
priority: med
status: open
area: tiers/browser
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_nav_tooltip_once_and_rail_hover_emphasis.md
---

# The grid's STRONG hover tint is unpinned, because the weak one the same hover applies satisfies the same assertion

`nav_tooltip_once_and_rail_hover_emphasis` (2026-09-30) ships the grid half of
the shared hover state as two levels, `topology.css`:

```
.tvrow--hot  > .tvcell { background-color: var(--tv-hot); }   /* the rest of the leg, .055 */
.tvrow--lead > .tvcell { background-color: var(--tv-lead); }  /* the row under the pointer, .125 */
```

`--lead` is the deliverable — "the hovered element's own edge pair gets the
strong state", the thing that makes the hovered row distinguishable from the
four others on its leg. It is pinned by nothing.

## Measured

Delete **only** the `.tvrow--lead > .tvcell` declaration, on the merged review
tree against a freshly built projection:

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo <scratch>` | **522/522 passed** |
| `node scripts/run_viewer_browser_tests.mjs --only topology` | **4/4 suites**, `[topology]` 228/228 both modes |

## Why the assertion written for it cannot see it

The browser block reads a real computed style, which is right, and compares it
against the row's own rest tint:

```js
r.fromRow.rowTint === r.rest.rowTint   // → the row is in `wrong`
```

But a hovered row is a member of its **own** leg, so `setHot` gives it
`tvrow--hot tvrow--lead`. With `--lead` gone the row still takes
`rgba(255,255,255,0.055)` from `--hot`, which still differs from the rest tint,
and the check passes. `fromBar` is compared to `fromRow` rather than to a level,
so the one-hover-model check cannot see it either.

This is the "never mutate a group of fields together when the claim is made of
each one" shape (`ISSUE_20260915_leader_style_persistence_across_topology_switch_is_unpinned.md`)
and the "two true checks either side of an untested middle" shape
(`ISSUE_20260916_…hover_deslop…`) in one place: *nothing is lit* and *something
is lit* are both checked; *which of the two levels is lit* is not. The lesson's
§5 ("settled at .055 / .125, where the four rows of a hovered leg are legible as
a group") is a claim about the pair, and only one of the pair bites.

## The assertion that would

Read the hovered row's tint against a **sibling row on the same leg**, not
against its own rest state — they are the two levels, side by side, in the same
hover:

```js
// `--lead` must be strictly louder than the `--hot` rows beside it
const legRow = r.fromRow.hotRows.find((id) => id !== r.id);
push("[real] the hovered row is tinted ABOVE the rest of its leg", …);
```

Alpha is the comparison (`rgba(255,255,255,a)` out of `getComputedStyle`), and
the non-vacuity witness comes free: a leg with no second row means there is
nothing to be louder than, which is worth pushing as its own sub-check.

The same question applies to the DAG side, where it is answered: a hot rail's
stroke and width are compared against a *cold* rail's in the browser block and
that spec is `WITNESSED`. The grid side needs the same comparison against a
neighbour rather than against itself.

Not fixed in review: it needs a new assertion to be trustworthy, which is the
author's side of the inline-fix boundary.
