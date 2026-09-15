# LESSONS — extracted_mesh_alias_rows (2026-09-15)

**Verdict one-liner**: the eleven proposed rows merged unchanged — the live
`part_id`s still matched the 2026-09-14 lesson's literal strings, because
rotorkit's disambiguating suffix only fires on an *ambiguous* spec number and
none of the eleven is one. The handoff's "read the live provenance, not the
lesson" instruction still earned its keep: it is what made that a *measured*
fact rather than an assumption, and it cost one script.

## The row list, with what each resolved to

Read off `C:\workspace\tolstack\data\meshes\<sha>\provenance.json` on
2026-09-15. Diff this against a re-extraction's ids before touching the table.

| topology_part | mesh_part_id | mesh dir (first 12) | label entry |
|---|---|---|---|
| `pitch_plate_215177_001` | `asm217755_215177_001` | `365deebccbc4` | `0:1:1:1458` |
| `bushing_214820_002` | `asm217755_214820_002` | `ddf990824019` | `0:1:1:1463` |
| `straight_bushing_214820_002` | `asm217755_214820_002` | `ddf990824019` | `0:1:1:1463` |
| `plain_bushing_214943_002` | `asm217755_214943_002` | `7b30dea1c269` | `0:1:1:1441` |
| `bolt_nas6403u11d` | `asm217755_NAS6403U11D` | `85a7c4e39ef6` | `0:1:1:1466` |
| `bolt_nas6403u13h` | `asm217755_NAS6403U13H` | `2dbf77aff797` | `0:1:1:1451` |
| `bolt_nas6404u13d` | `asm217755_NAS6404U13D` | `aaf6260b234f` | `0:1:1:1440` |
| `washer_ms21299c3` | `asm217755_MS21299C3` | `70ef2db04b1e` | `0:1:1:1507` |
| `washer_ms21299c4k` | `asm217755_MS21299C4K` | `e13d2e96a250` | `0:1:1:193` |
| `washer_nas1149v0332h` | `asm217755_NAS1149V0332H` | `9f3a169037fe` | `0:1:1:198` |
| `washer_nas1149v0332_tt` | `asm217755_NAS1149V0332H` | `9f3a169037fe` | `0:1:1:198` |

Nine distinct meshes, eleven rows: `214820-002` and `NAS1149V0332H` each carry
two topology ids (one physical part, two joints), which is the one-part-many-ids
shape the table was built for.

**Why the ids did not move.** The handoff warned that
`rotorkit/docs/sessions/HANDOFF_20260915_mesh_install_part_id_integrity.md`
might append an 8-hex signature suffix to every id and rename every directory.
It has not landed, and more importantly it would not have mattered for these
eleven: `assembly.part_id` appends the suffix **only when one requested number
matched more than one distinct product label** (rotorkit's
`test_part_id_disambiguates_only_when_told_to`). In the live store exactly one
id carries a suffix — `asm217755_MS14101_3_9bfdb344` / `_84a75703`, the
`MS14101-3` pair — and that part is a *candidate*, not a row. So the eleven are
stable across that handoff in either order. A re-extraction of the **same**
assembly under the **same** scheme reproduces these ids; a re-extraction that
newly discovers a second product label for one of these nine numbers would
suffix it, and then this table's `[real]` tier goes red rather than silently
orphaning a row. That is the design working.

### `pitch_plate_215177_001` points at the installation, deliberately

`215177-001` is an *installation* in that assembly, so the mesh is the plate
plus its nine NAS77 bushings — 10 solids, `product_is_assembly: true`. The row
points there anyway, because the drawing number on both sides is
`215177-001` and that is what the identity claim rests on; pointing at
`asm217755_215735_001` (the one machined detail inside it) would be aliasing a
topology part to a *different* drawing number on the strength of a judgement
about what a consumer would rather look at. `manifest.json`'s per-face
`solid_id` already lets a reader address the plate alone inside the installation
mesh, so nothing is lost. If a consumer does want the bare plate, re-point the
row explicitly — the evidence string says so, so the next reader does not have
to re-derive this.

## The five candidates, and what each one needs decided

These meshes are installed and only the *mapping* is open. Each needs an
answer nobody can read out of the STEP; a wrong row here shows a reader a
plausible-looking wrong part, silently, which is strictly worse than the empty
state.

1. **`tan_link_mount_215175_002` → `asm217755_215175_001` or
   `asm217755_215198_001`.** Needs: *is `215175-001` the same part as
   `215175-002`, at a different revision?* A **drawing** question — the STEP
   build only contains `-001`. The family identity is already strong:
   tolstack's 2026-09-10 acquisition lesson traced `tan_link_mount_height` to
   drawing `215198` sheet 1 (`79.00 ±0.10`, exact band and nominal), and
   `215198-001` is precisely the machined detail sitting inside `215175-001`.
   So the open question is *only* the dash number, plus the same
   installation-or-detail choice `pitch_plate_215177_001` faced. Answer the
   dash number and this becomes two rows, not one.
