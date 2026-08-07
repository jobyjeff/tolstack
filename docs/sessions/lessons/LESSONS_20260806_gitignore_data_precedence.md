# LESSONS 2026-08-06 — gitignore_data_precedence

Branch `handoff/gitignore_data_precedence`, commit `a5d9ed5`. Scope was
`.gitignore` only; nothing else was touched.

---

## ⚠ THE MERGE IS NOT DONE WHEN THE BRANCH LANDS

**Whoever merges this must also discard the main checkout's dirty `.gitignore`,
or the bug stays live while the branch looks like it fixed it.**

The defect never lived in a commit. It lived in an **uncommitted** edit in
`C:\workspace\tolstack` (` M .gitignore`). Merging my branch updates the tracked
file; git will then leave the dirty working-tree copy sitting on top of it,
still shadowing everything. The merge step is:

```sh
git -C C:\workspace\tolstack merge handoff/gitignore_data_precedence
git -C C:\workspace\tolstack checkout -- .gitignore   # <-- discard the superseded edit
git -C C:\workspace\tolstack status --porcelain       # must show no .gitignore line
```

Then re-run the check-ignore matrix below **in the main checkout**. A merge that
skips the `checkout --` leaves a fixed repo and a broken working tree.

Note the discard is safe: the `.dispatch/` line was the only part of that edit
worth keeping, and this branch carries it. Nothing else in the hunk is lost.

---

## The shape I chose, and why

**Option 2 — keep the blanket, re-include the directories git must descend
into.**

```
data/*
!data/inbox/
!data/runs/
!data/projections/
```

…followed by the existing per-stream rules, unchanged.

The handoff asked which failure I would rather have: an unignored new data
stream, or a silently dropped tracked doc. My answer is that **the question is
not symmetric, because the two risks differ in blast radius and reversibility.**

- *Unignored new data stream* (the cost of dropping the blanket): someone runs
  `git add .` and commits the contents of a new `data/<something>/` — CAD
  drawings, spec PDFs, run outputs. Potentially large, potentially proprietary,
  and **un-undoable without rewriting history**. This repo's whole `data/`
  convention exists to prevent it.
- *Silently dropped tracked doc* (the cost of a mis-written negation): a
  `README.md`/`PROVENANCE.md` fails to get staged. Annoying and quiet, but the
  file still exists on disk, `git ls-files data/` shows the gap, and the fix is
  one line with zero history damage.

So I kept ignore-by-default. It guards the expensive failure. The cheap failure
is what the verification discipline below is for.

The secondary argument: **the top-level `data/` child set is closed, the inbox
stream set is open.** forge's standard layout fixes the top level at `inbox/`,
`runs/`, `projections/`, `runs.jsonl`. Adding a fourth is a rare, deliberate act
that is already editing `.gitignore`. New `data/inbox/<stream>/` dirs, by
contrast, are routine. Paying one line per *top-level* dir is cheap; paying it
per *stream* would not have been. And the two-tier shape is not a new idiom —
`data/inbox/*` + `!data/inbox/specs/` already does exactly this one level down,
so I extended a pattern rather than inventing one.

I also lifted `.dispatch/` into the tracked file (orthogonal, correct, and it
was the only other thing in the uncommitted hunk). I dropped `!data/.gitkeep`
from that hunk: no `data/.gitkeep` exists or is tracked, so it was inert, and a
speculative rule in a file whose entire bug class is precedence confusion is a
liability.

## The directory-descent rule, stated plainly

This is the one thing to carry forward. It is now also a comment in
`.gitignore` itself:

> **Git does not descend into an excluded directory.** If a pattern excludes a
> *directory*, every `!` negation for anything inside it is unreachable —
> **regardless of ordering**. Reordering does not fix it. Re-inclusion does.
>
> And `*` never crosses `/`. So `data/*` matches `data/inbox` (the directory,
> not just files in it), and `data/inbox/*` matches `data/inbox/specs`.

Corollary — the working recipe, applied at every level you want a tracked file
at: **exclude → re-include the directory by name → exclude its contents →
negate the docs by name.**

