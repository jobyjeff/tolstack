---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_mutation_witness_tier_repair.md
reviewer: agent (review/mutation_witness_tier_repair)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — mutation_witness_tier_repair

**APPROVE.** All three deliverables land, and the two that are *checks* were
observed failing in both directions rather than accepted on green. A bare
`npm run test:mutations` witnesses **12/12** declared mutations with no `--repo`
and no note. Two corrections to the lesson applied inline (a mechanical claim
that is wrong about which tier reads `data/meshes/`, and a "would compare a
string to itself" claim that a one-word mutation refutes); three issues filed,
one of them the residual risk that single-sourcing created and none of them
blocking.

The seven **mandatory checks** of this repo's checklist (traceability, signs,
material corners, LMC/MMC, RSS, nominal-in-band, traced ratio) are **not
applicable**: the diff touches no stack, no element, no `source_ref` and no
number that any worksheet reads — it is test tooling plus its own two docs.

## What I verified, and how

Merged `handoff/mutation_witness_tier_repair` into `review/…` — **clean
fast-forward-style merge, no conflicts**. `integration` had moved one commit
(`eed004b` → `3141e51`, a board move for `extracted_mesh_alias_rows`) since the
review branch was cut; nothing it touched overlaps this work. Containment
checked before starting (`git merge-base --is-ancestor`) — the handoff branch
was **not** already in `integration`, so the merge-and-watch step was real.

`npm install --no-audit --no-fund` (one package, 2s), then — because this
worktree needed to be structurally identical to the main checkout for the
`[real]` tiers — `data/projections` + `data/meshes` copied in (21 MB,
gitignored, copy not junction, same as the author did and for the same reason).

| run | result |
| --- | --- |
| `venv-win/Scripts/python.exe -m pytest -q` (before the data copy) | 1 failed, **883 passed, 1 skipped** |
| `venv-win/Scripts/python.exe -m pytest -q` (after) | 1 failed, **884 passed** |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **360/360** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **19/19 suites**, every printed label identical to its registry key (Chrome 152.0.7977.83) |
| `npm run test:mutations` — **bare, no `--repo`** | **12/12 declared mutations witnessed**, exit 0, no note printed |

The one failure is the **pre-existing `integration` red** the author filed as
`ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`
(`test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`,
on `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`).
Neither that brief nor `tests/test_provenance.py` is touched by this diff — the
failure is inherited, correctly filed rather than reworded from inside an
unrelated handoff, and the issue's frontmatter is exactly right (`found_by:`,
not `handoff:`). Both pytest lines match the lesson's §4 prediction including
the skip→pass, which is the data copy and nothing the work changed.

### The new guards, broken on purpose — four observations

A green run proves nothing about a check, so each new assertion was made to
fire, from both the declaring side and the declared-about side:

1. **`expect_red` rotted from the table's side.** One entry's `expect_red` →
   `"a check name nobody prints"`: `test_every_expect_red_resolves_to_exactly_one_place`
   fails in **0.12s**, names the entry, the file (`apps/viewer/tests.js`) and
   the match count. This is the measurement the handoff asked for, reproduced.
2. **…and from the tree's side, which is the real scenario.** Reworded the
   sub-check name *in `apps/viewer/tests.js`* ("states it in plain words" →
   "SAYS SO in plain words") and reverted: same assertion red in 0.11s. That is
   the "the app changed correctly" edit the whole tier exists for, now a
   millisecond finding instead of a seven-minute one.
3. **A reworded suite label.** `SUITES` key `"topology height budget"` →
   `"topology height ceiling"`: `test_every_browser_entry_names_a_suite_the_registry_dispatches_on`
   fails and prints the whole key list. Because the label is now single-sourced,
   renaming the key renames the printed label too — so this one assertion
   covers the drift the old two-hand-copies shape could not.
