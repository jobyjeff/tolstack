# LESSONS — viewer_study_verdicts_and_gaps (2026-09-15)

What the next agent on this page cannot get from the diff.

> **Correction, 2026-09-15 (`review/viewer_study_verdicts_and_gaps`).** Two
> numbers below did not re-derive against the live projection:
>
> * §4's **"Six live studies"** with `checks: []` is **five**. The live
>   `data/projections/viewer/topologies.json` carries **21** studies: 5 with
>   `checks: []` (all `status: ok`, so all five render the `none` badge) and 16
>   carrying **18** checks between them (14 studies × 1, 2 studies × 2). The
>   figure came forward unchecked from the handoff's own context paragraph
>   ("13 studies carry a verdict-bearing check, 6 carry `checks: []`"), which is
>   stale in both terms. The same "six" was in `VA.studyVerdict`'s comment and
>   is fixed there. Nothing rests on it — the `[real]` nav test counts the rows
>   off the projection rather than against a literal — but it is the one number
>   in this file a later session would quote.
> * §3's **"604,208 → 639,656 bytes"** describes the author's own
>   re-serialisation, not the artifact: `topologies.json` on disk is **654,185
>   bytes**. The *delta* (+35,448, +5.87%) and the 98-row table are sound and
>   re-derive exactly (18/20, 4/2/23, 1/2/10, 5/6, 3/4 by kind), so read §3 as
>   a size *delta* and not as the file's size.
>
> Also on §7: `npm install` in the worktree is the simpler route to the browser
> tier than a `node_modules` junction — `playwright-core` is one package with no
> browser download, and it is how this review ran that tier. The junction still
> works; it is just the heavier of the two.

## 1. The margin had to be computed in Python, and that is a one-line rule

The handoff asks for "the margin number (worst-case distance to the criterion,
signed, with units)". For the only criterion this repo supports (`">= 0"`) that
distance **is** `worst_case_min`, and the tempting shortcut is to print
`worst_case_min` from the viewer and call it a margin.

Do not re-open this. `CheckResult.margin` exists because the *criterion* is what
turns an interval into a distance: a page that reads `">= 0"` and subtracts is a
second place a sign can be wrong, about the one number a reader acts on, and it
would silently print the wrong thing the first time a criterion of `">= 3"` is
authored. The property sits beside `verdict`, behind the same
`NotImplementedError` gate, so the two move together or neither does.

The consequence to know about: **`margin` and `worst_case_min` carry identical
digits in every live check today.** A reviewer who greps will find what looks
like a redundant field. It is not; the docstring says why, and so does
PROVENANCE.md's amended row.

## 2. Rounding a projected check now has exactly one owner

Adding `margin` to `CheckResult.as_dict()` broke
`test_the_l1_studys_projected_check_matches_check_study_field_for_field` — the
builder rounded the interval but not the new float, so the projection said
`-0.6366` and a live `check_study()` said `-0.6366000000000014`.

The fix was **not** to add a rounding exception to the test. `rounded_check()`
now lives in `scripts/build_viewer_projection.py`, both builders call it, and
the test imports it. If you add another derived float to a check, put its
rounding there and nothing else has to learn about it.

## 3. What the gaps emission did to the projection

Measured on the live tree 2026-09-15, by stripping `gaps` back out of the built
file and re-serialising it the same way: **604,208 → 639,656 bytes, +35,448
(+5.87%)**, for **98 rows** across the five topologies.

| topology | rows | excluded | unverified | no tolerance | hardware |
|---|---|---|---|---|---|
| `pitch_system` | 38 | 18 | 20 | — | — |
| `rotor_fastener_length` | 29 | 4 | — | 2 | 23 |
| `pitch_link_to_pitch_plate` | 13 | 1 | — | 2 | 10 |
| `tan_link_to_pitch_plate_take2` | 11 | — | 5 | — | 6 |
| `vpa_output_to_pitch_plate` | 7 | — | 3 | — | 4 |

Two facts worth knowing before you design anything on top of this:

