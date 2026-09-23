---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_viewer_nav_verdict_into_alert_and_icon.md
---

# `apps/viewer/README.md` states "11 amber and 10 red across the 21 studies" and nothing asserts either number

`viewer_nav_verdict_into_alert_and_icon` (2026-09-22) wrote a measured live
tally into `apps/viewer/README.md`'s "What a nav row wears" section:

> Today **no live row is silent** (11 amber and 10 red across the 21 studies,
> both leaf rows marked, measured 2026-09-22 and pinned in `tests.js`)

Both digits are correct today — re-derived in review from
`data/projections/viewer/topologies.json`: 21 studies, 10 whose worst check is
`fail` (the nine `rotor_fastener_grip_u*h` variants plus
`vpa_output_shank_out`), 11 amber, 0 silent. The defect is the pairing, not the
arithmetic.

**"Pinned in `tests.js`" overstates what is pinned.** The `[real]` study-row
test counts into `seen = { warn, fail, silent }` and then asserts
`seen.silent === 0`, `seen.warn >= 1`, `seen.fail >= 1` — deliberately, and
the `seen.silent` line carries the right comment ("a green that turns red on
this line is a stack getting BETTER"). The browser tier is the same shape: it
*prints* `(${navAlerts.amber} amber, ${navAlerts.red} red)` in a check label
and asserts only `red >= 1 && amber >= 1`. So one `rotor_fastener_grip` variant
being brought inside its criterion moves the split to 12/9 with nothing
reddening, and the README is silently wrong.

This is the class `docs/prompts/REVIEW_AGENT.md` already carries from
2026-09-21 (`ISSUE_20260921_annotate_readme_measured_numbers_are_paired_by_nothing`):
*"before accepting a number in a doc, name the test that reads it — 'the
`[real]` tier prints it' is not pairing, printing is not asserting."* Second
sighting, and the twist worth recording is that `apps/viewer/README.md` **is**
scanned (`tests/test_viewer_readme_doc_facts.py`) — just not for this claim
shape, which is only two regexes wide (`_WITNESS_COUNT_CLAIM`,
`_REAL_COUNT_CLAIM`). "The README has a guard" is not "this sentence has one".

## The two fixes, either of which closes it

1. **Pair it.** Add a claim shape to `tests/test_viewer_readme_doc_facts.py`
   that reads `N amber and M red across the K studies` out of the README and
   recounts it off `data/projections/viewer/topologies.json` the way the
   `[real]` tier does. That makes the README the thing that goes red, which is
   the repo's standing fix shape for a restated count.
2. **Or drop the digits.** The sentence's load-bearing claim is *no live row is
   silent*, which the `[real]` tier really does assert. "Today no live row is
   silent — every live study either misses its criterion, has no criterion,
   does not sum, or carries an unverified value" says the same thing with
   nothing to go stale. The split belongs in the dated lesson, which is
   history and exempt by design.

Nothing here touches the lesson
(`LESSONS_20260922_viewer_nav_verdict_into_alert_and_icon.md`) or the code
comments, which state the same tally: `docs/sessions/` is dated history and out
of scope for the live-document rule.

## 2026-09-22 triage sweep — left `open` deliberately; do not re-route

This is an instance of the meta-class recorded in
`dispatch/docs/sessions/lessons/LESSONS_20260922_triage_backlog_is_one_class.md`:
an unpaired hand copy of a count that nothing keeps equal to its source. That class is **already owned** by
`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`,
whose open decision is *detector vs. a third written convention vs. accept the
rate*. Point-fixing the ~160 workspace-wide instances now would pre-decide that
question by brute force, which is the anti-pattern the brief exists to end.

So this issue is **deferred to that brief's strategy decision**, not missed. It
carries no `strategy:` back-link on purpose — dispatch's close-out refuses to
advance an issue that has one, and this issue should stay visible to the sweep
that runs after the brief is decided. The next triage pass should read this
section and move on rather than filing a handoff for it.
