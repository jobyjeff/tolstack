---
type: review
handoff: docs/sessions/active/HANDOFF_20260812_viewer_fixture_shape_guards.md
reviewer: review agent (claude-opus-5[1m])
date: 2026-08-12
verdict: APPROVE
blockers: 0
---

# Review — `viewer_fixture_shape_guards`

**APPROVE.** Three inline fixes, committed on `review/viewer_fixture_shape_guards`
(`e741374`). One of them — a raw NUL byte in `apps/viewer/tests.js` — was the
kind of thing that only shows up if you look at the diff's *shape* rather than
its content, and it is now a new entry in this repo's overlay.

The work does what the handoff asked and slightly more: all four deliverables
landed, both tiers demonstrably bite, and the lesson answers the DoD's specific
question (which tier would have caught the original `resolved_by` bug) plainly
and correctly.

---

## The seven mandatory checks

The work under review is **not a tolerance stack**. It touches
`apps/viewer/fixtures.js`, `apps/viewer/tests.js`,
`scripts/run_viewer_browser_tests.mjs` and three docs — no
`docs/tolerance_stacks/*.json`, no `data/`, no worksheet. Checks 1–7 are written
for a stack author transcribing numbers out of documents, so they mostly exit;
each is addressed below rather than skipped, and where a *fixture* number could
be mistaken for a claim about a part, I say so.

**1. Every tolerance traces to a specification or drawing callout — N/A, with one
nit.** No element value in any stack changed; the diff contains no
`docs/tolerance_stacks/` edit. The numbers that *did* change are all inside
`fixtures.js`, whose header states that nothing in it is a claim about a Joby
part, and every new number is disclosed as synthetic in an adjacent comment
(`"A demo export. The sha is arbitrary and hashes nothing."`). One nit below
about the fixture's synthetic sha256 hanging off a *real* drawing number.

**2. Signs on every path term — N/A.** No `fold()`, no term list, no check
authored. The fixture gained `paths`/`checks` arrays, but they are the
*authored, pre-fold* spellings and nothing renders or folds them (verified: the
viewer reads `joint`, `elements`, `notes` out of `stack.stack` and nothing else).
The demo stack's projected checks were already there and are unchanged.

**2b. Coherent material corners — N/A.** No transcription, no re-derivation.

**3. LMC/MMC direction — N/A.** No element carries `lmc`/`mmc` in this diff.
Confirmed `fold()` is untouched: no Python file is in the diff at all.

**4. RSS actually computed — N/A.** No check was authored or altered.

**5. Nominal inside its own min/max — N/A.** No transcribed nominal in the diff.

**6. Quantised constraints where cotter/castellation hardware appears — N/A.**
No joint is analysed here.

**7. The traced / inferred / untraced ratio — unchanged, and re-derived rather
than copied.** `venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py
--ratio`, run by me in the main checkout after the merge:

> **5 of 26 element instances** across the three seeded slice-1 stacks are
> `traced`; 3 are `inferred` and 18 are `untraced`. Across all stacks:
> **21 traced / 7 inferred / 20 untraced, out of 48 element instances.**

This handoff changes neither numerator nor denominator; the figure is quoted so
the next reader does not have to reconstruct that it was checked.

---

## What I verified

