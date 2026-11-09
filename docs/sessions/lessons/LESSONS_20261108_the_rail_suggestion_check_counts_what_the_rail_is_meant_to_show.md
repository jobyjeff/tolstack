# LESSONS 2026-11-08 — the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show

## What was wrong: the check, by content

Opened the annotator exactly as section 5 does (`?embedded=1&topology=vpa_pitch_linkage`,
real reads) and dumped the rail at the moment the check read it. Its head was
**"all 27 interfaces — no study scopes them"**: model v2's rail (`vpa_end_stop_v2`),
not v1's 99. 15 is exactly the number of v2's 27 edges with an open proposal, and
all 15 read suggested, so the rail itself, including the `ids_from` read-through,
is right.

Mechanism: `loadAll()` runs `selectFirstTopology()` and only later
`runPendingDeepLink()`. Since `d0863681` (in_model_order), the first model is v2,
and v2 is **studyless**. The check waited for "a studyless head and some rows",
on the theory that only the deep link's whole-topology view has one. That stopped
being true when the default model became studyless, so the wait matched the
boot's rail. `.catch(() => {})` on the wait meant a wrong rail was never a timeout.
It looked deterministic because the deep link reliably lands after the first read.

Fix: wait for the head `AA.studylessHead(<this topology's edge count>)` and put
the head equality into the check's condition. The comparison is stricter now,
not looser. The witness `…f2976b67` (goto lands on a study) is still WITNESSED.

**Shape worth grepping for next time:** a browser wait that identifies "the view
I asked for" by a property the *default* view can also have. Any new default
(model, study, mode) silently satisfies it. Key the wait on something only the
requested view has: its own count, its own id.

## Deliverable 2: the class (a `[real]` check first ran on trunk)

Three gaps, in order of cost to close:

1. **A skip rides inside a green total.** A `[real]` sub-check with no data
   pushes `"... (skipped: ...)"` as `true`, so the review's 19/19 and a real
   19/19 print the same. **Closed here, cheapest:** the runner now ends with a
   `SKIPPED -- N sub-check(s) passed without running (no data under <root>):`
   block naming each one. A reviewer whose diff touches the annotator can see
   that its own surface's real check did not run. This is a print, not a gate.
   It does not change any exit code, so it needs no mutation spec.
2. **The review ran on a data root with no `bindings.json`.** This is a
   question of which `--repo` the reviewer passes. With the block from (1),
   the record shows it. Making the review prompt *require* the SKIPPED block to
   be empty for suites the diff touches would be a prompt change outside this
   handoff's scope. Left to (1)'s visibility for now.
3. **The batch merge cannot run browser tiers on the candidate** (no
   `node_modules`). This is the most expensive to close and is by design (tolstack
   `CLAUDE.md`).

Note that even with (1)-(3) closed, the review run would have been **red**, not
skipped, if it had had the data. The defect was a race in the check, introduced
by v2. So the real fix for this instance was (2): the data root.

## Gotchas

- From a worktree, a junction `node_modules -> C:\workspace\tolstack\node_modules`
  (gitignored) lets the worktree's own browser runner and witness runner run
  with `--repo C:\workspace\tolstack`. You can then iterate on tracked test code
  without touching the main checkout.
- `pytest -n 16 --dist loadfile` (the dispatch budget's stated parallelism) fails
  here: no xdist in `venv-win`. The suite runs single-process.
