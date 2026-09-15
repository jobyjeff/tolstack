---
type: bug
priority: med
status: open
area: tests/mutation-witness
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
---

# `npm run test:mutations` can never be green, from anywhere — and the note explaining why says the wrong thing

`package.json` gained `"test:mutations": "node scripts/run_mutation_witness_tests.mjs"`,
and `LESSONS_20260915_guard_mutation_witness_tier.md` §1 names it as *where the
tier hangs off*. It passes no `--repo`, and with no `--repo` **four of the ten
declared mutations can never be witnessed** — the `[real]` ones, which skip
without a projection.

That is not a worktree-only problem, which is the part worth writing down. The
mutation runner copies only `apps/` and `scripts/` into `tmp/mutation-witness/`,
and the browser tier it spawns there resolves its own default:

```js
// scripts/run_viewer_browser_tests.mjs
const REPO = normalize(join(HERE, ".."));                       // == the SHADOW root
const DATA_REPO = repoFlag === -1 ? REPO : normalize(...);      // == <shadow>/
```

`data/` is never shadowed, so `DATA_REPO` defaults to a directory that by
construction has no projection in it — **including when the tier is run from the
main checkout.** `node … --repo C:\workspace\tolstack` is not the worktree escape
hatch here; it is the only way the command works at all.

The runner's own note therefore states something false:

```
note: no --repo given, so every `[real]` witness will be skipped by the tier it
runs in and reported as a MISS. From a worktree, pass --repo <main checkout>.
```

"From a worktree" implies the main checkout does not need it. It does.

## Measured, 2026-09-15 (review of `guard_mutation_witness_tier`)

```
node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack
  10/10 declared mutations witnessed            exit 0

node scripts/run_mutation_witness_tests.mjs --only leader-style     # no --repo
  clean run of browser / topology file://... green
  mutated run... NOT WITNESSED — the tier stayed GREEN with the mutation applied.
  0/1 declared mutations witnessed              exit 1
```

`apps/viewer/README.md` documents the `--repo` form correctly, so a reader who
follows the README is fine. The defect is the shorter, more inviting command that
the lesson advertises as the hang-off point and that cannot pass.

## Two candidate fixes — pick one, don't do both by halves

1. **Default `--repo` to the real repo.** The mutation runner already knows its
   own `REPO` (the tree it copied *from*, not the shadow); passing that through
   whenever `--repo` is absent makes `npm run test:mutations` work from the main
   checkout and keeps the honest MISS + note from a worktree. Smallest change,
   and it makes the existing note true as written.
2. **Put `--repo` in the npm script** and reword the note to say the flag is
   always required. Blunter, and hard-codes a machine path into `package.json`,
   which this repo has avoided everywhere else.

Either way the note needs to agree with whichever is chosen. Whoever takes this:
re-run the tier both ways afterwards — a note about what a flag does is exactly
the class of claim `surfaces_that_state_something_false` was about.
