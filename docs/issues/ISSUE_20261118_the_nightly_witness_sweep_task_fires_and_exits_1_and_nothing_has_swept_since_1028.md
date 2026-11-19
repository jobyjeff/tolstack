---
type: bug
priority: med
status: open
area: witness-sweep
reporter: agent
found_by: dispatch/docs/strategy/HANDOFF_20261117_strategy.md
---

# The nightly witness sweep task fires and exits 1, and nothing has swept since 10-28

Read over SSH on the server laptop `LXW-1R97Z33`, 2026-11-18 about 17:40 PST.
Nothing was changed.

| Fact | Reading |
|---|---|
| Scheduled task `DispatchJob_tolstack-witness-sweep` | Ready, Interactive logon, last run 2026-11-18 01:00:01, **last result 1**, next 2026-11-19 01:00 |
| Its action | `powershell.exe … -File C:\workspace\dispatch\scripts\run_job.ps1 -Job "tolstack-witness-sweep" -Port 8765` |
| `run_job.ps1` exit codes | 2 = no board credential or no response; **1 = the board answered and did not start the job** (line 62); 0 = started |
| Last sweep row, `C:\workspace\tolstack\data\witness_sweeps.jsonl` on that laptop | 2026-10-28T23:27Z, sha `04266cf5`, "426/460 witnessed in 115 min, 34 decayed" |
| That laptop's checkouts | dispatch `1669705` (2026-10-27), tolstack `8553811` (2026-10-28) |
| The laptop's board | `dispatch serve` on `0.0.0.0:8765`, running since 2026-10-27, answers `401` to an unauthenticated request in 0.1 s |

So the job has asked the laptop's own board to start a sweep every night and
been refused, and the refusal reaches nobody: the only trace is the task's
last-result code. The whole-registry sweep is the one place a decayed witness
that `--changed-since` cannot select is caught (`CLAUDE.md`, the 2026-10-26
paragraph), and it has not run for three weeks while tolstack landed several
chains.

Not established here: what the board's refusal says (the response body was not
read; it needs the board credential), and whether the laptop is still the
right machine for the sweep at all. Its tolstack is three weeks behind
`master`, so a sweep started there today would sweep an old tree. That second
question belongs with the server laptop's flip
(drawing-checker `ISSUE_20261117_the_server_laptop_never_flipped_and_the_workstation_bakes_the_shared_site.md`).

Wanted: the reason for the refusal, read once; then either the sweep runs
nightly on a current tree and its result is visible on the board, or the task
is removed and the sweep is scheduled where the current tree lives.
