# LESSONS 2026-08-12 — viewer_export_and_material_provenance

Handoff: `HANDOFF_20260812_viewer_export_and_material_provenance.md`.
Issue: `ISSUE_20260811_viewer_shows_nothing_for_source_ref_export.md`.
Baseline: trunk with `viewer_fixture_shape_guards` merged (`e36fe78`).
Suites, in **this worktree** with `--repo C:/workspace/tolstack`: **JS 118/118**
(was 98/98), **Python 350 passed / 1 skipped**, **browser 4/4 checks — 91/91
suite + 20/20 app sub-checks** (was 16/16).

## The handoff's premise is half wrong, and the correction is the finding

The handoff says the `unestablished` case is the sharp one and asks for it to be
demonstrated **"against one of the 22 unresolvable citations"**. Those are two
different sets, and neither contains the other:

| citations | 48 |
|---|---|
| `export.status: "established"` | **22** — and all 22 resolve a crop by `source_ref_export` |
| **no `export` key at all** | **26** — 4 resolve by `spec_pile`, **22 are the unresolvable ones** |
| `export.status: "unestablished"` | **0. Nothing in the repo is in this state.** |

So the 22 citations the handoff's asymmetry argument is about do **not** carry an
unestablished export with a recorded `why` — they carry **no export block**, and
their unresolvable reason is "the source is a spreadsheet, not a drawing or spec
PDF" (21) or "the value is assumed" (1). The `why` the handoff expected a reader
to be able to reach does not exist for any of them.

That makes **"names no export" a third state the handoff did not ask for and the
majority of the live data**, so it is rendered too. Its treatment is deliberately
*not* loud: for a workbook or assumed source there is no exported PDF to name, and
a filled magenta block on 22 of 48 rows is an alarm a reader learns to ignore. The
state is stated in plain prose instead.

**The genuinely interesting rows this turned up are the four `traced` `spec`
citations with no export block** —
`tan_link_to_pitch_plate:fastener_grip_13` and `_14`,
`tan_link_to_pitch_plate_take2:fastener_grip_13`,
`vpa_output_to_pitch_plate:fastener_grip`. Their crops resolve by `spec_pile`
(filename identity in an append-only pile), so nothing is *wrong*, but they are
the citations where "the row says traced and nothing identifies the bytes" is true
today. Worth a look; not a defect I could establish from the viewer.

### The unestablished demonstration, and how it is honest

Since no live citation is unestablished, the demonstration is a poisoned copy —
the same technique `viewer_fixture_shape_guards` used to prove its value guard
bites. `[real] an unestablished export on a real citation is loud, with its why`
takes `realCrops.unresolved[0]` — **`hub_bearing_thermal_fit_m1:hub_bore_lower`**,
a real unresolvable citation — gives it the export block the schema would carry if
someone had been through it, renders the real stack, and asserts the loud block,
the unclamped `why`, the row chip, **and that the element's crop is still
`unresolvable`**. That last assertion is the whole point: the reader learns it
without a crop. The fixture tier covers the same path on the washer, whose crop
*is* unresolvable for exactly this reason.

## Deliverable 2 — where `note` goes: inline, clamped, click to expand

Chosen: the **same treatment the citation's own `source_ref.note` already gets** —
clamped to ~4.6em, click to expand, full text as the tooltip — under its own class
(`el-export__note`, sharing one CSS rule with `el-row__srcnote`).

Why not hover-only, which was the cheapest option: an export note is up to **684
characters** live (the longest is `bearing_od_lower`'s, which explains that the
value was read straight off a repo-local copy and that `runs` is empty *by fact,
not by omission*). A hover cannot be printed, cannot be `Ctrl-F`'d, and does not
exist on touch — and the repo had already decided this class of prose gets the
clamp treatment when the citation note shipped. Reusing it means one behaviour to
learn and no new CSS.

Why the note is clamped but the **`why` is not**: they are different things. The
note is the argument for a claim that already reads clearly (an established
export names its file and its sha). The `why` is the *entire content* of the
unestablished state — and it was reachable only through a crop popover before
today, so putting it behind a second click would reproduce the exact defect one
notch down. `.el-export__why` is unclamped and unhidden by design.

## The answer to the question the handoff asks for: **yes, from the row alone**

A reader can now tell an unestablished citation from an established one **without
opening or hovering anything**: a filled magenta `EXPORT UNESTABLISHED` chip sits
beside the confidence chip in the sourcing cell, which is part of the element row,
and the block beneath it is tinted and magenta-spined. Verified in a real browser
on the computed style, not on the class name (`npm run test:browser`, four new
sub-checks) — because "impossible to miss" is a CSS claim and a class-name check
passes straight through a stylesheet typo.

Two honest limits on that answer:

* **Only the two *unidentifiable* states get a chip** — `unestablished` and a
  status the viewer has no branch for. `established` and "no export block" are 48
  of the 48 live citations between them, and a chip on every row is a chip nobody
  reads. Those two are legible from the **cell**, one line down, not from a chip.
* **`EXPORT UNESTABLISHED` is a separate axis from confidence and the README now
  says so.** An `inferred` citation can have a nailed-down export (4 live
  `parts_list` ones do) and a `traced` one can have none (the 4 spec citations
  above). Anyone reading the chip row as a single ranking will get this wrong.

## Design decisions the handoff left open

