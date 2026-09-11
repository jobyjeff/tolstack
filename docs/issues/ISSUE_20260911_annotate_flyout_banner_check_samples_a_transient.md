---
type: bug
priority: low
status: open
area: tests/browser-tier
reporter: agent
---

# Browser tier: "the embedded annotator boots to an honest pre-connect state" waits on an empty banner and reads it before the boot writes to it

Seen once in three runs of
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
during the review of `hover_card_layout_guard_can_fail` (2026-09-11, Chrome
152.0.7977.83 via `channel: 'chrome'`, headless):

    [annotate flyout (repo-root mount + file:// degradation)] 13/14 sub-checks
        passed: FAIL
        FAIL sub-check: the embedded annotator boots to an honest pre-connect state

The two runs on either side of it passed 14/14 on the identical tree, and the
diff under review touched only `testTheTopologyPage`, a different page object
in a different suite function.

Cause, read off the code rather than guessed. `testAnnotateFlyout` does:

    const flyoutBanner = page.frameLocator("#annotate-flyout iframe").locator("#banner");
    await flyoutBanner.waitFor({ state: "visible", timeout: 15000 });
    const bannerText = await flyoutBanner.textContent();

`apps/annotate/index.html` ships `<div id="banner" class="banner"></div>` —
present and **empty** from first paint — and `apps/annotate/style.css`'s
`.banner` carries `padding: 6px 16px`, so that empty div has a non-zero
bounding box and Playwright calls it **visible immediately**, before any
`setBanner()` has run. The wait is therefore satisfied by the pre-boot element
rather than by the pre-connect message, and `textContent` can sample `""`,
which fails the `/Connect folder|File System Access/` regex.

This is the same class as
`ISSUE_20260911_served_mode_connect_folder_banner_check_is_flaky.md` (filed
the same day, from the same session's runs): a browser-tier wait that can
resolve on a boot transient, followed by an immediate sample of the settled
contract. The mechanism differs — there it is a disjunction resolving on a
genuine transient banner, here it is an empty-but-padded element counting as
visible — so both need fixing; neither fix covers the other.

Fix shape: wait for the banner to be non-empty rather than merely visible —
e.g. `await expect.poll(() => flyoutBanner.textContent()).not.toBe("")`, or in
this runner's dependency-free idiom, `page.frameLocator(...).locator("#banner")`
with `waitForFunction` on `el.textContent.trim().length > 0`, keeping a bounded
timeout so a genuinely stuck boot still fails as a timeout. A false negative,
not a missed defect.
