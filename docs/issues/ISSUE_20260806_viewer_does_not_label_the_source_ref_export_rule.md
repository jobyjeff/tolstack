---
type: bug
priority: med
status: resolved
handoff: docs/sessions/HANDOFF_20260810_viewer_source_ref_export_label.md
area: apps/viewer / crop provenance display
reporter: agent
---

# The viewer has no label for `resolved_by: "source_ref_export"`, and its two labelled branches are now dead

> **RESOLVED 2026-08-11** by handoff `viewer_source_ref_export_label`. The if/else
> chain is now `VA.CROP_RULES`, one entry per rule the crop script can emit; an
> export-resolved hover reads *"read from the export this citation names,
> 212966-006-A.pdf — sha256 VERIFIED"*. `provenance.sources_used` is deleted,
> `joint_export_run` is kept and labelled LEGACY (the input that still reaches it
> is named in the code comment), and a `resolved_by` value with no entry in the
> table now renders loudly and shows up in the banner via
> `VA.unlabelledCropRules()` — the guard against a repeat. The banner reads
> `summary.sha256_verified` and `summary.by_resolved_by`, so the count arrives as
> *"26 resolved — 22 sha256-verified, 4 with no sha to check"*.
>
> The misleading fixture was the root cause and is fixed too: `fixtures.js`
> carried a fabricated `provenance.sources_used` entry and a summary with no
> rollups, and a `[real]` test now compares the fixture's crop-entry and summary
> key sets against the live `crops.json` so it cannot drift again. JS 95/95,
> Python 340 passed / 1 skipped.
>
> One count correction: the issue says 24 resolved crops, all
> `source_ref_export`. At the time of the fix the live projection has **26** — 22
> `source_ref_export` and 4 `spec_pile` — because `fastener_citations_and_confidence`
> landed four spec-pile citations in between. `spec_pile` has no sha to verify
> (the pile is append-only, so a filename is its identity), which is exactly why
> the label distinguishes "not verified" from "no sha to check".

`apps/viewer/viewer.js` explains a crop's provenance by switching on
`crops.json`'s `resolved_by`. As of `citation_export_provenance` (2026-08-06) all
24 resolved crops carry `resolved_by: "source_ref_export"` — a value the viewer
has never seen — while the two branches it does label are both stale:

- `provenance.sources_used` (viewer.js ~line 180) is **dead**: that resolution
  rule was removed, so no entry can carry it again.
- `joint_export_run` still exists in the crop script as a legacy fallback but no
  citation in the repo reaches it any more (every one now carries
  `source_ref.export`), so its branch is dead in practice too.

So the hover most likely falls through to whatever the default is, and the one
piece of provenance worth showing — **this crop's PDF was sha256-verified against
the export the citation names** — is not shown at all. That is the opposite of
what the crop hover is for: the reason `source_ref_export` exists is that a crop
of a guessed export looks perfectly correct on screen.

Not fixed inline: `apps/viewer/` is owned by the parallel staged handoff
`viewer_generated_checks`, and `citation_export_provenance`'s handoff says
explicitly not to touch it.

## Repro

```powershell
C:\workspace\drawing-checker\venv-win\Scripts\python.exe `
    scripts\build_viewer_crops.py --data-root C:\workspace\tolstack\data
```

Then open a hover on any element of `hub_bearing_thermal_fit_m2` and compare
against that element's entry in
`data/projections/viewer/crops.json` (`resolved_by`, `sha256_verified`, `run_id`).

## What it should say

The three facts already in every entry: which rule resolved it, whether the
sha256 was verified, and the export's filename. `crops.json`'s `summary` now
carries `by_resolved_by` and `sha256_verified` rollups (added by the same handoff
so the counts cannot be skipped past) — the banner could read those directly
instead of only `summary.resolved` / `summary.unresolvable`.

Also worth deciding while in there: `apps/viewer/fixtures.js` still fabricates a
`provenance.sources_used` entry and `apps/viewer/tests.js` asserts the viewer
prints that string, so the JS suite pins behaviour for a rule that no longer
exists. Those two pass today and are misleading rather than broken.
