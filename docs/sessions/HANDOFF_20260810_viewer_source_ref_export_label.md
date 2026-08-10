---
priority: medium
depends_on: []
---

# HANDOFF 2026-08-10 — viewer_source_ref_export_label: the viewer has no label for `resolved_by: "source_ref_export"`, and both branches it does label are dead

Source: `docs/issues/ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule.md`
(`bug`/med, filed by `citation_export_provenance` whose handoff forbade it from
touching `apps/viewer/`). Triaged 2026-08-10. Baseline: `master`;
`citation_export_provenance` and `viewer_generated_checks` are both merged and
completed — **`apps/viewer/` is no longer owned by a live handoff**, which is what
unblocks this. Scope: `apps/viewer/viewer.js` (the `resolved_by` label branches and
crop hover), `apps/viewer/fixtures.js`, `apps/viewer/tests.js`. Do **NOT** edit the
top-level provenance banner's stacks-dir/branch/sha fields — the staged
`viewer_projection_provenance` owns those (see "Coordination").

## The defect

`apps/viewer/viewer.js` explains a crop's provenance by switching on `crops.json`'s
`resolved_by`. As of `citation_export_provenance` (2026-08-06) **all 24 resolved crops
carry `resolved_by: "source_ref_export"`** — a value the viewer has never seen — while
the two branches it does label are both stale:

- `provenance.sources_used` (viewer.js ~line 180) is **dead**: that resolution rule was
  removed, so no entry can carry it again.
- `joint_export_run` still exists in the crop script as a legacy fallback, but no
  citation in the repo reaches it any more (every one now carries `source_ref.export`),
  so its branch is dead in practice too.

So the hover most likely falls through to whatever the default is, and **the one piece
of provenance worth showing — this crop's PDF was sha256-verified against the export the
citation names — is not shown at all.** That is the opposite of what the crop hover is
for: the reason `source_ref_export` exists is that **a crop of a guessed export looks
perfectly correct on screen.** A viewer that cannot distinguish verified from guessed
provenance is worse than one with no hover, because it implies a check happened.

## Deliverables

1. **Label `source_ref_export`, showing the three facts already in every entry:** which
   rule resolved it, whether the **sha256 was verified**, and the **export's filename**.
   `sha256_verified` is the fact that matters most and the one currently invisible.

2. **Read the rollups the same handoff added so the counts cannot be skipped past.**
   `crops.json`'s `summary` now carries `by_resolved_by` and `sha256_verified` — the
   banner could read those directly instead of only `summary.resolved` /
   `summary.unresolvable`. Surface them, so a reader sees "24 resolved, 24
   sha256-verified" rather than a bare resolved count that says nothing about
   verification.

3. **Deal with the two dead branches, deliberately.** Decide per branch and say why:
   - `provenance.sources_used` — the rule is **removed**, so nothing can ever carry it.
     Delete the branch. Leaving dead code that pretends to handle a case is how the next
     reader concludes the case is handled.
   - `joint_export_run` — the rule **still exists** in the crop script as a legacy
     fallback but nothing reaches it. Keep the branch (it is reachable in principle) but
     mark it as the legacy path, or remove the fallback from the script too. Do not
     silently keep both halves of a path nobody exercises; if you keep it, note what
     input would reach it.

4. **Fix the tests that pin the removed behaviour — this is the deliverable most likely
   to be skipped.** `apps/viewer/fixtures.js` still **fabricates** a
   `provenance.sources_used` entry and `apps/viewer/tests.js` asserts the viewer prints
   that string. Those two **pass today** and are misleading rather than broken: the JS
   suite is green while pinning behaviour for a rule that no longer exists, and it
   contains no fixture carrying `source_ref_export` at all — which is exactly why this
   bug was invisible to it.

   Replace the fixture with one that reflects the real `crops.json` shape (24 entries
   resolved by `source_ref_export`, `sha256_verified` set, `summary.by_resolved_by`
   populated) and assert the new labels. A green suite that cannot see the live data
   shape is the root cause here, not a side issue.

## Coordination — deliberately not chained

`HANDOFF_20260810_viewer_projection_provenance` (staged, `bug`/high) also edits
`apps/viewer/viewer.js`, and **no `depends_on` is set in either direction.** The fence:
that handoff owns the **top-level provenance banner** (adding stacks-dir, git branch
and HEAD sha so a reader can tell which tree built the projection); this one owns the
**per-crop `resolved_by` labels and hover**. They share no `crops.json` fields — this
handoff reads `resolved_by`, `sha256_verified` and `summary.by_resolved_by`, all of
which already exist on `master` and none of which that handoff changes.

Chaining them would hold a straightforward broken-label fix behind a concurrency
investigation for no reason. Whichever lands second rebases across the other in the same
file: re-run the JS suite and confirm the other's banner work is intact.

## Repro

```powershell
C:\workspace\drawing-checker\venv-win\Scripts\python.exe `
    scripts\build_viewer_crops.py --data-root C:\workspace\tolstack\data
```

Then open a hover on any element of `hub_bearing_thermal_fit_m2` and compare against
that element's entry in `data/projections/viewer/crops.json` (`resolved_by`,
`sha256_verified`, `run_id`).

**Two worktree cautions.** `data/projections/viewer/` is gitignored and exists **only in
the main checkout** — read and write it at `C:\workspace\tolstack\data\...` by absolute
path. And that directory is the subject of `viewer_projection_provenance`: it is a
**single directory shared by every live worktree**, and rebuilding it with an older
script over a newer one has already caused two recorded incidents
(`docs/issues/ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`).
If another session is live, prefer reading the existing `crops.json` to rebuilding it;
if you must rebuild, record `built_at` before and after in your lesson.

## Definition of done

- A hover on a `source_ref_export` crop names the rule, the export filename, and whether
  the sha256 was verified — demonstrated against the real
  `C:\workspace\tolstack\data\projections\viewer\crops.json`, not only against a fixture.
- The banner surfaces `summary.by_resolved_by` and `summary.sha256_verified`.
- No dead label branch remains unexplained; the `joint_export_run` decision is stated.
- `apps/viewer/fixtures.js` reflects the live data shape and `apps/viewer/tests.js`
  asserts the new labels. The JS suite is green **and** would now fail if a new
  `resolved_by` value appeared unlabelled — add that assertion explicitly, because it is
  the guard against the next occurrence of this exact bug.
- Full Python suite green too (`& C:\workspace\tolstack\venv-win\Scripts\python.exe -m
  pytest -q` — `venv-win` is gitignored and absent from your worktree).
- Lesson (`docs/sessions/lessons/LESSONS_20260810_viewer_source_ref_export_label.md`):
  the durable finding is that **a JS fixture hand-written from an older data shape let a
  green suite pin behaviour the live data cannot produce.** Say whether the fixture should
  be generated from (or checked against) real `crops.json` rather than hand-authored, since
  that is what would stop this recurring — and whether the same gap exists in the viewer's
  other fixtures.
