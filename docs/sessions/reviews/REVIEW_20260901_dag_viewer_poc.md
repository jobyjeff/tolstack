---
type: review
handoff: dag_viewer_poc
reviewer: agent (review/dag_viewer_poc)
date: 2026-09-01
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-01 — `dag_viewer_poc`

Handoff `docs/sessions/active/HANDOFF_20260831_dag_viewer_poc.md`, from the
locked brief `dispatch/docs/strategy/HANDOFF_20260831_tolstack_dag_strategy.md`.
Work under review: `handoff/dag_viewer_poc` (`5679129`, `ad7a826`) against
`bf34b69`. Reviewed on `review/dag_viewer_poc` with `master` merged in
(`dfa31b4`).

**Verdict: APPROVE, 0 blockers.** Six should-fix findings and two nits, all
fixed inline on the review branch; four new guards added. This is a strong
piece of work — the layout is computed where a `pytest` can pin it, the
alignment claim is *measured* in a real browser and I watched that measurement
fail, and every number on the page is traced back to `summarize() → fold()`
value-for-value by two independent tests. Every finding below is prose or
guard-coverage. None is arithmetic and none is provenance.

---

## Scope note: this is not a tolerance stack

The overlay's seven mandatory checks are scoped to *"when the work under review
is a tolerance stack"*. This is a viewer over documents another handoff
authored (`dag_topology_format`, reviewed and approved 2026-09-01 at
`bf34b69`); it adds no element, no citation and no number. The schema was not
touched, which the handoff required.

Checks 1–7 are therefore addressed as *"does this surface report provenance
honestly"* rather than as a provenance audit of new values, and the ratio is
re-derived below because it is the one number a reader re-uses without
re-deriving.

**Traced ratio, re-derived by me** with
`tests\debug_report_tolerance_stacks.py --ratio`, run in the review worktree
with the main checkout's interpreter:

> **5 traced / 3 inferred / 18 untraced, out of 26 element instances**
> (the three seeded slice-1 stacks). Across all stacks: 30 / 9 / 20 of 59.

Unmoved by this handoff, as expected. **The topology side's own counts**, which
this page is the first surface to show and which I recounted from the rebuilt
projection rather than reading off the page: `pitch_system` **23 untraced of
23** edges; `vpa_output_to_pitch_plate` **1 traced / 2 inferred / 3 untraced**
plus one derived gap that correctly carries `confidence: null` rather than a
word. The projection's own `confidence_counts` agree with my recount, and they
correctly exclude the derived gap — *"no value"* and *"a value nobody sourced"*
are different facts and the page does not collapse them.

That 23-of-23 is the finding this page exists to make visible, and §4.1 of the
lesson is right that a column of red bars says it before a row is read.

---

## What I verified

### The seven checks, as they apply

1. **Every tolerance traces to a document** — no new values. What I checked
   instead is that the page cannot *launder* one: `confidence_of()` returns
   `no_source_ref` for a dimension with no citation and `None` only for a
   derived gap, `renderEdgeDetail` prints a loud red block for the former, and
   `citation()` adds *"No document backs this number"* for `untraced`. I
   confirmed all three on screen, in Chrome, against the real projection.
   **PASS.**
2. **Signs** — no sign is authored on this surface and none is computed here.
   `Contribution.sign` comes from the traversal direction, `contributionBlock`
   prints it with the sentence *"No sign is authored anywhere"*, and the
   contribution row prints the transform's ratio beside it so a non-unity
   weight can never be silent (the `VA.termLabel` rule, honoured). **PASS.**
2b. **Coherent corners** — not applicable; no `workbook_corner` path here.
3. **LMC/MMC** — not applicable; `Dimension` carries no `lmc`/`mmc` and the
   page reads `min`/`max` only. **PASS by inspection of the projected fields.**
4. **RSS computed** — the totals footer renders all five of nominal, worst-case
   interval, worst-case half, RSS interval and RSS half, from
   `StudyResult.as_dict()`. No verdict is computed anywhere on this page (there
   is no verdict on this surface at all). `[real] every study's totals reach
   the page value for value` asserts all seven fields through `render(...)`,
   not through the view-model. **PASS.**
5. **Nominal inside min/max** — transcribed values ride through unrounded
   (`project_contribution` rounds only `nominal`/`min`/`max` of the *computed*
   contribution and `ratio`/`weight`; the dimension's own numbers are untouched,
   pinned by `test_a_transcribed_value_is_never_rounded`). **PASS.**
