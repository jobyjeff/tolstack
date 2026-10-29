---
type: chore
priority: low
status: open
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/active/HANDOFF_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md
---

# A witness gate recorded over budget counts the time it waited for the browser slot

The review merge of `the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances`
ran

    node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack/data/scratch/rv_kinband --changed-since master

It reached 84 of 173 selected entries and witnessed 83 of them, with 89 left
to the sweep. The runner's own clock read **29m04s**, so the
`--budget-min 30` cap held. The shell's wall time was **2050 s**, and that is
what was recorded with `dispatch suite-time record --tier merge`, which
printed `OVER BUDGET by 4m10s`. The difference is time spent queued for the
machine's one browser slot. Another review
(`a_study_is_a_translucent_group_on_the_dag`) held it, and the runner printed
`waiting for browser slot held by …` before it launched anything.

So the overage is contention, not suite growth. Two cheap fixes:

- have the witness runner print its own elapsed time **excluding** slot wait
  on its last line (it already prints `in 29m04s`), and record that number;
  or
- have `suite-time record` accept a `--queued-seconds` field, so the budget
  is judged on the run alone while the queue time stays visible.

There is no per-entry top 15 to give: the runner prints per-entry times, and
none of this run's entries was slow out of line with its tier.
