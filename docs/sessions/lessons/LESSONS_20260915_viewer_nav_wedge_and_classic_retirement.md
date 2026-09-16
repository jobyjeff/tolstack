# LESSONS — viewer_nav_wedge_and_classic_retirement (2026-09-15)

What the next agent on this page cannot get from the diff.

## 1. The handoff's framing of the wedge is one step off, and the step matters

The handoff says the served origin is where this is "hit in real use", citing
`ISSUE_20260909_served_via_drawing_checker_cannot_reach_worksheets.md`. Measured
here: **`storage/http.js`'s `readText` never rejects on a miss.** The
sibling-data-mount candidate has `textDir === null`, so it returns `null`
immediately; the repo-root-static candidate returns `null` on a non-ok response,
and `_fetchQuiet` swallows network errors into `null` as well. A `null` is the
*absence* path — `state.worksheetText = null`, toggle hidden, no error — and it
was never the wedge.

The wedge needs a **rejecting** read, and the transports that produce one are:

- **FSA with a stale or revoked grant.** `_file()` walking a directory handle
  throws (`NotAllowedError` after a revoke, `NotFoundError` on a handle whose
  directory moved), and `getFile()` throws on a file deleted since the grant.
- **A text read that errors mid-stream** (`res.text()` rejecting), or any
  `VA.requireReady` throw — which is why `navigate()` calls `loadWorksheet()`
  from *inside* its `try` rather than taking a promise: a throw before a promise
  exists would unwind out of the click handler and wedge the page through a
  different door.

Why Jeff hit it is consistent with that and I could not reproduce his exact
door: every one of the four converted stacks carries a `worksheet_file`, so a
"classic view" click was always a read, and a single stale handle turns every
subsequent nav click into the same silent non-repaint. **Do not "fix" the http
adapter to reject** on the strength of this handoff's sentence — its `null` is
deliberate and the banner/toggle behaviour depends on it.

The practical shape to remember: **only a row whose subject declares a
`worksheet_file` can fail at all.** Before this session that was 10 of the 28
live nav rows (pitch_system + its 7 studies, the 2 thermal stacks); after §3 it
is 26. The browser suite prints the count it actually exercised, so a future
change that quietly stops reading anything shows up as a small number rather
than as a green run.

## 2. Take 1 is off the rail, and the shape of "off the rail" is the decision

`tan_link_to_pitch_plate` (take 1) was a top-level leaf; it is now absent.
What the handoff asked for was "drop it from the nav (the JSON stays)", and
there were two ways to do that. The one **not** taken: filter it where the nav
renders, or hard-code its id at the `looseStacks` call site. The one taken:

```js
VA.SUPERSEDED_STACKS = { tan_link_to_pitch_plate: "tan_link_to_pitch_plate_take2" };
```

A **map, not a list**, because the value makes the hiding checkable — a row
vanishing from a rail is cheap to write and almost impossible to notice, so the
table states what replaced it and
`test_every_superseded_stack_the_viewer_hides_is_real_and_so_is_its_successor`
checks all four halves of the claim against the documents (the hidden stack is
still committed, it really has no topology, the successor exists as both a stack
and a topology). If someone deletes `stack_tan_link_to_pitch_plate.json`, that
test goes red rather than the nav quietly hiding nothing.

It is also the **only** honest place to express "superseded": nothing in the
schema says it, and I did not add a field. A `superseded_by` in the stack JSON
was considered and rejected — it would be a value in a document that no fold
reads, on an archetype that is about to be re-read by nobody, and the viewer is
the only consumer of the fact.

## 3. Removing a route: enumerate what only that route reached, by FIELD

The handoff's deliverable 2 lists what the nested row uniquely rendered
(verdicts, gaps, excluded terms, zero-width warnings) and says to verify each is
on the DAG page. All four were. **The list was incomplete**, and the missing one
was not in any comment: `views/nav.js`'s own header said the nesting survived on
"an element table, the paths and the **worksheet**", and

- three of the four converted stacks carry an authored `WORKSHEET_*.md`
  (`pitch_link`, `rotor_fastener`, `vpa_output`),
- **none** of their topologies declares one — each builder's `worksheet_for`
  pairs `stack_X.json` with `WORKSHEET_X.md` by name, and a topology is a
  different file name,

so dropping the row would have made three authored documents unreachable from
the page with nothing saying so. Fixed rather than filed (the handoff says
"render it there rather than keeping the chip"): `VA.worksheetSubject` falls
back to the sheet of a stack the topology re-expresses, read in **one** function
in `topology_app.js` so the toggle and the fetch cannot disagree.

The generalisable bit: the element table and the paths, which that same comment
listed, really are on the DAG page — an edge row carries nominal/min/max and a
study *is* a path. The worksheet was different because it is a **file reference
on the projection**, not a rendering. When you retire a route, walk the fields
of the projections the route read, not the sentences about what it showed.

