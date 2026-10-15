# Lessons — annotate_texts_follow_the_installed_mesh_store (2026-10-15)

## Measured (store at C:\workspace\tolstack\data\meshes\, 47 provenance.json read)

Most `extraction.instances[]`: `asm217755_CCR244CS_3_02` 66, `asm217755_NAS1149V0332H` 29,
`asm217755_MS21299C3K` 16, `asm217755_MS21071L3` 13. The new piston mesh
(`asm217755_214700_002`) is one solid, one instance (`P3-214700.3/.../214700-002.1`).

## Cap: 64 -> 256

Chosen as the handoff suggested; no measurement argued against it (66 x ~1,228 triangles is
~81 k). The `[real]` check asserts `cap >= 2 x most-repeated`, so the store can grow to 128
before the cap needs another look; 256 is above that by design. The check lives beside the
alias-table `[real]` tier in `apps/annotate/run_tests.cjs`, skips honestly with no store.
Mutated to 64 it goes red (recorded: "cap 64 is under twice the most-repeated … 66"), and it
is enrolled as a mutation spec (the annotate tier accepts `[real]` guards).

## Prose sites

Changed: `sweep.js` cap comment, `docs/ANNOTATION_SURFACE.md` "Where a part is drawn" (both
now name no part or count; the doc points at the check), `run_tests.cjs` (the pinned `>= 29`
removed). The placement-rule fixture's hard-coded 70-occurrence rivet failed at 256, so it is
now `cap + 6`. Left: `run_browser_check.mjs` reads the cap generically (no change needed).
`README.md`'s piston example dropped rather than replaced.

## Piston

Alias row `gas_spring_piston_214700_002 -> asm217755_214700_002` added; topology row's note
rewritten. The annotate `[real]` alias check resolves it (189/189).

## Not run / environment

Worktree `pytest -q`: 1440 passed, 6 failed, 1 skipped (238s) BEFORE enrolling the spec:
`test_viewer_js_suite` (known worktree-red tier), four `test_mutation_witness_shadow_concurrency`
(shadow tree cannot see the main-checkout projection / EPERM reaping a stale tmp dir in the
worktree), and the census pin, which my change moved and the spec + `guard_enumeration.mjs`
pin (`annotate: 189`) then fixed (re-run: mutation/alias/type-scale tests 40 passed). The
main-checkout tiers (viewer node, browser TRUTH, projection rebuild) were NOT run: they read
the main checkout, which does not hold this branch.
`scripts/guard_enumeration.mjs` was touched (census pin) -- not in the handoff's scope list but
the pin is the mechanism that demands it.
