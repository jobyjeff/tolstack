---
type: chore
priority: low
status: open
area: tolerance_stacks
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_pitch_link_known_bands.md
---

# `joint.assembly_export` is a prose string, so the runs it names carry no `ts` and the read-only invariant cannot check them

`stack.py` has a first-class `SourceExport` — status, `pdf`, `sha256`, and
`runs` as `ExportRun(run_id, ts)` — and every element-level `source_ref` uses
it. A stack's **joint** does not: `joint.assembly_export` is a free string, e.g.

```
"[PRELIM 2026-AUG-3] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER.pdf (drawing-checker run 20260804_114000 / 20260803_145243)"
```

and `scripts/build_viewer_crops.py` gets at the run ids with a regex
(`bvc._RUN_ID_RE`).

That was harmless while the same runs were also cited at element level. It
stopped being harmless on 2026-09-15 (`pitch_link_known_bands`): the pitch-link
bushing and washer were re-cited when their bands were applied — to the
214820-002 part drawing and to the 260729 workbook — and those two elements were
the **only** carriers of the 217755 export block. The two runs are now named
only in the prose field, which has no `ts`, so
`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit` can
no longer check them. That test is this repo's one place where *"nothing was
written into drawing-checker"* is verified rather than asserted; it still bites
on the three 215197 runs, and its docstring records what it lost.

## What the fix is

Give `joint` a real `SourceExport` — the same object, the same validation, the
same `ExportRun(run_id, ts)` — and let the prose field keep its human sentence
or retire it. Then the runs-predate invariant reads joint-level and element-level
exports through one path, and `build_viewer_crops.py` can stop regexing a
sentence for an identifier.

It is a schema change with a migration across all seven stack files, which is
why it is filed rather than done inline.
