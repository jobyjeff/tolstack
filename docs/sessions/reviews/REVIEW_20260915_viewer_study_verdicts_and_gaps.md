---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
reviewer: agent (review/viewer_study_verdicts_and_gaps)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW — viewer_study_verdicts_and_gaps

**Verdict: APPROVE.** All six deliverables land and are verified against the
live projection, not against fixtures. Six should-fixes and a handful of nits,
all about the *net* rather than about behaviour: the page is correct today, and
three of its load-bearing pieces have nothing standing on them. Every unfixed
finding is filed. Four inline fixes, listed below.

## What I verified

**Tests, all three tiers, re-run by me** (not taken from the report):

| tier | command | before merge | after merge |
|---|---|---|---|
| pytest | `venv-win/Scripts/python.exe -m pytest -q` | 884 passed / 1 failed / 1 skipped | **886 passed / 1 failed / 1 skipped** |
| viewer fast | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | — | **367/367** |
| viewer browser | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | — | **19/19 checks** (Chrome 152) |

The one red is **pre-existing and unrelated** —
`test_every_byte_identity_claim_in_a_live_file_names_its_verification`, on a
sentence in `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`
that landed in `df21a4a`. I confirmed it red on `integration` *before* merging.
The author filed it rather than editing the strategy advisor's artifact, which
is the right call; note it is now the **third** issue in `docs/issues/` for that
one sentence (see nits).

