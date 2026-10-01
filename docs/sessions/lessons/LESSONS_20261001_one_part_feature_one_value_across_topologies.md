# LESSONS 2026-10-01 — one_part_feature_one_value_across_topologies

Handoff: `docs/sessions/active/HANDOFF_20261001_one_part_feature_one_value_across_topologies.md`.
Branch: `handoff/one_part_feature_one_value_across_topologies`, cut from
`integration` at `a6b805c`.

The handoff asked three questions by name. Answering them first.

## 1. One guard widening or two? Two — and the other was already done

The issue's read was that extending the same-part-same-value pairing to
topology edges and extending
`test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered`
were "probably one change". They are not, and the second was **already on the
baseline when this handoff was written**: `64f6da9`, 2026-09-30, the review-fix
commit for `vpa_pitch_linkage_topology_and_feature_fits`, added
`ALL_TOPOLOGY_FILES`, `test_a_topology_edges_workbook_only_value_is_untraced_too`
and `test_the_topology_workbook_scan_is_not_vacuous`. It reached trunk in the
2026-10-01 batch merge the handoff names as its own baseline, so the handoff
was describing work that had landed hours earlier.

The evidence they are two changes, not one deferred by accident:

- **They share no object.** S1 widens an *allowlist* (`_WORKBOOK_INFERRED_ALLOWED`)
  over one field of one edge — `dimension.source_ref.kind` versus
  `.confidence`. It is a per-document predicate: each topology is checked
  against the rule on its own, and the guard is parametrized per file. The
  pairing is a *relation between documents* and cannot be parametrized per
  file at all — it has to hold the whole corpus at once to compare anything.
- **They read different places.** S1 only ever looks at `dimension`. The
  pairing's whole point is that it must also read `properties`, because that is
  where the losing number lived. A shared helper would have had to serve a
  reader that must not see `properties` and one that must.

What *is* shared is the sentence in the SOP, and that is now written in one
place covering both (below).

## 2. The red, quoted

The guard, run on the tree with the cross-references committed and the data
still wrong:

```
E       AssertionError: one part+feature stated at two different nominals:
E           pitch_link / pitch_link_length:
E             pitch_system properties.nominal_length_mm = 109.4
E             vpa_pitch_linkage dimension.nominal = 105.9908
E       assert not [(('pitch_link', 'pitch_link_length'), [('pitch_system', 'properties.nominal_length_mm', 109.4), ('vpa_pitch_linkage', 'dimension.nominal', 105.9908)])]

tests\test_tolerance_stack.py:2172: AssertionError
1 failed, 2 passed, 162 deselected in 0.20s
```

To reproduce it on the branch tip: set
`topology_pitch_system.json`'s `properties.nominal_length_mm` back to `109.4`.

## 3. Does any OTHER part+feature pair disagree across the corpus? No

The guard answers this for free on its first run, and the answer is the thing
worth not rediscovering. Over every committed `topology_*.json`, with
`dimension_ref`s resolved, exactly **two** `(part, edge id)` keys recur:

| key | `pitch_system` | `vpa_pitch_linkage` | verdict |
|---|---|---|---|
| `pitch_link` / `pitch_link_length` | nominal in `properties`, 109.4 | `dimension.nominal` 105.9908 | the defect; corrected |
| `tan_link_mount_215175_002` / `tan_link_mount_height` | nominal 0.0, band ±0.1 | no `dimension` at all | nothing to compare |

A third key, `shank_out`, appears in three topologies and is correctly outside
the pairing: those are `kind: "gap"` edges, which carry no `part` (the
constructor refuses one) and measure three different clearances. **Keying on
edge id alone would have reported them as a three-way divergence** — the
part+feature grain is load-bearing, not decoration.

So the corpus holds exactly one such defect and it is now closed. Two further
scope limits are filed rather than left here:
`ISSUE_20261001_the_topology_pairing_compares_nominals_and_not_bands.md`
(no part+feature states two *comparable* bands today, so a band comparison
would be vacuous) and
`ISSUE_20261001_a_nominal_carried_in_edge_properties_has_nowhere_to_carry_a_source_ref.md`
(the pairing can check that two `properties` nominals agree; it cannot check
that either is cited, because `properties` has no field in which to say so).

## 4. What reads `pitch_system`'s `pitch_link_length`, and what moved

**Nothing committed moved.** Stating it outright, as the handoff asks.

Enumeration, done before touching the value:

