---
type: bug
priority: medium
status: resolved
resolution: resolved 2026-11-04 by handoff the_browser_tier_reds_left_after_the_slide_re_author -- the test ran surfaceIsClean before the var-assigned ban list and prose-class list it reads (both undefined); moved below them unchanged, node apps/viewer/run_tests.cjs 635/635
area: apps/viewer/tests.js
reporter: agent
class: integration_red_node_tier
found_by: docs/sessions/reviews/REVIEW_20261104_the_viewer_real_tier_follows_the_slide_re_author.md
---

# `an archetype with no loader says so instead of 'no checks'` throws on integration

`node apps/viewer/run_tests.cjs` on a clean detached checkout of `integration`
(before the slide re-author handoff is merged) prints
`FAIL an archetype with no loader says so instead of 'no checks'` --
`Cannot read properties of undefined (reading 'concat')`, 516/517. The `concat`
is `skip.concat(all(root, selector))` in `viewerAuthoredText`
(`apps/viewer/tests.js`, ~4870), reached from the `surfaceIsClean` call that
`0fdcfa77` (`the_no_loader_warning_speaks_to_the_reader`) added to that test.
Its review recorded 516/517 and read the one miss as the node-fs tier skip;
it was this red. Not caused by any later handoff.
Also red on integration: two-to-four `tests/test_mutation_witness_shadow_concurrency.py`
tests (MAX_PATH issue already filed; unverified whether this is the only cause).
