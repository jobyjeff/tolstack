# LESSONS 2026-09-23 — the JS vocabularies are generated, and the pairing is a text comparison

Handoff: `HANDOFF_20260923_js_vocabulary_generated_from_python.md`. The bug
pareto's **R2**: pattern A (hand-copied Python↔JS vocabularies drifting) was 101
issues with a review check since 2026-08-26 that did not move the rate, so the
decided rung was *make the shape inexpressible*.

---

## 1. The inventory (deliverable 1)

**Twenty-six**, not the "six tables" the old test module's docstring implied and
not the eleven it eventually paired. They were spread over three files and two
pytest modules, and the count only came out by scanning for the *shape*
(`VA.<NAME> = [` and `VA.<NAME> = {`, plus the same for `AA.`) rather than by
reading either pairing table — which is itself the finding: **a pairing table
tells you what somebody remembered to pair, never what exists.**

| # | generated name | Python owner | was, in JS |
|---|---|---|---|
| 1 | `CONFIDENCES` | `scripts/build_viewer_projection.py`: `PROJECTION_CONFIDENCES` | `viewer.js` array |
| 2 | `UNVERIFIED_CONFIDENCES` | `scripts/build_topology_projection.py`: `UNVERIFIED_CONFIDENCES` | `viewer.js` array |
| 3 | `WORKSHEET_SOURCES` | the `how` each `worksheet_for` returns, in **both** viewer builders | `viewer.js` table keys |
| 4 | `VERDICTS` | `tolerance_stack/stack.py`: `VERDICTS` | `viewer.js` table keys |
| 5 | `VERDICT_SCOPES` | `stack.py`: `VERDICT_SCOPES` | `viewer.js` table keys |
| 6 | `EXPORT_STATUSES` | `stack.py`: `EXPORT_STATUSES` | `viewer.js` table keys |
| 7 | `IDENTITY_RULES` | `build_viewer_projection.py`: what `identity_rule_of_ref` returns | `viewer.js` table keys |
| 8 | `VALUES_STATUSES` | `tolerance_stack/thermal.py`: the `values_status` check in `MaterialEntry.__post_init__` | `viewer.js` table keys |
| 9 | `CROP_RULES` | `build_viewer_crops.py`: the `resolved_by` literals in `resolve_pdf` | `viewer.js` table keys |
| 10 | `CROP_PLACEMENTS` | `build_viewer_crops.py`: the `located_by` literals in `locate()` | `viewer.js` table keys |
| 11 | `CROP_HIGHLIGHT_KINDS` | `build_viewer_crops.py`: `HIGHLIGHT_KINDS` | `viewer.js` table keys |
| 12 | `TOPO_ROW_KINDS` | `build_topology_projection.py`: `ROW_KINDS` | `topology.js` array |
| 13 | `TOPO_LINK_KINDS` | same file: `LINK_KINDS` | `topology.js` array |
| 14 | `STUDY_STATUSES` | same file: `STUDY_STATUSES` | `topology.js` array |
| 15 | `MESH_FACT_FIELDS` | same file: `MESH_FACT_FIELDS` | `topology.js` array |
| 16 | `VALUE_SOURCES` | same file: `VALUE_SOURCES` | `topology.js` table keys |
| 17 | `GAP_KINDS` | same file: `TOPOLOGY_GAP_KINDS` | `topology.js` table keys |
| 18 | `NODE_KINDS` | `tolerance_stack/topology.py`: `NODE_KINDS` | `topology.js` array |
| 19 | `EDGE_KINDS` | `topology.py`: `EDGE_KINDS` | `topology.js` array |
| 20 | `TRANSFORM_KINDS` | `topology.py`: `TRANSFORM_KINDS` | `topology.js` array |
| 21 | `STUDY_ERRORS` | `topology.py`: the `StudyError` **subclasses**, by introspection | `topology.js` table keys |
| 22 | `STACK_KEY_KINDS` | `tolerance_stack/feature_identity.py`: `STACK_KEY_KINDS` | `binding_state.js` array |
| 23 | `VERDICTS` *(annotate)* | `feature_identity.py`: `VERDICTS` | `binding_state.js` array |
| 24 | `DIRECTIONS` | `feature_identity.py`: `DIRECTIONS` | `binding_state.js` array |
| 25 | `PATH_KINDS` | `feature_identity.py`: `PATH_KINDS` | `binding_state.js` array |
| 26 | `GDT_MODIFIERS` | `feature_identity.py`: `GDT_MODIFIERS` | `binding_state.js` array |

67 words in total. Rows 4 and 23 are both called `VERDICTS` and mean entirely
different things — see §3.

### What the scan found and the generation deliberately did NOT take

* **JS owns it.** `VA.DEEP_LINK_PARAMS` (paired against `apps/viewer/README.md`'s
  contract section, which a sibling repo reads), `VA.MONTH_NAMES`,
  `VA.LIGHTBOX_CONTROLS`, `AA.DESELECT_TARGETS`, `AA.ON_OFF`. Python defines none.
