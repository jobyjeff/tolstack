---
verdict: APPROVE
slug: v2s_standard_parts_cite_their_spec_sheets
branch: handoff/v2s_standard_parts_cite_their_spec_sheets
date: 2026-11-23
---

# Review — v2s_standard_parts_cite_their_spec_sheets

**APPROVE.** No inline fixes made; no conflict (the merge was a fast-forward).

## Re-read against the sheets (rendered myself)
- NAS77 (`JB_NAS77.pdf`): B 4.826 (+.038/-.000), D 7.965 starred (+.000/-.013), F 1.575 (+.00/-.13), H 11.100 (±.25) all match the A3 row. The two competing `*` footnotes (D column, and a stray one under B) are real; `od_D` is rightly `inferred` and no edge cites it.
- RBC p.19/20 (pdf 21/22): MS14101-3 row reads H .218/5.54, W .281/7.14 — event 0006 had them swapped, correction 0009 is right. MS14103-3 W .437/11.10 (H .327/8.31). W band +.00/-.05 mm → 7.09–7.14 and 11.05–11.10 as cited.
- NAS6403: grip 14 = .875, length 1.198; D .1895/.1890; BB .0040 (NAS6403 row). U14D event matches.
- The four cited edges (2 flange thickness, 2 inner race width) carry the right numbers; the 18 open edges say what the sheet gives instead and no band is derived by subtraction. Straightness BB is a per-inch rate and correctly left open.
- Shots: the bushing crop shows the NAS77A3 row boxed; digits match.

## Tests
Default pytest in this worktree (merged tree): 2607 passed, 1 skipped, 5 deselected (viewer JS worktree-red suite deselected, documented). `apps/` untouched, no guard added, so no browser/witness tiers needed.

## Notes
- The fold-can't-add-subject issue is filed with frontmatter (`ISSUE_20261122_...`), covering the one fenced-away follow-up.
- Open question D4 (A3 vs C3) stays Jeff's; the lesson records the sheet's answer (material letter only).
