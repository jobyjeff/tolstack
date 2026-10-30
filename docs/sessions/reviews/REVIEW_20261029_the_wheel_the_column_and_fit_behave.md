---
verdict: APPROVE
---

# Review — the_wheel_the_column_and_fit_behave (2026-10-29)

**Verdict: APPROVE.** Merged into `integration`.

- Handoff branch was not contained in `integration` before review; merge conflicted only in `scripts/guard_enumeration.mjs` (browser census; integration had renamed one guard). Re-pinned: declared 733 / enrollable 700 / names `8a6219644d8d` (counts agree with the branch; digest measured by the census test).
- Projections rebuilt from this tree (generate_js_vocabulary + five builders; crops via drawing-checker python) before the tiers ran.
- Results: viewer 622/622, annotate 255/255, `tests/test_mutation_witnesses.py` 44 passed. Browser tier 34/35 on two runs and an abort on a third, each time a *different* suite (crop lightbox; 3D pane follows; box loaded by other agents). Each passed in isolation (`--only`), as did "the DAG zoom, Fit and the grid header" 34/34 — matches the author's flake report.
- Witnesses `--changed-since integration`: 5/6; the one NOT WITNESSED (`...compact-density-fit...d8652b23`) is the pre-existing masked witness, filed as an issue by the author and measured on the parent commit.

## Notes for the operator (not blockers)
- Deliverable 2 is met at rest (COMPONENT never under the DAG at zoom 1 and Fit; root cause = zoom's horizontal anchoring scrolled the grid under the sticky rails). The author deliberately did **not** pin COMPONENT, and "all columns fit the frame" holds at Fit zoom, not zoom 1 (606px DAG in a ~738px pane). Reasoned in the lesson; accepted.
- Before/after screenshots from the DoD are not committed to the branch.
- Four new guards are pinned without mutation specs (declared in the lesson).
