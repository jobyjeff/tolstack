# tolstack — stack viewer (`apps/viewer/`)

**Review a stack without opening a `.json`.** Elements, folds, checks with
verdicts, notes and gaps for every stack in `docs/tolerance_stacks/`, coloured by
where each value came from, with the drawing region behind a citation one hover
away.

Static and build-free — plain HTML + classic scripts, no framework, no npm
build, no daemon, no server (the forge `apps/notes/` and `apps/dashboard/`
pattern). **Read-only**: the File System Access grant it asks for is
`mode: "read"`, and there is no code path that writes.

## Launch (one-click, `file://`)

**Double-click `apps/viewer/index.html`.** Classic scripts exist precisely so
this works with no server. For a desktop shortcut, run from the repo root:

```powershell
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Tolstack Viewer.lnk")
$sc.TargetPath = "$PWD\apps\viewer\index.html"
$sc.Save()
```

## First use

```powershell
# 1. build what the viewer renders (fast, stdlib only)
venv-win\Scripts\python.exe scripts\build_viewer_projection.py

# 2. build the drawing crops (needs PyMuPDF -> drawing-checker's venv)
C:\workspace\drawing-checker\venv-win\Scripts\python.exe scripts\build_viewer_crops.py
```

3. Open the page, click **Connect folder**, pick the **tolstack repo root**
   (`C:\workspace\tolstack`), grant **read**. The banner turns into a build line:
   *results built … · crops built … (26 resolved — 22 sha256-verified, 4 with no
   sha to check; 22 unresolvable)*, then *crops by rule: source_ref_export 22 ·
   spec_pile 4*. A resolved count on its own says nothing about whether anything
   was **checked**, which is the whole difference between a crop of the export a
   citation names and a crop of a file that happens to share its name — so the
   verification counts sit beside it, out of `crops.json`'s own `summary`.

Both steps are **wipe-and-rebuild** and each owns its own files, so either can
be re-run alone. Re-run step 1 after editing a stack JSON; re-run step 2 after a
new drawing export lands. The banner says when each was built **and which tree
built it** — the viewer never guesses whether a projection is stale, it reports
what the two stamps say and lets you judge.

### If a build refuses (exit 3)

`data/projections/viewer/` is **one directory shared by every live worktree**, so
since 2026-08-10 both builders stamp their own branch and HEAD sha into their
output and **refuse** to overwrite a projection built from a commit this tree
does not contain (`scripts/projection_provenance.py`, and
`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`,
which happened three times). The refusal names the other tree's branch, sha and
filesystem path and says what to run; the fix is normally *rebuild from that
tree instead*, or merge it in here first. `--allow-older-tree` overrides it,
loudly, for the one legitimate case — a deliberate rebuild from an older tree.

No folder grant handy? `index.html?mock=1` renders a seeded demo stack that
exercises every provenance state. Nothing touches disk.

## The one rule: the viewer computes nothing

`tolerance_stack.fold()` is the only arithmetic in this repo — *"there is exactly
one line where a sign can be wrong"* (`ARCHITECTURE.md`). A second fold written
in JavaScript would be a second such line, so there isn't one:

- every interval and every verdict is read out of `results.json`, which
  `scripts/build_viewer_projection.py` produced by calling `fold()`;
- element `nominal`/`min`/`max`/`lmc`/`mmc` are printed **as transcribed** —
  `String(n)`, no `toFixed`, no unit conversion, no band derived from limits;
- even the rounding happens in Python (fold outputs are rounded to 6 dp, term
  coefficients to 9 dp, at build time) so the browser is never the thing deciding
  how a number reads.

`tests/test_viewer_projection.py` pins the embedded stack as byte-identical to
the authored file, and re-asserts the ground-truth numbers *through* the
projection.

### Generated checks are generated in Python too

Some archetypes do not author their checks: a `thermal_fit` stack ships an empty
`checks` array on purpose, and `tolerance_stack.thermal` builds the term lists
from its own block at load time so the file cannot carry a stale coefficient. The
projection dispatches on the stack's `archetype` and runs that loader
(`ARCHETYPE_LOADERS` in `build_viewer_projection.py`) — so the checks are
generated **once, in Python, by the same code the tests pin**, and the viewer
renders them like any other. There is no archetype logic in JS.

Their terms carry real **coefficients** — `2` because a sleeve OD is bore + 2 ×
wall, a soak factor `1 + ΔT·α` per member per temperature, and a `k` / `1−k`
stiffness split — so every weighted term prints its weight
(`+ 2.0010712 × sleeve_wall_lower`). A weighted term rendered as a bare
`+ sleeve_wall` would look readable and be wrong by a factor of two, which is
worse than rendering nothing at all. The identical term table prints outside the
browser with:

