# LESSONS 2026-11-19 — the_viewer_says_nothing_about_itself

Handoff: `docs/sessions/active/HANDOFF_20261119_the_viewer_says_nothing_about_itself.md`
(link 6 of the chain). Rule: **a page never describes itself** — no
always-visible sentence says what the page is, what mode it is in, what it
does or does not compute, or how to use it.

## How the strings were found

Two passes, and the screen was the authority.

1. **The source.** A scratch scan pulled every string literal of three words
   or more out of `apps/viewer/` and `apps/annotate/` (about 420 in the viewer
   and 220 in the pane). Most are data facts, hovers, command errors or test
   names. It gave the candidate list.
2. **The screen.** `tests/debug_self_description_20261120.mjs` opens every
   state a reader can reach and prints every visible element whose own text
   is four words or more. The states: each model with no study, a study
   picked (from the nav, and after the change from the picker), a node, a
   branch node and an edge in the Preview, the legend and the worksheet
   dialogs, the kinematic page, both loose stacks with and without a row, the
   3D pane idle, with a study, with a feature armed and with its Help open,
   the page with no data, and `?mock=1`. It ran once before the change and
   once after (`--phase before|after`), and the two copy lists were diffed.
   That diff is how "everything targeted is gone, and nothing new appeared"
   was checked, state by state.

Shots: `shots/the_viewer_says_nothing_about_itself/before_*.png` and
`after_*.png`, the same 20 states each, plus `after_v1_study_via_picker.png`.
All were read before this lesson was written.

## The table

"Always" means always visible in that state. "Fold" means behind a
disclosure, a dialog or a hover.

| # | String (start) | Where | Shown | What became of it |
|---|---|---|---|---|
| 1 | "read-only · renders the built projections · computes nothing" | `topology.html` topbar | always, every page | **Removed** (Jeff's first example). The `.topbar .sub` rule went with it. |
| 2 | "Pick a study to see its chain in the grid and its totals here. A study is a HUMAN-lassoed chain: this page reports where the forks are and never chooses one." | `views/topology.js`, results pane, no study | always | **Now the control**: a `<select>` whose placeholder reads *Pick a study* (`VA.STUDY_PICKER_PLACEHOLDER`) over the model's studies. Choosing one selects it, as the nav row does. A model with no studies (v2) shows no picker. (Jeff's second example.) |
| 3 | "Point at a part, a pin, a line or a row to preview it here; click to keep it." | `views/topology.js`, empty Preview | always, every page with nothing selected | **Removed**. The Preview is empty under its heading. `VA.PREVIEW_EMPTY_TEXT` is gone. |
| 4 | "An interface is a location, not a value — there is no dimension and no crop behind it. The dimensions are the edges either side of this row." | Preview, any node | always | **Removed** (a negation about what the pane does not show). |
| 5 | "A component boundary: the grid starts another part's rows here." / "An internal interface: every dimension meeting here belongs to one part." | Preview, any node | always | **Removed**. The sides line above it (`on A ⇔ B`, or one part) already says it. The rest was how to read the grid. |
| 6 | "Its crop appears here once this number cites a drawing." / "…once the stack's element cites a drawing." / "Its value is an assumption; its crop appears here once a drawing backs it." | Preview, an edge with no crop (`VA.VALUE_SOURCES[*].crop`) | always | **Rewritten as the fact**: "No drawing cited." / "The stack's element cites no drawing." / "An assumed value; no drawing backs it." The derived gap's "A study computes it from the dimensions on either side." is a fact and **kept**. |
| 7 | "Every number above came out of tolerance_stack.topology.summarize() → fold(), the repo's single arithmetic path, and was rounded in Python. This page adds nothing up." | results pane, a study, inside **Details** | fold | **Removed**. It is the same claim as #1. The Details fold now appears only when the study carries notes. |
| 8 | Legend: "…Which parallel path binds is a mechanics question this tool does not answer and must not learn to — see docs/DAG_TOPOLOGY.md, 'Not a solver'." and "Every one of those numbers came out of summarize() → fold(). Nothing on this page is added up in JavaScript." | `topology.html` legend dialog | fold | **Removed**, both sentences. The handoff: the fence is a rule for authors and stays in the docs. The rest of the legend is **kept** (it is the help, opened on request). |
| 9 | BRANCH POINT chip hover: "…Which path binds is a mechanics question this tool does not answer." | Preview, a branch node | hover | **Trimmed** to the fact before it. |
| 10 | BranchAmbiguity advice: "This tool never makes it — which parallel path binds is a stiffness question." | results pane, a study that forks | always | **Trimmed**. The advice keeps "Drop one of the named edges from the selection." The exception's own message, written in Python, still says "a mechanics decision this tool does not make". That is the author's text from `tolerance_stack/` and out of scope. |
| 11 | "Values as transcribed. Order is the physical order through the joint; only the path term lists below are load-bearing for the arithmetic. Click a row to see its full sourcing on the right." | stack page, Elements | always | **Removed**. |
| 12 | "The soak factor on every weighted term below is 1 + ΔT·α from this table … click the row." | stack page, Materials | always | **Moved to a hover** on the Materials heading, only the first clause (`VA.MATERIALS_HEADING_TITLE`). The how-to-use tail went. |
| 13 | "GENERATED CHECKS. These are not authored in <file> — … nothing here was re-derived in the browser. The same term table can be printed outside the browser…" | stack page, Results | always | **Removed**. The header's *checks GENERATED* chip already says it, on its hover. |
| 14 | "RSS is a relative softening indicator, not a probability statement … Verdicts never read it." | stack page, under Results | always | **Moved to a hover** on the two RSS column headers. |
| 15 | "Select a row in the tables on the left to see its full sourcing here — …" | stack page, empty detail pane | always | **Removed**. The pane is empty. |
| 16 | "Pick a stack on the left." / "Pick a stack." | stack view and its detail pane, no stack | unreachable from the nav (a stack is always picked) | **Removed**. They render nothing. |
| 17 | "Pick a kinematic study in the list." | kinematic results, no study | unreachable (the deep link resolves first) | **Removed**. |
| 18 | "No results projection — this page displays it and computes nothing, so without it there is nothing to show." / "No topology projection — the map, every study chain and every total come out of it, so without it there is nothing to draw." / "It is built in the tolerance-stack repository, not from this page." | banner and DAG region, no data | always, in that state | **Trimmed to the fact**: "No results projection." / "No topology projection." / "It is built in the tolerance-stack repository." |
| 19 | The pane's twins of #18: "No topology projection to read yet. It is built in the tolerance-stack repository, not from this page." and "No solver runs have been published … not from this page." | `apps/annotate/storage/adapter.js`, `app.js` | always, in that state | **Trimmed** the same way. The witness spec anchored on the first was re-pointed. |
| 20 | "No worksheet for this stack. (The projection reports absence rather than pointing at a neighbouring stack's sheet.)" | worksheet dialog | fold | **Trimmed** to the first sentence. |
| 21 | "Connect the tolstack repo folder (C:\workspace\tolstack) to load the stacks. Read-only." | banner, file:// before a grant | always, in that state | **Trimmed** to "Connect the tolstack repo folder (C:\workspace\tolstack)." beside its **Connect folder** button. The words are the action. |
| 22 | "Pick an element on the left, then click a face in the 3D view to bind it." (scoped: "Showing <scope>. Pick an element on the left, then click a face in the 3D view.") | 3D pane, the bar's one line, no element | always, every time the pane is open | **Removed** (`AA.TASK_NO_ELEMENT` is `""`). The bar at rest is Sweep and Help. Help says the same, on request. |
| 23 | "This transport cannot write -- binding controls are hidden. Connect a read/write folder to bind." | 3D pane, an element selected on a read-only transport | always, in that state | **Removed**, with its CSS: the rule says a feature that is absent shows nothing. A press on a bind control still says, in one line, that binding is not available here (`AA.READ_ONLY_WRITE`, unchanged). |

