# Lessons — tolstack_founding (worked 2026-08-04)

Handoff: `docs/sessions/active/HANDOFF_20260803_tolstack_founding.md`.
Branch: `handoff/tolstack_founding`, cut from `master` at the template stamp
(`e7bd996`). This repo's first tactical session.

Found the repo: import the tolerance-stack material from drawing-checker, take
ownership of the spec pile, and write the two documents the repo exists to hold —
the SOP and the review checklist.

## What landed

| commit | |
|---|---|
| `1d5afb5` | conformance: `docs/issues/.gitkeep`, `docs/reference/`, `requirements.txt`, `setup.ps1` stamp fix, README + ARCHITECTURE.md |
| `c951a82` | the specs pile moved in from drawing-checker + its append-only README + `.gitignore` per-stream exceptions |
| `c157300` | the imported stack assets, `PROVENANCE.md`, 34 tests green |
| `075bd4e` | `docs/SOP_TOLERANCE_STACK.md` + `docs/prompts/REVIEW_AGENT.md` |

**Definition of done, verified:**

- `forge check` **OK** — on both `C:\workspace\tolstack` and the worktree. (Note
  it must be run with cwd = the forge repo; `forge\venv-win\python.exe -m forge`
  from elsewhere fails with "No module named forge".)
- Ported suite **34 passed** under this repo's `venv-win`, green on the first run
  with no edits to the test file.
- Both stdlib debug tools run here and exit 0. `debug_report_tolerance_stacks.py
  --compare` re-derives **all 27** workbook cells with **zero** mismatches, so the
  import demonstrably preserved the numbers, not just the files.
- Specs folder moved: **42 files, 111,575,456 bytes**, verified identical on both
  counts, `MOVED_TO_TOLSTACK.txt` breadcrumb left behind.
- `PROVENANCE.md` lists every copied path with drawing-checker's `master` sha at
  the time of the copy (`0743640`).

## File inventory

39 tracked files. What was **authored** here (1,078 lines):

| file | lines | |
|---|---|---|
| `docs/SOP_TOLERANCE_STACK.md` | 467 | the deliverable |
| `docs/prompts/REVIEW_AGENT.md` | 219 | the deliverable |
| `PROVENANCE.md` | 126 | every import, with shas and what was amended |
| `ARCHITECTURE.md` | 121 | package layout, why one `fold()`, RSS caveat, cross-repo deps |
| `README.md` | 92 | what the repo is; the four schemas; why a separate repo |
| `data/inbox/specs/README.md` | 53 | the append-only rule + gap-to-file map |
| `docs/sessions/lessons/LESSONS_20260803_tolstack_founding.md` | this file | |

**Imported byte-identical** (verified with `cmp`, all 10): the three
`stack_*.json`, `hardware_entries.json`, both `WORKSHEET_*.md`,
`tolerance_stack/{__init__,stack}.py`, `tests/test_tolerance_stack.py`,
`tests/__init__.py`.

**Imported and amended** (6, each amendment listed in `PROVENANCE.md`):
`docs/tolerance_stacks/README.md`, the four `tests/debug_*.py` tools,
`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md`.

**Present on disk, gitignored**: `data/inbox/specs/` (42 files) and
`data/inbox/tolerance_stacks/260729_sample_tol_stack.xlsx` (sha256 re-verified).
Both live in the **main checkout**, `C:\workspace\tolstack` — see the worktree
note below.

## What did NOT make the SOP, and why

The slice-1 lesson and worksheets carry more than an SOP should. Deliberately
left out:

- **The specific numbers.** No element values, no check results, no verdicts. The
  SOP teaches the procedure; the worked examples are the three stack JSONs and the
  two worksheets, which are right there and stay authoritative. Copying numbers
  into an SOP guarantees they rot.
- **Findings F6, F7, F9, F10, F13, F14, F15 individually.** These are *facts about
  217755* (the .063 washer absent from the parts list; the drawing selecting the
  fastener the workbook rejects; find 95 ballooned nowhere; the `SCALE 1:20` junk
  parts-list row; `NAS77A4-015` absent; DETAIL X ballooning the tangential link
  mount rather than the pitch plate; three distinct 4.06 callouts). They are not
  procedure. What generalised instead is the *shape* of each: "absent from the
  parts list is a finding, not an error", "a mismatch against the drawings is a
  finding, never a transcription error to fix", and "same value ≠ same feature".
  The particulars stay in the worksheets and in `docs/reference/`.
