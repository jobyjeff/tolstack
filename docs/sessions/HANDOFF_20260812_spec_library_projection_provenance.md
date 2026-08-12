---
priority: med
depends_on: []
---

# HANDOFF 2026-08-12 — spec_library_projection_provenance: the third shared-projection writer, and the only one with no stamp at all

Source: `docs/issues/ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md`,
found by `review/viewer_projection_provenance` (2026-08-10) while auditing that
handoff's own claim. Baseline: trunk with `viewer_projection_provenance` merged
(that is where `scripts/projection_provenance.py` comes from). Scope:
`tolerance_stack/spec_library.py` and its tests. Do **NOT** touch
`apps/viewer/` — `viewer_fixture_shape_guards` and
`viewer_export_and_material_provenance` own it — and do not re-open the two
viewer projections, which are done.

## Read this first: the audit that missed it, and why

`viewer_projection_provenance` fixed the two viewer projections and its lesson
concluded the class had "exactly two members". **It has three.** The audit
grepped `scripts/` and `tests/` for writers with a `--data-root`-style default;
this writer lives in `tolerance_stack/` and has no such flag, which is precisely
why the grep missed it. Take that as a warning about how you scope your own
audit at the end of this handoff.

## What it is

`tolerance_stack/spec_library.py`:

```python
REPO_ROOT = Path(__file__).resolve().parent.parent
PROJECTION_DIR = REPO_ROOT / "data" / "projections" / "spec_library"

def rebuild(events_dir=EVENTS_DIR, out_dir=PROJECTION_DIR) -> Path: ...
def main() -> int:
    out = rebuild()          # no argv, no --data-root, no way to redirect
```

`rebuild()` is wipe-and-rebuild over `library.json`. `main()` — what
`python -m tolerance_stack` runs, the repo's **only executable entry point** —
takes no arguments.

## Why it is the same class with the knobs turned worse

1. **A worktree's rebuild goes nowhere and nothing says so.** `REPO_ROOT` is the
   tree the module lives in, so from a worktree it writes that worktree's
   gitignored `data/`, which is deleted at cleanup; the shared artifact in the
   main checkout is untouched. Reproduced from
   `tolstack-worktrees/viewer_projection_provenance-review`, which printed
   `wrote …/viewer_projection_provenance-review/data/projections/spec_library/library.json`.
   The two viewer scripts at least *let* you name the main checkout; this one
   cannot be pointed there at all. **You will hit this yourself** — you are in a
   worktree.
2. **From the main checkout it is last-writer-wins with no provenance
   whatsoever** — no `built_at`, no `built_by`, no branch, no sha. `results.json`
   at least had a timestamp before this month's work. Staleness here is knowable
   only from filesystem mtime: the copy at
   `C:\workspace\tolstack\data\projections\spec_library\library.json` is dated
   2026-08-05 and predates the last edit to `docs/spec_library/events/`. Its
   content still matches a fresh rebuild — **that is luck, not a property**, and
   nobody could have known it without rebuilding.
3. **It is the higher-leverage projection.** `library.json` is what a stack's
   `library_ref: "spec_library:NAS6403U11D"` resolves through, so a stale or wrong
   value here launders into a stack wearing `confidence: "traced"` — the failure
   mode this repo's review checklist calls its worst class of defect. The viewer
   projections are a *reading* surface; this one is a *provenance* surface.

## Answer the design question before you write the stamp

The issue raises it and it is the reason this is `med` and not `high`: **should
`library.json` be derived-and-gitignored at all?** Its inputs
(`docs/spec_library/events/*.json`) are committed, and the projection is a pure
function of them — so a consumer resolving `library_ref` could build it in
process and skip the shared-file problem entirely. That would make the stamp
**unnecessary rather than better**, and doing the stamp first would be work
thrown away.

Decide this first. If in-process derivation wins, deliverables 2–3 below are
replaced by that; say so and do that instead.

## Deliverables (if the file stays a shared artifact)

1. **Decide the question above and record the argument**, whichever way it goes.
2. **Give `main()` an argparse** with `--data-root` (default `REPO_ROOT / "data"`,
   as today, so nothing existing breaks) and `--allow-older-tree`, so it can be
   pointed at the main checkout the way the viewer builders are.
3. **Stamp `provenance` into `library.json` and gate the rebuild on ancestry.**
   `scripts/projection_provenance.py` is stdlib-only and not viewer-specific;
   `stamp()` and `guard()` are two calls on any JSON output file. Decide whether
   `library.json` should also carry a top-level `built_at` for symmetry with the
   other two projections, and say why.
4. **Re-run the class audit properly.** The one that missed this file searched
   two directories for one flag shape. Search for *writers of anything under
   `data/projections/`* across the whole repo, by what they write rather than by
   how they are configured, and state the resulting member list in the lesson.
   If it is now three, say so and say how you know.

## Nothing is currently broken — do not report otherwise

Verified in the issue by rebuilding and diffing: the tree is consistent today.
This is the same latent hazard the viewer projections carried for two months
before it fired three times. Do not manufacture a breakage to justify the fix.

## Definition of done

- The design decision from deliverable 1 is recorded with its argument.
- If the file stays: `python -m tolerance_stack --data-root C:\workspace\tolstack\data`
  works from a worktree, `library.json` carries provenance, and a rebuild from a
  non-ancestor tree refuses. Demonstrate the refusal.
- Rebuilt `library.json` is byte-identical in content to the current one except
  for the added provenance — if it is not, **stop and report**, because that
  means the committed events and the shared file have silently diverged.
- Tests green, including a value-level test of the ancestry guard.
- Lesson (`docs/sessions/lessons/LESSONS_20260812_spec_library_projection_provenance.md`):
  the deliverable-4 audit's member list and the method that produced it.
