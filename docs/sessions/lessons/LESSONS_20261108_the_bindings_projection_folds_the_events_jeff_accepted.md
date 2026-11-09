# LESSONS 2026-11-08 — the_bindings_projection_folds_the_events_jeff_accepted

## The confirmed cause

The issue's suspicion was right, and the defect was older than the code it
quoted. Every annotator write numbered its seq off the **projection snapshot**
plus this session. It never looked at the folder.

- The 2026-11-06 accepts (seq 56-59, files `0001_`…`0004_`) were written by
  the code before `36bc255c` (2026-11-07):

  > ```
  > const known = (state.identityProjection && state.identityProjection.built_from_events) || [];
  > const sessionIds = state.sessionEvents.map((e) => e.event_id);
  > return known.concat(sessionIds);      // existingEventFilenames()
  > ...
  > seq: filenames.length + 1,
  > ```

  The page's projection listed 55 events, but 62 were on disk: an agent had
  proposed 0056-0062 after that build. The `0001_` file names come from
  the same code's `nextFilename`, which counted only this session's
  numbered filenames, because event ids never match the numbered pattern.
  The 2026-11-08 05:45Z session (seq 63-71, files `0001_`…`0009_`) is the
  same code against the 11-05 projection (62 events), so it happened not to
  collide.
- `36bc255c` replaced the count with `AA.nextEventSeq(projection, session)`:
  the highest seq the projection embeds. It is still a snapshot, so the
  defect survived. A proposal written after the page loaded, or after the
  last rebuild, is invisible to it.

The fix is `AA.nextEventSeq(projection, session, onDisk)`. `onDisk` is
`storage.listFeatureIdentityEventSeqs()`, which reads each file's **contents**
for `seq`, because names and seqs disagree on the live log. It is implemented
on the folder adapter, on the memory adapter (fixture `featureIdentityEvents`
plus `written`), and on HTTP (delegates to the granted folder; `[]` before a
grant, which a write asks for first anyway). `app.js`'s `nextEventSeq()`
lists the folder on every write.

A race remains, and it is accepted. Two writers listing the folder in the same
instant could still take one seq. Today's writers are one human page and an
agent script that numbers off `load_events`, so this is far narrower than the
stale-snapshot window. If it ever matters, the write has to re-check its seq
at write time; filename bumping does not cover it, because a bump renames the
file and leaves the seq inside it unchanged. The existing check "two sessions
answering the same end get distinct filenames" passes while the seqs collide.

## The tie-break, and why that order is right

`log_order(event) = (seq, created_at, event_id)`. Two events that claim one
seq were each numbered without knowing about the other, so `seq` cannot say
which came first. `created_at` can: it is when each event was actually
written, in UTC and the same ISO shape from both writers. `event_id` is
unique, so the order is total even when timestamps are equal, and it never
depends on filename or directory-listing order. In the live log every
proposal in a colliding pair was written on 11-04 or 11-05, before Jeff's
accept on 11-06, so the proposal folds first. No accept collides with the
proposal it answers.

"Earlier" in the fold's `supersedes`/`ratifies`/`rejects` checks now means
earlier in that order (by position) rather than `seq <`. Without shared
seqs the two mean the same thing.

## What the duplicate accept carried

There are four duplicates, not one. Each 2026-11-06 accept was re-accepted on
2026-11-08, because the first had vanished on reload:

| proposal | first (11-06) | repeat (11-08) | end · face |
|---|---|---|---|
| proposal-0002-pitch_link_length-to | 56 `annotate-1793923957504` | 68 `annotate-1794117497736` | to · 140 |
| proposal-0001-pitch_link_length-from | 59 `annotate-1793924520970` | 69 `annotate-1794117538235` | from · 104 |
| proposal-0014-tan_link_length-from | 57 `annotate-1793924467289` | 70 `annotate-1794117587883` | from · 64 |
| proposal-0015-tan_link_length-to | 58 `annotate-1793924478822` | 71 `annotate-1794117619732` | to · 0 |

In each pair, everything except `event_id`/`seq`/`created_at` is identical:
the same proposal, mesh sha, face, end and `annotate-app:jeff`, and no note.
So no pair disagrees and nothing went to Jeff. The fold keeps the first
answer in `bindings`. The repeat stays in `history` and in
`FeatureIdentityProjection.restated`. Superseding either one supersedes the
answer. Two answers that differ in any field still refuse the log ("answered
twice, differently").

## Binding count, before and after

- **Before:** `bindings.json` built 2026-11-05T22:36Z from 62 events, **0
  bindings**.
- **After:** built from this branch at `8e30dbe56fbf` into the main checkout's
  `data/`, with 75 events and **8 bindings**: both link lengths at both ends
  (the 11-06 accepts above), plus slide bushings ×2 and spindle coaxiality ×2
  from 11-08. Eight `note:` lines name the 4 seq collisions and the 4
  repeats.
- **`data/inbox/feature-identity/` manifest:** `sha256sum *` over its 76 files
  (75 events + README) was the same before and after. The manifest file's own
  hash was `1f00fa55e8d8baa6f285d3fc9816fa5f572e61028b5854b8cc88d8a29c773d00`
  both times, and `diff` reported nothing.

## Not done here, and why

- **The rebuild was run with the builder, not with `rebuild_projections.ps1`.**
  The script runs `$RepoRoot\scripts\`, and the main checkout is on `master`,
  whose builder still refuses the log. So the rail itself only does this after
  the batch merge. Rebuilding every projection in the shared `data/` from a
  handoff branch would also have restamped all of them for every other
  worktree's `[real]` tier. Only `bindings.json` was written, by this branch's
  builder, through the provenance gate (it overwrote a build this tree
  contains). The next master rebuild runs the same code from the rail.
- **Browser witnesses** reached by the `app.js` hunk could not run here:
  `playwright-core` exists only in the main checkout. Those are the two
  `NOT WITNESSED (the tier was red before the mutation)` entries in the
  `--changed-since integration` run, and they belong to the review merge.

## Verification record

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` in the
  **worktree**: `2 failed, 1871 passed, 1 skipped, 2 deselected` in 397 s
  (this pytest has no xdist, so it ran single-process). Neither failure is
  from this change:
  - `test_viewer_js_suite.py`: red by design in a worktree, because the
    `[real]` projections are not there.
  - `test_mutation_witnesses.py::test_every_anchor_resolves_to_exactly_one_place`:
    the `browser__real-and-a-seek-in-the-pane…f697d046` anchor, already red on
    integration. It is filed as
    `ISSUE_20261108_the_pane_seek_witness_anchor_rotted_on_integration_and_reddens_pytest.md`
    and owned by handoff `the_pane_seek_witness_points_at_the_comparison_the_page_now_makes`.
- `node apps/annotate/run_tests.cjs`: 303/303, `[real]` included (it reads
  the main checkout's data).
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack`:
  9/11 witnessed, including the new annotate spec and the three new python
  specs. The 2 browser entries were not run, because `playwright-core` is
  missing in the worktree.
- Not run: the browser TRUTH tier and the viewer `[real]` tier. Both need the
  main checkout, and it is on `master` without this branch.
