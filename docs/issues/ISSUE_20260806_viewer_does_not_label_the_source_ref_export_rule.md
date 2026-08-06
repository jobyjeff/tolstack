---
type: bug
priority: med
status: open
area: apps/viewer / crop provenance display
reporter: agent
---

# The viewer has no label for `resolved_by: "source_ref_export"`, and its two labelled branches are now dead

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
