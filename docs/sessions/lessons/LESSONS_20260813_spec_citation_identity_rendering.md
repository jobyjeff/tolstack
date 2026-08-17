# LESSONS 2026-08-13 — spec_citation_identity_rendering

Handoff: `HANDOFF_20260813_spec_citation_identity_rendering.md`.
Issue: `ISSUE_20260812_four_traced_spec_citations_carry_no_export_block.md` →
`status: resolved`.
Baseline: `7a239a5` (trunk; master had one further commit, the board move that
activated this handoff — no code in it).

Suites, in **this worktree** with `--repo C:/workspace/tolstack`:
**Python 431 passed / 1 skipped** (was 420/1), **JS 131/131** (was 122/122),
**browser 4/4 checks — 102/102 suite + 23/23 app sub-checks** (was 2/4, see
"the browser tier was already red" below).

## The `grep` the definition of done asks for: no enum moved

```
$ git diff master --stat -- tolerance_stack/
(nothing)
$ git diff master -- apps/viewer/viewer.js | grep -E "^[+-].*EXPORT_STATUSES"
+  // reason VA.EXPORT_STATUSES and VA.CROP_RULES are tables: the field is
   (one added COMMENT line, in the new table's rationale. The
    VA.EXPORT_STATUSES literal itself is untouched.)
```

`EXPORT_STATUSES`, `VERDICT_SCOPES`, the `values_status` tuple and
`SourceRef.kind`'s comment are all byte-identical to trunk. Nothing in
`tolerance_stack/` was touched at all. The marker is a **derived** field on the
projection's `elements[]` row, beside `zero_width` and `kind` — the authored stack
files carry nothing new, which `test_the_marker_is_derived_and_never_authored`
pins by asserting the key appears in no embedded `stack` block.

## Second sighting, named — and what a general hoist would look like

The handoff asks for this explicitly. This is the **second** instance of *a fact
about a citation reachable only through a crop*:

1. `ISSUE_20260811_viewer_shows_nothing_for_source_ref_export` — the export's
   sha, its runs and its `why` were rendered only inside the crop popover, so a
   citation whose crop could not resolve said nothing about its bytes. Fixed by
   `viewer_export_and_material_provenance` (2026-08-12) by rendering
   `source_ref.export` on the row.
2. This one — the spec pile's filename-identity rule was statable only as the crop
   entry's `resolved_by: "spec_pile"`.

Both were fixed **one fact at a time**, and that is still the right call at two.
If a third appears, the shape to reach for is a general hoist, and it should look
like this:

* **A single derived `citation_provenance` block per `elements[]` row**, built in
  `build_viewer_projection.py`, holding everything the viewer needs to say about
  where a value's *bytes* came from: the export view-model, the identity rule, and
  a slot for whatever the third fact turns out to be. One block, one total
  function in the viewer, one row in `VALUE_GUARDS`.
* **Derived in the projection, never read out of `crops.json`.** The two files are
  built by two scripts that must be independently re-runnable (`results.json` is
  built first and there is no crops index to read), so the projection re-derives
  the condition rather than importing the answer. The cost is that two files
  encode the same rule; the price of the alternative is a load-bearing build order
  between two scripts that deliberately do not have one. Pay the duplication and
  **pin the agreement with a test** — `[real] the marked citations are exactly the
  spec_pile-resolved ones` in `apps/viewer/tests.js` is that test, and it is the
  piece worth copying if a third fact arrives.
* The trigger to stop deferring it: when the viewer needs a **precedence order**
  among three or more such facts. Today there are two and the order is trivial (an
  `export` block wins; the identity rule speaks only in its absence).

## Decisions the handoff left open

* **Where the marker lives: on the derived `elements[]` row, not on the citation.**
  The embedded `stack` block is byte-identical to the authored file and a test
  enforces it, so the marker physically cannot go on `source_ref`. `VA.elementRows`
  already pairs each authored element with its derived row, so the renderer had
  both in hand and needed no new plumbing beyond one argument.
* **Materials do not get the field.** A material entry's `values_source` /
  `designation_source` are `source_ref`-shaped and could carry one, but the
  materials table renders no export block at all, so the field would be data
  nothing reads. No live material citation is `kind: "spec"` either (6 workbook,
  4 drawing). If the materials table ever grows an export block, that is the
  moment to widen `identity_rule_of_ref`'s call site — the helper already takes a
  bare `source_ref` for exactly that reason.
* **The marker is a property of the CITATION, not of the file being on disk.**
  `build_viewer_crops.resolve_pdf`'s `spec_pile` branch additionally requires the
  document to exist in `data/inbox/specs/`, because it is about to open it. The
  projection deliberately does not check: a spec-pile document missing from the
  pile still has filename identity as its rule, and "the file is not there" is a
  fact the crop already states in the right place. The `[real]` agreement test
  passes today because the pile holds every cited document; if one ever goes
  missing that test is where it will show up, and the fix is to state the
  divergence there, not to make the projection touch the filesystem.
