---
type: review
handoff: docs/sessions/active/HANDOFF_20260806_citation_export_provenance.md
reviewer: review agent (review/citation_export_provenance)
date: 2026-08-06
verdict: APPROVE
blockers: 2 (PROVENANCE.md rows falsified; a cwd-dependent path resolution that made the suite red in the main checkout — both fixed inline, see below)
---

# Review — citation_export_provenance

The work under review is **not a tolerance stack**: no element value, band, sign,
`confidence` label or `callout` changed anywhere. It is a schema change plus a
provenance backfill. So the seven mandatory stack checks apply in a shifted form
— the audit question is not "does this number trace to a document" but "does this
**export claim** trace to bytes that exist", which I answered for all 25 of them
independently.

## What I verified, and how

Merged `handoff/citation_export_provenance` into a review branch cut from
`master` @ `2097d59`. `git log --oneline HEAD..master` was empty (the author had
already merged master at `fbc9bab`), so the tree I tested is the tree that ships.

### 1. Every export claim traces to bytes — **PASS**, all 25, re-hashed by me

I walked all five stack files, resolved every `source_ref.export.pdf` myself and
re-computed its sha256 without using the branch's code:

| export | sha256 (12) | cited by | verdict |
|---|---|---|---|
| `data/inbox/drawings/212966-006-A.pdf` | `b0c19da5a8cf` | m2 × 2 | match |
| `data/inbox/drawings/214955-004-A.pdf` | `1dd02be3e2f6` | m2 × 2 | match |
| `data/inbox/drawings/214959-002-A.pdf` | `f9eac183a4b4` | m1 × 2, m2 × 2 | match |
| `data/inbox/drawings/214589-002-A.pdf` | `994f316665c8` | m1, m2 | match |
| `data/inbox/drawings/214588-002-A.pdf` | `1943ac920776` | m1, m2 | match |
| `…/drawing-checker/data/inbox/drawings/[PRELIM 2026-AUG-3] 217755 A.1 …pdf` | `c6381f204582` | pitch_link × 2 | match |
| `…/drawing-checker/data/inbox/drawings/[2026-JUL-23 POST] 217755 A.1 …pdf` | `d0f1b50fa069` | tan_link × 3, vpa × 2 | match |
| `…/drawing-checker/tests/fixtures/drawings/[PRELIM 2025-MAY-22] 215197 A.1.pdf` | `3716251bab26` | pitch_link, tan_link, vpa | match |
| `data/inbox/specs/NAS6403-NAS6420 Rev 4.pdf` | `24276f73d4e4` | pitch_link × 3 | match |

**25 of 25 hash exactly as recorded. Zero invented, zero unestablished.** Nothing
in the branch is the class of defect this checklist exists to catch.

The claims *around* the hash — which no test reads and which are where an
invention would actually hide — also hold:

- **`runs` lists are exact, not decorative.** I grepped
  `C:\workspace\drawing-checker\data\runs.jsonl` for each sha. `c6381f204582`
  appears on exactly the two runs listed; `d0f1b50fa069` on exactly the four
  listed; `3716251bab26` on exactly the three listed. No run is claimed that the
  log does not carry, and none is omitted. Timestamps quoted in the lesson
  (`2026-07-23T16:38:10Z`, `2026-07-30T20:39:33Z`, `2026-08-03T21:53:01Z`,
  `2026-08-04T18:40:27Z`) match the log rows.
- **`runs: []` on the five part drawings is a fact, not an omission.** None of
  their five shas appears anywhere in `runs.jsonl`. The claim "no drawing-checker
  run has ever consumed any of them" is true.
- **The part-drawing chain is independently corroborated.** All five shas were
  recorded in `data/inbox/drawings/PROVENANCE.md` on 2026-08-05 by a *different*
  handoff (`hub_bearing_thermal_stack`), and each file still hashes to its
  recorded value. That is a genuine second source, not the author citing himself.
- **The slice-1 export was confirmed, not assumed** — the thing the handoff
  specifically demanded. The `note` on each JUL-23 citation walks:
  `hardware_entries.json` `provenance.parts_list_run` → run `20260723_163810` →
  that run's own `217755_A_balloons.json` `source_pdf` (contemporaneous) →
  `runs.jsonl` sha. I re-walked it. The independent corroboration it cites is
  real in both stacks: `tan_link`'s and `vpa`'s `joint.zone_note` each name the
  2026-JUL-23 POST export explicitly. (I checked this because the same boilerplate
  note is used on both stacks and a copied claim is the obvious place for a false
  one; it is not false.)