* **`AA.BINDING_STATES` is a composition, not a copy** — two Python vocabularies
  plus `unbound`, the value `StackKeyBindings.state` deliberately never returns.
  No single owner to generate from, so it stays hand-written with its argument
  beside it.
* **Four `inList([...])` accept-lists inside `apps/viewer/tests.js`** still spell
  a Python- or builder-owned vocabulary by hand. They are guard inputs rather
  than rendered tables, so the cost of a drift is a confusing test failure and
  not a wrong page — filed as
  `ISSUE_20260923_four_value_guard_accept_lists_in_tests_js_still_spell_a_python_owned_vocabulary.md`,
  which names the four sites and says which of them are straightforward
  generation targets and which are not.

Deliverable 4 (structural `=== N` counts that are really vocabulary sizes) came
back **empty**: every `.length === N` in the two suites is a DOM count, and the
vocabulary-shaped literals are the four `inList` rows above.

---

## 2. What replaced what

```
scripts/js_vocabulary.py          the registry: where each vocabulary lives in
                                  Python, as a READER. Never a list of words.
scripts/generate_js_vocabulary.py renders apps/viewer/vocab.gen.js; --check
                                  diffs instead of writing.
apps/viewer/vocab.gen.js          GENERATED and tracked. Both apps read it.
tests/test_js_vocabulary_is_generated.py   regenerate-and-compare == the pairing
```

Deleted: `tests/test_annotate_js_vocabulary.py` entirely; the `JS_PAIRINGS`
block and the `STUDY_ERRORS` pairing in `tests/test_topology_projection.py`; the
`PAIRINGS` table, the AST readers and the static mutation scan in
`tests/test_js_python_vocabulary.py`; four hand-copied vocabulary checks in
`apps/annotate/run_tests.cjs` that had been spelling the Python tuples a *third*
time. Net: **-934 lines of test, +26 generated vocabularies.**

`tests/test_js_python_vocabulary.py` survives for the one drift generation
cannot reach: a vocabulary re-spelled as `x === "a" || x === "b"` in a function
body. That is not a copy of a table, it is a second table with no name, and
there is nothing there to generate.

---

## 3. The decisions that were not in the handoff

**The generated file is `apps/viewer/vocab.gen.js`, not `apps/shared/vocab.gen.js`.**
The handoff suggested the latter ("e.g."). It would be a **403** in the browser
TRUTH tier: `scripts/run_viewer_browser_tests.mjs` serves `test.html` from a
server rooted at `apps/viewer` and refuses any path above it, so
`<script src="../shared/vocab.gen.js">` would silently not load in exactly the
tier that exists to catch silently-unloaded modules. `apps/annotate` already
reaches across that boundary for three other shared files
(`storage/adapter.js`, `reader_facing_bans.js`, `warning_icon.js`) and
`reader_facing_bans.js`'s own docstring records the same 403 reason for the same
choice. **Check the server roots before inventing a shared directory.**

**The registry is keyed by app, because `VERDICTS` means two things.**
`pass|marginal|fail` in the viewer, `bound|owner_not_in_set` in the annotator.
A flat table would have had to rename one of them, which is a *third* spelling
of a vocabulary. So the generated module builds a `namespace()` per app and each
app's IIFE takes its own: `(function (VA, VOCAB) {…})(window.ViewerApp, window.TolstackVocab.viewer)`.

**`VOCAB.table()` compares the key SET, not the order.** Tempting to enforce
order — it would move the rank into Python for free. It would also have
**silently reordered the "what is missing" panel**: `VA.GAP_KINDS`' key order is
worst-first and deliberately differs from `TOPOLOGY_GAP_KINDS`' tuple order, and
the handoff says do not redesign any view. So order stays a display decision,
and the comment beside `GAP_KINDS` now says that in as many words. The one place
order is *semantic* — `VA.worstVerdict` reading `Object.keys(VA.VERDICTS)`,
weakest last — is still guarded only by its mutation witness, which is what that
witness has always been for. **Generation does not subsume a rank.**

**The `table()` runtime lives in the generated file.** A hand-written sibling
would be cleaner in the abstract and would cost a second `<script>` tag on four
pages and two runners. The header says the runtime is the generator's fixed
template and names the file to edit it in.

**`Object.freeze` replaced a static scan, so it is witnessed.** The deleted
`js_table_mutations` scan refused `VA.TABLE.foo =` — and its own docstring
admitted it did not match `Object.assign(VA.TABLE, {...})` and that that case
"*is* silent — a JS-only branch added that way reads as unpaired to nobody."
Freezing the returned table closes both. Deleting a guard is only safe if what
replaced it is itself guarded, so the freeze is asserted in both fast tiers and
carries a mutation spec in each.

---

## 4. Gotchas that cost time here

