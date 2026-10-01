---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-10-01 — one_part_feature_one_value_across_topologies: two topologies state the pitch link 3.41 mm apart and nothing can go red

> **⚠ INTERACTIVE EXCEPTION (HITL), 1 item:** if correcting the losing number
> moves a **committed study result**, you report the delta and stop — you do not
> re-baseline a published study. That item is LAST and nothing else waits on it:
> build the guard, write the cross-references, correct the document, and if a
> study moves, write the delta table and the proposal for Jeff and finish. Do
> not wait for an answer.

Source: `docs/issues/ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`
(`bug`, `priority: high`, `audience: strategy`), found during
`review/vpa_pitch_linkage_topology_and_feature_fits` and routed here by the
2026-10-01 triage sweep. **Routed tactical rather than to a brief, deliberately:**
the issue is marked `audience: strategy`, but the evidence below settles *which
number is right* to 0.000231 mm by two independent routes, so there is no
semantics call left — what remains is a guard, two notes, and a careful
correction. The alternative I rejected was filing a brief on "may a committed
value stay wrong"; that question is real but it is `link_name_authority`'s
(`docs/strategy/BRIEF_20260916_link_name_authority.md`, open), it is about
**names**, and holding a 3.41 mm published disagreement for a session slot to
answer it would be the wrong trade. If you disagree once you are in the code, say
so in the lesson rather than quietly widening scope.

Baseline: tolstack's trunk at `8547a5e1c0798b7e2e57659a19fdcbbed5860f37` (the
2026-10-01 batch merge; `pytest -q` green in the main checkout after a clean
projection rebuild, browser tier `25/25`). Scope: `docs/topologies/`,
`docs/SOP_TOLERANCE_STACK.md` if a listed divergence belongs there, and the
cross-stack pairing tests. Do NOT touch `scripts/run_mutation_witness_tests.mjs`
(owned by `mutation_witness_shadow_is_per_run`, staged in parallel) and do NOT
touch `data/projections/` or the freshness gate.

## The defect

Two committed documents carry an edge with id `pitch_link_length`, on part id
`pitch_link`, drawing `213862-002` in both, between the pitch-arm end and the
pitch-plate end of the same link:

| document | nominal | where it lives | source |
|---|---|---|---|
| `docs/topologies/topology_pitch_system.json` | **109.4 mm** at a 77° link angle | the edge's `properties.nominal_length_mm` | `260825_End_Stop_JC.xlsx`, `K3`/`K2` |
| `docs/topologies/topology_vpa_pitch_linkage.json` (new, 2026-09-30) | **105.9908 mm** | the edge's `dimension.nominal` | `250530_pitch_motion_ratios.xlsx`, sheet `250530 pitch sweep`, `C83:E83` vs `G83:I83` |

**They are the same dimension.** `pitch_system`'s edge runs
`pitch_plate_link_hole` → `pitch_link_arm_hole`; the new one runs
`pitch_link_lower_sphere_centre` → `pitch_link_upper_sphere_centre`. For an
`MS14101-3` spherical bearing the ball centre **is** the joint-bolt axis through
the housing bore, so these are one hole-to-hole distance, not two dimensions.

**It is not a pitch-condition difference.** Re-derived at review: across all 80
rows of the sweep (blade pitch −7° to +72°) the length ranges 105.9896–105.9915
— a spread of **0.0019 mm**. A rigid link has one length, so the 77° link angle
`pitch_system` names cannot account for 3.41 mm.

**Which one is wrong, with the evidence.** Almost certainly `pitch_system`'s
109.4. Two independent measurements agree on 105.9908:

- the 3DX sweep sheet's own two node columns, read cell-for-cell at review:
  `|A − P| = 105.99079988848088`;
- a fit of the installed `asm217755_MS14101_3_9bfdb344` mesh using the two
  `placement_world` matrices its own `provenance.json` records:
  `105.99056896582033` — a delta of **0.000231 mm**.

`109.4` traces to a different workbook (`260825_End_Stop_JC.xlsx`), is
`untraced` there, and is carried in `properties` rather than as a dimension. Its
own note records that the row's owner was re-identified twice (2026-09-06 and
2026-09-15) and that `213862-002`'s drawing is **still unacquired** — so the
nominal beside the band was never re-checked when the owner moved.

