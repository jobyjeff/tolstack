# LESSONS — `stack_viewer_v0` (2026-08-05)

Built `apps/viewer/` plus the two projection scripts it renders. What follows is
only what the code and git history do not already say.

## 1. The handoff's headline finding: which `source_ref`s failed to resolve, and why

The crop projection resolves **6 of 32** element citations. All six are in
`stack_pitch_link_to_pitch_plate.json`; the other three stacks resolve **zero**.
Grouped by cause:

| n | kind | why not |
|---|---|---|
| 18 | `workbook` | the source is `260729_sample_tol_stack.xlsx`. There is no page of any drawing to crop — the value's provenance is a spreadsheet cell |
| 7 | `parts_list` (5) / `drawing` (2) | **the citation names no export.** The document, sheet, zone and view are all there; nothing says *which PDF* |
| 1 | `assumed` | no source document exists by construction (the 1/16 in thread-transition allowance) |

The 18 workbook ones are not a viewer problem — they are the spec-library problem
already tracked, and the honest render is "the source is a spreadsheet".

**The 7 are the design input, and they are not what I expected.** They look like
*complete* citations:

```json
{"kind": "drawing", "document": "215197", "revision": "A.1", "sheet": 2,
 "zone": "B4", "view": "SECTION A-A", "confidence": "traced"}
```

A human reads that and believes they can re-find the value. They cannot, because
drawing-checker holds 20+ exports of 217755 and several of 215197, and the
pitch-link lesson already proved a printed zone is **not stable between exports
of the same revision** (DETAIL B: `I6 → H3`). So the citation resolves to "a
location on some PDF". `confidence: "traced"` is being asserted against a
document the file does not identify.

`stack_pitch_link_to_pitch_plate.json` is the only stack that closes this, and it
does so at the **stack** level, not the citation level:

```json
"joint": { "assembly_export": "[PRELIM 2026-AUG-3] 217755 ... .pdf (drawing-checker run 20260804_114000 / 20260803_145243)" }
```

That single sentence is why 3 of its crops resolve, sha256-verified against the
run's `run_meta.json`. Three conclusions:

1. **The missing address is the EXPORT, not the element.** I expected the
   identity gap to be "which dimension on the sheet" — the thing
   `source_ref.element_id`/`run_id` are held open for. In practice the coarser
   failure bites first: *which rendering of the drawing*. An element id inside an
   unidentified document is still unresolvable. Whatever the identity system
   becomes, the export/run must be part of the address, and it must sit on the
   `source_ref`, not on the stack: `stack_pitch_link_to_pitch_plate.json` cites
   three documents (217755, 215197, a NAS standard) and its `joint` block covers
   exactly one of them.
2. **`assembly_export` is free text, and that is already costing.** The crop
   script regexes `\d{8}_\d{6}` run ids out of a sentence. It works and it is
   verified (sha256 against the run's recorded input), but it is a parser over
   prose. A structured `{pdf, sha256, runs: [...]}` would remove both the regex
   and the ambiguity.
3. **215197 only resolved through a second-choice rule.** Its export is not in
   the `joint` block, so it fell to a `provenance.sources_used` scan, which
   requires the entry to *begin* with a `.pdf` path and to be the *only* such
   entry mentioning the document. It worked here by luck of formatting. I kept it
   because it turns the single best demo crop (the traced `5X 4.06 ±0.10`
   callout) from unresolvable into resolvable, and because ambiguity still fails
   closed — but it is a prose scan and should not become load-bearing.

Filed as `docs/issues/ISSUE_20260805_slice1_stacks_name_no_export_so_no_citation_resolves.md`.

## 2. The crop trick worked better than expected — because drawing-checker already reads zone grids

The thing I braced for (locating a callout on a sheet) mostly did not need
solving. Two facts made it cheap:

- **The printed border grid is readable from the PDF's text layer.** Reproduced
  from drawing-checker's `pipeline/native_zones.py` (~25 lines: margin labels →
  column/row centres). Since the citation *is* a zone citation, cropping the
  cited cell ± 1 cell is both the most defensible thing to show and trivially
  computed. Deliberately **reproduced, not imported** — tolstack's dependency on
  drawing-checker is read-only *data*; importing `pipeline.*` would make it a
  code dependency.
- **Callout text search is nearly useless on assembly sheets and unnecessary.**
  `217755` sheet 4 has 691 characters of text layer: `search_for("214820-002")`
  finds nothing, because parts-list nomenclature lives on the parts-list sheet
  while the citation points at the *balloon*. So the crop is the zone, and the
  locator records `callout_text_in_zone: false` as **corroboration data, not a
  failure**. Getting that distinction right in the UI mattered more than getting
  the search to work.

The exception is worth knowing: **`NAS6403-NAS6420 Rev 4.pdf` has a zero-length
text layer** (a pure scan) *and* no printed zone grid, so all three spec
citations fall through to a whole-sheet render. The demo case the handoff names —
the NAS6403 grip header — is therefore "the whole of sheet 3 at 1740×2400", which
does show the grip/length table and is honest about being the whole sheet. There
is no way to locate a callout on a scan without OCR, and I did not add one.

## 3. Two derived flags carry the most review weight and neither has a schema field

- **INCOMPLETE** is detected by searching the authored label/guidance for the
  literal string. `check_result/v0` has no `complete` field. A stack that writes
  "incomplete" in lower case renders as an ordinary failing check — precisely the
  misreading the flag prevents. Filed
  (`ISSUE_20260805_check_result_has_no_complete_flag.md`); the projection test
  asserts the lower-case miss on purpose so the gap cannot be quietly forgotten.