```powershell
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --terms --markdown
```

A stack declaring an archetype the projection has **no** loader for still renders
zero checks — and says exactly that, rather than "no checks".

## Reading the colours

Provenance is the only saturated colour on the page; everything else is grey.

| | meaning |
|---|---|
| green `traced` | the value comes off the cited document |
| amber `inferred` | a reading or an argument sits between the document and the value |
| **filled red `UNTRACED`** | no document backs it. Filled, plus a row tint — an untraced value has to survive being skimmed |
| **filled magenta `NO CITATION`** | worse than untraced: no `source_ref` at all |
| **filled magenta `EXPORT UNESTABLISHED`** | the citation exists and the stack says outright that the *bytes* behind the value cannot be identified. A separate axis from confidence: an `inferred` citation can have a nailed-down export and a `traced` one can have none. See below |
| **filled magenta `CTE NOT TRANSCRIBED`** | a material whose `values_status` says nobody has read the CTE off a source |
| dashed blue `zero-width band` | `min == max`; no document gives a tolerance, so every interval it feeds is a **lower bound** on the real spread. A separate axis from confidence, not a fourth confidence |
| striped card + amber `BUDGET` | the check's `verdict_scope` is `budget`: a term is missing from the model, so read the magnitude as a budget for the missing term, never as a verdict on the joint — a `fail` here is true of the model and false of the hardware. The missing terms are printed on the card, directly under the numbers they are a budget for. Read off the schema (`complete: false` + `excluded_terms`) since 2026-08-13, never off the prose |
| dashed card + amber `NOT A RESULT` | a `[SENSITIVITY]` probe: the same check with an undocumented input moved, so you can see how much of the answer rests on it. Its verdict is about that hypothetical, not about the joint |
| blue `checks GENERATED` | the term lists are not in the stack JSON — the archetype's loader built them (see above) |
| monospaced weighted chip | a term whose coefficient is not 1: `+ 2.0010712 × sleeve_wall_lower`. Hover says what a coefficient can be |

A path or check also shows the **weakest** confidence among its expanded inputs:
a check fed by four traced elements and one untraced one is an untraced result.

## Which bytes the number was read off

A citation says *where on a page* a value is written. `source_ref.export` says
*which file that page was in* — and the two are not the same claim, because
filenames get re-exported over, so a drawing number and a revision do not
identify bytes. Every element's sourcing cell carries the export block beneath
its citation:

| state | what the block says |
|---|---|
| `established` | *export established: `X.pdf`* · **sha256 recorded** (first 12) · the drawing-checker runs that consumed it, or *no run has consumed this export*. The sha **is** the identity; runs are corroboration, and 15 of the 22 live established *citations* have none — 6 of the 9 distinct exports they name. |
| `unestablished` | **filled magenta, on the row and on the block**: *EXPORT UNESTABLISHED — which file this value was read off cannot be identified*, with the recorded `why` unclamped beneath it. The stack is stating outright that the bytes behind this number are unrecoverable. |
| no `export` key | *no export block — this citation names no exported file, so nothing here identifies the bytes the value was read off*. Stated, not alarmed: 22 of the 48 live citations are here — 21 workbook, 1 assumed — and for a spreadsheet or an assumed value there is no exported PDF to name. |
| no `export` key, `identity_rule: "spec_pile_filename"` | *Spec-pile document: identity by filename (append-only pile)*, with the argument beneath it. The **deliberate exception** — see below. 4 live citations, all `traced`. |
| anything else | loud: *export status `"X"`, which this viewer has no branch for*. `VA.EXPORT_STATUSES` is a table for the same reason `VA.CROP_RULES` is — an enumerated field needs a total function, because a silent default cannot be told from a handled case by reading the code. An identity rule the viewer has no branch for is loud the same way, through `VA.IDENTITY_RULES`. |

### The spec-pile exception

`data/inbox/specs/` is **append-only**: nothing there is renamed, deduplicated or
re-exported over, so for a document in the pile the **filename identifies the
bytes** and there is no export to name. `SourceRef.export` says exactly that —
mandatory for `drawing`/`parts_list`, optional for `spec`.

Four citations are `traced` in that state, and until 2026-08-13 the rule that
makes the pair legitimate was statable only inside a **crop entry**
(`resolved_by: "spec_pile"`), one hop from the row a reader is looking at — so
the row read `traced` beside "nothing here identifies the bytes" and both halves
were true (`ISSUE_20260812_four_traced_spec_citations_carry_no_export_block`;
second sighting of "a fact about the citation reachable only through a crop").

