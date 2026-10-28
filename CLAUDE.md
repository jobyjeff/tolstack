# tolstack — project context for agents

> **This file is tracked** — since 2026-09-01 (handoff `claude_md_tracked`),
> matching drawing-checker and forge. It has history, it is reviewed like any
> other change, and the repo's doc-scan guards read it as a live document. A
> wrong fact written here is now a wrong fact with a commit and a reviewer,
> rather than one that quietly dies at the end of the session.
>
> **What changed:** a durable fact learned here may stay here — the old rule
> ("mirror anything durable into `README.md` or `ARCHITECTURE.md` or lose it")
> is retired, and the reviewer checklist item that enforced it now asks a
> different question.
>
> **What did not:** this is still orientation **and pointers**. Do not migrate
> `README.md` or `ARCHITECTURE.md` content into it, and do not restate a number
> or a rule that lives somewhere a test reads — point at the owner and let the
> guard keep it true. Per-session notes still go in `docs/sessions/lessons/`.

## What this is

**Tolerance-stack authoring and review, plus the spec/datasheet inbox.** An agent
builds a stack by hand into JSON, following a written SOP; the Python package
makes that JSON *executable* so tests can pin the numbers; a static page renders
it for a human reviewer. There is no pipeline and no service — the deliverable of
a session here is a cited artifact, not a run.

**The one rule, and it is the reason this repo exists:**

> Every element value cites a `source_ref`. **Nothing is invented.** A fastener
> dimension recalled from training data is plausible digits, right format, wrong
> number, and no way for a reader to tell. Cite a datasheet in
> `data/inbox/specs/`, cite a drawing callout, or **record a gap**.