- **zero-width band** (`min == max`) is computed, and is deliberately rendered as
  a *separate axis* from confidence rather than a fourth confidence value. The
  pitch-link washer is `inferred` **and** zero-width, and those are two different
  problems: "a reading sits between the document and this value" vs "no document
  gives this a tolerance at all, so the interval is a lower bound". Collapsing
  them into one colour would have lost the second, which is the one that makes
  every downstream number a lower bound.

## 4. Decisions I made that the handoff left open

- **The viewer reads a projection, not the stack JSONs.** The handoff's "values
  verbatim from the JSONs — the viewer computes nothing" and "one `fold()` rule"
  cannot both hold if the app reads the JSONs directly: fold results have to come
  from somewhere. So `results.json` embeds each stack **verbatim** (a test pins it
  byte-identical) and carries the folded numbers beside it. Cost: the viewer shows
  nothing until the script has run, which the banner explains with the command.
  This is the forge dashboard's pattern ("renders `tasks.json` dumbly").
- **Fold outputs are rounded to 6 dp in Python.** Otherwise the browser has to
  decide how `-8.193899999999999` reads, and `toFixed` in the viewer is a small
  arithmetic decision in the one place this repo has decided to make none. Element
  `nominal`/`min`/`max` are *never* rounded — they are transcribed values.
- **Worksheets are read live, not projected.** Nothing about a worksheet is
  derived, so an edit should show on reload. The split is: *authored text live,
  computed numbers from the projection*.
- **Two scripts, not one.** `build_viewer_crops.py` needs PyMuPDF and so must run
  under drawing-checker's venv; the results projection must stay runnable under
  tolstack's stdlib-only venv. Each wipes and rebuilds **only its own files**, so
  either can be re-run alone — a shared wipe would have one script deleting the
  other's output.
- **Read-only FSA grant** (`mode: "read"`). forge's apps ask for `readwrite`
  because they write events; a review surface asking for write access to Jeff's
  stack JSONs would be asking for trust it has no use for.
- **Both test tiers, and a `package.json`.** forge `CONVENTIONS.md` §7 wants both;
  the handoff's parenthetical named only the fast tier. The truth tier paid for
  itself within an hour (§5), so tolstack now has a `package.json` — test tooling
  only, `node_modules/` gitignored, app code still build-free.

## 5. The browser tier caught two things the DOM shim could not — one of them a real bug

Worth recording because it is the argument for keeping the truth tier:

1. **NodeList vs array.** The node shim's `querySelectorAll` returns an array; a
   real browser returns a NodeList with no `.map()`. Three tests passed under node
   and threw in Chrome. Every test query now goes through one `all()` helper.
2. **The hover popover closed itself the instant it opened.** The sequence: the
   popover was measured *before* the crop PNG decoded, so it was measured short;
   being short it "fitted" above the trigger; then it grew back **down over its own
   trigger**, which fired `mouseleave` on the button, which closed it. Under the
   DOM shim there is no layout, so nothing could have found this. Two fixes, both
   improvements in their own right:
   - reserve the image height from the pixel dimensions `crops.json` already
     records (`aspect-ratio: w / h`), so the popover is measured at final size;
   - **stop closing on `mouseleave` at all.** It is the obvious design and the
     wrong one — the pointer must leave the button to reach the "open the PDF"
     link *inside* the popover. Closing is now ✕ / `Esc` / outside-click / opening
     the next one, and the outside-click handler has a 300 ms guard because a
     click on a trigger can arrive with `target == body` when the popover moves
     under the pointer mid-gesture.

A third, smaller one: the sticky topbar swallowed clicks on anything Chrome
scrolled to (Playwright's "intercepts pointer events" is also the reader's
experience). Fixed with `scroll-margin-top` on the rows, cards and triggers.

**The FSA directory picker cannot be automated** — it needs a user gesture, the
same limitation forge's notes app recorded. So `Connect folder` is the one path
verified by hand. The truth tier drives `?mock=1` instead; real-data rendering is
covered by the node-fs tier, which reads the actual projection through the same
adapter contract.

## 6. Left to do / watch

- **Nothing rebuilds the projections automatically.** No hook, no ops verb, no
  watcher: edit a stack and the viewer shows the last build until you re-run the
  script. The banner prints both build times so staleness is visible, but that is
  a report, not a fix. An `ops.toml` verb was not added because the ops verbs are
  `install | serve | deploy | smoke` only and none of them means "rebuild a
  projection".
- **`crops/` is ~6 MB for 6 crops**, because three spec citations render whole
  scanned sheets (2 MB each) and two of those three are the *same* sheet rendered
  twice (`bolt_grip_11` and `bolt_length_11` both cite NAS6403 sheet 3). A
  content-addressed crop name would dedupe it. Not worth it at this size.
- **`hardware_entries.json` gaps repeat across elements** sharing a
  `hardware_ref` (three, for the NAS6403 bolt). The viewer folds them into one
  collapsible row per element; the full list is still in the per-stack Gaps
  section. If a stack ever has many such elements this will want rethinking.
- **`tan_link_to_pitch_plate_take2` has no worksheet.** The projection reports
  `worksheet_file: null` and the viewer says so rather than showing take-1's
  sheet. Whether take-2 *should* have one is a stack question, not a viewer one.
- **The `vpa_output:pitch_flange_thickness` 215197 ambiguity is already
  documented** in its own `source_ref.note` (two `4.06 ±0.10` callouts, and the
  balloon may point at the wrong part entirely). I checked before filing an issue
  and did not file one — it is recorded, `inferred`, and honest. The viewer makes
  it visible, which is the most a viewer should do about it.