`build_viewer_projection.py` now hoists it: a citation of `kind: "spec"` that
names no export gets a **derived** `identity_rule: "spec_pile_filename"` on its
`elements[]` row, and the viewer renders the sentence in place of the no-export
one. Nothing is authored and no vocabulary widened — `export.status` is still two
values and the four citations still carry no export block, which is the 2026-08-06
position (*a drawing number plus a revision does not identify bytes*) left intact.
An `export` block still wins wherever there is one: three live `spec` citations
carry one and are unaffected.

The rule itself is on the page, not only here: **"How to read the sourcing
column"**, the collapsed legend above the elements table.

Two deliberate limits:

* the block says a sha is **recorded**, never *verified*. The viewer cannot hash a
  file, so that is the only honest claim available to it; `sha256 VERIFIED`
  belongs to the crop hover below, where a script really did compare bytes.
* a run id is a **link** only where the element's own crop resolved through that
  run. An export carries a run *id* (`20260803_145243`); drawing-checker addresses
  a run by its *directory* name (the id plus the drawing), which only the crop
  entry knows. Every other id prints as plain text with a hover saying why —
  building a URL from a prefix would be a guess, which is the class of mistake
  this whole surface exists against.

The export block renders whether or not a crop resolved, which is the point: until
2026-08-12 these facts appeared **only** in the crop popover, so a citation whose
crop could not be pinned said nothing at all about its export — a fact about a
*citation* reachable only through a *crop*
(`ISSUE_20260811_viewer_shows_nothing_for_source_ref_export`).

## Materials — the provenance of a *number*

A stack whose archetype has **material properties** also gets a Materials table:
the `materials.json` entry verbatim (designation, CTE, the range it is a mean
over) beside its own sourcing — and the CTEs are the least-traced numbers in this
repo, so the table speaks the same colour language as the elements table. A
thermal fit's answer is a CTE *difference*, and the soak factor in a term's
coefficient is `1 + ΔT·α` from that table with the ΔT on the check card.

A material's *name* and its *number* have different provenance, and the sourcing
cell keeps them apart:

* **`values_status`** — what kind of record the CTE column is. `inline`: the
  number is the record. `library`: it is a **cross-check** of the projection named
  in `library_ref`, not the record. `not_transcribed`: **filled magenta** — nobody
  read it off anything and the value is a placeholder the schema requires. All
  three rendered identically until 2026-08-12.
* **`library_ref`** — printed whenever it is set, *whatever the status says*:
  `spec_library:NAS6403U11D` is the provenance of a number, and reading the field
  only under `values_status: "library"` would be the same silent drop one field
  along. `library` with **no** `library_ref` is a self-contradiction the schema
  permits, so the viewer says so loudly.
* **the two temperature ranges, paired** — the range the source *quoted* the mean
  over, and the ranges this stack *applies* it over (`applied_over_c`, in accent
  blue beneath it). A mean CTE quoted over 20…100 °C and applied over 20…−20 °C is
  the quiet way a thermal answer goes wrong. The viewer prints both and compares
  neither: deciding whether one covers the other is arithmetic, and arithmetic
  happens in Python.
* **`designation_source`** — where the *name* came from, with its callout and
  note. Its confidence chip has been on the row since the table shipped; where the
  name came from had not.
* **`cindas_request`** — the outstanding ask for a real value, clamped, where the
  entry records one. A CTE traced to nothing whose recorded next step is invisible
  is the same defect one layer down.

## Hover crops

Each element has a **drawing crop** button. Hover, focus or click it (✕, `Esc`
or an outside click closes it). The popover shows the pre-rendered crop, *how it
was placed*, and click-throughs: the drawing-checker run page when a run is
behind the citation (needs `cmd /c serve.bat` in that repo — see
`config.js`), plus the source PDF as a `file://` link and as a copyable path.

`crops.json` reports four different answers and the difference matters:

| status | what it means |
|---|---|
| `resolved` | there's a crop |
| `unresolvable` | the citation could not be pinned to a page **without guessing** — a finding about the stack, with the reason |
| `not-built` | nobody has run `build_viewer_crops.py` — a chore, and the popover shows the command |
| `no-entry` | `crops.json` predates this element, i.e. it's stale |

A resolved popover then says **which rule** pinned the document and **whether
the bytes were verified** — a crop of a *guessed* export looks perfectly correct
on screen, so this is the fact the hover exists for:

