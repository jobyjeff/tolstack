# LESSONS 2026-09-15 — guard_mutation_witness_tier

Handoff: `docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md`.
Branch `handoff/guard_mutation_witness_tier`, cut from `integration`.

## 1. The mechanism, and why this one

The handoff asked for a prototype and a report rather than a settled design, so:

**`scripts/mutation_witnesses.json`** — a flat table, one entry per guard, each
carrying `{file, find, replace, tier, suite, expect_red}` plus a `contract`, a
`note` and the `issue` it came from. **`scripts/run_mutation_witness_tests.mjs`**
copies `apps/` and `scripts/` to a shadow tree, patches the copy, runs the tier
the entry names, and requires the **named** check to go red.

Four decisions inside that, all of which cost something to reach:

- **Shadow tree, not in-place patching.** In-place is faster and is what my first
  probes did, but a Ctrl-C mid-run leaves a deliberately-broken app in the working
  tree, and this tier's whole job is to be run casually. Copying `apps/` +
  `scripts/` is 2.6 MB and takes well under a second on Windows — the cost the
  handoff worried about never materialised.
- **The shadow has to live INSIDE the repo** (`tmp/mutation-witness/`, already
  gitignored). Not aesthetics: node resolves `playwright-core` by walking up from
  the running script's own directory, so a shadow under the system temp dir finds
  no `node_modules` at all and the browser tier will not start. This is the same
  fact `LESSONS_20260904_dag_viewer_vertical_budget.md` records from the other
  direction (the browser tier needs the *worktree's own* `npm install`).
- **`--only <substring>` on the browser runner**, new here. Eighteen suites per
  mutation would have made the tier ~25 minutes; one suite per mutation makes it
  ~7. A filtered run prints `THIS IS NOT A FULL RUN` above its first suite and
  repeats the filter on the summary line, because a partial pass that reads like a
  full one is precisely the defect this session exists to reduce.
- **A clean baseline run per distinct `(tier, suite)`, required green, before any
  mutation in that group.** Without it a broken tree lets every mutation "witness"
  trivially. It is also the answer to the handoff's "passes with no mutations
  applied": the tier runs each owning suite unmutated as part of its own job.

### The cheap half runs in pytest

`tests/test_mutation_witnesses.py` (6 tests, no browser, 0.03 s) requires every
declared `find` to resolve to **exactly one** place in the file it names, plus
shape/uniqueness/no-op/issue-exists checks. This is the part I would keep if I
could keep only one thing. An anchor that rots is not a failing guard — it is a
guard that quietly stopped being checked, i.e. this tier's own failure mode one
level up — and a rename in `topology_app.js` can rot four anchors at once. A
second-long red beats a browser sweep somebody makes time for in three weeks.

### The limitation an entry cannot express

**A mutation that breaks the page itself, rather than one behaviour, aborts its
whole suite as an `ERROR` and carries no check name.** Measured: removing the
popover's room cap (`if (height > room)` → `if (false)`) makes the card overrun
and swallow its own trigger, so the next `locator.hover()` times out and
`[topology file://]` reports `ERROR` instead of a failed sub-check. That red is
real and louder than an assertion — but the runner can only attribute a *named*
failure, so it would report it as a miss. The runner now says so explicitly when
it sees a red with no names, and the table's `about` block says it too. If you
hit it: narrow the mutation until it fails an assertion.

### Where it hangs off

`npm run test:mutations`, documented in `apps/viewer/README.md` ("The
mutation-witness tier") beside the other two. It is **not** in `pytest -q` — a
~7-minute browser sweep does not belong in the run everyone makes before every
commit — but its anchor check is, which is the split described above.

## 2. The five failure outputs

All five reddened. Captured with
`node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack --verbose --only <id>`:

```
--- card-layout-out-of-flow
  apps/viewer/style.css: `position: fixed` -> `position: absolute`
    | [topology file://] 166/167 sub-checks passed: FAIL
    |     FAIL sub-check: an open card is placed in the WINDOW's frame, not the
    |                     document's — it still sits against its trigger with the
    |                     page scrolled

--- unpublished-banner-and-nothing-else
  apps/viewer/topology_app.js: `if (transportKind !== VA.TRANSPORT.UNPUBLISHED) {` -> `if (true) {`
    | [hosted origin with nothing published] 6/7 sub-checks passed: FAIL
    |     FAIL sub-check: the bar carries that one sentence and nothing else — no
    |                     second element offering advice that is untrue of a
    |                     hosted visitor

--- refusing-study-stays-on-the-walk
  apps/viewer/topology_app.js: `chainable(studyId) ? "chain" : "topology"` -> `"chain"`
    | [topology file://] 166/167 sub-checks passed: FAIL
    |     FAIL sub-check: a refusing study drops back onto the whole-topology walk
    |                     rather than claiming a chain it has not got

--- density-toggle-really-takes
  apps/viewer/topology_app.js: the density toggle's flip -> `state.rowDensity = "comfortable";`
    | [topology height budget] 20/21 sub-checks passed: FAIL
    |     FAIL sub-check: the density toggle really took — the rows are at
    |                     ROW_DENSITIES' compact pitch, and were at its
    |                     comfortable one before the click

--- leader-style-survives-a-topology-switch
  apps/viewer/topology_app.js: `state.leaderStyle = "jogged";` added to selectTopology()
    | [topology file://] 166/167 sub-checks passed: FAIL
    |     FAIL sub-check: [real] switching topology keeps the leader STYLE too
```

## 3. What each repair actually needed (the parts not in the diff)

- **`card_layout`.** The issue is right that the app is not at fault, and the old
  witness cannot be restored where it stood: under the room cap the card is always
  wholly inside the window, the document is never shorter than the window, and at
  `scrollY === 0` document and viewport coordinates coincide. So the repair is a
  **third viewport**, `CARD_SCROLL_VIEWPORT` (1600×560), where the document really
  scrolls (~140 px) — `position()` writes viewport coordinates into `style.top`,
  and under `absolute` that number is read against the document, so the card
  renders `scrollY` px away from its trigger. Shipped: 8 px off the trigger.
  Mutated: 148 px.
  - **I kept the three old sub-checks** rather than retiring them, against the
    issue's "retire them and say why" option. They no longer distinguish `fixed`
    from `absolute`, but a popover returned to normal **flow** would still lengthen
    the document, which is the other half of the same defect and is what they read.
  - **Dead ends worth not repeating.** (a) Shrinking to 1600×500 puts the sticky
    `aside.detail` (508 px tall) over the grid, and `elementFromPoint` on the crop
    trigger returns the aside — the page is not designed for that height. 560 is
    the last height that still lays out. (b) Narrowing the window (1200 or 1000
    wide) does give a taller document, by wrapping — but it pushes the thumbnail
    column off-screen horizontally, and it breaks the file's own "same width in all
    viewports, so nothing reflows horizontally" rule.
- **`a_refusing_study`.** Browser tier, not a change to what the fast tier loads:
  the mutation is in `topology_app.js`'s `onNavStudy`, and loading that file into
  `run_tests.cjs`'s vm sandbox means booting the app shell against the DOM shim —
  a much larger change than the guard is worth, and one that would put the shell's
  boot path under a shim it was never written for. **The non-obvious half is the
  approach, not the tier:** the check has to arrive at the refusing study *from
  chain mode*. The suite's existing refusal click is reached from the walk, where
  the false branch and no branch at all are the same state — which is exactly why
  the mutation was invisible. It is placed in the mock block (not `[real]`), so it
  runs without `--repo`.
- **`compact_density`.** The positive anchor is the row pitch, read against
  `VA.ROW_DENSITIES`' own two numbers rather than against `16` and `26` written
  into the test. The `waitForTimeout(50)` is gone because the pitch change *is* the
  effect to wait for — but the wait is `.catch(() => {})`'d on purpose: a toggle
  that never takes must fail as this block's **named** sub-check, not as a
  suite-level `ERROR`, or the mutation tier cannot attribute it (see §1).
- **`leader_style` — and three more like it.** The fix is the issue's own: switch
  topology while the style is *off* its default. The issue's closing question —
  do `edgeValueOnly` and `edgeLengthMode` have the same hole? — **they do, and so
  does `rowDensity`.** Measured: adding any of `state.rowDensity = "comfortable";`,
  `state.edgeLengthMode = "uniform";` or `state.edgeValueOnly = false;` to
  `selectTopology()` reddened **nothing** in any tier. Same cause (the suite only
  ever switched topology with the toolbar at its defaults), same one-line fix, so I
  covered all three in one sub-check and entered all three as separate mutations
  rather than leaving a measured hole with no owner. This is the one place I went
  past the handoff's list of five, and it is the same contract the fifth is about.

## 4. Guards I spot-checked and found SOUND

The part the next agent cannot derive from the diff. Each was mutated by hand and
the owning tier observed going red:

| mutation | result |
| --- | --- |
| `VA.chooseTransport`'s `if (opts.protocol !== FILE_PROTOCOL)` → `if (false)` | **red**, 2 fast-tier tests (290/292). Now table entry `hosted-page-never-falls-back-to-the-picker` |
| `views/banner.js`'s `if (state.transport === VA.TRANSPORT.UNPUBLISHED)` → `if (false)` | **red**, 1 fast-tier test (291/292). Now table entry `unpublished-banner-renders-at-all` |
| `position()`'s `var goAbove = height > roomBelow && roomAbove > roomBelow;` → `false` | **red**, both card-placement tripwires (grid-side and DAG-side). The tripwires work |
| `renderTopoToolbar`'s `toggle.disabled = !(state.studyId && studyOk(...))` → `false` | **red**, `chain mode is unavailable for a study that does not sum` |
| `position()`'s room cap, `if (height > room)` → `if (false)` | **red, but as a suite `ERROR`** — the uncapped card swallows its own trigger and the next hover times out. Genuinely witnessed; not declarable as an entry (§1) |
| `selectTopology()` resetting `rowDensity` / `edgeLengthMode` / `edgeValueOnly` | **GREEN — a real hole.** Fixed and entered; see §3 |

Two fast-tier ones are in the table deliberately: they were already sound, and
without them the table would have no fast-tier worked example for the next author
to copy.

## 5. Gotchas

- **`find` anchors are matched against LF-normalised source, and must be.** This
  repo is checked out with git's CRLF translation on: `apps/viewer/topology_app.js`
  is CRLF on disk. A multi-line anchor authored with `\n` matches nothing, and the
  anchor check reports it as rotted — correctly and uselessly. Both the runner and
  the pytest guard normalise `\r\n` → `\n`. (Found the hard way: the first full run
  was 6/7, and the miss was line endings, not the guard.) The shadow file is
  restored **byte for byte** afterwards, endings included, because the next entry
  reuses it.
- **`--only "topology file://"` matches two suites**, because `testRespine` prints
  `topology file:// respine`. Harmless — the runner requires the *named* check to
  fail, not the suite — but it doubles that group's cost.
- **`npm install` in the worktree before anything browser-shaped.** `node_modules/`
  is gitignored and per-worktree; it is not a main-checkout-only directory like
  `data/`. `npm install --no-audit --no-fund` took 675 ms.
- **The Bash tool's heredocs collapse `\\n` to `\n`.** A Python patch script
  written through `cat > f <<'PY'` came out with the wrong string literals and the
  replacement silently found nothing. Use the Edit/Write tools for anything whose
  content contains backslashes.

## 6. Counts

| tier | before | after |
| --- | --- | --- |
| `node apps/viewer/run_tests.cjs` | 292/292 | 292/292 |
| `... --repo C:\workspace\tolstack` | 353/353 | 353/353 |
| `node scripts/run_viewer_browser_tests.mjs --repo ...` | 18/18 suites, 165 + 20 + 6 sub-checks in the three touched | 18/18 suites, **167 + 21 + 7** |
| `venv-win/Scripts/python.exe -m pytest -q` | 869 passed / 1 skipped | **875 passed / 1 skipped** |
| `node scripts/run_mutation_witness_tests.mjs --repo ...` | — | **10/10 declared mutations witnessed** |

No projection was rebuilt; `data/projections/viewer/` was read at
`C:\workspace\tolstack\data\projections\viewer\` by absolute path throughout.

## 7. Left for someone else

- `docs/issues/ISSUE_20260915_state_error_on_an_unpublished_banner_is_dead_code.md`
  — the design question the unpublished-banner issue raised and this handoff was
  told not to answer (it would be an app-behaviour change).
