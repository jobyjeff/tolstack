# LESSONS 2026-09-16 — reader_facing_copy_and_vocabulary

Six sites that said something false, internal or unpaired, plus the guard that
decides whether there is a seventh. Everything below is measured on the **live**
projections at `C:\workspace\tolstack\data\projections\viewer\`, through

```
node tests/debug_reader_facing_copy.mjs --repo C:/workspace/tolstack
node tests/debug_reader_facing_copy.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons
```

a new hand-run probe (never a tier), committed for the same reason the previous
session's was: the screenshots are worthless without a way to re-take them.

**Counts.** `venv-win/Scripts/python.exe -m pytest -q` → **1192 passed, 1
failed, 1 skipped**. `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`
→ **419/419** (417 at session start). `node scripts/run_viewer_browser_tests.mjs
--repo C:/workspace/tolstack` → **20/20**.

The one failure is `test_no_live_document_states_an_unguarded_hardware_entry_count`
and it is **red on master before this branch existed** — a strategy brief's prose
trips the hardware-entry-count regex. Three open issues already describe it
(`ISSUE_20260916_a_strategy_briefs_prose_trips_the_hardware_entry_count_guard.md`
and two near-duplicates). Nothing in this branch touches it.

---

## Two things that will cost the next agent time if they are not read first

### 1. The handoff's live cases have moved. Re-derive them.

The handoff names `pitch_link:fastener_grip`, and
`tan_link_take2 | spherical_bearing_tan_link` /
`flanged_bushing_tan_link` / `vpa_output | flanged_bushing_unidentified` as
`dimensions from <workbook>` cases. **None of those is what the projection says
today** — `citation_identity_correctness` landed on 2026-09-16 between the
triage sweep and this session and re-cited several of them. The real cases:

| handoff says | actually |
|---|---|
| `pitch_link:fastener_grip` carries the four-clause revision | `pitch_link_to_pitch_plate:bolt_grip_11` does; `fastener_grip` exists only on `vpa_output_to_pitch_plate` and carries the plain `"Rev 4"` |
| three `tan_link_take2` / `vpa_output` parts say `dimensions from <workbook>` | all three now cite `kind: "spec"` sheets and take the **standard part** branch |
| `pitch_system \| hub` says it | still true, and it is the only live part citing a traced drawing AND an untraced workbook |

The item-2 cases that are really on the unqualified branch today:
`pitch_link | washer_nas1149v0332h`, `pitch_system | hub` / `pitch_arm` /
`blade_root` / `gas_spring` / `vpa_piston`, `rotor_fastener_length |
washer_ms21299c3` / `washer_nas1149v0332_tt`, `vpa_output | washer_ms21299c4k` /
`spherical_bearing_in_vpa`.

### 2. Writing a JS `\b` through a shell heredoc silently eats a backslash

Twice this session a `\\b` written into a file through a `<<'EOF'` heredoc
arrived as `\b`, and JS reads the string `"\b"` as **U+0008 BACKSPACE**. The
first time it was `VA.revisionText`'s `/^rev\b/i`, which arrived as
`/^rev<backspace>/i` and failed its own test loudly. The second time it was the
guard's `new RegExp("\b" + name + "\b")` — which failed **nothing**, because a
scan that matches nothing looks exactly like a clean tree. See "the planted
positive earned its keep" below. Write escapes with a file-writing tool, or
avoid the escape.

---

## The judgement calls, and what decided each

### Item 1 — `rev Rev 4`

`VA.revisionText` suppresses the label when the value already starts with
`rev`, case-insensitively and **anchored**. Anchored matters: the live value is
`"Rev 4 (sheet 1 rev 4, sheet 2 rev 2, sheet 3 NEW, sheet 4 rev 2)"`, and a
`rev` clause further in is part of the note, not the label said twice. The rule
is stated generally — *never prefix a label a value already carries* — and the
component card's `drawing X rev Y` line reads the same function, so the next
part whose `revision` is transcribed as `"Rev A"` is already covered.

**One thing the handoff did not ask for, taken anyway.** `VA.citationWhere(null)`
returned the literal `"no source_ref"` — a schema field name on a rendered
surface, and the string the handoff's item 7 names as the candidate planted
positive. It says **`no citation`** now, which is the wording
`VA.CONFIDENCE_LABEL.no_source_ref` already uses on the chip beside it. That was
the better of the two resolutions item 7 allowed (fix, or argue for it in an
allowlist comment): an allowlist entry would have argued for a string nobody
wanted.

### Item 2 — option (a), per document, not per line

**Taken: (a), qualify by the citations' own confidence.** (b) — restrict the
line to `spec`/`drawing` citations — cannot be wrong, and I did not take it
because of what it costs: `vpa_output | flanged_bushing_unidentified`'s card is
titled *"part not identified"*, and a card that then says **nothing** about
where its numbers came from tells a reviewer less than one that says
"transcribed from this workbook, and nothing traceable stands behind it". The
repo's rule is *record a gap*, not *say nothing*.

**Per DOCUMENT, not per line, and that is the part worth keeping.**
`pitch_system | hub` cites a traced drawing (`212966-006-A`) and an untraced
workbook (`260825_End_Stop_JC.xlsx`). One qualifier on the whole line is wrong
about one of them whichever way it falls. So `VA.partReferences` collects an
`unverified` flag per document and `VA.referenceText` states it per document:

> `dimensions from 260825_End_Stop_JC.xlsx · sheet End Stop Tol Stack (unverified); 212966-006-A · sheet 4`

The word is `VA.ATTENTION.unverified.text`, not a new one — a reader meets
"unverified" on the DAG grid row and on the "what is missing" panel, and it has
to mean the same thing in all three. The hover carries
`VA.ATTENTION.unverified.title`.

**Tie-break, stated because no live data exercises it:** ANY unverified row
marks the document. A card that called a document clean because one of its four
rows was traced would overclaim, and the direction this repo errs in is the
other one. No live part cites one document at two confidences today.

**The `standardPart` branch is untouched, and that leaves one honest wart.**
The handoff fenced Jeff's own wording and I kept it verbatim — but the qualifier
is a suffix, so it reaches that branch too:
`spherical_bearing_pitch_link` is a `spec`-kind citation at `untraced`, and its
card now reads *"standard part — dimensions from RBC_Aerospace_Plain_Bearings_Web.pdf
(unverified)"*. Jeff's phrase is intact and the untraced fact is now stated. If
that is not wanted, the change is one `if` in `views/cards.js`.

### Item 3 — five sites, one constant, and the classes stay

All five read `VA.ATTENTION.no_tolerance` now — `.text` for the chip, `.title`
for every hover, including the min/max cells' (which used to say `min == max`,
schema jargon on a column header a reader compares by eye). The summary chip
became a sentence built from the same word: **`2 elements with no tolerance
recorded`** on `rotor_fastener_length`, the only live stack with
`zero_width_count > 0`. `chip--zero-width`, `num--zero-width`,
`el-row--zero-width`, `tvrow--zero-width` and `zero_width_count` all keep their
names, per the fence — nothing reads them as words.

`VA.ATTENTION` lives in `topology.js` and three of the five sites are in
`viewer.js` / `views/stack.js` / `views/detail.js`, which load **before** it.
That is fine and deliberate: every read is at render time, and `topology.html`
is the only page, loading all of them. Do not "fix" it by copying the words.

### Item 4 — the run ids went

The line says what a reader can act on and the link says which drawing:

> `read by drawing-checker 4 times, most recently 30 Jul 2026 — `**`217755 rev A`**

The link text is `VA.drawingLinkText(cropEntry)`, the exact treatment
`views/crop.js` adopted on 2026-09-15 for the same reason. The raw ids survive
on the summary's `title`, together with the fact the handoff asked be preserved:

> `recorded on this export as 20260723_163810, 20260727_153847, 20260730_131903, 20260730_132230. drawing-checker addresses a run by a longer name than the id recorded here, so this page links only the run its own crop resolved through.`

So there is **no allowlist entry** — the ids are gone from rendered text
entirely, and item 7's run-id shape guard now forbids them there.

Two consequences worth knowing:

* The date is read off the **front of the recorded `ts` string**, never through
  `Date`. A recorded timestamp is a fact about a day, and parsing it into a
  `Date` moves that day across a timezone boundary for half the world. Month
  names are a table (`VA.MONTH_NAMES`), not `toLocaleDateString`, so the node
  tier and a browser agree character for character.
* `VA.exportProvenanceLine` — a text view-model with **no renderer**, read only
  by tests — now builds its runs clause from the same `VA.exportRunsText`. It
  had its own wording ("no drawing-checker run has consumed this export") and
  two wordings for one export is the drift this whole session is about.

### Items 5 and 6 — the shape, and one deliberate deviation from the handoff

`VA.UNVERIFIED_CONFIDENCES` is an **array** (`js_array_strings`), exactly as the
handoff specified, paired against `build_topology_projection.UNVERIFIED_CONFIDENCES`.

`VA.WORKSHEET_SOURCES` is an **object literal** (`js_object_keys`), and the
handoff's Definition of Done says `js_array_strings`. Why I deviated:

* the field is **nullable**, and `js_array_strings` refuses a non-string element
  at depth 1 outright — by design, since an element it cannot resolve is a
  vocabulary word silently dropped from the comparison. Making it an array means
  either extending that shared extractor or leaving `null` out of the pairing.
* the handoff itself asks the constant to carry *"each with what it means **on
  screen**"*, and an array has nowhere to put that.
* the object literal moved the **note text itself** into the table, so
  `views/worksheet.js`'s branch disappeared entirely rather than being
  redirected. That is `VA.CROP_RULES`' own stated argument: an enumerated field
  needs a total function, because a silent default cannot be told apart from a
  handled case by reading the code — and here exactly one of three values has
  anything to say, which is the shape that most reads as an oversight when it is
  spelled as an `if`.

`"null"` is a **quoted key**, because a JS property lookup coerces its key to a
string, so `VA.WORKSHEET_SOURCES[stackProj.worksheet_source]` finds it with no
null check — and `null` is literally what the projection JSON carries there.
The Python side maps `None` → `JS_NULL_KEY`, named once in
`tests/test_js_python_vocabulary.py` rather than written twice.

Two things about the Python side that are not obvious:

* `worksheet_for` is read from **both** builders and their union is the domain,
  plus `test_both_viewer_builders_mint_the_same_worksheet_source_vocabulary`,
  which is the half a union cannot assert. Two stdlib-only builders writing one
  field is a deliberate duplication; the cost of that choice is that they can
  drift from each other, and a union absorbs the drift silently.
* the reader has to follow an **`ast.IfExp`**. Both builders spell their
  by-name rule as `return (by_name, "by_name") if by_name.exists() else (None,
  None)`, and a reader that accepted only a bare `ast.Tuple` comes back with
  `("declared",)` — one word out of three, and a **passing** pairing. That arm
  and the five shapes it refuses are exercised directly.

The third home of the loud pair — the prose copy in `confidenceClass`'s comment
— is retired, as asked.

### `tests.js` overlap with the parallel value-guard handoffs — line by line

The handoff asked this be named so merge order is visible. In
`apps/viewer/tests.js`:

| what | where (at my HEAD) | who else touches it |
|---|---|---|
| the local `var WORKSHEET_SOURCES = ["declared", "by_name", null];` | **deleted**, was ~line 7727 | nobody — it was this issue's own subject |
| `known: inList(WORKSHEET_SOURCES)` → `known: knownWorksheetSource` in the **stack** row `stacks[].worksheet_source` | ~7901, inside `VALUE_GUARDS` | `VALUE_GUARDS` belongs to the value-guard handoffs |
| the same substitution in the **topology** row `topologies[].worksheet_source` | ~10493, inside `TOPO_VALUE_GUARDS` | ditto |
| the new `function knownWorksheetSource(value)` | immediately above `unexplainedValues`, where the deleted local was | shares that scope with both registries |

Those are the only four lines of mine inside either registry's blast radius;
everything else I added to `tests.js` is in the copy/vocabulary guard section
(~3096-3400) and the two new walks. **If a value-guard handoff lands after this
one and re-adds a local `WORKSHEET_SOURCES`, that is the merge to catch.**

---

## Item 7 — the guard

Read `LESSONS_20260915_triage_sweep_guards_not_checklists.md` §2 first, as the
handoff says. Four guards were built; none of them is a checklist.

### 7a. Shapes, not only literals

`BANNED_IN_RENDERED_TEXT` entries may now be a string **or** a RegExp, and the
failure message reports the string actually found rather than the pattern. Two
shapes added: a drawing-checker run id (`\b\d{8}_\d{6}\b`) and a checksum's own
digits (`\b[0-9a-f]{24,}\b`). The eight literals were the eight instances that
existed on 2026-09-15; the argument for shapes is written in the diff, and item
4 is its proof — no literal in that list spells a run id, and none could.

### 7b. The schema's own field names, derived not listed

Every key the projection uses, **read out of the projection**, filtered three
ways, each for a reason a live case forced:

1. **keys with a separator only.** `sheet`, `note`, `document`, `revision`,
   `zone` are all schema keys AND words a human would write, and `sheet 3` is
   the right thing for a citation line to say. Same rule, same reason, as the
   id walks' `indexOf("_") === -1` skip.
2. **minus any word the schema also uses as a VALUE.** `thermal_fit` is an
   `archetype` a stack page says out loud in a correct sentence, and it is also
   a key because the projection carries an archetype-keyed map. Without this the
   guard cries wolf on *"The archetype "thermal_fit" builds them"* — and a guard
   that cries wolf gets an allowlist entry, then two, then deleted.
3. **on a whole-word match.** The stack page prints every element's id beside
   its name on purpose, and `bushing_flange_thickness` contains the schema key
   `flange_thickness`.

### 7c. The walk reaches the stack-side surfaces

`stackSurfaces()` enumerates them once — stack page, header chips, worksheet
pane, every element pane, every citation card — so the fixture walk and the
`[real]` walk cannot drift into covering different things. Both walks assert a
floor rather than an equality, and every floor is well under what it measures,
so the next stack does not redden them.

### 7d. The Python inline-literal scanner, mirrored into `apps/viewer/`

`test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain`. A comparison chain
of two-or-more same-expression `=== "literal"` terms fails **when its literal set
is a subset of some `VA.<NAME>` table's members**, and the message names the
table — exactly-matching table preferred over a merely-containing one.

Deliberately not "any two-literal comparison". Three live chains are correct and
have no table to read: `key !== "ArrowLeft" && key !== "ArrowRight"` (twice) and
`part === "" || part === "."`. A fourth shape, `protocol === "file:" || typeof
fetchImpl !== "function"`, is not a chain at all and is not reported — the two
terms test different expressions, which is one condition about two things.

`apps/viewer/storage/` is **in** scope even though no vocabulary lives there
today. Leaving a directory out is how a guard stops covering the file someone
puts the next one in; the cost is one live finding that is correctly ignored.

**The honest limit, stated because the handoff asks for it:** this cannot catch
a vocabulary with **no table at all**, which is exactly the `worksheet_source`
shape — a single `=== "declared"` is a branch, not a vocabulary, and nothing
static can tell those apart. The pairing rows are what keep a table honest once
it exists; nothing keeps a vocabulary from having no table. That is the residual
hole in this class and I did not close it.

---

## What the widened walk turned up that nobody had filed

Five, all of them real, all fixed in this branch:

1. **A terminal command rendered for the reader to copy/paste**, on every live
   `thermal_fit` stack: *"The identical term table prints from:
   `venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --terms
   --markdown`"*. Against Jeff's binding web-UI rule, and `venv-win` has been in
   the banned list since the day it was written — there was simply no walk that
   reached a stack-side surface. The fact it carried (the table is reproducible
   outside the browser) is kept, in words.
2. **Three free-form key/value dumps printing raw schema keys as labels** —
   `assembly_drawing`, `assembly_export`, `temperature_c`, `stiffness_ratio` —
   plus the word **"null"** for an absent value (`assembly_revision` on the M1
   stack) and **`JSON.stringify`** of six parts-list rows. One renderer now
   (`kvList`/`blockValue`), `VA.fieldLabel` for the label (separator only —
   nothing reworded, recased or reordered), *"not recorded"* for the absence,
   and a nested list instead of a wall of braces.
3. **`VA.rowPositions` asked `mode === "tolerance" || mode === "absolute"`** —
   `VA.EDGE_LENGTH_MODES`' own vocabulary spelled a second time, in a function
   body where no pairing test can see it, and a fourth mode would have been
   silently unscaled. `scaled` is a field on the table's rows now. Found by 7d.
   *(This is a `topology.js` edit, and the handoff fences `apps/viewer/` layout
   to `topology_grid_scroll_and_grips` — which is merged and in `completed/`, so
   there was no live conflict, and the change is to a vocabulary table, not to
   layout.)*
4. **`viewerAuthoredText` subtracted verbatim prose by SUBSTRING.** Safe only
   while every enrolled class holds a paragraph. The moment the walk reached the
   stack page's free-form blocks, which render one-character values (`"A"`, an
   assembly revision), removing every `"A"` from the page turned `PARTS-LIST`
   into `P RTS-LIST` and the guard's own failure messages into nonsense. It is a
   **walk that skips subtrees** now, written to read the node shim and a real
   browser identically.
5. **The record's prose had no class saying so on this half of the viewer.** The
   ban is on the viewer's words, never the record's, and five nodes were
   indistinguishable from the page's own sentences: a stack's notes, a hardware
   or material entry's recorded gap, a check's guidance, the value half of a
   free-form pair, and an element's own note row. Each gained a class carrying
   no styling, argued in the diff as `VERBATIM_PROSE_CLASSES`' comment demands.
   Live proof it matters: an element note argues an assumption by naming
   `thermal_fit.stiffness_ratio` and its `source_ref`, and an export's `why`
   argues its identity by naming run `20260730_133912`. Both are the record
   speaking precisely.

---

## Evidence

### The negative control

On the corrected tree, every guard is green and none is vacuous:

All four counts below were read out of the running guards (instrumented, then
reverted), not estimated:

| guard | surfaces | schema field names | findings |
|---|---|---|---|
| `no rendered stack surface prints an internal id, …` (fixture) | **22** | 50 | 0 |
| `[real] no rendered stack surface of any live stack prints …` | **143** | 141 | 0 |
| `no rendered topology surface prints …` (fixture, pre-existing) | **29** | 39 | 0 |
| `[real] no rendered surface of any live topology prints …` (pre-existing) | **252** | 141 | 0 |

The two topology walks are pre-existing and already covered ids and the banned
list; what this session added to them is the field-name scan.

`test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain`: **18 files
scanned, 32 `VA.<NAME>` tables read, 3 chains found, 0 flagged.** The three are
`key !== "ArrowLeft" && key !== "ArrowRight"` in `topology_app.js:947` and
`views/topology.js:884`, and `part === "" || part === "."` in
`storage/http.js:64` — all correct, none matching any table, and they are the
reason the rule is "a subset of a table's members" rather than "any two
literals".

419/419, 20/20, 1192 pytest passes.

### The planted positives — and the one that earned its keep

**Plant A — re-print the run ids** (`views/detail.js`, the line as it shipped
until this session). Reverted after measuring.

```
FAIL  [real] no rendered stack surface of any live stack prints an internal id, a field name, a checksum or a workstation path
      pitch_link_to_pitch_plate element pane on pitch_plate_flange renders "20260409_170546"
      (a drawing-checker run id -- an internal artifact's address, and a shape, so an id
      nobody has written yet is caught too): …
