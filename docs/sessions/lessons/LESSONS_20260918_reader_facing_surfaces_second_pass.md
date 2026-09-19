# LESSONS 2026-09-18 — reader_facing_surfaces_second_pass

Six surfaces, one class: **a rule that was applied to the surfaces in front of
a previous handoff and stopped there.** I am the first to have seen all six
together, and the handoff asks the right question of that — *can a guard find
the next one without a human reading the page?* — so that is where this starts.

**Counts.** `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`
**466/466** (455 at branch point). `node apps/annotate/run_tests.cjs`
**84/84** (81). `node scripts/run_viewer_browser_tests.mjs --repo
C:/workspace/tolstack` **22/22**.
`PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` **1203
passed, 1 failed** — `test_viewer_js_suite_is_green`, which is red in any
worktree by design since 2026-09-18 and is red at the branch point too.
Mutation-witness tier: the two entries I re-pointed both re-witnessed.

---

## The question the handoff asked: can a guard find the NEXT second instance?

**Partly, and the part it can is not the part that matters.** Three answers,
because the six split three ways and only one of the three is mechanisable.

### 1. Where the rule is a STRING, yes — and it already did, twice, this session

A rule of the form *"this word must not appear on a reader-facing surface"* is
findable, and the mechanism is the one that exists: a banned list, a walk that
enumerates surfaces, and a field-name scan derived from the projection. Two
things make it find second instances rather than only the instance it was
written for:

* **the list has to be shared.** It lived inside `apps/viewer/tests.js` from
  the day it was written and therefore covered one of two apps. Moving it to
  `apps/viewer/reader_facing_bans.js` and reading it from
  `apps/annotate/run_tests.cjs` is the whole of deliverable 4's real content,
  and it immediately found things nobody had filed: the `data/` entry added for
  the annotator's `parts (data/meshes/)` lit up **three live viewer strings**
  naming a repo path at a reader — the sourcing legend and
  `VA.CROP_RULES.spec_pile` (both saying `data/inbox/specs/`, both restating a
  rule `VA.IDENTITY_RULES` already states in words) and the topbar subtitle.
* **the walk has to enumerate surfaces in one place.** `stackSurfaces()` already
  did; I added the material pane to it *the day the pane existed*, which is the
  only discipline that keeps such a list from drifting behind the app. The
  materials table went a month with a defect because no walk reached it.
* **the walk has to reach the MARKUP, not only the rendered surfaces.** Every
  scan in `apps/viewer/tests.js` renders a JS view; the copy *around* those
  views lives in `topology.html` and was read by nothing. Its subtitle — on
  screen at all times, on every page of this app — said *"read-only · renders
  `data/projections/viewer/` · computes nothing"*. Both apps had the same gap
  and both now have the same check, over the same list.

Two second instances this found on its own, with no human looking.

The first: that subtitle. I added the `data/` ban for the annotator's
`parts (data/meshes/)`, wrote the annotator's markup scan, then wrote the
viewer's twin of it — and the viewer's own topbar failed immediately. Nobody
had filed it; nobody had looked at it in the eighteen days since the page was
consolidated. **That is the mechanism working exactly as advertised, and it is
the strongest evidence in this session for the answer above: a STRING rule,
shared across apps and applied to every surface class rather than the one in
front of you, finds the next instance by itself.**

The second: the worksheet renderer's **list items**. I fixed hard-wrapped
paragraphs, wrote a `[real]` bound over the live worksheet, and the bound went
red on a wrapped `- **Hoop stress…**` bullet I had not looked at. Same shape,
one layer down: a guard written for the instance in front of you finds the
next one only if it is stated over the whole document rather than over the
paragraph you were fixing.

### 2. Where the rule is about a BRANCH nothing exercises, yes — and this is the transferable trick

