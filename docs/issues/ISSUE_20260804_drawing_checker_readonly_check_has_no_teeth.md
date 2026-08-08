---
type: bug
priority: medium
status: closed
area: review-process
reporter: agent
handoff: docs/sessions/HANDOFF_20260806_readonly_invariant_evidence.md
closed: 2026-08-07
---

> **CLOSED 2026-08-07** by handoff `readonly_invariant_evidence`. All three
> suggested fixes landed, in the order the issue ranked them:
>
> 3. The checklist entry no longer offers `git status` as the check — it names it
>    as the thing *not* to do and gives three ordered checks instead.
> 1. `source_ref.export.runs` entries are now `{run_id, ts}` (`ExportRun`), the
>    `ts` copied verbatim from the run's own `run_meta.json`. The specific run
>    this issue could not attribute, `20260804_114000` (`ts`
>    **2026-08-04T18:40:27Z**), is now pinned by test against `pitch_link_stack`'s
>    first commit `d6829f2` (**2026-08-04T22:42:57Z**) — four hours later, so the
>    run cannot be that session's output. The sibling run `20260803_145243`
>    predates tolstack's root commit.
> 2. `scripts/snapshot_drawing_checker.py` takes and diffs the before/after
>    listing, wired into SOP Steps 0 and 8 with what a non-empty diff obliges the
>    author to explain.
>
> The evidence for this session itself is in
> `docs/sessions/lessons/LESSONS_20260807_readonly_invariant_evidence.md`: an
> empty diff over 1,628 entries, which is the first time the claim has been made
> with anything behind it.

# The "drawing-checker is read-only" invariant cannot be verified the way the checklist says

Found during the `pitch_link_stack` review (2026-08-04) while trying to confirm
the invariant.

## What

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
`git status` there is unchanged", and neither assertion is falsifiable by that
method.

Concretely, this review found `data/runs/20260804_114000_217755_A.1_...` dated
2026-08-04 11:40, the same day `pitch_link_stack` was worked, and cited by
`stack_pitch_link_to_pitch_plate.json`'s `joint.assembly_export`. It is almost
certainly **not** the tolstack session's: `run_meta.json` says
`"purpose": "test"` with `pipeline_commit: ...+dirty`, and drawing-checker had
three of its own handoffs merging between 15:19 and 16:13 that day. But
"almost certainly" is as far as the evidence goes, and the invariant deserves
better than an inference about someone else's commit log.

## Why it matters

This is a one-way dependency guarding a repo whose entire purpose is provenance.
The failure it prevents is silent: a stack cites a run the stack's own session
produced, and nothing downstream can tell that from a run Jeff produced.

## Suggested fix

Give the check something to compare against. Cheapest first:

1. **Record the run id and its `run_meta.json` `ts` in the citing stack's
   `joint` block** (the pitch-link stack already names the run — add the
   timestamp). A reviewer can then check the run predates the session's first
   commit, which is a real test.
2. **Snapshot drawing-checker's `data/runs/` and `data/inbox/drawings/`
   directory listing + mtimes at session start**, in the handoff or a scratch
   file, and diff at the end. Mechanical, no drawing-checker change.
3. Reword the checklist entry so it stops claiming `git status` is sufficient.

(3) should happen regardless — it is the part that is actively misleading. The
checklist entry has been reworded on `review/pitch_link_stack` to point here.