2. **`spherical_bearing_tan_link` and `spherical_bearing_in_vpa` → three of
   `asm217755_MS14103_3`, `asm217755_MS14101_3_9bfdb344`,
   `asm217755_MS14101_3_84a75703`.** Needs: *which bearing is in the tangential
   link and which is in the VPA — and which of the two `MS14101-3` geometries
   is which?* Two ids, three meshes. The *spec* identity is well evidenced
   (tolstack traced rows 34/36/50/54/56 to MS14101-3 / MS14103-3 bore
   `4.826 mm +0.000/-0.013`, an exact band match, 2026-09-10) and the
   structural half corroborates it (`MS14103-3` and one `MS14101-3` occur
   inside `212956-005`, the link assembly). What nobody can read off either
   side is the **assignment**. Someone who can tell the two apart has to pick;
   the two `_9bfdb344` / `_84a75703` directories each carry a `repair` block
   naming their old shared id, and their placements are in `provenance.json`,
   so an assignment could be argued from where each instance sits. That
   argument has not been made.
3. **`flanged_bushing_tan_link` and `flanged_bushing_unidentified` →
   `asm217755_NAS77A3_015A` (8 instances) / `asm217755_NAS77A4_015A` (1).**
   Needs **two** answers, and the first may kill the question: *is
   `flanged_bushing_tan_link` even this family?* These nine bushings sit in the
   `215177-001` pitch-plate installation, and that id is a *tangential-link*
   id. If it is the wrong family, only `flanged_bushing_unidentified` is in
   play. Then: *which dash number answers to which id?* — a flange thickness
   read off the RBC NAS77 plain-bearing catalog already in
   `data/inbox/specs/` would settle it against the topology's own recorded
   value. That is a spec-library read, not a guess, and it is the cheapest of
   the five to close.
4. **`gas_spring` → `asm217755_PMF200521`, or the installation
   `asm217755_215176_002`.** Needs: *any evidence at all beyond adjacency.*
   `PMF200521` is a 2-solid vendor part (body + rod) occurring 3× inside
   `215176-002`, the sub-assembly that also holds `213668-002` — the gas-spring
   **mount** already aliased. A 2-solid vendor item next to the gas-spring
   mount is almost certainly a gas spring, and "almost certainly" is not the
   bar this table holds. A vendor datasheet for `PMF200521`, or a
   `215176-002` parts list, converts it to a row.
5. **`214723-002` (`asm217755_214723_002`) is a *fifth* installed mesh with no
   row and no candidate id**, offered in the rotorkit lesson as an alternative
   for `flanged_bushing_*`. Do not take it: tolstack's 2026-09-04 session
   hypothesised it as the gas-spring bushing and its 2026-09-10 session
   recorded **counter-evidence** (bore `⌀12.320 ±0.015` matches `215198`'s
   tangential-link attachment lug, not a gas-spring interface). The mesh is
   installed so the next person can look rather than re-litigate from the
   drawing; the counter-evidence stands and this needs a *new* hypothesis, not
   a decision.

Also installed with no topology id at all: `asm217755_212956_005` (the link
assembly), `asm217755_213863_004` (the link itself),
`asm217755_215735_001`, `asm217755_215198_001`, `asm217755_215176_002`,
`asm217755_MS14103_3`. Some are candidates' alternatives above; the rest are
context.

## The uniqueness test, and how it was shown to bite

`tests/test_part_mesh_aliases.py::test_installed_mesh_part_ids_are_unique`,
`[real]` tier. The store's `part_id` side now has **one** reader —
`installed_part_id_owners(meshes_dir)`, which returns `part_id -> [dir, ...]`
and deliberately does not collapse. The pre-existing orphan test now calls
`set(installed_part_id_owners(...))`, so the set is at the *call site* that
wants a set rather than inside the reader where a duplicate used to die.

Demonstrated red, then green, against a **throwaway** store (never
`C:\workspace\tolstack\data\meshes`): two directories carrying
`part_id: "asm217755_MS14101_3"`, the module's `MESHES_DIR_CANDIDATES`
monkeypatched at it, the shipped test function called directly —

```
RED as intended:
installed meshes collide on part_id -- every alias naming one of these
resolves to whichever directory is listed first: {'asm217755_MS14101_3': [...]}
GREEN once the two solids carry distinct part_ids
temp store removed: True
```

The script is in this session's scratchpad, not the repo: it is a one-off
demonstration of a shipped assertion, not a second test. The reproducible half
lives in the test's own docstring.

**Note on where this guard sits.** The docstring points at rotorkit's
producer-side half
(`ISSUE_20260915_mesh_install_path_two_silent_failure_modes.md`, staged there)
and says why the consumer-side one is still worth having: it holds for a mesh
installed by *any* route, including the hand copy that
`data/meshes/README.md`'s single-part recipe still describes.

## `data/meshes/README.md` — the count is **gone**, not moved

Asked explicitly by the handoff: neither prose nor test. Reasons, in order:

- A count pinned by a test would redden the suite every time rotorkit installs
  a part — a guard that fires on correct behaviour, which this repo's own
  review prompt logs as how a guard gets deleted.
- A count in prose is the defect that produced this deliverable: written for
  the two 2026-09-06 fixtures, still claiming two after an extraction installed
  an order of magnitude more.
- The count has no consumer. Every derived answer anybody actually reads is
  already built from the store: `build_topology_projection.py` stamps per-part
  mesh availability, and this file's `[real]` tier pairs the aliases against
  the live `part_id`s.

So `## What's here today` now says, in as many words, that it deliberately
lists nothing, and why — because an empty section invites the next agent to
helpfully re-transcribe a table. What replaced it is the store's *shape*, which
a count is not: how a mesh gets here (two routes), that all of them are at the
medium tier with each directory's own `provenance.json` as the authority, which
two came from single-part exports, and that an extracted mesh may be an
installation rather than a piece part.

Also corrected there, per the handoff: mesh installation is **no longer** a
manual copy-and-rename for the assembly route —
`rotorkit/scripts/extract_assembly_parts.py` writes the layout directly and
idempotently. The copy recipe survives only under the single-part-STEP heading,
which is the only route that still needs it. And a new section states the fact
the handoff flagged: for an extracted part `source_step_sha256` is a hash of
the extracted solid's canonical BRep, **not** of a STEP file, because there is
no per-part STEP upstream of it.

## Two things the next agent should know

### The suite was already red on trunk, and the handoff's baseline was wrong

The handoff states "baseline 880 passed, 1 skipped". The real baseline on this
branch's parent — clean tree, nothing of mine applied — is **879 passed, 1
failed, 1 skipped**:
`tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
trips on `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`,
prose the triage sweep itself wrote in `df21a4a` (contained by `master` and
`integration`). Filed as
`ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`
rather than fixed — it is another handoff's file and one word of prose, but it
means **every tactical handoff from this sweep will report a red suite it did
not cause**. Check that issue before assuming your own change did it.

It bit me once for real, too: the first draft of the new test's docstring
described the `MS14101-3` pair as "two byte-identical" product labels, and the
guard correctly caught it — a byte-identity claim with nothing named that checks
it. Reworded to what was actually measured ("two that hash to one geometry
signature"), which is both more precise and true. Worth knowing that this guard
reads **test docstrings**, not just docs.

### The viewer will not see these rows until the projection is rebuilt

The annotate app reads the tracked table at page load, so the rows take effect
on merge. The viewer gates on `parts[].mesh`, which
`build_topology_projection.py` stamps **at build time** — and the built
projection in the main checkout still carries exactly one `installed: true`.
Not rebuilt here: the builders refuse a write from a tree `master` does not
contain (exit 3), and four other handoffs from this sweep own the viewer.
Filed as
`ISSUE_20260915_the_shared_topology_projection_still_stamps_one_meshed_part_of_twelve.md`.

## Verification

- `tests/test_part_mesh_aliases.py`: **6 passed** (baseline 5 + the new
  uniqueness test), both `[real]` mesh-side tests running against the main
  checkout's store, not skipped.
- `node apps/annotate/run_tests.cjs`: **63/63**, both `[real]` tiers included.
  (The handoff cites 53/53 as the 2026-09-15 figure; the suite has grown to 63
  since, and both `[real]` checks ran — a skip there is the signal that you are
  not reaching the main checkout's `data/`.)
- `node apps/viewer/run_tests.cjs`: **298/298**, unchanged. Its node-fs tier
  skips in a worktree (it looks only at the worktree's own
  `data/projections/viewer/results.json`) — pre-existing, and the reason the
  viewer's own `[real]` mesh block did not exercise the new rows here.
- `venv-win/Scripts/python.exe -m pytest -q`: **880 passed, 1 failed, 1
  skipped** — the one failure is the pre-existing trunk failure above, present
  before any change on this branch, and the only unbacked byte-identity claim
  left in the tree is the brief's.
- **The empty state, measured per part.** Every live topology part resolved
  through `apps/annotate/commands.js`'s own `resolveMeshIdentifier` (the exact
  call the deep link's `isolate=` makes) against the real store, with
  `git show HEAD:docs/topologies/part_mesh_aliases.json` as the before:
  **11 gained a mesh, 1 already had one, 0 lost one**, 17 parts still honestly
  empty. The eleven that gained are exactly the eleven rows —
  `bolt_nas6403u11d`, `bolt_nas6403u13h`, `bolt_nas6404u13d`,
  `bushing_214820_002`, `pitch_plate_215177_001`, `plain_bushing_214943_002`,
  `straight_bushing_214820_002`, `washer_ms21299c3`, `washer_ms21299c4k`,
  `washer_nas1149v0332_tt`, `washer_nas1149v0332h`. The 17 still empty include
  all five candidates, which is the intended outcome.
- Uniqueness of the real store: 24 mesh directories, 24 distinct `part_id`s.
  Nothing was written into `C:\workspace\tolstack\data\meshes` by this session.