- **Spot-check that the export actually lands the geometry.** Rendered crop
  `hub_bearing_thermal_fit_m2:sleeve_wall_lower` shows `1.190 ±0.025` dimensioned
  across the radial wall — the exact callout cited, and the exact value the
  overlay warns is confusable with the flange's axial `1.110 ±0.035` on the same
  sheet. The named export resolves to the right feature.

### 2–6. Signs, LMC/MMC, RSS, nominal-in-band, quantised constraints — **N/A, and verified N/A**

No `checks` array, `path`, `sign`, `lmc`, `mmc`, `min`, `max`, `nominal` or
`confidence` value is touched anywhere in the diff — I diffed the five stack
files field by field and every hunk is a pure insertion of an `export` object
into a `source_ref`. The full suite's re-derivation tests (which pin the folded
numbers against the 260729 workbook and the two thermal sheets) are green
unchanged, which is the mechanical confirmation. Nothing about the cotter/
castellation caveats or the RSS presentation changed either.

### 7. Traced / inferred / untraced ratio — **unchanged by design, and correctly so**

Counted by me from the branch's stack files, all five: **48 element instances**.
The handoff was explicitly forbidden from touching `confidence` (owned by the
parallel `traced_labels_and_ratio`), and it did not — `git diff` shows zero
changes to any `confidence` field. I record the citation-kind split instead,
since that is what this handoff moved:

> **25 of 48** element citations name a document that can be opened (9 `drawing`,
> 7 `parts_list`, 3 `spec`, plus 6 more drawing/parts_list on the thermal
> stacks); **22** are `kind: "workbook"` and name no document at all; **1** is
> `assumed`. Every one of the 25 now carries a sha256-verified export; the 23
> that cannot are unresolvable for a reason this handoff did not create and did
> not paper over.

### Definition of done, item by item

**Before/after, rebuilt by me, not quoted.** I built the *before* projection from
the master-state worktree into a scratch data root (junctioned to the main
checkout's `inbox/` so the spec pile resolved identically), then the *after* one
against the main checkout with drawing-checker's venv:

| | before (my build) | after (my build) | lesson claims |
|---|---|---|---|
| resolved / citations | 6 / 48 | 24 / 48 | 6 → 24 ✓ |
| `joint_export_run` | 2 | 0 | ✓ |
| `spec_pile` | 3 | 0 | ✓ |
| `provenance.sources_used` | 1 | rule deleted | ✓ |
| `source_ref_export` | — | 24 | ✓ |
| sha256 verified | 2 | 24 | ✓ |
| unverified | 4 | 0 | ✓ |

Every figure in the lesson's two tables reproduces exactly. **No rule was
relaxed** — I read the three surviving rules: `source_ref_export` is strictly
stronger than anything that preceded it (a mandatory 64-hex sha, verified against
the file on disk, with a same-named file under the wrong root refused rather than
cropped), and the two legacy rules are byte-for-byte the same logic as on master,
now resolving nothing. The prose regex was *deleted*, and
`test_the_provenance_sources_used_prose_scan_is_gone` asserts both functions are
absent so it cannot creep back. The entire +18 is attributable to newly named
exports; the row-by-row attribution in the lesson matches my two builds.

**The unestablished escape hatch exists and is enforced from both sides** —
`SourceExport.__post_init__` refuses to construct the contradiction, and
`pdf_from_export` re-checks it independently because the script reads raw JSON and
never the dataclass. That duplication is correct and documented as deliberate.
Nothing in the repo currently *uses* the hatch (every export turned out to be
establishable), which the lesson flags honestly rather than hiding.

**The schema lives in all three places** — SOP Step 2 prose (rewritten, with the
"how to establish one, in order of strength" ladder), `SourceExport`'s docstring,
and `tests/test_tolerance_stack.py`. This is the repo's own three-homes rule and
it was followed without being reminded.

**Tests.** `venv-win\Scripts\python.exe -m pytest -q` → **265 passed, 1 skipped**,
re-run by me on the merged tree. `node apps\viewer\run_tests.cjs --repo
C:\workspace\tolstack` → **59/59**, including the twelve `[real]` checks against
the rebuilt projection. I also confirmed the new tests are real rather than
tautological: checking out master's `docs/tolerance_stacks/` under the branch's
test file produces **6 failures**, all of them the new export assertions.

**Universal check — no data pollution.** No file under `C:\workspace\tolstack\data`
was modified by the suite. The only writes were my two deliberate projection
rebuilds.

**drawing-checker read-only — PASS, with evidence rather than a clean
`git status`** (which the overlay correctly says proves nothing). Newest run
directory is `20260804_114000`; `runs.jsonl` mtime is 2026-08-04; nothing under
`data/` has an mtime on 2026-08-06. The ten files touched there today are all
that repo's own dispatch session artifacts (its `docs/issues/`, its
`docs/sessions/active/`, its `.dispatch/` prompts). Nothing was written by this
handoff.

