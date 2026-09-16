---
priority: med
depends_on: [mutation_witness_tier_reaches_its_checks]
model: opus
---

# HANDOFF 2026-09-16 — viewer_unwitnessed_surface_guards: seven live viewer surfaces that revert in silence, each given a guard that has been SEEN to fail

Source: the 2026-09-16 dispatch triage sweep, dispositioning seven open issues
in `docs/issues/` (named per deliverable below). Every one of them was measured,
not guessed — a reviewer planted the reverting edit, ran the tier, and wrote
down the green count. Baseline: `master` after the 2026-09-16 batch merge, which
measured **1155 passed** on `venv-win/Scripts/python.exe -m pytest -q`. Scope:
this session owns `apps/viewer/tests.js`, `apps/viewer/views/`,
`apps/viewer/style.css`, `tests/test_viewer_crops.py`,
`scripts/build_viewer_crops.py`, the `SUITES` run loop and the
`testNavNeverWedges` suite in `scripts/run_viewer_browser_tests.mjs`, and
**appends** to `scripts/mutation_witnesses.json`'s `mutations[]`.

Do NOT touch:

- `scripts/run_mutation_witness_tests.mjs` and the `card-layout-out-of-flow`
  entry in `scripts/mutation_witnesses.json` — owned by
  `HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md`, staged in
  parallel. Append new entries to `mutations[]`; edit no existing entry, and
  change nothing in the runner.
