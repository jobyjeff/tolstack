---
type: review
handoff: HANDOFF_20260812_spec_library_projection_provenance.md
reviewer: review agent (dispatch)
date: 2026-08-12
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-08-12 — spec_library_projection_provenance

Branch `handoff/spec_library_projection_provenance` (2 commits, `383efcd` +
`3976cb9`) merged into `review/spec_library_projection_provenance` off `master`
`5822eaa`. `git log --oneline HEAD..master` was **empty** at merge time and again
before this verdict — no sibling landed during the review. The three parallel
handoffs the board is running own `apps/viewer/`, which this diff does not touch.

Diff: 10 files. Source: `tolerance_stack/spec_library.py` (+126),
`scripts/projection_provenance.py` (+23). Tests: `tests/test_spec_library.py`
(+192, five new tests). Docs: `ARCHITECTURE.md`, `README.md`,
`docs/SOP_TOLERANCE_STACK.md`, `docs/spec_library/README.md`, the overlay, the
issue (closed), one lesson. **No stack JSON, no worksheet, no `data/` tracked
file, no `apps/`, no `.gitignore`, no `docs/reference/`, no
`data/inbox/specs/`.**

## The seven mandatory checks — N/A, and why

The work under review is **not a tolerance stack**. It is projection plumbing:
a CLI flag, a provenance stamp and an ancestry gate on
`data/projections/spec_library/library.json`. No element, no path, no check, no
`source_ref`, no hardware entry and no material property is added, moved or
re-labelled. Checks 1–6 (traceability, signs, LMC/MMC, RSS, nominal-in-band,
quantised cotter constraints) have no subject here.

Check 7 (the ratio) is stated anyway, because the rule is that a review states it
and does not copy it. Re-derived on the merged tree with
`tests\debug_report_tolerance_stacks.py --ratio`:

> **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across the
> three seeded slice-1 stacks; **21 / 7 / 20 of 48** across all stacks.

Identical to the figures on `master` before the merge, as it must be — this
handoff touches no stack file.

The nearest applicable domain section is *"When the work is a spec-library parse
event"*. That does not apply either: no `spec-parse/v0` event was added, edited or
re-read. `docs/spec_library/events/` is byte-unchanged, and I confirmed the fold
output is unchanged by rebuilding (below), so no library value moved and nothing
can launder into a stack from this diff.

## What I verified

**Deliverable 1 — the design question, answered and recorded.** The handoff made
"should `library.json` be derived-and-gitignored at all?" a gate on deliverables
2–3. The author answered *keep it, and stamp it*, and in doing so **corrected the
premise of both the issue and the handoff**: those said `library.json` "is what a
stack's `library_ref` resolves through". I re-ran that check independently —
`grep` for `library.json`, `projections/spec_library` and `library_ref` across
`*.py *.js *.cjs *.mjs *.ps1 *.toml` — and confirm it: **no module in this repo
reads the file.** Every code consumer resolves a subject through
`build_library(load_events(...))` in process. So the alternative design is
already how all the code works, and the file's remaining consumer is a human/agent
reader — which is exactly the path a stale value takes into a stack wearing
`confidence: "traced"`, and is not removed by deleting the file. The argument is
recorded in three places (`spec_library.py`'s rebuild section,
`docs/spec_library/README.md`, the lesson) and `ARCHITECTURE.md`'s data-flow
paragraph now says the `library_ref` arrow is a lookup and not a code path. This
is the strongest part of the handoff: it went looking for the premise instead of
executing it.

**Deliverable 2 — `--data-root`.** Works. Run from this worktree against the main
checkout, it wrote
`C:\workspace\tolstack\data\projections\spec_library\library.json`. Default is
unchanged (`REPO_ROOT / "data"`), so no existing caller moved. `__main__.py`
passes no argv, so argparse reads `sys.argv[1:]` — the `python -m
tolerance_stack` entry point is intact.

**Deliverable 3 — the stamp and the gate, demonstrated by me, not read.** I did
not take the tests' word for the refusal. Through the real CLI, against a scratch
data root:

- fresh build → stamped, exit 0;
- re-stamp the file on disk with a **dangling commit** (`git commit-tree`, real
  object, not an ancestor of HEAD) plus a `marker` key → rebuild **REFUSED, exit
  3**, and `marker` still present, i.e. the refusal did not write;
- `--allow-older-tree` → exit 0, loud `OVERWRITING` note, `marker` gone.

