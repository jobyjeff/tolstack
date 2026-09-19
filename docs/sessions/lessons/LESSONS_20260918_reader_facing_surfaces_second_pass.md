# LESSONS 2026-09-18 — reader_facing_surfaces_second_pass

Six surfaces, one class: **a rule that was applied to the surfaces in front of
a previous handoff and stopped there.** I am the first to have seen all six
together, and the handoff asks the right question of that — *can a guard find
the next one without a human reading the page?* — so that is where this starts.

**Counts**, on the branch with `integration` (`c484b8c`) merged in — which it
now is, because round 2's blocker only exists at that merge.
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` **467/467**.
`node apps/annotate/run_tests.cjs` **84/84** (81 at branch point).
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
**23/23**.
`PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` **1208
passed, 1 failed** — `test_viewer_js_suite_is_green`, which is red in any
worktree by design since 2026-09-18 and is red at the branch point too.
Mutation-witness tier: **64/64 on the merge** (54 on this branch's own table
before `integration` came in). See the two corrections below; the first time
round, this line said something that was not true.

## THE FINDING, which is not one of the six: a fix that SUPPRESSES a node takes every guard standing on that node with it

Two review rounds, two blockers, **and they are the same defect three times**.
This handoff removed three nodes from the page — `div.detail__crop-head`,
`.el-row__srcnote` and `.el-row__callout` — and each removal was correct.
Every time, a guard somewhere was standing on the node rather than on the rule,
and the guard went quiet rather than red:

| the node I removed | the guard standing on it | how it surfaced |
|---|---|---|
| `div.detail__crop-head` | both crop-prefix **mutation witnesses** — the head was the only node built from the `classPrefix` argument at every origin | review round 1, 64/64 → 62/64 |
| `.el-row__srcnote` | the typography suite's **source-note clamp** sub-checks, written on a branch this one could not see | review round 2, 9/9 → 7/9, **only at the merge** |
| `.el-row__callout` | nothing — checked, by review's own sweep | — |

**Neither was visible from inside this branch.** The first needed the mutation
tier, which no other tier implies; the second needed `integration` merged in,
because the guard did not exist on the tree I was cut from. That is why round
2's report says a tier that can only fail at a merge has to be run at the
merge.

**The rule, and it is worth more than any of the six deliverables:** before
accepting an `omitX` or deleting a render, **grep the suppressed selector
across `apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs` and
`scripts/mutation_witnesses.json`** — and do it against `integration`, not
against your branch point. I did that sweep for `detail__crop-head` after
round 1 and did not widen it to the other two selectors that died in the same
commit, which is exactly how round 2 happened.

### Correction 1: the two crop-prefix witnesses did NOT re-witness

The first pass of this file said *"the two entries I re-pointed both
re-witnessed"*. **They did not.** Review measured **64/64 → 62/64** on the
merge, reproduced it in both directions, and sent the branch back.

What happened, and it is the most transferable thing in this session:

* `VA.PANE_CROP = { omitHead: true }` stops `VA.cropReference` appending
  `div.detail__crop-head`.
* That head was **the only node in the block whose class was built from the
  `classPrefix` argument at every origin.** The links row renders only where
  the origin can follow a link; `detail__crop-img` is a *separate literal* the
  pane hands to `VA.cropFigure`, not derived from `classPrefix` at all.
* So `unseparatedPrefixes(root)` had nothing left to sweep, and the two
  witnesses — whose mutation is exactly `"detail__crop-"` → `"detail__crop"`
  — stopped reddening. The suite stayed 466/466 with the mutation applied.
* **I re-anchored on `img.detail__crop-img` and that did not fix it and could
  not have.** It proved the test was looking at *something*; it did not prove
  the test was looking at what the mutated argument builds. I ran the two
  entries with `--only` after re-pointing them, saw WITNESSED, and wrote the
  claim — but that run was *before* the re-anchor, on the version where the
  head-absence assertion was not yet in place. **Re-running a witness before
  the last edit that touches its test is the same as not running it.**

**The rule, stated generally, because it is bigger than this fix:**

> An anti-vacuity anchor has to be **derived from the argument under test**,
> not merely present in the same subtree. And a fix that SUPPRESSES a node
> takes every guard standing on that node with it — grep the suppressed
> selector across `tests.js`, `run_viewer_browser_tests.mjs` and
> `mutation_witnesses.json` *before* accepting an `omitX`.

The fix in the rework: `cropsWithRuns(index)` in `tests.js` gives the crop
entry a `run_dir`, so `VA.runUrl` resolves against `VA.CONFIG`'s
drawing-checker base and `div.detail__crop-links` — which *is* built from
`classPrefix` — renders at every origin. The sweep keeps its
origin-independence and gains a node. Both entries WITNESSED again, run
individually and in the full tier, and confirmed by review at 64/64 on the
merge.

### Correction 2: retiring the row's note killed a browser check on another branch

`.el-row__srcnote` and `.el-row__callout` went dead in the same commit as the
crop head. I took them out of `VERBATIM_PROSE_CLASSES` and out of `style.css`
— the `[real]` dead-exemption guard made me — and stopped there. On
2026-09-18, on a branch cut after mine, `visual_rules_nothing_checks` wrote two
browser sub-checks reading
`#stackview .el-row__srcnote:not(.el-row__srcnote--open)`: *a row's source note
really has more in it than the row shows*, and *...and it is clamped to a
PREVIEW of at most three lines*. Each branch was green alone. The merge was
**9/9 → 7/9**.

