---
priority: high
depends_on: [topology_schema_v1]
---

# HANDOFF 2026-09-08 — viewer_v2_single_nav: one nav, the DAG owns the page

Source: Jeff's 2026-09-08 review of the consolidated viewer ("complete mess";
two selection mechanisms, panels too small to review in, cryptic banner) +
the locked redesign brief
(`dispatch/docs/strategy/HANDOFF_20260908_tolstack_viewer_redesign_strategy.md`).
Baseline: trunk + `topology_schema_v1` merged (the projection then carries
authored study checks, joint blocks, worksheet refs — this page renders
them). `linear_stack_conversions` runs in parallel: do NOT assume every stack
has a topology; classic-only stacks must render as first-class leaves.
Scope: `apps/viewer/` and its tests (`run_tests.cjs`,
`scripts/run_viewer_browser_tests.mjs`). Do NOT touch `apps/annotate/`
(deep-linking is a follow-on handoff), `tolerance_stack/`, the projection
builders, `docs/topologies/`.

## The measured problem (2026-09-08 state)

At a 900px window with a study selected: topbar ~47px, provenance banner
~230-290px when alarmed, picker ~35px, legend ~33px, totals reserves up to
260px — the DAG pane gets the residual, floored at 10 rows of 26px
(`LESSONS_20260904_dag_viewer_vertical_budget.md`'s deliberate contract,
asserted by `run_viewer_browser_tests.mjs` `MIN_ROWS = 10`). `pitch_system`
projects 45 rows: Jeff sees under a quarter of it, inside 5 nested scroll
panels (7 in stack mode). Two selectors coexist: `#picker`'s TOPOLOGY/STUDY
dropdowns (`views/topology.js` `renderTopoPicker`, with the placeholder-option
hack) drive `topologies.json`; `#stacklist` (`views/list.js`) lists
`results.json`. Nothing hides either in either mode.

## Deliverables

1. **One nav.** A single left-rail tree: each topology → its studies as
   children; classic-only stacks (thermal archetype always; others until
   converted) as leaves of the same tree. Selecting any node drives the main
   surface. The TOPOLOGY/STUDY dropdowns, `state.mode`'s display-toggling of
   four sections, and the `<select>` placeholder hack all retire. The
   "also a topology" covered-stack chip concept survives in whatever form
   fits the tree (a stack covered by a topology must never become
   unreachable — re-read `LESSONS_20260904_viewer_consolidation.md` §1
   before filtering anything).
2. **The DAG owns the main area.** Totals demote to a slim always-visible
   footer strip (folded numbers, no 260px panel); the "How to read the
   rails" legend becomes a help affordance (popover/dialog), not layout;
   the worksheet stays reachable (drawer or section) without shrinking the
   DAG to near-zero (the current expand-worksheet behavior). Retire the
   10-row floor and replace the browser-tier vertical-budget contract with
   assertions about the new layout (suggested: at 900px viewport with the
   real `pitch_system`, the DAG pane's height is the majority of the
   viewport; alignmentDrift-style row checks stay).
3. **Banner → one-line badge.** Provenance alarms (`viewer.js`
   `provenanceAlarms` — keep the detection logic) render as one plain-words
   line with an expand affordance for detail. House UI-copy rules bind
   (memory + repo convention): no paragraphs, no internal file/module names,
   no shell commands in user copy. "This projection may not be what you
   think it is" and the `<code>` rebuild commands go; something like
   "Data is older than the latest code — needs a rebuild" with details on
   expand is the register. (An actuator script + merge-time rebuild land
   separately; this page only *says* it plainly.)
4. **Render the v1 fields**: authored study checks (verdict vs criterion —
   the classic checks table treatment), the joint/context block, the
   worksheet reference, wherever the selected node carries them.
5. **Keep**: classic scripts / `file://` runnability (the one reason this
   app avoids ES modules), the row-density control, provenance colouring,
   crop popover + thumbnails, right-hand detail pane, the reused
   `views/*.js` modules where they still fit.

## Definition of done

- `node apps/viewer/run_tests.cjs [--repo]`, pytest suite, and
  `node scripts/run_viewer_browser_tests.mjs [--repo]` all green — with the
  vertical-budget contract replaced, not deleted (layout assertions must
  still exist and bite).
- Against the real repo (`--repo C:\workspace\tolstack`): pitch_system
  selected shows the majority of its rows at 900px; a thermal stack leaf
  renders its Materials table; the vpa stack and its topology are both
  reachable; the worksheet opens without crushing the DAG.
- No `<select id="topology-select">`/`study-select` remain; one nav element
  drives everything.
- Screenshot(s) in the lesson (or noted paths) showing the before/after
  vertical budget.
- Lesson (`docs/sessions/lessons/LESSONS_20260908_viewer_v2_single_nav.md`):
  the new layout contract in numbers, what the nav tree does with
  covered/loose/classic stacks, and any capability that could not move
  (named, not silent — same escape valve as the consolidation handoff).