- **F4 (take 2 drops the thread-transition allowance).** A one-off inconsistency
  between two passes at one joint. Its lesson — that a stored, versioned stack
  definition is what prevents two models of one joint — is already the reason the
  repo exists, so restating it as a step would be noise.
- **The "where should stacks live" recommendation.** Answered by this repo
  existing. It survives only as the note in `docs/reference/`'s header explaining
  which part of that lesson is superseded.
- **`docs/tolerance_stacks/README.md`'s regeneration commands.** Duplicated into
  the SOP's steps 5 and 7 in context rather than referenced, because a cold reader
  following the SOP should not have to open a second file to find the command
  they need.
- **drawing-checker internals** — `pipeline.zone_mapper`, `data_paths.py`, the
  `conftest.py` data-root seam, the other ~35 debug tools. Only the two facts a
  stack author actually needs crossed over: the printed-zone-vs-synthetic-grid
  distinction and the `item_no`/`find_no` key mismatch.
- **The three-vs-four schema count.** The slice-1 README said "three shapes" and
  then described four; the handoff specifies four. `check_result` is the fourth —
  it is *produced, not stored*, which is presumably why it kept getting dropped
  from the count. Corrected in the copied README and stated as four everywhere
  here.

One thing the SOP **added** that no source material contained: **Step 5b, "if
there is no source workbook"** (see below).

## Friction, gaps, and decisions

### The template stamp left `{{REPO_NAME}}` in `setup.ps1`

Beyond the known `docs/issues/` gap, this is a real forge bug.
`conventions._substitute_names` walks only `.md`/`.txt`/`.toml`, so the
placeholder in `setup.ps1` (and any future `.ps1`/`.py` stub) survives stamping.
tolstack's `setup.ps1` had shipped with `# {{REPO_NAME}} setup` since founding.

Fixed locally, **not** upstream — editing forge was outside this handoff's scope.
**Recommend a forge issue**: either add `.ps1` to the suffix list or have `check`
flag a surviving `{{REPO_NAME}}` as drift. The second is better: it catches every
future stub type instead of the ones someone remembered to enumerate. Cheap, and
the check already walks the tree.

### `docs/issues/` — confirmed, and worse in a worktree than the note implied

As slack-sync's founding lesson said. Worth adding the mechanism: `docs/issues/`
is created by `dispatch init` in the **main checkout**, so `forge check
C:\workspace\tolstack` passed *before* any fix — while `forge check` on the
**worktree** failed. A founding session that only checks the main checkout will
conclude the repo conforms and ship a branch that does not. Tracking a `.gitkeep`
makes every checkout conform, which is the actual fix.

### `data/inbox/*` blocks per-stream tracked docs

The template's `.gitignore` has a single `data/inbox/*` rule. Git does not descend
into an excluded directory, so `!data/inbox/specs/README.md` alone does **nothing**
— the directory itself must be re-included first, then its contents excluded, then
the doc negated. drawing-checker had already discovered this and writes per-stream
blocks; the template's broad rule has not.

Landed both streams explicitly. Anyone adding a new inbox stream with a tracked
`PROVENANCE.md` will hit this again — possibly a template improvement, though the
broad default is arguably the safer one for a fresh repo.

### The worktree / `data/` tension is real and unresolved

`ops.toml` says commands run with cwd = the **main checkout**, "venv-win and
data/ live only in the main checkout". But a tactical session runs in a worktree
and has to run the tests. Handled it by:

- creating `venv-win` **in the worktree** (gitignored, harmless) to run the suite;
- putting the real gitignored data (the specs pile, the xlsx) in the **main
  checkout**, where the convention says data lives;
- writing tracked skeleton docs (`data/inbox/specs/README.md`) in the **worktree**,
  because a tracked file can only be committed from a checkout that has it.

That last point bit: I wrote the specs README into the main checkout first, then
had to relocate it to the worktree to commit it. **`C:\workspace\tolstack` now
needs `setup.ps1` run once after this branch merges** — its `venv-win` does not
exist yet.

Worth strategy's attention: every future tolstack session hits this, and the
`data/` half of a worktree is always empty of the very files a stack author needs
to cite. Not fixable inside this handoff.

### `data/inbox/specs/` was untracked, not gitignored

