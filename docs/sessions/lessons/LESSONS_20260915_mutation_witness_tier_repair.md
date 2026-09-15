# LESSONS 2026-09-15 — mutation_witness_tier_repair

Handoff: `docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md`.
Branch `handoff/mutation_witness_tier_repair`, cut from `integration`.

Three repairs to the tier `guard_mutation_witness_tier` shipped the day before,
consolidated out of its own review's three issues. Nothing here changes what the
tier *claims*; it changes whether the claims can be checked cheaply, and whether
the shortest command that invokes it can pass.

## 1. Deliverable 1 — route (a), and the measurement that decided it

**Route (a): the mutation runner passes the real repo's `data/` through by
default.** One line:

```js
const DATA_REPO = repoArg === null ? REPO : normalize(repoArg);   // was: ... : null
```

…plus `tierCommand()` now always emitting `["--repo", DATA_REPO]` rather than
emitting nothing when the flag was absent.

The handoff offered (b) — mandatory flag, hard-coded into `package.json` — as the
fallback if shadowing the data path broke the isolation the shadow exists for.
**It does not, and the reason is worth stating once so nobody re-derives it:
route (a) shadows nothing.** No `data/` is copied and `SHADOWED` is untouched;
the shadow still holds exactly `apps/` + `scripts/`. All that changed is which
directory the *spawned tier* is told to read the projection from — and both tiers
already draw a hard line there, documented in both of them: the app's own files
always come from the tree the tier is running in, and only the projection is
re-pointable. So the mutated app under test is still 100% shadow, which is the
isolation that matters. Nothing was traded away, so (b) never got built.

### What the defect actually was, stated so it is not re-derived

`run_viewer_browser_tests.mjs` and `run_tests.cjs` each resolve their data root
from **the directory their own script lives in** (`join(HERE, "..")`). The
mutation runner spawns them from inside `tmp/mutation-witness/`, so that
directory is the **shadow** — and the shadow, by construction, never holds a
`data/`. With no `--repo` passed through, the tier therefore looked for the
projection *inside the shadow* and found nothing. That is independent of which
tree the run started from: a bare `npm run test:mutations` failed every `[real]`
witness from the **main checkout** exactly as it did from a worktree. The old
note's "From a worktree, pass `--repo <main checkout>`" framed a total failure as
a worktree escape hatch.

### The note now asks the only question that decides anything

Not *was a flag typed?* but *is the projection actually under the path we
resolved?* A default `--repo` that happens to land on a worktree is the same
situation as a mistyped one, and the old gate could not tell them apart.
Measured, both branches:

```
node scripts/run_mutation_witness_tests.mjs --repo C:/no/such/tree --only hosted-page
note: no topology projection under C:\no\such\tree (looked for
data/projections/viewer/topologies.json), so every `[real]` witness will be
skipped by the tier it runs in and reported as a MISS. That path is the one
--repo named.
```

```
# projection moved aside, no --repo
note: no topology projection under
C:\workspace\tolstack-worktrees\mutation_witness_tier_repair (looked for
data/projections/viewer/topologies.json), so every `[real]` witness will be
skipped by the tier it runs in and reported as a MISS. That path is this tree;
data/projections/viewer/ lives only in the MAIN checkout, so pass --repo <main
checkout> (or build the projection).
```

With the projection present, **no note prints at all** — which is the other half
of the fix. The old one printed on every flagless run whether or not it was true.

### The definition-of-done run

```
> tolstack-browser-tests@0.0.0 test:mutations
> node scripts/run_mutation_witness_tests.mjs

building the shadow tree at ...\tmp\mutation-witness
--- card-layout-out-of-flow
  clean run of browser / topology file://... green
  mutated run... WITNESSED
  ...
12/12 declared mutations witnessed
```

No `--repo`, no note, exit 0. (The handoff says ten declared mutations; the table
merged in at twelve. The same twelve, all witnessed.)

**How that was run, stated plainly, because it is not literally what the handoff
asked for.** The handoff wanted the bare command run *from* `C:\workspace\tolstack`.
A tactical agent must not write tracked files into the main checkout, so the
branch's `scripts/` only exist in this worktree and the command could not be run
there. What was done instead: `data/projections` and `data/meshes` (21 MB,
gitignored) were **copied** into this worktree, making it structurally identical
to the main checkout for every path these tiers read — and then the bare command
was run here. That exercises the exact code path a main-checkout run would
(`repoArg === null` → `DATA_REPO = REPO` → a `REPO` that holds the projection);
the only thing it does not prove is that `C:\workspace\tolstack\data` and the
copy of it are the same bytes, which `cp -r` is entitled to be believed about.
A copy, not a junction: a directory junction into the main checkout's `data/` is
one `rm -rf` at worktree cleanup away from deleting gitignored data that exists
nowhere else.

**Two things that will bite the next agent running this tier in a worktree**, both
costing a full failed sweep to discover:

- **`npm install` in the worktree first.** `node_modules/` is gitignored, so a
  fresh worktree has none, and node resolves `playwright-core` by walking up from
  `tmp/mutation-witness/scripts/` — which finds nothing above the worktree root.
  The first sweep here died with `ERR_MODULE_NOT_FOUND: Cannot find package
  'playwright-core'` on all eight browser entries while the four fast-tier ones
  passed, which reads exactly like a browser-tier regression and is not one.
- **`--repo` alone is not enough for the fast tier's `[real]` mesh checks.** They
  read `data/meshes/` as well as `data/projections/`, through `run_tests.cjs`'s
  node-fs shim, which repoints wholesale. Point `--repo` at a tree that has both.

`LESSONS_20260915_guard_mutation_witness_tier.md` §1's "where it hangs off" claim
(`npm run test:mutations`) is now true as written. It was repaired by making the
command work, not by editing the lesson — a lesson is a record of what a session
found, and this one found the right thing and shipped it half-wired.

