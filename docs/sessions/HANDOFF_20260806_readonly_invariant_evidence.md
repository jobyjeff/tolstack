---
priority: medium
depends_on: []
---

# HANDOFF 2026-08-06 — readonly_invariant_evidence: give "drawing-checker is read-only" something it can actually be checked against

Source: `docs/issues/ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth.md`,
filed by the `pitch_link_stack` review and routed by the 2026-08-06 triage sweep.
Baseline: `master` @ `de7f7f1`. Scope: `docs/prompts/REVIEW_AGENT.md`, the SOP,
a small session-snapshot helper under `scripts/`, and the `joint` block's run
metadata **only insofar as it records a timestamp**. Do NOT restructure the
citation/export provenance shape — that is the parallel staged handoff
`citation_export_provenance`, and the two must not both redesign `joint`. Read
its handoff first and coordinate: if it lands first, extend its structure rather
than adding a competing field.

## The defect

`docs/prompts/REVIEW_AGENT.md` (Architectural errors) says:

> **drawing-checker is read-only and one-way.** Nothing here writes there; check
> its `git status` is unchanged by the work.

`git status` cannot detect the writes that matter. Everything drawing-checker's
pipeline produces is gitignored there:

```
$ git -C C:/workspace/drawing-checker check-ignore -v data/runs/20260804_114000_...
.gitignore:49:data/runs/*   data/runs/20260804_114000_...
```

So a tolstack session that ran drawing-checker's pipeline — creating a run
directory, re-rendering page images, or dropping a file into
`data/inbox/drawings/` — would leave `git status` **completely clean**. The
prescribed check passes vacuously. Both the `tolstack_founding` and
`pitch_link_stack` lessons assert "nothing was written into drawing-checker;
`git status` there is unchanged", and **neither assertion is falsifiable by that
method**.

Concretely, the `pitch_link_stack` review found
`data/runs/20260804_114000_217755_A.1_...` dated 2026-08-04 11:40, the same day
that handoff was worked, and cited by `stack_pitch_link_to_pitch_plate.json`'s
`joint.assembly_export`. It is almost certainly not the tolstack session's —
`run_meta.json` says `"purpose": "test"` with `pipeline_commit: ...+dirty`, and
drawing-checker had three of its own handoffs merging between 15:19 and 16:13
that day — but "almost certainly" is as far as the evidence goes. This is a
one-way dependency guarding a repo whose entire purpose is provenance, and the
failure it prevents is silent: a stack cites a run the stack's own session
produced, and nothing downstream can tell that from a run Jeff produced.

## Deliverables

1. **Reword the checklist entry — this happens regardless of everything else.**
   It is the part that is actively misleading: it tells a reviewer that a clean
   `git status` proves the invariant held, and it does not. (The entry has
   already been reworded on `review/pitch_link_stack` to point at the issue;
   confirm what is on `master` now and finish the job.)

2. **Record the citing run's identity, not just its name.** The pitch-link stack
   already names the run; add its `run_meta.json` `ts`. A reviewer can then check
   that the run **predates the session's first commit**, which is a real test
   rather than an inference about someone else's commit log. Coordinate the field
   placement with `citation_export_provenance` — one structure, not two.

3. **Give a session a cheap before/after snapshot.** A small script that records
   a directory listing + mtimes of `C:\workspace\drawing-checker\data\runs\` and
   `...\data\inbox\drawings\` (absolute paths — gitignored, main checkout only)
   and diffs two snapshots. Mechanical, requires **no change to
   drawing-checker**, and makes "nothing was written" a statement with evidence
   behind it. Wire it into the SOP as a step at session start and session end,
   and say in the SOP what a non-empty diff means (it is not automatically a
   violation — Jeff runs the pipeline too — it is a fact the lesson must explain).

4. **Stay read-only while doing this.** Do not run drawing-checker's pipeline to
   generate a test case. Build the snapshot helper's tests against a temporary
   fixture directory, not against the real one.

## Definition of done

- The checklist entry no longer claims `git status` is sufficient, and states
  what a reviewer should do instead.
- Two snapshots taken minutes apart over the real
  `C:\workspace\drawing-checker\data\runs\` diff to empty; a synthetic added file
  in a fixture directory diffs to exactly that file. Both demonstrated.
- The SOP names the snapshot step at session start and end, and says how to
  report a non-empty diff.
- The pitch-link stack's cited run carries its `run_meta.json` `ts`, and that ts
  is shown to predate that session's first commit — the first instance of the
  invariant actually being *verified* rather than asserted. State both timestamps
  in the lesson.
- `git -C C:\workspace\drawing-checker status --porcelain` unchanged by this
  session, **and** the snapshot diff empty — which is the point: this handoff is
  the first one able to say both.
- Full suite green (`venv-win\Scripts\python.exe -m pytest -q`) with `master`
  merged in first.
- Lesson (`docs/sessions/lessons/LESSONS_20260806_readonly_invariant_evidence.md`):
  why the `git status` check was vacuous, and the one-line rule for the next
  reviewer.
