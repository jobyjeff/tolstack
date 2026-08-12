---
priority: med
depends_on: [viewer_fixture_shape_guards]
---

# HANDOFF 2026-08-12 — viewer_export_and_material_provenance: the citation panel renders none of `source_ref.export`, so an unestablished export is invisible

> **Why `depends_on: viewer_fixture_shape_guards`** (one line, so you can check
> the reasoning): you cannot pin how the viewer renders `source_ref.export`
> without a fixture that *contains* `source_ref.export`, and no fixture does —
> that is the other handoff's deliverable 3, including the `unestablished` case
> this one most needs. Both handoffs would otherwise add the same fields to
> `fixtures.js` and collide. Running fixture-first also means this handoff
> inherits the value-level guards, so a `status` value it forgets to branch on
> fails a test instead of rendering blank.

Source: `docs/issues/ISSUE_20260811_viewer_shows_nothing_for_source_ref_export.md`,
filed by `viewer_source_ref_export_label` (2026-08-11), whose scope was the crop
`resolved_by` labels, the hover and the banner rollups. Baseline: trunk with
`viewer_fixture_shape_guards` merged. Scope: `apps/viewer/views/stack.js`. Do
**NOT** edit `apps/viewer/fixtures.js` or `tests.js` structure beyond adding
assertions — the shapes land in the dependency — and do **NOT** touch
`tolerance_stack/spec_library.py`, owned by `spec_library_projection_provenance`.

## The defect

`grep -n "export" apps/viewer/views/stack.js` returns **nothing**. Every citation
in the live projection has carried a structured `source_ref.export` block since
`citation_export_provenance` (2026-08-06):

```json
"export": {"status": "established",
           "pdf": "C:/workspace/drawing-checker/data/inbox/drawings/[PRELIM …] 217755 A.1 ….pdf",
           "sha256": "c6381f20…", "runs": [{"run_id": "20260803_145243", …}],
           "note": "Established 2026-08-06 by handoff citation_export_provenance from …"}
```

`VA.citationWhere` prints document/rev/sheet/view/zone/cell. The export block —
its `status`, `sha256`, `runs` and `note` — is dropped entirely.

## Why this is a bug and not a missing nicety

The consequence is **asymmetric**, and that asymmetry is the argument. As of
2026-08-11 the crop hover does say "read from the export this citation names,
X.pdf — sha256 VERIFIED" — but only for the **26 citations whose crop resolved**.
For the **22 unresolvable ones** the export block is the only place a reader could
learn why.

The strongest case is `status: "unestablished"`: the stack is stating outright
that the bytes behind this value cannot be identified, with a recorded `why`, and
the element row shows the **same "traced"/"inferred" chip** as a citation whose
export is nailed down. The crop popover carries the reason today — which means a
fact about the *citation* is reachable only through a *crop*. In a repo whose
worst-defect class is a provenance record making a false-looking claim, that is
the wrong way round.

## Deliverables

1. **Render the export block per citation:** `status` (loudly when
   `unestablished`, with its `why`), the `pdf` basename, the fact that a
   `sha256` is recorded, and the `runs` ids — which the crop hover already links
   when a crop resolved, so reuse that link treatment rather than inventing one.
2. **Decide where `note` goes and say why.** It is often a paragraph describing
   how the export was established. Inline, clamped like the existing source-note,
   or on hover are all defensible; picking one silently is not.
3. **Render the material entry's provenance too — same job, same panel.**
   `library_ref`, `values_status`, `class`, `designation_source` and
   `applied_over_c` are in the live `results.json` and rendered nowhere (same
   grep). `library_ref` is what `spec_library:NAS6403U11D` resolves through, so it
   is the provenance of a **number**, not a label. Related context, not a
   dependency: `ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md`
   covers the projection that `library_ref` resolves *into*; it is staged
   separately and touches no file this handoff owns.
4. **Fixture-tier tests for each new rendering**, including the `unestablished`
   path. The value-level guards from the dependency should already fail if you
   miss an enumerated `status` value; confirm that they do rather than assuming.

## Repro

```powershell
& C:\workspace\tolstack\venv-win\Scripts\python.exe -c "import json;d=json.load(open(r'C:\workspace\tolstack\data\projections\viewer\results.json'));s=[x for x in d['stacks'] if x['id']=='pitch_link_to_pitch_plate'][0];print(json.dumps(s['stack']['elements'][0]['source_ref']['export'],indent=1))"
```

(`data/` is gitignored — that is a main-checkout absolute path and the file does
not exist in your worktree.) Then open that element's row in the viewer: nothing
on the page mentions the export, its sha or its runs.

## Definition of done

- For an element whose `export.status` is `established`, the panel shows the pdf,
  that a sha256 is recorded, and the run ids.
- For one whose status is `unestablished`, the panel says so **prominently** and
  shows the recorded `why`, without needing a crop to be resolved. Demonstrate
  this against one of the 22 unresolvable citations, named in the lesson.
- Material provenance fields per deliverable 3 render.
- Fixture-tier coverage per deliverable 4; full JS suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260812_viewer_export_and_material_provenance.md`):
  the deliverable-2 decision, and whether a reader can now tell an
  `unestablished` citation from an established one **from the element row
  alone** — if they still cannot, say so, because that is the next issue.
