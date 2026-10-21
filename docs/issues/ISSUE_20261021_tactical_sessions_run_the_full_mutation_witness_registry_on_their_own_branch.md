---
type: chore
priority: med
status: triaged
handoff: docs/sessions/HANDOFF_20261021_browser_runners_take_the_slot_and_free_the_box.md
area: scripts/mutation-witness
reporter: strategy
class: unbounded_load_on_the_shared_workstation
found_by: dispatch/docs/sessions/HANDOFF_20261021_browser_runs_take_one_machine_slot.md
---

# Tactical sessions run the full mutation-witness registry on their own branch — 65 minutes each, concurrently

`CLAUDE.md` says the mutation-witness tier is "the slow one (a browser, the
whole registry, tens of minutes), which is the argument for running it at
the merge and not per-branch". On 2026-10-20 two tactical sessions ran the
**full registry** anyway, on their own branches, the same evening:

- `LESSONS_20261020_the_3d_pane_opens_in_the_mode_the_study_wants.md`:
  `node scripts/run_mutation_witness_tests.mjs --repo <scratch>`, full
  registry, **237/237 witnessed, 3916 s wall**.
- `LESSONS_20261020_the_sweep_rail_shows_the_mechanism.md`: the same full run
  against a scratch root.

Jeff saw "over an hour per agent" and could not tell what the tier was for.
Two full registries plus other browser tiers at once on one workstation is
also how the timeouts that get misread as flakes are made.

What a tactical session needs is the specs it added or touched —
`--only <guard>` per new spec (the 3D-pane session ran exactly that too:
18 specs, 24/24 mutations). The full sweep is the merge's job, once.

Suggested fix (for the session that takes this):

- Say it in the tactical-facing place an agent actually reads before
  running tiers — this repo's `docs/prompts/` override or the browser-tier
  bullets in `CLAUDE.md`: per-branch = `--only` for the guards you added or
  changed; never the full registry.
- Consider making the runner refuse a full-registry run outside the main
  checkout unless `--full` is passed, printing the `--only` names it would
  have needed. A rule a runner enforces outlasts one a prompt states.
- Once dispatch's `browser_runs_take_one_machine_slot` merges, the runner
  takes the `browser` slot (see
  `ISSUE_20261021_a_browser_diagnostic_held_thirteen_cores_for_twenty_minutes_and_a_cpu_burner_ran_on_the_shared_workstation.md`),
  so even the merge's full run cannot overlap another browser tier.
