# Lessons — a_contributor_may_be_a_study (2026-10-26)

The travel between the end stops now enters the blade-pitch study as four terms,
by the chain rule. What follows is what the next agent could not read off the diff.

## The numbers (run P2, `vpa-pitch-p2-20261016-235852`)

| | −7° stop (point 0) | +72° stop (point 79) |
|---|---|---|
| motion ratio J = d(blade pitch)/d(actuator.value) | −1.728 deg/mm | −1.249 deg/mm |
| worst case half, before | ±0.290 | ±0.315 |
| worst case half, after | ±1.707 | ±1.339 |
| RSS half, before | ±0.169 | ±0.169 |
| RSS half, after | ±0.985 | ±0.721 |
| S461-607 margin, before → after | +0.210 → −1.207 | +0.185 → −0.839 |

**The handoff's "today" figures (±0.244 / ±0.242 worst, ±0.165 / ±0.159 RSS) did
not match this tree**: the pinned `REAL` table in `tests/test_kinematic.py` and the
live projection both said ±0.290 / ±0.315 and ±0.169 / ±0.169 before the change, and
the margins +0.210 / +0.185 agree with those, so I took the tree's figures. Neither
of the other premises held either:

- The travel study's worst case is **±0.82 mm**, not ±0.170 (the 2026-10-22
  re-banding put two of its four terms on general-profile-note bands, ±0.75 of it).
- **None of its four terms is `untraced` any more** — all four read `traced` — so
  the derived completeness is "complete" and the "probably stays incomplete"
  guess was wrong in its reason. Both checks stay `complete: false` on their own
  authored exclusions (bushing tipping, temperature, geometric callouts…), not on
  the travel terms. What *is* new is the mechanism: a check's `complete` is now
  `authored and no open sub-study term`, and an open term appends a derived
  `excluded_terms` line, so an untraced term in the sub-study cannot be papered over
  by an authored `complete: true` (pinned by a fixture whose `link_back` is
  `untraced`).

The result is honest and large: both verdicts are `marginal` (budget scope). The
cause and the options are filed
(`ISSUE_20261027_the_travel_term_dominates_the_blade_pitch_budget_and_both_stops_read_marginal.md`,
`audience: strategy`) — it is a reading of S461-607 (a blade-to-blade limit), not a
defect in the arithmetic.

## Decisions the handoff did not make

- **`study_refs` is a list beside `contributors`, not a kind inside it.** The JSON
  authors a `study_ref` in `contributors[]` (as the handoff says) but the loader
  splits it out: every consumer that walks `study.contributors` (the edge-keyed
  table, `contributor_count`, the gap list, the fixture tests) is unchanged, and the
  page says each *direct* contributor once. The projection adds `study_refs[]`,
  `stops[].groups[]` and `study_ref_count`.
- **`Dimension.about_nominal()` lives in `topology.py`, not `kinematic.py`.** A
  sub-study's edges carry their own quantity's nominals (a 64.44 mm travel); this
  fold is variation-only, so each leaf is the same band read about zero, citation
  unchanged. `kinematic.py` is held by the combining walker to *no* element-value
  arithmetic, and re-centring is exactly that — so it sits beside `mid` and
  `half_range`, and `fold()` is untouched.
- **A group's `reach` (sum of its leaves' magnitudes) is a ranking figure only.**
  It is the page's sort key, never a fold input.
- **Worst case cannot tell the chain rule from "fold the sub-study, then scale"**
  (the chain is linear). The RSS can: folding first reads a worst-case half as one
  RSS variate and is wider by 0.2092 in the fixture's hand derivation. That, and
  the unscaled "parent ± sub-study interval" misreading (0.25 short each way), are
  what `test_the_chain_rule_differs_from_the_folded_interval_routes_by_a_stated_amount`
  states. The handoff's wording ("worst case … differs from parent ± sub-study
  interval") is true only of the *unscaled* reading.
- **The unit refusal is one function now.** `_require_unit_fit` serves a band and a
  `study_ref`'s output unit; the band wording is byte-identical (the existing tests
  pass unchanged). A sub-study in `mm` on a driver declared in `in` is refused in
  those words.
- **Nesting is refused by name, and "names a kinematic study" is refused too.** A
  `study_ref` resolves `study/v0` documents only; a kinematic study id found under
  the topologies directory is refused with "nested study_refs are not supported in
  v0" when it itself holds a `study_ref`, and with a plainer sentence when it does not.

## `sensitivity_source: chain | sweep` — one loader or two?