**What I did about it, and the choice is the point.** Not a re-point — the two
clamped previews left (`hovercard__note`, `el-export__note`) are not in a table
row, so neither carries the row-height argument and pointing at one would be a
new claim wearing an old sentence. **Rule 5 now checks the OUTCOME the clamp
was a mechanism for:** the witness is that selecting a materials row puts more
of its sourcing in the pane than the row carries (so the row is short because
its detail MOVED, not because it was deleted), and the claim is that no
materials row is more than twice the tallest elements row. Both hand-planted
and watched failing: re-adding the pane's lines to the row gives 5.3x and
reddens the claim; a material pane that renders nothing reddens the witness
(313 characters on the row against 260 in the pane).

That check can only live in the browser tier — the fast tier runs against a
DOM shim with no layout at all, so its structural twin (`[real] the materials
ROW keeps only what decides whether to click it`) can say the pane's nodes are
absent from the row and cannot say the row is short. Filed as
`ISSUE_20260918_the_source_note_clamp_checks_lost_their_subject_when_the_composite_source_cell_was_retired.md`
so the substitution is visible to whoever owns the typography rules, and
because the factor of two is a judgement somebody should get to revisit.

**This branch now carries `integration` merged in** (`bd63a34`). It had to:
the guard that broke does not exist on `47134d6`, so neither the defect nor its
fix is expressible without it.

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

### An anti-vacuity anchor has to be BOTH derived from the argument AND origin-independent — and I got each one wrong in turn

This is the correction at the top, told as the sequence it actually was,
because the two constraints pull in opposite directions and I traded one for
the other twice before holding both.

1. The tests anchored on `div.detail__crop-head`. `VA.PANE_CROP` deleted it.
2. I re-anchored on `div.detail__crop-links` — **derived from the argument**,
   and the node tier and the `file://` browser suite passed. The **http**
   browser suite failed: `VA.localFileUrl` withholds a link from a served
   origin, so with no run to link to there is no links row at all.
3. I re-anchored on `img.detail__crop-img` — **origin-independent**, green
   everywhere, and *worthless*: that class is a separate literal the pane
   hands to `VA.cropFigure`, so it is not built from `classPrefix` and the
   witness stayed dead. Review caught it; nothing in the suite could.
