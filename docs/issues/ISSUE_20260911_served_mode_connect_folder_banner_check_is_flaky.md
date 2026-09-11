---
type: bug
priority: low
status: open
area: tests/browser-tier
reporter: agent
---

# Browser tier: "[real] the connect-folder banner never appears" races the boot's own transient banner

Seen once in four otherwise-identical runs of
`node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`
on 2026-09-11 (Chrome 152.0.7977.83 via `channel: 'chrome'`, headless):

    [served mode (repo-root static server)] 10/11 sub-checks passed: FAIL
        FAIL sub-check: [real] the connect-folder banner never appears

The next run of the same tree passed 11/11, as did the two before it, and
nothing in that session touched served mode or `storage/http.js`.

Cause, read off the code rather than guessed: `testServedModeBoot` waits with

    await page.waitForSelector('tr.tvrow, .banner--disconnected', ...)

and then asserts `.banner--disconnected` is absent. But
`apps/viewer/topology_app.js`'s initial state is
`connection: VA.STATE.DISCONNECTED` (line 17), so the first paint — before
`chooseAdapter`'s HTTP probe resolves — legitimately renders the connect-folder
banner. That disjunction can therefore resolve on the *transient* banner, and
the assertion samples it before the probe has had a chance to replace it. The
contract being tested is about the SETTLED state ("zero manual steps to see the
DAG"), which the transient does not violate.

Fix shape: wait for the settled render (`tr.tvrow`, which the suite already
waits for three lines later) before sampling `#banner` at all, and keep a
bounded timeout so a genuinely stuck disconnected boot still fails — just as a
timeout rather than as a banner sighting.

Left as an issue rather than fixed inline because it is outside the
`hover_card_layout_guard_can_fail` scope (different suite, different contract),
and it is a false negative rather than a missed defect.