### Kept, and why (the walk should show these to Jeff)

| String (start) | Where | Why kept |
|---|---|---|
| "Binding — <model or study>" | 3D pane's head | A heading, not a sentence. But "Binding" names the pane's mode, and in sweep mode the word changes. **Borderline.** |
| The element-step prompts: "<element> needs two faces, bound one at a time. Click the first one in the 3D view." / "Select the remaining face that defines <element>: <end>." / "Choose which interface of <element> this face is, then press Bind." | 3D pane's bar, an element being bound | Each names the step the reader is on and what the element still needs. That is the "words are the action" case. **Borderline**: they are instructions. |
| "Pick an element on the left to bind this face to." | 3D pane, a face clicked with no element | Said in answer to a click, not standing on the surface. |
| The pane's Help lines, including sweep mode's "This is a solver's answer being played back. Nothing here changes the model, and nothing is written." | 3D pane, Help disclosure | Opened on request. The sweep line is a negation. **Borderline.** |
| "How to read the map and the grid" (legend dialog, less #8) | topbar button | Help, opened on request. |
| "How to read the sourcing column" (four bullets; the last ends "…in the panel on the right; click the row.") | stack page, collapsed disclosure | Folded. The first three state the export-identity rule, which is about the data. The last bullet is how-to. **Borderline.** |
| "Served over HTTP — no folder grant needed. Read-only." | banner's **Data source** fold | The one provenance disclosure the prose budget allows. It describes the mode. **Borderline.** |
| "No crop projection — hovers will say a crop is 'not built' rather than 'unresolvable', which are different facts." | banner, crops missing | Says what the absence means for the reader's data. A test calls it the load-bearing sentence. |
| "Data is older than the latest code — needs a rebuild" and, under it, "The data is older than the code and needs a rebuild." | banner, stale data | A real warning. The second line is an echo of the first. Filed: `ISSUE_20261120_the_stale_data_banner_says_needs_a_rebuild_twice.md`. |
| Kinematic grid's sourcing key: "no mark: read off a released drawing, datasheet or requirement" and its siblings | kinematic page and study grid footer | A legend for the marks on the rows, the same words the rows' marks carry. **Borderline**: a key explains how to read the page. |
| "Zero travel is the +72 deg stop: the feather stops touching." | kinematic page | A fact about the sweep. |
| "This browser cannot open a local folder — the viewer needs Chrome or Edge. ?mock=1 still runs a demo." | file:// in a browser without File System Access | A real warning. |
| "Click 'Connect folder' and pick the tolstack repo root, grant read/write." | the annotator's standalone page | Unrendered: the bare page redirects to the viewer since 2026-10-30. |
| Hovers: "View in 3D →" ("…select + tag, no measurement"), "Unused: dimmed" ("…Click to hide them."), the checks-GENERATED chip ("…the viewer re-derives nothing"), the toolbar's | hover titles | The handoff's third preference. Two of them carry negations; left as written. |

## Decisions not in the handoff

- **The study picker is a new control, not a behaviour change.** Choosing a
  study by it calls the same `onNavStudy` a nav row calls. Like the nav row,
  it does not write the study into the URL.
- **Details shows only with notes.** With its one page-describing sentence
  gone, a study with no notes would have shown an empty `Details` fold.
- **CSS that styled only removed copy went with it**: `.topbar .sub`,
  `.check__note`, `.tvtotals__empty`, `.tvtotals__rule`. `.tvtotals__pick`
  is new and uses the nav picker's look.
- **`apps/viewer/README.md`** gained a short section, "The page says nothing
  about itself", and a paragraph on the picker. The README's own rule
  heading, "the viewer computes nothing", stays: it is the rule for authors.
- **`tests/test_topology_projection.py`'s docstrings** said the page printed
  the fold claim on its footer. They now say the test is where the claim is
  kept.

## What the tests and the guards asked for

- Every test that pinned a removed string was rewritten to assert what the
  state shows now, usually that the sentence is absent and the pane is empty.
  None was deleted for its string alone. Two annotate checks (no element,
  scoped) became one, because both states are now the same empty line.
- **Renamed guards move the census's name hash.** `scripts/guard_enumeration.mjs`
  pins a set of names, not only a count. Seven fast guards and three browser
  pushes were renamed with their rewrite, so all three pins moved. The new
  picker test and six of the rewritten fast/annotate guards carry specs
  (`fast__…`, `annotate__taskinstruction-…`). The browser renames carry none;
  each is the twin of a fast guard that does.
- **A CSS anchor rotted.** `browser__a-run-of-prose-is-capped…` anchored on
  `.check__warn, .check__note { max-width… }`. With `.check__note` gone it
  is re-pointed at `.check__warn { max-width… }`. The mutation still strips
  the cap from the whole selector list, `.check__guidance` (what the guard
  measures) included.

## The test record

Everything ran from this worktree. The `[real]` tiers read the previous
link's scratch root, `data/scratch/plate` in the main checkout (projections
built from `a63d1900`). This branch changes no projection input, so no
rebuild was needed, and no tier refused the root. The shared `data/` was
never written. `node_modules` was a junction to the main checkout's, for the
browser runner.

