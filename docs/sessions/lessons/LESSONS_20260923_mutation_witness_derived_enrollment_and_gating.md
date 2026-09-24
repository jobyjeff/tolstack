# LESSONS 2026-09-23 — mutation-witness: derived enrollment and gating

Handoff: `docs/sessions/active/HANDOFF_20260923_mutation_witness_derived_enrollment_and_gating.md`.
Branch cut from `integration` at `c7915c7`, which `master` also pointed at, so
the baseline below was measured in the main checkout against exactly this
branch's parent tree.

## 1. The baseline the brief has been waiting on: **108/108** (and **115/115** after)

`node scripts/run_mutation_witness_tests.mjs`, main checkout, `master` @
`c7915c7`, clean tree, no `--only`. **108 declared mutations, 108 witnessed,
exit 0**, 32 minutes wall clock (16:13 → 16:45 local).

The registry was 103 guards carrying 108 mutations, not the ~96 rows the handoff
estimated. Two things that number settles:

- **The three 2026-09-22 decayed entries are already repaired.**
  `HANDOFF_20260922_mutation_witness_repair_and_enrollment` reached `completed/`
  in the 09-22 batch merge and fixed all three; there was nothing left for this
  handoff to repair or retire, and the deliverable that asked for "the three
  repaired or honestly retired" is answered by the baseline rather than by work
  here. Say this plainly rather than implying credit.
- **The tier is not leaking.** 54/54 on 2026-09-16 → 108/108 on 2026-09-23 is
  the whole-registry picture the brief said nobody could draw. What was leaking
  was never the declared set; it was everything outside it.

## 2. The identity scheme — what derives, and the one thing that does not

The design in one line: **the guard declarations in the tree are the
enumeration, and a spec is a mutation attached to one of them.**

`scripts/guard_enumeration.mjs` reads guard names out of the three JS check
sources — `test("…")` in `apps/viewer/tests.js`, `check("…")` in
`apps/annotate/run_tests.cjs`, a bare `push("…", cond)` in
`scripts/run_viewer_browser_tests.mjs` — and derives, from `tier` and the
guard's own name, the file name its spec must live at. Four consequences, and
each of them replaced something weaker:

| derived | what it replaced |
|---|---|
| the spec's file name | a hand-written `id` naming neither the guard nor the mutation |
| "this guard has no witness" | a reviewer noticing, one guard at a time, into `docs/issues/` |
| uniqueness | `test_every_id_is_unique`, and a shared table two agents collided over |
| `expect_red` validity | a **substring** count of the check source (see §4) |

**The authored residue is the mutation itself** — `file`, `find`, `replace`, and
the `contract`/`issue`/`note` around them. Nothing can derive that, and pretending
otherwise would have been the failure mode of this whole handoff.

### Four decisions worth the next agent's time

**(a) The unit is the guard, so a spec holds a LIST of mutations.** This was
forced, not chosen. Five entries in the old table named a guard some other entry
already named — three ways to break the topology switch, two to break the
command-table ban — because a guard worth witnessing is often worth witnessing
from more than one direction. Keying the file on `(tier, expect_red)` alone would
have collided on those five; keying it on the mutation as well would have made
*repairing an anchor* rename the file. A list inside one file is the only shape
where the name stays fully derived.

**(b) The digest covers `tier` and `expect_red`, NOT `suite`.** A browser guard's
name is declared once in the source and can be run by more than one suite, so the
enumeration — which reads declarations — cannot know which suite a guard belongs
to. Excluding `suite` is what lets `--unenrolled` print the exact file name to
write, which is the difference between a census and an instruction. Measured
before relying on it: no two entries in the old table shared a tier and a name
while differing in suite.

**(c) The slug lives in JS, and Python spawns node for it.** Two slug
implementations that agree today is the same defect as two hand-kept lists that
agree today. The runner cannot call the venv interpreter (`venv-win/` is
main-checkout-only, and a worktree is exactly where the tier is most often run
from), so the enumeration had to be on the JS side; `tests/test_mutation_witnesses.py`
reads `guard_enumeration.mjs --json`. That makes the cheap half depend on `node`
being on PATH, which it already did through `tests/test_viewer_js_suite.py`.

**(d) The browser tier needed a second declaration shape.** Exactly one guard —
the dispatch loop's own *"every suite prints the registry key it was dispatched
under…"* — sits above every suite, has no `push` closure to call, and writes
`console.log("    FAIL sub-check: " + …)` itself. It surfaced as the single
orphan on the first migration run, which is a small piece of evidence that the
enumeration is doing real work: a scanner that had quietly missed it would have
reported zero orphans too.

## 3. The gate: a pinned per-source guard count

`DECLARED_GUARDS` in `scripts/guard_enumeration.mjs` pins how many guards each
source declares. A guard added without a spec moves that number, and the move is
red in `pytest -q` in about a second and in the tier's own summary.

**Replayed rather than asserted.** Planting
`await test("a planted guard nobody enrolled", …)` in `apps/viewer/tests.js`:

```
AssertionError: the guard census has moved:
    apps/viewer/tests.js: 514 declared, pinned at 513
  If you added a guard, enrol it in this same change …
```

and `--unenrolled` answers with `write scripts/mutation_witnesses/fast__a-planted-guard-nobody-enrolled__48378b62.json`.
The tier exits 1 on the same condition. Reverted afterwards; the pin is back at
513.

**Raising the pin without writing a spec is deliberately allowed.** Some guards
cannot be witnessed at all (§5), and a mechanism that forbade the honest answer
would just be routed around. What changed is that the answer is now a line in a
diff a reviewer reads.

