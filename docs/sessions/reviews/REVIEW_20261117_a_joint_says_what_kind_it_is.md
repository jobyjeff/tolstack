---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_a_joint_says_what_kind_it_is.md
reviewer: agent
date: 2026-11-17
verdict: APPROVE
blockers: 0
---

# Review — a_joint_says_what_kind_it_is

Reviewed `handoff/a_joint_says_what_kind_it_is` at `df13a375`. The branch
already contained `integration` (`e464809e`), so `git merge` was a
fast-forward and the reviewed tree is the landed tree (`b16290de`). The
handoff branch did not move during the review, and the tactical worktree was
clean.

## What I verified

- **Deliverables 1–8, against the diff.**
  - `INTERFACE_KINDS` gains `revolute` and `fastener_pattern`. Each has a
    comment line and a row in `docs/DAG_TOPOLOGY.md` "Joint glyphs".
    `vocab.gen.js` is regenerated, and the generated-file test is green.
  - `Node.interface` is checked in `__post_init__`. A one-part node is
    refused, and so are `planar` and `clearance` on a shared node
    (`SHARED_NODE_INTERFACES`, paired with the doc through `_DOC_VOCABULARIES`).
  - `model_view` uses `node.interface or CONTACT_KIND`.
  - The four nodes carry the word, with dated notes. No id was added, moved
    or renamed.
  - `VA.mapSymbolOf(iface)` reads the kind alone. Its one call site and the
    witness spec were updated with it. The layout's `symbols` key is gone from
    the file, the loader and the doc.
  - The kind is printed through `VA.interfaceKindWord` in the tree row and
    the Preview chip.
  - `end_surface_class` / `AA.endSurfaceClass` read the stated word right
    after a declared face, through one generated tuple.
  - `LINKAGE_JOINT_INTERFACES["revolute"] == "revolute"`, and the pairing
    test now reads model-view interfaces and the sweep's body pairs, with
    `compared == 6` pinned.
  - The three issues are closed out as asked.
- **Model sizes, recomputed:** v2 has 15 parts, 25 nodes and 30 edges; v1 has
  35, 79 and 99. Both match the DoD. On v1 the base↔blade interfaces are
  `hub_blade1_root_bearing_bore` (`revolute`) and `blade_root_hub_seat`
  (`contact`), consistent with the lesson's joint table.
- **Jeff's binding log was not written:** 84 files before my scratch build
  and 84 after the whole chain, matching the lesson's count.
- **The new Python guard has been observed failing.** I deleted `interface`
  from v1's `hub_blade1_root_bearing_bore` and ran
  `test_an_edge_at_a_swept_joint_says_what_the_joints_type_suggests`. It
  failed with `hub_blade1_root_bearing_bore: 'contact', joint blade_hinge
  (revolute) suggests 'revolute'`, which names the right node and the right
  word. I then restored the file, and the tree is clean.
- **The JS guards:** I re-ran the handoff's own witnesses `--only` (`__86fafce7`
  rotary DoD, `__1d6d60df` connector symbols, `__b20f0661`): 5/5 witnessed.
  The other new specs (`__4d6c2975`, `__2f5e192a`, `__6d321b6d`, `__c2adf3c9`)
  were witnessed 14/14 in the tactical run, and the gate below reached some
  of them.
- **The new words are paired with the INTERFACE_KINDS vocabulary:**
  `CONTACT_PAIRINGS` (`tests/test_interface_contact.py:150`),
  `NODE_GLYPH_PRECEDENCE` (fast tier, sorted-set pairing),
  `VA.INTERFACE_KIND_WORDS` (`VOCAB.table`, throws on drift), and
  `VA.MAP_SYMBOLS` (keys = glyphs + `contact`).
- **Shots read with vision.** `19_three_round_symbols_side_by_side.png`: boss
  in bore, rotary and slide are plainly distinct at 1× and 3×. `02`: the
  bearing has the rotary symbol on the map. `14`: in Classic, a chord crosses
  the rotary arc (filed, see below).
- **The lesson's arithmetic:**
  - The joint table matches the code and the sweep pairing.
  - The `compared == 6` count is pinned by the test.
  - The binding fold counts are recorded with digests. I did not re-fold;
    no id changed, which is the structural reason they must match.
  - The kind-printing site list matches the diff (`nav.js`,
    `views/topology.js`, `views/map.js` title, `interface_glyphs.js`,
    `topology.html`). The left-alone sites are argued.
  - The play paragraph is present and is not a design.

### Tolerance-stack mandatory checks

This handoff adds no stack element, band, `source_ref` or value, so checks
1–7 have nothing to audit. A `revolute`/`fastener_pattern` word is a label,
"a word, never an input: nothing folds it", and `fold()` is untouched. No
`data/inbox/specs/` change, and nothing was written into drawing-checker.

## Tests

