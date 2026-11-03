---
priority: med
depends_on: [tolstack/the_browser_tier_is_green_on_trunk_again]
model: sonnet
hitl: false
---

# HANDOFF 2026-11-02 — decayed_witnesses_are_repaired_or_retired: re-witness the 2026-10-28 sweep's NOT-WITNESSED entries on a green tier

Source: class `decayed_witness`:

- `docs/issues/ISSUE_20261028_witness_sweep_34_entries_decayed.md` (med). The 2026-10-28 `--full` sweep
  on trunk `04266cf55b67` found 426/460 witnessed. 30 of the 34 misses read "the tier was red before
  the mutation, so nothing was proved". 1 read "another check reddened, but not the declared one",
  and 3 read "the witness cannot see the difference".
- `docs/issues/ISSUE_20261030_two_viewer_browser_witnesses_not_witnessed_on_integration.md` (low).
  `browser__real-the-pane-itself-shows-no-banner-and-no-connect-butt__5c29720f` stays green under its
  mutation. `browser__real-toggling-unused-leaves-the-results-pane-s-dom-ident__05996459` reddens a
  different check.

Routed by the 2026-11-02 triage sweep. **Depends on `the_browser_tier_is_green_on_trunk_again`**:
on a red tier, a witness run cannot prove anything. 30 of the 34 entries are probably not decayed at
all, only unprovable, and the first step tells them apart. Baseline: tolstack master once that
dependency has merged. Scope: `scripts/mutation_witnesses/`, the specs the genuinely decayed entries
name, and `docs/issues/`.

## Deliverables

1. **Re-run every listed entry on the now-green tier** with
   `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only <guard>`, using
   each entry id from the two issues. Sort each one into exactly one of three outcomes:
   - **witnessed** — the miss was the red tier, and nothing changes;
   - **repaired** — the mutation or the declared check is updated to what the guard now asserts;
   - **retired** — the guarded behaviour no longer exists. Cite the commit that removed it.
2. **For "cannot see the difference" and "another check reddened", fix the witness, not the guard.**
   The guard is right unless you can show otherwise, and if you show otherwise, say so in the lesson.
   Never delete an entry just to make the count whole.

## Definition of done

- Every entry in both issues has a recorded verdict in the lesson's table, and none is left
  unaddressed.
- `node scripts/run_mutation_witness_tests.mjs --changed-since master` is green for the entries you
  changed.
- The default tier is green.
- Lesson (`docs/sessions/lessons/LESSONS_20261102_decayed_witnesses_are_repaired_or_retired.md`): the
  per-entry table (witnessed / repaired / retired, each with a reason), and how many of the 34 were
  only the red tier.
