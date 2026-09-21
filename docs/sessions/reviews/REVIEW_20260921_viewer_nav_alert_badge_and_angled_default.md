---
type: review
handoff: docs/sessions/active/HANDOFF_20260921_viewer_nav_alert_badge_and_angled_default.md
reviewer: agent
date: 2026-09-21
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-21 — viewer_nav_alert_badge_and_angled_default

Fast-forward merge of `handoff/viewer_nav_alert_badge_and_angled_default` onto
`integration` (`18860a8..1544a8f`) — no conflict, nothing to resolve.

## What I verified

**Both deliverables are done, and both are pinned.**

1. *One ⚠ per nav row.* `VA.studyNavAlerts` (`topology.js`) is the single
   decision point; `VA.NAV_ALERT_VERDICT_STATES` is the keyed table
   (`none`, `error`) so the vocabulary cannot drift; the words are read out of
   `VA.ATTENTION` and `VA.studyVerdict` and are never restated. The badge moved
   out of `views/stack.js` into `views/dom.js`'s `VA.alertBadge`, so one glyph
   now has one builder behind both surfaces. The `--qualified` tint keeps its
   standing promise that the WORD arrives too, via a guarded `incomplete` push.
2. *Angled default.* `VA.DEFAULT_LEADER_STYLE` replaces the three literals (app
   state init, toolbar fallback preset, toggle fallback); the README's leaders
   section is flipped and carries the dated "jogged is kept and deprioritized"
   note the handoff asked for. `VA.leaderGeometry`'s `options.style` was
   deliberately left as geometry, with a comment saying so — the right call:
   re-pointing it would have moved what a dozen pure-geometry tests measure.

**Tests, run against the live projection** (`--repo C:/workspace/tolstack`, so
the `[real]` tier actually ran rather than reporting itself skipped):

* `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **478/478**.
* `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
  **23/23 browser checks**, every suite green.
* `pytest -q` in the worktree → **1208 passed, 1 failed**, the failure being
  `test_viewer_js_suite.py`'s documented worktree behaviour (the skipped-tier
  guard), not a defect in this work.

**The new guards were observed failing** (universal check: never accept a guard
on the strength of green). Four mutations, each reverted:

| mutation | what fired |
|---|---|
| `VA.DEFAULT_LEADER_STYLE = "jogged"` | fast tier 477/478; browser tier 9 sub-checks red across both `topology` suites |
| restore the `"⚠ "` label prefix in `nav.js` | fast tier: the nav-tree render test |
| re-add the `.tvflag` loop to `studyBadges` | fast tier: the synthetic row test **and** the `[real]` rail pin |
| drop the `stopClick` branch in `VA.alertBadge` | fast tier: the click/disclosure test |

The `[real]` rail pin's rewrite (from *every row has a verdict* to *no row is
silent* + *no row carries more than a verdict and one ⚠*) is the right shape:
the old wording would have forced the `no criterion` chip back, and the new one
is two assertions that pull against each other rather than one a blank rail
could satisfy.

**Measured independently, against `data/projections/viewer/`:** 21 study rows,
all 21 badged; 5 studies fold a verdict *state* into the badge; 16 verdict chips
remain (3 pass, 10 fail, 3 marginal). Pre-fold the same rail carried 21 verdict
chips + 42 attention flags.

## Findings

### should-fix (all three fixed inline — see "Fixed inline" below)

1. **The README's "What a study row wears" → Why paragraph carried a stale
   quoted measurement.** It described the pre-fold rail as "its own **filled**
   all-caps chip — measured on `pitch_system`, 61 filled marks … against 20
   study names". Two of those are wrong for the state this handoff replaced:
   `.tvflag` has been **outlined**, not filled, since `design_pass_typography`
   (2026-09-17) — `topology.css`'s note right above the selectors says "NOT
   FILLED" — and the 61/20 figures are that pass's own measurement of the state
   *before it*. The same paragraph then says "all 21 study rows", contradicting
   its own "20". Live count: 21 rows, 21 verdict chips + 42 outlined flags.
2. **`apps/viewer/topology.css`'s verdict-badge comment went false.** "The
   verdict badge. Filled, uppercase, and **never absent**" — a nav row whose
   study has no criterion or does not sum now carries no verdict chip at all.
   The author updated the `.tvflag` note directly below it and not this one.
3. **The lesson attributes a measurement to an assertion that does not make
   it.** "All 21 live study rows carry a badge. Measured in the browser tier
   (`badged === rows === 21`)." The fact is right (re-measured), but the browser
   tier asserts `rows >= 20 && worst === 1 && flags === 0 && badged >= 1` and
   the fast tier asserts `studies >= 20`; the "21 of 21" only appears
   interpolated into a `push()` label, which prints on **failure** only, so on a
   green run it is never emitted at all. Floors are the right pins here; quoting
   a floor as a measurement is the defect.