A value with nothing behind it is `confidence: "untraced"` and goes on the gap
list. `untraced` is permitted only as an explicitly-listed gap — never as a quiet
fallback that makes a stack look complete. An unanswerable stack stated plainly
beats a confident wrong one, and this repo's most valuable published number has
been its honestly-reported traced ratio (defined in one place: the SOP's "The
traced ratio" — never restate the rule elsewhere).

## Read these, in this order, for the work you have

- **Building or editing a stack** → `docs/SOP_TOLERANCE_STACK.md`. Start there;
  it is the procedure, the schemas and the traps. It is written for the **first**
  archetype (a linear grip-length stack) and says so.
- **A diametral / thermal fit** → `docs/tolerance_stacks/ARCHETYPE_thermal_fit.md`
  first, then the SOP read through it.
- **A mechanism's position error, or anything graph-shaped** →
  `docs/DAG_TOPOLOGY.md`. The third archetype (2026-08-31): interfaces as nodes,
  dimensions and gaps as edges, a study = a human-lassoed chain. It carries a
  hard fence — **it is not a solver** — and that fence rules out the most
  natural-looking next feature. Since 2026-10-26 there is **one topology per
  product** (`topology_vpa_pitch_linkage.json`; `pitch_system` was folded into
  it) and every study is a subset of it; which parts move as one rigid body is
  declared on it — `docs/DAG_TOPOLOGY.md`, "Bodies".
- **A stack element or topology edge whose physical feature is unresolved** →
  `docs/ANNOTATION_SURFACE.md`. The select-and-tag surface (2026-09-06):
  `apps/annotate/` binds a stack-side key to a mesh face and writes an
  immutable `feature-identity/v0` event — **select + tag only, no
  measurement.** A binding is identity, not a value source; a drawing
  citation still wins wherever one exists. Since 2026-09-21 the surface also
  *suggests* which faces could be the feature (a diameter needs a round
  surface, a thickness flat ones, a joint centre a ball-shaped one) — still
  colour only: it never selects a face and never writes.
- **Where a feature is, in the assembly** → `scripts/fit_bound_features.py`
  and `tolerance_stack/feature_geometry.py` (2026-09-30). A committed binding
  becomes a *fitted nominal* — a sphere centre, a bore axis — in the part's
  own frame and per assembly occurrence, for a solver in another repo. It is
  the one place a placement matrix is applied to *produce a value*. Since
  2026-10-14 the annotator applies the same placements to *draw*: every
  opened part sits at every occurrence the assembly records, in and out of
  sweep mode, and a pick on any occurrence still binds the part-local
  `(sha256, face id)` — display only, never a value
  (`docs/ANNOTATION_SURFACE.md`, "Where a part is drawn").
  A fitted nominal is a measurement of a mesh, never a tolerance: it has no
  band, and a drawing callout still wins.
- **Writing a CSS rule in either web app** → `docs/DESIGN_TYPE_AND_COLOUR.md`.
  The type scale, the spacing convention and the one rule about *fill* the
  2026-09-17 pass settled. It states no numbers — they live in
  `apps/viewer/style.css`'s `:root`, paired against both apps by
  `tests/test_app_type_scale.py`.
- **Reviewing** → `docs/prompts/REVIEW_AGENT.md`. It is both the checklist and
  the per-repo override dispatch serves to review agents.
- **How the code is shaped and why** → `ARCHITECTURE.md`. Its module inventory is
  paired against the tree by a test, so a new module needs a row there.
- **What came from where** → `PROVENANCE.md` (imports at founding, with the
  source repo's sha).

## The three load-bearing design decisions

Know these before you write code; each has a test standing on it.

1. **One `fold()`.** A path through a joint and a check over it are the same
   object — a signed, optionally weighted term list — so worst-case and RSS are
   computed in exactly one place and **there is exactly one line where a sign can
   be wrong**. Do not add a second combiner. A per-term *weight*
   (`Term.coefficient`, positive; direction lives in `sign`) is how the thermal
   and topology archetypes got what they needed without one. ARCHITECTURE.md,
   "Where computation may live".
2. **Store lengths; never fold "MMC → max".** LMC/MMC are *material* conditions,
   not extremes: for a subtracted feature the mapping inverts. `lmc`/`mmc` are
   carried as transcribed so a worksheet can be checked column-for-column against
   a source sheet, and `fold()` never reads them. Code that derives `max` from
   `mmc` gets a chamfer backwards and still totals plausibly.
3. **Reading a document is an event, not an edit.** The spec library is an
   append-only log of immutable parse events, folded into a derived projection.
   Three outcomes, not two: a value, an **absence** (read for, demonstrably not
   there) and an **unreadable** (on the page, the photocopy will not give it up —
   an acquisition gap, never a licence to infer). `docs/spec_library/README.md`.
   A later event may name the earlier one it corrects (`supersedes`): folds
   hide it, history keeps it — implemented for feature identity, adopted by the
   spec library when a parse event first needs correcting.

## Environment

- **Trunk branch:** `master`. Handoff branches merge into **`integration`**;
  trunk moves only when the operator batch-merges.
- **Platform:** Windows-native. Interpreter: **`venv-win/Scripts/python.exe`**
  (forward slashes, no leading `./`, no `&` — see the standing instructions on
  command spellings). From a worktree, the venv exists only in the main checkout:
  use `C:\workspace\tolstack\venv-win\Scripts\python.exe`.
- **Install:** `powershell -ExecutionPolicy Bypass -File setup.ps1`
- **Test:** `venv-win/Scripts/python.exe -m pytest -q`. Expect green **in the
  main checkout** (see the worktree bullet below). The suite
  pins ground-truth numbers value by value and pairs documents against the code
  they describe, so a docs-only change can legitimately turn it red — that is the
  design, not a nuisance.
- **Two test tiers cannot run in a fresh worktree, and a green there does not
  cover them.** The viewer's `[real]` checks read `data/projections/`, and the
  browser TRUTH tier needs `node_modules/playwright-core` — both are gitignored
  and exist only in the main checkout. So a worktree's `pytest -q` is red on
  `tests/test_viewer_js_suite.py` (deliberately, since 2026-09-18: a skipped
  tier is not a passed one), and before trusting any green — a batch merge's
  most of all — run **in the main checkout**:
  `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs`
  and `node scripts/run_mutation_witness_tests.mjs --changed-since master`.
  **Rebuild the projections BEFORE those four, never after**
  (`scripts/rebuild_projections.ps1`): the `[real]` checks read
  `data/projections/`, so a tier run against a projection built from an older
  tree is comparing this tree's fixtures with that tree's data and agreeing
  with itself. The 2026-09-24 sweep ran them in the other order and put a red
  fixture pairing on trunk. Since then the tier refuses a projection whose
  inputs have moved on here rather than quietly passing, so the wrong order is
  now loud instead of green — but it is still a rerun.
- **A batch-merge candidate declares its own read-only gitignored test inputs in
  `.dispatch.toml`'s `[tests] candidate_inputs`, and tolstack is the first repo
  in the workspace to do it (2026-10-01).** It names `data/inbox/specs`,
  `data/inbox/drawings`, `data/inbox/feature-identity`,
  `data/inbox/tolerance_stacks`, `data/inbox/linkage-sweeps` and `data/meshes`
  — read-only, confirmed by a before/after manifest diff across a full suite
  plus an actuator rebuild (zero bytes changed in the main checkout). **It is
  live, not inert:** at the 2026-10-21 batch merge `dispatch bridge-test-inputs`
  printed four of the then-five paths `linked` and only
  `data/inbox/feature-identity` `present` (a fresh worktree carries its tracked
  README there, and nothing else). `data/inbox/linkage-sweeps` was added after
  that merge: without it the kinematic study builds as `error` and the
  candidate was `5 failed, 1509 passed`, every failure from that one study;
  bridged, the same candidate was `1514 passed, 1 skipped`. A new `[real]`
  check that reads another gitignored directory adds it here in the same
  change. `node_modules` is deliberately **not** declared: the browser TRUTH
  tier it would arm already runs separately in the main checkout at merge time
  (above).
- **A witness decays between the branch that measured it and the trunk that
  runs it, and the merge gate runs the witnesses the merge could have reached —
  the whole registry is a schedule's, not a landing's (2026-10-26).** Three
  declared mutations were `WITNESSED` on their own review branches and `NOT
  WITNESSED` on trunk a day later, and nothing in the pipeline failed —
  **because nothing ran the tier**, not because the tier was quiet about it: it
  has exited non-zero on a decayed witness since `9c6c4a4`, and
  `LESSONS_20260922_mutation_witness_repair_and_enrollment.md` measured that
  and corrected the "exits 0" claim the issues carry. 2026-09-23 added two more
  non-zero classes — a spec naming a guard the tree no longer declares, and a
  guard added without a spec. What 2026-10-26 changed is *where* the whole
  registry runs: it took ~2 h under the one browser slot, twice per landing
  (the review's post-merge run and the batch merge), and in six weeks caught one
  decay nothing cheaper could — a witness defect with no product exposure. So
  **a branch, a review's post-merge run and the batch merge run
  `--changed-since <ref>`** (`--repo C:/workspace/tolstack` from a worktree):
  every entry the diff's *hunks* reach — a hunk within a few dozen lines of
  the mutation's anchor (or the anchor gone), the spec file changed, or a
  hunk inside the guard's own body in its harness file. Hunks, not files,
  since the evening of 2026-10-26: this repo's harness files *are* its check
  files and its viewer is a few large files, so the file-level first cut
  selected 258 of 332 entries for one viewer handoff — the whole registry by
  another name. What a hunk leaves unselected (the note the selection prints
  says how many, and why) is the sweep's. **`--only <guard>` re-checks one.** The whole registry, `--full`, is the
  scheduled sweep's (`docs/prompts/WITNESS_SWEEP.md`), and a decay it finds
  arrives as a `class: decayed_witness` issue the next morning. The one case
  the gate cannot see is the one the sweep exists for: `--changed-since` would
  not have selected `237dba65` on 2026-10-20, a layout shift the spec's own file
  never recorded. Do not put `--full` back on the gate over a decay like that.
  Outside the main checkout the runner refuses a bare run and prints the
  `--changed-since integration` line. **That run is capped at 30 minutes**
  (`--budget-min`, 2026-10-27): fast and python entries first, browser entries
  after, and what the cap did not reach prints as `left to the sweep (budget)` —
  a capped run whose reached entries are all witnessed is a pass (exit 0), and
  the reviewer neither re-runs nor waits for the remainder.
- **Every browser run takes the machine's one browser slot, and the runners do
  it themselves** (2026-10-21, `scripts/browser_runner.mjs`): the viewer and
  annotate runners, the mutation-witness runner when it selects a browser
  entry, and the tracked `tests/debug_*.mjs` scripts re-run themselves under
  `dispatch slot run --class browser` and wait their turn, so there is nothing
  to wrap by hand (a double wrap is harmless — the inner one sees
  `DISPATCH_SLOT_HELD` and runs at once). A pytest test that starts Chrome asks
  for the `browser_slot` fixture instead, so a run with no browser test never
  queues. The Chrome a runner launches is CPU-capped to a few cores of the box
  and closed however the run ends: every way out kills the recorded Chrome tree
  and waits until each killed process's handle is *signalled* (a killed Chrome
  stays un-signalled for up to 30s+ on this box, so `process.kill(pid, 0)` is
  not "gone"); past 60s it prints `BROWSER LEFT RUNNING` naming the pids
  (2026-10-22, `the_kill_witness_fix_is_ported_from_drawing_checker`). A scratch script that drives a browser gets
  the same by importing that helper.
- **Never generate synthetic load on this workstation** — no CPU burners,
  memory hogs or fork loops, not even to reproduce contention. It runs Jeff's
  live work and every other agent; reason about contention or use a timing
  knob. The 2026-10-21 incident began with a load generator.
- `tests/debug_*.py` are inspection tools, run by hand, never by pytest.
- **Ops verbs:** `ops.toml` (forge CONVENTIONS.md §8) — the only place a deploy
  command should live.

## Things that cost previous sessions time

- **`data/` is gitignored by design and shared by every worktree.** Contents live
  only in the main checkout. "Empty in my worktree" is never evidence of absent —
  resolve a repo-relative `data/` path at `C:\workspace\tolstack\data\`. Anything
  that writes there takes `--data-root`; point it at the main checkout or the
  output is deleted with your worktree.
- **The projection builders refuse to overwrite** a projection built from a tree
  they do not contain: the `scripts/build_*_projection.py` / `build_viewer_crops.py`
  CLIs exit 3, and `--allow-older-tree` overrides that, loudly. Every writer of a
  shared projection goes through the same gate — `scripts/projection_provenance.py`
  owns that list, and `ARCHITECTURE.md`'s inventory pairs it against the modules
  that actually import it, so don't keep a second copy of the count here.
- **A guard you add is enrolled in the same change: it needs one mutation spec
  under `scripts/mutation_witnesses/`.** Nothing else — the file's name is
  derived from the guard's own name, so there is no id to pick and no shared
  table to edit (`node scripts/run_mutation_witness_tests.mjs --unenrolled`
  prints the name to write). The per-source guard count is pinned, so a guard
  added without one reddens `pytest -q`; raising the pin instead is allowed and
  says, in the diff, that this guard cannot be witnessed. Enrollment used to be
  a later session's job and six of those in eight days did not move the arrival
  rate.
- **A number or a rule a guard checks is *declared*, never written in English
  and matched.** Since 2026-09-23. A document that states a checkable fact —
  the traced ratio, a hardware-entry count, the one-fold rule's exception list,
  a byte identity, the route set behind `data/meshes/` — carries a fenced
  `claim` block (a `claims` array, in a JSON document) naming the metric and
  the value, and the guards read **only** those. `tests/claims_registry.py`
  owns the format, the corpus and the registry of metrics; adding a checkable
  fact means adding a registry row with the source its value is re-derived
  from. Two consequences worth knowing before you edit a document here: a
  figure you write into a sentence and declare nowhere is checked by nothing,
  and a declaration whose value its source refutes reddens `pytest -q` naming
  the file and line. **To write *about* the format — an example fence in a
  brief, a report, a prompt — open the fence inside a blockquote (`> ` on every
  line).** A bare example fence anywhere the corpus reaches (every tracked
  `.md`/`.py`/`.js`/`.json` outside `docs/sessions/`, `docs/issues/`,
  `docs/reference/`, `PROVENANCE.md` and `tests/`) is parsed as a real
  declaration and reddens the suite for everybody — including
  `docs/strategy/`, which the retired prose scans used to exempt. Five prose
  scans were retired for this; the argument is in
  `ARCHITECTURE.md`, "A document's checkable facts are declared, not written in
  English".
- **A field vocabulary is a module-level constant, never an inline literal and
  never an end-of-line comment.** A vocabulary drifting between the code, the SOP
  and the viewer is this repo's most-repeated defect — `docs/prompts/REVIEW_AGENT.md`,
  "Documented vocabularies drifting from the seeded data", keeps the sighting
  count and what each one taught. The fix shape is one named tuple plus a test
  pairing the prose against it, and a test now scans for the inline-literal
  shape, so a new one fails rather than teaching a word the constructor refuses.
- **The JavaScript half of that class is not paired, it is generated** (since
  2026-09-23). Every vocabulary the two web apps render that Python owns is
  written into `apps/viewer/vocab.gen.js` by `scripts/generate_js_vocabulary.py`,
  from the registry in `scripts/js_vocabulary.py`. A word is changed in **Python**
  and regenerated — `tests/test_js_vocabulary_is_generated.py` is red on a Python
  edit nobody regenerated *and* on a hand edit to the generated file, and a
  rendered table whose keys have drifted throws when the app loads. Adding a
  vocabulary the JS reads means adding a registry row; nothing else here is a
  place to write words down.
- **`kind: "parts_list"` can never be `traced`.** A parts-list row carries a
  nominal, never a tolerance band. Three elements seeded at founding claimed it
  anyway — honest `note`, wrong machine field, and the field is what every
  consumer reads; fixed 2026-08-06 and now pinned by a shape test.
- **A quantity written in prose that no test reads from the tree is a defect**,
  regardless of whether it happens to be right today. ARCHITECTURE.md's module
  inventory enforces this on itself.
- **`docs/reference/` is insert-only.** Imported text is never edited, only
  annotated with dated correction blockquotes.
- **`data/inbox/specs/` is append-only.** Never rename, reorganise or tidy it.

## How work arrives

dispatch launches you in a git worktree, seeded with a handoff in
`docs/sessions/active/`. The handoff is *what* to build; this file is the context
around it. A handoff's directory is its status: `docs/sessions/` root = staged,
`active/` = running, `completed/` = done, with `lessons/` and `reviews/` beside
them. Anything you notice that is off-task goes in `docs/issues/` as an
`ISSUE_<date>_<slug>.md` **with frontmatter** — a prose-only issue is invisible to
every status scan.
