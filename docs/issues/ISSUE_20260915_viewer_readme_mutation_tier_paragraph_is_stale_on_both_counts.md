---
type: chore
priority: low
status: resolved
area: docs/viewer-readme
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md
handoff: docs/sessions/HANDOFF_20260916_doc_facts_and_projection_stamps.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `doc_facts_and_projection_stamps` moved to completed/; not independently verified.
---

# `apps/viewer/README.md`'s mutation-tier paragraph restates a count nothing pairs, and still presents `--repo` as the only way to run the tier

`mutation_witness_tier_repair` (2026-09-15) made a bare
`npm run test:mutations` witness every declared mutation — the runner now
defaults `--repo` to the tree it shadowed from, so from the main checkout the
flag is optional. Its handoff explicitly fenced `apps/viewer/README.md` off
(it belongs to `annotate_hosted_page_posture`), so the README was not updated
with it. Two things there are now wrong or stale:

1. **A hand-restated count with nothing pairing it to the table**
   (`apps/viewer/README.md`, "The mutation-witness tier"):

   > It takes `--repo` for the same reason the other two do: **three of the
   > declared witnesses are `[real]` checks.**

   `scripts/mutation_witnesses.json` holds **twelve** entries, **six** of them
   `[real]` (four browser preference/persistence entries, two fast-tier
   annotate-link ones). The number was right when written and nothing keeps it
   right — the same class the prior review already fixed twice inside the JSON's
   own `about` block ("all eighteen" → "a full run of every suite"). The fix is
   to stop counting: *"some of the declared witnesses are `[real]` checks"*, or
   name the runner's own printed note instead.

2. **The commands block shows only the `--repo` form**, and `npm run
   test:mutations` — the entry point the tier hangs off, named as such in
   `LESSONS_20260915_guard_mutation_witness_tier.md` §1 — appears nowhere in
   the README:

   ```powershell
   node scripts\run_mutation_witness_tests.mjs --repo C:\workspace\tolstack   # mutation-witness tier
   ```

   The two tiers above it in the same block each get the pair the repo's
   convention uses (`# this checkout` / `# ...from a worktree`). The
   mutation tier now deserves the same pair, with `npm run test:mutations` as
   the bare form.

## Fix shape

Three lines in one section, once `annotate_hosted_page_posture` (or whoever
next holds that file) is in there. Mirror the runner's own header comment,
which is accurate as of this branch: the flag defaults to the tree the shadow
was copied from, so it is needed only where that tree has no
`data/projections/viewer/` — and the runner says so on its first line when
that happens.
