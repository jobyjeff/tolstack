---
type: chore
priority: med
status: resolved
area: scripts/mutation-witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_viewer_nav_verdict_into_alert_and_icon.md
handoff: docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md
resolution: handoff completed 2026-09-23 -- closed automatically by dispatch when handoff `mutation_witness_repair_and_enrollment` moved to completed/; not independently verified.
---

# The nav status-icon guards have no `mutation_witnesses.json` entry — two rows are paste-ready and were measured in review

`HANDOFF_20260922_viewer_nav_verdict_into_alert_and_icon.md` added roughly ten
new guards across the two viewer tiers — the fast tier's `VA.NAV_VERDICT_LEVELS`
/ `VA.navStatusLevel` / `VA.stackVerdict` / `VA.stackNavAlerts` tests and the
`[real]` leaf-row pin (`apps/viewer/tests.js`), and four new browser sub-checks
in `scripts/run_viewer_browser_tests.mjs`'s `[topology …]` block (size, border,
two-colour, placement). **None has a standing entry in
`scripts/mutation_witnesses.json`**, which is 96 entries today and none of them
about this rail's mark.

Same shape as `ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry`
and `ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_entry`:
the hand check exists in that session's lesson and in the review report, and
nowhere a runner repeats it.

## Two rows measured in review 2026-09-22, against the merged tree

Both were planted, run and reverted while reviewing
`review/viewer_nav_verdict_into_alert_and_icon`, so neither is transcribed off
a table (`docs/prompts/REVIEW_AGENT.md`, "A lesson's 'measured, not proposed'
mutation claim still decays").

**1. The mark stays at the end of its row — the browser-only defect.** This is
the one no shim tier could have caught: `.navtree__row`'s inherited
`flex-wrap: wrap` puts the icon on a third line, left-aligned under the name,
on every row whose title needs two lines. Markup, classes and the shim's
geometry are identical either way.

```
"file":   "apps/viewer/topology.css",
"find":   ".navtree__row--study, .navtree__row--stack { flex-wrap: nowrap; }",
"replace": "",
"tier":   "browser",
"suite":  "topology file://",
"expect_red": "the mark stays at the end of its row"
```

Measured: `[topology file://] 211/212 sub-checks passed: FAIL`, one
`FAIL sub-check:` line, and it prints the two offending rows by name
(`Blade OML angular position, full-sweep-a | Blade OML angular position,
worst-case s`). No other sub-check moved. Note `expect_red` is matched as a
substring, and the rendered label ends with a live row count
(`…including on the 2 rows whose name needs two lines`), so the declared string
must stop before it.

**2. A stack's verdict excludes its sensitivity probes.** The care the handoff
identified: a probe is the same check with an undocumented input moved, and the
stack page stamps it `NOT A RESULT`. Drawing a row red on a what-if is "true of
the model, false of the hardware".

```
"file":   "apps/viewer/topology.js",
"find":   "      return !check.sensitivity;",
"replace": "      return true;",
"tier":   "fast",
"suite":  "viewer",
"expect_red": "a stack's verdict is its worst RESULT check"
```

Measured: fast tier `486/488`, two named reds — the `VA.stackVerdict` test and
`a failing stack row is drawn in the one colour this rail spends on failure`.
Worth knowing before declaring it: the `[real]` leaf test does **not** move,
because m1's probes are themselves `fail` and m2's worst probe verdict is
`marginal`, so live data cannot discriminate here. The synthetic
`PROBE_FAIL_STACK` fixture is the only thing that can.

## Not paste-ready

The legibility / border / two-colour checks all read computed style off the
same `.navstatus` rule block, so a single mutation reddens several at once and
`expect_red` would need care about which fires first. Worth a row, but it needs
a deliberate choice of anchor rather than a transcription.