6. **Quantised constraints** — no new joint. The L1 topology re-expresses
   `stack_vpa_output_to_pitch_plate`, whose castellation caveat lives in its
   own worksheet; the topology page does not present a grip verdict at all, so
   the failure this check prevents is not reachable here. Its analogue — the
   question this archetype's arithmetic does not settle — **is** stated beside
   the numbers: the footer's *"This page adds nothing up"* plus each study's own
   `notes`, which render directly under the totals. **PASS.**
7. **Ratio reported** — above.

### The handoff's five deliverables

| # | Deliverable | Evidence |
|---|---|---|
| 1 | Rail layout, depth-first with rail continuity, static HTML/JS/SVG | `serialize_topology`. No npm in the app (npm is the browser *test* tier only, as before). I re-derived the invariants from the rebuilt projection independently of the tests: every element exactly one row (43/43 and 14/14), no column holds two overlapping rails, every row covered by a rail of its own column. |
| 2 | Row alignment, documented row mapping | One row per graph element, nodes and edges interleaved, documented in three places (`ROW_KINDS`'s comment, the lesson §1, `apps/viewer/README.md`). `2n+1` verified on all five study chains. Alignment is `getBoundingClientRect` centre-against-centre in the browser tier — see below. |
| 3 | Study interaction v0 | Five studies render; selection highlights the chain on the rails and marks the grid; totals come from the topology module and are never recomputed in JS. |
| 4 | Both MVP cases | Both render. L1's "degenerate case" is honestly a **ring**, not a chain — the lesson re-reads the handoff on this and I agree: every L1 interface has degree 2 (verified), so two rails that rejoin is the truth, and the single-rail case is the study. |
| 5 | Preview pane | Reuses `VA.cropFor` and the stack viewer's crop plumbing unchanged; an edge with no `crop_key` says *which* of the two reasons rather than reading as a stale index. |

### Definition of done

- **Screenshot-able** — I took my own (to a scratch dir, not committed — the
  repo has no convention for committing them), driving the real projection
  through the browser tier's own `demoTopologyFixture` seam. Both MVP cases render as described: rails left,
  aligned grid centre, citation + crop right, a study highlighted with its
  ordinals, totals at the bottom. The L1 shot shows `-0.0824` nominal and
  `±0.6449` worst-case half, which is `stack_vpa_output_to_pitch_plate`'s own
  published `worst_case_shank_out` check arriving through a completely
  different code path.
- **Browser-tier tests** — 6/6, with 31 topology sub-checks per origin.
- **Full suite** — see below.
- **Lesson** — present and unusually good. §1 (the row mapping and
  why the handoff's own suggestion was worse), §4 (what the git-graph style
  cannot express, with the palette argument actually run through the validator)
  and §8's five ranked questions are all things the next agent cannot derive
  from the code.

### Guards, watched failing

The universal check says do not accept a new guard on the strength of green.
Four replays, all in a scratch state reverted afterwards:

1. **The alignment measurement.** `+3` on `VA.railY` → the browser tier goes
   `26/31` on both origins, naming five failing sub-checks and printing
   `node hub_lower_bearing_flange: off by 3.00px | …` per row. This is the
   check that justifies the browser tier for this page, and it bites hard.
2. **The layout invariants.** I re-applied the exact lazy-allocation bug the
   lesson names (allocate a branch's column inside the walk instead of up front)
   → `test_a_column_never_holds_two_rails_at_the_same_row` **and**
   `test_every_rail_covers_the_rows_that_sit_on_it` both go red, the first
   naming `pitch_system: row 21 (pitch_plate_flange_to_link_hole) sits in column
   1 with 6 rail(s) covering it`. The subtle bug the author says is the subtle
   bug is the one the tests catch.
3. **The JS↔Python pairing.** `"gap"` → `"gappp"` in `VA.EDGE_KINDS` →
   `test_the_js_copy_spells_exactly_what_python_enumerates[EDGE_KINDS]` red.
   (That pairing is one I added — see finding 3.)
4. **The `[real]` tier's own reach.** Confirmed the two-tier split is real and
   reported: `141/141 passed` in a worktree with `SKIP node-fs tier`, versus
   `182/182` with `--repo C:/workspace/tolstack`. The 41-test gap includes all
   12 `[real]` topology tests. A report quoting a JS count here must say which.

### Test runs, all re-run by me

| Run | Where | Result |
|---|---|---|
| `python -m pytest -q` | review worktree, merged tree, **before** my fixes | 552 passed, 1 skipped |
| `python -m pytest -q` | same, **after** my fixes | 559 passed, 1 skipped when the pre-existing flake passes; 558 + 1 failed when it does not |
| `node apps\viewer\run_tests.cjs --repo C:\workspace\tolstack` | main-checkout data | 182/182, `[real]` tier ran |
| `node apps\viewer\run_tests.cjs` | worktree | 141/141, `SKIP node-fs tier` |
| `node scripts\run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` | Chrome 152 | 6/6, 31 topology sub-checks per origin |

**The one red is not this handoff's.**
`tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed` is
`ISSUE_20260901_dc_snapshot_removed_entry_test_is_flaky_on_directory_mtime.md`,
filed on `master` before this work and reproducing with none of it involved. I
measured it across **eight full-suite runs on this branch: five red, three
green**, and green on every isolated `pytest tests/test_dc_snapshot.py`
immediately afterwards (9/9, twice). So it is worse than the issue's "roughly
one in five" and it is still genuinely intermittent — not a hard failure that
this work introduced. Recorded as a second sighting on the issue rather than
fixed, because which of its three repair options to take is a deliberate call
and the issue says so. Nothing else in the suite is red, in any of the eight
runs.

### Other checks

- **Both checkouts.** The main checkout is on `master` and is not mine to move,
  so the "re-run in the main checkout" rule is satisfied the other way: the
  worktree suite is run with the main checkout's interpreter and against the
  main checkout's `data/` for both `[real]` tiers, which is where the
  data-dependent divergence lives. The worktree suite's one `s` is
  `test_viewer_js_suite`'s node-fs tier, as always.
- **Sibling handoffs on `master`.** `git log --oneline HEAD..master` was two
  commits — `93ca974` and `cc61cd7`, both board file-moves. Merged in
  (`dfa31b4`); git inferred a directory rename and wanted to file the
  `dag_viewer_poc` handoff under `completed/`, which I resolved to `active/`.
  Suites re-run on the merged tree.
- **Projections rebuilt.** `build_topology_projection.py` re-run against
  `C:/workspace/tolstack/data`. The ancestry gate spoke correctly (*"built by
  handoff/dag_viewer_poc @ 5679129…, which this tree already contains"*) and so
  did the behind-trunk warning. Re-run after my fixes: byte-identical apart
  from `built_at`/`provenance`, which is how I know the serialiser change in
  finding 5 moved nothing.
- **`data/` is not polluted.** Full inventory of `C:/workspace/tolstack/data`
  (122 files, sizes) before and after a full suite run: nothing added, removed
  or resized. No stray `workspace*data` directory in cwd.
- **drawing-checker is untouched.** `snapshot_drawing_checker.py take` at the
  start of this review (5380 entries) and again at the end; `diff` reports
  **EMPTY — no entry added, removed or modified.** The handoff itself needed no
  snapshot: it reads `crops.json`, never drawing-checker, and runs under this
  repo's venv only.
- **`data/inbox/specs/` and `docs/reference/`** — untouched by the diff.
- **No second combiner in JS.** Grepped every new viewer file for arithmetic on
  a projection field. The only operators are in `railX`/`railY`/`railGeometry`/
  `branchPath`/`closePath`, and every term in them involves `metrics.rowHeight`,
  `metrics.gutter`, `metrics.left` or a row/column index — CSS pixels, the
  sanctioned exception. No `toFixed` anywhere. `VA.fmt` is still `String(n)`.
- **Whitespace and encoding.** `git diff -w --stat` collapses nothing —
  `index.html`'s `-397` is a real deletion (the `<style>` block moved out). No
  NUL bytes in any new file; `git ls-files --eol` says LF for all of them, in
  line with the rest of the repo.
- **The CSS extraction is verbatim.** Diffed the old `<style>` block against
  `style.css`: the only change is an added 11-line header comment. Nothing was
  reworded, dropped or reordered.
- **No harness artifacts.** No `</invoke>`, `</content>`, `<parameter` or `{{`
  in the diff; `tail` on every created file is clean.
- **The fixture's "generated, not written" claim.** `topology_fixtures.js`'s
  header states it, names the three hand-patched `crop_key`s, and
  `[real] the topology fixture's shapes still match the builder's` holds it to
  the live shape. Three non-null `crop_key`s, as claimed.
- **ARCHITECTURE / README inventories.** Both updated. The
  `projection_provenance.py` row's two quantifiers moved to "all four / the
  three above" and I confirmed by behaviour, not by flag: four modules import
  `projection_provenance` and four write into `data/projections/`. See finding 2
  for the nine copies that did *not* move.

---

## Findings

All fixed inline on `review/dag_viewer_poc`. None blocking.

### should-fix

**1. A counterfactual stated as fact: "nine rails instead of twelve".**
`apps/viewer/README.md` (column-reuse bullet),
`LESSONS_20260831_dag_viewer_poc.md` §1, and
`test_a_column_never_holds_two_rails_at_the_same_row`'s own docstring each said
column reuse *"is what keeps the pitch system nine rails wide instead of
twelve"*. Nine is right. Twelve is not a measurement of anything: the pitch
system allocates **nine** rails over **nine** columns and L1 two over two, and
disabling reuse outright leaves both numbers **unchanged** — reuse never fires
on either committed topology. The second-order cost is worse than the wrong
digit: the invariant that sentence justifies was being quantified over data
where every column holds exactly one rail, so it could not distinguish a correct
serialiser from one that never reuses at all.
*Fixed:* all three sentences corrected (the lesson gets a dated correction
blockquote, the repo's convention), and
`test_reuse_is_what_this_invariant_guards` added — the smallest graph that does
reuse (a root with three edges whose third branch forks after the second has
released its column: three columns, four rails), asserting both that reuse
happened and that the spans stay disjoint.

**2. The guarded copy of a count moved; nine unguarded copies did not.**
`test_the_projection_provenance_row_counts_and_names_its_importers` derives its
answer from `modules_importing("projection_provenance")`, so the fourth writer
*forced* ARCHITECTURE.md's row to "all four / the three above". The guard
worked. Nothing else moved:

| File | Said | Truth |
|---|---|---|
| `ARCHITECTURE.md:49` | quotes the row's phrase as `all three projection writers` | the row now reads `all four` — the explanatory sentence quotes a string the file no longer contains |
| `ARCHITECTURE.md:82` | "Like the two viewer builders it stamps" | three |
| `ARCHITECTURE.md:310` | "wiped and rebuilt by the two viewer scripts" | three |
| `ARCHITECTURE.md:324` | "All three writers into `data/projections/`" | four |
| `scripts/projection_provenance.py:5` | "both scripts wipe-and-rebuild their own file" | three write into `projections/viewer/` |
| `scripts/projection_provenance.py:39` | "has three callers, not two", enumerating three | four; `build_topology_projection.py` missing from the enumeration |
| `tolerance_stack/spec_library.py:586` | "the third writer … (with the two viewer builders)" | fourth; three viewer builders |
| `apps/viewer/README.md:54` | "both builders stamp their own branch and HEAD sha" | each of three |
| `apps/viewer/config.js:10` | "Where the two projection scripts write" | three — in the very file the handoff edited to add the third `rebuild` key |

This is the 2026-08-12 sighting of the same entry **run in reverse**: that time
the module docstring was fixed and ARCHITECTURE.md missed; this time
ARCHITECTURE.md was fixed (by a guard) and the docstring missed. Note also that
the repo's residue scanner cannot help —
`test_no_unpinned_quantifier_survives_in_the_block` walks the tree-block **rows**
only, so ARCHITECTURE.md's own prose is outside every quantifier guard the repo
owns. *Fixed:* all nine, inline. Overlay entry added.

**3. Three value-guard rows copy a Python constant nothing pairs them to.**
`TOPO_VALUE_GUARDS` in `apps/viewer/tests.js` has seven rows. Four point at
`VA.*` tables that `tests/test_topology_projection.py` pairs word-for-word to
Python. Three — `nodes[].kind`, `edges[].kind`, `edges[].transform.kind` —
spelled `inList(["mating_surface", "datum_feature"])` and friends inline, and
those are the **documents'** vocabularies (`NODE_KINDS`, `EDGE_KINDS`,
`TRANSFORM_KINDS`, each validated by its dataclass's `__post_init__`). An
`inList` copy only speaks once a document in the tree actually uses the new
word; the pairing speaks the moment the constant grows, which for a documents'
vocabulary is the earlier and cheaper signal. Each of the three has a silent
default arm in the page (`structural`, `mating_surface`, `identity`).
*Fixed:* `VA.NODE_KINDS` / `VA.EDGE_KINDS` / `VA.TRANSFORM_KINDS` added to
`topology.js` in the same idiom as the three arrays already there, the guard
rows point at them, and three rows added to `JS_PAIRINGS`. Watched fail.

**4. `topology.js`'s tables did not inherit `viewer.js`'s mutation guard.**
`viewer.js`'s six enumerated tables have been refused
`VA.TABLE.newkey = {}`-outside-the-literal since `js_python_vocabulary_pairing`
(2026-08-12), because the extractor only sees the literal and a key attached
elsewhere makes the pairing test read as equal while the page branches on a word
Python cannot write. `topology.js` grew six tables and got the pairing but not
the mutation scan. *Fixed:*
`test_no_key_is_attached_to_a_topology_table_from_outside_its_literal` added
over `JS_PAIRINGS` plus `STUDY_ERRORS`, with `test_the_mutation_scan_can_fail`
replaying all three refused shapes (`.push(…)`, `[i] =`, `.key =`).

**5. One fact, two derivations: `branch`.** `topologies.json` says "this
interface is a fork" in two fields, and the page reads a different one in each
place it says so — the grid row's `⑂` marker from `layout.rows[].branch`, the
preview pane's BRANCH POINT chip from `nodes[].branch`. The second is
`Topology.branch_nodes()`; the first was an inline `len(topology.incident(id)) >
2` in `serialize_topology`. They agree today because the inline copy happens to
be the same expression. *Fixed:* `serialize_topology` now calls
`topology.branch_nodes()`, and
`test_every_fork_mark_is_one_of_the_topologys_own_branch_nodes` pins all three
places over every topology (the existing test checked only `pitch_system`).
Verified output-neutral: the rebuilt projection is byte-identical apart from
`built_at`/`provenance`.

**6. The suite is intermittently red on a clean tree** — pre-existing, not this
handoff's, recorded on the open issue rather than fixed. Five of eight
full-suite runs on this branch. See the test-runs section. Flagged as
should-fix because it is a tax on every review: each one must re-prove the red
is not theirs before it can claim the DoD's "full suite green", and two
handoffs have now paid it.

### nits

**7.** `VA.contributionWeightText`'s comment said it prints *"`sign` and
`weight`"*; it prints `sign` and `ratio`. Equivalent output — `weight` is
`sign * ratio` and the preview pane prints the product separately — but the
comment names a field the function does not read. *Fixed.*

**8.** The `?mock=1` fixture's `built_at` is `2026-08-05T00:00:00+00:00`,
copied from the stack fixture's. Harmless (it is the demo's quiet-case stamp)
and deliberate per the comment beside it — noted only so the next reader does
not read it as this page's build date. *Left alone.*

---

## Things I checked and deliberately did not raise

- **The banner will be loud on this page.** The lesson's §7 predicts it and my
  own screenshots confirm it — `topologies.json` rebuilds every time a document
  moves and `crops.json` rarely does, so the different-trees alarm fires most
  visits. The alarm is *true*, and softening it is a design question the lesson
  correctly routed to Jeff (§8.4) rather than a defect.
- **The scrollport is short when the alarm is up.** With six alarm lines and a
  1000px viewport, about eight of the pitch system's 43 rows are visible. That
  follows from `flex: 1 1 auto` under a data-dependent banner, which §7 argues
  is the right call versus a fixed `calc()`. Real, and downstream of the point
  above; not a defect in this work.
- **A `gap` edge is drawn in whatever column the walk is standing in.** §4.2
  states this as a compromise rather than hiding it, and names the swim-lane
  renderer that would fix it. The repo has two gaps. Correctly deferred.
- **`serialize_chain` is written out rather than derived from
  `serialize_topology`.** Deliberate and argued in its docstring; the two are
  pinned to the same row model by `test_a_study_chain_serialises_to_one_rail_in_
  the_sums_own_order` and the `2n+1` property, which I re-derived over all five
  studies.
- **A degree-2 root emits a `branch` *link* while its node's `branch` is
  `false`.** Not a bug — a fan-out in the walk and a fork in the graph are
  different claims, and L1 is the case that separates them. Written into
  finding 5's new test so the next reader does not re-raise it.

---

## Note for the next reviewer

Three things this handoff establishes that the next viewer change has to keep:

1. **The browser tier is not optional for this page.** The DOM shim has no
   geometry, and alignment is the page's entire claim. Any CSS or layout change
   under `apps/viewer/topology.css` or `views/topology.js` needs
   `node scripts\run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` and
   6/6 before it is reviewed, not after.
2. **`node_modules` lives only in the main checkout.** The browser tier will not
   start from a worktree. A directory junction
   (`cmd /c mklink /J <worktree>\node_modules C:\workspace\tolstack\node_modules`)
   costs one command and avoids an `npm install` through the proxy; it is
   gitignored, so it leaves no trace on the branch. Worth knowing before you
   conclude the tier is unrunnable.
3. **Reordering a topology's `edges` array is now a viewer affordance** — it
   steers the diagram with no value touched and no schema change (lesson §1,
   §8.3). That is a coupling the topology format did not know it had, and a
   future edit to `docs/topologies/*.json` that looks value-neutral can move the
   whole picture.