* **`unverified_value` and `no_tolerance_recorded` do not co-occur on a single
  live edge** — checked across all five topologies, zero edges are both
  zero-width and untraced/uncited. `pitch_system` is all unverified with no
  zero-width bands; `pitch_link`/`rotor_fastener` are the reverse. So no live
  row wears both badges, and the sourcing cell's 260px was sized knowing that.
  A topology that broke the pattern would clip its own citation chip, and the
  cell clips rather than wraps on purpose (a wrapped chip grows the row off its
  leader's seam).
* **The bulk is prose, not structure.** A `hardware_entry` gap is a whole
  transcription note, sometimes 300 characters, and `pitch_system`'s excluded
  terms run longer still. That is where the 35 KB went, and it is also why the
  panel is a collapsed `<details>` with counts in the headings rather than 38
  always-open lines.

## 4. Copy decisions — do not re-litigate these

* **"no tolerance recorded", not "zero-width band."** Jeff's rule (standing, all
  repos): everyday words, no schema jargon. The DAG page says the former; the
  **classic stack view still says the latter**, in `views/stack.js`,
  `views/detail.js` and `VA.summaryChips`. That is a deliberate split, not an
  oversight: the classic view is scoped to another handoff
  (`viewer_nav_wedge_and_classic_retirement` may retire it outright), and
  editing its copy from here would have been scope creep into a surface that
  may not survive. If the classic view stays, unify on the DAG page's words.
* **The row's confidence chip was kept.** A row can now show
  `[unverified] [UNTRACED]` — two chips for what a purist would call one fact.
  They are not the same fact: the badge is the everyday-words alarm, and the
  confidence chip is the *trigger for the citation card*, with the repo's own
  vocabulary on it. Merging them would cost the card its trigger.
* **The verdict badge is never blank.** A study with `checks: []` says "no
  criterion" on the nav and "No pass/fail criterion has been recorded for this
  study yet" in the totals. Six live studies are in that state, and rendering
  them silently is exactly what made the page look as though it held no
  verdicts at all — a silent row on a rail of verdicts reads as a row that
  passed. There is a `[real]` test asserting **every** study row carries
  exactly one verdict badge; keep it.
* **`incomplete` is a word and a style, both.** The verdict chip gains an amber
  dashed outline (`--qualified`) *and* an `INCOMPLETE` flag beside it. A tint
  alone is not a statement, and "fail" on an incomplete chain is true of the
  model and false of the hardware.

## 5. The strip does not wrap — put new chips below it

`.tvtotals__strip` is `flex-wrap: nowrap; overflow-x: auto` by an explicit
earlier decision (its height must not grow with a study's notes). The first
draft of this work put the verdict badge **and** the three attention flags in
it, which pushed the folded totals ~300px past the right edge. Only the verdict
chip stayed; the flags moved to `.tvtotals__flags`, a wrapping line below.

The folded totals are *still* behind a horizontal scroll on a 1600px viewport,
because the `from → to` span is long — that is pre-existing and is filed as
`ISSUE_20260915_topology_page_hides_its_own_numbers_behind_a_horizontal_scroll.md`
with `audience: strategy`, because the fix is a layout trade rather than a bug.

## 6. Two comments on this page were stating the opposite of the truth

`views/topology.js:1127` claimed a study's `checks` "never reaches the
projection at all" — false since 2026-09-09. `views/nav.js` and
`apps/viewer/README.md` both argued that the nested classic view must stay
reachable *because* the DAG page "compares totals, never a verdict". All three
are corrected, and the nav's argument is now stated on its surviving merits
(element table, paths, worksheet) with the spent one recorded as spent.

The pattern to notice: each was a *true* sentence at the time, attached to a
decision that outlived it. When you close a gap, grep for the sentences that
justified working around it.

## 7. Running the browser tier from a worktree

`node_modules/` is gitignored and exists only in the main checkout, so
`node scripts/run_viewer_browser_tests.mjs` fails with `ERR_MODULE_NOT_FOUND:
playwright-core` in a worktree. A directory junction fixes it without touching
either repo:

```
New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules
```

Remove it before you finish — it is gitignored, so `git status` will not remind
you, and a junction in a worktree is one more thing for cleanup to trip over.
Pass `--repo C:\workspace\tolstack` so the `[real]` tiers find `data/`.

## 8. Still to do / left undone

* **The suite was already red when this session started**, on
  `tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`,
  from a sentence in a 2026-09-15 strategy brief. Filed, not fixed
  (`ISSUE_20260915_strategy_brief_byte_identity_claim_fails_the_provenance_guard.md`)
  — it is the strategy advisor's artifact. **884 passed / 1 failed before, 886
  passed / 1 failed after**, so "green before, green after" had to be read as
  "the same one red before and after".
* `gaps[].kind` has no `TOPO_VALUE_GUARDS` row; the guard tiers belong to other
  live handoffs. Filed as
  `ISSUE_20260915_the_new_gap_kind_field_has_no_topo_value_guard_row.md`.
* The fixture tier does **not** exercise a verdict: the demo mechanism's source
  documents no longer exist, so its studies keep `checks: []` (which is honest,
  and is itself one of the states the page must render). Every verdict and
  margin assertion is therefore `[real]`, against the live projection. Its
  `gaps` array *is* hand-patched, but fully derivable from the fixture's own
  edges — the header says how, and a reader can check it by hand in a minute.