| `resolved_by` | what the popover says |
|---|---|
| `source_ref_export` | *read from the export this citation names, `X.pdf` — sha256 VERIFIED*. The rule every export-resolved crop in the repo uses; the sha is mandatory under it, so a crop can only exist if the bytes matched. |
| `spec_pile` | *from `data/inbox/specs/` by filename — no sha256 to verify*. The pile is append-only, so a filename **is** the identity; there is no sha to check and the line says so rather than implying one passed. |
| `joint_export_run` | *LEGACY RULE: export pinned by the joint block, not by this citation*. Still in the crop script for a stack written before 2026-08-06 (no `source_ref.export`, `document` == `joint.assembly_drawing`, and a `joint.assembly_export` naming a drawing-checker run). No stack in the repo reaches it today. |
| anything else | *resolved by `"X"`, a rule this viewer has no label for* — loud, and `VA.unlabelledCropRules()` puts it in the banner too. `provenance.sources_used`, deleted from the crop script on 2026-08-06, gets exactly this treatment: a branch for a value nothing can carry reads as "this case is handled". |

Placement, in order: the **cited printed zone** (padded a cell) when the sheet's
border grid is legible; else a **unique callout-text match**; else the **whole
sheet**, saying why. When a zone is cropped, the popover also says whether the
callout's own text was found inside that cell — corroboration, not a
requirement (a parts-list nomenclature is cited at the balloon and lives on the
parts-list sheet).

## Worksheets

`WORKSHEET_*.md` is authored prose, so it is read **live** from
`docs/tolerance_stacks/` rather than copied into the projection: edit the
markdown, reload, see it. Rendered with the dependency-free markdown renderer
vendored from forge's notes app (escape-first, no sanitize pass). A stack with no
worksheet of its own says so instead of borrowing a neighbour's.

Which sheet belongs to a stack is decided by the projection, two rules deep: a
`provenance.worksheet` in the stack file wins (one worksheet legitimately covers
several stacks — `WORKSHEET_hub_bearing_thermal_fit.md` covers both thermal
configurations, which are one analysis), otherwise `stack_X.json` →
`WORKSHEET_X.md`. The pane says when the sheet was *declared* rather than matched,
so a name that does not match the stack is explained instead of suspicious.

## Tests

Two tiers (forge `CONVENTIONS.md` §7):

```powershell
node apps\viewer\run_tests.cjs                          # fast tier (node + DOM shim)
node apps\viewer\run_tests.cjs --repo C:\workspace\tolstack   # ...from a worktree
venv-win\Scripts\python.exe -m pytest -q                # runs the fast tier too

npm install                                             # once: playwright-core, no browser download
node scripts\run_viewer_browser_tests.mjs               # truth tier (installed Chrome, file:// + http)
```

The fast tier includes a **node-fs adapter** tier that drives the real
`data/projections/viewer/` through the same adapter contract the browser uses, so
"Jeff's actual stacks render" is asserted rather than assumed. It reports itself
skipped when the projection isn't there (e.g. from a worktree, where `data/`
lives only in the main checkout) rather than failing.

That tier also carries the two guards that keep `fixtures.js` honest, and they are
the reason a builder change can fail a *viewer* test (2026-08-12):

* `[real] every fixture shape still matches the builder's` compares the key union
  of each shape in `fixtures.js` against the live projection's. **If you add a
  field in `scripts/build_viewer_projection.py` or `build_viewer_crops.py`, add it
  to `fixtures.js` too** — the failure names the shape and the keys.
* `[real] no live value is one the viewer has no branch for` asks, per enumerated
  field, whether the live data holds a value the viewer cannot render. That is the
  half a key-set diff cannot do: the bug it exists for was a stale *value* in a
  field that was present and correctly named.

Both run only when the node-fs tier runs, i.e. only with `--repo`.

The truth tier is not optional theatre: it caught a NodeList-vs-array divergence
between the shim and real Chrome, and a hover popover that closed itself the
instant it opened.

**Not automatable:** the FSA directory picker needs a user gesture, so the
`Connect folder` path is verified by hand, not by Playwright — the same
limitation forge's notes app records.

## Layout

```
apps/viewer/
  index.html          shell + the whole stylesheet (the colour system lives here)
  test.html           browser test page; publishes window.__TEST_RESULTS__
  config.js           paths, the drawing-checker webui base, rebuild commands
  viewer.js           pure view-model logic — no DOM, no IO, no arithmetic
  fixtures.js         the ?mock=1 demo projection (every provenance state)
  app.js              boot + wiring; the only place views and adapters meet
  storage/adapter.js  the read-only adapter contract
  storage/fsa.js      File System Access (mode: read), handle persisted in IndexedDB
  storage/memory.js   in-memory mock (?mock=1, tests)
  storage/node_fs.js  real-checkout adapter for the node test tier
  views/              dom, banner, list, stack, crop, worksheet
  vendor/markdown.js  vendored from forge apps/notes (namespace changed only)
  run_tests.cjs       fast-tier runner (node vm + DOM shim)
```
