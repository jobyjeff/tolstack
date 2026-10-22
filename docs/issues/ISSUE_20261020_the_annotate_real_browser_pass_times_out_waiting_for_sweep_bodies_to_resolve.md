---
type: bug
priority: med
status: resolved
area: apps/annotate/run_browser_check.mjs
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_annotator_rail_resizes_and_names_what_it_lists.md
handoff: docs/sessions/HANDOFF_20261021_browser_tiers_name_their_failure_instead_of_aborting.md
resolution: handoff completed 2026-10-21 -- closed automatically by dispatch when handoff `browser_tiers_name_their_failure_instead_of_aborting` moved to completed/; not independently verified.
---

# `run_browser_check.mjs --real <run>` times out waiting for the sweep's bodies to resolve

`node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261016-235852`
passes every check up to and including `[real] \`sweep latest\` opens the run
with the newest ts`, then dies in `realPass` at
`page.waitForFunction(() => window.__sweep && window.__sweep.bodies.length > 0, null, { timeout: 600000 })`
with a `TimeoutError` — the whole 600 s elapse and nothing after it runs.

Measured 2026-10-20 on **both** the handoff branch and a clean `git archive` of
its `HEAD` (the baseline integration tree, before any change in that handoff),
from the main checkout's `node_modules`, headless Chrome with SwiftShader. So it
is not this handoff's change. Either the bodies of the 16 October run no longer
resolve at all (`anchorSweepBodies` throwing or never assigning `sweep.bodies`),
or the pass is slower than its timeout on this machine. The first useful step is
to print the banner and the page errors in the timeout path — the existing
`catch` only covers the earlier `__sweep.frame` wait.

Nothing after that wait (body placement residuals, playback rates, the `[real]`
screenshots) has been exercised by this tier since.
