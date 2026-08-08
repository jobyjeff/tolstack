# LESSONS 2026-08-07 — readonly_invariant_evidence

Handoff: `docs/sessions/active/HANDOFF_20260806_readonly_invariant_evidence.md`.
Baseline `master` @ `dc7e4ad` (the handoff's `de7f7f1` plus the board move and the
`gitignore_data_precedence` review).

## Why the check was vacuous — the one-line rule

> **`git status` in drawing-checker cannot detect a write into drawing-checker.**
> Everything its pipeline produces is gitignored there (`data/runs/*`,
> `data/inbox/*`), so a session that ran the pipeline, created a run directory or
> dropped in a PDF leaves that repo's status **completely clean**. The check never
> failed and never could — it passed *vacuously*, which is worse than failing,
> because it reads as evidence.

For the next reviewer, in one line:

> **A clean `git status` over there is not evidence. Ask for the snapshot diff and
> for every cited run's `ts`.**

The failure this guards is silent by construction: a stack cites a run *the
stack's own session produced*, and nothing downstream can tell that from a run
Jeff produced. Both are a directory of JSON with a plausible name.

## The invariant, verified rather than asserted — this session's evidence

Two snapshots of drawing-checker's `data/runs/` and `data/inbox/drawings/`,
31 minutes apart, spanning every read this session made:

```
C:\workspace\tolstack\data\sessions\readonly_invariant_evidence\before.json
    1628 entries at 2026-08-08T00:24:26Z   (1596 in data/runs, 32 in data/inbox/drawings)
...\after.json
    1628 entries at 2026-08-08T00:55:53Z

drawing-checker snapshot diff: 2026-08-08T00:24:26Z -> 2026-08-08T00:55:53Z
  EMPTY -- no entry added, removed or modified.       (exit 0)
```

And `git -C C:\workspace\drawing-checker status --porcelain` identical at both
ends — the same three untracked entries (`data/inbox/specs/`,
`data/projections/review_manifest_20260729.md`,
`pipeline/prompts/region_detection_nofs.md`), `HEAD` `1e68e01` throughout.

**That pairing is the point of the handoff.** The `git status` line alone is what
the last two lessons said, and it was worth nothing; the snapshot line is what
makes it a measurement. This is the first session in this repo able to say both,
and the empty diff is over 1,628 entries in named directories rather than over an
unstated set — an "empty diff" against a directory that does not exist is the
vacuous check again in a new costume, which is why the script prints a `WARNING`
on an absent root and why the count belongs in this sentence.

The other half of the demonstration, on a fixture directory (never the real one):

```
  ADDED    .../scratchpad/fixture_runs/dropped_in_217755.pdf  (file, mtime ...)
  1 added, 0 removed, 0 modified.                             (exit 1)
```

## The pitch-link run, in both timestamps

The concrete case the issue could not settle —
`data/runs/20260804_114000_217755_A.1_...`, cited by
`stack_pitch_link_to_pitch_plate.json` and dated the same day that handoff was
worked:

| | |
|---|---|
| run `20260804_114000`, `run_meta.json` `ts` | **2026-08-04T18:40:27Z** (11:40:27 PDT) |
| `pitch_link_stack`'s first commit `d6829f2` | **2026-08-04T22:42:57Z** (15:42:57 PDT) |
| that handoff's board move `41d3893` (the session's earliest possible act) | 2026-08-04T21:56:56Z |

**Four hours before the session's first commit, and more than three hours
before the handoff even went `active`.** The run cannot be that session's output. The sibling run it
also cites, `20260803_145243` (`ts` 2026-08-03T21:53:01Z), predates tolstack's
root commit `e7bd996` (2026-08-03T23:05:08Z) — it existed before this repo did.

That is arithmetic on two recorded numbers. What the `pitch_link_stack` review
had instead was `purpose: "test"`, a `+dirty` `pipeline_commit`, and three
drawing-checker handoffs merging between 15:19 and 16:13 — all true, all
*inference about another repo's commit log*, and it correctly stopped at "almost
certainly". Pinned now by
`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`; the
two commit constants are git history, which does not move.

## Decisions the handoff left open

- **The `ts` went into `citation_export_provenance`'s structure, not beside it.**
  The handoff said coordinate, and that handoff landed first, so `export.runs`
  entries went from `"20260804_114000"` to
  `{"run_id": ..., "ts": ...}` (`ExportRun`) rather than growing a parallel
  `run_ts` map or a second field on `joint`. The `joint.assembly_export` prose
  still names its runs and was left alone — it is the documented legacy fallback,
  no citation reaches it, and the per-citation field is the machine-readable one.
- **A bare run id now raises rather than being accepted.** The one non-additive
  edge in this branch, and deliberate: accepting both shapes would let the next
  stack write a run id with no `ts`, which is exactly the state in which this
  invariant cannot be checked. Refused in `ExportRun.from_dict` *and* again in
  `scripts/build_viewer_crops.py`, which reads raw JSON and never the dataclass.
- **All 25 run entries were backfilled, not just the pitch-link stack's.** The
  DoD named one; two shapes in one field would be worse than the problem. Every
  `ts` is a read-only lookup of that run's own `run_meta.json`.
