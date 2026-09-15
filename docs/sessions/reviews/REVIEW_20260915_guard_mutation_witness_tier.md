---
type: review
handoff: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
reviewer: agent (review/guard_mutation_witness_tier)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — guard_mutation_witness_tier

**APPROVE.** The structural deliverable is real, the five repaired guards each
redden on their declared mutation, and — the thing that decides a review of a
*guard* — the new tier was observed failing, four different ways, not merely
observed green. Three should-fixes filed as issues, one merge-induced anchor rot
resolved inline under the conflict carve-out, six nits.

## What I verified, and how

The deliverable here is a check, so per the canonical prompt's standing rule a
green run proves nothing on its own. Everything below was run in this review
worktree after the merge, with `npm install --no-audit --no-fund` (675 ms, one
package).

| run | result |
| --- | --- |
| `venv-win/Scripts/python.exe -m pytest -q` | **875 passed / 1 skipped** (869/1 at staging; +6 from `test_mutation_witnesses.py`) |
| `node apps/viewer/run_tests.cjs` | **298/298** |
| `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` | **360/360** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` | **19/19 suites**; topology 167, height budget 21, hosted-unpublished 7, respine 33 |
| `node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack` | **10/10 declared mutations witnessed**, exit 0 |

Counts went up in every tier, as the DoD required. The lesson's table reads
292/353/18-suites/869 because integration moved twice underneath the branch;
the deltas reconcile exactly. Every row above is the **final** measurement, on
the second base — see "The merge" below.

### The new tier, broken on purpose — four observations

Not one of these is inferable from a green run, and the handoff's whole premise
is that they are what a reviewer owes a new guard.

1. **A guard that stops witnessing.** Neutered the repaired compact-density
   sub-check (its whole condition → `true`) and ran the tier:
   `NOT WITNESSED — the tier stayed GREEN with the mutation applied`,
   `0/1`, and **true exit code 1** (measured without a pipe; `$?` after
   `| tail` reads `tail`'s status and lies about this).
2. **A stale `expect_red`.** Pointed one entry at a check name nobody prints:
   `NOT WITNESSED — the tier went red, but not on the declared check`, and it
   printed the names that *did* fail. Good diagnostic; see should-fix 1 for what
   is missing around it.
3. **A rotted `find`.** Not synthetic — it happened for real on the first pytest
   run after the merge. See "The merge" below.
4. **`--only` with no match**, both runners: a named list of the valid entries /
   suites and a non-zero exit, rather than a silent zero-work pass. This
   matters more than it looks: a filter that matched nothing and exited 0 would
   be a full run's worth of false confidence.

I also confirmed the tier leaves nothing behind. The shadow lives at
`tmp/mutation-witness/` (gitignored — `.gitignore:34`), the patched file is
restored byte-for-byte, `git status` after every run showed only my own edits,
and nothing under `C:\workspace\tolstack\data\` was touched (newest mtime there
is 2026-09-14 23:53, the batch-merge rebuild — no projection was rebuilt by me
or by the work).

### Scope discipline

The handoff's three fences all hold: **no app source is changed** (the diff
touches only `scripts/`, `tests/`, docs and `package.json` — nothing in
`apps/viewer/*.js`, `views/` or `style.css`), no `TOPO_VALUE_GUARDS` row is
added, `tests/test_topology.py` is untouched. The five repairs are all in the
tier files, which is the direction the handoff insisted on.

Two judgment calls the author made and reported, both of which I think are
right:

- **Keeping the three old card-layout sub-checks** rather than retiring them
  (the issue offered retirement). They no longer tell `fixed` from `absolute`,
  but they do still catch a popover returned to normal *flow*, which is the
  other half of the same defect. Keeping a witness for a defect nobody has
  declared an entry for is the conservative call.
- **Going past the handoff's list of five.** `rowDensity`, `edgeLengthMode` and
  `edgeValueOnly` had the identical hole, found by chasing the leader-style
  issue's closing question. Measuring them, fixing them in one sub-check and
  declaring them as three entries is better than leaving a measured hole with
  no owner — and it is the same contract the fifth guard is about, not scope
  creep.

## The merge — twice, one conflict, and one thing that is not a conflict

`integration` moved **twice** during this review. First `4c69f32` → `e0322c6`
(the `surfaces_that_state_something_false` handoff), before I started; then
`e0322c6` → `8059bdb` (`respine_tween_fidelity`, from the sibling review
worktree) while I was running the tiers, which is what the canonical prompt's
"check containment, not sha equality" warning is about — my first
`git fetch . review/…:integration` was refused as a non-fast-forward.

The second merge was clean (`respine_tween_fidelity` touched
`apps/viewer/topology.js`, `views/topology.js`, `tests.js` and the *body* of
`testRespine`, none of which the `SUITES` table or any declared anchor points
at). Both reviews had appended to `docs/prompts/REVIEW_AGENT.md` near the same
entry and git merged them without help. **Every tier and the mutation tier were
re-run from scratch on the new base** — all ten mutations still witnessed, all
nineteen suites still green, respine's own suite up 30 → 33 — because a merge
that lands under a guard is exactly the case where "it was green an hour ago"
means nothing. The counts table above is the second-base measurement.

The conflict below was on the first merge.

**The textual conflict:** `scripts/run_viewer_browser_tests.mjs`, the suite list
at the bottom of `main()`. `integration` appended a nineteenth suite,
`testAnnotateHostedPosture`; the handoff branch replaced the whole
`results.push(...)` run with the `SUITES` table that `--only` filters on.
**Resolution:** keep the handoff's `SUITES` table (the work under review), and
re-add integration's suite as a table entry with the label copied from
`testAnnotateHostedPosture`'s own `const label` —
`"annotate hosted posture (no folder grant off-machine)"`. Verified by the full
browser run above: 19/19, and that suite's 8 sub-checks pass. Had I taken
`integration`'s side the `--only` flag would have had no effect and the entire
mutation tier would have run every suite per mutation; had I dropped the suite,
a shipped guard would have gone missing.

**The thing that is not a conflict, and is the best news in this review:** the
merged tree failed `pytest` immediately, on one assertion —

```
E  hosted-page-never-falls-back-to-the-picker: its `find` matches 0 places in
   apps/viewer/storage/adapter.js (expected exactly 1). The anchor has rotted
```

`afbed4e` on `integration` replaced `if (opts.protocol !== FILE_PROTOCOL) {`
with `if (!VA.isLocalPage(opts.protocol, opts.hostname)) {`, so the annotator's
loopback origin counts as local too. The tactical worktree was cut before that
landed and could not have seen it. **This is the new guard doing exactly the job
it was built for, on its first outing, against a change nobody wrote it for** —
and it is the strongest evidence in this review that the cheap-half-in-pytest
split was the right design call.

Resolved inline under the conflict carve-out (a few lines, no designed behaviour
changed, the existing assertion proves the fix): re-pointed the `find` at the new
line, kept `replace: "if (false) {"` — same branch, same defect if it goes — and
recorded the before/after and the commit that moved it in the entry's `note`.
`--only hosted-page` then witnessed it, reddening the same fast-tier check as
before. I confirmed the other nine anchors and all ten `expect_red` strings still
resolve against the merged tree.

## Findings

### should-fix (0 blockers; all three filed as issues, none fixed by me)

1. **`expect_red` is the half of an entry nothing cheap checks** —
   `ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks.md`.
   An entry couples to the tree by two strings; `test_mutation_witnesses.py`
   pairs `find` and not `expect_red`, so rewording a sub-check name — a normal
   correct edit, and precisely the "the app changed correctly" move this tier
   exists for — leaves a dead entry and a green pytest. Measured: green
   `6 passed` with a deliberately dead `expect_red`. The module's own docstring
   makes the argument for checking it. Fix verified feasible in the issue: join
   adjacent string literals (`re.sub(r'"\s*\+\s*"', '', src)`) and all ten
   resolve to exactly one place. Not fixed inline — it is a new assertion in a
   test, which fails prong 2.

2. **`npm run test:mutations` can never be green, from anywhere** —
   `ISSUE_20260915_npm_run_test_mutations_can_never_be_green.md`. The script
   passes no `--repo`, and because the browser tier is spawned *inside the
   shadow*, its `DATA_REPO` defaults to the shadow root, which by construction
   holds no `data/`. So the four `[real]` entries always miss and the command
   always exits 1 — in the main checkout too, not just a worktree. The lesson
   names this command as where the tier hangs off. The runner's note ("From a
   worktree, pass `--repo`") implies the main checkout does not need it, which
   is false. `apps/viewer/README.md` documents the working form correctly, so
   the tier itself is fine; the convenience entry point is not. Left unfixed
   because the note's correct wording depends on which of the two candidate
   fixes is chosen, and choosing is a behaviour call.

3. **The `SUITES` registry hand-restates every label it dispatches on** —
   `ISSUE_20260915_the_suites_registry_restates_every_label_it_dispatches_on.md`.
   The key is the printed label (the comment says so, and says `--only` filters
   can be copied off a failing line), but for three suites it is a copy of a
   `const label` in another function and nothing pairs them. All nineteen agree
   today; nothing keeps them agreeing. Two-line derived fix in the issue,
   checked against the green run: every suite already returns `{ label }`,
   including `testRespine`'s `${label} respine`, so asserting
   `result.label === key` lands green and only fires on drift.

### Nits

- **`"all eighteen"` in `mutation_witnesses.json`'s `about`, and the same word in
  the `--only` comment.** My merge made it nineteen. Both are prose quantities
  nothing reads from the tree, which `CLAUDE.md` calls a defect on its own
  terms. **Fixed inline** (a few lines, no behaviour, no new test): both now say
  "a full run of every suite", and the `about` block notes that the runner
  prints the real count rather than writing one down. The lesson's `18/18` count
  table is left alone — it is an accurate historical measurement on that branch.
- **`applyToShadow` uses `String.replace(find, replace)`** with a string
  replacement, so a future `replace` containing `$&`, `$'` or `$1` would be read
  as a substitution pattern and corrupt the shadow silently. None of today's ten
  contain `$`. A replacer function (`() => mutation.replace`) is immune. Not
  fixed: it is speculative today, and the entry that would trip it does not
  exist yet.
- **`page.waitForTimeout(450)`** after `setViewportSize(CARD_SCROLL_VIEWPORT)` is
  a fixed sleep, in the same diff that retires a fixed sleep on the stated
  principle that the effect is the thing to wait for. Mitigated by design,
  though: the `the document really scrolls at this viewport` tripwire is
  asserted immediately after, so an incomplete relayout fails loudly instead of
  measuring noise. Worth noting only because the next author will copy this
  block.
- **`test_the_anchor_reader_can_fail`** asserts that `.count()` of a string no
  file contains is `0`. That exercises `source_of`, not the anchor assertion, so
  it is weaker than its name claims. Harmless, and the real evidence arrived
  anyway: the assertion it stands in for fired on a genuine rot at merge time.
- **The `8` px trigger gap** in the new out-of-flow check is written out rather
  than read from the app's placement constant. It fails loudly rather than
  silently if the app's gap changes, so it is a maintenance cost, not a blind
  spot — and the neighbouring pre-existing checks already spell `16` the same
  way, so this is the file's convention, not a regression.
- **The overlay addition is twelve lines where the handoff asked for one.** The
  content is right and it correctly *appends to* the sweep's promoted entry
  rather than duplicating it, which is what the handoff actually cared about.
  The canonical prompt's "terse, a checklist not an essay" is the thing being
  stretched.

## Note for the next reviewer

- **Two new overlay entries**, both in the "guard that no longer witnesses"
  neighbourhood: one for the two-strings-one-pairing class (generalised past this
  table — ask it of any new declaration-plus-runner pair), and one telling you
  that `test_mutation_witnesses.py` is *expected* to redden at merge time when a
  handoff meets app code that moved underneath it, that this is the guard
  working rather than a defect in the work, and how to resolve it.
- **The lesson's §4 is the part worth reading before you mutate anything
  yourself.** It lists six guards the author mutated by hand and found sound,
  including the one interesting negative result: `position()`'s room cap reddens
  *as a suite-level `ERROR`*, because the uncapped card swallows its own trigger
  and the next hover times out. That red is real and louder than an assertion,
  but the runner can only attribute a *named* failure, so it cannot be declared
  as an entry. Both the runner and the table's `about` block say so explicitly.
  If you hit a `NOT WITNESSED ... the suite ABORTED rather than failing a
  check`, that is this, and the answer is to narrow the mutation — not to
  conclude the guard is blind.
- **Mutation-tier cost, measured:** ~7 minutes for all ten with `--repo`; a
  single `--only <id>` on a browser entry is ~2 minutes (two runs of one suite,
  and `--only "topology file://"` deliberately matches two suites because
  `testRespine` prints `topology file:// respine`). A fast-tier entry is
  seconds. Cheap enough to run one entry during a review, which is the point.
