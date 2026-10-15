---
verdict: APPROVE
---

# Review — annotate_texts_follow_the_installed_mesh_store

**APPROVE.** Branch `handoff/annotate_texts_follow_the_installed_mesh_store` (one commit, 38492d4).

- Cap 64 -> 256; the pinned `>= 29` literal replaced by a `[real]` check that walks the store's
  `provenance.json`s (measured: CCR244CS-3-02 x66, cap 256; requires cap >= 2x most-repeated, and
  fails loudly rather than vacuously if no mesh records an occurrence). Test no longer hardcodes 64/70.
- Prose sites: sweep.js comment and ANNOTATION_SURFACE.md no longer name a part or number; both point
  at the check. README piston example dropped.
- Piston alias row added (part_id `asm217755_214700_002` verified against the store's provenance.json);
  topology note rewritten. Mutation spec enrolled; guard pin bumped 188 -> 189.
- Verified: set cap to 64 by hand -> `[real] the draw cap ...` FAILS (188/189); restored.
- Merge conflict in `scripts/guard_enumeration.mjs` (browser pin moved on integration via the parallel
  handoff): resolved keeping integration's browser line and this branch's annotate line.

Tests: post-merge in the review worktree, `node apps/annotate/run_tests.cjs` 189/189 (real tier ran, via
the main-checkout fallback); `pytest -q` 1445 passed, 1 skipped, viewer-JS-suite file deselected (needs
main-checkout node_modules/projections — not exercised here; the operator's batch-merge run covers it,
along with the browser TRUTH and mutation-witness tiers, which I did not run). The tactical agent's
run was not repeated.
