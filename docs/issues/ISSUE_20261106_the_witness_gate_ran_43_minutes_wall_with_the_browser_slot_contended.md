---
type: chore
priority: med
status: open
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/HANDOFF_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md
---

# The witness gate ran 43 minutes of wall time while the browser slot was contended

- **Measured:** 2559 s wall (42m39s) against the merge tier's 30-minute budget,
  on 2026-11-06, in a worktree.
- **Spelling:** `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack-worktrees/a_part_with_many_interfaces_is_drawn_as_a_component_with_pins`
- **The runner's own figure** was "43/46 witnessed, 46/48 reached in 28m50s;
  2 left to the sweep". So its `--budget-min` cap held. The remaining ~14
  minutes of wall time were spent waiting for the machine's one browser slot,
  which three other tolstack worktrees were using at the time.
- **The question:** should the budget be read against the runner's own
  clock or against wall time? Should the cap count slot waits?

Top entries by the runner's own per-spec timing (seconds, spec):

```
366s browser__hovering-the-dag-s-own-bar-previews-the-edge-s-record__f672ece0
181s browser__real-every-leader-s-two-ends-land-on-its-moved-dot-and-i__5516955a
117s browser__real-the-kinematic-page-s-model-has-no-box-of-its-own-th__68054cae
59s browser__real-colouring-by-body-puts-the-overlay-s-ink-on-the-dag__211510a9#1
52s fast__a-bar-says-only-lit-or-unlit-it-wears-no-confidence-a-ga__174c5992#1
47s browser__real-a-chain-study-as-blocks-every-grid-row-has-its-mark__936ee1bb
29s browser__real-a-pin-is-what-the-pointer-finds-at-its-own-centre__02f44328
28s browser__real-the-lit-set-lands-on-screen-and-every-block-is-insi__d517b444
27s browser__real-kinematic-page-as-blocks-its-blocks-and-pins-are-dr__d10e4e7f
27s browser__real-every-chain-edge-is-drawn-lit-a-bar-or-a-chord-one__462f3391
26s fast__a-body-in-several-blocks-around-the-band-is-one-containe__3d8f6ad3#3
25s fast__real-drawn-as-blocks-every-committed-topology-s-whole-wa__b4017440
25s fast__a-walk-s-rails-and-links-re-derive-from-its-rows-alone-e__c594e8b0
25s browser__real-the-whole-walk-as-blocks-a-part-is-one-block-every__c72cbb66
24s fast__the-overlay-s-ink-rides-on-the-bar-the-dot-and-the-glyph__e6cb016b
```

## Update 2026-11-06 (review round 1 rework)

Both suites were recorded over budget again, and pytest joins this issue.

- **Witness gate**, `--changed-since integration`, on the merged tree:
  - "46/48 witnessed, 48/52 reached in 30m35s; 4 left to the sweep", with
    1868 s of wall time, recorded **over budget by 1m08s**.
  - The cap held, and the four it left are browser entries.
  - The two not witnessed were both mutations of
    `fast__the-selected-study-s-group-is-drawn-last-and-a-step-stro__ddfb64d3`,
    reported as "the tier was red before the mutation". Re-run alone with
    `--only` straight afterwards, it was **WITNESSED in 1m02s**. The cause
    of the red clean run was not found.
- **Full `pytest -q`**:
  - **1733 passed in 750 s**, recorded **over budget by 2m30s**, on a box
    other worktrees were also using.
  - An earlier run in this rework took 1109 s (over by 8m29s). It overlapped
    this worktree's own browser tier and a fast tier slowed by a `[real]`
    check, since made cheaper (the lesson's round-1 gotchas).
