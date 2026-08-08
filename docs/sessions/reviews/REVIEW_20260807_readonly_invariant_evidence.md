---
type: review
handoff: docs/sessions/active/HANDOFF_20260806_readonly_invariant_evidence.md
reviewer: review agent (dispatch)
date: 2026-08-07
verdict: APPROVE
blockers: 0
---

# REVIEW — readonly_invariant_evidence

Reviewed `handoff/readonly_invariant_evidence` (4 commits, `73969fb..b97b22e`)
against `master` @ `dc7e4ad`. `git log --oneline HEAD..master` was **empty** at
the start of the review and again before the merge — no sibling handoff landed
during it, so the tested tree is the tree that ships.

This is a **plumbing / process handoff, not a tolerance stack**. It touches three
seeded stack JSONs, but only inside `source_ref.export.runs`. The seven mandatory
stack checks are addressed below in the form they take for that: everything that
could have moved a number is checked, and the checks whose subject this handoff
does not touch say so rather than going unmentioned.

## What the handoff was for

`ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth`: the checklist told
reviewers to prove "nothing was written into drawing-checker" with `git status`
over there, and that check is **vacuous** — `data/runs/*` and `data/inbox/*` are
gitignored in that repo, so a session that ran the pipeline leaves its status
completely clean. Three deliverables: reword the entry, record each cited run's
`run_meta.json` `ts`, and give a session a before/after snapshot of the two
directories a write would land in.

---

## The mandatory checks

### 1. Every tolerance traces to a specification or drawing callout — PASS (nothing moved, and the citations verify)

No element value, band, `confidence`, `callout`, `kind`, `sha256` or `pdf`
changed on this branch. The stack-JSON diff is **exactly 25 lines**, all of them
`export.runs` entries going from `"20260803_145243"` to
`{"run_id": ..., "ts": ...}`. Verified structurally, not by eye: the rebuilt
`results.json` (which embeds each stack verbatim) is **identical to the previous
build for all six stacks once run entries are collapsed back to bare ids**.

I re-hashed every established export myself, resolving repo-relative `pdf` paths
at the main checkout, and cross-checked each `runs` list against
`drawing-checker/data/runs.jsonl`:

```
OK  [2026-JUL-23 POST] 217755 A.1 ... .pdf      (3 citations)
OK  [PRELIM 2026-AUG-3] 217755 A.1 ... .pdf     (2 citations)
OK  [PRELIM 2025-MAY-22] 215197 A.1.pdf         (3 citations)
OK  212966-006-A.pdf  214588-002-A.pdf  214589-002-A.pdf
OK  214955-004-A.pdf  214959-002-A.pdf  NAS6403-NAS6420 Rev 4.pdf
```

All nine on-disk sha256s match the cited value, and **every `runs` list is
exactly the set of runs whose recorded input sha equals that export's** — no
extra run, none missing.

**The 11 new `ts` values, all 25 entries, re-read from source.** This is the one
new number class the handoff introduces, so it is the one to re-derive rather
than read. I opened each of the nine distinct runs' `run_meta.json` in
drawing-checker and compared verbatim:

| run | `run_meta.json` `ts` | cited |
|---|---|---|
| `20260803_145243` | `2026-08-03T21:53:01.395741+00:00` | exact |
| `20260804_114000` | `2026-08-04T18:40:27.959980+00:00` | exact |
| `20260409_170546` | `2026-04-09T17:05:46+00:00` | exact |
| `20260409_172341` | `2026-04-09T17:23:41+00:00` | exact |
| `20260730_133912` | `2026-07-30T20:39:33.291499+00:00` | exact |
| `20260723_163810` | `2026-07-23T16:38:10+00:00` | exact |
| `20260727_153847` | `2026-07-27T15:38:47+00:00` | exact |
| `20260730_131903` | `2026-07-30T20:21:09.210383+00:00` | exact |
| `20260730_132230` | `2026-07-30T20:28:36.282195+00:00` | exact |

Nine of nine verbatim. No stamp was reconstructed from a run id — which is the
exact failure mode this field would otherwise invite, and the author flagged it
themselves before I looked. See finding 1 for the one thing that is imprecise
about *which* of them are themselves derived.

The two git constants the new test pins also re-derive:
`d6829f2` = 2026-08-04T15:42:57−07:00 = **22:42:57Z** ✓, `e7bd996` =
2026-08-03T16:05:08−07:00 = **23:05:08Z** ✓. And `d6829f2` really is
`pitch_link_stack`'s first commit — `git log --reverse` shows the board move
`41d3893` (21:56:56Z) immediately before it and nothing else from that session.
So the cited run `20260804_114000` (18:40:27Z) predates the session's earliest
possible act by **more than three hours**, not just its first commit.

### 2. Signs on every path term — N/A, and confirmed unmoved

No `path`, `check`, `sign`, `coefficient` or `term` changed. `fold()` is
untouched. The collapsed-run-entry comparison above is the evidence that no
signed term list moved.

### 2b. Coherent material corners — N/A. No fold, no re-derivation, no corner.