## 4. What `views/stack.js` still owns — it is not dead code

After this session the stack renderer serves:

1. the two thermal-fit stacks (`hub_bearing_thermal_fit_m1`/`_m2`), which have
   no topology by design and are the rail's only leaves;
2. **any `?stack=<id>` deep link**, including to a stack a topology re-expresses
   — `VA.resolveDeepLink` resolves against the projection, not the nav, so all
   seven stacks still render on a direct link. That is deliberate and documented
   in `apps/viewer/README.md`'s deep-link table; it is also why "the nav offers
   no row" is tested as *no row*, never as *no renderer*.

So: do not delete it, and do not assume a stack with no row is unreachable.

## 5. The browser suite's wedge detector, and why it swallows one timeout

`no nav click wedges the page` (suite #15) uses **`navtree__row--on`** as the
detector: that class moves only when `renderNav` runs, and `renderNav` runs only
from a paint, so "the row you clicked never lit up" is exactly "the click
painted nothing". It is a much sharper signal than any content assertion — with
the rejection handler removed, the 10 (now 26) reading rows fail and the other
rows pass, which is precisely the bug's footprint.

The recovery step wraps its `waitForSelector` in `try/catch` **on purpose**. A
wedged page never raises the banner that step waits for, and a timeout thrown
out of a suite function takes the whole suite down as an `ERROR` — which carries
no sub-check name, so `run_mutation_witness_tests.mjs` reports it as a MISS
rather than as the red it is (`scripts/mutation_witnesses.json`'s own "ONE THING
AN ENTRY CANNOT DECLARE"). For the same reason every sub-check name in this
suite is a **literal** string: a name built with `${rows.length}` cannot be
copied into `expect_red`, because the source holds the template and the output
holds the number.

The witness is declared (`nav-click-never-wedges`) and verified:
`node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack --only
nav-click-never-wedges` → WITNESSED.

## 6. Two existing tiers had the retirement baked in and needed real edits

Neither was a test that "just needed updating" — each was asserting the old
design:

- **`app file://` / `app http`** entered stack mode by clicking `demo_joint`,
  the fixture stack the demo mechanism re-expresses, which no longer has a row.
  It enters through `demo_joint_standalone` now — the loose leaf the fixture
  carries for exactly this — and asserts *one* stack row, not two.
- **`topology file://` / `topology http`** asserted "a topology with no
  `worksheet_file` hides the worksheet toggle". With §3's fallback the demo
  mechanism (no sheet of its own, covers `demo_joint`, which has one) now
  *offers* it, so that sub-check inverted into "offers the one its covered stack
  authored, and names it". The fixture happened to reproduce the real repo's
  shape exactly, which is why this was caught by a red suite rather than by
  reading.

## 7. Running the tiers from this worktree

`npm install` in the worktree (one package, `playwright-core`, no browser
download) is the whole setup — the junction trick in
`LESSONS_20260915_viewer_study_verdicts_and_gaps.md` §7 is the heavier route.
Pass `--repo C:\workspace\tolstack` to every tier so the `[real]` halves find
`data/`. **`--repo` needs a forward-slash or quoted path**: bash mangled
`--repo C:\\workspace\\tolstack` into `workspacetolstack` and the node-fs tier
reported itself skipped rather than failing — a skip that looks exactly like
"you are in a worktree".

`node_modules/` and `tmp/mutation-witness/` are gitignored, so `git status` will
not remind you they are there; both were removed before this session finished.

## 8. State of the suite

- `pytest -q`: **891 passed, 1 failed, 1 skipped**. The failure is
  pre-existing and unrelated —
  `test_every_byte_identity_claim_in_a_live_file_names_its_verification` on a
  sentence in `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`,
  filed four times over (e.g.
  `ISSUE_20260915_byte_identity_guard_red_on_the_origin_posture_brief.md`). It
  was red at the start of this session too; "green before, green after" reads as
  "the same one red before and after". The skip is the JS node-fs tier, which
  needs `--repo`.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 379/379.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  20/20 suites.

## 9. Left undone

- **"zero-width band" vs "no tolerance recorded"** — five user-visible strings
  across `views/stack.js`, `views/detail.js`, `viewer.js` and one on the DAG
  page's own hover card. The dependency's lesson deferred this to "if the
  classic view stays, unify" — it stays, and the unification reaches three files
  this handoff did not own. Filed:
  `ISSUE_20260915_the_stack_view_still_says_zero_width_band_where_the_dag_says_no_tolerance_recorded.md`.
- `ISSUE_20260910_classic_stacks_have_no_3d_launch.md` is now narrower than it
  reads: the "classic (loose) stacks" it is about are exactly two (both thermal
  fits), since the other five are either re-expressed as topologies or
  superseded. Its disposition is already a strategy brief; nothing was changed
  there.
