---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-15 — extracted_mesh_alias_rows: 22 installed meshes are unreachable by topology part id

Source: triage sweep 2026-09-15, dispositioning
`rotorkit/docs/issues/ISSUE_20260914_tolstack_side_followup_for_extracted_meshes.md`
(chore, med) — filed in rotorkit because that is where the work was done, but
every file it names is tolstack's. Baseline: trunk after the 2026-09-15 batch
merge (880 passed, 1 skipped). Scope: `docs/topologies/part_mesh_aliases.json`,
`data/meshes/README.md` (tracked, despite living under `data/`), and
`tests/test_part_mesh_aliases.py`. Do NOT touch `apps/viewer/` or
`apps/annotate/` — four other handoffs staged this sweep own those — and do not
edit anything in `C:\workspace\rotorkit`.

## What happened, and why nothing in tolstack's tracked files knows

`assembly_step_part_extraction` (rotorkit, 2026-09-14) installed **22 new part
meshes** into `C:\workspace\tolstack\data\meshes\<sha>\`, extracted from
`217755-001 A.1 PROPULSION ASSEMBLY, PROPELLER, CW Released.stp`. `data/` is
gitignored, so **every tracked file in tolstack is unchanged** — deliberately:
that handoff was scoped to propose, not edit, and a rotorkit worktree must not
write tracked files into another repo's main checkout. The meshes are there
(25 entries under `C:\workspace\tolstack\data\meshes\` as of 2026-09-15,
including the README); they are simply unreachable by topology part id, so the
annotate app still shows its "no installed mesh" empty state for parts that now
have one.

**Read the installed meshes from the main checkout by absolute path** —
`C:\workspace\tolstack\data\meshes\<sha>\provenance.json`. Your worktree's
`data/` is empty and that is not evidence of anything.

## Deliverable 1 — the alias rows

`rotorkit/docs/sessions/lessons/LESSONS_20260914_assembly_step_part_extraction.md`
§"Alias proposals" carries **11 evidenced alias rows with their evidence** —
read it at `C:\workspace\rotorkit\docs\sessions\lessons\LESSONS_20260914_assembly_step_part_extraction.md`
(tracked in rotorkit; reading another repo's tracked file by absolute path is
fine, editing one is not). The rows cover `pitch_plate_215177_001`, both
`214820_002` bushing ids, `plain_bushing_214943_002`, three `bolt_nas640*` ids
and four washer ids.

**Derive each row's mesh-side value from the live `provenance.json` files, not
from the lesson's literal strings.** The lesson's proposals were written on
2026-09-14 and rotorkit has a handoff staged this sweep
(`rotorkit/docs/sessions/HANDOFF_20260915_mesh_install_part_id_integrity.md`)
that may change the `part_id` scheme — possibly appending an 8-hex signature
suffix to every id, which would rename every installed directory. Reading the
ids off the installed provenance at the time you run is what makes this handoff
correct in either order, and it is why this handoff carries no `depends_on`.
If you find the ids no longer match the lesson's proposals, that is the expected
case, not a blocker: take the live ids and say so in the lesson. If a proposed
row's part has **no** installed mesh at all, stop and report rather than
inventing a row.

Five further entries are offered as **candidates, not proposals** — their meshes
are installed and only the mapping is open. Do **not** guess them into the
table:

- `tan_link_mount_215175_002` — dash number differs.
- the two `spherical_bearing_*` ids — well-evidenced spec identity, but an
  undetermined two-ids-to-three-meshes mapping.
- the two `flanged_bushing_*` ids.
- `gas_spring`.

Leave each candidate out and record, in your lesson, exactly what a human or a
later session would need to decide to place it. A wrong alias row is worse than
a missing one: tolstack's `resolveMeshIdentifier` matches a `part_id` exactly
and silently, so a mismapped row shows a reader a plausible-looking but wrong
part.

## Deliverable 2 — the uniqueness test tolstack is missing

`tests/test_part_mesh_aliases.py::test_every_mesh_side_value_matches_an_installed_meshes_part_id`
collects installed ids into a **`set`**, so duplicate ids collapse before the
assertion. Verified 2026-09-15: nothing on either side of the repo boundary
guards uniqueness — and the collision is real, not hypothetical. `MS14101-3` is
three product labels in that assembly, two of them a different solid, and both
surviving geometries were installed under `asm217755_MS14101_3`; rotorkit
repaired those two directories by hand. Because the alias table resolves a
`part_id` exactly, a duplicate resolves to whichever directory is listed first.

Add `test_installed_mesh_part_ids_are_unique` — the tolstack half of
`rotorkit/docs/issues/ISSUE_20260915_mesh_install_path_two_silent_failure_modes.md`,
whose producer-side half is rotorkit's to write and is staged there. Your half
asserts that the installed store has no two directories claiming one `part_id`,
and it must **not** collapse them into a set to do it.

## Deliverable 3 — `data/meshes/README.md` is behind the data

- Its "What's here today (2026-09-06)" table lists **two** meshes; there are now
  **24**. Re-derive the table from the installed store rather than transcribing
  a number, and consider whether the count belongs in prose at all — this repo's
  standing rule is that a quantity written in prose which no test reads from the
  tree is a defect regardless of whether it is right today, and this file has
  now gone stale once.
- It documents mesh installation as a manual copy-and-rename with *"no script
  for this copy step yet"*. There is one now:
  `rotorkit/scripts/extract_assembly_parts.py` writes the `data/meshes/<sha>/`
  layout directly and idempotently. Update the prose to say so.

**One fact to get right while editing it:** an extracted mesh's
`provenance.json` `source_step_sha256` is a hash of the **extracted solid's
canonical BRep**, not of a STEP file — there is no per-part STEP upstream of it.
The provenance says so in its own `extraction` block, which also carries the
assembly's path and sha, the product name, its XCAF label entry and every
instance's placement matrix. The README should not imply a per-part STEP exists.

## Definition of done

- `tests/test_part_mesh_aliases.py` green with the new rows (it was **5 passed**
  against the newly installed meshes when the issue was filed, so that is your
  baseline for that file), and `node apps/annotate/run_tests.cjs` green — it was
  **53/53 with both `[real]` tier checks included**, verified 2026-09-15 before
  filing, so a skip there means you are not reaching the main checkout's data.
- `test_installed_mesh_part_ids_are_unique` exists and reddens on a planted
  duplicate. Demonstrate it: plant one in a temp store (do **not** create a
  duplicate in `C:\workspace\tolstack\data\meshes\`), show the failure, clean up.
- The annotate app no longer shows "no installed mesh" for the parts the 11 rows
  cover. Name the parts you checked and how.
- `venv-win/Scripts/python.exe -m pytest -q` green (baseline 880 passed,
  1 skipped).
- Lesson (`docs/sessions/lessons/LESSONS_20260915_extracted_mesh_alias_rows.md`):
  the final row list with the live `part_id` each resolved to (so the next
  re-extraction can diff against it); the five candidates with what each one
  needs decided; and whether `data/meshes/README.md`'s mesh count ended up in
  prose, in a test, or gone.
