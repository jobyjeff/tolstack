---
type: review
handoff: viewer_v2_single_nav
reviewer: agent
date: 2026-09-08
verdict: REQUEST CHANGES
blockers: 1
---

# Review — viewer_v2_single_nav

Reviewed `handoff/viewer_v2_single_nav` (one commit, `93a0bf2`) against
`docs/sessions/active/HANDOFF_20260908_viewer_v2_single_nav.md`, built on
`topology_schema_v1` (merged into `integration` at `1fc11bc`, the review
branch's starting point). Fast-forward merge into `review/viewer_v2_single_nav`
(no conflict, no carve-out needed).

This is not a tolerance-stack authoring handoff, so the mandatory checks 1–7
(source-ref provenance, sign audits, LMC/MMC, RSS, cotter/castellation,
traced-ratio) are **N/A** — no new element, hardware, or material data was
authored; nothing under `docs/tolerance_stacks/`, `docs/topologies/`, or
`tolerance_stack/` changed in this diff. The applicable checks are the
Universal checks, the Recurring-bugs list, and the Architectural-errors list.

## What I verified

- **Tests, re-run myself, not trusted from the lesson:**
  - `node apps/viewer/run_tests.cjs` (worktree): **158/158** — matches the lesson.
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **197/199**,
    not 198/199 as the lesson states (§7, §9) — see should-fix below. Both
    failures are pre-existing (confirmed by running the identical test tier
    against the pre-handoff commit `1fc11bc` in a throwaway detached worktree:
    same **189/191**, same two named failures).
  - `venv-win/Scripts/python.exe -m pytest -q`: **681 passed, 1 skipped** —
    matches the lesson.
  - `node scripts/run_viewer_browser_tests.mjs` (no `--repo` and `--repo
    C:/workspace/tolstack`): **9/9** both ways — matches the lesson.
- **No `<select id="topology-select">`/`study-select` remain** (grepped the
  full `apps/viewer/` tree) — deliverable 1's retirement is complete.
- **The 10-row floor is genuinely retired**, not relabelled: `topology.css`'s
  `.tv__scroll` rule has no `min-height` any more, only a comment explaining
  why it was removed. `testHeightBudget`'s own numbers (260px pane before,
  554px after, against a 450px/half-viewport threshold, per the lesson's §1
  table) straddle the assertion with real margin on both sides — I did not
  re-break the layout myself to watch it fail, but the measured before/after
  numbers are direct evidence the assertion is not vacuous.
- **No data pollution**: worktree `git status` clean after every test run;
  the main checkout's only untracked item is an unrelated staged handoff file
  from a different session, not anything my runs produced.
- **No second combiner in JS**: grepped the diff for arithmetic operators on
  projection fields; none — this handoff is display/layout only.
- **The covered-stack-checks limitation is correctly disclosed**: `views/nav.js`'s
  header comment and `apps/viewer/README.md` (~line 121) both correctly state
  that a topology-covered stack's own authored `checks` (worst case vs.
  criterion) has no field in the topology projection, so the stack stays
  reachable in its own classic view rather than being dropped. Good, and
  consistent with `LESSONS_20260904_viewer_consolidation.md` §1's rule.

## Blocker

### Deliverable 4 is not implemented for topology-mode nodes, and the shipped README asserts the pre-`topology_schema_v1` state as if it were still true

The handoff's deliverable 4 requires: *"Render the v1 fields: authored study
checks (verdict vs criterion), the joint/context block, the worksheet
reference, wherever the selected node carries them."* None of the three
render anywhere in topology mode, and the gap is not named anywhere (lesson,
code comment, or issue) the way the covered-stack limitation above correctly
is.

- **The data exists.** `scripts/build_topology_projection.py`'s
  `project_topology()` (added by `topology_schema_v1`, same-day) emits a
  `joint` block and a `worksheet_file` for every topology. Checked the real
  projection directly: 4 of 5 topologies carry a non-empty `joint`
  (assembly drawing/sheet/view/zone/description/scope), and `pitch_system`
  carries `worksheet_file: docs/tolerance_stacks/WORKSHEET_end_stop_graft.md`.
  Three of `pitch_system`'s own study JSON files
  (`study_pitch_system_end_stop_minus7.json`,
  `..._end_stop_plus72.json`, `..._gas_spring_mechanical_stroke.json`) carry
  an authored `checks` block, and `check_study()` (added by
  `topology_schema_v1`) computes it correctly per that handoff's own acid
  test.
