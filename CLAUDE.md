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
  natural-looking next feature.
- **A stack element or topology edge whose physical feature is unresolved** →
  `docs/ANNOTATION_SURFACE.md`. The select-and-tag surface (2026-09-06):
  `apps/annotate/` binds a stack-side key to a mesh face and writes an
  immutable `feature-identity/v0` event — **select + tag only, no
  measurement.** A binding is identity, not a value source; a drawing
  citation still wins wherever one exists. Since 2026-09-21 the surface also
  *suggests* which faces could be the feature (a diameter needs a round
  surface, a thickness flat ones) — still colour only: it never selects a
  face and never writes.
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
  `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs`
  and `node scripts/run_mutation_witness_tests.mjs`.
- **The mutation-witness tier is on that list because a witness decays between
  the branch that measured it and the trunk that runs it.** Three declared
  mutations were `WITNESSED` on their own review branches and `NOT WITNESSED`
  on trunk a day later, and nothing in the pipeline failed — **because nothing
  ran the tier**, not because the tier was quiet about it: it has exited
  non-zero on a decayed witness since `9c6c4a4`, and
  `LESSONS_20260922_mutation_witness_repair_and_enrollment.md` measured that
  and corrected the "exits 0" claim the issues carry. What 2026-09-23 added is
  two more non-zero classes — a spec naming a guard the tree no longer
  declares, and a guard added without a spec — and this list, which is what
  makes the merge the place any of the three is caught rather than the next
  audit. It is the slow one (a browser, the whole registry, tens of minutes),
  which is the argument for running it at the merge and not per-branch.
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
  the file and line. Five prose scans were retired for this; the argument is in
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