And the *allowed* direction on the real shared file: rebuilding from this review
worktree over the author's `383efcd` stamp printed `which this tree already
contains -- overwriting it with a newer build` and proceeded. That is the gate
behaving, both ways.

**The gate actually bites.** Mutation check: I replaced the `prov.guard(...)` call
in `rebuild()` with `pass` and re-ran `tests/test_spec_library.py` —
`test_the_rebuild_is_REFUSED_from_a_tree_that_does_not_contain_the_last_one`
fails, 48 others pass. Restored; working tree clean. The gate is pinned at value
level, as the DoD asked, and through `main()` rather than the predicate.

**The rebuild is content-identical.** The DoD's "byte-identical except the added
provenance, or stop and report". Verified on the live file: rebuilt from this
worktree and diffed against the copy the author left, with `provenance` popped —
**equal**, and the only differing provenance fields are the ones that must differ
(`built_at`, `repo_root`, `events_dir`, `branch`, `head_sha`, `behind_trunk`).
Key order is `schema`, `provenance`, then the original keys unmoved.

**No top-level `built_at`, and the asymmetry is defended.** `results.json` and
`crops.json` carry one because published consumers read it by name;
`library.json` never had one and has no reader at all, so a second copy could only
drift from the one beside it. The decision is a claim, so it gets an assertion —
`test_the_stamp_names_the_tree_that_built_the_library` asserts the top-level key's
**absence**. Correct call, correctly pinned.

**The viewer projections are unaffected by the `source_key` change.** `stamp()`'s
new parameter defaults to `"stacks_dir"`, and existing tests
(`tests/test_projection_provenance.py`, lines 131–132, 168, 174, 188) call
`stamp()` without it and assert that key, so the default is pinned. End-to-end:
I rebuilt `results.json` from the merged tree against the main checkout —
content identical ignoring `built_at`/`provenance`, `stacks_dir` still present,
`events_dir` absent. `dirty: false` on that build, so
`viewer_projection_provenance`'s `--untracked-files=no` fix is intact and the
new writer inherits it (the main checkout's permanent untracked `.dispatch.toml`
does not light the alarm).

**Deliverable 4 — the class audit, re-run independently.** The handoff's own
lesson is right to distrust the audit that missed this file. I re-ran both sweeps
myself rather than reading the table: by destination (`grep -rn "projections"`
across `*.py *.js *.cjs *.mjs *.ps1 *.toml`) and by verb (`write_text`,
`write_bytes`, `json.dump`, `open(..., "w")`, `rmtree`, `mkdir` in Python;
`writeFileSync`, `createWriteStream`, `writeFile`, `mkdirSync` in JS). **Three
members, confirmed:** `scripts/build_viewer_projection.py`,
`scripts/build_viewer_crops.py`, `tolerance_stack/spec_library.py::rebuild()`.
The two other Python writers (`snapshot_drawing_checker.py --out`,
`tests/debug_dump_tol_stack_xlsx.py --csv`) cannot land under `data/` without
someone typing the path, and the JS sweep returns **zero** write calls anywhere
under `apps/viewer/` — I re-ran that one specifically, since "the renderer writes
nothing" is the claim that makes the viewer not a fourth member.

**Tests.** `venv-win\Scripts\python.exe -m pytest -q` — **350 passed, 1 skipped**
in this review worktree, **351 passed, 0 skipped** in the main checkout after the
merge (the one data-dependent test skips where `data/` is empty; both green, per
the overlay's checkout-specific-count rule).

**Universal check — no production-data pollution.** Every new test writes under
`tmp_path`. After a full suite run, `data/projections/` in this worktree is
**empty** and the main checkout's `data/` holds only the two projection files I
rebuilt deliberately. `git status --porcelain` clean in both. One side effect
worth naming and dismissing: `dangling_commit()` calls `git commit-tree`, which
writes a loose object into the shared object database on every run. It touches no
ref, no index and no working tree, and it is unreachable — `git gc` collects it.
Acceptable, and the docstring says exactly this.

**drawing-checker.** Untouched. No path under it appears in the diff (the two
matches are prose naming `snapshot_drawing_checker.py`), no run is cited, and
nothing here reads or writes that repo.

**`docs/reference/`, `data/inbox/specs/`, `.gitignore`, `PROVENANCE.md`** — all
unchanged; `test_provenance.py` and `test_docs_reference_imports_are_insert_only`
green. No `{{` template placeholders in the diff.

## Findings

### Blockers

None.

### Should-fix — both fixed inline on the review branch (`07d0dc7`)

1. **`docs/spec_library/README.md` — the new rebuild recipe does not run.** The
   `--data-root` invocation shipped split across two lines with a trailing `^`.
   That is **cmd's** continuation character; PowerShell is what runs here, and I
   pasted it to be sure: `Missing expression after unary operator '--'`. This is
   the one document that owns the recipe, added specifically so a worktree agent
   would stop rebuilding into a throwaway `data/` — and the fallback for someone
   whose paste errors is the bare `python -m tolerance_stack` the doc exists to
   prevent. Fixed: one line, which is how every other command in this repo's docs
   is written, plus a parenthetical saying why.

2. **`ARCHITECTURE.md` — a count the handoff invalidated and half-fixed.** The
   `scripts/` inventory row for `projection_provenance.py` still read *"stdlib
   only, both builders import it"*. There are three importers now. The handoff
   updated this exact count in the module's own docstring (*"three callers, not
   two"*) and missed the copy sixty lines away in the file it was already editing
   — the repo's most-sighted failure class, in the variant where nothing triggers
   the usual "did a new file appear?" question, because no file appeared. Fixed to
   name all three.

### Nits

3. **Two wrong character counts, fixed inline.** `tests/test_spec_library.py`:
   *"`docs/spec_library/events` is the same **26** characters"* — it is 24.
   `scripts/projection_provenance.py`: *"`docs/tolerance_stacks` … the same **six**
   characters"* — it is 21. The second is pre-existing (from
   `viewer_projection_provenance`, `512cb67`), fixed here because it is the same
   class in the same docstring the handoff extends, and filing an issue for a
   docstring numeral would be noise. Neither number is load-bearing; both are the
   kind this repo has decided not to leave lying around.

4. **`tolerance_stack/__main__.py`'s docstring was not updated.** It still says the
   entry point rebuilds `data/projections/spec_library/library.json` full stop, with
   no mention of `--data-root` or the exit-3 gate. `--help` shows argparse's text so
   nobody is misled at the terminal, and `ARCHITECTURE.md` / `README.md` /
   `docs/spec_library/README.md` all carry the operational fact. Left alone;
   worth a line the next time that file is opened.

5. **`_provenance()` does `sys.path.insert(0, scripts)`.** Prepending puts
   `scripts/` ahead of the stdlib for the rest of the process, so a future
   `scripts/json.py` or `scripts/types.py` would break every import in the repo.
   No collision exists today (five files, all distinctly named), and the lazy-import
   reasoning behind the function is right. `sys.path.append` would be strictly safer
   at zero cost, since `projection_provenance` is unique. Not changed — it is not a
   defect today and the author's comment explains the design.

6. **The lesson's byte figure is present-tense about a file that no longer
   exists.** *"the file is 63,866 bytes and the JSON it holds is 62,356
   characters"* described the pre-stamp copy; the stamped file on disk is now
   64,520 bytes. The load-bearing half of that paragraph — **`library.json` is
   CRLF on disk, so a `read_bytes()` vs `json.dumps` comparison reports a
   difference that is not there** — I verified and it is exactly right (1,523 CRLF,
   0 bare LF). Lessons are dated history and the repo's doc-count guard exempts
   `docs/sessions/` for that reason, so this is a note, not a change: a future
   reader should not carry the number forward.

7. **One claim in the work is no longer re-derivable, and that is inherent.**
   `test_the_stamp_is_additive_and_the_rest_of_the_file_is_untouched`'s docstring
   says the comparison was also run by hand against *"the real 2026-08-05 file in
   the main checkout … identical"*. That file has been replaced and was never
   tracked, so I cannot reproduce it. What I *can* say: the current file's
   non-provenance content equals a fresh fold of the committed events exactly, and
   the issue independently recorded a rebuild-and-diff on 2026-08-10 that found the
   same. The claim is corroborated from two directions; it just is not
   re-executable, which is a property of a gitignored artifact and not a defect in
   the work.

## Overlay updated (part of this review, committed on the review branch)

- **"The projections are stale unless you rebuild them"** now names the **third**
  projection and its command. This is the one a reviewer will forget: it has no
  banner to nag them, and the same "only trees that HAVE the gate are gated" hole
  applies, so a pre-merge `master` checkout still clobbers it silently.
- **The `ARCHITECTURE.md`-inventory item** gains its second sighting and is
  generalised from *"a new file appeared"* to *"a count or quantifier the work
  invalidated"* — finding 2's shape, where the trigger never fires because no file
  was added. The instruction is now: grep the repo for the **other copies** of any
  count the work invalidates, because the author who fixes one is the least likely
  person to look for the second.
- **A new item:** paste-run, in PowerShell, any command a doc adds. One tool call;
  it would have caught finding 1.

## For the next reviewer

- **The gate is now on trunk for the spec-library projection, but old trees do not
  acquire it.** Until every live worktree has merged `master` past this handoff,
  `python -m tolerance_stack` run from a tree that predates it will silently write
  an unstamped `library.json` over a stamped one. The lesson says so; it is worth
  re-reading before you blame the gate for a missing stamp.
- **`library.json` has no reader, so nothing surfaces its stamp.** The stamp is
  useful only to whoever opens the file. The lesson files this as a deliberate
  follow-up; if a `library_ref` resolver is ever written, it should read
  `provenance` and say what it is trusting. Nothing to do today.
- The main checkout's `library.json` and `results.json` are both stamped
  `review/spec_library_projection_provenance @ 952d19f5ec20` as of this review.
  After the merge to `master` that commit is an ancestor of trunk, so ordinary
  rebuilds from anywhere current will be allowed.

## Verdict

**APPROVE — 0 blockers.**

The handoff did the thing this repo values most and the thing that is easiest to
skip: it treated its own brief as a claim. The design question was answered by
enumerating the readers rather than by weighing the issue's framing, and the
framing turned out to be the false part — a correction that is now recorded in the
issue, `ARCHITECTURE.md`, the module and the lesson. The gate is pinned at value
level through the entry point, the class audit was re-run by behaviour and
independently reproduces, and the shared file's content is provably unchanged by
the stamp. The two should-fixes were both stale-prose, both trivial, both fixed
inline.
