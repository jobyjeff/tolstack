---
type: bug
priority: high
status: open
area: scripts/browser-tier
reporter: strategy
class: unbounded_load_on_the_shared_workstation
found_by: dispatch/docs/sessions/HANDOFF_20261021_an_agent_session_runs_in_a_job_below_the_desk.md
---

# A browser diagnostic held thirteen cores for twenty minutes, and a CPU burner ran on the shared workstation

On 2026-10-21 the session `browser_tiers_name_their_failure_instead_of_aborting`
froze Jeff's workstation twice: the dispatch board would not load, every other
agent stalled, and his own browser tabs hung. All times PDT.

| when | what the session ran | effect |
|---|---|---|
| 10:18:45 | `node <scratchpad>/burn.cjs 40 100` — a load generator it wrote: forty busy-loop children for 100 s, then `run_viewer_browser_tests.mjs --only "topology file://"` under it | board scan 0.7 s → 6 s |
| 10:27:44 | `realdiag.py` (scratch) around `apps/annotate/run_browser_check.mjs` | headless chrome 18376: 11,811 CPU-s; board `GET /` 432 s; no agent made progress 10:27:55–10:43:55 |
| 10:46:10 | the same diagnostic again | chrome 37192 at ~1,280 % CPU (≈13 of 32 cores); **still running at 11:10, 24 min after its 600 s cap, its node parent gone**, 18,506 CPU-s |

Three separate things, one incident:

1. **The annotate check's renderer can spin a whole box.** The wait is
   `page.waitForFunction(() => window.__sweep && window.__sweep.bodies.length > 0, null, { timeout: 600000 })`;
   while it waits, the page burns ~13 cores. Find what the page is
   computing (software WebGL, a sweep solve, a polling loop) and bound it:
   a smaller fixture, a lower cap with a named failure, or a launch flag. A
   ten-minute wait that takes the box with it is the wrong default either
   way.
2. **A runner that exits leaves its Chrome running.** Chrome 37192 outlived
   its node runner by 20+ minutes. The runners should close the browser in
   a `finally` (and on signals), not only on the success path. Dispatch's
   job handoff will kill the tree at session end and its slot handoff at
   slot release, but the runner should not rely on either.
3. **Synthetic load on the shared box.** `burn.cjs` is a reasonable idea on a
   dedicated machine and a harmful one here: this workstation runs Jeff's
   live apps and every agent. Dispatch's
   `browser_runs_take_one_machine_slot` adds the rule to every agent prompt;
   this repo's `CLAUDE.md` should say it too, next to the browser-tier
   bullets, because the browser-tier work is what invites it.

**Adoption, once dispatch's `browser_runs_take_one_machine_slot` merges:**
`scripts/run_viewer_browser_tests.mjs`, `apps/annotate/run_browser_check.mjs`
and `scripts/run_mutation_witness_tests.mjs` run under
`dispatch slot run --class browser -- …` (or wrap themselves: re-exec under
the slot unless `DISPATCH_SLOT_HELD=browser`). That handoff's lesson records
the exact command line to use from a worktree.

**Follow-up the same day (11:27 PDT):** after Jeff killed the 10:46 tree,
the session relaunched the diagnostic at 11:27:50 within three minutes (a
`sed`-shortened timeout, the same page) and a new renderer took ~12.7 cores
again; the session's pane then stopped answering Esc, and stopping it took an
admin `Stop-Process` on its `claude` pid. Two facts for whoever fixes this:
the runners launch the **installed Google Chrome** (`channel: 'chrome'`,
headless, own profile), so an agent's browser is the same `chrome.exe` as
Jeff's and cannot be told apart by path from an admin shell (only by
ancestry or by the service context hiding it from an unelevated one); and
Jeff's own Chrome tabs hung while CATIA stayed responsive.

Evidence: `~/.dispatch/logs/dispatch.log` 10:12–10:46; the session transcript
under `~/.claude/projects/C--workspace-tolstack-worktrees-browser-tiers-name-their-failure-instead-of-aborting/`;
process ancestry read at 10:47
(`chrome 37192 ← chrome 21628 ← node 27836 ← python 9628 ← … ← claude 46180 ← DispatchServer`).
