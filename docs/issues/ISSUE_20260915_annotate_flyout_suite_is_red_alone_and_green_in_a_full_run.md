---
type: bug
priority: med
status: open
area: tests/browser-tier
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md
---

# `--only "annotate flyout"` aborts on a strict-mode violation — the suite the mutation tier would have to run alone is mostly red alone, and green in a full run

Found while reviewing `mutation_witness_tier_repair`. **Not caused by that
work** — reproduced identically against the `integration` baseline (see below),
and the branch only changes how that suite receives its label.

`scripts/run_viewer_browser_tests.mjs --only "annotate flyout"` aborts before
any sub-check runs:

```
[annotate flyout (repo-root mount + file:// degradation)] ERROR: locator.click:
  Error: strict mode violation: locator('tr.tvrow[data-id=\'arm_pin_to_tip\'] .tvcell--name')
  resolved to 2 elements:
    1) <td title="arm pin to tip" class="tvcell tvcell--name">pin to tip</td>
    2) <td title="arm pin to tip" class="tvcell tvcell--name">pin to tip</td>
0/1 browser checks passed (--only "annotate flyout")
```

`arm_pin_to_tip` is a **fixture** edge (`apps/viewer/fixtures.js`,
`demo_mechanism`), so this is the `?mock=1` page rendering that row twice —
two `tr.tvrow` with the same `data-id`, which the page's own row identity says
cannot happen. Whatever produces the second row is the defect; the strict-mode
violation is just the first thing to notice it.

## Measured, 2026-09-15, Chrome 152.0.7977.83 via `channel: 'chrome'`

| run | result |
| --- | --- |
| full 19-suite run, bare, projection present | **19/19**, `annotate flyout` 18/18 |
| `--only "annotate flyout"`, six runs | **1 pass, 5 ERROR** as above |
| `--only "annotate flyout"` against `integration` (`git archive integration` into `tmp/`, app source from there, `--repo` at this tree) | **ERROR**, byte-identical message |

`data/meshes/` present or absent makes no difference (both states observed
failing), so the missing-mesh hypothesis is out.

## Why this is worth med and not a flake nit

The mutation-witness tier runs suites **one at a time** — that is the whole
point of `mutation_witnesses.json`'s `suite` field ("so one mutation costs one
suite rather than a full run"). A suite that only passes in a full run cannot
carry a declared witness at all: the runner's clean run would come back RED and
every entry naming it would be reported `SKIPPED: the tier is already red with
NO mutation applied`. Today no entry names `annotate flyout`, so this costs
nothing yet; the moment someone declares one — and
`annotate_hosted_page_posture` is staged against that very area — it is a
dead entry with a confusing message.

It also means "green in a full run" is not the same claim as "green", for at
least one suite, which is worth knowing before the next review trusts one.

## Note for whoever takes it

The pass/fail split by run mode is the lead: something an *earlier* suite does
makes the duplicate row not happen (or not be reached). Candidates worth
eliminating in order: a render that runs twice on the mock boot (the second row
is a second render, not a second edge — the projection has no
`arm_pin_to_tip` at all, and `fixtures.js` declares it once); the repo-root
server's page being loaded before its first paint settles; and state carried in
the shared `browser` object across suites. Two prior issues in this suite
(`ISSUE_20260911_annotate_flyout_banner_check_samples_a_transient.md`,
resolved) were wait-predicate transients — this one is not: it is deterministic
enough to reproduce five times in six.
