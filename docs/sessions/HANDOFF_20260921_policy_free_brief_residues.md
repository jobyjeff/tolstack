---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-21 — policy_free_brief_residues: three briefs' explicitly policy-free halves, none of which needs the decision it is sitting behind

Source: the 2026-09-21 triage sweep's strategy-brief consolidation pass, which
read all 15 of tolstack's open briefs and found that three of them carry work
their own text marks as **safe to do before the decision lands**. Each item
below is quoted from the brief that owns it. Baseline: tolstack trunk at
`1946330`, the 2026-09-21 batch merge, with `scripts/rebuild_projections.ps1`
already re-run (all three projections at `behind_trunk=0`). Scope: you own
`apps/viewer/views/banner.js`, `scripts/run_viewer_browser_tests.mjs` and
`docs/topologies/topology_pitch_system.json`. Do **NOT** touch
`apps/viewer/topology.js`'s layout maths, the DAG geometry, the hover-card
mechanism, or `apps/annotate/storage/` — those are the undecided halves of the
same briefs and belong to a strategy session.

**Why this handoff exists at all.** Each of these three has been available for
between six and ten days behind a brief that has not been consumed, and each is
the kind of item a strategy session would hand straight back. Three briefs is
one handoff because the items share nothing but that property — they are small,
independent, and touch three different files. If one turns out to be bigger than
stated, do the other two, report the third, and say why; do not grow this
session to absorb it.

## Deliverables

1. **The last terminal command in the viewer's own chrome.**
   `docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md` item 4 is
   three-quarters done: `apps/viewer/views/crop.js` records its command as
   "Removed 2026-09-15". The fourth site is live —
   `apps/viewer/views/banner.js` still has

   ```js
   function missing(text, command) {
     var box = VA.el("div", "banner__missing");
     box.appendChild(VA.el("div", null, text));
     box.appendChild(VA.el("code", "banner__cmd", command));
     return box;
   }
   ```

   with two call sites in the same file (the `!state.results` arm, which passes
   `VA.CONFIG.rebuild[labels.rebuildKey]`, and the `!state.crops` arm). Jeff's
   rule is **no terminal commands in a web UI, and no internal file or module
   names in user-facing copy**. Remove the command from the rendered banner and
   say what the reader should do in reader's terms instead. Two constraints,
   both load-bearing: the `!state.crops` copy currently draws a real
   distinction — *"hovers will say 'not built' rather than 'unresolvable',
   which are different facts"* — and that distinction must survive the rewrite;
   and the `banner__cmd` class and the `VA.CONFIG.rebuild` lookup become dead
   if no site uses them, so retire them rather than leaving them. Pin the
   absence with a guard in the repo's existing reader-facing-copy scan
   (`apps/viewer/reader_facing_bans.js` is the established seam) so the fourth
   site cannot come back the way three of them already did.

2. **A browser assertion that passes in both of the states it is meant to
   distinguish.** `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`
   says this one *"can be staged before any of this is decided"*. Two sites in
   `scripts/run_viewer_browser_tests.mjs` — lines 4442 and 5499 — assert

   ```js
   /Connect folder|File System Access/.test(bannerText)
   ```

   which is satisfied by **either** the has-FSA banner or the no-FSA banner.
   The brief's words: *"If the test browser ever lost FSA, the same sub-checks
   would be **pinning this defect in place**."* Split each assertion so it
   asserts the state the surrounding check is actually in, and make the two
   states distinguishable — detect the capability once and assert the matching
   copy, rather than accepting a disjunction. This must **not** decide what a
   no-FSA surface *should* say; that is the brief's question. You are making
   the test able to tell the two apart, so that whatever the brief decides can
   be asserted at all. If splitting it means the no-FSA arm has no defined
   expectation yet, assert the arm you can and leave the other as an explicit,
   named skip with a comment pointing at the brief — an honest gap beats a
   disjunction that hides one.

