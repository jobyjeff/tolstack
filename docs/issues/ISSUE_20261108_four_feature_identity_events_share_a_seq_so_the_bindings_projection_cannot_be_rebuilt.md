---
type: bug
priority: high
status: triaged
area: feature-identity
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models.md
handoff: docs/sessions/HANDOFF_20261108_the_bindings_projection_folds_the_events_jeff_accepted.md
---

# Four feature-identity events share a seq, so the bindings projection cannot be rebuilt

`scripts/build_feature_identity_projection.py` refuses the live event log
(measured 2026-11-08 against the main checkout's `data/inbox/feature-identity/`,
76 files):

```
ValueError: events 'annotate-1793923957504-pitch_link_length' and
'proposal-0056-pitch_plate_slide_bushings_to_piston_body-from' share seq 56
```

Four collisions, each an annotator accept from 2026-11-06 against an agent
proposal written days earlier:

| seq | Jeff's event (annotate-app) | the proposal it collides with |
|---|---|---|
| 56 | `0001_pitch_link_length_accepted.json` | `0056_pitch_plate_slide_bushings_to_piston_body_proposed.json` |
| 57 | `0002_tan_link_length_accepted.json` | `0057_pitch_plate_slide_bushings_to_piston_body_proposed.json` |
| 58 | `0003_tan_link_length_accepted.json` | `0058_pitch_plate_attach_radius_proposed.json` |
| 59 | `0004_pitch_link_length_accepted.json` | `0059_pitch_plate_attach_height_proposed.json` |

Renumbering Jeff's four in a scratch copy only moves the refusal on: the fold
then reports `proposal-0002-pitch_link_length-to` answered twice
(`annotate-1794117497736-pitch_link_length` and
`annotate-1793923957504-pitch_link_length`).

**What it costs.** `data/projections/feature-identity/bindings.json` is dated
2026-11-05 and holds proposals only — every one of its 34 records has zero
`bindings`. The annotator reads that file on every load (the folder adapter
too: `apps/annotate/storage/fsa.js` reads the projection and folds only this
session's events on top), so Jeff's 2026-11-06 accepts of both link lengths
are gone after a reload, and nothing says so. `scripts/rebuild_projections.ps1`
does not run this builder, which is why nothing has gone red.

**Likely cause, unconfirmed.** The annotator numbers its next event off the
projection plus this session (`AA.nextEventSeq`), and the projection it read
was older than the proposals already on disk; its file names (`0001_…`) are
its own count too. Worth checking against the events directory itself rather
than the projection.

Found while building model v2's 3D shots: v2 reads v1's bindings through
`ids_from`, and there were none to read.

## 2026-11-08 — fixed on `handoff/the_bindings_projection_folds_the_events_jeff_accepted`

- **Cause confirmed.** Every annotator write numbered its seq off the
  projection snapshot it loaded plus its own session, never off the folder.
  The 2026-11-06 session ran the pre-`36bc255c` code
  (`seq: filenames.length + 1` over `built_from_events`), against a projection
  that held 55 events while 62 were on disk, so it took 56-59. Its files are
  named `0001_`… for the same reason: that code counted only this session's
  own numbered filenames. The current `AA.nextEventSeq` still read only the
  projection and the session. It now also reads the seq of every event in the
  folder (`listFeatureIdentityEventSeqs`, on the folder, memory and HTTP
  adapters).
- **Both duplicate answers agree, so this is not a `needs: jeff`.** There are
  four pairs, not one: 2026-11-06 accepts 56/59 (pitch link `to`/`from`) and
  57/58 (tan link `from`/`to`) were each re-accepted on 2026-11-08 as 68/69 and
  70/71. Each pair names the same proposal, face, end and reviewer, with no
  note, so the fold keeps the first and records the second as a repeat.
- `bindings.json` in the main checkout went from 0 to 8 bindings. The event log
  is byte-identical before and after.
