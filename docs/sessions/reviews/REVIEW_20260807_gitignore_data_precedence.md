---
type: review
handoff: docs/sessions/active/HANDOFF_20260806_gitignore_data_precedence.md
reviewer: review agent (claude)
date: 2026-08-07
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-08-07 — gitignore_data_precedence

Branch `handoff/gitignore_data_precedence` (`a5d9ed5`, `8fdca92`), reviewed on
`review/gitignore_data_precedence` cut from `master` @ `39ed23e`.

**This work is not a tolerance stack**, so the seven mandatory stack checks
(provenance, signs, LMC/MMC, RSS, nominal-in-band, quantised constraints, the
traced ratio) do not apply — the diff is `.gitignore` plus two docs and touches
no stack JSON, no worksheet, no `tolerance_stack/` module and no test. Scope
compliance verified against the handoff's "Scope: `.gitignore` only. Do NOT
touch stack JSONs, the viewer, or the SOP": clean.

```
 .gitignore                                                     | 29 ++-
 docs/issues/ISSUE_20260807_dispatch_toml_untracked_in_main...   | 52 +++
 docs/sessions/lessons/LESSONS_20260806_gitignore_data_prec...   | 209 +++
```

## What I verified

### 1. The bug reproduces, and the fix fixes it — both re-derived, not read

I ran an 18-row `git check-ignore` matrix myself (`--no-index`, verdict taken
from the **exit code**, `-v` only for the rule), three times: against the
**broken** main checkout pre-merge, against the handoff worktree, and against
the merged review tree.

| tree | mismatches |
|---|---|
| `C:\workspace\tolstack` **pre-merge** (dirty `data/*`) | **8** — every one `.gitignore:62:data/*` |
| `handoff/gitignore_data_precedence` worktree | 0 |
| merged `review/gitignore_data_precedence` | 0 |
| `C:\workspace\tolstack` **post-merge, after `checkout -- .gitignore`** | 0 |

The eight pre-merge failures are exactly the eight the lesson names, matching
rule and all. This is the "write a failing test against the pre-work state"
step: the matrix is the test, it failed 8/18 before and passes 18/18 after.

**The lesson's correction to the handoff is right, and I confirm it
independently.** Both the issue and the handoff carried a row claiming
`data/runs/.gitkeep` and `data/projections/.gitkeep` were "unaffected". They
were not — `data/*` matched `data/runs` and `data/projections` too, and my
pre-merge run shows both ignored by `.gitignore:62:data/*`. The blast radius of
the uncommitted edit was the whole of `data/`, not just `data/inbox/`. I have
propagated the correction into the source issue's resolution note so the next
reader of that file does not inherit the wrong table.

### 2. Nothing was untracked or newly tracked

`git ls-files data/` = **8 files**, byte-identical set before and after, in the
main checkout and in the merged tree:

```
data/inbox/.gitkeep                          data/inbox/tolerance_stacks/.gitkeep
data/inbox/drawings/.gitkeep                 data/inbox/tolerance_stacks/PROVENANCE.md
data/inbox/drawings/PROVENANCE.md            data/projections/.gitkeep
data/inbox/specs/README.md                   data/runs/.gitkeep
```

Empirical confirmation, not just pattern-matching: I created
`data/inbox/newstream/README.md`, `data/inbox/specs/NEWDOC.md`,
`data/inbox/specs/fake_spec.pdf` and `data/newtoplevel/README.md` on disk in the
merged tree, ran `git add -An .`, and **nothing was staged**. Ignore-by-default
for a new top-level `data/` child survives the fix. Temp files removed; tree
clean.

I also checked the one claim the design argument rests on — that an explicit
`git add <ignored-path>` errors rather than silently no-ops. It does
(`The following paths are ignored by one of your .gitignore files` + the `-f`
hint). So the residual hazard ("a new tracked doc still needs its own negation
line") is loud on the explicit path and only silent under `git add .`, which is
the trade the author states.

### 3. The shape chosen is argued, and the argument holds

Option 2 (keep the blanket, re-include `!data/inbox/`, `!data/runs/`,
`!data/projections/`). The handoff asked which failure the author would rather
have and the lesson answers it properly: the two risks are asymmetric —
committing a proprietary CAD/PDF pile is un-undoable without rewriting history,
a dropped `README.md` is one line and zero history damage. The secondary
argument (top-level child set is closed, inbox stream set is open, so paying a
line per *top-level* dir is cheap) is correct and is why this does not become
the per-stream tax. And it extends the existing `data/inbox/*` + `!…/specs/`
idiom rather than inventing one.

Dropping `!data/.gitkeep` from the hunk is right: no `data/.gitkeep` exists on
disk or in `git ls-files`, so it was inert, and an inert rule in the one file
whose bug class *is* precedence confusion is a liability.

The directory-descent rule is now a comment **in `.gitignore` itself**, which is
the correct home — `CLAUDE.md` is gitignored here, so a durable fact written
only to a session doc dies. It is also in the lesson. Both survive.

### 4. forge template claim — verified by reading the file

The lesson says forge's `template/gitignore` does **not** have this bug and
therefore the hunk was a tolstack-local edit, not a convention rollout. I read
`C:\workspace\forge\template\gitignore` (read-only): it has no `data/*` blanket
and no `.dispatch/` line, and stops at the flat
`data/inbox/*` / `data/runs/*` / `data/projections/*` trio. **Confirmed.** The
two routing notes to forge's `template_hygiene` (add `.dispatch/`; port the
two-tier shape and the descent comment) are correctly *routed, not actioned* —
no write into forge, which the cross-repo rule requires.