Deliverable 3's finding is the important one and it generalises past its own
surface. `reader_facing_copy_and_vocabulary` widened the walk to the materials
table on 2026-09-16 and it reported green. It was green because **no live or
fixture material entry reached the branches that would fail it** — five
sentences, of which exactly one was reachable. A guard whose covered branch is
unreachable is a guard reporting green over nothing, and nothing distinguishes
that from a clean tree.

The fix has two halves and both are needed:

* **a fixture entry for the branches a fixture CAN carry.** `DEMO_STAINLESS` is
  `values_status: "library"` with a `library_ref` now — the only entry in the
  repo, live or fixture, that reaches the `library` arm and the spec-library
  reference line. The old fixture comment argued against exactly this ("a
  fixture that invented one would teach a reading the repo would contradict");
  that argument was wrong in the same way the whole class is wrong, because the
  reading it protects is the *rendering*, not a claim about a material.
* **a direct scan over the table's own domain for the branches a fixture
  CANNOT.** Two of the five need shapes the builder can never emit — a
  `values_status` outside the vocabulary is what
  `tests/test_js_python_vocabulary.py` exists to make impossible, and a fixture
  carrying one is the defect `viewer_fixture_shape_guards` exists against. So
  the new test walks `Object.keys(VA.VALUES_STATUSES)` plus both `library` arms
  plus an off-vocabulary status, synthesises an entry per branch, renders the
  table AND the pane for each, and scans all of it.

**This is reusable on every total-function table in the viewer.** `VA.CROP_RULES`,
`VA.EXPORT_STATUSES`, `VA.IDENTITY_RULES`, `VA.VALUE_SOURCES`,
`VA.EXPORT_CHIP_TEXT` are all tables whose loud arms are exercised by few or no
live rows. The recipe is three lines: enumerate the table's keys, synthesise the
minimum object each branch reads, run `surfaceIsClean` over the rendered result
and `bannedIn` over the view-model's text. **I did it for one table. The other
five are a session and I did not take them** — it is off this handoff's six, and
it would have been invisible work with no issue behind it.

### 3. Where the rule is about LAYOUT, DENSITY or VOICE — no, and pretending otherwise is the trap

Three of the six are judgements a string scan cannot hold:

* a 653px table row is not a wrong string, it is a wrong *shape*;
* "FILE NOT IDENTIFIED" over a joint is grammatical, spelled correctly, and
  about nothing on the page;
* a crop head restating the line above it is two correct sentences adjacent.

A guard *can* hold each of them **once they are decided** — I pinned all three,
and the pins are cheap:

| the rule | the pin |
|---|---|
| a table row is a row, not a block | `[real]` asserts the row carries one compact where-line and **zero** `mat__values` / `mat__desig` nodes, and the pane carries one of each |
| a pane states its document once | `eq(all(root, "div.detail__crop-head").length, 0)` on both panes, plus the fold that must survive |
| a status sentence belongs to a subject | `VA.EXPORT_SUBJECTS`' two rows must not share the `unestablished` sentence, asserted directly |

What no guard can do is notice that the rule *should* apply to a surface nobody
has looked at yet. Every one of these six was found by a human reading a page,
and the honest summary is: **the guards can stop a fixed instance coming back,
and can find a second instance of a STRING rule across surfaces; they cannot
find a second instance of a SHAPE rule, and a "one accent per view" scanner
would cry wolf so fast it would be deleted inside a month.**

The one structural move that does help, and it is cheap: **when a fix is scoped
to one of two twin surfaces, put the decision in a shared constant rather than
in each surface.** `VA.PANE_CROP` is exported for exactly this reason while
`views/cards.js`'s `CARD_CROP` is a local — the two panes drifted apart
*because* each carried its own copy of the decision. A constant does not find
the next surface, but it makes "apply it to both" the path of least resistance
rather than a second handoff.

---

## Deliverable 1: what the elements table's answer was, because a third table will arrive

The handoff asks this be written down. The elements table's answer to the
composite source cell is **three things, and it is all three or none**:

1. **The cell keeps only what decides whether to CLICK the row.** Chips, and a
   one-line, ellipsised where-ref with the whole string on the hover
   (`.el-row__where--compact`). Nothing else. The one exception — and the
   materials table needed the same one — is a **loud** chip: a state a reader
   must not have to click through to. For elements that is the export/identity
   alert; for materials it is `CTE NOT TRANSCRIBED`.
2. **Everything else moves to the preview pane, whole and unclamped.** Not
   deleted, not shortened, not folded — the pane exists to hold the full written
   argument, so the clamp that made the row survivable is dropped there.
3. **The row becomes clickable, and the pane is the one place a selection
   lands.** A compact cell with nowhere for the detail to go is deletion, not
   restructuring. This is the step that costs the most and is the easiest to
   skip: it needed the app's stack-side selection to become a **row** id rather
   than an element id (`state.selectedRowId`, `handlers.onRowSelect`), and
   `views/detail.js` to resolve that id against elements first, then materials.

Measured, live, `hub_bearing_thermal_fit_m1` at 1600×1000, preview pane at its
560px default:

| row | before | after |
|---|---|---|
| `AL_7050_T7451` | **653px** | **111px** |
| `SS_AISI_420_AMS5621` | 617px | 169px |
| `BEARING_STEEL_52100` | 488px | 130px |
| elements table, for scale | 88–112px | 88–112px |

(The issue records **750px** measured before `design_pass_typography` tightened
the note clamp on 2026-09-17; 653px is the same row on the tree this branch was
cut from. Both numbers are the same defect at two CSS settings, which is the
issue's own point: CSS took two bites and could not reach the shape.)

**For the third table:** the id spaces have to be disjoint, or the pane needs a
kind alongside the id. Element ids are features and material ids are alloys, so
`findRow` then `findMaterial` is safe and a collision can only resolve to the
older surface — that is a property of today's data, stated in the pane's own
header comment, and a third table should check it rather than assume it.

---

## Deliverable 6: the rejected alternative, and the "third subject" test

The status vocabulary now takes a **subject** (`VA.EXPORT_SUBJECTS`, two rows:
`value` and `joint`). The handoff pre-registered the call so review could check
it, and I took it as written.

What I also changed, which is issue point 2 rather than the deliverable's
sentence: **the joint's `unestablished` is quiet.** The argument, written into
the table: the recorded `why` on both live thermal stacks says the 217755
assembly drawing *was never opened for this stack* — an absence somebody
recorded, not one somebody tried and failed to resolve — and `loud` is the tint
this repo reserves for the second. The `why` still renders under the headline
either way, so nothing is hidden by the quieter register, only the alarm. If
review disagrees, it is one boolean in one table row.

**On the handoff's third-subject test:** there are exactly two subjects, and
every export block in either app goes through one of them — `views/detail.js`
(element), `views/topology.js` (edge dimension), `views/cards.js` (citation
card) are all `value`; `views/stack.js`'s `jointBlock`, shared with
`renderTopoJoint`, is `joint`. So the evidence for "a noun parameter instead of
a sentence per row" is **not** here yet, and I kept sentences. The table carries
a `noun` per row anyway, because `VA.unlabelledExportStatusText` needs one — it
said *"the bytes behind this value"* over a joint block too — so a third
subject costs one row, and the test that says so is written
(`eq(keys.length, 2, …)`, which fails loudly the moment somebody adds a third
without reading this).

---

## Things that cost me time, or would have

### The heredoc ate a backslash. Again.

`LESSONS_20260916_reader_facing_copy_and_vocabulary` records this and I hit it
anyway: a JS string written as `"\\n"` through a `<<'PYEOF'` heredoc arrives as
a real newline, and the file becomes a syntax error at the vm boundary. It cost
one failed run. **The reliable fix is to build the escape from `chr(92)` in the
Python that writes the file** — never let a backslash pass through the shell at
all. That works for `\n`, `\b`, `\s` and `\*` alike, and unlike "use a
file-writing tool" it survives a scripted multi-site edit.

### The probe needs `node_modules`, and a worktree has none

Every `tests/debug_*.mjs` imports `playwright-core` bare, and `node_modules/`
is gitignored, so it exists only in the main checkout. I made a **directory
junction** (`New-Item -ItemType Junction`) from the worktree's `node_modules` to
the main checkout's; it is gitignored, so it never reaches the branch. Two
consequences worth knowing:

* dispatch's worktree cleanup will remove a junction, not the target — verified
  by the shape, not by running it.
* **`scripts/run_mutation_witness_tests.mjs` builds a shadow tree by copying
  `apps/`, `docs/`, `scripts/` into `tmp/mutation-witness`.** An aborted run
  left that directory in a state `rmSync` could not remove (`EPERM`), and the
  next run died on it before doing anything. `Remove-Item -Recurse -Force`
  cleared it on the second attempt. If the witness tier dies at "building the
  shadow tree", delete `tmp/mutation-witness` by hand and re-run.

### An anti-vacuity anchor can be origin-dependent

The two crop-prefix tests used the existence of `div.detail__crop-head` to prove
the scan was looking at something. With the head gone I re-anchored them on
`div.detail__crop-links` — which passed the node tier and the `file://` browser
suite and **failed the http browser suite**, because `VA.localFileUrl` returns
nothing on a served origin and `VA.runUrl` needs a configured drawing-checker,
so the links node does not render there at all. `img.detail__crop-img` is the
origin-independent anchor. General form: **an anti-vacuity anchor must be a node
that exists on every tier the test runs on**, and this suite runs on three.

### Re-taking a "before" measurement after the fact

The first before-phase probe had two wrong selectors (`#command` for
`#console-input`, and a DAG row that happened to have no crop, so its head was
`null` on the unchanged tree and proved nothing). Rather than reason about what
the before values must have been, I fixed the probe and re-ran it against the
baseline app files with `git checkout <base> -- apps/`, then
`git checkout HEAD -- apps/`. No stash, no second worktree, and the numbers in
this file are all measured rather than reconstructed.

---

## For `mutation_witness_enrollment_gaps` — the guards this session added

The handoff asks these be named so the parallel handoff can enroll them. All
are new and none is enrolled.

**`apps/viewer/tests.js`:**

| check | the mutation it claims to catch |
|---|---|
| every branch of the CTE sourcing vocabulary is scanned for schema jargon… | put `materials.json` or `values_status` back in any `VA.VALUES_STATUSES` sentence |
| every export subject has a sentence of its own… | give `VA.EXPORT_SUBJECTS.joint` the value's `unestablished.headline` |
| a joint whose export was never established says so in the JOINT's words… | drop the third argument at `views/stack.js`'s `VA.exportProvenance` call |
| the stack pane / the topology preview pane states its document ONCE… | drop `VA.PANE_CROP` at either `VA.cropReference` call site |
| an edge whose part is NAMED after its own drawing… | drop `partLabel` from `views/topology.js`'s `citation(…)` call |
| the materials ROW keeps only what decides whether to click it | move any pane line back into `materialSourcingCell` |
| a hard-wrapped paragraph is ONE paragraph… (and its four siblings) | revert `apps/viewer/vendor/markdown.js` to one `<p>` per line |
| `[real]` the live worksheet renders paragraphs by its BLANK LINES… | the same revert, on the live document |
| `[real]` the live material entries show the provenance of their CTE — the row compactly, the pane in full | either half of the split |

**`apps/annotate/run_tests.cjs`** (three checks, and note this runner has no
shadow-tree entry today — `tests/test_mutation_witnesses.py` knows the suite as
`"annotate"`):

| check | the mutation |
|---|---|
| the annotator's own markup prints no repo path, module path, id or command at the reader | restore either string in `index.html` |
| the command box says what it accepts, read off the registry rather than written down | hand-write the placeholder again |
| every word table this app renders survives the shared ban list | put a path into `AA.BINDING_STATE_ALERTS` |

...and its viewer twin, `this page's own markup prints no repo path, module
path, id or command at the reader` (mutation: restore
`renders <code>data/projections/viewer/</code>` in `topology.html`).

**I also re-pointed two EXISTING entries** in `scripts/mutation_witnesses.json`,
which the handoff told me not to touch. I am saying so plainly rather than
quietly: my `VA.PANE_CROP` argument rotted the `find`/`replace` anchors of
`stack-pane-crop-block-keeps-its-prefix` and
`topology-pane-crop-block-keeps-its-prefix`, and reworded the sub-check names
their `expect_red` names, so `tests/test_mutation_witnesses.py` went red in
pytest. The repair is six string fields in two entries, no structural change,
and both re-witness. **That is the merge to watch** if
`mutation_witness_enrollment_gaps` also edits that file.

---

## What I did NOT do, and where it is written down

Three things, all filed rather than left here:

* `ISSUE_20260918_forges_notes_app_carries_the_same_markdown_paragraph_defect_this_copy_just_fixed.md`
  — `apps/viewer/vendor/markdown.js` was byte-identical to forge's upstream and
  now diverges. Upstream has the same bug. `audience: strategy`, because it is
  a cross-repo call.
* `ISSUE_20260918_the_annotators_reader_facing_copy_is_scanned_in_its_markup_only_never_as_rendered.md`
  — the widening reaches `index.html` and the `AA.*` word tables, not the
  sentences `app.js` writes at runtime. Three options costed.
* `ISSUE_20260918_the_annotators_command_box_is_a_developer_affordance_in_a_readers_chrome.md`
  — the question the original issue asked and this handoff did not answer:
  should a dev console be always-on chrome in a reader's 3D view at all.
  `audience: strategy`.

Two dead classes went with the composite cell: `el-row__srcnote` and
`el-row__callout` are rendered by nothing now (the material pane uses the
pane's own `detail__note` / `detail__callout`), so they are out of
`VERBATIM_PROSE_CLASSES` and out of `style.css`. Leaving them would have
tripped the `[real]` dead-exemption guard, which is how I found out — that
guard earns its keep.

---

## Evidence

`tests/debug_reader_facing_second_pass.mjs` (hand-run, never a tier) takes every
measurement in this file and the seven before/after screenshot pairs beside it:

```
node tests/debug_reader_facing_second_pass.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons --phase before|after
```

| what | before | after |
|---|---|---|
| first `tr.mat-row` height | 653px | 111px |
| worksheet `<p>` count | 324 | **74** |
| worksheet `**` runs on screen | 38 | **0** |
| worksheet `<strong>` | 149 | 168 |
| stack pane crop head | `214589-002-A.pdf · sheet 1` | none |
| DAG pane crop head | `214700-002-A.pdf · sheet 1` | none |
| joint block | `el-export--loud`, *"FILE NOT IDENTIFIED — which file this value…"* | quiet, *"No assembly file recorded — nothing here says which drawing file describes the joint…"* |
| annotator placeholder | `command, e.g. isolate machined_213668 (window.AnnotateApp.exec)` | `command`, with the 15 verbs on its title |
| annotator parts label | `parts (data/meshes/)` | `parts with a 3D model` |
| viewer topbar subtitle | `read-only · renders data/projections/viewer/ · computes nothing` | `read-only · renders the built projections · computes nothing` |

The worksheet's paragraph count is bounded rather than pinned, and the bound is
computed from the source without the parser: a paragraph can never exceed the
number of blank-line-separated chunks in the file, because a chunk yields at
most one paragraph run. 324 violated that bound by a factor of four; 74 does
not. The `[real]` check also asserts the document is hard-wrapped enough for
the bound to bite, so it cannot go green on a document that would satisfy it
trivially.