* **`assertThrows` in `apps/annotate/run_tests.cjs` is sloppy-mode.** It is a
  CommonJS module with no `"use strict"`, so `frozenTable.x = 1` fails
  **silently** there while throwing in every app file it loads (all strict) and
  in `apps/viewer/tests.js` (strict IIFE). The check needs a `"use strict";`
  directive inside the arrow body to see the throw. `Object.assign` on a frozen
  target and `Array.prototype.push` on a frozen array throw in either mode — it
  is only the plain assignment that differs, which is exactly the case a reader
  would assume is covered.
* **`tests/test_tolerance_stack.py` imported `python_values_statuses` from the
  pairing module.** Moving the readers into `scripts/js_vocabulary.py` broke
  three test modules at *collection* time through a chain
  (`test_provenance` → `test_tolerance_stack` → the reader). Grep for importers
  of a test module before gutting it; a `tests/` package makes test modules
  importable and this repo uses that.
* **Editing a tracked `.py`/`.md` counts for `tests/test_provenance.py`.** Any
  file with a row in `PROVENANCE.md` that the branch changes needs its
  **Amended** clause extended, or
  `test_this_branch_amended_the_row_of_every_imported_file_it_changed` is red.
  An import-only change still counts.
* **A mutation spec can anchor on a whole object literal.** The `VA.VERDICTS`
  permutation witness quoted the entire table, so the one-line change from
  `VA.VERDICTS = {` to `VA.VERDICTS = VOCAB.table("VERDICTS", {` rotted it.
  `tests/test_mutation_witnesses.py` caught it in under a second, which is the
  anchor check earning its keep — **but expect one per handoff that reshapes a
  file a witness quotes.**
* **`ARCHITECTURE.md`'s inventory refuses "every", "each", "one", "both",
  "nothing", "two"** — the quantifier scan is a word list, not a number scan,
  and a new module's row will hit it on the first draft.
* **The Bash tool mangles backslashes inside heredocs.** `"\\n"` in a Python
  heredoc arrived as a real newline, so string-replacement scripts that match
  source containing `\n` silently found zero. Use the `Edit` tool, or a file, for
  anything with escapes in it.

---

## 5. The recipe, for the next repo (R3's proving ground)

What generalises:

1. **Find the copies by shape, not by the pairing table.** The table tells you
   what somebody paired; the shape tells you what exists. Here: `NS.<NAME> = [`
   and `NS.<NAME> = {` across both apps, then judge each against "does Python
   own these words?".
2. **The registry holds readers, never lists.** Every entry is a callable that
   reads the words out of their definition — an import where there is a
   constant, an AST walk where they are literals in the function that mints
   them. A tuple written in the registry is the same defect one layer up, and it
   is a very easy one to write while "just getting the generator working".
3. **Generate the WORDS; leave the per-value copy where it is.** Most of these
   tables carry a sentence a reader sees and, in this repo, functions. Trying to
   generate those would have moved reader-facing English into Python. The split
   that worked: `list(name)` hands back the frozen vocabulary, `table(name,
   entries)` takes the hand-authored copy and compares the key set.
4. **Compare at load, not in a test.** A test says "these disagree" the next
   time somebody runs it; a throw in `table()` says it before anything renders,
   covers paths no test exercises, and cannot be forgotten.
5. **The pairing test becomes `regenerate and diff`.** Both directions fall out
   for free, and the second one (*somebody hand-edited the generated file*) had
   no analogue at all under pairing.
6. **Put the generation on an existing rail.** A second rail for one command is
   how two rails come to disagree about which tree they were run against.
7. **Follow the served roots before choosing a shared directory.** See §3.

What was tolstack-specific:

* Both apps are **classic scripts, no build step** — the generated module is a
  tracked `<script>` and the "generate at serve time" option never arose. A repo
  with a bundler would generate into the build instead and lose the *hand edit is
  red* half unless the artifact is still tracked.
* Six of the twenty-six had **no Python constant to import**: the words were
  literals in the branches of a function that mints the value. Those readers are
  AST walks with their own can-fail tests, and they are the expensive part of the
  registry. A repo whose vocabularies are all named constants gets this for a
  tenth of the work — and a repo whose readers are all AST walks should first ask
  why there is no constant.
* The **CRLF/LF** handling (`core.autocrlf=true`, LF in git) means the comparison
  is text-with-line-endings-normalised rather than literally bytes. Everything
  inside a line, trailing whitespace included, is exact.

---

## 6. Left undone

* The issue in §1 (four `inList` accept-lists). Filed, not fixed: they are guard
  inputs rather than rendered vocabulary, and two of the four want a Python-side
  constant that does not exist yet.
* `scripts/run_viewer_browser_tests.mjs` is still pinned at **506 declared /
  475 enrollable** guards in `DECLARED_GUARDS` — untouched by this handoff and
  unrelated to it, noted only so the census numbers in §7 of the completion
  report are not read as something this change moved.
