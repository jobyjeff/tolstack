---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_v2_carries_the_ten_citations_v1_already_has_and_its_own_stop_stacks.md
reviewer: agent
date: 2026-11-23
verdict: APPROVE
blockers: 0
---

# Review — v2 carries the ten citations v1 already has, and its own stop stacks

Merge: `handoff/<slug>` into `review/<slug>` (no conflicts, no markers; not previously contained in integration). `integration` unchanged during the run.

## Verified
- **Copy fidelity (computed by script, not read):** all ten v2 edges have the same `from`/`to`/`part` as v1's edge of the same id and a `dimension` equal to v1's, whole-object (nominal, band, `source_ref`, `export`). No other v2 edge, node or top-level field differs from integration; the ten edges changed only in `dimension` and `note`. v2 edges with a value: 10 of 105 (0 before).
- **Confidence honest, not upgraded:** 7 traced, 1 inferred (flatness), 2 untraced (`pitch_arm_link_hole_to_clocking_hole`, `pitch_link_length`, workbook bands). The handoff table called all ten drawing citations; the author copied verbatim as told, labelled the two accurately and filed `ISSUE_20261123_two_of_the_ten_v1_citations_v2_took_are_untraced_workbook_bands_not_drawings.md`. Correct handling under "do not change a value".
- **Study reads v2's own edges:** `pitch_link_length`, arm radius, mount height now `dimension_ref` v2; `tan_link_length` keeps its inline zero-centred band, with `borrowed_from` naming v2. Only the two 215735-A bands remain borrowed, as the handoff says.
- **Stop stacks:** travel study authored on v2 over the same four edges and pointed at by v2's kinematic study; the feather-stop stack correctly stays v1's (v2 lacks `piston_body_shoulder_to_top`/`flange_to_top`; named in the lesson). Hub-to-feather-stop remains a declared gap. Signs unchanged from v1's twin; the study folds to v1's number (test computes both).
- **Export runs:** `tests/test_export_runs_match_the_run_log.py` green with 213668-002's runs copied.
- **Traced ratio:** no stack elements added; the change is topology-edge citations. 7 traced / 1 inferred / 2 untraced of 10 new edge values.
- No `apps/`, v1, id/node/edge changes, `data/` or feature-identity writes.

## Tests
- Pre-merge risky subset: `tests/test_kinematic.py tests/test_topology.py tests/test_export_runs_match_the_run_log.py` all passed.
- Post-merge full `pytest -q` in the review worktree: 2598 passed, 1 skipped, 1 failed in 519 s (8m39s, under budget). The failure is the deliberate worktree red `test_viewer_js_suite_is_green` (no `data/projections`). Unexercised here: the viewer `[real]` tier.
- `node apps/viewer/run_tests.cjs`: 527/527 (real tier skipped, worktree); `node apps/annotate/run_tests.cjs`: 334/334.
- Diff touches nothing outside `docs/` plus tests, with no JS/CSS: browser tier and witness gate not run (no guard added, no spec needed).
- I did not re-shoot the +72 grid; I read the author's shot's account in the lesson only.

## Findings
None blocking. Nit: the lesson's "Looked at" shows the scratch build was from a dirty tree (banner); harmless.

Issues filed by the author cover the two untraced workbook bands. No new issues needed.
