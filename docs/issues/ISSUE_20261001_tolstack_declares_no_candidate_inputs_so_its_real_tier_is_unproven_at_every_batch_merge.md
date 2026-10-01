---
type: chore
priority: med
status: triaged
area: tests/candidate-provisioning
reporter: agent
class: shared_mutable_state_across_worktrees
found_by: docs/sessions/lessons/LESSONS_20261001_triage_sweep.md
handoff: docs/sessions/HANDOFF_20261001_declare_candidate_test_inputs.md
---

# tolstack declares no `[tests] candidate_inputs`, so every batch merge judges it on a candidate whose `[real]` tier could not run

Filed by the 2026-10-01 triage sweep, which met this on its own merge of
tolstack and is required to file it by the batch-merge duty
(`dispatch/prompts/TRIAGE_AGENT.md` step 4: *"file the `chore` that gets those
paths into that repo's `[tests] candidate_inputs`, whichever way the re-run
went"*).

## The mechanism

The batch-merge gate tests the **merge candidate** in a throwaway worktree, and
a fresh worktree holds only what git tracks. dispatch now provisions such a
worktree with
`dispatch.cli bridge-test-inputs <root> <candidate>`, which symlinks in the
interpreter always, plus **every path the repo declares** under `[tests]
candidate_inputs` in its own `.dispatch.toml`. tolstack declares nothing — no
repo in the workspace does yet
(`dispatch/docs/issues/ISSUE_20260930_no_repo_declares_its_candidate_test_inputs_yet.md`) —
so the candidate gets the interpreter and nothing else.

## What that cost this sweep, measured

The 2026-10-01 candidate run reported **`1 failed, 1437 passed`**:
`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, wrapping a JS
suite that reported `515/522`. All seven failing sub-tests traced to absent
gitignored inputs — three citing *"no live part has an installed mesh"* and
*"rebuild the topology projection against the main checkout's data/meshes"*,
the others naming spec PDFs (`RBC_Aerospace_Plain_Bearings_Web.pdf`,
`NAS6403-NAS6420 Rev 4.pdf`, `JB_NAS77.pdf`) that are present in the main
checkout and literally absent from the candidate:

| path | files, main checkout | files, fresh candidate |
|---|---|---|
| `data/meshes` | 176 | 1 (`README.md`, the only tracked entry) |
| `data/inbox/specs` | 60 | 1 (`README.md`) |

That red is the **invented** face of absence, which is the dangerous one: the
assertion messages are product-shaped and read like real findings. The merge
duty's own worked example is this exact repo (2026-09-29: seven `[real]`
failures, one a *content* claim; bridged and re-run, `516/516`). A gate agent
following the hold rules faithfully holds a good merge with impeccable
reasoning.

This sweep did not hold it — it diagnosed the red as a provisioning artifact and
merged, then proved trunk green in the main checkout, which has the real
`data/`: `pytest -q` passed once the projections were rebuilt from a clean tree,
and `node scripts/run_viewer_browser_tests.mjs` reported **25/25**. So the merge
was right. But the verdict came from a human-style diagnosis plus a second run,
not from the gate, and the next sweep gets to re-derive all of it.

## What to declare, and what must NOT be declared

Read-only, bridgeable — the inputs the builders and the `[real]` tier consume:

```
[tests]
candidate_inputs = [
  "data/inbox/specs",
  "data/inbox/drawings",
  "data/inbox/feature-identity",
  "data/inbox/tolerance_stacks",
  "data/meshes",
]
```

**Explicitly not bridgeable, and each for its own reason:**

- **`data/projections/`** — the actuator *writes* it. The merge duty rebuilds
  projections into the candidate's own `data/` precisely so the candidate is
  judged against its own tree; a symlink here would point that write at the main
  checkout's shared projection, which is the standing rule stood on its head and
  would corrupt every live worktree's `[real]` tier (the failure
  `ISSUE_20260930_a_rebuild_from_an_unlanded_branch_now_disarms_every_other_worktrees_real_tier.md`
  describes, caused deliberately).
- **`data/runs/`, `data/sessions/`** — written by runs.
- **A blanket `data/`** — wrong for exactly the reason above; the declaration
  names subdirectories by design.

`node_modules` is the open question, not a given: `playwright-core` lives only
in the main checkout and the browser tier needs it, so declaring it would let
the browser tier gate the merge too. That is a cost decision, below.

## The cost is tolstack's to choose, and it is not small

The duty is explicit that this trade belongs to the repo, once, in its
declaration — not to a sweep mid-run. The comparable measurement is rotorkit's:
its suite went from **2m49s to 31m55s** with its inputs bridged, because the
`[real]` tier then really parses STEP. tolstack's candidate run already takes
~2 minutes unbridged; bridging meshes and specs arms ~86 `[real]` checks, and
declaring `node_modules` would add the browser tier on top.

Two honest end states, and the repo picks:

- **Declare the inputs** — every batch merge really gates tolstack's `[real]`
  tier, and pays the minutes every sweep.
- **Declare less** — the sweep stays fast and those tiers are reported
  **unproven** at every merge, which is a legitimate choice as long as it is the
  declared one rather than an accident.

What is not acceptable is the status quo, where the tier is unproven *and* its
absence manufactures a red that looks like a defect.
