---
type: bug
priority: med
status: open
area: annotate hosted posture (browser tier)
reporter: agent
class: browser_tier_red_on_integration
found_by: docs/sessions/HANDOFF_20261030_descending_leaders_take_a_path_that_cannot_cross.md
---

# The hosted annotator's bind press no longer shows the read-only notice

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only
"annotate hosted posture"` is red, and the same sub-check fails every time:

    [annotate hosted posture (no folder grant off-machine)] 14/15 sub-checks passed: FAIL
        FAIL sub-check: [real] pressing a bind control says, in one line, that binding is not available here

The check is `scripts/run_viewer_browser_tests.mjs` ~line 9925. It presses the
owner-not-in-set form's button on the hosted (no-folder) page. It then expects
`#notice-text` to contain `AnnotateApp.READ_ONLY_WRITE`.

**Measured** in the `descending_leaders_take_a_path_that_cannot_cross` review
worktree (integration `4e4582fc` plus that handoff). It failed in the full tier
and again when run alone. That handoff touches nothing under `apps/annotate/`,
and its only hunks in the runner are the topology page's leader-path regexes.
So the red belongs to integration. The likely cause is `c21a06bb` ("a failed
write says its class in fixed words"), the last change to the annotator's
failed-write notice. This is an inference: integration was not run on its own.

Fix: either the notice wording changed on purpose, and the check should read
the new constant, or the read-only path lost its notice. Whoever owns
`a_failed_write_says_its_class` should decide which.