**Pre-merge risky subset** (merged tree = branch tip, since it was a
fast-forward), in the review worktree: `pytest -q tests/test_topology.py
tests/test_topology_map.py tests/test_feature_geometry.py
tests/test_model_view.py tests/test_js_vocabulary_is_generated.py
tests/test_js_python_vocabulary.py tests/test_mutation_witnesses.py
tests/test_architecture_inventory.py tests/test_interface_contact.py
tests/test_propose_bindings.py tests/test_contact_suggestions.py
tests/test_kinematic.py tests/test_topology_projection.py
tests/test_claims_registry.py` — **622 passed** in 287 s.

The tactical record is complete (default tier, both fast tiers armed,
`--only` browser suites, witnesses `--only`), so the benefit of the doubt
holds.

**Post-merge.** Scratch root `C:/workspace/tolstack/data/scratch/jk_review`:
`data/inbox`, `data/meshes` and the non-viewer projections were copied from
the main checkout. Every projection was rebuilt from the review worktree with
`--data-root`, from `review/a_joint_says_what_kind_it_is @ df13a375`. The one
`dirty: true` stamp is the copied `spec_library/library.json`, which was not
rebuilt here. I added `docs/`, a `venv-win` junction and `node_modules`
junctions.

| command | result |
| --- | --- |
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` (review worktree) | `1 failed, 2032 passed, 1 skipped, 4 deselected` in 462 s, recorded `--tier default` (inside budget). The failure is the documented worktree red `test_viewer_js_suite_is_green`, a tier SKIPPED for want of `data/projections/`. The tier ran armed below. This repo's conftest prints no contention header lines. |
| `node apps/viewer/run_tests.cjs --repo <root>` | **720/720** |
| `node apps/annotate/run_tests.cjs --repo <root>` | **324/324** |
| `node scripts/run_viewer_browser_tests.mjs --repo <root>` (whole tier) | **46/48**, 1128 checks, 2177 s. Self-recorded `merge` row, `over: true` (appended to `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`) |
| `node scripts/run_mutation_witness_tests.mjs --repo <root> --changed-since integration --budget-min 10` | **21/21 witnessed**, 21/32 reached, 11 left to the sweep (budget), exit 0 |
| `... --only __86fafce7 --only __1d6d60df --only __b20f0661` (the handoff's own entries left by the cap) | **5/5 witnessed** |

**The two red browser suites are flakes shared with `integration`.** Each
was run `--only` on this merge and on a `git archive integration` export
(`data/scratch/jkr_base`), against the same root:

| suite | merge runs | integration runs |
| --- | --- | --- |
| a suggestion names its face ... | whole tier red; `--only` red, green | `--only` green, red |
| leaders across the seam ... | whole tier red; `--only` red, green, red | `--only` red, red |

The red sub-checks are the same on both sides. In the suggestion suite, the
mount's suggestion line never appears (`face NaN`). In the leaders suite they
are the scene-pick check and the two tangential-link `[real]` checks. Neither
suite touches the four nodes. Filed as
`ISSUE_20261117_the_suggestion_names_its_face_suite_flakes_with_the_mount_line_never_appearing.md`
and
`ISSUE_20261117_leaders_across_the_seam_flakes_on_integration_in_three_different_sub_checks.md`
(the 11-04 issue for the leaders flake was auto-closed by a handoff and never
verified).

Not exercised: the annotate `run_browser_check.mjs` mock pass. The diff
touches `endSurfaceClass`, not scene or placement wiring, so that row's
trigger does not apply.

## Findings

No blockers.

**Should-fix (left unfixed, so each has an issue):**

1. **`apps/viewer/element_record.js:236` restates the model view's rule in
   JS.** The node record computes `parts.length === 2 ? (node.interface ||
   "contact") : null`, and `interface_glyphs.js` adds a hand
   `{ contact: "contact" }`. These are two more hand copies of
   `model_view.CONTACT_KIND`. Appended to the existing
   `ISSUE_20261110_the_model_object_hand_copies_three_python_vocabularies_instead_of_reading_vocab_gen.md`
   (deferred) rather than filing a twin.

**Design (filed, non-blocking):**

2. In Classic, a chord crosses the rotary glyph's arc at row pitch, so it
   reads much like the plain pin-in-bore ring (shot `14`). The lesson noticed
   it and left it because Classic is to retire.
   `ISSUE_20261117_design_classics_rotary_glyph_arrow_is_crossed_by_a_chord_at_row_pitch.md`
   (`low`).

**Nits:**

3. `docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md`
   (around line 89) still lists "A fastener pattern has no model word" as
   open, with the layout's `symbols` key in the present tense. Its issue is
   resolved now, and a strategy session reading the brief will see that from
   the linked issue. I left it alone rather than edit a strategy brief after
   the test run.
4. Refusing (rather than ignoring) a layout file that carries `symbols` is a
   new refusal on the projection build. It is fine under the
   operator-refusal check: the layout is agent-authored and tracked, so the
   test tier sees the defect before any rebuild Jeff runs. Noted only so the
   next reviewer does not re-derive it.

## For the next reviewer

`node scripts/run_viewer_browser_tests.mjs` honours only the **first**
`--only`: two flags ran 1 of 48 suites. Pair suites one invocation each.
(Added to the overlay.)
