---
type: bug
priority: med
status: open
area: tests/browser (a press that writes says so at once)
class: real_check_bound_to_live_log_state
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261119_a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits.md
---

# The pitch plate Keep browser suite goes red once Jeff settles the bore's disagreement

`testAPressThatWritesSaysSo` in `scripts/run_viewer_browser_tests.mjs`
(2026-11-19) runs on the real served log. It needs
`pitch_plate_215177_001@pitch_plate_link_attach_bore` to show two sets that
disagree (Jeff's events 0093-0100), so it can press Keep on "faces 1380, 1381".

The suite skips only when the log has never held those two sets. It reads
every `bound` event ever written, not the folded state. Once Jeff presses
Keep or Unbind on that bore in the real log, the old events stay on disk
(the log is append-only). So the skip condition stays false, but the body
no longer reads `disagree`, so no Keep button is found:

- `atOnce` is `null`, and the first `[real]` check fails;
- no event is written, and the second fails.

The suite then goes **red** for every review and batch merge, not
vacuously green. Settling that disagreement is the next thing Jeff is
likely to do on this bore: the previous handoff
(`a_disagreement_is_settled_by_keep_or_let_go`) made it one click, and
this one made the click fast.

This is the same class as
`ISSUE_20261118_the_opposite_pattern_browser_suite_skips_once_jeff_binds_the_tan_link_mounts_side.md`,
and a different failure. That one goes vacuous; this one goes red.

Fix shape: run the suite against a copy of the log, cut at event 0100, or
with any later event on that bore dropped. The probe
`tests/debug_bind_latency_20261119.mjs` already builds a scratch copy. Or
gate the skip on the folded body reading `disagree` before the press. The
two checks' witnesses
(`browser__real-keep-on-the-pitch-plate-s-link-bore-reads-writing-a__ca58e1a9.json`,
`browser__real-it-writes-one-event-holding-faces-1380-and-1381-the__97e5b0e9.json`)
then stay meaningful.