| reader | reads what | moved? |
|---|---|---|
| `study_pitch_system_blade_angle_average` / `_worst`, `study_pitch_system_end_stop_minus7` / `_plus72`, `study_pitch_system_vertical_hub_to_pitch_arm` (5 studies name the edge in `selection`) | the edge's **`dimension`** — nominal 0.0, ±0.03 — never `properties` | no |
| `study_pitch_system_gas_spring_branch`, `_gas_spring_mechanical_stroke` | the topology, not this edge | no |
| `tolerance_stack/topology.py`, `fold()`, `summarize()`, `check_study()` | nothing: the module docstring states that nothing here reads `properties`, and a test pins it | no |
| `scripts/build_topology_projection.py::project_edge` | copies `edge.properties` into the projection verbatim | the bytes change; nothing downstream reads them |
| the DAG page (`apps/viewer/topology.js`, `VA.edgeCard`) | `edge.dimension.source_ref` only — **not** `edge.properties`, **not** `edge.note`, **not** `dimension.note` | no |
| `tests/test_fit_bound_features.py:200,472` | `pitch_link_length` on **`topology_vpa_pitch_linkage`**, not this one | no |

Demonstrated rather than argued: all 22 committed studies were re-run before
and after the correction and their results and checks dumped. **1004
numeric/boolean leaves compared, 5 moved** — and all five are
`result.chain[7].edge.properties.nominal_length_mm`, the corrected input echoed
back into the chain. No total, no band, no check verdict, no `nominal` sum
changed, so nothing's conclusion flipped and the handoff's HITL item does not
trigger. The script is reproducible: load every `study_*.json`, `summarize` +
`check_study` each, serialise, and compare only the numeric and boolean leaves
(comparing the whole dump is useless — it embeds the notes you just rewrote).

## Decisions I made that were not in the handoff

**The cross-reference went in `dimension.source_ref.note`, not the edge note.**
The handoff says "each document's edge note". I checked what actually reaches a
reader of the running app: the DAG page's edge card renders
`edge.dimension.source_ref` through `VA.citationCard`, which prints
`source_ref.note`. `edge.note`, `dimension.note` and `edge.properties` all
reach the projection and **no surface**. `vpa_pitch_linkage`'s existing
cross-reference was in `dimension.note` — document-only. I moved it rather than
copying it, so the fact stays written once and is now also visible to someone
who never opens the JSON.

**Four sites inside `topology_pitch_system.json`, not one.** The 109.4 was in
the edge's `properties`, in the part's `note`, in
`provenance.geometry_not_in_the_bands`, and once more inside the citation
note's own argument about the wrong link. Correcting only the first would have
left three plausible-looking restatements.

**The SOP's rule now says "document", not "stack".** Not strictly the
"listed divergence" the handoff authorised a SOP edit for, but the amendment
said *"in every stack that uses it"* while three guards now cover topologies,
and a rule whose written scope is narrower than its mechanism teaches the wrong
thing to the next author. One sentence, naming the new guard.

**I did not correct `link_angle_deg: 77`.** It is `K2` of the same
`260825_End_Stop_JC.xlsx` K-block that produced the wrong `K3`, and it was
never re-checked when that row's owner was re-identified either — so it is the
same class. But it has **no second measurement to check it against**: the 3DX
sweep sheet carries node coordinates, not a link angle, and "angle relative to
what" is stated nowhere. Inventing a correction would be the exact thing this
repo exists to prevent. Flagged in the edge note and filed in
`ISSUE_20261001_four_documents_outside_the_topologies_still_state_the_superseded_pitch_link_length.md`.

## The guard could not be enrolled, and the reason is worth knowing

`CLAUDE.md` says a guard is enrolled in the same change. I wrote the spec, the
mutations were exact, and the harness refused it before applying either:

```
  clean run of python / tests/test_tolerance_stack.py...
  SKIPPED: the tier is already red with NO mutation applied, so nothing this
  entry does would prove anything. Fix the tier first.
    | FAILED tests\test_tolerance_stack.py::test_the_claim_corpus_exempts_dated_history_on_purpose
    | FAILED tests\test_tolerance_stack.py::test_the_coverage_sets_the_doc_scans_walk_are_non_empty_and_complete
    | FAILED tests\test_tolerance_stack.py::test_every_traced_ratio_publisher_declares_the_current_figure
```