4. **The note's two branches, verbatim.** `--repo C:/no/such/tree --only
   annotate-link-withheld` → *"That path is the one --repo named"*, and the
   entry then really does report `NOT WITNESSED` with the fast tier red on a
   *different* check, exactly as the note claims. Projection moved aside, no
   flag → *"That path is this tree; …lives only in the MAIN checkout, so pass
   --repo <main checkout> (or build the projection)."* With the projection
   present, **no note at all**. The old message's falsehood is gone and what
   replaced it is a statement about the projection, not about a flag.

### Route (a)'s isolation claim — checked against the code, not the prose

The lesson's load-bearing argument is that passing `--repo` by default trades
away nothing. It is correct, and here is where it is enforced:
`scripts/run_viewer_browser_tests.mjs:127` routes only `/data/...` to
`DATA_REPO` and everything else to `REPO` (the shadow); `apps/viewer/run_tests.cjs`
splits `NODE_FS` (re-pointable) from `VIEWER_SRC` (always `__dirname`), with a
comment saying why. `SHADOWED` is still `["apps", "scripts"]`. So the app under
test remains 100% shadow and all twelve mutations are witnessed through it —
which the 12/12 bare run confirms end to end.

One consequence worth writing down rather than fixing: the `NODE_FS` seam
repoints **tracked** paths too, so the fast tier's `[real]` worksheet checks
read `docs/tolerance_stacks/WORKSHEET_*.md` from whatever `--repo` names. From
the main checkout, bare, that is the same tree and there is no divergence; from
a worktree with `--repo <main checkout>` it is trunk's worksheets against the
branch's app code — pre-existing `run_tests.cjs` behaviour, not introduced
here, and the reason a projections-only scratch `--repo` root fails exactly
three `[real]` checks.

## Findings

### Inline fixes (both inside the boundary; nothing else touched)

1. **Lesson §1's `data/meshes/` mechanism is wrong, and names the wrong tier.**
   It says the fast tier's `[real]` mesh checks "read `data/meshes/` as well as
   `data/projections/`, through `run_tests.cjs`'s node-fs shim". Measured:
   with `data/meshes/` moved entirely out of the tree, `node apps/viewer/run_tests.cjs`
   is **360/360**, both annotate-link entries included — the fast tier never
   reads that directory (`nodeFs.io` is used once, on
   `data/projections/viewer/results.json`), and mesh facts are baked into the
   topology projection as `part.mesh.installed` at build time. `data/meshes/`
   *is* needed, by the **browser** tier's `annotate flyout` suite. Fixed with a
   dated correction blockquote (the advice it gives is right; the reason is
   not). This is the canonical "audit the lesson's causal attributions" check,
   same shape as the atp-post `--data-root` sighting it cites.
2. **Lesson §2's "would compare a string to itself".** Refuted by measurement —
   see should-fix 1. Correction blockquote pointing at the issue.

Nothing else was edited: the code under review is unchanged by me.

### should-fix (all three filed as issues; none fixed by me)

1. **The single-sourced label is one word from a silent revert** —
   `ISSUE_20260915_the_suites_label_pass_through_is_one_word_from_a_silent_revert.md`.
   Changing the run loop's `runSuiteFn(label)` to `runSuiteFn()` leaves the
   browser tier `2/2 … exit 0` and pytest `10 passed`, with every suite
   printing `[undefined]` and returning `label: undefined`. Nineteen hand
   copies became one argument that nothing observes. The fix is the returned-
   value pairing the originating issue proposed, which the lesson dismissed on
   reasoning that holds only while the pass-through is intact. Not fixed
   inline: it is a new assertion plus a behaviour decision about how a
   mismatched suite reports, which fails prongs 1 and 2 — and the handoff
   explicitly preferred single-sourcing to a pairing test, so adding the pairing
   is the *next* decision, not this one's.
2. **`--only "annotate flyout"` aborts, while the full run passes it** —
   `ISSUE_20260915_annotate_flyout_suite_is_red_alone_and_green_in_a_full_run.md`.
   Strict-mode violation: `tr.tvrow[data-id='arm_pin_to_tip'] .tvcell--name`
   resolves to two elements on the mock page, five runs in six, reproduced
   byte-identically against `integration` (`git archive integration` into
   `tmp/`). **Not this work** — the suite body is untouched — but it matters
   here, because the mutation tier dispatches one suite per mutation, so a
   suite that is only green in company can carry no declared witness at all.
3. **`apps/viewer/README.md`'s mutation-tier paragraph is stale on both
   counts** — `ISSUE_20260915_viewer_readme_mutation_tier_paragraph_is_stale_on_both_counts.md`.
   "Three of the declared witnesses are `[real]` checks" — twelve entries, six
   `[real]`; and the commands block still shows only the `--repo` form, with
   `npm run test:mutations` (the entry point this handoff made work) absent
   from the file. The handoff explicitly fenced that file off, so file-don't-fix.

### Nits

- **The header comment's first `--repo` paragraph** (`scripts/run_mutation_witness_tests.mjs:22-25`)
  still reads "the `[real]` witnesses are skipped … **without it**", which is
  true of the projection and false of the flag, two lines before the paragraph
  that explains the default. The antecedent is ambiguous rather than wrong, so
  it is left alone; scoping it to "when the tree you run from has no
  `data/projections/viewer/`" would remove the second reading.
- **`joined_source` closes every `" + "` seam in the whole file**, not just the
  ones inside a sub-check name. It is used only for counting a declared name,
  and `test_closing_the_concatenation_seam_is_load_bearing` keeps the joining
  from going quietly dead — a good test, and the reason this is a nit and not a
  finding. A contrived pair of adjacent literals could in principle manufacture
  a second match; nothing in the tree does today.
- **`suite_registry_keys()` slices on `"const SUITES = ["` … `"\n    ];"`.**
  Brittle to re-indentation, but it fails loudly (`ValueError`, or the
  `assert keys` guard), which is the right failure direction for a reader.
- **Every count in the lesson re-derived and correct**: 6→10 tests (+4, and the
  suite total moved 881→885 accordingly), twelve entries, nineteen suites,
  **four** in-body `const label` copies (the issue said three — the author found
  `testHostedUnpublished` too, and `git show integration:…` confirms four),
  8 browser + 4 fast entries, 360/360, 19/19, 12/12, and both pytest lines.
  The lesson is also honest that the DoD run happened in the worktree rather
  than the main checkout and says exactly why — the right call, and the code
  path exercised (`repoArg === null → DATA_REPO = REPO`) is the one a
  main-checkout run takes.

## Checklist maintenance

Three entries appended to `docs/prompts/REVIEW_AGENT.md` ("Recurring bugs"),
all new classes rather than second sightings: mutate the *argument* after a
single-sourcing fix; settle a `--repo`/`NODE_FS` seam claim by deleting the
directory (one `mv`); and a suite green in a full run is not green, because the
mutation tier runs suites alone.

## Note for the next reviewer

`extracted_mesh_alias_rows` is active and the three handoffs sequenced behind
this one rename sub-checks and suite labels — which is now the cheapest
possible thing to get wrong and the cheapest possible thing to notice:
`pytest -q tests/test_mutation_witnesses.py` (0.1s) reddens on a reworded
sub-check name or suite label, and it will land in *their* diffs, not this one.
When it does, that is the guard working; re-copy the name into
`scripts/mutation_witnesses.json` rather than loosening the assertion.
