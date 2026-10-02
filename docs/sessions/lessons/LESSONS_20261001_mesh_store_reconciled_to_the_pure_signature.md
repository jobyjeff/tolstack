# LESSONS 2026-10-01 — mesh_store_reconciled_to_the_pure_signature

Handoff: `docs/sessions/active/HANDOFF_20261001_mesh_store_reconciled_to_the_pure_signature.md`
Issue: `docs/issues/ISSUE_20260930_one_solid_two_geometry_signatures_across_two_runs.md`

## The one-line answer

The `depends_on` precondition (the rekey + fusion) was **already done** when
this session started, directly against the shared main-checkout
`data/meshes/` -- not by a tactical handoff, by the 2026-10-01 second triage
sweep itself (commit `82a40cb`), whose own message says so. So deliverable 1
needed no work. The actual job this session did was deliverable 2-4: repoint
every live, tracked reference to the old (pre-rekey) signatures and suffixed
`part_id`s, and confirm deliverable 3's guard already exists and already
fires.

## Deliverable 1 was already done -- verified, not re-derived

Read `data/meshes/` directly (gitignored, main checkout,
`C:\workspace\tolstack\data\meshes`) before touching anything. It already held
34 directories, all named under the new (pure-`shape_signature`) key, and the
`MS14101-3` duplicate (XCAF `0:1:1:249`) was already fused: the surviving
directory `815597cb2da7407eb0e4fc1ef51386a65c5df934401e623859625ab7e05404c9`
carries a `provenance.json.rekeyed.fused_with` entry naming the loser's old
signature and `C:\workspace\tolstack\data\meshes_superseded\
1ec77e91e25984c910283a463eb20b26439c36b46a713f1ea719afae187512a3` -- which
exists, intact, with its own `provenance.json`. **Nothing here needed doing.**

Every renamed directory's `provenance.json` carries a `rekeyed` block (old
signature, old `part_id`, a reason citing `shape_signature_is_pure`, a
`handoff` field and a `source_lesson` field). A second, more complete record
sits at `data/mesh_migrations/signature_migration_20261002T020432Z.json`
(gitignored, main checkout): one manifest, 33 entries, a `summary` (31
`renamed`, 1 `renamed_fused_survivor`, 1 `moved_aside_fused_loser`) that
matches the store exactly.