* **Not loud, and no row chip.** The spec-pile block is a sibling of
  `established`, not of `unestablished`: it says the bytes **are** identified. It
  gets the same green spine as an established export (`--traced`), because the
  grey `--none` spine says the opposite of what the sentence says. The two loud
  states remain the two *unidentifiable* ones — plus a third now, an identity rule
  the viewer has no branch for, which gets its own chip wording
  (`IDENTITY RULE UNKNOWN`) rather than reusing `EXPORT STATUS UNKNOWN`: sending a
  reader to look for an `export.status` field the citation does not have is a
  small lie with a long debugging tail.
* **The legend is new furniture.** Deliverable 3 says "the viewer's legend/help
  affordance" and there was none — no `legend`, no help block, nothing. Rather
  than invent a whole help system, the rule went into a collapsed
  `<details class="sv__legend">` — "How to read the sourcing column" — directly
  above the elements table, reusing the `sv__joint` affordance one size down. It
  states three things (a drawing citation must name its export; a spec-pile
  citation is the exception and why; any other no-export citation really is a
  gap), because the exception only means something beside the rule it excepts.
  The legend **quotes `VA.IDENTITY_RULES` rather than re-typing the sentence**, so
  the two cannot drift, and a test asserts that.
* **A fifth JS↔Python vocabulary pairing, which the handoff did not ask for.**
  `tests/test_js_python_vocabulary.py` now pairs `VA.IDENTITY_RULES` with what
  `identity_rule_of_ref` returns (AST over its `return` statements, resolving a
  returned name through the module — the same "read the definition, never a third
  copy" rule the module was built on). This is **not** the vocabulary widening the
  handoff warned against: the pairing pins, it does not add, and the handoff's
  sequencing constraint was that the pairing test land *first* — it landed on
  2026-08-12. Worth having because a rename of `IDENTITY_RULE_SPEC_PILE` would
  otherwise turn four calm rows into four loud "no branch for" blocks on a
  reader's screen, and nothing else would go red first.

## The browser tier was already red, from a prior handoff

`npm run test:browser` came back **2/4** before I had touched it, on a sub-check
nothing else runs:

```
FAIL sub-check: the INCOMPLETE check is flagged   (article.check--incomplete)
```

`check--incomplete` was renamed `check--budget` by `af6cba7`
(`check_completeness_schema`, 2026-08-13, already on trunk) and
`scripts/run_viewer_browser_tests.mjs` was never updated. **The browser tier does
not run under pytest** — `tests/test_viewer_js_suite.py` drives the *node* tier
only — so a class rename in `views/stack.js` cannot go red there, and the failure
sat waiting for the next agent to run the truth tier by hand.

I fixed the selector inline rather than filing it (one stale token, and my own
definition of done says "full suite green"), and it is called out here because the
gap that produced it is still open: **nothing automatic runs the browser tier.**
The second sub-check that failed — `tr.el-row` count `=== 3` — was mine, from
growing the demo fixture, and is now 4.

## Things the next agent would otherwise rediscover

* **Growing `fixtures.js`'s demo stack costs five test updates, and they are all
  counts.** The new `grip` element (the spec-pile state — `traced`, `kind: spec`,
  no export, which no fixture held before) moved `summaryChips` to `2 traced`,
  `elementRows` to 4, `tr.el-row` to 4, the crop-trigger status list to a second
  `no-entry`, and the browser tier's row count. It is appended **after** `eye` on
  purpose: every test that indexes `rows[0]` or `elements[0]` keeps working.
* **The grip has no fixture crop entry, deliberately.** Giving it one would mean
  editing `CROPS.summary`'s rollups to stay coherent, and "a citation the crop
  script has not been run for" is a real state worth having twice over. The
  `spec_pile` *crop rule* is already covered inline in `tests.js`.
* **`identity_rule` had to be added to `fixtures.js` or the `[real]` shape guard
  fails**, naming the shape and the key. That guard is why a builder change fails a
  *viewer* test; it worked exactly as advertised here.
* **`VA.exportProvenance` grew a second argument and every returned object grew
  `detail`.** The shape is uniform across all five branches on purpose — a
  view-model whose keys depend on its state is one `undefined` away from a silent
  drop, which is this surface's whole defect class.
* **The `--repo` forward-slash trap is still live** (`--repo C:/workspace/tolstack`,
  not backslashes, or the node-fs tier silently *skips* and exits 0). Third lesson
  in a row to say so.
* **`npm install` in the worktree** before `npm run test:browser`; `node_modules`
  is gitignored, so a fresh worktree has none.
* **I rebuilt `results.json`** (main checkout, `--data-root C:/workspace/tolstack/data`)
  because the marker is new data and every `[real]` test reads it. The rebuild
  warns that the tree is one commit behind master and dirty — both true and both
  harmless here (the missing commit is the board move for this handoff). **A
  reviewer on another branch will need to rebuild it again**, and until they do,
  their `[real]` tests read a projection carrying a field their `fixtures.js` may
  not have.

## Left for the next agent

* **Nothing automatic runs the browser tier** (above). Either wire it into a
  pre-merge step or accept that class renames rot there silently; today the only
  detector is an agent running it by hand.
* **`unestablished` still has zero live instances**, and now so does "an identity
  rule the viewer has no branch for". Both are pinned only by fixtures and poisoned
  copies. Read them on screen the first time real data produces one.
* **The third sighting of the crop-reachable-fact shape is the trigger for the
  general hoist described above.** If you are reading this because you just found
  one: it is time.