The handoff described both sides of the move as gitignored data. The destination
is; the source was **untracked** — drawing-checker's `.gitignore` uses per-stream
patterns (`drawings`, `tolerance_stacks`) and never covered `specs/`. No
drawing-checker commit was involved either way, so the move stayed in scope, but
the two are different claims and the distinction is worth keeping straight when
reasoning about that repo's data tree.

Also: `desktop.ini` is Hidden+System, so `Get-ChildItem -File` reports **41** of
the 42 files. Count with `-Force` or under-report a move by one file.

### The specs pile already answers slice 1's #1 gap

`NAS6403-NAS6420 Rev 4.pdf` is in there — the standard whose grip tolerance,
thread run-out and **cotter-hole position** blocked findings F7, F8 and F16.
`JB_NAS77.pdf` and two RBC plain-bearing datasheets cover the NAS77 gap, and
`JPS00094` (bolt/nut installation) and `JPS00078` (bearings and bushings) are
process specs nobody had looked for.

So the *first* thing the next session should do is read that PDF, not conclude
the value is unobtainable. Mapped gap-to-file in `data/inbox/specs/README.md`.
Still missing and still blocking: **MS9363** (castellated-nut slot geometry — the
check that actually governs both seeded joints), NAS1149, MS21299, MS24665, and
every Joby part drawing.

### Step 5b — the SOP's first consumer has no workbook

Caught by reading `HANDOFF_20260803_pitch_link_stack.md` against the draft SOP
before finishing. The seeded material is *all* transcription work, so the SOP had
absorbed a workbook assumption in three places: the worksheet's "re-derivation vs
the source" section, the `# JEFF <cell>` test-comment convention, and the
`workbook_cells: null` / `[NOT IN WORKBOOK]` markers for added checks. The next
session builds a stack **from scratch** and would have hit all three.

Added Step 5b mapping each workbook-assuming instruction to its from-scratch
equivalent, and generalised the test-comment convention from "cite the cell" to
"cite the source, whatever it is — a drawing address does the job a cell
reference does". The point of the marker is that a number came from **outside this
repo**; without it the suite only proves the fold agrees with itself.

The from-scratch case is also where the one rule matters most, and Step 5b says
so: no cached formula result exists to contradict an invented number.

### Where the two documents deliberately diverge from the handoff's wording

- The handoff lists the review checklist's items as minimums. Kept all seven and
  added a block of "also verify" items (tests re-run rather than trusted, schema
  hygiene, specs-pile-not-reorganised, nothing written into drawing-checker).
- Framed the review as a **provenance audit, not an arithmetic one** — the
  arithmetic is pinned by tests and the provenance is checkable by nothing else.
  An unsourced tolerance wearing a `traced` label ranks **blocking**, above any
  arithmetic finding.
- Two rules that are mine, not the handoff's, and that I think matter most:
  **passes must be reported too** (a review that mentions only failures leaves
  "checked" indistinguishable from "skipped"), and **a high traced ratio is a
  reason to audit harder, not to relax** — 1-of-17 is the calibration, and a much
  better claimed ratio is exactly what an invented number looks like from outside.

## Notes for the next agent

- **Run `setup.ps1` in `C:\workspace\tolstack`** after this merges. The venv there
  does not exist.
- `forge check` needs cwd = the forge repo.
- The four `debug_*.py` tools split two and two: `debug_dump_tol_stack_xlsx.py`
  and `debug_report_tolerance_stacks.py` are stdlib and run here;
  `debug_stack_hardware_crosscheck.py` needs a drawing-checker run dir, and
  `debug_trace_stack_values.py` needs PyMuPDF, which `requirements.txt`
  deliberately omits — run that one from drawing-checker's venv. Each says so in
  its own docstring now.
- The `joby.tolerance_stack/...` schema ids came across unchanged. They are not
  repo-scoped, so the move does not rev them, and `/v0` still means what it meant
  in slice 1. Anything consuming those ids does not need to know this repo exists.
- `docs/reference/` is for verbatim imports. Do not edit files there beyond an
  import header; if imported reference and this repo's docs disagree, fix the
  repo's docs and record the divergence in a lesson.
- The SOP is **untested**. `pitch_link_stack` is its first consumer and is asked
  to file a friction report as proposed edits rather than editing it mid-run.
  Expect that report to be the most useful artifact of that session.