**`data/inbox/specs/` append-only — PASS.** 64 files, none modified today, no
renames in the diff.

**Architectural invariants — PASS.** `fold()` untouched and still the only
combiner; no new arithmetic path; `Term.coefficient` unchanged; nothing added to
`apps/viewer/` or `build_viewer_projection.py` (both correctly left to their
owning handoffs, with the viewer's resulting staleness filed as an issue rather
than fixed out of scope). The crop script does no tolerance arithmetic.

## Findings

### Blocker — fixed inline

**`PROVENANCE.md` was not amended, and two rows are now false.**
`PROVENANCE.md`, rows for the imported files. Fourth sighting of this class, and
the sharpest one: it happened on the handoff whose entire subject is provenance,
which is the point — caring about provenance does not catch it, only running
`git diff master..HEAD --name-only` against the table does.

- `docs/tolerance_stacks/stack_tan_link_to_pitch_plate.json` — claimed
  "no — byte-identical", gained four `export` blocks.
- `docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json` — same, three
  blocks.
- `tolerance_stack/stack.py` — Amended column stopped at `hub_bearing_thermal_stack`;
  this branch adds `SourceExport` and an executable `__post_init__`.
- `tolerance_stack/__init__.py` — same, `SourceExport` re-exported.
- `tests/test_tolerance_stack.py` — Amended column says **71 tests**; the file is
  now **86**.

The generalisable lesson, now in the overlay: **a purely additive change still
falsifies a "byte-identical" row.** "No value changed" is not "no edit happened",
and this author's changes were about as additive as a change can be.

*Fixed inline* on the review branch: five rows rewritten with amendments in the
house style, counts recomputed rather than inferred (I re-collected
`test_viewer_crops.py` on master to confirm 27 → 36 before writing it). No other
blocker, so per the canonical process this does not send the work back.

### Blocker — fixed inline (and caught late, which is the lesson)

**`export_pdf_path` resolved a relative cited path against the process's cwd, so
the suite was green in the review worktree and red in the main checkout.**
`scripts/build_viewer_crops.py:191`,
`test_a_repo_relative_export_path_resolves_against_the_main_checkout`.

