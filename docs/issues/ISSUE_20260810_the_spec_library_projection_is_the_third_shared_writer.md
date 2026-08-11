---
type: bug
priority: med
status: open
area: spec library / projections
reporter: agent
---

# `python -m tolerance_stack` is the third writer to a shared gitignored projection, and the only one with no stamp at all

Found by `review/viewer_projection_provenance` (2026-08-10) while checking that
handoff's own audit of the class. That handoff fixed the two viewer projections —
`data/projections/viewer/{results,crops}.json` now carry branch, HEAD sha,
resolved stacks-dir and `built_at`, and a rebuild from a non-ancestor tree
refuses (`scripts/projection_provenance.py`). Its lesson concluded the class had
"exactly two members". It has three: the audit grepped `scripts/` and `tests/`
for writers with a `--data-root`-style default, and this one lives in
`tolerance_stack/` and has no such flag, which is exactly why the grep missed it.

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
`python -m tolerance_stack` runs, the repo's only executable entry point — takes
no arguments.

## Why it is the same class, with the knobs turned worse

1. **A worktree's rebuild goes nowhere and nothing says so.** `REPO_ROOT` is the
   tree the module lives in, so from a worktree it writes that worktree's
   gitignored `data/`, which is deleted at cleanup. The shared artifact in the
   main checkout is untouched. Reproduced: from
   `tolstack-worktrees/viewer_projection_provenance-review` it printed
   `wrote …/viewer_projection_provenance-review/data/projections/spec_library/library.json`.
   The two viewer scripts at least *let* you name the main checkout; this one
   cannot be pointed there at all.
2. **From the main checkout it is last-writer-wins on a file with no
   provenance whatsoever** — no `built_at`, no `built_by`, no branch, no sha.
   `results.json` at least had a timestamp before this month's work; this has
   nothing, so staleness is knowable only from the filesystem mtime. The copy in
   `C:\workspace\tolstack\data\projections\spec_library\library.json` is dated
   2026-08-05 and predates the last edit to `docs/spec_library/events/`. Its
   content still matches a fresh rebuild — that is luck, not a property, and
   nobody could have known it without rebuilding.
3. **It is the higher-leverage projection.** `library.json` is what a stack's
   `library_ref: "spec_library:NAS6403U11D"` resolves through, so a value that is
   wrong or stale here launders into a stack wearing `confidence: "traced"` — the
   failure mode the review checklist calls the worst class of defect in this repo.
   The viewer projections are a *reading* surface; this one is a *provenance*
   surface.

## Suggested fix — small, and the machinery already exists

`scripts/projection_provenance.py` is stdlib-only and not viewer-specific;
`stamp()` and `guard()` are two calls on any JSON output file. So:

- give `main()` an argparse with `--data-root` (default `REPO_ROOT / "data"`, as
  today) and `--allow-older-tree`, so it can be pointed at the main checkout the
  way the viewer builders are;
- stamp `provenance` into `library.json` and gate the rebuild on ancestry;
- decide whether `library.json` should carry `built_at` at top level too, for
  symmetry with the other two projections.

Open question for whoever picks this up, and the reason this is `med` and not
`high`: **should `library.json` be derived-and-gitignored at all?** Its inputs
(`docs/spec_library/events/*.json`) are committed and the projection is a pure
function of them, so a consumer that resolves `library_ref` could build it in
process and skip the shared-file problem entirely. That is a design call, not a
fix, and it would make the stamp unnecessary rather than better.

## Not blocking anything

Nothing is currently wrong in the tree — verified by rebuilding and diffing. This
is the same latent hazard the viewer projections carried for two months before it
fired three times.