**Next agent: do not trust the `handoff` field in either of those records.**
It names `docs/sessions/HANDOFF_20261001_mesh_store_rekeyed_to_the_pure_signature.md`,
which does not exist anywhere in this repo's git history -- not staged, not
active, not completed, on any branch, and the script that produced the
migration manifest is not in this repo's tracked tree either (`grep -r
"signature_migration\|mesh_migrations" scripts/ tests/ docs/` finds nothing).
`source_lesson` (rotorkit's `LESSONS_20261001_shape_signature_is_pure.md`) IS
real and resolves -- that is the one worth following. Filed as
`ISSUE_20261001_rekeyed_mesh_provenance_cites_a_handoff_file_that_does_not_exist.md`
rather than fixed: rewriting a citation field across 32 gitignored directories
is outside this handoff's scope (the alias table and its guards), and closing
it needs a decision (write the missing doc pair after the fact, or correct
the citation) that isn't mine to make unilaterally.

## Deliverable 2: the alias table repoint

Built the authoritative old-signature -> new-signature / new-`part_id` map
by reading every directory's own `provenance.json.rekeyed` block (ground
truth, not re-transcribed from the rotorkit lesson's prose table) and used it
to rewrite `docs/topologies/part_mesh_aliases.json`:

- **3 `mesh_part_id` values** actually needed changing (the only suffixed
  ones in the table): `spherical_bearing_pitch_link` (`_9bfdb344` ->
  `_815597cb`), `spherical_bearing_tan_link` (`_84a75703` -> `_34f032f0`),
  `blade_root` (`_1ed2bfd5` -> `_bb3745d2`). Every unsuffixed `mesh_part_id`
  (the other 18 rows) is unchanged -- the rename only ever moved the
  *directory*, and the resolvers match on `part_id`, read live from
  `provenance.json`, never on directory name.
- **24 evidence/notes lines** quoting a full sha256 directory name needed the
  same old->new substitution -- every row that cites `data/meshes/<hash>` in
  its prose, whether or not that row's `mesh_part_id` itself changed. This
  class was NOT named in the handoff text (which only called out the
  functional `mesh_part_id` resolution) but is caught by a pre-existing test
  (next section) and is the same "name a thing that no longer exists" defect.
- **2 bare 8-hex citations** in the table's own historical `notes` array
  (`` `_9bfdb344` ``, `` `_84a75703` ``) needed the same fix -- these aren't
  full sha256 and aren't in an `evidence` field, so neither regex pass above
  caught them automatically; found by a final grep sweep for the five old
  identifiers across every file this session touched.

## Deliverable 3: the guard already exists -- it just never had anything to catch until now

`tests/test_part_mesh_aliases.py` already carries two `[real]`-tier guards
that make a stale alias loud, both pre-dating this handoff:

- `test_every_mesh_side_value_matches_an_installed_meshes_part_id` -- every
  `mesh_part_id` must resolve to a live installed `part_id`.
- `test_every_sha256_quoted_in_an_evidence_string_names_its_own_mesh` -- every
  sha256 an evidence string quotes must be the directory that row's
  `mesh_part_id` actually maps to.

Ran the suite **before** touching the alias table: both failed, loudly --
the first named the 3 orphaned `mesh_part_id`s, the second named all 21 rows
quoting a now-nonexistent directory. That is deliverable 3, already built and
already firing; this handoff needed no new guard. Confirmed the reverse too:
deliberately corrupted one `mesh_part_id` after the fix and reran -- the same
guard failed with a clear message naming the row and the installed-`part_id`
set. **The surface it reports on is a pytest failure** (named per the
handoff's own "a check whose only output is a pytest failure is a fair
answer, but name it as that"), not a UI or a build-time warning.

Both tests are `[real]`-tier (`@pytest.mark.skipif(installed_meshes_dir() is
None, ...)`), resolving `data/meshes` via the worktree-relative path first,
falling back to the main-checkout absolute path -- so they run meaningfully
from a worktree with no extra arming, which is how this session could verify
both the RED and the GREEN state from here.

## Deliverable 4: every `part_id` consumer, and what happened to each

Grepped the whole tracked tree for the five old identifiers (`9bfdb344`,
`84a75703`, `1ed2bfd5`, `1ff0bced`, `1ec77e91e259`) and for `part_id` usage in
every `.py`/`.js` file under `scripts/`, `tolerance_stack/`, `apps/`, and read
each hit:

| site | changed? | why |
|---|---|---|
| `docs/topologies/part_mesh_aliases.json` | yes | 3 `mesh_part_id` fields, 24 evidence shas, 2 bare-suffix notes |
| `docs/topologies/topology_vpa_pitch_linkage.json` | yes | 2 note fields quoting old suffixed ids; 1 note rewritten from "the store now holds two directories for it" (no longer true) to the resolved history |
| `docs/topologies/topology_pitch_system.json` | yes | 1 note field quoting `_9bfdb344` |
| `tests/test_fit_bound_features.py` | yes | `BEARING_PART_ID` constant was stale, silently `skipif`-ing 8 `[real]` geometry tests; repointed to `asm217755_MS14101_3_815597cb` |
| `tests/test_feature_geometry.py` | yes | same `BEARING_PART_ID` constant, silently skipping 2 `[real]` tests |
| `apps/annotate/run_tests.cjs` | yes | one hardcoded `[real]` ground-truth check used the old bearing id |
| `tests/test_fit_bound_features.py` line 422/441 | **deliberately left** | `sha_for("asm217755_MS14101_3_1ec77e91")` -- the OTHER old bearing id, the fused *loser*. Its test needs an installed mesh under an ambiguous product number that also carries a `placements.json` expansion sidecar; that case no longer exists anywhere in the live store now that the duplicate is fused and the loser moved to `data/meshes_superseded/`. Filed as `ISSUE_20261001_the_ambiguous_number_plus_expansion_test_has_lost_its_only_live_example.md` rather than fixed -- there is nothing live to repoint it to, and retiring vs. keeping it dormant is a call this handoff has no standing to make. |
| `scripts/build_topology_projection.py` `resolve_mesh`/`mesh_fact` | no change needed | reads `part_id` live off `provenance.json` at call time; no literal id |
| `scripts/fit_bound_features.py` | no change needed | same -- `provenance.get("part_id")`, never a literal |
| `tolerance_stack/topology.py` | not applicable | its `part_id` is the topology-side vocabulary (an edge's `part`), a different namespace from a mesh's `part_id`; the alias table is the only sanctioned bridge between them |
| `apps/annotate/{app,commands,config,fixtures,storage/*}.js`, `apps/viewer/{tests,topology,topology_fixtures,vocab.gen}.js` | no change needed | grepped for the five old identifiers across the whole tree; none of these files quote one -- all resolve `part_id` dynamically |
| `data/inbox/feature-identity/` (the real binding event log) | no change needed | empty but for the tracked `README.md` placeholder -- no committed binding event cites any of the five old identifiers, so no production data was affected |
| `data/projections/{viewer,feature-geometry}` | **not rebuilt this session** | generated, gitignored, main-checkout-only; both predate even the producer rekey (mtime Oct 1 18:21, rekey at 19:04) and would need rebuilding against a tree containing this branch's changes -- i.e. after merge, by whoever runs `scripts/rebuild_projections.ps1` next, per `CLAUDE.md`'s own ordering |

## The full-suite record

**Worktree** (`C:\workspace\tolstack-worktrees\mesh_store_reconciled_to_the_pure_signature`),
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs`:

```
SKIPPED [1] tests\test_fit_bound_features.py:422: the 2026-10-01 re-extraction
  of the pitch-link bearing is not installed, so no mesh here pairs an
  ambiguous number with an expansion
1 failed, 1443 passed, 1 skipped in 291.52s (0:04:51)
```

The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
reporting the `node-fs` tier SKIPPED because `data/projections/viewer/results.json`
does not exist at the worktree-relative path -- exactly the documented,
deliberate worktree limitation (`CLAUDE.md`: "a skipped tier is not a passed
one," since 2026-09-18). Not a regression from this change: this test fails
the same way in any worktree with no projection built, before or after this
session's edits. The one skip is the deliberately-left site above.

**Before** touching the alias table, ran `tests/test_part_mesh_aliases.py`
alone to capture the RED baseline this session's whole premise rests on: `2
failed, 5 passed` (the two guards above, naming every stale row). **After**:
`7 passed`.

Also ran, from this worktree, `node apps/annotate/run_tests.cjs`: `177/177
passed`, including the now-un-skipped `[real]` bearing ground-truth check.
This one needs no projection rebuild -- it reads `data/meshes/` live, same as
the python `[real]` tier.

**Not run this session, and why:** the three main-checkout-only node tiers
`CLAUDE.md` names (`node apps/viewer/run_tests.cjs`,
`node scripts/run_viewer_browser_tests.mjs`,
`node scripts/run_mutation_witness_tests.mjs`). Running them meaningfully
requires rebuilding `data/projections/` from code that includes this branch's
changes, which requires this branch to be checked out in the main checkout --
not a tactical agent's call, and the existing main-checkout projections
already predate the producer-side rekey (let alone this session's alias
fix), so running those tiers against them right now would prove nothing about
this change and could surface unrelated stale-data noise. This is the
reviewer's / batch-merge's step per `CLAUDE.md`'s own sequencing
("rebuild projections BEFORE those three, never after").

## Follow-ups filed

- `ISSUE_20261001_rekeyed_mesh_provenance_cites_a_handoff_file_that_does_not_exist.md`
  (chore, low) -- the dangling `handoff:` citation in every rekeyed
  `provenance.json`, and the untracked migration tool.
- `ISSUE_20261001_the_ambiguous_number_plus_expansion_test_has_lost_its_only_live_example.md`
  (chore, low) -- the one `[real]` test this handoff's own fusion permanently
  retired, with no live case to repoint it to.
