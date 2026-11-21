---
priority: med
depends_on: [the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack]   # chain order only: every link ahead edits the viewer's views and suites
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — the_viewer_says_nothing_about_itself: no page of the viewer or the 3D pane carries a sentence about what it is or how to use it

Source: Jeff, 2026-11-19 (chat): "Good ui is intuitive enough that it doesn't
require explanations like that … Just looking at the tolstack page I see a
couple more examples of this type of thing:" and he quoted

- `read-only · renders the built projections · computes nothing`
  (`apps/viewer/topology.html:39`)
- `Pick a study to see its chain in the grid and its totals here. A study is
  a HUMAN-lassoed chain: this page reports where the forks are and never
  chooses one.` (`apps/viewer/views/topology.js:2110`)

"would probably find more if I kept looking." The rule is now in the
canonical tactical and review prompts (dispatch, "Prose budget": **a page
never describes itself**): no always-visible sentence says what the page is,
what mode it is in, what it does or does not compute, or how to use it. One
line is a ceiling for copy that has to be there, not an allowance for a
caption.

Link 6 of the chain; the walk after it reads the result. Baseline: tolstack
`master` at `ccfe4926` plus the handoffs ahead in the chain. Scope: every
page and view under `apps/viewer/` and `apps/annotate/` (HTML and the
strings the scripts build), their CSS where a removed line leaves a gap,
the tests that pin a removed string, `apps/viewer/README.md`. Do NOT touch
`tolerance_stack/`, the topology JSON, layout or routing code, or any
behaviour: this is copy and the space it leaves.

## Deliverables

1. **Find them all.** Open every page and every state a user can reach
   (each model, a study picked and not picked, the kinematic page, Side by
   side, the 3D pane armed and idle, each empty state, each popover) and
   list every always-visible sentence or caption that describes the page,
   its mode, what it computes or does not, or how to use it. Search the
   source as well; the screen is the authority.
2. **Decide each one**, in this order of preference: remove it; make the
   control say it (a placeholder in the picker, a label on the button that
   fills an empty state); move it to a hover on the thing it explains. A
   sentence that states a fact about the data (a value, a count, a
   disposition, a real warning) is not in scope and stays. Negations and
   history ("never chooses one", "computes nothing") go without a
   replacement.
3. **Keep what must be said, short.** Where a state truly needs words (an
   empty study panel), the words are the action: a picker reading "Pick a
   study", not a paragraph about what a study is.
4. **Tests follow the copy.** A test that pins a removed string is rewritten
   to assert what the state shows now; none is deleted for its string
   alone. `docs/DAG_TOPOLOGY.md`'s fence ("it is not a solver") is a rule
   for authors and stays in the docs; it does not need to be on the page.

## Definition of done

- The two strings Jeff quoted are gone from the page, and the states they
  sat in still make sense on sight.
- Shots before and after of every state changed, in
  `docs/sessions/lessons/shots/the_viewer_says_nothing_about_itself/`,
  read before the lesson is written.
- Tiers as `CLAUDE.md`'s table.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_the_viewer_says_nothing_about_itself.md`):
  one table: each string found, where, and what became of it (removed, now
  the control's label, now a hover, kept and why). Strings you judged
  borderline are listed as kept, with the reason, so the walk can show
  them to Jeff.
