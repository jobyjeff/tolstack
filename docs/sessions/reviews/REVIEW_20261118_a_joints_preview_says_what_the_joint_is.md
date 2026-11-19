---
verdict: APPROVE
handoff: a_joints_preview_says_what_the_joint_is
branch: handoff/a_joints_preview_says_what_the_joint_is
---

# Review — a_joints_preview_says_what_the_joint_is

**Verdict: APPROVE.**

## What I checked
- Kind chip: `VA.ELEMENT_KIND_WORDS` is built with `VOCAB.table` over the generated `NODE_KINDS` and `EDGE_KINDS`, so a kind added in Python and named nowhere throws on load. A fast test walks both lists, and the node/edge Preview chips and `.chip--word` CSS use it.
- Notes: history openings and handoff slugs are gone from every node and edge note in both topologies. `BANNED_AS_HISTORY` extends the existing banned-string guard. It reads slugs from the board's own `HANDOFF_*.md` names and has a self-test that it sees what it bans. Choosing "rewrite, not fold" is recorded with its reason in the lesson.
- Part notes are out of scope and were filed (`ISSUE_20261118_part_notes_carry_dates_and_run_ids_on_the_hover_card.md`). Both source issues are `resolved` with a `resolution:`.
- Shots at 1920 and 3840 are in the lesson's `shots/`. I viewed the 1920 shot: chips read "mating surface · rotary · 3 edge(s)" and the note carries no history.
- Guard enrollment: the fast count 601 -> 602 is pinned and one mutation spec was added.

## Verification (review worktree, after merging the handoff)
- pytest on topology prose, topology, JS vocabulary and mutation-witness tests: 1030 passed.
- `node apps/viewer/run_tests.cjs`: 502/502 (node-fs tier skipped: no projection in a worktree).
- `node apps/annotate/run_tests.cjs`: 324/324.
- Witness `--only` for the new guard, run in the worktree: 1/1 witnessed. The tactical lesson reports this red from a worktree. A run with `--repo C:/workspace/tolstack` is also red, because that checkout lacks the change.

## Not run here
- The browser tier, which needs the main checkout. The branch changes one browser-suite assertion (`/mating_surface/` -> `/mating surface/`), which matches the viewer test change. The batch merge's whole-tier run covers it.

## Findings
None blocking.
