---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_mutation_witness_enrollment_backlog.md
---

# `.tvflag`'s "outlined, not filled" claim has no witness anywhere — the only fill census that exists runs on a page `.tvflag` never renders on

Found while transcribing `mutation_witness_enrollment_backlog`'s Set B row
`attention-flag-is-not-filled` (named for enrollment in
`docs/sessions/lessons/LESSONS_20260918_visual_rules_nothing_checks.md` §4,
sharing its `expect_red` with `crop-trigger-is-not-filled` on purpose). Its
declared mutation (`apps/viewer/topology.css`, `.tvflag`'s `background: none`
→ `background: var(--untraced)`) reproduced on 2026-09-18 but does **not**
reproduce now (measured 2026-09-22): `node scripts/run_viewer_browser_tests.mjs
--only "typography pass's visual rules"` stays green with the mutation
applied.

## Why

`scripts/run_viewer_browser_tests.mjs`'s fill census (`testTypographyRules`,
rule 2) reads `document.querySelectorAll(".chip, .tvflag, .verdict,
.tvverdict, button.crop-trigger")` — but it runs on the **stack view**
(`hub_bearing_thermal_fit_m1`, via `[data-nav-kind="stack"]`), and `.tvflag`
is written only by `apps/viewer/views/topology.js` (three call sites, all in
the DAG/topology grid row renderer). `apps/viewer/topology.css`'s own comment
at the `.tvflag` rule (line ~1001) says the elements/materials tables' flags
"fold into one `.chip--alert` ⚠" instead — i.e. the stack view has never
rendered a `.tvflag` at all. The only fill census in the repo
(`scripts/run_viewer_browser_tests.mjs:6105`) is scoped to that page, so it
matches zero `.tvflag` elements and the mutation has nothing to bite.

Cross-checked: no other browser suite reads `.tvflag`'s computed background
anywhere (`grep tvflag scripts/run_viewer_browser_tests.mjs` finds only the
stack-view census and one unrelated count of flags-per-row in a different
suite, `flags: rows.reduce(...)`, which counts elements rather than reading
their fill).

## What this means

Either the 2026-09-18 measurement was against a page that has since stopped
rendering `.tvflag` (a coverage regression), or it was already measuring a
census that happened to be vacuous for this one mark and the original "watched
reddening by hand" check missed that `.tvflag` requires the DAG/topology page,
not the stack page it was planted against. Either way, "the DAG's own
attention flag is outlined, not filled" is a real rule (stated in
`docs/DESIGN_TYPE_AND_COLOUR.md`'s emphasis-is-a-budget language) with **no
standing check anywhere in the repo today.**

## Fix shape

Either widen `testTypographyRules`'s fill census to also run once against a
topology/DAG leaf (where `.tvflag` actually renders), or add a second,
narrower census scoped to the DAG page. Not attempted here:
`mutation_witness_enrollment_backlog` is fenced to transcribing already-
measured mutations, not writing new assertions — the corresponding table row
is excluded from `scripts/mutation_witnesses.json` with this issue cited
rather than enrolled against a census that cannot see it.


---

## 2026-09-23 — not cleared by derived enrollment

`mutation_witness_derived_enrollment_and_gating`. The title is precise and it is
why this one is untouched by the rework: the claim has no witness **anywhere**,
so there is no guard for the enumeration to count. A census of guards cannot
report a rule that nobody wrote a check for. The fix shape in this filing — widen
`testTypographyRules`' fill census to a page `.tvflag` actually renders on, or
add a second one scoped to the DAG — is still the work, and the witness row
follows it rather than replacing it.