3. **The endstop topology's safe retrace rows.**
   `docs/strategy/BRIEF_20260911_endstop_topology_retrace_and_f12.md` was routed
   to strategy *"because item 2 below is a Jeff/CAD question that gates part of
   item 1"*. **That gate is gone** — `HANDOFF_20260915_stack_fable_audit`
   answered it, and the answer is recorded in the topology itself, in
   `pitch_link_length`'s own `source_ref.note`:

   > OWNER RE-REFINED 2026-09-15 (stack_fable_audit): that 2026-09-06
   > refinement pointed at the WRONG LINK. … The owner of this row is therefore
   > 213862-002 (and its machined link one BOM level deeper), unacquired and on
   > the operator queue; the band stays the workbook's, untraced, unchanged.

   So rows 31 and 52 *do* name two different physical links, no Jeff is needed,
   and the brief's instruction "do NOT move that band's numeric `min`/`max`
   until item 2 resolves" is now permanently satisfied by **leaving the band
   exactly as it is**. Do the three items that were always safe, reading
   `docs/issues/ISSUE_20260910_endstop_topology_retrace_and_link_length_discrepancy.md`
   for the traced values (it carries them; the brief does not):
   - add the `traced` drawing `source_ref` to `tan_link_mount_height`
     (worksheet §11b: `215198-A.pdf` sheet 1, `79.00 ±0.10`, an exact band
     match);
   - flag row 62 as **weakened** rather than scored against the 2026-09-04
     hypothesis (§11e: `214723-002`'s bore pairs plausibly with the
     tangential-link lug, not a gas-spring interface);
   - leave row 59 at `candidate` and record *why* it stays there — nobody has
     read the workbook's own row-59 comment against `215198-A.pdf` sheet 2's
     DETAIL B candidates.

   **Do not move any band's numeric `min`/`max`.** Every one of these is a
   provenance edit. After editing the topology, re-run
   `powershell -ExecutionPolicy Bypass -File scripts\rebuild_projections.ps1`
   from the **main checkout** (`C:\workspace\tolstack`) — the projections are
   gitignored and live only there — and quote the provenance stamps in your
   report.

## One thing this handoff has already checked, so you don't

`BRIEF_20260914_dag_layout_geometry_tradeoffs.md` also advertises a
"no-regrets item, independent of whichever policy wins": the monotone-lane
proof comment in `apps/viewer/topology.js`. **It has already been corrected** —
the comment at `topology.js:1947` now reads *"This rule used to come with a
proof that leaders CANNOT cross, and that proof is no longer sound: it rested
on leaders always rising … which stopped being true the day
viewer_dag_spine_layout centred the grid."* Do not redo it, and do not read the
brief's advertisement of it as work outstanding. It is named here only because
the next reader of that brief will otherwise re-derive the same check.

## Definition of done

- No rendered viewer surface contains a terminal command, asserted by a guard
  in the reader-facing-copy scan rather than by inspection; the `!state.crops`
  "not built vs unresolvable" distinction still reaches the reader in some
  form, quoted in the report.
- Neither line 4442 nor 5499 of `run_viewer_browser_tests.mjs` accepts a
  disjunction over the two origin-posture states; the report says what each
  arm now asserts and names any arm left as an explicit skip.
- `topology_pitch_system.json` carries the `tan_link_mount_height` `traced`
  ref, row 62's weakened flag and row 59's recorded reason, with **no band
  numeric changed** (show `git diff` proving that), and the projections
  rebuilt with their provenance stamps quoted.
- Full suite green: `venv-win/Scripts/python.exe -m pytest -q` from the main
  checkout, plus the viewer JS tier through its `--repo` seam
  (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`) — the
  `[real]` tier reads gitignored `data/` and cannot run without it, so a bare
  worktree run of `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
  is a known environment failure and not your red.
- Lesson (`docs/sessions/lessons/LESSONS_20260921_policy_free_brief_residues.md`):
  for each of the three, whether the brief's description of it was accurate —
  the sweep found one advertised no-regrets item already done, so the useful
  record is how far a brief's own account of its policy-free half can drift
  from the tree. Also: whether deliverable 2 could be split at all without the
  brief's decision, because that is the input the strategy session needs.