## 2. Deliverables 2 and 3 ended up guarded by ONE mechanism, in pytest

Both strings are now paired in `tests/test_mutation_witnesses.py`, for the reason
its own docstring already gave about `find`: *a guard that quietly stopped being
checked is the exact failure mode the whole tier exists to kill, reproduced one
level up.* That module went 6 tests → 10 and still runs in ~0.1s.

- **`expect_red` → its tier's source.** `CHECK_SOURCE` (module-level, beside
  `TIERS`, per the repo's standing vocabulary rule) maps a tier to the file its
  sub-check names are written in. Note the fast tier's value: `apps/viewer/tests.js`,
  **not** the `apps/viewer/run_tests.cjs` the tier is *invoked* as — that file is
  only the harness. A test pairs `CHECK_SOURCE`'s keys against `TIERS`, so a new
  tier cannot arrive with no pairing.
- **`suite` → the `SUITES` registry keys**, read out of
  `scripts/run_viewer_browser_tests.mjs` rather than restated in the test.

### The seam, and why it needed its own test

Sub-check names are too long for one source line, so they are written as adjacent
string literals: `"the bar carries that one sentence " + "and nothing else"`. A
substring search for the joined name finds nothing. Closing the seam first
(`CONCATENATION_SEAM`, `re.compile(r'"\s*\+\s*"')`) resolves all twelve to
exactly one place.

A dead `CONCATENATION_SEAM` is not the hazard it first looks like: if the regex
stopped matching, every long name would fail loudly on the next run, which is a
fine way to find out. The hazard is the quiet one — if every declared name
happened to fit on one source line, the joining would be dead code, the pairing
would pass without exercising it, and nobody would know until the next long name
was declared and silently unpaired. Hence
`test_closing_the_concatenation_seam_is_load_bearing`, which asserts at least one
entry resolves **only** after the seams are closed.

Uniqueness is asserted **in the source, not per entry**: three preference
siblings deliberately declare the same `expect_red`, and two matches in the
source would mean the runner cannot attribute the red either — the same defect
one step along.

### Deliverable 3 was single-sourced, so it needed no pairing test of its own

The handoff asked for single-sourcing over a two-hand-copies test, and that was
structurally easy, which is worth recording because the issue that filed it
assumed otherwise and proposed a runtime `result.label !== key` check as the fix.

`SUITES` rows are now `[label, (label) => fn(..., label)]` — the key is handed to
the suite rather than restated inside it. Three changes made that reach all
nineteen:

1. The fifteen suites that already took their label as an argument: pass the
   parameter instead of re-typing the literal beside the key.
2. **Four**, not three, functions owned a `const label = "..."` in their body —
   the issue found `testRebuildAffordance`, `testAnnotateFlyout` and
   `testAnnotateHostedPosture`; `testHostedUnpublished` has one too. All four now
   take `label` as a parameter.
3. `testRespine` printed `` `${label} respine` `` from an argument spelling a
   *different* string than its key. A derived label is still a second copy of the
   key wearing a template string, so it now takes the printed label directly and
   its parameter is named `suite`, which is what it always called it internally.

After that there is exactly one copy of each label in the file, and the runtime
equality check the issue proposed would compare a string to itself. The one copy
that **cannot** be single-sourced away is `mutation_witnesses.json`'s `suite`,
because it lives in another file — which is precisely what the pytest pairing
above covers.

### Both demonstrated falsifiable, then reverted

```
# expect_red -> "a check name nobody prints"
FAILED tests/test_mutation_witnesses.py::test_every_expect_red_resolves_to_exactly_one_place
E  unpublished-banner-renders-at-all: its `expect_red` matches 0 places in
E  apps/viewer/tests.js (expected exactly 1). ...
1 failed, 9 passed in 0.10s

# SUITES key "topology height budget" -> "topology height ceiling"
FAILED tests/.../test_every_browser_entry_names_a_suite_the_registry_dispatches_on
E  assert 'topology height budget' in ('suite file://', 'suite http', ...)
1 failed, 9 passed in 0.12s
```

Both were ~7-minute browser findings before this session and are ~0.1s findings
now, which was the whole ask.

## 3. `integration` was red at the branch point, and it is not this work

First command of the session, before any edit:

```
1 failed, 879 passed, 1 skipped in 27.97s
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
```

`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62` says
a behaviour "is byte-for-byte what `viewer_transport_honest_hosted` shipped" and
names nothing that diffs bytes. Filed as
`docs/issues/ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`
rather than fixed here: it is a strategy brief, the sentence is load-bearing in
its own argument, and rewording someone's argument from inside an unrelated
tactical handoff is how a claim quietly changes meaning. Every agent cut from
`integration` this round starts red and pays the same few minutes deciding it
isn't theirs — worth someone's ten seconds early.

## 4. Where the numbers ended up

- `venv-win/Scripts/python.exe -m pytest -q` — **884 passed, 1 failed**; the
  failure is §3's, and the +4 over the 879-passed baseline are this session's
  new tests. **The baseline's 1 skipped became a pass**, which is nothing this
  session changed: a test skips when `data/` is absent, and this worktree has a
  copy of `data/projections` + `data/meshes` in it (see §1). In a worktree
  without that copy the line reads `883 passed, 1 skipped, 1 failed`.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` — **360/360**.
- `node scripts/run_viewer_browser_tests.mjs` (all nineteen suites, bare, with
  the projection present) — **19/19 browser checks passed**, every suite
  printing the label the registry keys it on (Chrome 152.0.7977.83).
- `npm run test:mutations` (bare) — **12/12 declared mutations witnessed**,
  exit 0.