### 3. LMC/MMC direction — N/A. No `lmc`/`mmc` field touched; `fold()` unmodified and still reads `min`/`max` only (`test_fold_never_reads_lmc_or_mmc` still green).

### 4. RSS actually computed — N/A for the diff, and unchanged in the rebuilt projection (all six stacks' results identical).

### 5. Nominal inside its own min/max — N/A. No `nominal`, `min` or `max` touched.

### 6. Quantised constraints — N/A. No stack authored; the seeded stacks' cotter/castellation prose is untouched.

### 7. Traced / inferred / untraced ratio — computed, unchanged

Re-derived with `tests\debug_report_tolerance_stacks.py --ratio` in the main
checkout, not copied:

> **3 traced / 7 inferred / 16 untraced, out of 26 element instances** across the
> three seeded slice-1 stacks. All stacks: **19 traced / 11 inferred / 18
> untraced, out of 48 element instances.**

Identical to `master`'s, as it must be — this branch relabels nothing. Per-stack:
`hub_bearing_thermal_fit_m1` 4T/2I/2U, `m2` 8T/0I/0U, `pitch_link` 4T/2I/0U,
`tan_link` 2T/3I/6U, `take2` 0T/2I/7U, `vpa` 1T/2I/3U.

Non-element values: unchanged and untouched by this handoff. The 22
`kind: "workbook"` citations naming no document remain the repo's largest
provenance gap; the lesson says so under "Left to do", correctly, rather than
implying this handoff narrowed it.

---

## Also verified

- **Tests, re-run by me in both checkouts** (the standing both-checkouts rule):
  **308 passed / 1 skipped in the worktree**, **309 passed / 0 skipped in
  `C:\workspace\tolstack`** on the merged tree. Same 309 tests; the skip is
  `test_viewer_js_suite.py`'s node-fs tier, which has no projection to read where
  `data/` is empty. Matches the lesson's claim exactly, including its statement
  of which checkout produced which number. `node apps/viewer/run_tests.cjs
  --repo C:\workspace\tolstack` → **75/75**.
- **Tests don't pollute production data.** `data/` in the main checkout is
  byte-unchanged by the suite (no new files, `git status --porcelain` shows only
  the pre-existing untracked `.dispatch.toml`). `tests/test_dc_snapshot.py` runs
  entirely under `tmp_path` and one of its own tests
  (`test_taking_a_snapshot_writes_nothing_into_the_directory_it_watches`) asserts
  the listing and every mtime are unchanged by two snapshots. The stated
  constraint — never build the fixture against the real directory, because doing
  so would falsify the very invariant the script measures — is honoured
  throughout.
- **`git diff master..HEAD --name-only` against PROVENANCE's byte-identical
  rows — CLEAN.** Five of the fifteen touched files carry a PROVENANCE claim and
  all five were amended in the same commit (`stack_tan_link_*.json`,
  `stack_vpa_output_*.json`, `stack.py`, `__init__.py`,
  `test_tolerance_stack.py`). The ten remaining touched files are repo-native and
  correctly absent from the tables. **This is the sixth run of this check and the
  first time it came back clean** — five prior sightings were all reviewer-fixed.
  Overlay updated to record it.
- **Nothing was written into drawing-checker — verified twice, once for the
  author and once for me.** Re-running the author's snapshot from *their*
  `before.json` (2026-08-08T00:24:26Z) forward to a fresh one of mine
  (01:27:30Z) — a window an hour longer than theirs — diffs **EMPTY over 1,628
  entries**, exit 0. My own before/after over the whole review window
  (01:27:30Z → 01:45:55Z, spanning every `run_meta.json` read above) is likewise
  **EMPTY**. `git -C C:\workspace\drawing-checker status --porcelain` is
  identical to the three untracked entries the lesson records, `HEAD` still
  `1e68e01`. The 1,628 figure and the 00:24:26Z stamp in the lesson both
  reproduce.
- **Snapshot demonstration, both halves (DoD).** Two real snapshots diff to
  empty (above, three times over now). A synthetic added file in a fixture
  directory diffs to exactly that file — pinned by
  `test_a_synthetic_added_file_diffs_to_exactly_that_file` and by the CLI
  round-trip test asserting exit 1.