### should-fix, out of scope — filed, not fixed

4. **The issue's closing note understates what is left, and the remainder is on
   this very rail.** `ISSUE_20260916_…_jeff_called_loud`'s new section ends
   "Still open, and the whole of what is left: the materials table's source
   column". It is not the whole of it: the nav rail's **loose-stack leaf rows**
   (`views/nav.js`'s `stackItem` over `VA.summaryChips`) still print every
   summary fact as its own chip, and that loop is named in the issue's own
   "Where the pieces are" list and visible in its screenshot excerpt. Measured
   on the live projection:

   ```
   hub_bearing_thermal_fit_m1   4 traced | 2 inferred | 2 UNTRACED | checks GENERATED | 4 sensitivity probes
   hub_bearing_thermal_fit_m2   8 traced | checks GENERATED | 4 sensitivity probes
   ```

   Five chips and three, one of them the **filled** `UNTRACED` — so after this
   fold those two rows are the loudest rows on a rail whose study rows now wear
   a verdict and one outlined ⚠. **This is not a miss against the handoff**:
   deliverable 1 says "the left nav's *study* rows" and the DoD names the
   pitch-link and pitch-system rows, so the tactical agent built exactly what
   was asked. It is a scope-accounting defect in the issue that has to carry the
   remainder. Written up as **"Still open (2)"** in that issue (kept
   `status: open`, `audience: strategy` — `VA.summaryChips` is a counts roll-up,
   not an alert list, so *which* of the five fold is a design call rather than a
   copy of the study-row fix), with a correction blockquote added to the
   lesson's "Not done, deliberately".

### nits

5. `VA.studyNavAlerts`' header comment said "worst first"; the order is
   verdict-state-then-flags in `VA.studyAttention`'s own order, not a severity
   sort. Comment corrected. `tests.js`'s assertion *message* still reads "the
   flags follow, worst first" — left alone; it is a label on a correct
   assertion.
6. `VA.studyVerdict` has a fourth reachable-on-paper state, `"unknown"`
   (`worstVerdict` falsy on a non-empty `checks`). `NAV_ALERT_VERDICT_STATES`
   treats it as a disposition, so it would render as a chip — while
   `topology.css` styles `.tvverdict--unknown` alongside `--none`/`--error`,
   i.e. as "there is no answer here", which suggests it belongs with the folded
   two. Nothing in the live projection produces it and the behaviour is
   unchanged from before this pass, so this is a note rather than a finding; the
   lesson's inventory table presents its state set as complete and omits it.
7. `VA.NAV_ALERT_VERDICT_STATES` is consulted as a set by plain property lookup,
   so a state literally named `constructor`/`toString` would test truthy. Not
   reachable; noted only because that table is the anti-drift device.

## Fixed inline (all within the three prongs — comments and prose, no behavior)

* `apps/viewer/README.md` — the Why paragraph's measurement and its "filled"
  characterisation, replaced with the live count plus a pointer to which side of
  `design_pass_typography` the `topology.css` figures were taken on.
* `apps/viewer/topology.css` — the verdict-badge comment's "never absent".
* `apps/viewer/topology.js` — `VA.studyNavAlerts`' "worst first".
* the lesson — a dated correction blockquote on the browser-tier attribution,
  and one on "Not done, deliberately".
* `docs/issues/ISSUE_20260916_…_jeff_called_loud.md` — "Still open (2)".

Both node tiers re-run green after the fixes (478/478 fast with `[real]`);
pytest unchanged at 1208 passed / 1 documented worktree red.

## Checklist maintenance

Two entries appended to `docs/prompts/REVIEW_AGENT.md`'s **Recurring bugs**:

* *A handoff closes HALF of an open issue and the issue's own closing note then
  declares what is left* — diff that list against the issue's own "Where the
  pieces are" (finding 4).
* *A quoted design measurement whose ADJECTIVE went stale, not its digit* — a
  design note is a dated record of a change, and its numbers describe the side
  of the change they were measured on (finding 1).

## Note for the next reviewer

The `--repo C:/workspace/tolstack` escape hatch works for **both** node tiers;
the browser tier additionally needs `node_modules/playwright-core`, which ESM
cannot reach via `NODE_PATH`. A junction into the worktree works and is
gitignored — the lesson writes up both the spell and the safe way to remove it
(`(Get-Item …).Delete()`, never `Remove-Item -Recurse`, which can traverse into
the main checkout's `node_modules`). This review used it, and removed it before
finishing.
