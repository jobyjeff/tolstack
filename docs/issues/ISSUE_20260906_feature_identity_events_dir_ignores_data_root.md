---
type: bug
priority: high
status: open
area: tolerance_stack/feature_identity
reporter: agent
---

# `build_feature_identity_projection.py`'s `--events-dir` default ignores `--data-root`, so the documented worktree recipe silently rebuilds an empty projection

Found in review of handoff `annotation_surface_mvp` (2026-09-06); reported as
the blocker in `docs/sessions/reviews/REVIEW_20260906_annotation_surface_mvp.md`
and sent back as REQUEST CHANGES. Filed separately so it has an owner
independent of that report.

`tolerance_stack/feature_identity.py`'s `EVENTS_DIR = REPO_ROOT / "data" /
"inbox" / "feature-identity"`, where `REPO_ROOT = Path(__file__).resolve()
.parent.parent` -- i.e. wherever the module physically lives, not
`--data-root`. `scripts/build_feature_identity_projection.py --data-root
<path>`'s `out_dir` correctly follows `--data-root`; `--events-dir`'s default
does not.

Every other projection builder in this repo can get away with a
REPO_ROOT-relative input default because its input lives under tracked
`docs/` (identical between a worktree and the main checkout). This
projection's input, `data/inbox/feature-identity/`, is gitignored --
**not** identical between the two, exactly like the output is. So the
standard recipe this repo's own `CLAUDE.md` and every other script's
docstring teaches ("anything that writes there takes `--data-root`; point it
at the main checkout") is not sufficient here: passing `--data-root` alone
from a worktree silently reads the **worktree's own empty** `data/inbox/
feature-identity/` while writing the output into the **main checkout's**
`data/projections/feature-identity/bindings.json`.

**Reproduced** (review session, 2026-09-06): copied a real fixture event
into `C:\workspace\tolstack\data\inbox\feature-identity\`, ran the
documented command from a worktree:

```
C:\workspace\tolstack\venv-win\Scripts\python.exe scripts\build_feature_identity_projection.py --data-root C:\workspace\tolstack\data
```

Output:

```
wrote C:\workspace\tolstack\data\projections\feature-identity\bindings.json
  0 stack key(s) from 0 event(s)
```

A stamped, gated, plausible `bindings.json` claiming zero bindings while a
real event sat one directory away. No error, no warning. (Probe file and the
resulting projection directory were removed afterward; main checkout is back
to its pre-test state.)

**Nothing tests the CLI path at all.** `tests/test_feature_identity.py`'s 28
tests call `build_projection`/`revalidate`/the dataclasses directly, never
`rebuild()` or `main()` -- so the `--data-root`/`--events-dir` resolution
this bug lives in has zero coverage.

**Suggested fix:** derive `--events-dir`'s default from `--data-root` when
not explicitly passed (`Path(args.data_root) / "inbox" / "feature-identity"`),
the same way `out_dir` already does -- or refuse to run when the two roots
disagree in a way that looks like a worktree/main-checkout mismatch. Add a
test that runs `main()` (or `rebuild()`) with only `--data-root` pointed at a
tmp dir seeded with both an events file and nothing under the module's own
`REPO_ROOT`, asserting the event is picked up. Also update
`data/inbox/feature-identity/README.md` and
`docs/sessions/lessons/LESSONS_20260906_annotation_surface_mvp.md`'s "what
the endstop/stroke stack-build handoffs should consume" section once fixed,
since both currently give the bare `--data-root`-only recipe as sufficient.