### 5. Suite, in both checkouts

- merged review worktree: **290 passed, 1 skipped** (1.27s) — matches the
  lesson's claim exactly, re-derived rather than copied.
- main checkout after merge and after discarding the dirty `.gitignore`:
  **290 passed, 1 skipped**. (The checklist's "run it in BOTH checkouts" item
  matters here for the usual reason — `data/` is populated in one and empty in
  the other.)

### 6. Checklist items that could have fired, and did not

- **`git log --oneline HEAD..master` before the verdict** — empty. Master moved
  once since the branch's merge-base (`39ed23e`, the board move that put the
  handoff in `active/`); the merge was clean and the handoff file stayed where
  master put it. No sibling handoff landed mid-review.
- **PROVENANCE byte-identical rows** — ran the diff (`master..handoff
  --name-only`) against every path `PROVENANCE.md` calls byte-identical.
  `.gitignore` is not one of them, and neither new doc is. **No amendment owed.**
  The overlay says this check "has never once come back clean" across its five
  recorded sightings; it does here — worth recording, though the honest reading is
  that this diff touches no imported file at all rather than that the class is
  cured. Keep running it.
- **Universal check, test data pollution** — the suite leaves `data/` untouched;
  `git status --porcelain` clean in both checkouts after the run.
- **`data/inbox/specs/` append-only** — untouched, in the diff and on disk.
- **Nothing written into drawing-checker** — the diff touches one repo.
- **Surviving `{{` from the template stamp** — none in the diff.
- **Stale counts** — the only counts asserted are `290 passed, 1 skipped`,
  `8 tracked files` and `18 matrix rows`; all three re-derived above, all three
  correct.

## Findings

### should-fix (fixed inline)

1. **`docs/issues/ISSUE_20260804_gitignore_data_blanket_shadows_inbox_streams.md`
   was left `status: triaged`.** The repo's convention (see
   `ISSUE_20260806_viewer_does_not_render_generated_checks.md`) is that a
   handoff's source issue goes to `status: resolved` with a dated RESOLVED
   blockquote when the work lands, and this issue is the handoff's own source.
   **Fixed inline on the review branch:** status flipped and a resolution note
   added, including the correction that the issue's own "unaffected" row was
   wrong — otherwise the next reader inherits the bad table from the issue even
   though the lesson corrects it.

### nits (no action taken)

2. **The lesson's merge block is now history.** It reads as an instruction to a
   future merger; the merge has happened. Harmless — a lesson is a record of the
   moment — but a reader skimming it in a month will briefly think there is an
   outstanding action. Left as written.
3. **`ISSUE_20260807_dispatch_toml_untracked_in_main_checkout.md`'s frontmatter
   `handoff:` convention.** Every issue in `docs/issues/` points at
   `docs/sessions/HANDOFF_*.md` (the staged path) even after the handoff moves to
   `active/`/`completed/`. That is a repo-wide staleness, not this handoff's, so
   it is not a finding against this work — noting it in case a triage sweep wants
   to decide whether those paths should track the file or name the slug.

### Nothing to file as an out-of-scope issue

The one out-of-scope thing the author found (`?? .dispatch.toml` permanently
dirtying the main checkout) was correctly **filed rather than fixed**, in
`docs/issues/ISSUE_20260807_dispatch_toml_untracked_in_main_checkout.md`, with
both options laid out and the decision routed to whoever owns dispatch's
contract for that file. That is exactly the file-don't-fix rule, and the issue
correctly observes that a permanently-dirty `git status` is *why* this bug
survived two days — the same argument this handoff exists to prove.

## Overlay updated

`docs/prompts/REVIEW_AGENT.md`, committed on the review branch:

- **Second sighting** appended to the existing `data/inbox/*` recurring entry —
  same class one level up, with the two traps that cost time here: a reorder does
  not fix a descent problem, and `git check-ignore -v` prints for negation
  matches too, so the verdict is the exit code (the author got this wrong on the
  first pass and it inverted eight rows).
- **New entry:** *the defect is an uncommitted edit in the main checkout — a
  branch cannot fix it.* Genuinely new failure class here; the merge is not done
  until the dirty copy is discarded **and the verification re-run in the tree
  where the bug lives**.

## For the next reviewer

The integration note in the handoff and the merge block in the lesson were both
correct and both necessary. I executed them: merged to `master`, ran
`git -C C:\workspace\tolstack checkout -- .gitignore`, re-ran the 18-row matrix
and the suite **in the main checkout**, and confirmed
`git status --porcelain` there no longer lists `.gitignore`. Every DoD row is
met.

**Verdict: APPROVE.** Zero blockers. One should-fix fixed inline. The work does
what it says, and — unusually for this repo — every number it asserts reproduced.
