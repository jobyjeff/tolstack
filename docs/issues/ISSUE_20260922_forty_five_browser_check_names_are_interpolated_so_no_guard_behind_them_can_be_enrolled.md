---
type: chore
priority: med
status: open
area: guards/mutation-witness
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md
---

# 45 of the browser tier's 51 template-literal check names carry a live number, so no guard behind one of them can ever be enrolled

Measured 2026-09-22 on `handoff/mutation_witness_repair_and_enrollment`, over
`scripts/run_viewer_browser_tests.mjs`: 51 sub-check names are written as
template literals, and **45 of them interpolate a value** —
``push(`[real] the mark stays at the end of its row, including on the
${wrapped.twoLine} rows whose name needs two lines`, …)`` is the shape.

An interpolated name cannot be declared in `scripts/mutation_witnesses.json`,
for two independent reasons, and neither is a bug in the table:

1. `scripts/run_mutation_witness_tests.mjs` compares `expect_red` to the printed
   failure name with `Array.prototype.includes` — **exact equality**. The
   printed name contains whatever the run measured (`2 rows`), so a declared
   string either carries a number that is true of one run, or never matches.
2. `tests/test_mutation_witnesses.py::test_every_expect_red_resolves_to_exactly_
   one_place` looks the name up in the check source, where `${wrapped.twoLine}`
   is what is written. Zero hits, red on every pytest run.

## Why it matters now

`BRIEF_20260915_mutation_witness_enrollment` is ranked #4 in
`dispatch/docs/strategy/BRIEF_QUEUE.md` on the cost of enrolling a guard. This
is a population of guards whose enrollment cost is **infinite** as the tier
stands, and nothing anywhere says so — the cost only shows up as an author
transcribing a paste-ready row and finding pytest red.

It has already been paid twice. `ISSUE_20260922_the_nav_status_icon_guards_have_
no_mutation_witness_entry.md` called its strongest row paste-ready and predicted
the trap as an `expect_red` substring problem; the actual obstacle was the
interpolation, and the row only enrolled on 2026-09-22 after the check was
rewritten to print its count on the diagnostic line beside it (see
`nav-mark-stays-at-the-end-of-its-row` in the table).

## Why this is `audience: strategy`

There are at least three answers and they are not equivalent:

- **Rewrite the 45 names**, one at a time as each guard is enrolled, moving the
  live number to a `console.log` beside the check (what the one repaired guard
  did). Cheap per guard, 45 small diffs, and it makes every failure line
  stable — but it loses the number from the line a reader scans.
- **Split the name from the detail in `push()` itself** — a second argument the
  harness prints under the name. One change to the harness, 45 mechanical call
  sites, and the count survives.
- **Let an entry declare a name PREFIX** on the browser tier. One change to the
  runner and the pairing module, no guard edits — but it reopens exactly the
  hole `test_no_expect_red_is_a_truncated_check_name` was written to close
  (2026-09-18), so it would need the prefix to be a declared field rather than
  an accident.

## Repro

```
node -e "const s=require('fs').readFileSync('scripts/run_viewer_browser_tests.mjs','utf8');const n=[...s.matchAll(/push\(`([^`]*)`/g)].map(m=>m[1]);console.log(n.length, n.filter(x=>x.includes('${')).length)"
```


---

## 2026-09-23 — the population is measured continuously now, and it is smaller than 45

`mutation_witness_derived_enrollment_and_gating`. This issue's sharpest sentence
was *"nothing anywhere says so"* — the cost only surfaced when an author
transcribed a paste-ready row and found pytest red. Something says so now:

```
node scripts/guard_enumeration.mjs
```

prints, per guard source, `enrolled / enrollable / declared`. The gap between
the last two columns **is** this issue's population, computed on every run, and
`node scripts/run_mutation_witness_tests.mjs --unenrolled` names each one with
the reason it cannot be enrolled.

**Today's number is 31 of 506 browser guards, not 45 of 51 names**, and the
difference is real rather than a re-count. The old measurement counted template
*literals* in the source; the enumeration counts *guards*, after closing
adjacent-literal seams and after collapsing a name declared at more than one
call site into the one unattributable guard it is. 27 of the 31 are
interpolated; the other 4 are names declared more than once, which is a second
way to be unenrollable that this issue did not name and the enumeration reports
separately.

The three answers this issue lays out are unchanged and the decision is still
open. What has changed is that whichever is chosen can now be measured against
a number that moves.
