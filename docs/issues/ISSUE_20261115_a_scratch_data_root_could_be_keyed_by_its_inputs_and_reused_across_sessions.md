---
type: feature
priority: low
status: deferred
defer_until: 2026-12-16
class: scratch_data_root_rebuilt_per_session
resolution: deferred 2026-11-16 triage -- low defers by default; 30-day date
area: tests/scratch-data-root
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261115_the_suite_stops_paying_for_the_same_tree_twice.md
---

# A scratch data root is rebuilt per session; keying it by its inputs needs a design call

Every worktree's default run is red by design until its session builds a scratch
data root (about 7 minutes: copy `data/inbox`, `data/meshes` and the non-viewer
projections, then build every projection with `--data-root <scratch>/data`; the
recipe is in `docs/prompts/REVIEW_AGENT.md`, "Arming the `[real]` tiers against the
MERGED tree"). The 2026-11-15 handoff `the_suite_stops_paying_for_the_same_tree_twice`
(item 6) asked whether a review could reuse its tactical session's root. It was
not built, because the honest key is not a small change.

## What stands in the way

- **The tree is not the key.** `scripts/projection_provenance.py` stamps branch,
  sha, dirty and the stacks dir, and gates on *ancestry*; it says nothing about
  content. A root keyed by `HEAD^{tree}` would hit only when a review's merged
  tree equals the tactical branch's tree, and a review merges `integration` into
  its branch first, so on any day integration moved it never does.
- **The honest key is the builders' inputs**, per projection: the builder
  script, the modules it imports, the tracked inputs `scripts/projection_freshness.cjs`
  (`projectionInputs`) already enumerates, **and the gitignored inputs that file
  lists as outside it** (`data/inbox/specs/` for `crops.json`, `data/meshes/`,
  `data/inbox/feature-identity/`). Those gitignored inputs are shared and change
  under any session, so the key needs a stat manifest (path, size, mtime) of
  roughly 350 MB of files, taken at build and compared at reuse.
- **A stale root that reads green is worse than 7 minutes.** The 2026-09-24 batch
  merge ran the viewer `[real]` tier 514/514 against a projection built before the
  merge. A reused root that quietly missed one input would be that incident again,
  with a cache's authority behind it.
- **Reuse also has to survive the recipe's own edits** ("re-add what the tactical
  agent removed": the `docs`/`venv-win` junctions), which is a second state a key
  would have to cover.

## Options for a strategy session

1. Leave it: 7 minutes per tactical session and per review (about 14 minutes per
   landing) against a correctness risk the suite has been bitten by.
2. Key per projection on `projectionInputs` plus a stat manifest of the gitignored
   inputs, store under the main checkout's `tmp\`, and **refuse (never fall back
   to quietly reusing)** when the manifest differs. Recommended only if the
   14 minutes shows up as the next bottleneck after this handoff's cuts; the
   refusal arm is the part that has to be tested first.
3. Skip the copy rather than the build: junction the read-only inputs into the
   scratch root where the main-checkout edit guard allows it (it refuses a
   `data/inbox` junction today), which removes the minute of copying and none of
   the build.

Nothing in the handoff's scope adds a tier, a gate or a refusal, which is why this
is filed rather than built.
