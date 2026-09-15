---
priority: low
depends_on: [guard_mutation_witness_tier]
model: sonnet
---

# HANDOFF 2026-09-15 — viewer_hygiene_pass: four small, unrelated cleanups nobody else owns

Source: triage sweep 2026-09-14/15, sweeping up four `low`-priority issues that
are each too small for their own session and share no theme beyond being real.
Do them in any order; they touch different files.

**Why `depends_on: [guard_mutation_witness_tier]`** — item 1 edits
`scripts/run_viewer_browser_tests.mjs`, which that handoff restructures. Nothing
here is urgent, so wait rather than conflict.

Baseline: trunk after the 2026-09-14 batch merge, plus `guard_mutation_witness_tier`
merged. Scope: `scripts/run_viewer_browser_tests.mjs`, `apps/viewer/README.md`,
`apps/viewer/topology_app.js` (one constant), and a new pairing test. Do NOT
touch `apps/viewer/tests.js`'s `TOPO_VALUE_GUARDS`
(`HANDOFF_20260914_projection_field_guard_rows` owns it) and do NOT change any
app behaviour.

## Deliverables

1. **Delete the three dead `dismissCard` copies.**
   `viewer_dag_hover_cards` added a `dismissCard()` helper — move the pointer off
   the trigger first, *then* press Escape, because an Escape sent while the
   pointer still sits on a rail mark can be undone by the very next paint. **The
   helper is right and the reasoning in its comment is worth keeping.** It was
   pasted into four suite functions in `scripts/run_viewer_browser_tests.mjs` and
   only one uses it:

   | definition | calls |
   | --- | --- |
   | `testTheApp` (~line 356) | **none** |
   | `testTheTopologyPage` (~line 815) | 7 |
   | `testHeightBudget` (~line 1468) | **none** |

   (The issue lists a fourth definition; confirm the current count before
   deleting — line numbers will have moved under `guard_mutation_witness_tier`.)

   Keep **one** copy, shared, with its comment intact. If two suite functions
   cannot easily share a helper in that file's structure, say so and keep the one
   that is used rather than inventing a module system for it.

2. **Pair `REBUILD_DONE` with drawing-checker's constant, or stop hand-copying
   it.** `apps/viewer/topology_app.js` holds `var REBUILD_DONE = "done";`, with
   the full vocabulary (`idle | queued | running | done | failed`) belonging to
   another repo. **The value is right** and it was read from the server rather
   than guessed, exactly as `viewer_popover_clamp_and_rebuild_terminal_state`
   demanded. The gap is that nothing keeps it right.

   Add a test that pairs the two — reading drawing-checker's source of truth at
   its main checkout (`C:\workspace\drawing-checker\...`; find the real
   definition rather than trusting this handoff's guess at its path) and
   asserting tolstack's copy still matches. If drawing-checker exposes the
   vocabulary anywhere machine-readable, pair against that; if it only exists in
   Python source, a grep-based pairing test is acceptable and better than
   nothing. **Do not** import drawing-checker code.

   If the pairing genuinely cannot be tested from tolstack — e.g. the constant is
   only reachable over HTTP from a running service — report that instead of
   faking it, and say what would make it pairable. This is the same
   copied-value-across-repos shape as
   `forge/docs/sessions/HANDOFF_20260914_markdown_vendor_self_contained.md`; a
   line in your lesson comparing them is worth more than the test.

3. **Fix the viewer README's stale rail-allocation measurement.** In the
   column-reuse bullet (pre-existing, measured in `review/dag_viewer_poc`):

   > Measured in `review/dag_viewer_poc`: on the two committed topologies reuse
   > does not currently fire at all — **nine allocations over nine columns for the
   > pitch system, two over two for L1** …

   The live projection disagrees, and it now contradicts a *guarded* count in the
   same file:

   | topology | `layout.columns` | `layout.rails` |
   | --- | --- | --- |
   | `pitch_system` | 10 | 10 |
   | `pitch_link_to_pitch_plate` | 3 | 3 |
   | `rotor_fastener_length` | 10 | 10 |

   Re-measure from the live projection at
   `C:\workspace\tolstack\data\projections\viewer\topologies.json` (absolute
   path — it is not in your worktree), restate the bullet with today's numbers,
   and **guard it** the way the other count in that file is guarded, so it cannot
   go stale silently again. That guard is the deliverable; a corrected sentence
   with nothing pinning it will be wrong again in a month.

4. **`topology file://`'s real-data study loop hung once.** A nav click never
   went "stable" and the loop hung — observed **once**, not reproduced. Do not
   restructure the suite chasing it. Add a bounded wait with a clear timeout
   message naming the study it was on, so the next occurrence reports instead of
   hanging, and record in the lesson that the cause is still unknown. If you do
   manage to reproduce it, that is a finding worth its own issue.

## Definition of done

- `dismissCard` is defined once; the browser tier's pass count is unchanged
  (17/17 as last measured) and the 7 existing calls still work.
- A test pairs `REBUILD_DONE` to drawing-checker's vocabulary, **or** the lesson
  says why it cannot be paired and what would change that.
- The README's rail-allocation numbers match the live projection and a guard
  fails if they drift. Demonstrate the guard biting.
- The study loop's wait is bounded and its timeout message names the study.
- All tiers green: `node apps/viewer/run_tests.cjs` and `--repo
  C:\workspace\tolstack`, the browser tier, and
  `venv-win/Scripts/python.exe -m pytest -q` (869 passed / 1 skipped as of this
  staging).
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_viewer_hygiene_pass.md`):
  short is fine, but do record the `REBUILD_DONE` pairing outcome and whether the
  study-loop hang reproduced — those are the two that might come back.