- **Projections rebuilt by me** (per the concurrency rule: the review worktree is
  the newest tree, so the reviewer's rebuild is the one that counts).
  `build_viewer_projection.py` then `build_viewer_crops.py` against
  `C:\workspace\tolstack\data`. **`crops.json` reproduces identically apart from
  `built_at`**, confirming the lesson's claim that no run id changed and the
  crops layer is unaffected. `results.json` differs only in the three stacks'
  embedded `export.runs` — and is identical for all six once run entries are
  collapsed to ids. No other stack regressed.
- **`ExportRun`'s hard refusal of the old shape has exactly two enforcement
  points and no third reader.** Grepped every consumer of `export.runs`:
  `SourceExport.from_dict` and `build_viewer_crops.export_run_ids`, both updated
  and both tested. `build_viewer_projection.py` and `apps/viewer/` never read the
  field (the projection embeds the stack whole, which is why `results.json`
  changed at all). The legacy `joint.assembly_export` prose regex at
  `build_viewer_crops.py:329` is untouched — correct, and the lesson says why.
  Re-checking in the script rather than trusting the dataclass is right: that
  module reads raw JSON.
- **`data/inbox/specs/` not reorganised** — no `data/` path in the diff, and the
  filesystem is unchanged.
- **`forge check` OK** on both checkouts (worktree with the standard
  linked-worktree warning).
- **Template placeholders**: the two `{{` hits in the diff are f-string escapes
  in error messages, not survivals of the stamp.
- **`docs/reference/` untouched**; `CLAUDE.md` untouched.
- **The SOP's own vocabulary**: the new Step 0 / Step 8 pair reads as one
  procedure, and quick-reference item 21 restates the rule where an author will
  actually meet it. The `{run_id, ts}` shape is documented in three places that
  now agree — SOP Step 3 example, `SourceExport.runs`' comment, and the enforcing
  test — which is the three-place rule this repo learned the hard way.

## Findings

### Should-fix — fixed inline by me (1)

**1. `backfilled: true` is not the tell for a derived `ts`; the shape is.**
Location: `LESSONS_20260807_readonly_invariant_evidence.md` item 2,
`tolerance_stack/stack.py` `ExportRun` docstring, `docs/SOP_TOLERANCE_STACK.md`
Step 3.

The handoff's own most useful discovery is that a `backfilled: true` run's `ts`
was reconstructed from the run id by drawing-checker's `reconcile_run_log.py`,
so it reads as UTC when it was local — up to seven hours wrong, in the direction
that matters for a same-day comparison. All three documents then give the rule as
*"check `backfilled` before you lean on one"*, and count six of the 25 entries.

That undercounts by half. The two 2026-04-09 runs of 215197 —
`20260409_170546` and `20260409_172341`, cited by **all three** stacks, six
further entries — have `ts` `2026-04-09T17:05:46+00:00` and `...T17:23:41+00:00`:
whole seconds, digit-for-digit the id, `pipeline_commit: null`, and **no
`backfilled` key at all**. Twelve of 25 are derived; only six carry the flag. A
future session applying the rule as written would check the flag on exactly the
entries that don't have it and conclude the stamp was measured.

Nothing in this branch turns on it (both runs are from April, four months before
this repo, and both are far outside any session window). But the sentence is
durable guidance about how to trust a timestamp, in a repo whose subject is
trusting a citation — so: corrected in all three places to key on the shape (a
whole-second `ts` that spells its own run id back), with the flag demoted to
confirmation. The lesson correction is an additive dated blockquote; the original
text is intact. `stack.py`'s row in PROVENANCE amended in the same commit,
comment-only.

### Nits (3)

- **The lesson's "Six of the 25 backfilled entries"** now reads correctly only
  because of the appended correction. Left as an additive note rather than a
  rewrite, per this repo's convention for lessons.
- **The lesson file is `LESSONS_20260807_*`, the DoD named `LESSONS_20260806_*`.**
  The session ran on the 7th; dating by the day of work is right and the issue's
  closure note points at the actual filename. No action.
- **`build_viewer_crops.export_run_ids` accepts `{"run_id": ...}` with no
  `ts`** while `ExportRun.from_dict` requires only that `ts` be present-or-None
  too — neither refuses a null `ts` at load. The invariant is carried instead by
  `test_every_cited_run_carries_the_ts_from_its_own_run_meta`, parametrized over
  every stack, which also demands a tz-aware stamp. That is the right place for
  it (a missing-`ts` run is a legitimate future state per the docstring, and the
  test is what makes it a *declared* one), so this is an observation, not a
  request.

### Blockers

None.

## Verdict — APPROVE

Merged to `master` (fast-forward), suite re-run green in both checkouts, pushed.

The handoff's central claim — that this is the first session in the repo able to
say "nothing was written into drawing-checker" with evidence — holds, and it
survives the strongest form of the check: I re-ran the diff from the author's own
`before.json` over a longer window than they measured, and it is still empty over
1,628 named entries. Every `ts` is verbatim from its run. The one thing that was
imprecise was imprecise about *the guidance*, not the data.

## Note for the next reviewer

- Take your own drawing-checker snapshot **before** you start reading over there.
  The overlay now requires it and it costs one second:
  `venv-win\Scripts\python.exe scripts\snapshot_drawing_checker.py take <path>`.
  Then re-run the diff from the author's `before.json` in
  `C:\workspace\tolstack\data\sessions\<slug>\` — that covers the window since
  they stopped measuring, which is exactly the window a reviewer creates.
- Re-read every cited run's `ts` from `run_meta.json` yourself. It is one loop
  and it is the only thing between a citation and a plausible stamp. Judge
  derived stamps by shape, not by `backfilled`.
- The byte-identical PROVENANCE diff came back clean for the first time in six
  runs. Keep running it — one catch is not a trend.