- `apps/annotate/`, `docs/reference/`, `data/inbox/specs/`.
- `VA.cropHighlights`, `VA.cropReference`, `VA.edgeAttention`,
  `VA.drawingLinkText` and `parts_list_companion` themselves. Every one of the
  seven findings is **a missing guard, not a bug**. The shipped behaviour is
  right; what is missing is anything that notices when it stops being right.
  Change product code only where a deliverable says so in as many words
  (deliverable 5's comment narrowing is the one genuine code edit).

**Sequencing (set by the 2026-09-16 triage sweep, check the reasoning rather than just obeying it).**
`depends_on: [mutation_witness_tier_reaches_its_checks]` for two reasons. First, both
handoffs write `scripts/mutation_witnesses.json` — that one repairs the
`card-layout-out-of-flow` entry while you append new ones to the same
`mutations[]` array. Second and more important: that handoff's whole subject is the
tier **failing to report which check reddened**. Every new witness you declare is
proved by reading exactly that report, so declaring witnesses first would mean
proving them against the reporting this sweep has already found untrustworthy.

## Why this is one handoff and not three

The seven read as three themes — crop/overlay guards, topology-value-guard
rows, the nav and runner doors — but they land in the same two files. Six of the
seven add checks to `apps/viewer/tests.js` (10,165 lines, but the two guard
registries are siblings in it: `VALUE_GUARDS` at line 7485, `TOPO_VALUE_GUARDS`
at line 9957), and five of the seven append to the single `mutations[]` array in
`scripts/mutation_witnesses.json`. The repo has already written this collision
down: `ISSUE_20260915_the_new_gap_kind_field_has_no_topo_value_guard_row.md`
declined to add its own row because "a second session editing
`TOPO_VALUE_GUARDS` in the same week is how two handoffs collide in one array."
Two parallel branches here would conflict in one array and one JSON list. They
also have to give **one** answer to the derivability question in deliverable 8,
which is asked of all three registries at once.

## THE BINDING REQUIREMENT, and it applies to every deliverable below

**Every guard this session adds must be demonstrated reddening on a planted
mutation, and the plant must then be reverted.** Plant the exact edit the
deliverable names, run the named tier, copy the failing sub-check line
**verbatim** off the output, revert the plant, re-run, confirm green. A guard
nobody has watched fail does not count as done and must not be reported as
done.

This is not ceremony. `scripts/mutation_witnesses.json`'s own `about` block
records the reason: "Five of those were filed by five different review sessions
between 2026-09-11 and 2026-09-15, three of them found only because a reviewer
mutated the code by hand and noticed the suite stayed green." Every single
finding in this handoff is a guard-shaped hole that a green suite was reporting
as covered. Adding another one is the failure mode, not the fix.

Where a deliverable says "and declare it", the witness becomes standing: copy
the nearest entry in `scripts/mutation_witnesses.json` and change five strings.
`find` is any exact, UNIQUE snippet including leading indentation; `replace` is
the broken version; `expect_red` is the sub-check name the owning tier PRINTS,
copied verbatim off that output; `tier` is `"fast"`
(`apps/viewer/run_tests.cjs`) or `"browser"`
(`scripts/run_viewer_browser_tests.mjs`, which also needs `suite`, passed
straight to `--only`). That file's `about` block also names the one thing an
entry cannot declare: a mutation that takes its whole suite down as an ERROR
carries no check name and is reported as a MISS. Narrow the mutation until it
fails an assertion.

**Priority order if the session runs short:** 1, 2, 3, 4 are the ones where a
silent revert produces a screen that *lies* to a reader. 5, 6, 7 are
containment and reporting shape. Do them in the numbered order and stop where
you stop; a lesson that says "6 and 7 not reached" is fine, a deliverable
claimed without its witness is not.

## Deliverables

1. **The crop overlay's four unwitnessed wires.**
   (`ISSUE_20260916_the_crop_overlays_wiring_is_unwitnessed_in_every_tier.md`.)
   `viewer_reference_crops_in_context` is pinned where it is a pure function
   and where it is a renderer fed a hand-built entry, and nowhere along the
   four seams that carry the deliverable from the builder to the screen. Each
   of the four below is one edit, and each was measured on 2026-09-16 leaving
   pytest at its baseline, `node apps/viewer/run_tests.cjs --repo
   C:\workspace\tolstack` at **407/407** and `node
   scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` at
   **20/20**.

   1a. **The letterbox fix.** `apps/viewer/style.css:507-509` currently reads

   ```css
   .hovercard .cropblock .cropfig {
     max-width: calc(260px * var(--crop-ratio, 1)); margin-inline: auto;
   }
   ```

   The pre-handoff rule it replaced was `.hovercard .cropblock img.croppop__img
   { max-height: 260px; object-fit: contain; }`. `object-fit: contain` insets
   the picture inside its element while the overlay is positioned in
   percentages **of the element** (`highlightBox` in
   `apps/viewer/views/crop.js:107-122` writes `left`/`top`/`width`/`height` as
   `pct(frac[n])`), so every highlight on a hover card points into the
   letterbox instead of at the cell. That is verbatim the defect
   `docs/sessions/lessons/LESSONS_20260915_viewer_reference_crops_in_context.md`
   §2 calls "the unforeseen cost", and no tier can see it: the fast tier has no
   geometry, and the browser tier never opens a card that shows a crop with a
   highlight. Wanted: a **geometric** browser-tier assertion at a viewport
   where a card's crop is open — the highlight box's client rect is inside the
   `<img>`'s client rect — plus a non-vacuity witness that the cap actually
   bit (the crop is taller than 260px unbounded). `CARD_LAYOUT_VIEWPORT`
   (`scripts/run_viewer_browser_tests.mjs:962`, `{ width: 1600, height: 700 }`,
   applied at line 1484) is the same shape and carries its own witness —
   follow it. Then declare it.

   1b. **The builder stops emitting the companion.** In
   `scripts/build_viewer_crops.py::_crop_from_citation`, replace the
   `parts_list_companion(...)` call at lines 1582-1585 with `companion = None`.
   Deliverable 1's second image disappears from all four live balloon crops
   (measured: `data/projections/viewer/crops.json`'s `by_stack` carries exactly
   **4 companions**, each with one `verified_match` highlight; `by_topology`
   carries none). `tests/test_viewer_crops.py` stays **73/73** green —
   `parts_list_row_rect` and `parts_list_row_for` are tested as pure functions
   and nothing asserts the builder calls them.

   1c. **The builder stops emitting the drawing link's text.** Same function,
   `"drawing_no": None` (lines 1607-1608). `VA.drawingLinkText`
   (`apps/viewer/viewer.js:1069`) then returns `null` on every entry and
   `VA.cropReference` falls back to *"open the drawing in drawing-checker"* —
   the wording the handoff existed to replace. Measured: **7** live entries in
   `by_stack` carry a `drawing_no`. The JS side is tested against a hand-built
   entry that carries the field; the Python side is not.

   For 1b and 1c, one wiring test through `crop_element` each, using the
   existing `fake_fitz` fixture (`tests/test_viewer_crops.py:713`) — the render
   path runs under it because `fitz` is imported lazily, which is exactly how
   `test_crop_element_crops_a_pile_citation_to_its_declared_region`
   (`tests/test_viewer_crops.py:747`) drives the whole thing. Assert the
   emitted entry's `companion.find_no` / `companion.label` and its
   `drawing_no`. Suggestion to investigate, not binding: the `FakePixmap` trick
   (`tests/test_viewer_crops.py:677`) reports a size derived from *which* rect
   rendered, which is how you tell the parts-list band apart from the sheet.

   1d. **The viewer stops fetching the companion image.**
   `apps/viewer/topology_app.js`, three sites: line 584 and line 643 (`if
   (entry.companion && entry.companion.png) pngs.push(entry.companion.png);`)
   and `cardPngs`' `entry.companion && entry.companion.png` term at line 666.
   Every balloon crop then renders `VA.CROP_IMAGE_MISSING_TEXT` ("This crop's
   image is not on disk — the crop index is out of date.",
   `apps/viewer/views/crop.js:187`) under the heading "Parts list, sheet 1".
   Fast tier 407/407, browser 20/20. The existing fast-tier companion tests
   pass their own `images` map in, so they structurally cannot see the fetcher.
   Wanted: a fast-tier assertion that the pane's fetch list names the companion
   PNG. Then declare all four.

2. **`highlights[]` has no live-data value guard.**
   (`ISSUE_20260916_crop_highlights_have_no_live_data_value_guard.md`.)
   `crops.json` gained `highlights[]` on 2026-09-15 and every rendered claim
   about *where on a crop to look* now rides on it. It is in no live-data
   guard: `apps/viewer/tests.js`'s `VALUE_GUARDS` (line 7485) has rows for
   `crop entry resolved_by`, `located_by` and `status` and none for
   `highlights[].kind` or for the array's presence. Every highlight assertion
   in the suite is fixture-tier, against entries the test itself builds
   (`datasheetEntry()`, `balloonEntry()`).

   The silent arm is this repo's twice-bitten shape (`VA.VERDICT_SCOPES`'
   missing loud fallback, `partMeshFact`'s absent `mesh` block) —
   `apps/viewer/viewer.js:1055`:

   ```js
   VA.cropHighlights = function (carrier) {
     var boxes = carrier && carrier.highlights;
     if (!boxes || !boxes.length) return [];
     return boxes.filter(function (box) {
       return box && box.frac && box.frac.length === 4;
     });
   };
   ```

   A builder that stopped writing `frac`, or wrote three numbers, or dropped
   `highlights` from the entry, makes **every overlay on every surface vanish**,
   and the page then reads as an honest *"nothing on this sheet was marked"* —
   correct for a whole-sheet crop, a lie for a datasheet crop, and no tier can
   tell them apart.

   Wanted: a `VALUE_GUARDS` row in the strong (`known: function`) form whose
   `values()` collector walks the live `highlights[].kind` **and** the
   `companion.highlights[]`, so the shared `[real] each value guard bites …
   and on finding no value at all` arm (line 7637, via
   `replayBlindCollectors`, line 7473) fires the day the collector comes back
   empty. Plus one `[real]` assertion that at least one live crop actually
   renders a box, so the whole overlay disappearing is red rather than quiet.
   Measured live values, so the row will not trip the empty-collector arm:
   `by_stack` has 28 `verified_match` and 16 `declared_region` highlights plus
   4 companion `verified_match`; `by_topology` has 2 and 1. Both members of
   `VA.CROP_HIGHLIGHT_KINDS` (`apps/viewer/viewer.js:1035`) are live.

   **One measured trap, not in the issue:** the existing collectors reach the
   live crops through `resolvedCrops(c)` → `cropEntriesIn(c)`
   (`apps/viewer/tests.js:7306`), which walks **`by_stack` only** — it never
   descends `by_topology`. Broadening `cropEntriesIn` would silently widen
   three existing rows' value sets, so do not do that as a side effect. Either
   give the new row its own collector over both maps, or broaden
   `cropEntriesIn` **deliberately**, re-run, and say in the lesson what new
   values the three existing rows then saw.

   The other direction is already covered and needs nothing:
   `tests/test_js_python_vocabulary.py`'s `CROP_HIGHLIGHT_KINDS` row pairs
   `VA.CROP_HIGHLIGHT_KINDS` against the importable `HIGHLIGHT_KINDS`, and
   `highlight()` refuses a kind outside it, so a *new word* cannot reach
   `crops.json` unannounced (verified in review: renaming the JS key reddens
   that row). This deliverable is only about the field going absent or
   malformed in live data.

3. **`VA.cropReference`'s `classPrefix` argument.**
   (`ISSUE_20260915_the_shared_crop_renderers_class_prefix_argument_is_unguarded_in_every_tier.md`.)
   `viewer_component_names_and_reference_copy` factored the crop reference, its
   links and its folded provenance into one builder, `VA.cropReference(box,
   entry, config, classPrefix)` (`apps/viewer/views/crop.js:145`). The prefix
   **carries its own separator** — `"croppop__"` (the default, taken by
   `VA.cropBlock` at `views/crop.js:44`, which serves both the popover and the
   hover cards) and `"detail__crop-"` (the stack pane, `views/detail.js:184`,
   and the topology preview pane, `views/topology.js:1795`). Four surfaces,
   three call sites, and it is the one argument with no natural shape to it.

   The handoff shipped exactly that bug once and caught it by eye:
   `views/detail.js` passed `"detail__crop"`, so the stack pane rendered
   `detail__crophead` and `detail__croplinks` and the block came out unstyled.
   Its own lesson says so (§7, *"the class prefixes are the part no test is
   watching"*), and the fix landed with nothing added to watch it. Replayed in
   review on 2026-09-15, one character removed from `views/detail.js`:

   ```
   -    VA.cropReference(box, entry, config, "detail__crop-");
   +    VA.cropReference(box, entry, config, "detail__crop");
   ```

   `node apps/viewer/run_tests.cjs --repo <scratch>` → **386/386 passed**;
   `node scripts/run_viewer_browser_tests.mjs --repo <scratch> --only "app
   file://"` → **33/33 passed**. Every assertion on that block reads
   `textContent`, which is right for copy and blind to this. `.croppop__head`
   is pinned by the browser tier; the `detail__crop-` prefix is pinned nowhere,
   on either pane.

   Wanted: assert the classes the shared builder actually produced, on each
   surface that calls it. In the fast tier, render the stack pane and the
   topology preview pane and require `div.detail__crop-head` and
   `div.detail__crop-links` to exist **and `div.detail__crophead` not to** —
   the negative half is what makes it bite on the exact one-character revert.
   One sub-check per surface, two selectors each. Then declare it (the
   `views/detail.js` line above is a clean unique `find`).

4. **The topology grid's "no tolerance recorded" badge.**
   (`ISSUE_20260915_the_grids_no_tolerance_badge_is_unguarded_in_every_tier.md`.)
   `viewer_study_verdicts_and_gaps` gave every affected grid row its own loud
   badge (`VA.edgeAttention`, `apps/viewer/topology.js:354-360`) and in the
   same change **removed** the `chip--zero-width` chip that used to mark those
   rows. The replacement is right; it has nothing standing on it. Measured by
   deleting

   ```js
   if (edge.zero_width) badges.push(badge("no_tolerance"));
   ```

   from `VA.edgeAttention`: `node apps/viewer/run_tests.cjs --repo
   C:\workspace\tolstack` → **367/367 passed**. The zero-width marking simply
   disappears from the grid, in every tier, silently.

   The sibling badge *is* pinned count for count: the `[real]` test "a row whose
   number has nothing behind it says so in the grid, in the words a reader
   brought with them" (`apps/viewer/tests.js:9112`) asserts
   `all(root, ".tvflag--unverified").length` equals the number of live edges
   for which `VA.needsAnnotation(e.confidence)` holds.
   `.tvflag--no_tolerance` has no such assertion.

   Wanted: the same count-for-count assertion for the other half, over a
   topology that actually has zero-width edges. **Correction to the issue,
   measured against the live projection on 2026-09-16 — take this over what the
   issue says:** the issue claims `pitch_link_to_pitch_plate` has 2 zero-width
   edges. It has **0**. The only live topology with any is
   `rotor_fastener_length`, with **2 of 12**. (`pitch_system`/`livePitch` has
   none, which is why the existing test could not simply be extended — see that
   handoff's lesson §3 on the two kinds not co-occurring.) So the new test
   needs its own handle: `VA.findTopology(realTopologies,
   "rotor_fastener_length")`, beside the existing `livePitch` and `liveL1` at
   `apps/viewer/tests.js:7955-7957`. Give it a fixture precondition of its own
   (`ok(zeroWidth.length >= 1, ...)`) so the day that topology loses its
   zero-width edges the test says so instead of passing vacuously. Then declare
   it — the `VA.edgeAttention` line above is a unique `find`.

5. **`navigate()`'s two unwitnessed contracts.**
   (`ISSUE_20260915_navigates_stale_worksheet_clear_and_sync_throw_door_are_unwitnessed.md`.)
   `viewer_nav_wedge_and_classic_retirement` contained the nav wedge in
   `apps/viewer/topology_app.js::navigate()` (line 451) and declared a mutation
   witness (`nav-click-never-wedges`, suite `no nav click wedges the page`) for
   the rejection arm — verified WITNESSED. The function states **three**
   contracts in its own comments and only that one is watched. Measured in
   review by mutating each line in a `git archive` copy and running all three
   tiers:

   | mutation | fast | `--repo` | browser |
   | --- | --- | --- | --- |
   | `}, navFailed);` → `});` (the declared one) | 308/308 | 382/382 | **14/14 → 11/14 FAIL** |
   | `state.error = null;` deleted (no recovery) | 308/308 | 382/382 | **11/14 FAIL** |
   | `state.worksheetText = null;` deleted in `navFailed` | 308/308 | 382/382 | **20/20 PASS** |
   | the `try` around `loadWorksheet()` removed | 308/308 | 382/382 | **20/20 PASS** |

   5a. **The stale-worksheet clear — the one that matters.** `navFailed`
   (`apps/viewer/topology_app.js:469`) clears `state.worksheetText` because, as
   its comment says, `loadWorksheet()` only *assigns* on success — so the
   previous node's markdown would otherwise still be in the dialog under this
   node's title. It is reachable and observable: `paint()` computes
   `hasWorksheet` from `sheet.worksheet_file` (the projection, not the text),
   so after a failed read on a subject that declares a sheet the toggle is
   still offered, and `apps/viewer/views/worksheet.js` renders
   `.worksheet__path` from the **new** subject and `.worksheet__body` from
   `state.worksheetText` — the **old** node's prose. The "could not be read
   from the connected folder" branch the line exists to reach is skipped
   entirely. Wanted, and it is cheap because the machinery is already there:
   in `testNavNeverWedges`' **pass 1** (`scripts/run_viewer_browser_tests.mjs`,
   the `for (const row of rows)` loop at ~line 2771, where
   `window.__WORKSHEETS_FAIL__` is true and every `readText` rejects), for a
   **reading** row (`row.reads`), open `#worksheet-dialog` and require the
   "could not be read" sentence, or an empty `.worksheet__body` — never a
   previous node's `<h1>`. Then declare it as a second
   `mutation_witnesses.json` entry on the same suite. That handoff's lesson §5
   explains why this suite's sub-check names are literal strings, which is what
   makes the `expect_red` copy trivial.

   5b. **The synchronous-throw door.** The comment justifies calling
   `loadWorksheet()` from *inside* the `try` with "an adapter whose `readText`
   throws before it ever returns one (a null adapter, an unready handle --
   `VA.requireReady` throws)". Two corrections from reading the adapters:
   `FsaAdapter.readText` and `HttpAdapter.readText` are `async`, so a
   `requireReady` throw there arrives as a **rejection**, not a synchronous
   throw — only `MemoryAdapter` (not `async`) and a null `adapter` can throw
   synchronously, and a null adapter returns from `boot()` before any nav row
   renders. So the guard is defensible defence-in-depth whose stated door is
   narrower than the comment claims, and no tier can reach it today. Pick ONE
   and say which in the lesson: either narrow the comment to the
   memory/node-fs adapters (a comment edit, no test), or add a fast-tier test
   that drives `navigate()` with a synchronously-throwing `readText`. If you
   add the test, it earns a witness like everything else. Lower priority than
   5a — do not let it eat 5a.

6. **`gaps[].kind` joins `TOPO_VALUE_GUARDS`.**
   (`ISSUE_20260915_the_new_gap_kind_field_has_no_topo_value_guard_row.md`.)
   `viewer_study_verdicts_and_gaps` added a per-topology `gaps` list to
   `data/projections/viewer/topologies.json`. Its `kind` is enumerated —
   `scripts/build_topology_projection.py:174::TOPOLOGY_GAP_KINDS`, four values
   (`excluded_from_model`, `hardware_entry`, `unverified_value`,
   `no_tolerance_recorded`) — and the page branches on all four (`VA.GAP_KINDS`,
   `apps/viewer/topology.js:485`, with a loud fallback,
   `VA.unlabelledGapKindText`). Every other enumerated field of that projection
   has a row in `apps/viewer/tests.js`'s `TOPO_VALUE_GUARDS` (line 9957), which
   sweeps the **live** projection and fails when a value on disk has no branch
   on the page. `kind` has no row.

   **Read this before you write it — the hole is narrow, and the issue is
   honest about why it is `low`.** Two things already cover the field:
   `tests/test_topology_projection.py:781`'s `JS_PAIRINGS` row pairs
   `VA.GAP_KINDS`' keys against `TOPOLOGY_GAP_KINDS` word for word (the
   *earlier* signal — it fires the moment Python's tuple changes, before any
   data moves), and a `[real]` test at `apps/viewer/tests.js:9001` ("every live
   gap row is one this page has words for, and every kind the builder writes is
   used somewhere") walks every live gap row and carries an anti-vacuity check
   that all four kinds have live rows. So this deliverable puts `kind` in the
   same sweep as its siblings, reported the same way, rather than in a test of
   its own — it does not close an open hole. Wanted: `known: function (v) {
   return !!VA.GAP_KINDS[v]; }`, the strong form, with a `values()` collector
   over `topoRows(p)`'s `gaps[]`. Measured live distribution, all four present,
   so the empty-collector arm will not trip: `pitch_link_to_pitch_plate` 18
   gaps, `pitch_system` 38, `rotor_fastener_length` 29 (the only source of
   `no_tolerance_recorded`, 2 rows), `tan_link_to_pitch_plate_take2` 11,
   `vpa_output_to_pitch_plate` 8.

   **Two traps.** First, `VALUE_GUARDS` (the *stack* projection's table, line
   7485) **already has a `gaps[].kind` row**, `inList(["excluded_from_model",
   "hardware_entry"])`, over a different projection with a different
   vocabulary. Do not merge them, do not "fix" the shorter list, and give your
   new row a `field` string that cannot be confused with it. Second,
   `TOPO_VALUE_GUARDS` ends with a `--- Deliberately NOT rows, and why ---`
   comment block naming `studies[].checks[].worst_confidence` and
   `studies[].error.type` and the reasoning for each. It is load-bearing
   documentation for the next person asking "is this field covered?" — read it,
   keep it, and if your work changes any of its claims, update it in place.
   The row still needs its witness: plant a `VA.GAP_KINDS` key rename (e.g.
   `no_tolerance_recorded` → `no_tolerance_recorded_x`) and confirm the
   `[real] no live topology value is one the page cannot render` check goes
   red, then revert.

7. **The `SUITES` label pass-through.**
   (`ISSUE_20260915_the_suites_label_pass_through_is_one_word_from_a_silent_revert.md`.)
   `mutation_witness_tier_repair` single-sourced the browser tier's suite
   labels — `scripts/run_viewer_browser_tests.mjs:4234`'s `SUITES` rows are now
   `[label, (label) => fn(..., label)]`, the four in-body `const label = "..."`
   copies are gone, and `testRespine` no longer derives `${label} respine` from
   an argument spelling a different string. One copy of each label in the file,
   nineteen… twenty-one rows today. **What replaced the hand copies is now one
   argument, and nothing observes it.** Measured in review, on the run loop at
   line 4282:

   ```
   -   for (const [label, runSuiteFn] of chosen) results.push(await runSuiteFn(label));
   +   for (const [label, runSuiteFn] of chosen) results.push(await runSuiteFn());

   node scripts/run_viewer_browser_tests.mjs --only "index redirect"
   [undefined] 2/2 sub-checks passed: PASS
   [undefined] 2/2 sub-checks passed: PASS
   2/2 browser checks passed (--only "index redirect")     # exit 0

   venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py
   10 passed in 0.07s
   ```

   Every tier stays green. What breaks is everything the printed label is
   *for*: the comment above `SUITES` says the key is the label it prints "so a
   filter can be copied straight off a failing line", and the mutation tier's
   `suite` fields are whole copies of those keys. `--only` filters on the
   registry key (line 4270) rather than the printed line, so even the mutation
   tier keeps working — the damage is silent by construction. The pytest
   pairing added by that handoff cannot see it: it compares
   `mutation_witnesses.json`'s `suite` values against the keys read out of the
   source, which is a different question from *does the suite print the key it
   was handed*.

   Wanted: the runtime check the originating issue proposed
   (`ISSUE_20260915_the_suites_registry_restates_every_label_it_dispatches_on.md`),
   which that handoff's lesson dismissed as comparing a string to itself — it
   isn't, once the copies are gone; it pairs the *returned* label against the
   key:

   ```js
   for (const [label, runSuiteFn] of chosen) {
     const result = await runSuiteFn(label);
     if (result.label !== label) {
       console.log(`    FAIL sub-check: suite ${JSON.stringify(label)} reported ` +
         `itself as ${JSON.stringify(result.label)} -- the registry key is the ` +
         `label a suite prints, and --only filters are copied off that line`);
       result.ok = false;
     }
     results.push(result);
   }
   ```

   Every suite already returns `{ label, ok }`, including the skip paths
   (verified: `testNavNeverWedges`' skip at line 2685 and `testRespine`'s at
   line 3655 both do), so this lands green today and fires on the one-word
   revert above. Then declare it: `find` the run loop line, `replace` it with
   the argument dropped. That entry is what makes it a standing witness rather
   than a check nobody has watched fail. **Fence:** the check goes in the run
   loop in `run_viewer_browser_tests.mjs`. Do not touch
   `scripts/run_mutation_witness_tests.mjs`.

8. **Answer the derivability question, in the lesson.** Three of this session's
   targets are named by name in
   `dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`
   as instances of one open question — *is a guard's coverage set being a
   hand-kept literal worth a mechanical detector, or is the honest answer a
   convention?* The brief's 2026-09-15 table lists `TOPO_VALUE_GUARDS`
   ("nine rows against a projection that branches on four more fields")
   as instance 3 and the `SUITES` registry as instance 2, and records the
   arrival rate as **flat across four sweeps** (6 → 8+ → 8 → 7). The brief is
   unconsumed; a real answer from hands-on work is worth more than another
   sweep.

   So, having actually added rows to `VALUE_GUARDS` (deliverable 2) and
   `TOPO_VALUE_GUARDS` (deliverable 6), the lesson must record, per registry
   and with reasons:

   - **Could the enumeration be derived** instead of hand-kept? Concretely: is
     there a mechanical source for "every field of this projection the page
     branches on" — the builder's module-level vocabulary tuples, the
     `VA.*_KINDS` tables, the `JS_PAIRINGS` list in
     `tests/test_topology_projection.py` — from which the row set could be
     generated, with the table asserting it covers all of them?
   - **If not, say what blocks it.** You will have read the `--- Deliberately
     NOT rows, and why ---` block; a derived enumeration has to express
     "deliberately excluded, for this reason" or it re-adds the two rows that
     block exists to keep out. Whether that is expressible is the crux, and a
     clear "no, because X" is a full answer.
   - **A cheaper middle option, if one exists**: e.g. the table asserting its
     own size against a count derived from somewhere, or a test that lists the
     projection's enumerated fields and requires each to be either a row or a
     named exclusion. Say whether you'd build it and what it would cost.
   - **Whether deliverable 7's `SUITES` case is the same question or a
     different one.** The brief warns its two instances "may legitimately
     resolve differently"; deliverable 7 is a *pass-through* check rather than
     a coverage-set size check, and if that turns out to be the general answer
     for registries of this shape, that is the most useful sentence you can
     write.

## Definition of done

- Every deliverable's named mutation has been **planted, observed reddening,
  and reverted**, with the failing sub-check line quoted verbatim in the
  lesson. A deliverable whose mutation was not observed failing is reported as
  NOT done, whatever the code looks like. This is the whole point of the
  session.
- `venv-win/Scripts/python.exe -m pytest -q` green, at **1155 passed** plus the
  new Python tests from deliverables 1b/1c. If the count moves for any other
  reason, say why in the lesson.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` green, and
  `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`
  green (the `--repo` flag is mandatory from a worktree: `data/` and therefore
  `data/projections/viewer/` exist only in the main checkout at
  `C:\workspace\tolstack\data\`, and without it the node-fs tier reports itself
  skipped and every `[real]` check above silently does not run). Record the
  before and after counts for both; the 2026-09-16 baseline measured
  **407/407** fast and **20/20** browser.
- `venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py`
  green — every new `find` resolves to exactly one place in the file it names.
- `node scripts/run_mutation_witness_tests.mjs` (read-only for you; you may run
  it, you may not edit it) reports every entry you added as WITNESSED, not
  MISS. Any MISS means the entry is wrong or the mutation is too broad —
  narrow it, per `mutation_witnesses.json`'s "ONE THING AN ENTRY CANNOT
  DECLARE".
- `data/projections/viewer/` is **not** rebuilt by this session. Deliverables
  1b/1c change `scripts/build_viewer_crops.py` only under a test's `fake_fitz`
  stand-in; if you find yourself wanting a rebuild, stop and say why in the
  lesson instead.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_viewer_unwitnessed_surface_guards.md`):
  deliverable 8's derivability answer in full, since that is a strategy input
  and not derivable from the diff; the verbatim `expect_red` line for each
  witness and any case where the obvious mutation had to be narrowed before it
  named a check; whether broadening `cropEntriesIn` past `by_stack`
  (deliverable 2) was taken or avoided and what the three existing rows then
  saw; which branch of deliverable 5b was chosen and why; and — since the
  measured facts in these issues did not all survive contact — any further
  correction to an issue's stated evidence, in the shape of deliverable 4's
  (`pitch_link_to_pitch_plate` has 0 zero-width edges, not 2). Also record any
  of the seven guards that turned out to be *already* witnessed by something
  nobody had noticed, which would be the cheapest possible outcome and worth
  saying plainly.
