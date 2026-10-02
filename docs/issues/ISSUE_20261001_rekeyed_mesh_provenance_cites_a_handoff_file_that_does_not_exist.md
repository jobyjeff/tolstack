---
type: chore
priority: low
area: data/meshes
reporter: agent
found_by: docs/sessions/HANDOFF_20261001_mesh_store_reconciled_to_the_pure_signature.md
status: deferred
class: dangling_provenance_citation
defer_until: 2026-11-01
resolution: deferred 2026-10-02 (triage) -- `low`, deferred by default under the budget rule. NOT fixed inline despite being a citation correction: the wrong value lives in gitignored data/meshes/*/provenance.json across many directories, so it is a data migration over shared state, not the one-line tracked-frontmatter fix this sweep did make twice elsewhere. ISO date rather than a class trigger: this sweep measured 283 issues workspace-wide already deferred behind class triggers whose live count the budget rule itself drove below the CLASS_WAKE_THRESHOLD of 3 -- see dispatch/docs/issues/ISSUE_20261002_a_class_defer_trigger_cannot_fire_once_the_budget_rule_has_deferred_the_class.md.
---

# Every rekeyed mesh's `provenance.json` cites a handoff file that was never written

## What happened

`data/meshes/` was rekeyed to the pure `shape_signature` (zeroed mutable OCCT
flag bits) and the `MS14101-3` duplicate (XCAF `0:1:1:249`) was fused, before
this handoff ran -- confirmed by reading the store directly (gitignored, main
checkout: `C:\workspace\tolstack\data\meshes`). Every renamed directory's
`provenance.json` carries a `rekeyed` block recording the move, e.g.:

```
"rekeyed": {
  "old_signature": "9bfdb34447e8...",
  "old_part_id": "asm217755_MS14101_3_9bfdb344",
  "reason": "shape_signature_is_pure (2026-10-01) zeroed three mutable OCCT
             bookkeeping flag bits before hashing, ...",
  "handoff": "docs/sessions/HANDOFF_20261001_mesh_store_rekeyed_to_the_pure_signature.md",
  "source_lesson": "docs/sessions/lessons/LESSONS_20261001_shape_signature_is_pure.md"
}
```

The `handoff` field names a file that does not exist anywhere in this repo's
git history -- not staged, not active, not completed, on any branch. `git log
--all --oneline -S mesh_store_rekeyed` finds exactly one hit: the 2026-10-01
second triage sweep's own commit message (`82a40cb`), which says plainly that
*it* performed the rekey+fusion directly as part of landing rotorkit's
producer fix in that day's batch merge -- not via a dispatched tactical
handoff. So the dependency this handoff's own `depends_on:
[mesh_store_rekeyed_to_the_pure_signature]` named was genuinely satisfied; it
was just executed inline by the sweep rather than as a tracked session, and
the provenance metadata was written as if the latter happened.

A second, better-organized record of the same run turned up at
`data/mesh_migrations/signature_migration_20261002T020432Z.json` (gitignored,
main checkout) -- a single manifest with every one of the 33 old-signature
entries, their `action` (`renamed` / `renamed_fused_survivor` /
`moved_aside_fused_loser`), and a `summary` block (31 renamed, 1 fused
survivor, 1 moved-aside loser, matching the store exactly). It names the same
nonexistent `handoff` field. **The tool that produced this manifest is not in
this repo's tracked tree at all** -- `grep -r "signature_migration\|mesh_migrations"
scripts/ tests/ docs/` finds nothing, and `data/mesh_migrations/` carries no
`README.md`, unlike every other `data/inbox/*` directory this repo's
convention gives a tracked placeholder. Whatever ran the rename-and-fuse
(clearly a real, careful tool -- dry-run support, per-entry provenance
rewrites, an audit manifest) exists only wherever it was run from, not in this
repo.

## Why it is worth a line

`source_lesson` (rotorkit's `LESSONS_20261001_shape_signature_is_pure.md`) is
real and resolves. `handoff` does not, and nothing distinguishes the two
fields' reliability at a glance -- a future reader chasing the citation (the
same instinct this repo's whole "cite a source_ref, never invent" ethos asks
for) hits a dead link across every one of the 32 renamed directories plus the
fused one.

## Repro

```
venv-win/Scripts/python.exe -c "
import json, pathlib
for d in sorted(pathlib.Path('data/meshes').iterdir()):
    pf = d / 'provenance.json'
    if pf.is_file():
        rk = json.loads(pf.read_text(encoding='utf-8')).get('rekeyed')
        if rk:
            print(d.name, rk['handoff'])
"
```
Then: the printed path does not exist under `docs/sessions/` on any ref.

## Not fixed here

Out of this handoff's scope (`docs/meshes/` rename bookkeeping across 32
gitignored directories, not the alias table or its guards). A fix would either
write the missing handoff/lesson pair after the fact (crediting the sweep) or
correct the `handoff` field in each `provenance.json` to point at whatever
record *does* cover the work (arguably the triage commit itself, which has no
conventional citation form here). Whoever picks this up should decide which.