- **None of it is rendered.** Grepped the full diff and the current
  `apps/viewer/` tree for `joint`, `assembly_drawing`, `worksheet_file`, and
  `checks` in a topology/study context: `views/topology.js` has no
  joint-block renderer (the existing `jointBlock()` in `views/stack.js` is
  stack-mode only), and the worksheet toggle is explicitly hidden in topology
  mode (`topology_app.js`, "worksheet is a stack-mode concept"). `study.checks`
  is never read anywhere in `apps/viewer/` — consistent with the fact that
  `project_study()` never emits a `checks` key at all (a pre-existing,
  already-tracked gap, see should-fix below), but that only excuses the
  *checks* third of deliverable 4, not the joint/worksheet two-thirds, whose
  data is already sitting in the projection unconsumed.
- **The shipped README now states something false.** `apps/viewer/README.md`
  line 525–526 (this handoff's own diff touched this section — the worksheet
  moved into a `<dialog>` here): *"the **Show worksheet** button in the
  topbar (stack mode only — **a topology has no worksheet of its own**)."*
  That sentence was true before `topology_schema_v1`; it is not true today —
  `topology.worksheet_file` exists precisely so a topology can name one, and
  `pitch_system` does. This isn't a silent gap, it's a doc asserting the
  superseded state while sitting in a diff that edited the very paragraph.
- **This is squarely in scope and not blocked by the "don't touch the
  projection builders" restriction** for the joint/worksheet two-thirds —
  the data is already produced; only the render side (`apps/viewer/`, this
  handoff's own scope) is missing. The `checks` third genuinely is blocked
  by a projection gap (`scripts/build_topology_projection.py`'s
  `project_study()` has no `checks` key — already tracked in
  `ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`, filed
  from the `topology_schema_v1` review, which explicitly names this handoff
  as the likely next consumer), but the handoff's own Definition of Done
  requires *"any capability that could not move (named, not silent...)"* and
  this one wasn't named anywhere — no lesson section, no code comment
  analogous to the covered-stack one, no cross-reference to the open issue.

**Suggested fix**, smallest first: render `topoProj.joint` (the existing
`jointBlock()` shape from `views/stack.js` generalizes directly — same field
shape) somewhere in the topology detail pane; enable the worksheet toggle in
topology mode when `topoProj.worksheet_file` is set, reusing
`VA.renderWorksheet`; fix the now-false README sentence either way. For the
`checks` third: either name it as an explicitly undone capability (lesson +
a nav.js/topology.js comment mirroring the covered-stack one, cross-referencing
the open issue) or wire it once the projection gap is closed — either is
acceptable, silence is not.

This needs a new test to be trustworthy (does the joint block render with
the right fields for a topology that has one; does it stay silent for
`pitch_system`, whose own `joint` is `{}`; does the worksheet toggle show up
exactly when `worksheet_file` is set) and is not "a few lines," so it fails
prongs 2 and 3 of the inline-fix boundary — sending back rather than fixing
in review.

## Should-fix

### The lesson's own test count is wrong, and the failure it drops is the same one above in miniature

`LESSONS_20260908_viewer_v2_single_nav.md` §9 states `node
apps/viewer/run_tests.cjs --repo` is "198/199 (the one pre-existing failure,
see §7)". Actual, re-run twice (worktree and, for comparison, at the
pre-handoff commit): **197/199**, two failures. §7 correctly names and
attributes the branch-count race. The second failure —
`[real] the topology fixture's shapes still match the builder's` — is not
mentioned anywhere in the lesson, and its own message is direct
corroboration of the blocker above: *"the projection writes [joint,
worksheet_file, worksheet_source] and apps/viewer/topology_fixtures.js does
not — REGENERATE it (its header says how)"* plus the same for
`studies[].configuration`. This is pre-existing (identical at `1fc11bc`, so
not a regression from this handoff), and `topology_fixtures.js` is squarely
`apps/viewer/`'s own test fixture, in scope, with a documented one-command
regeneration recipe that was not run. Recount and either fix the fixture or
name both failures accurately in the lesson.

## Overlay updated

Added a new entry to `docs/prompts/REVIEW_AGENT.md`'s "Architectural errors
to check" — the mirror image of the existing "a schema field added
specifically to make something renderable... the projection never calls the
function" entry from today's `topology_schema_v1` review: this time the
projection *does* emit the field, and the consumer that was supposed to
render it doesn't, while a doc keeps asserting the pre-existing absence.

## Verdict

**REQUEST CHANGES.** Not merging into `integration`. Worktrees and branches
left in place for rework.