- **Viewer fast tier**, `node apps/viewer/run_tests.cjs --repo <scratch root>`:
  **620/620** (one check added: the study picker).
- **Annotate fast tier**, `node apps/annotate/run_tests.cjs --repo <scratch root>`:
  **333/333**. That is one fewer than before, because two checks merged.
  It was re-run after the read-only-note removal.
- **Browser**, `--repo <scratch root>`, one `--only` per suite the change
  reaches, all green: `topology` (file:// 106/106, http 152/152, height
  budget 11/11), `annotate top bar` 30/30 (twice), `kinematic study page`
  22/22, `typography pass` 11/11, `annotate hosted posture` 15/15 (twice),
  `hosted origin with nothing` 7/7, `3D pane follows` 31/31, `the scene pane
  reads over HTTP` 10/10.
  `apps/annotate/run_browser_check.mjs` was edited (its back-to-bind check)
  but not run. No gate runs it.
- **Witness**: all **10/10 witnessed**. Eight specs are new and two were
  re-pointed. The first invocation hit the runner's default 30-minute budget
  at 6/10 ("left to the sweep (budget)", exit 0). The other four ran in a
  second invocation with `--budget-min 90` (20m54s). **Ten specs take two
  invocations, or one with `--budget-min`**: the fast entries cost 5–10
  minutes each here.
- **Default tier**, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`:
  **2577 passed, 2 failed, 1 skipped, 4 deselected**, 554 s (ledger row
  recorded, inside budget). The two failures are the same as the previous
  link's:
  - `test_viewer_js_suite_is_green`: the worktree has no `data/`. The fast
    tiers above were run against the scratch root instead.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`:
    pre-existing, filed as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.

## Found on arrival

Nothing. The worktree was clean, at `a02f27a4`.
