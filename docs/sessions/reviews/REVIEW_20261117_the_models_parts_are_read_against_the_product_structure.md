---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_the_models_parts_are_read_against_the_product_structure.md
reviewer: agent
date: 2026-11-17
verdict: APPROVE
blockers: 0
---

# Review — the_models_parts_are_read_against_the_product_structure

## Verified
- Diff vs `integration`: exactly two new files, both in `docs/sessions/lessons/` (page + lesson). Nothing in `docs/topologies/`, `tolerance_stack/`, `apps/`. Not previously merged (no ancestry).
- Page has the three tables (Table 1 has 15 rows), a proposed tree per body marked "in the model" / "would be added" / "needs a mesh split", and top-three lines. Cells carry source tags ([M] [P] [E] [F] [V1]).
- Spot-checked solid counts against `data/meshes/<sha>/provenance.json`: hub 286, mount 215175 40, 213668 1, blade 20, plate 10, pitch link 5, tan link 4 — all match.
- Feature-identity directory: 84 entries now, matches the page's before/after record.
- No bare `claim` fences in either file (blockquote rule not at issue).
- Enovia was read (token set); gaps (which binding moves to which child, collectors-as-assemblies, STEP rev vs Enovia rev) are stated as not read / Jeff's decision rather than guessed — meets "no guessing".
- After merge: `pytest -q` with `tests/test_viewer_js_suite.py` deselected (worktree cannot run it): 2027 passed, 1 skipped.

## Not run
- The node tiers (viewer/annotate/browser/witness) — the diff touches only `docs/sessions/lessons/`, no code, no guard, no vocabulary; they read the main checkout and cannot be affected.
- Enovia queries were not re-run (live, read-only; the page's claims are internally consistent and sourced).

## Findings
None blocking. Nit: the lesson's "Suite record" says "See the hand-back report" — that report is not in the tree; harmless.