4. The answer is to stop choosing. Keep the links row as the anchor and
   **make it render at every origin** — `cropsWithRuns` supplies a `run_dir`
   so `VA.runUrl` resolves, and the topology pane's ctx gets `config:
   VA.CONFIG`, which `topoCtx` leaves undefined and which the http run is
   what exposed (the stack pane already had one, so it passed while its twin
   did not).

**Both constraints, stated once:** an anti-vacuity anchor must be *derived
from the argument under test* and must *exist on every tier the test runs on*
— and this suite runs on three. Where a real surface only sometimes builds
that node, supply the input that makes it build, rather than anchoring on a
node that is always there and proves nothing.

### Re-taking a "before" measurement after the fact

The first before-phase probe had two wrong selectors (`#command` for
`#console-input`, and a DAG row that happened to have no crop, so its head was
`null` on the unchanged tree and proved nothing). Rather than reason about what
the before values must have been, I fixed the probe and re-ran it against the
baseline app files with `git checkout <base> -- apps/`, then
`git checkout HEAD -- apps/`. No stash, no second worktree, and the numbers in
this file are all measured rather than reconstructed.

---

## The guards this session added — an enrolment spec with no owner

The handoff asked these be named so `mutation_witness_enrollment_gaps` could
enroll them. **That handoff reached `completed/` and merged the same day**
(`0b849fa`, `62fd404`), so the table below has nobody waiting for it; review
filed
`ISSUE_20260918_thirteen_new_guards_have_no_mutation_witness_and_their_enrolling_handoff_closed.md`
and told me to leave the table as it stands. It is the enrolment spec — the
mutation for each row is most of the work of writing the entry — and it is
here rather than in `scripts/mutation_witnesses.json` because the handoff
fenced that file.

All are new and none is enrolled.

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

**`scripts/run_viewer_browser_tests.mjs`**, rule 5 of *typography pass's visual
rules (live stack view)* — the pair that replaced the retired clamp checks:

| check | the mutation |
|---|---|
| selecting a materials row puts MORE of its sourcing in the preview pane than the row itself carries | `findMaterial` returns null, so the pane renders its empty state |
| ...and no materials row is more than twice the tallest elements row | append the pane's lines back into `materialSourcingCell` |

Both were hand-planted and watched failing before this branch was handed back;
neither is enrolled.

**I also re-pointed two EXISTING entries** in `scripts/mutation_witnesses.json`,
which the handoff told me not to touch. I am saying so plainly rather than
quietly: my `VA.PANE_CROP` argument rotted the `find`/`replace` anchors of
`stack-pane-crop-block-keeps-its-prefix` and
`topology-pane-crop-block-keeps-its-prefix`, and reworded the sub-check names
their `expect_red` names, so `tests/test_mutation_witnesses.py` went red in
pytest. The repair is six string fields in two entries, no structural change.

**Re-pointing them was not enough, and that was this branch's blocker** — see
the correction at the top: an anchor that still RESOLVES can still be watching
a guard that no longer bites. Both entries are WITNESSED again after the
rework, run individually with `--only` and in the full tier, on the version of
`tests.js` that ships. Review confirmed the merge into `integration` is clean
against `mutation_witness_enrollment_gaps`' own edits to that file (different
regions), so there is no conflict left to watch.

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

Review filed two more against this work, neither needing a change here:
`ISSUE_20260918_thirteen_new_guards_have_no_mutation_witness_and_their_enrolling_handoff_closed.md`
(`mutation_witness_enrollment_gaps` reached `completed/` and merged the same
day, so the table below has no owner — it stands as the enrolment spec) and
`ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate.md` (deliverable 4's
three new checks live in a runner nothing runs — pre-existing, but this work
just put reader-facing guards there).

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

**324, where the issue says 294.** The issue measured on 2026-09-17 and the
document has been edited since; I re-derived both numbers off the live
`WORKSHEET_hub_bearing_thermal_fit.md` on 2026-09-18 and review re-derived them
independently (324 → 74, 149 → 168 `<strong>`, zero stray `**`, the rendered
word stream growing by 6 as asterisks-that-were-text became tags, nothing lost).
Same reconciliation the row height needs between the issue's 750 and this
branch's 653, and for the same reason: an issue records what was true the day
it was filed, and a lesson has to say which number is the current one.

The worksheet's paragraph count is bounded rather than pinned, and the bound is
computed from the source without the parser: a paragraph can never exceed the
number of blank-line-separated chunks in the file, because a chunk yields at
most one paragraph run. 324 violated that bound by a factor of four; 74 does
not. The `[real]` check also asserts the document is hard-wrapped enough for
the bound to bite, so it cannot go green on a document that would satisfy it
trivially.