**Why nothing caught it.** `docs/SOP_TOLERANCE_STACK.md`'s 2026-09-15 amendment
already states the rule — *"The same part+feature carries the same band in every
stack that uses it … A divergence is now a defect; pin it with a cross-stack,
value-level test naming the stacks."* The test that enforces it,
`test_one_part_and_feature_folds_one_band_in_every_stack_that_uses_it`, reads
**stack elements**, so two topology edges fall outside it — and `pitch_system`'s
nominal sits in `properties` rather than a `dimension`, which puts it outside
any value-level pairing at all. The rule exists; its mechanism stops short of
where the data moved.

## Deliverables

1. **Cross-reference both ways, first and unconditionally.** Each document's
   edge note names the other document and the disagreement. Do this before
   deliverable 3 and independently of it: it is what the SOP amendment asks for
   directly (*"record any you are out of scope to fix as a listed divergence"*),
   it is correct whichever number later wins, and it is the only deliverable
   here that cannot be wrong.

2. **Extend the same-part-same-value pairing to topology edges, including a
   nominal carried in `properties`.** This is the mechanism that would have
   caught the disagreement on the day the second document was committed. Two
   guards stop at `STACKS_DIR` while topologies now carry dimensions too —
   this one and `test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered`
   (the widening review item `S1` asks for) — and the issue's own read is that
   they are **probably one change**. Investigate that: if one widening serves
   both, do it once and say so; if they genuinely differ, do both and say why.
   The test must fail on today's tree before you fix the data, and that red is
   the deliverable's proof — quote it in the lesson.

   Mind the grain: the pairing key is **part id + feature/edge id**, and the
   value may live at `dimension.nominal` *or* `properties.*`. A guard that only
   reads `dimension` reproduces the hole it is closing.

3. **Correct the loser, with a dated note rather than silently.** On the evidence
   above that means `pitch_system`'s 109.4. Say in `pitch_system`'s edge note what
   replaced it, why, and what the two agreeing measurements were — **several
   studies over that topology were built reading it**, so a reader who
   remembers 109.4 needs to find the explanation at the edge, not in a commit
   message.

   **Before you change it, enumerate what reads it**, and report that list in
   the lesson whether or not anything moves. If correcting the nominal moves a
   **committed study result**, that is the HITL item in the blockquote: produce a
   delta table (study, old value, new value, by how much) plus a one-paragraph
   proposal, and **stop there** — do not re-baseline a published study, and do
   not adjust a tolerance to absorb the change. If nothing committed moves, say
   that explicitly; it is the cheap outcome and it should be stated, not
   implied by silence.

   If the enumeration turns up a study whose *conclusion* flips (a stack that
   passed now fails, or the reverse), that is not a delta to table — stop, say
   so loudly at the top of the report, and leave the correction uncommitted.

## Definition of done

- Both topology documents carry an edge note naming the other and the
  disagreement, committed, and readable without opening the other file.
- The widened pairing test exists, was **RED** on the pre-fix tree (quote it)
  and is **GREEN** after, and it covers a nominal in `properties` as well as one
  in `dimension` — demonstrated by a test that would catch this exact pair.
- `pitch_system`'s `pitch_link_length` either carries the corrected value with a
  dated note, or carries an explicit uncommitted-correction note plus the
  delta table and proposal for Jeff, with the reason it stopped.
- The list of everything that reads `pitch_system`'s `pitch_link_length` is in
  the lesson, with "nothing committed moved" stated outright if that is the
  finding.
- Full suite green in the **main checkout**: `venv-win/Scripts/python.exe -m pytest -q`,
  plus `node apps/viewer/run_tests.cjs` and `node scripts/run_viewer_browser_tests.mjs`.
  Rebuild the projections **before** those node tiers, never after
  (`powershell -ExecutionPolicy Bypass -File scripts/rebuild_projections.ps1`),
  and rebuild against a **clean** tree — a dirty tree stamps `dirty: true` and
  the `[real]` tier then correctly refuses the projection (measured by the
  2026-10-01 sweep; stash unrelated edits first, and restore them after). From a
  worktree the venv is absent: use
  `C:\workspace\tolstack\venv-win\Scripts\python.exe` with your worktree as cwd.
  A docs-only change can legitimately redden this suite — that is the design.
- Lesson (`docs/sessions/lessons/LESSONS_20261001_one_part_feature_one_value_across_topologies.md`):
  whether the two guard widenings turned out to be one change or two and the
  evidence either way; what reads the corrected value and what moved; and
  whether any **other** part+feature pair disagrees across the topology corpus —
  the new guard answers that for free on its first run, and that answer is the
  thing the next session should not have to rediscover.