The function tried `Path(cited).exists()` before consulting the explicit `roots`.
From the main checkout, `data/inbox/drawings/212966-006-A.pdf` *really exists*
relative to the cwd, so the real repo file won over the tmp-path file the roots
named, and the sha check then reported *"the file on disk is not the export this
citation was read from"* — a provenance alarm for what is really a cwd accident.
From a worktree, whose `data/` is gitignored and therefore empty, the same
relative path missed, the roots were used, and the test passed. The function's
own docstring already said what it should do ("repo-relative … means the MAIN
checkout's, which is `roots[0]`"); the code just checked cwd first.

It fails closed in every case — the sha guard means no wrong bytes were ever
croppable, and I re-ran the projection after the fix to confirm resolution is
unchanged at 24/48, all sha-verified. So the impact is a false provenance alarm
and a red suite, not a bad crop. Fixed inline: the bare `exists()` shortcut now
applies to absolute paths only, where it was meant to be. Added
`test_a_repo_relative_export_path_ignores_the_process_cwd`, which plants a
*differing* decoy on the cwd so only the roots can produce the right file.
`267 passed` in the main checkout, `266 passed / 1 skipped` in the worktree.

**Worth recording that I found this only after merging.** I ran the suite in the
review worktree, got green, and it was the post-merge run in the main checkout
that caught it. The overlay's existing entry is "`forge check` passes in the main
checkout and fails in the worktree"; this is the same class in the opposite
direction, and the worktree is the *more* permissive environment for anything
that touches `data/` — precisely because `data/` is empty there. Run the suite in
both.

### Should-fix — for a follow-up, not this branch

**Three citations name another repo's *test fixture* as their export of record,
against the rule this same commit wrote.** The new SOP Step 3 text says: "If a
stack element depends on a part drawing, copy the PDF into this repo's
`data/inbox/drawings/` and cite it repo-relative … a drawing-checker inbox file is
not immutable." The 215197 citations in `pitch_link`, `tan_link` and `vpa` all
point at `C:/workspace/drawing-checker/tests/fixtures/drawings/[PRELIM 2025-MAY-22]
215197 A.1.pdf`.

The backfill itself is honest — I confirmed the author's claim that this is the
only 215197 PDF anywhere in the workspace (the inbox holds a `.stp` and nothing
else), and its sha matches the input recorded by all three 215197 runs, so
"which export" genuinely has a unique answer. The sha also makes a silent
substitution detectable. But a *test fixture directory* is the one place a file
can be pruned, regenerated or renamed with no notice and no obligation to anyone,
and the citation would then fail closed against a repo tolstack does not own.
Copying it to `data/inbox/drawings/215197-001-A.pdf` with a `PROVENANCE.md` row
and re-citing repo-relative is a ten-minute job that brings the backfill into
line with its own SOP. I did not do it: it writes into `data/` and appends a
provenance row on a judgement call (is a fixture copy *the* export of record?)
that is worth Jeff's or the next tactical agent's five seconds, not a reviewer's
unilateral one.

### Nits

- `test_the_export_is_a_sibling_of_the_feature_identity_slot_not_a_filling_in`
  asserts `len(backfilled) == 25`. The next stack with a drawing citation fails
  it on a bare count. The assertion message does print the list, so it is
  discoverable — but a one-line "update this when you add a stack" would save the
  next author a minute. Pinning the number is otherwise right.
- `pdf_from_export` resolves a `run_dir` for `runs[0]` only, so an export feeding
  four runs reports one. Intentional and harmless (runs are corroboration, never
  identity), just worth knowing when reading `crops.json`.
- `pitch_link:pitch_plate_flange` cites 215197 sheet 2 zone **D10** and
  `tan_link:pitch_plate_flange` cites sheet 2 zone **B4**, same view, and now
  provably the same bytes. Pre-existing on master, not this handoff's to fix — but
  naming the export is exactly what made the pair checkable, which is the feature
  working as designed. Worth a look when `traced_labels_and_ratio` is in the file.
- The crop needles remain weak on several entries (`±0.025`, `±0.08`, `-0.020`) —
  the already-recorded corroboration-flag problem, untouched here and correctly
  out of scope.

### Filed as out-of-scope issues

- `docs/issues/ISSUE_20260806_sop_still_says_library_ref_stays_null.md` (new, by
  me) — the SOP says `library_ref` stays null in five places; it has not since
  `spec_library_v0` promoted `NAS6403U11D` on 2026-08-05. Third sighting of the
  vocabulary-drift class, and again the prose is the stale home while the
  dataclass and the test have moved on. Noticed while reading the SOP diff.
- `docs/issues/ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule.md`
  (filed by the author) — correctly filed rather than fixed; `apps/viewer/` belongs
  to `viewer_generated_checks`. I confirmed the JS suite passes *because* it pins
  the dead rule's string, exactly as the issue says.

## Note for the next reviewer

The overlay gained two things: a **fourth sighting** on the PROVENANCE entry with
the additive-change wrinkle, and an extension to mandatory check 1 covering the
new `export` field — re-hash every export yourself (it is one pass over the stack
files), and check the three claims a hash does not cover: that `runs` matches
`runs.jsonl` exactly, that `runs: []` is a fact rather than an omission, and that
`export.note`'s chain re-walks. Note the trap the author hit and recorded: run
provenance before `20260730_161157` lives in `data/runs.jsonl`, **not** in the run
directory's `run_meta.json`, which has no `inputs` key for those runs. Reading the
run dir alone will make you conclude an export is unestablishable when it is not.