**The diff is what the handoff scoped, plus one justified addition.**
`apps/viewer/fixtures.js`, `apps/viewer/tests.js`, the two issue files, the
lesson — and `scripts/run_viewer_browser_tests.mjs`, which is outside the stated
scope but which the fixture change made red (the browser tier asserts on the
washer popover's prose). Changing it was correct and the lesson says so
explicitly. **`apps/viewer/views/stack.js` was not touched**, as the handoff
fenced.

**Both guards bite, demonstrated not asserted.** I built two poisoned copies of
the live projection in a scratch dir and ran the suite against each with
`--repo`:

* **Tier 2, on the historical bug.** Set `resolved_by` back to
  `"provenance.sources_used"` on all 26 resolved crops →
  `FAIL [real] no live value is one the viewer has no branch for`, naming the
  value, the field and `VA.CROP_RULES` as the branch table. **96/98.** This is
  the exact failure the four-day bug would have produced on day one.
* **Tier 1, on a builder that grows a field.** Added
  `results.freshly_grown_top_level_key`, `source_ref.measured_by`,
  `material.new_material_field` and `crops.new_crops_top_level` →
  `FAIL [real] every fixture shape still matches the builder's`, listing all four
  and naming `apps/viewer/fixtures.js` as the thing to update. **97/98.**
* The unpoisoned copy of the same tree passes 98/98, so the failures are the
  poison and not the copy.

**The value guards' coverage is complete, checked against the code rather than
the list.** I grepped the viewer for every enumerated-value branch
(`=== "<literal>"`, `CONFIDENCES`, `CROP_RULES`) and every one is a `VALUE_GUARDS`
row: `confidence`/`designation_confidence`/`worst_confidence` via
`confidenceClass`, `verdict` via `verdictClass`, `resolved_by` via `CROP_RULES`,
plus `located_by`, crop `status`, `worksheet_source`, `checks_source`,
`gaps[].kind`, `kind`, `values_status`, `export.status`. The handoff asked for
seven fields; thirteen landed. Nothing the viewer switches on is missing.
`hardware_entries.entries[]` is read for nothing at all (`hardware_ref` on the
element row is the whole surface, `views/stack.js`), which is what makes its
absence from both tiers safe today — recorded in the lesson's bounds section
during review.

**The guards' pinned vocabularies match the live data.** `values_status` is
`inline` ×6 across the live materials (the `library` and `not_transcribed` values
live in `hardware_entries.json`, a different shape the guard correctly does not
read); material confidences are `untraced`/`traced`/`no_source_ref`, all in
`VA.CONFIDENCES`.

**Prose claims about code, checked against the code.** The fixture's comment that
`SourceExport` raises on an unestablished export naming a `pdf`/`sha256`/`runs`
is accurate (`tolerance_stack/stack.py:203-213`). The `branch:` pointers in
`VALUE_GUARDS` resolve: `cropProvenanceLine` is `viewer.js:321`, `cropFor` is
`viewer.js:191`, `unresolvedHeadline` is `views/crop.js:69`, `worksheet_source`
is `views/worksheet.js:25`.

**Counts in the new prose, recomputed.** `hardware_entries.json` has exactly four
`not_transcribed` entries and they are the four the issue names (MS9363-09,
MS9363-10, MS24665-153, MS24665-229). `crops.json`'s top level does carry the
four keys the lesson says the original audit missed. The live `unresolved`
reasons are exactly the two the lesson lists. `VALUE_GUARDS` has 13 rows, of
which 3 are `branch: "NONE"` — both as claimed. **One count was wrong** (six vs
five ask-the-viewer rows) — fixed inline, below.

**The projections, rebuilt from this tree and diffed key by key.** Both were
stale relative to the merged tree (`results.json` from
`review/spec_library_projection_provenance`, `crops.json` from `master` at
`6aea6ec`). Rebuilt `build_viewer_projection.py` with this repo's venv and
`build_viewer_crops.py` with drawing-checker's, both `--data-root
C:\workspace\tolstack\data`; the exit-3 gate did not fire. **The only difference
in either file is `built_at` and the `provenance` block** — verified by a
recursive key-by-key walk, not by eye. Suite still 98/98 after the rebuild. The
third projection (`data/projections/spec_library/library.json`) was not rebuilt:
`docs/spec_library/events/` is not in this diff.

**drawing-checker was not written to.** `scripts/snapshot_drawing_checker.py`
snapshot taken *before* I started (1628 entries) and again after the crop
rebuild: **EMPTY — no entry added, removed or modified.** The handoff itself
touches no drawing-checker path.

**Suites.** Re-run by me, in both checkouts, saying which:

| suite | where | result |
|---|---|---|
| `node apps\viewer\run_tests.cjs` | review worktree | **75/75, `[real]` tier SKIPPED** |
| `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack` | review worktree → main checkout data | **98/98, tier RAN** (was 95/95 pre-merge) |
| `node scripts\run_viewer_browser_tests.mjs` | review worktree (after `npm install`) | **4/4 checks** — 75/75 `file://`, 75/75 http, 16/16 app sub-checks each |
| `python -m pytest -q` | main checkout | **351 passed** |
| `python -m pytest -q` | review worktree | **350 passed, 1 skipped** (the documented data-dependent skip) |

The browser tier matters here specifically: the fixture change altered prose the
`file://` app check asserts on, and the author updated it. It passes.

**Housekeeping.** `git log --oneline HEAD..master` empty before and after the
merge, so no sibling handoff landed underneath this one. `forge check` OK on the
review worktree (with the standard linked-worktree warning) and on the main
checkout after the merge. No `{{` template placeholders in the diff. Nothing
under `data/`, `docs/reference/` or `PROVENANCE.md` touched. `apps/viewer/README.md`'s
Layout block needed no new row (no new file).

---

## Findings

### Should-fix — fixed inline (`e741374`)

**1. `apps/viewer/tests.js` shipped with a raw NUL byte, and it turned the diff
into a reformat.** `apps/viewer/tests.js:1116`, `distinct()`.

The sentinel was written with a **literal control character** where the source
should carry the six-character `\u0000` escape:

```js
var key = v === undefined ? "<0x00>undefined" : JSON.stringify(v);
```

JavaScript accepts it, so nothing failed. What it broke is everything that reads
the file as text:

* **Git stopped normalising the line endings.** `convert.c` calls any buffer
  containing a NUL *binary*, so `core.autocrlf=true` — which is on here, and why
  every other blob in this repo is LF — skipped conversion and committed **1370
  CRLFs**. The blob was the only CRLF file in `apps/viewer/`.
* **The diff became unreviewable.** `git diff master...handoff` reported
  `1032 → 1370`, every line changed; `git diff -w` reported **341 insertions and
  3 deletions**. The 341 lines that matter were hidden inside a 2402-line
  whitespace churn.
* **`grep` and `git grep` skipped the file**, printing `Binary file
  apps/viewer/tests.js matches` and no line — in a repo whose review checklist is
  mostly greps.

Fixed by writing the escape instead of the byte (identical semantics — same
string, same sentinel), after which the blob renormalises to LF and the diff
against master is 344 lines. Suite unchanged at 98/98, browser tier 4/4. Added to
the overlay as a new recurring-bug entry with the `git diff -w --stat` tell.

**2. A stale count in the lesson.** `LESSONS_20260812_viewer_fixture_shape_guards.md`,
"ask the viewer, don't copy it": *"Six of the thirteen rows are this form"*. It is
**five** — `known: function` appears 5 times in `VALUE_GUARDS` and `known: inList`
8 times. Fixed, and the corrected sentence now names the two spellings so the next
reader can recount in one grep rather than by reading thirteen rows.

**3. An unguarded shape the lesson's bounds section did not name.** Added to
"Bounds of what landed": `hardware_entries.entries[]` is unguarded on *both*
tiers and structurally has to be, because the fixture's `entries` array is empty
on purpose (it is the missing-entry state) and a key-union guard would fail on
every key. What keeps that honest is that the viewer reads nothing out of a
hardware entry — so the note says what has to change the day it does (a second
fixture stack with a populated pile, not a row in `SHAPES`).

### Nit — fixed inline

**4. A durable operational fact living only in a lesson.** The rule *"if you add
a field in `build_viewer_projection.py`, add it to `fixtures.js` too, or a viewer
test fails"* is new, non-obvious and cross-cutting — and it existed only in
`docs/sessions/lessons/`, which the repo's own convention says dies with the
session. Added a short section to `apps/viewer/README.md`'s Tests block naming
both guards and what each one does that the other cannot.

### Nits — recorded, no action

**5. The fixture's synthetic sha256 hangs off a real drawing number.** The new
`export` block on the `plate` element cites `document: "215197"` — a real Joby
drawing, and one whose three live citations this checklist already tracks — with
a fabricated 64-hex sha and `pdf: "C:/workspace/demo/215197.pdf"`. This is
disclosed twice (the file header, and an adjacent comment saying the sha "hashes
nothing"), the hex is transparently synthetic (`a1b2c3d4e5f60718293a4b5c6d7e8f90`
repeated), the drawing number and callout pre-date this handoff, and the run id
`20260804_114000_x` is deliberately non-conforming so it cannot be mistaken for a
real run. That is enough, and I would not change it. Recorded only so that a
future repo-wide sha audit knows why a `215197` sha exists that hashes nothing.

**6. One `branch:` string reads ambiguously.** The crop-`status` row says
`"VA.cropFor + unresolvedHeadline in views/crop.js"`; `unresolvedHeadline` is in
`views/crop.js` but `VA.cropFor` is in `viewer.js`. A reader following the
pointer finds both, so this is cosmetic.

---

## Note for the next reviewer

The `[real]` tier is now **23 tests** (75/75 skipped vs 98/98 ran). The overlay
entry that used to hand you `95/95` has been updated *and* rewritten to tell you
to recount rather than quote it — the digit changes every time anyone adds a real
test, and this checklist has already burned three reviews on constants it supplied
itself.

The architectural entry **"a branch over a value the data owns must be a total
function"** has changed shape, and the change matters for how you review the
*next* viewer handoff. Which fields are covered is no longer yours to enumerate —
`VALUE_GUARDS` in `apps/viewer/tests.js` is the list. What is yours is the
**form** of each row: `known: function` asks the viewer and self-syncs;
`known: inList` copies a vocabulary out of an `if` chain or a CSS block and has to
be re-read by hand whenever that chain moves. When a handoff touches
`cropProvenanceLine`, `views/worksheet.js`, or an `index.html` `.gap--*` /
`.croppop--*` rule, go read the matching `inList` — nothing pairs them.

`viewer_export_and_material_provenance` runs next and is the direct consumer of
this work: the fixture now carries `source_ref.export` (established,
unestablished-with-`why`, and absent) and the full `materials[].material`
provenance set, so that handoff can pin rendering at the fixture tier. Two
`VALUE_GUARDS` rows are marked `branch: "NONE"` *because* it hasn't landed
(`export.status`, `values_status`); when it does, those rows should move from a
pinned `inList` to an asked table — rewritten, not deleted.