```

**Plant B — print the raw schema key as its label** (`views/stack.js`,
`VA.fieldLabel(key)` → `key`). Reverted after measuring.

```
FAIL  no rendered stack surface prints an internal id, a field name, a checksum or a workstation path
      demo_joint stack page renders the schema field name `assembly_drawing`: …
FAIL  [real] no rendered stack surface of any live stack prints an internal id, …
      hub_bearing_thermal_fit_m1 stack page renders the schema field name `assembly_revision`: …
```

**…and the first time Plant B was run, it did not fire.** That is the finding
of this session I would most want the next agent to have. The field-name half
had shipped an hour earlier as `new RegExp("\b" + name + "\b")` — one backslash,
lost through a shell heredoc — and JS reads `"\b"` as **U+0008 BACKSPACE**. Every
pattern was `<backspace>name<backspace>`, the scan matched nothing, ever, and
the full suite was green at 419/419 with the "negative control" apparently
clean. *A scan that finds nothing and a tree with nothing to find are
indistinguishable from the outside.* Nothing in the repo could have told them
apart. Planting the positive and watching the guard **not** fire is what told
them apart, and it is the entire argument for the practice. The boundary test is
an explicit `wholeWordIn()` now, with no escape left to lose and the story
written beside it.

**Plant C — revert `VA.needsAnnotation` to its two inline literals.** Reverted
after measuring.

```
E   AssertionError: a vocabulary the viewer already has a table for, spelled again as a comparison chain…
E       apps/viewer/viewer.js:106: `confidence` is compared against ['no_source_ref', 'untraced'],
E       which is exactly what VA.UNVERIFIED_CONFIDENCES spells
```

(The first run of Plant C named `VA.CONFIDENCES` — a superset — which would have
sent a reader to rewrite the wrong table. The scanner prefers an exact match
now. Another thing only a plant shows.)

### The screenshots

All at 1600×1000, headless Chrome, live projections, written by
`tests/debug_reader_facing_copy.mjs --shots docs/sessions/lessons`.

| file | case | the string it shows |
|---|---|---|
| `…_1_citation_where_line.png` | `pitch_link_to_pitch_plate : bolt_grip_11` | `NAS6403-NAS6420 Rev 4.pdf · Rev 4 (sheet 1 rev 4, …) · sheet 3 · grip/length table · cell row 'Grip Dash No. 11'` |
| `…_2_component_card_sourcing.png` | `pitch_system \| hub` | `dimensions from 260825_End_Stop_JC.xlsx · sheet End Stop Tol Stack (unverified); 212966-006-A · sheet 4` |
| `…_3_no_tolerance_recorded.png` | `rotor_fastener_length : washer_ms21299c3` | summary chip `2 elements with no tolerance recorded`, the row chip, the min/max hover and the element-pane chip, all four in the same words |
| `…_3b_dag_pane_no_tolerance.png` | the DAG page's own edge pane | `no tolerance recorded` — the fifth site, and the one that made this a self-contradiction rather than a two-surface split |
| `…_4_drawing_checker_runs.png` | `tan_link_to_pitch_plate : straight_bushing` | `read by drawing-checker 4 times, most recently 30 Jul 2026 — 217755 rev A` |

Two things the probe had to work around, both worth knowing before writing
another one:

* **A covered stack is not a nav leaf.** `pitch_link_to_pitch_plate`,
  `tan_link_to_pitch_plate` and `rotor_fastener_length` are all re-expressed by
  a topology, so `VA.navTree` offers only the topology. `?stack=` is the only
  way in — and it is the documented inbound contract, so it is also how a real
  reader arrives.
* **`?mock=1` keeps only `results.stacks[0]`.** `topology_app.js`'s
  `mockFixture()` composes one stack plus a renamed copy of it, so overriding
  `VA.demoFixture()` with the whole live projection is not enough: the stack a
  case is about has to *be* `stacks[0]`. The probe reorders. Nothing is dropped.
* **Do not `waitForSelector` after a re-boot.** The re-boot replaces the page's
  tables and a selector matching the old *detached* rows resolves instantly and
  then never becomes visible. `waitForFunction` on a fresh query, or a plain
  wait.

---

## Running the browser tier from a worktree

`node_modules/` is gitignored and exists only in the main checkout, and
`NODE_PATH` does **not** work for ESM, so `import { chromium } from
"playwright-core"` fails outright. What works, and what I did:

```
cmd /c mklink /J "<worktree>\node_modules" "C:\workspace\tolstack\node_modules"
```

A junction, not a copy; gitignored, so it never reaches the branch. Worth a line
in `CLAUDE.md` if another session hits it — I did not add one, because I am not
certain a junction is the shape the repo wants rather than `npm install` in the
worktree.

---

## Left to do — filed, not just described here

* `ISSUE_20260916_the_reader_facing_copy_guards_have_no_mutation_witness_entry.md`
  — the two surface guards above, as two paste-ready `mutations[]` entries with
  the mutation each was actually watched reddening on. The handoff told me to
  name them in this lesson "so that handoff can" enroll them; that handoff is in
  `completed/`, so the lesson alone would have left them unowned. The third
  guard (7d) is a pytest scan and the witness table has no pytest tier
  (`ISSUE_20260916_the_mutation_witness_table_has_no_tier_for_a_pytest_guard.md`).
* `ISSUE_20260916_the_materials_table_says_values_status_and_library_ref_to_the_reader.md`
  — five strings in the materials table naming `values_status`, `library_ref`
  and `materials.json` to the reader. The new field-name scan **would** flag
  every one, and does not, because no live or fixture material entry reaches
  those branches. Filed rather than fixed because there is a real argument for
  them (this surface's audience is the author, and the sentence's job is to say
  which field to go and fix), so it wants a decision, not a rewrite.
* The authoring question the handoff fenced —
  `ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`,
  whether `revision` should carry per-sheet detail — is untouched and still
  open. Item 1 fixed the viewer's half only, and the four-clause value still
  renders in full.
