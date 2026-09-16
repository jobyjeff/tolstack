---
type: chore
priority: low
status: triaged
area: viewer/copy
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_nav_wedge_and_classic_retirement.md
handoff: docs/sessions/HANDOFF_20260916_reader_facing_copy_and_vocabulary.md
---

# The stack view still says "zero-width band" where the DAG page says "no tolerance recorded"

One viewer, two words for one fact. The DAG page says **"no tolerance
recorded"** (`VA.ATTENTION.no_tolerance`, `VA.GAP_KINDS.no_tolerance_recorded`
— Jeff's standing rule: everyday words, no schema jargon). The stack view, the
right-hand sourcing pane and the summary chips still say **"zero-width
band"**:

- `apps/viewer/views/stack.js:251` — the element row's chip
- `apps/viewer/views/stack.js:195-196` — the min/max cells' `title`
  ("zero-width band: min == max, no document gives a tolerance")
- `apps/viewer/views/detail.js:42` — the same chip in the detail pane
- `apps/viewer/viewer.js:270-271` — `VA.summaryChips`' header chip
  ("N zero-width band(s)")
- `apps/viewer/views/topology.js:1500` — and one on the **DAG** page's own
  hover card, which is the one that makes this a straight inconsistency rather
  than a two-surface split

A reader who meets both in one session has to work out that they are the same
thing. "Zero-width band" is also the schema's word for it, not a reader's.

## Why it was not fixed in the handoff that found it

`LESSONS_20260915_viewer_study_verdicts_and_gaps.md` §4 deliberately left the
split, on the grounds that the stack view was scoped to
`viewer_nav_wedge_and_classic_retirement`, which "may retire it outright" —
with the instruction: *if the classic view stays, unify on the DAG page's
words.* It stays: the two thermal-fit stacks have no topology by design and
render as stack pages.

That handoff's own copy deliverable was narrower (the word "classic", which is
gone). The unification touches `views/detail.js`, `viewer.js` and
`views/topology.js`, none of which it owned, plus the `chip--zero-width` /
`num--zero-width` / `el-row--zero-width` CSS class names (which can stay —
they are not read by anyone) and the fast-tier tests that assert the current
strings.

## What "done" looks like

Every user-visible string reads "no tolerance recorded" (or a sentence built
from it), sourced from one place rather than five — the same module-level
constant shape `VA.ATTENTION` already has, which is also what stops this
drifting again (`CLAUDE.md`: a field vocabulary is a module-level constant,
never an inline literal). The class names and the projection field
(`zero_width_count`) are not user-visible and need not move.