**Two loaders, one composition.** What the rule needed was a single small function
(`study_ref_group`): `J` (a per-point value from the sweep) times a chain term's
`ratio` (an authored constant) gives a `Term` coefficient. The two sources differ in
everything around that — what they cite (a sweep label vs a topology edge and its
transform), when they resolve (per point vs once), what they refuse — and the thing
they share, a signed `Term` with a coefficient, already *is* the shared type
(`stack.Term`). Merging the loaders would mean one object that is sometimes a column
and sometimes a constant, which is the shape this repo keeps refusing for `fold()`
itself. I would not converge them yet; a second `study_ref` (a chain study under a
*chain* study, which `Transform` already expresses) is the case that would show
whether a `coefficient_source` abstraction earns its place.

## Verifying in a worktree — what it took

- `-n 16 --dist loadfile` is the documented parallelism, but this venv has no
  xdist (`unrecognized arguments: -n`); the suite ran as CLAUDE.md spells it.
- To arm the `[real]` tiers without touching the shared projections:
  `dispatch bridge-test-inputs C:/workspace/tolstack <worktree>` (read-only links),
  `cp -r` the main checkout's `data/projections` into the worktree's own `data/`, then
  `scripts/rebuild_projections.ps1` (the bridge also leaves a `venv-win` link, so the
  script's preflight passes and it builds into the **worktree's** private `data/`).
  Commit first — the tier refuses a projection stamped `dirty`. A `node_modules`
  junction to the main checkout lets `run_viewer_browser_tests.mjs --repo <worktree>
  --only "kinematic study page"` run one suite. Both links are untracked: remove
  them before finishing.
- **Renaming a guard renames its spec file** (the hash is of the name) **and moves
  the census pin** (`scripts/guard_enumeration.mjs`). I reworded two `[real]` guards
  whose titles carried numbers that moved ("23 rows on 8 columns", "nine edges lit
  and the other fifty dimmed") and one browser guard; the numbers now live in the
  assertions, and the titles say no count.
- The tests that drive the real witness runner
  (`tests/test_mutation_witness_shadow_concurrency.py`, four of them) pick a cheap
  fast-tier entry and expect a **clean** run. In a worktree whose `[real]` tier is
  armed, the fast tier is red on the already-filed fixture drift
  (`ISSUE_20261026_topology_fixtures_lack_the_tags_fields_so_the_real_fixture_pairing_is_red_on_integration.md`),
  so the runner skips every entry as "tier already red" and those tests fail. They
  are red here for that reason and nothing in this diff; they pass where the fast
  tier is green. The five new/renamed fast guards were therefore witnessed by
  applying each mutation by hand and running `node apps/viewer/run_tests.cjs` (each
  reddened its own guard); the browser group-row guard by the same hand mutation
  against `run_viewer_browser_tests.mjs --only "kinematic study page"`.

## Verification record

**Where:** this worktree (`C:/workspace/tolstack-worktrees/a_contributor_may_be_a_study`), with the
`[real]` tiers armed as above (projections rebuilt from the committed tree, stamps
`dirty=False`). **Command:** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
(whole suite, no `-n`: xdist is not installed in this venv).

- **Final run, at `e0d2957c`:** 1590 passed, 3 failed, 1 skipped, 2 deselected.
  Wall time 2554 s, of which almost all was one test queued behind another agent's
  hold on the machine's single browser slot (the run sat at 23 dots for ~35 min).
  The same suite uncontended, one commit earlier, was 339 s and the figure recorded
  with `suite-time record` (default tier, 10 min budget: inside budget).
- **The 3 failures, none from this diff:**
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` (568/569: the one
  red is `[real] the topology fixture's shapes still match the builder's`, the filed
  fixture drift, red on integration too; CLAUDE.md expects this file red in a
  worktree) and the two `test_mutation_witness_shadow_concurrency.py` tests that need
  a clean fast tier (the other two of the four passed in the final run). They go
  green in the main checkout once that issue is fixed.
- **Other tiers:** `node apps/viewer/run_tests.cjs` 568/569, same single red,
  `[real]` tier paired with this tree and *running* (one skip: the per-document
  qualifier's live witness, an existing issue). `node apps/annotate/run_tests.cjs`
  225/225. `node scripts/run_viewer_browser_tests.mjs --repo <worktree> --only
  "kinematic study page"` 15/15 (the new group-row check included); the full browser
  TRUTH tier and the full witness registry are merge-only and were **not** run.
  The new/renamed fast guards were witnessed by hand (5 of 5), the new browser guard
  by hand (red under its mutation); `--changed-since` could not run the witness
  runner here for the reason above.


## Filed

- `ISSUE_20261027_the_blade_pitch_check_still_names_two_gap_rows_it_no_longer_has.md`
  — a stale `excluded_terms` row on both checks, found while removing the two
  end-stop rows.
- `ISSUE_20261027_the_travel_term_dominates_the_blade_pitch_budget_and_both_stops_read_marginal.md`
  — `audience: strategy`.
- Already filed on integration, not re-filed: the topology fixture drift above.

## Found on arrival

Nothing: the worktree was clean at `c0dbaf6d`.