This is why the obvious fix in the issue ("move the `data/*` block above the
per-stream exceptions") **does not work**. I verified rather than assumed.

Consequence worth knowing: **adding a new tracked doc still requires adding a
negation line.** `data/inbox/specs/NEWDOC.md` is ignored even after this fix —
by `data/inbox/specs/*`, which is the design from `c951a82` (docs are negated by
name). That is deliberate, not a leftover. It is tolerable because `git add
<explicit-path>` on an ignored file *errors* rather than no-oping; only
`git add .` swallows it silently.

## Verification matrix

Run in the worktree against the fixed file. **Expectations were written down
before the command ran**, and all 18 rows matched.

Method note: `git check-ignore -v` prints a line for *negation* matches too, so
the presence of output does **not** mean "ignored". I used the per-path **exit
code** (`git check-ignore -q`) as the verdict and `-v` only for the rule. I got
this wrong on my first pass and it inverted eight rows — if you re-run this,
use exit codes.

`--no-index` matters here: by default `check-ignore` skips tracked paths, which
would have hidden exactly the rows that prove the regression.

| path | expected | result | matching rule |
|---|---|---|---|
| `data/inbox/specs/README.md` | NOT ignored | ✅ NOT ignored | `!data/inbox/specs/README.md` |
| `data/inbox/tolerance_stacks/PROVENANCE.md` | NOT ignored | ✅ NOT ignored | `!data/inbox/tolerance_stacks/PROVENANCE.md` |
| `data/inbox/drawings/PROVENANCE.md` | NOT ignored | ✅ NOT ignored | `!data/inbox/drawings/PROVENANCE.md` |
| `data/inbox/.gitkeep` | NOT ignored | ✅ NOT ignored | `!data/inbox/.gitkeep` |
| `data/inbox/drawings/.gitkeep` | NOT ignored | ✅ NOT ignored | `!data/inbox/drawings/.gitkeep` |
| `data/inbox/tolerance_stacks/.gitkeep` | NOT ignored | ✅ NOT ignored | `!data/inbox/tolerance_stacks/.gitkeep` |
| `data/runs/.gitkeep` | NOT ignored | ✅ NOT ignored | `!data/runs/.gitkeep` |
| `data/projections/.gitkeep` | NOT ignored | ✅ NOT ignored | `!data/projections/.gitkeep` |
| `data/inbox/specs/NEWDOC.md` | IGNORED (by the stream rule, not `data/*`) | ✅ IGNORED | `data/inbox/specs/*` |
| `data/inbox/tolerance_stacks/NEWPROV.md` | IGNORED | ✅ IGNORED | `data/inbox/tolerance_stacks/*` |
| `data/inbox/drawings/NEWPROV.md` | IGNORED | ✅ IGNORED | `data/inbox/drawings/*` |
| `data/inbox/newstream/README.md` | IGNORED | ✅ IGNORED | `data/inbox/*` |
| `data/inbox/specs/some_real_spec.pdf` | IGNORED | ✅ IGNORED | `data/inbox/specs/*` |
| `data/runs/r1/out.json` | IGNORED | ✅ IGNORED | `data/runs/*` |
| `data/projections/v.json` | IGNORED | ✅ IGNORED | `data/projections/*` |
| `data/runs.jsonl` | IGNORED | ✅ IGNORED | `data/runs.jsonl` |
| `data/newtoplevel/README.md` | IGNORED (ignore-by-default preserved) | ✅ IGNORED | `data/*` |
| `.dispatch/anything` | IGNORED | ✅ IGNORED | `.dispatch/` |

**Before**, in the dirty main checkout, the first eight rows were all
**IGNORED**, every one of them by `.gitignore:62:data/*`.

> **The handoff's and issue's "unaffected" row was wrong.** Both claimed
> `data/runs/.gitkeep` and `data/projections/.gitkeep` were unaffected by the
> blanket. They are not — `data/*` matches `data/runs` and `data/projections`
> too, so those `.gitkeep` negations were equally unreachable. No live harm
> (both files are already tracked, and `.gitignore` does not untrack), but the
> blast radius of the uncommitted edit was the *whole* of `data/`, not just
> `data/inbox/`. Anyone re-deriving this should not trust the issue's table.

Supporting checks:

- `git ls-files data/` — **8 files, byte-identical to the pre-change set.**
  Nothing untracked, nothing newly tracked.
- Empirical `git add --dry-run`: created real `data/inbox/newstream/README.md`,
  `data/inbox/specs/fake_spec.pdf`, `data/inbox/specs/NEWDOC.md`,
  `data/newtoplevel/README.md` on disk, then `git add -An .` → only `.gitignore`
  would be staged. Temp files removed afterward.
- Full suite: `290 passed, 1 skipped` (see gotcha below re: the interpreter).

## forge template — checked, and it does NOT need this fix

The "also in scope" question, answered. I read `C:\workspace\forge\template\gitignore`
(read-only; a tolstack session must not commit into forge).

**The template does not have this bug.** It has no `data/*` blanket and no
`.dispatch/` line at all — it stops at the original
`data/inbox/*` / `data/runs/*` / `data/projections/*` trio. So the uncommitted
hunk was a **tolstack-local edit, not a template convention change** being
rolled out. There is nothing to un-break upstream.

What forge's `template_hygiene` handoff may still want to consider — **routing
these, not asking for them**:

1. **`.dispatch/`** is missing from the template. Every dispatch-driven repo
   will grow that directory and re-derive this same line locally. See also
   `docs/issues/ISSUE_20260807_dispatch_toml_untracked_in_main_checkout.md`,
   which raises the matching `.dispatch.toml` question (track vs. ignore) — the
   answer should be the same everywhere and is really a forge/dispatch call.
2. **The template still carries the flat `data/inbox/*` footgun** that
   `c951a82` had to fix by hand here — a stamped repo cannot track a stream's
   `README.md`/`PROVENANCE.md` until someone rediscovers the re-inclusion
   recipe. Porting the two-tier shape *and the directory-descent comment* would
   stop the next repo paying this tax. Whether to also adopt the `data/*`
   blanket is a genuine convention decision; I would, for the blast-radius
   reason above, but that is forge's call.

## Gotchas for the next agent

- **`venv-win` is gitignored, so it does not exist in a worktree.**
  `venv-win\Scripts\python.exe -m pytest -q` — the command in `CLAUDE.md` —
  fails here with a confusing PowerShell *"the module 'venv-win' could not be
  loaded"* error, which reads like a Python problem and is not. Run the main
  checkout's interpreter against the worktree's code instead:
  `& C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`.
- **Never eyeball a `.gitignore` change.** Ordering intuitions are wrong here in
  a specific, non-obvious way (see the descent rule). `git check-ignore -v` +
  exit codes, and `git ls-files`, are the only trustworthy verdicts — this is
  already the repo's recurring-bugs checklist item, and this bug is a member of
  exactly that class.
- The main checkout's `git status` also shows `?? .dispatch.toml`. Out of scope,
  filed as the issue above rather than fixed.

## State at handoff

- `.gitignore` fixed and committed on `handoff/gitignore_data_precedence`
  (`a5d9ed5`).
- Working tree clean; suite green.
- **Not done, and cannot be done from this branch:** clearing the main
  checkout's dirty `.gitignore`. See the merge block at the top.
