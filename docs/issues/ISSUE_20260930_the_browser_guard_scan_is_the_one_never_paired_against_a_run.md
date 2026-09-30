---
type: chore
priority: low
status: open
area: guards/mutation-witness
class: guard_cannot_fail
reporter: agent
found_by: docs/sessions/HANDOFF_20260930_guard_census_pins_the_set_not_the_count.md
---

# The browser tier is the one guard source whose scanner is never checked against a run, and a *subset* pairing is available there

Since 2026-09-30 the two fast guard sources are paired against what their tiers
actually run: `node scripts/guard_enumeration.mjs --executed` spawns each
runner, reads the names off its `PASS  `/`FAIL  ` lines, and requires the scan
and the run to agree. That is what makes the scanner falsifiable, and it closes
the third arrival in
`ISSUE_20260923_the_guard_census_pins_a_count_not_a_set_so_three_arrivals_are_silent`
— a guard written in a shape the regex does not match runs, prints a name, and
is invisible to the census in both directions at once.

**The browser source is not paired, and that arrival is still open for it.**
`CENSUS_LIMITS.browser_scan_unverified` says so on every census run, which is
the honest half. The stated reasons are real:

- it needs a real Chrome and several minutes, so it cannot sit in `pytest -q`;
- **`declared == executed` is false there by construction** — one declared name
  may be run by more than one suite (which is why a browser spec names a
  `suite` by hand), and its template names interpolate a live number, so the
  string the tier prints is not the string the scan read.

**But the direction that matters is still available.** The expensive direction
is *equality*; the one that catches a guard the scanner cannot see is
`ran ⊆ declared`, and that survives both objections — a name the tier printed
that is not in `declared` (after excluding the interpolated ones, which the
enumeration already flags with `enrollable: false` and a `why`) is a scanner
miss regardless of how many suites ran it.

**Where it would live.** Not pytest. `scripts/run_viewer_browser_tests.mjs`
already collects every sub-check name it prints, so the comparison is local to
a run it is already paying for; the alternative is the mutation-witness tier,
which is already on the batch-merge must-run list. Either way this is a
browser-tier-side change, which is why it was not folded into the pytest-side
pass that produced it.

Not urgent: measured 2026-09-23, zero declarations in any source use a shape
the scanner misses. This is a future hole with an emitted name, not a present
miss.
