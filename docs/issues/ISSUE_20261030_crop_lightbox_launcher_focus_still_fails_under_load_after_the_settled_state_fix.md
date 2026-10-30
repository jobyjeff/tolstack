---
type: bug
priority: low
status: open
area: viewer/browser-tier
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/HANDOFF_20261029_a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark.md
---

# The crop-lightbox launcher-focus check still fails under load after the settled-state fix

This is a recurrence of `ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md`,
which is `resolved` by `HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state`.
That handoff added a 20 s "focus until it holds" loop.

Measured 2026-10-30, at the review merge of
`a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark`:

- Full `node scripts/run_viewer_browser_tests.mjs --repo <scratch root built from the merged tree>`,
  with a full `pytest -q` running beside it: **38/39**. `crop lightbox` was
  `ABORTED after 2 sub-checks`, with `FAIL sub-check: the launcher takes
  keyboard focus and becomes visible when it does`.
- The same suite `--only "crop lightbox"`, three times in a row afterwards:
  **20/20 each time**.

The merged diff matters here: the launcher now lives in the **Preview**.
`topology_app.js`'s `paintPreview` rebuilds the Preview body on every hover
change and again whenever a crop image arrives (`fetchPreviewImages` then
`paintPreview(true)`). Each rebuild throws away the focused button. The
check's loop re-focuses every 100 ms, and it also needs `opacity > 0.9`, which
waits for the focus transition to finish. So a body that keeps rebuilding
faster than that transition never satisfies the check. This review did not
prove that mechanism. It is the first thing to measure.

The same mechanism may have a reader-facing side: keyboard focus on a Preview
control is lost whenever the Preview repaints under it.