* **"sha256 recorded", never "verified".** The crop hover says `sha256 VERIFIED`
  because `build_viewer_crops.py` really re-hashed the file. The viewer cannot
  hash anything, so the only claim it may make is that the stack *wrote a sha
  down* — `VA.exportShaText` prints `sha256 recorded (c6381f204582…)`. A test
  asserts the string `VERIFIED` never appears in an export line. Collapsing
  "recorded" into "verified" would be the same bug `VA.cropShaText` exists to
  prevent, one layer up.
* **A run id is linked only where a crop entry supplies the run directory.** This
  is where the handoff's "reuse that link treatment" runs out, and the reason is
  worth carrying: an export's `runs[]` carries a run **id**
  (`20260803_145243`); drawing-checker addresses a run by its **directory** name
  (`20260803_145243_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER`), which is the id
  plus the drawing. `build_viewer_crops.py` resolves that by *scanning the runs
  dir for a directory starting with the id* — something the viewer cannot do. So
  `VA.exportRunLinks` links the one id the element's crop entry resolved through
  (reusing `VA.runUrl` verbatim) and prints every other id as dotted-underlined
  text with a hover explaining why. **In practice that means one link per export
  at most**, because the crop script only ever tries `runs[0]`: of the five run
  ids across the two multi-run live exports, two are linked.
* **`library` with no `library_ref` is loud.** `thermal.py` validates
  `values_status` against a three-value list and validates the pair no further, so
  an entry can say "this CTE resolves through the spec library" and name nothing.
  `VA.VALUES_STATUSES[...].loud` is therefore a **function of the entry**, not a
  constant. No live or fixture entry is in that state; it is covered inline.
* **`library_ref` renders whatever the status says.** Reading it only under
  `values_status: "library"` would have been the same silent drop this handoff
  exists to end, one field along — and nothing in the schema forbids an `inline`
  entry from carrying one.
* **`cindas_request` is rendered, and it is one field wider than deliverable 3
  asked for.** Deliverable 3 names five fields; the dependency's lesson lists six,
  `cindas_request` among them, as "reaching the projection and stopping there".
  Rendering five of six siblings in the same cell would have filed the next issue
  itself. Clamped and labelled, because it describes future work rather than the
  present record.
* **`class` was already rendered** — deliverable 3 lists it as rendered nowhere,
  but `materialsSection` has printed it in the `specification · condition · class`
  detail line since the materials table shipped. `grep class apps/viewer` drowns
  in CSS, which is presumably how the audit missed it. Nothing to do.

## Things the next agent would otherwise rediscover

* **The two `known: NONE` value guards are now the strong asked-table form.**
  `source_ref.export.status` → `!!VA.EXPORT_STATUSES[v]`,
  `materials[].material.values_status` → `!!VA.VALUES_STATUSES[v]`, with the
  `branch:` notes rewritten as the dependency's lesson said they should be. Both
  **confirmed rather than assumed**, per deliverable 4: a copy of the live
  projection with one export status set to `"provisional"` and one `values_status`
  to `"estimated"` fails `[real] no live value is one the viewer has no branch
  for` naming both fields and both tables. Teaching the viewer a value now teaches
  the guard for free.
* **`VA.VALUES_STATUSES` holds a state no data has: `library`.** Unlike the
  deleted `provenance.sources_used` crop rule, this one is not a branch for an
  impossible value — `thermal.py` accepts it today and `spec_library.py` exists to
  be resolved through. Keep it.
* **I did not rebuild the projection.** `built_at` is
  `2026-08-12T22:51:46+00:00`, from `master`, and every field this handoff reads
  was already in it. Unchanged before and after.
* **The `--repo` forward-slash trap is still live** and cost me nothing only
  because the previous lesson warned about it: `--repo C:/workspace/tolstack`, not
  backslashes, or the node-fs tier silently *skips* and the headline reads 98/98
  while the whole real-data tier never runs. Exit code is 0 either way.
* **`npm install` in the worktree** before `npm run test:browser` (`node_modules`
  is gitignored, so a fresh worktree has none). One package, no browser download.
* **I edited the wrong tree twice.** The handoff cites `data/` paths in the main
  checkout, I read the *source* files by absolute main-checkout path out of the
  same habit, and four tracked files landed as uncommitted dirt on `master` in
  `C:\workspace\tolstack` instead of on this branch. Recovered by verifying the
  blobs were byte-identical at both HEADs (`git hash-object` vs `git rev-parse
  HEAD:<path>`), copying main → worktree, then `git checkout --` the four paths in
  main. **The tell is that `git status` in your worktree comes back clean after an
  edit** — if you just changed a file and the worktree is clean, you changed
  someone else's tree. Note the main checkout has a *pre-existing* uncommitted
  `apps/viewer/README.md` revert plus a `README.md.backup`, neither of them mine;
  I left both alone.

## Left for the next agent

* **`values_status` is enumerated in `thermal.py` and pinned in `tests.js` twice
  over, but no test asserts the three spellings agree between Python and JS.** The
  JS table is a hand-copy of the Python tuple. Same for
  `SourceExport`'s two statuses. A cross-language vocabulary test would close a
  class of drift the current guards only catch once live data moves.
* **The four `traced` `spec` citations with no export block** (named above). Either
  they should carry an export block naming the spec-pile PDF and its sha, or the
  spec pile's filename-identity rule should be statable *on the citation* rather
  than only inside the crop entry. Today the row says `traced` and the export line
  says nothing identifies the bytes, which is accurate but reads as a gap.
* **`sha256_verified: false` and `export.status: "unestablished"` are both
  live-instance-free**, so their wording is pinned only by fixtures and poisoned
  copies. Read them on screen the first time real data produces one.
