---
type: review
handoff: docs/sessions/active/HANDOFF_20261106_the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE
blockers: 0
---

# Review — the kinematic study reads the republished sweep, and its checks match by id

- Diff matches the handoff: study `run_id` + provenance re-pointed; `SWEPT_JOINT_EDGES` maps `plate_slide` to `pitch_plate_slide_bushings_to_piston_body`; both red browser checks now match `edgeName(id)` read from the projection; the pins (`SWEEP_RAIL_RUN` + its spec, `run_browser_check.mjs`, `P2_FILE`, `tests.js`) moved. The one remaining old-run mention in `tests.js` / study provenance is a historical sentence.
- `cylindrical_slide` call: declined with a named dependency (`AXIS_INTERFACES`, `test_real_the_hub_and_pitch_plate_coaxiality_is_judged_as_axes`) and an issue filed with frontmatter — the handoff allowed exactly this.
- Annotate P2 joint check updated to two merged joints / five measured edges: consistent with the new run.
- Post-merge: `pytest -q` on the targeted modules 248 passed; full default tier 1737 passed, 1 failed (`test_viewer_js_suite_is_green`, the documented worktree-only red), 1 skipped, 452 s. Author reports viewer 666/666, annotate 295/295, browser 43/43, witness gate 10/10 — not re-run by me (main-checkout tiers).
- Nit (not blocking): the lesson's screenshot shows the sweep pane booting, not the plate slide's joint rows (below the fold); the ends are pinned by the annotate check instead.
