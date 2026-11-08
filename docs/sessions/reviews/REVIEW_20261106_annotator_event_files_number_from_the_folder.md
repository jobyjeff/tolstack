---
verdict: APPROVE
---

# Review — annotator_event_files_number_from_the_folder

**APPROVE.** Branch `handoff/annotator_event_files_number_from_the_folder` (one commit) merged into `review/...`; integration was already contained.

- Numbering: `AA.nextEventSeq` = max(`seq` embedded in the projection's stack_keys, `built_from_events.length`, session seqs) + 1; filename = `eventFilename(seq, slug)`, so prefix and `seq` agree. All four call sites (bind, answer, flip, owner-not-in-set) use it, replacing `filenames.length + 1`.
- Never overwrites: FSA and memory adapters bump the prefix while the target exists and return the name written; the banner reports the real name.
- Tests: annotate 296/296; `--changed-since integration` witness run 5/5 WITNESSED (with `node_modules` junctioned from the main checkout for the browser entries; first attempt without it reported "tier red before mutation" for two browser entries, an environment artefact). Enrollment/lesson pytest checks pass. Viewer tier 544/545, the one red being the known worktree projection-freshness check.

## Notes (not blocking)
- DoD asked for one real bind in the served annotator; the lesson says it was not done (served page runs main-checkout code; folder picker needs a person). Operator check after batch merge: a bind should land as `0063_…` or later.
- When a write is bumped, the file prefix moves past the event's own `seq` (stale-projection race only); the filename stays unique, `seq` may then repeat across two sessions. Acceptable under the handoff's scope.
