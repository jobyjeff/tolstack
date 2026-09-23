# LESSONS 2026-09-22 — findings_splitter_scopes_to_excluded_terms

## The rule, in one sentence

**` -- ` is the author's what/why split in an `excluded_term` and part of the
*name* in an `edge.name` or `node.name`, so the findings table splits the
`excluded_from_model` bucket and takes `unverified_value` /
`no_tolerance_recorded` whole** — because those two buckets are filled by
`VA.studyAttention` pushing `edge.name`, and the edge's name is what the
contributions grid one block above already calls that row. Splitting it
renamed the edge on the findings row *and* presented the clarifier in the fold
as the author's argument for why the value is unverified, which is a sentence
nobody wrote.

The decision is a declaration rather than a condition at the call site:
`VA.STUDY_FINDING_SOURCES` now maps each gap kind to
`{ bucket, reasonSplit }`, so the bucket a kind reads and the vocabulary that
bucket speaks are one row of one table. A fourth kind cannot arrive with the
question unanswered — a fixture test asserts `typeof reasonSplit === "boolean"`
for every entry, and that the named bucket is a list `VA.studyAttention`
actually fills.

## Before / after on the live projection

All five `pitch_system*` studies chain the edge
`piston end to end-stop feature -- the end stop`. Measured by running
`VA.studyFindings` over `C:\workspace\tolstack\data\projections\viewer\topologies.json`
with `HEAD:apps/viewer/topology.js` and then with the fix (both in a bare
`vm` sandbox, no DOM). `pitch_system_end_stop_minus7`, the
`unverified_value` row:

| | row `<summary>` | the fold's `.tvfind__why` |
|---|---|---|
| **before** | `piston end to end-stop feature` | `the end stop` |
| **after** | `piston end to end-stop feature -- the end stop` | *(none — the `<p>` is not rendered)* |

Identical before/after on the other four (`…_blade_angle_average`,
`…_blade_angle_worst`, `…_end_stop_plus72`,
`…_vertical_hub_to_pitch_arm`). The same study's two
`excluded_from_model` rows are untouched and still split —
`piston end to end-stop feature (edge end_stop_clearance)` on the row, the
90-word `THE end stop itself; a real drawing candidate exists …` argument in
the fold. Those two are the same physical feature named twice by two different
conventions, which is as clear a demonstration of the defect as the projection
holds.

## The CSS clamp: yes, and measured rather than assumed

The handoff asked whether the row's clamp really handled an unsplit name with
no stylesheet change. **It does, and no stylesheet line was touched.** The
clamp is unconditional on `summary.tvfind__name` (`topology.css`), so the
longer name takes exactly the path a separator-less excluded term already
took.

Measured in Chrome at 1600×1000 on the live projection,
`pitch_system_end_stop_minus7` (ad-hoc playwright script, not committed):

```
line-height: 19.5
unverified_value | h=20 scrollW=416 clientW=416 clipped=false
                   ws=nowrap ov=hidden/ellipsis why=false
    "piston end to end-stop feature -- the end stop"
```

One line tall, and it does not even reach the ellipsis — at 416 px of name
column the whole 46-character name fits. Two of that study's excluded terms in
the same table *do* clip (`scrollW` 1615 and 1505 against the same 416), so the
clamp is demonstrably live on the surface being measured rather than merely
declared.

## The out-of-scope vacuity issue is unchanged — measured, not reasoned

`ISSUE_20260922_the_findings_whole_text_assertion_is_satisfied_by_the_gap_panel_beside_it.md`
was deliberately left open. I left the assertion alone, and the handoff asked
for an observation on whether this change alters whether it is vacuous.

**It does not.** Mutation: make `wholeFinding` return `whole.slice(0, 6)` as
the name — which truncates every unsplit finding on every surface — and
`[real] every finding a study raises is one row, and the count is the row
count` **stays green**, exactly as it did for the rationale-blanking mutation
the review measured. The `gapsPanel` in the same root still supplies the match.
Three *other* guards reddened under that mutation (the two fixture split tests
and `[real] a study fed by a zero-width row …`), which is the point: the guards
scoped to the node under test bite, and the one that reads
`root.textContent` does not. The brief
(`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`)
still owns that class.

## What the new fixture test needed, and why the whole class was one site

`arm_pin_to_tip` is the demo edge that is **both** `untraced` and
`zero_width`, so renaming it once in a `JSON.parse(JSON.stringify(TOPO))` clone
puts a clarified name into both unsplit buckets from one study
(`demo_base_to_tip`) — no fixture edit, no new fixture edge, and nothing
hand-patched into `topology_fixtures.js` (whose header forbids exactly that).
The same test carries an excluded term **with** a separator, so a "fix" that
simply stopped splitting anything reddens it; verified both directions by
mutation (`var split = true` → 496/497, `var split = false` → 494/497).

On "fix the whole class": `grep` for `splitAuthoredFinding` /
`AUTHORED_REASON_SPLIT` across `apps/`, `scripts/`, `tolerance_stack/` and
`tests/` finds **one** caller (`VA.studyFindings`) and **one** regex, so there
is no sibling site. Nothing else in the repo parses ` -- `.

## For `mutation_witness_repair_and_enrollment` (which owns the witness file)

That handoff notes a witness staged against `VA.splitAuthoredFinding` and that
this session "will change which buckets reach it". It does, and the staged
witness still works: forcing the splitter to return the whole string
(`var split = false` at the call site, the same observable behaviour) reddens
`[real] an incomplete check states what is missing ABOVE its number, and its
verdict is visibly qualified` — the test that entry names — plus
`an incomplete check's bottom line is visibly qualified …` in the fast tier.
What changed is the *blast radius*, not the killing test: the mutation now
only reaches excluded terms, so the two name buckets no longer contribute to
its death. `scripts/mutation_witnesses.json` was not touched here.

## Tests

- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` — **497/497
  passed, no tier skipped** (fixture + node-fs `[real]`, from this worktree
  against the main checkout's projections).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` —
  **25/25 browser checks passed**, all sub-checks green.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` — **1208
  passed, 1 failed in 48.8 s**, the one failure being
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, which is the
  documented worktree-only red: `data/` is gitignored, so the node-fs tier has
  no projection *in this worktree* and the test refuses a skipped tier. The
  first bullet above is that same tier, run where a projection exists.

Two spellings that cost me time and are worth writing down:

- **`--repo C:\workspace\tolstack` under the Bash tool loses its backslashes.**
  It arrived as `workspacetolstack`, the harness resolved a `data/` path that
  does not exist, and the run reported `1 TIER SKIPPED` — which reads exactly
  like the worktree case it is not. Use `C:/workspace/tolstack`.
- **An ad-hoc playwright script in the scratchpad cannot `import
  "playwright-core"`** — the scratchpad is outside any `node_modules` chain.
  `createRequire("C:/workspace/tolstack/package.json")` resolves it without a
  junction (the junction is still needed for
  `scripts/run_viewer_browser_tests.mjs` itself, run from the worktree; mine
  was created, used and removed — `(Get-Item $p).Delete()`, never
  `Remove-Item -Recurse`, which would recurse through it into the main
  checkout's `node_modules`).
