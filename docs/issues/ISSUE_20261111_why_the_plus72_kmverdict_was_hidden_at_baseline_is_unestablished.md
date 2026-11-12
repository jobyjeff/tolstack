---
type: chore
priority: low
status: open
area: tests/browser-tier
reporter: agent
audience: tactical
found_by: docs/sessions/reviews/REVIEW_20261111_the_topology_real_loop_runs_on_one_origin.md
---

# Why the +72 stop's `kmverdict` never became visible at baseline is unestablished

`the_topology_real_loop_runs_on_one_origin` changed the kinematic study page
suite's wait to `div.kmverdict:visible, .banner__notice:visible`. The handoff
asked first for **why** the `plus72` verdict was hidden when the suite aborted
on 2026-11-10; the tactical agent could not reproduce it (and nor could the
review: 27/27 green) and the lesson says the root cause is open. `:visible`
means a future recurrence of the same hidden state would now pass the wait and
then fail (or not) on the `count() === 2` read next to it, rather than abort.

Suggested: if it recurs, capture `getComputedStyle` of `div.kmverdict[data-stop="plus72"]`
and its children at the wait, before changing anything else. Possibly the same
family as `ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent.md`
(a post-load render not yet settled).