- **The snapshot script watches two directories and no more.** Not all of
  `drawing-checker/data/` — `runs.jsonl` is rewritten by that repo's own
  reconcile tooling and would produce noise this repo can never explain. If a
  future session needs the log watched, add it as a `--root` for that session.
- **Snapshots live in `C:\workspace\tolstack\data\sessions\<slug>\`** (main
  checkout, gitignored by the `data/*` blanket — verified with
  `git check-ignore -v`, and `forge check` is OK on both checkouts with the
  directory present). They are session evidence, not project data: the durable
  artifact is this lesson.

## What the next agent could not derive from the code

**1. A run id is local time; `ts` is UTC; they are not the same instant.**
`20260730_133912` has `ts` `2026-07-30T20:39:33Z` — the id is stamped at run
*start* and the `ts` 21 seconds later, and the timezone shift (PDT, −07:00) means
eyeballing them against each other will mislead you twice over. Do not
reconstruct a `ts` from a run id.

**2. Six of the 25 backfilled entries — two distinct runs — carry a
`backfilled: true` `run_meta.json`, whose `ts` was *derived from the run id* by
drawing-checker's `scripts/reconcile_run_log.py`** — so it reads as UTC when it
was local.
`20260723_163810` → `2026-07-23T16:38:10+00:00` is the tell: whole seconds,
digit-for-digit the id. Still contemporaneous to within a timezone, and both
predate this repo by weeks so nothing here turns on it — but a future session
comparing a backfilled `ts` to a same-day commit is comparing against a stamp
that could be seven hours off in the direction that matters. Check
`backfilled` before you lean on one.

**3. The `run_meta.json` `run_id` key is the full directory name, not the
15-character id.** `run_meta.json` for `20260804_114000_217755_A.1_PROPULSION...`
records `run_id: "20260804_114000_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER"`,
while everything in this repo cites the `YYYYMMDD_HHMMSS` prefix. A lookup keyed
on `run_id` finds nothing; key on the directory-name prefix.

**4. Reformatting a stack JSON with `json.dump` is a 300-line diff.** The seeded
stacks are hand-formatted — `parts` rows are one-per-line objects, `runs` entries
one id per line — and a round-trip through `json.dump(indent=2)` reflows all of it
and flips the line endings, burying a 25-line change in 331 insertions and
falsifying "additive only" at a glance. The backfill was done as a line-oriented
text rewrite preserving each file's existing newlines; the diff is exactly the 25
run entries. **Anything that edits a stack file in bulk should do the same, and
should re-parse every stack afterwards to prove it is still JSON.**

**5. The viewer is unaffected, and it is worth knowing why.**
`build_viewer_projection.py` and `apps/viewer/` never read `export.runs`; only
`build_viewer_crops.py` does, and only for the *first* run id, to locate a run
directory. No run id changed, so a crops rebuild would reproduce
`crops.json` byte for byte and the projection was deliberately not rebuilt on
this branch (per the concurrency issue, the reviewer's rebuild is the one that
counts). The node-fs tier of the JS suite was run against the main checkout
anyway: `75/75 passed`.

## Verification

- `venv-win\Scripts\python.exe -m pytest -q` → **308 passed, 1 skipped**, run
  **in the worktree** (baseline before this branch: 290 passed, 1 skipped). The
  skip is `test_viewer_js_suite.py`'s node-fs tier, which has no projection to
  read in a worktree; the main checkout reports one more passed and none skipped.
  Every test added here is checkout-independent by construction — the snapshot
  tests run entirely under `tmp_path`, the rest read tracked JSON — so the
  worktree/main-checkout gap is unchanged at that one test.
- `forge check` OK on the worktree (with the standard linked-worktree warning) and
  on `C:\workspace\tolstack`.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` → 75/75.
- PROVENANCE rows amended for all five files this branch touched that carry a
  claim: both seeded stack JSONs, `stack.py`, `__init__.py`,
  `test_tolerance_stack.py`. `git diff master..HEAD --name-only` was run against
  the table rather than recalled.

## Left to do

- **No test asserts the SOP's snapshot step was actually performed.** The evidence
  is a lesson paragraph, which is exactly the shape of claim this handoff was
  filed against. Mechanising it needs a session-identity notion the repo does not
  have (whose `before.json`? taken when?); the honest interim is the reviewer
  re-running the diff from the author's `before.json`, which the checklist now
  requires. If a third session's lesson asserts an empty diff without a
  `before.json` to re-run it from, that is the trigger to build it.
- **The snapshot cannot distinguish a read that touches an mtime from a write.**
  Nothing in this repo's toolchain does that today (rendering a crop opens a PDF
  read-only), but a future tool that writes a cache beside a PDF would show up as
  a `MODIFIED` entry with an innocent explanation. The diff is a prompt to
  explain, not a verdict — the SOP says so, and it should stay that way.
- The 22 `kind: "workbook"` citations that name no document at all are still the
  largest provenance gap here, untouched by this handoff and by
  `citation_export_provenance` before it.
