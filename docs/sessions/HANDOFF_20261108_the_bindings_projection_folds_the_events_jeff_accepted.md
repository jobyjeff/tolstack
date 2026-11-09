---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-08 — the_bindings_projection_folds_the_events_jeff_accepted: the feature-identity builder accepts the live event log, the annotator stops minting colliding seqs, and the rebuild runs the builder

Source: `docs/issues/ISSUE_20261108_four_feature_identity_events_share_a_seq_so_the_bindings_projection_cannot_be_rebuilt.md`
(filed by `model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models`),
routed by the 2026-11-08 triage sweep (`dispatch/docs/sessions/lessons/LESSONS_20261108_triage_sweep.md`).
Baseline: tolstack `master` at `b9c5f229` or later. Scope: `scripts/build_feature_identity_projection.py`,
`apps/annotate/` (event numbering: `AA.nextEventSeq` and the file-name count),
`scripts/rebuild_projections.ps1`, and tests. It runs beside
`the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show`, which is barred
from rebuilding `bindings.json` on purpose. Coordinate through the issue, not that
handoff's files.

**`data/inbox/feature-identity/` is append-only, and it holds Jeff's own accepts.**
Do not rename, renumber, edit or delete any file in it, and do not "repair" it by
hand. Every fix here is in code that reads or writes it. Work on a scratch copy
(by absolute path, outside the repo) whenever you need to try something against
the live 76 files.

## Why this is high

Jeff's 2026-11-06 accepts of both link lengths are silently gone after every
reload. `bindings.json` (dated 2026-11-05) holds 34 proposals with zero bindings,
and the annotator reads it on every load. Nothing goes red, because
`rebuild_projections.ps1` never runs this builder. Model v2 reads v1's bindings
through `ids_from`, so it has nothing to read either.

## Deliverables

1. **Confirm the cause first.** The issue suspects that the annotator numbers its
   next event off the stale projection plus the session, not off the events on
   disk. Confirm or refute this from `apps/annotate/`, and quote the code path in
   the lesson.
2. **Make the annotator mint a seq nothing on disk already holds.** Number off the
   events directory (or whatever the confirmed cause says), for both the folder
   adapter and the memory adapter. Add a test that seeds a directory with a
   higher-seq proposal than the projection knows, and asserts the next accept does
   not collide.
3. **Make the builder fold the log that exists.** The four colliding pairs are on
   disk for good, so the builder must order them deterministically without
   renaming anything. Use a tie-break on the event's own id or timestamp, and
   write down why that order is right. Then the duplicate answer: Jeff accepted
   `proposal-0002-pitch_link_length-to` twice (`annotate-1793923957504-…` and
   `annotate-1794117497736-…`), because the first was lost on reload.
   - If the two events carry the same answer, fold them as one, idempotently.
   - If they disagree, **stop**. Report both in the issue as `needs: jeff`, and do
     not pick one; which answer stands is Jeff's call.
   - Either way, a collision the builder resolves is printed. It is not swallowed.
4. **Put the builder on the rebuild.** Add it to `scripts/rebuild_projections.ps1`,
   so a log it refuses turns the rebuild red instead of leaving a stale
   `bindings.json`. Rebuild in the main checkout, then confirm that
   `bindings.json` now carries Jeff's link-length bindings. Quote the binding
   count before and after.

## Definition of done

- `bindings.json` in the main checkout is rebuilt by `rebuild_projections.ps1`
  from the unmodified live log. It contains the 2026-11-06 link-length
  accepts. `data/inbox/feature-identity/` is byte-identical before and after:
  quote a before/after manifest.
- The default tier is green, run as `CLAUDE.md` spells it in the main checkout,
  together with `node apps/annotate/run_tests.cjs`. A guard you add is enrolled
  with a mutation spec, as `CLAUDE.md` requires.
- Lesson (`docs/sessions/lessons/LESSONS_20261108_the_bindings_projection_folds_the_events_jeff_accepted.md`)
  covers the confirmed cause, the tie-break, what the duplicate accept carried,
  and the binding count before and after.
