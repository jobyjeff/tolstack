---
type: feature
priority: low
status: deferred
defer_until: 2026-12-21
resolution: deferred 2026-11-21 (triage) -- low, the default knob; the class's program (a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits) has landed, so a date, not the class
area: annotate / feature-identity write path
reporter: agent
audience: strategy
class: annotate_write_latency
found_by: docs/sessions/HANDOFF_20261119_a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits.md
---

# The first write of a page still opens every event file to find the next seq

After `a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits`
a write opens only the event files that are new since the page last read the
inbox. The **first** write after the folder is granted still opens every file
once (`FsaAdapter._readEventFiles`, cold). The reason is that an event's `seq`
is only in its file: a filename's number is not its seq (the live log has
`0001_…` holding seq 56, and the writer bumps a taken name).

Measured on Jeff's 101-file log, pitch plate Keep, scratch copy, the probe's
folder grant (each folder call an HTTP round trip, which the real grant is
not):

| page | the cold read | press → event on disk |
|---|---:|---:|
| settled (the pane has opened its model) | 2.3–2.6 s | 2.7–3.0 s |
| still loading meshes (the walk's timing) | 4.8–9.5 s | 7.9–10.7 s |

Every later write in the page: 0.1–0.6 s to disk.

## Options (none taken; a design call)

1. **The served log names each event's file.** `log.json` is one file through
   the grant; with `{file, event}` rows (or a `files` map beside `events`) the
   first write reads that one file plus the listing, and opens only the
   names the served log does not have. Needs `feature_identity.write_served_log`
   and `AA.servedLogDoc` to agree on the field, and the fold to ignore it.
2. **Warm the cache once a grant already stands**, at page load, in the
   background (a persisted `granted` permission). Does nothing for the first
   grant of a session, which is asked for inside the press.
3. **Leave it.** Through the real grant (in-browser calls, not HTTP) the cold
   read is likely well under the probe's figure; it was not measurable
   headless.

Recommendation: 1, if the walk on the real grant still shows a slow first
press; otherwise 3.