Two traps checked and clean: the suite left `C:\workspace\tolstack\data\`
untouched (projection mtimes unchanged by any of my runs), and the main
checkout's `git status` is clean. Nothing was written into drawing-checker.
`data/inbox/specs/` untouched.

**The live projection is reproducible from the merged tree.** I ran
`build_topology_projection.build()` in-process against
`C:\workspace\tolstack\data\meshes` and compared to the artifact on disk: all
five topologies' `gaps` arrays **identical**, all 18 checks' `margin` values
identical. The on-disk file was built from the handoff worktree at `13fbf3f`.

**Definition of done, item by item, against `data/projections/viewer/topologies.json`:**

* `pitch_link_shank_out` → `fail`, `margin -8.1939 mm`, `complete: false`,
  scope `budget`. ✓ Rendered as "margin -8.1939 mm at worst case".
* `pitch_link_cotter_hole_clearance` → `pass`, `margin +11.1435 mm`. ✓
* `pitch_link_thread_region_t` → `checks: []`, renders "No pass/fail criterion
  has been recorded for this study yet" and prints **no** margin (asserted). ✓
* Lower-bound warning on the shank-out study names `plain bushing length
  (214820-002)` and `washer thickness, NAS1149V0332H (.032 in)` — the bushing
  and washer rows the DoD asked for. ✓
* The excluded spherical bearing is on screen with **no study selected** (the
  arrival state) via the gaps panel, and again above the number on the verdict
  card. ✓
* Every study is badged on the rail: **21** study rows, 21 badges, and all of
  `--fail` / `--pass` / `--none` present. ✓

**`margin` is the right end of the interval.** `margin == interval.min` for all
18 live checks. For the two `budget`-scope pitch-link checks that is the
*binding* corner (grip at max against the column at min), matching the
`grip_budget__*` precedent this checklist warns not to re-derive from physical
intuition. No verdict reads RSS. `fold()` is untouched and still reads
`min`/`max` only.

**The new guards were observed failing** — six mutations, each reverted:

| mutation | result |
|---|---|
| `TOPOLOGY_GAP_KINDS` gains a typo'd member | `test_the_js_copy_spells_exactly_what_python_enumerates[GAP_KINDS]` red, names the right thing ✓ |
| drop the `+` sign prefix from `marginText` | `[real] the pitch-link studies render their verdicts and their margins` red ✓ |
| nav badge suppressed for `checks: []` studies | `[real] every study wears a verdict badge on the nav rail` red ✓ |
| `VA.VERDICTS` keys reordered worst-first | **everything green** — finding 1 ✗ |
| `CheckResult.margin` → `interval.max` | **pytest at baseline** — finding 2 ✗ |
| per-row `no_tolerance` badge deleted | **367/367** — finding 3 ✗ |

The gap-kind coverage test carries its own anti-vacuity assertion (all four
kinds have live rows), which is the shape this checklist asks for.

**Mandatory stack checks.** No element value, `source_ref`, `lmc`/`mmc`, path
term or check term was authored or modified by this handoff, and no stack or
worksheet file is in the diff — checks 1, 2, 2b, 3, 5 and 6 are not engaged, and
check 4's three-number rule is untouched. `tolerance_stack/stack.py`'s only
change is an additive derived property plus a module constant. For the record
(check 7, computed by me with `tests/debug_report_tolerance_stacks.py --ratio`,
not copied): **30 traced / 9 inferred / 20 untraced, out of 59 element
instances** across all stacks; **5 traced / 3 inferred / 18 untraced of 26** for
the three seeded slice-1 stacks. Unchanged by this work.

## Findings

### should-fix (all filed; none blocks)

1. **`VA.worstVerdict` ranks by `VA.VERDICTS`' object key order, and nothing
   guards that order** — `apps/viewer/topology.js`, `apps/viewer/viewer.js:167`.
   The pairing test compares **sets**, so any permutation is green. Measured:
   reordering to `fail, marginal, pass` leaves 367/367 and 13/13 green while
   `pitch_system_end_stop_minus7` and `_plus72` (both `marginal` + `pass`) roll
   up as **PASS** at the head of the strip and on the rail. The `[real]` nav
   test only wants one of each class somewhere on the rail, and 11 fails / 4
   passes satisfies that either way. Fix: three assertions on `worstVerdict` in
   the fast tier.
   → `ISSUE_20260915_worst_verdict_ranks_by_an_unguarded_object_key_order.md`

2. **`CheckResult.margin` has no Python test pinning its value** —
   `tolerance_stack/stack.py`. Measured: returning `interval.max` leaves pytest
   at its baseline. The field-for-field projection test was re-pointed at the
   builder's own `B.rounded_check()` (right for *rounding*, per the lesson's §2)
   and therefore cannot see a wrong rule; the only value pin is a rendered
   string in the JS `[real]` tier reading the **built file**, so it fires only
   after a manual rebuild. This is the number the handoff exists to publish, and
   "which end of a budget interval binds" is a question this repo has already
   got wrong in prose by 0.708 mm with every test green.
   → `ISSUE_20260915_check_result_margin_has_no_value_test_in_python.md`

3. **The grid's "no tolerance recorded" badge replaced a marking and inherited
   none of its guards** — `VA.edgeAttention`, `apps/viewer/topology.js`. The
   diff removes the old `chip--zero-width` chip from the sourcing cell; deleting
   the new badge's one line leaves 367/367. Its sibling `tvflag--unverified`
   *is* pinned count-for-count in the same new test, which is what makes the
   omission read as coverage. Deliverable 2 asked for a badge on *each affected
   line item*.
   → `ISSUE_20260915_the_grids_no_tolerance_badge_is_unguarded_in_every_tier.md`

4. **`VERDICTS` was minted to end the inline copies, and two survive in the
   tests** — `tests/test_tolerance_stack.py:243` and `:311` each assert
   `got.verdict in ("pass", "marginal", "fail")`, one line from an imported
   `VERDICT_SCOPES`. The new constant's docstring also claimed those tests "pin
   that it can return nothing else"; they check one constructed check each.
   Docstring corrected inline; the real pin is filed.
   → `ISSUE_20260915_the_verdict_domain_is_unpinned_and_restated_by_hand_in_two_tests.md`

5. **"The two loud gap confidences" now has three homes and no pairing** —
   `build_topology_projection.UNVERIFIED_CONFIDENCES` (new),
   `VA.needsAnnotation`'s two inline literals, and `confidenceClass`'s prose.
   The first two are *computed* and must agree, or the "what's missing" panel
   and the grid badges describe different sets on the one page whose job is to
   say what cannot be trusted. Neither pairing test can anchor on a function,
   which is why this pair has never been pairable; `no_source_ref` has zero live
   instances, so drift in that half is invisible in live data too.
   → `ISSUE_20260915_the_loud_gap_confidence_pair_has_three_homes_and_no_pairing.md`

6. **`load_hardware()` drops the schema check its sibling makes** —
   `build_viewer_projection.build()` raises on a register whose `schema` is not
   `SCHEMA_HARDWARE`; the new `load_hardware()` reads `entries` off whatever
   JSON is there. Absence is argued and documented; a *present but unreadable*
   register silently turns 43 of the 98 live gap rows into "nothing is missing".
   → `ISSUE_20260915_topology_builder_drops_the_hardware_register_schema_check.md`

### Fixed inline (all within the three prongs; nothing silent)

* **`apps/viewer/topology.js`, `VA.zeroWidthWarning`** — "the worst-case spread
  **below** is a LOWER bound" → "**above**". The folded totals are in
  `.tvtotals__strip`, appended *before* the warning (and `.tvtotals__rule` in
  the same block already says "Every number **above**"), so the sentence pointed
  the reader at nothing. The handoff's own copy was "the worst-case spread
  *shown*".
* **`apps/viewer/topology.js`, `VA.studyVerdict`'s comment** — "Six of the live
  studies are here" → five, with the recount. The live projection has **21**
  studies: **5** with `checks: []` (all `status: ok`) and 16 carrying **18**
  checks (14 × 1, 2 × 2). The handoff's own context paragraph ("13 studies carry
  a verdict-bearing check, 6 carry `checks: []`") is stale in both terms.
* **`docs/sessions/lessons/LESSONS_20260915_viewer_study_verdicts_and_gaps.md`**
  — a dated correction blockquote for the same "six", and for §3's byte figures:
  the quoted `604,208 → 639,656` describes the author's own re-serialisation,
  while `topologies.json` on disk is **654,185 bytes**. The *delta* (+35,448,
  +5.87%) and the whole 98-row per-kind table re-derive **exactly** (38 = 18+20,
  29 = 4+2+23, 13 = 1+2+10, 11 = 5+6, 7 = 3+4), as does the "no live edge is
  both unverified and zero-width" claim. Also noted that `npm install` in the
  worktree is the lighter route to the browser tier than §7's `node_modules`
  junction — it is how I ran that tier.
* **`tolerance_stack/stack.py`, `VERDICTS`' docstring** — replaced the claimed
  pin with what is actually true, and recorded that the tuple's *order* is
  load-bearing for `VA.worstVerdict` and unguarded, pointing at both issues.

### Nits (no issue)

* **A third issue for one sentence.**
  `ISSUE_20260915_strategy_brief_byte_identity_claim_fails_the_provenance_guard.md`
  joins
  `ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`
  and `ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`,
  already on `integration` — three files, same red test, same line 62. Third
  sighting of the concurrent-duplicate-issue shape; the triage sweep should
  merge them. Not the author's fault: the branch was cut before the other two
  landed and nothing shows a session what a sibling is filing.
* **The gaps panel quotes authored prose that breaks the page's own copy rule.**
  Deliverable 6 bans field names, file paths and schema jargon from rendered
  strings; `hardware_entry` rows carry `data/inbox/specs/`, "SOP Step 5b",
  "zero-width band", `pitch_link_to_pitch_plate` and `Matrix(14) on the pt rect
  [340,108,400,185]`. These are quotes from `hardware_entries.json`, shown the
  same way the classic view already shows them, so they are not the handoff's
  words — but one of them opens **"CLOSED 2026-08-05 (spec_library_v0)"** under
  a heading that says "**Open** questions about the hardware". If a future
  handoff touches this panel, filtering closed notes (or softening the heading)
  is the cheap fix.
* **No browser-tier witness for the new CSS.** `scripts/run_viewer_browser_tests.mjs`
  is unchanged, and its own docstring is the argument: *"'Impossible to miss' is
  a CSS claim, and a class-name check would pass straight through a stylesheet
  typo."* Deliverable 2's whole point is loudness, and every assertion on it is
  a class name in the shim tier. The `topology height budget` suite does still
  pass with the new blocks below the strip, which is the regression that
  mattered most.
* `margin` of exactly `0.0` renders as "margin 0.0000 mm" with no sign — the
  `check.margin > 0` prefix test. Cosmetic, no live instance.

## For the next reviewer

* The **overlay was populated** before this review and I applied it; three new
  **Recurring bugs** entries and one **Architectural errors** entry are appended
  on this branch (set-comparing pairings vs. order-ranking consumers; a derived
  field whose field-for-field test imports the producer's own helper; a badge
  that replaces an older marking and inherits none of its guards; two readers of
  one input file with different refusals).
* **Spell `--repo` with forward slashes.** `--repo C:\workspace\tolstack` under
  the Bash tool resolves to `.../workspacetolstack/...`, the node-fs tier reports
  itself SKIPPED, and the runner still prints a clean `298/298 passed`. Every
  `[real]` test in this handoff lives behind that seam.
* The DAG page's folded totals are still off-screen at 1600px — the author filed
  it with `audience: strategy`
  (`ISSUE_20260915_topology_page_hides_its_own_numbers_behind_a_horizontal_scroll.md`)
  and I agree that is a layout trade, not a bug fix.

## The integration merge

`integration` moved while this handoff was in flight — `f629942` (where this
review branch was cut) → `fd27d4c`, eight commits, the landing of
`respine_tween_fidelity_round2` plus two `sync: merge master` commits. Both
sides touched `apps/viewer/topology.js` and `apps/viewer/views/topology.js` and
**the merge was clean** — no conflict, nothing for me to resolve, so no
resolution judgement is hiding inside the green below. All three tiers re-run on
the merged result:

* pytest **886 passed / 1 failed / 1 skipped** (the same pre-existing red)
* viewer fast tier **371/371** (up from 367: `respine_tween_fidelity_round2`
  added four)
* viewer browser tier **19/19 checks**, 288/288 in the shim suite over both
  `file://` and http, including the new scrolled-respine sub-checks

`integration` then moved a **second** time mid-merge (`302fe52`, the
`annotate_hosted_page_posture` review landing), so this was done twice: merge
`integration` in, re-run all three tiers, fast-forward. Both merges were clean.
Final figures on the twice-merged tree: pytest **886 / 1 / 1**, fast tier
**371/371**, browser tier **19/19** (the annotate hosted-posture suite grew
8 -> 18 sub-checks in the interim). Then `integration` fast-forwarded to
`review/viewer_study_verdicts_and_gaps`.