`SHADOWED` copies `apps/`, `scripts/`, `docs/topologies`,
`docs/tolerance_stacks`, `docs/spec_library`, `tests/`, `tolerance_stack/` and
`.gitignore`. The claims-corpus guards read `README.md`, `CLAUDE.md`,
`ARCHITECTURE.md`, `docs/DAG_TOPOLOGY.md`, `docs/SOP_TOLERANCE_STACK.md`,
`docs/prompts/` and `docs/sessions/` — none of them. **`tests/test_topology.py`
is blocked the same way and worse** (13 failed / 134 passed in the shadow, on
`docs/DAG_TOPOLOGY.md`). So no pytest guard in either of the repo's two largest
guard modules can be enrolled today, and because the census cannot see a pytest
guard at all, nothing says so.

I withdrew the spec rather than leaving it `NOT WITNESSED` — a decayed witness
exits non-zero, and handing the operator a red merge-time tier to record an
enrollment is the wrong trade. The spec, both mutations verbatim and the
one-line fix are in
`ISSUE_20261001_no_pytest_guard_in_the_two_largest_test_modules_can_be_enrolled_because_the_shadow_omits_the_documents_they_read.md`,
and the guard's own docstring says it is unenrolled and points there.
`scripts/run_mutation_witness_tests.mjs` is fenced out of this handoff
(`mutation_witness_shadow_is_per_run` owns it), which is why this is an issue
and not a two-line diff.

**No pin moved and nothing reddened**: `node scripts/guard_enumeration.mjs`
confirms `python_not_censused`, so `DECLARED_GUARDS` needed no edit — which
also means no conflict with the parallel handoff.

## Gotchas the next session should not pay for again

- **A raw-JSON scan of `docs/topologies/` understates what the corpus states.**
  Four topologies carry `dimension_ref` into a stack file and nothing else;
  `load_topology` resolves those at load. Scanning the JSON text shows them as
  valueless and you will conclude the corpus has far fewer values than it does.
  Use `load_topology`.
- **`nominal == 0.0` means "no nominal stated", not "zero millimetres"** — the
  variation-only convention, declared in `topology_pitch_system`'s own
  `provenance.variation_only` and pinned by
  `test_the_pitch_system_dimensions_are_variation_only`. A pairing that
  compared `dimension.nominal` naively would have reported 0.0 vs 105.9908 for
  every variation-only edge.
- **The browser tier can run from a worktree.** It fails with
  `ERR_MODULE_NOT_FOUND: playwright-core` because node resolves by walking up
  from the script's own directory. A directory junction fixes it and is
  gitignored:
  `New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules`.
  That let the TRUTH tier run against **this** tree's apps and this tree's
  projections, instead of pairing master's app with my projection.
- **Pass `--repo "C:/workspace/tolstack"` with forward slashes and quotes.**
  Through the Bash tool the backslash form is eaten and you get
  `spawn C:workspacetolstack\venv-win\Scripts\python.exe ENOENT`, which looks
  like a missing venv and is not.
- **`--only` matches the spec's file slug, not the guard's prose name.**
  `--only "states one nominal"` matches nothing and prints all 128 entries;
  `--only "states-one-nominal"` works.
- **`PROVENANCE.md` row 96 needs amending for any edit to
  `tests/test_tolerance_stack.py`**, additive or not —
  `test_this_branch_amended_the_row_of_every_imported_file_it_changed` compares
  against the merge-base and prints the exact clause to append.

## Still to do

Four issues filed, all `open`:

- `ISSUE_20261001_no_pytest_guard_in_the_two_largest_test_modules_can_be_enrolled_because_the_shadow_omits_the_documents_they_read.md` (`bug`, `med`) — carries this guard's spec.
- `ISSUE_20261001_four_documents_outside_the_topologies_still_state_the_superseded_pitch_link_length.md` (`chore`, `med`, `audience: strategy`) — including **F12**, whose open Jeff question the correction effectively answers, and `BRIEF_20260916_link_name_authority.md`, which is open and partly built on the old figure.
- `ISSUE_20261001_a_nominal_carried_in_edge_properties_has_nowhere_to_carry_a_source_ref.md` (`feature`, `med`, `audience: strategy`).
- `ISSUE_20261001_the_topology_pairing_compares_nominals_and_not_bands.md` (`chore`, `low`).

`ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`
carries `handoff:` pointing at this one, so dispatch resolves it on Complete.
That is correct here: this handoff is the fix, not merely the finder.
