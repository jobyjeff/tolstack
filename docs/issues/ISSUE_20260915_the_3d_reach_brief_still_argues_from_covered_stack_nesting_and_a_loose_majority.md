---
type: chore
priority: med
status: triaged
area: docs/strategy
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260915_viewer_nav_wedge_and_classic_retirement.md
strategy: docs/strategy/BRIEF_20260911_viewer_3d_and_card_content_reach.md
---

# The 3D-reach brief's decision rests on two facts `viewer_nav_wedge_and_classic_retirement` just retired

`docs/strategy/BRIEF_20260911_viewer_3d_and_card_content_reach.md` §1 and the
issue it consolidates
(`docs/issues/ISSUE_20260910_classic_stacks_have_no_3d_launch.md`,
`status: triaged`) ask a strategy agent to choose between two options, and
state the grounds as:

> …whether the annotator grows a stack-mode nav axis or classic stacks reach 3D
> only via topology re-expression **(covered-stack nesting)**. **Most real
> stacks are loose today**, so this decides how much of the corpus the 3D
> surface can ever reach.

Both bolded facts changed on 2026-09-15 (`viewer_nav_wedge_and_classic_
retirement`), and neither document moved with them:

- **"covered-stack nesting" no longer exists.** The nested per-topology stack
  row — the mechanism named as the whole content of option 2 — was removed.
  A covered stack is now reachable only by a `?stack=<id>` deep link.
- **Loose stacks are no longer the majority.** Measured off
  `data/projections/viewer/*` on the merged tree: 7 committed stacks, of which
  **4** are re-expressed as topologies, **1** (`tan_link_to_pitch_plate`, take
  1) is superseded and off the rail, and **2** (`hub_bearing_thermal_fit_m1`,
  `_m2`) are loose. So 2 of 7, not "most" — and the two that remain are the
  thermal-fit archetype, which has no topology *by design* rather than for want
  of authoring.

That inverts the sizing argument the brief hands the decider: option 2
("reach 3D only via topology re-expression") now covers 5 of 7 stacks instead
of a minority, and option 1 (a stack-mode nav axis in the annotator) buys 3D
for the two thermal fits and nothing else. Whichever way the call goes, it
should be made on the current corpus.

Filed rather than edited: both documents are another track's artifacts, and the
correction changes what a decision is being made about, not a typo. The
handoff's own lesson §9 flagged the issue as "narrower than it reads" and left
it; it did not notice the brief carries the same two sentences.

## What "done" looks like

A dated correction note in both documents (the repo's insert-shape for a
superseded claim), giving the 2-of-7 count and saying the nesting is gone — or
the strategy pass simply lands and supersedes them both. Nothing in code.