**The honest limit: `python` is not censused,** and the reason is written where
the row would be. Pytest has no single file its guard names live in, and whether
a given test file is one the shadow could even run is not cheaply decidable — it
means running it. Filed as
`ISSUE_20260923_the_guard_census_cannot_see_a_pytest_guard.md`, `audience:
strategy`, with the three answers laid out. This repo writes a lot of Python
guards, so it is a real hole and not a rounding error.

## 4. Two defects that closed themselves, and the general shape

Neither was on the deliverable list; both fell out of deriving the key, which is
the argument for doing the refactor rather than policing the class.

- **`test_no_expect_red_is_a_truncated_check_name` is retired.** It existed
  because the cheap half compared `expect_red` *loosely* (substring of the check
  source) while the runner compared it for *equality*. Membership of a parsed
  enumeration cannot be satisfied by a prefix — or by a name sitting in a
  comment, which the old check could not see either — so the extra assertion had
  nothing left to add, and the bare `ValueError` inside it
  (`ISSUE_20260922_the_truncated_check_name_guard_crashes…`) went with it.
  **Making two halves compare the same thing beats adding a third check that
  watches them disagree.**
- **The `about` block's unpaired tier list** is now
  `scripts/mutation_witnesses/README.md`, read back and paired against `TIERS`.
  The tier word is written in four places and all four are paired.

## 5. What derived enrollment does *not* clear, which is most of the backlog

Of the open "no mutation witness" issues, **five were cleared and five were
annotated and left open.** The dividing line is sharp and worth internalising
before the next enrollment handoff is staged:

> A census of guards can only report a guard that **exists**. Four of the five
> that stay open are missing the *assertion*, not the row — `showCrop`'s
> companion fetch, the lightbox's glow suppression, `.tvflag`'s fill claim, and
> the results table's column geometry. There is nothing for the enumeration to
> count and nothing for a spec to name.

That is also the answer to "the 13 open instances are cleared at a stroke": the
*enrollment* half is cleared at a stroke, and the *write-an-assertion* half was
never an enrollment problem wearing an enrollment title.

**The interpolated-name population is now measured, and it is smaller than the
issue said**: 31 of 506 browser guards, not 45 of 51 names — 27 interpolated
plus 4 declared more than once, which is a second way to be unenrollable that
nobody had named. The old figure counted template *literals*; the census counts
*guards*, after closing adjacent-literal seams and collapsing a multiply-declared
name into the one unattributable guard it is.

## 6. The cost figure

Six guards enrolled here (seven mutations), all replayed with `--only` before
being declared: **≈4 minutes per guard**, which is the same figure the 09-18 pass
reported. The number did not move; **the composition did, and that is the part
that matters to the brief.**

- **Gone:** picking an id, opening the shared table, and the collision risk that
  made `HANDOFF_20260921_policy_free_brief_residues` ship four guards and enrol
  none of them.
- **Gone, and much larger than the 4 minutes:** a *later* session rediscovering
  what a guard was for. Every minute measured here was spent by someone who had
  the issue's own measured mutation in front of them. The six enrollment handoffs
  between 09-15 and 09-22 were paying a discovery cost nobody was timing.
- **Still there, irreducibly:** finding a unique anchor, writing six fields, and
  one `--only` run (≈40s for a fast-tier guard, minutes for a browser one).

So the brief's cost gate should be read as: *enrollment did not get cheaper per
guard; it got moved to the only session that can do it cheaply at all.*

## 7. Gotchas for whoever is next

- **The Bash tool's heredocs eat backslashes even with a quoted delimiter**
  (`<<'EOF'`). `\\u0000` arrived in Python as a literal NUL. Write patch scripts
  with the Write tool and run them; do not pipe them through a heredoc.
- **A scratch verification tree needs a SHORT path.** `git archive` into the
  session scratchpad put `docs/spec_library/events/0006_…json` at 264 characters
  and 86 tests errored on `FileNotFoundError` for a file that was plainly there.
  `C:\Users\<user>\AppData\Local\Temp\tsv` worked.
- **A `git archive` tree is not a git checkout**, and 15 tests know it:
  `test_provenance`, `test_projection_provenance` and `test_spec_library`'s stamp
  tests all shell out to git or compare a tree sha. Run those in the worktree and
  use the scratch tree for the node tiers only. See §8 for how this session split
  the run.
- **`--only` matches the guard's name as well as the derived id**, which is what
  you actually have in front of you — it is what the tier printed.
  `--only "an edge name's"` is the normal spelling now.

## 8. How the suite was run, and why it is split

`pytest -q` cannot be green in a worktree by design, and a `git archive` tree
cannot answer the git-dependent tests. So:

| what | where | result |
|---|---|---|
| `pytest -q` | the worktree | 1212 passed, 1 failed — `test_viewer_js_suite_is_green`, the documented worktree-only failure (no `data/projections/`, and a skipped tier is not a passed one) |
| `node apps/viewer/run_tests.cjs` | scratch tree of this branch, `data/` + `node_modules/` junctioned from the main checkout | 513/513, `[real]` tier included — which is precisely the tier the worktree failure is about |
| `node apps/annotate/run_tests.cjs` | same | 154/154 |
| `node scripts/run_viewer_browser_tests.mjs` | same | 25/25 suites |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | same | **115/115 declared mutations witnessed**, exit 0, census holds, no orphans -- 21 minutes (17:13 → 17:34 local; the 32-minute baseline ran in the main checkout, which was doing other work) |

The junction trick (`mklink /J`) is what makes a scratch tree able to run the
browser tier at all: node resolves `playwright-core` by walking up from the
shadow's own directory.
