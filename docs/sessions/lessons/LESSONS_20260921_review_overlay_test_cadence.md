# LESSONS 2026-09-21 — review_overlay_test_cadence

Handoff: `HANDOFF_20260921_review_overlay_test_cadence.md`. Scope was one file,
`docs/prompts/REVIEW_AGENT.md`, and the question was whether its restatements of
test cadence contradicted the canonical prompt's new "Test cadence" section.

## Did the file hold instances beyond the three filed? Yes — one.

**Four total in 4528 lines.** Three were the issue's; the fourth the sweep found:

- the *"Also verify"* → **Tests** bullet (`pytest -q` "re-run it yourself rather
  than trusting the report");
- the **semantic-merge-conflict** check ("merge master into your review branch,
  and re-run the suite there"), whose tail also ordered a both-checkouts
  re-derivation to settle a stale lesson count — same shape, one bullet;
- the **topology-connectivity** entry in "Architectural errors to check": *"run
  the full suite, not the archetype's own test module, whenever a topology's own
  connectivity could change."* **This is the one the issue did not have**, and it
  is the easiest to miss for two reasons: it is 3000 lines further down, in a
  section nobody reads as being about cadence, and it is *conditional* ("whenever
  connectivity could change") rather than a blanket order.

The `:682-691` both-checkouts entry was left byte-identical, as the handoff
directed; item 1 now cross-references it by its quoted title.

### The greps that found them, and the ones that did not

`pytest -q` / `python.exe -m pytest` / `run_tests.cjs` finds instance 1 and a
dozen narrative mentions. It does **not** find instance 4, which never names a
command. The grep that does is the *phrase*: `full suite|whole suite|entire
suite|both checkouts|all three tiers`. **Run both greps; the command grep alone
under-counts.** A prose instruction to run everything does not have to contain a
command.

### Near-misses that are NOT instances, and why the distinction matters

Six overlay entries order a **tier** — `node apps/viewer/run_tests.cjs --repo`,
`run_viewer_browser_tests.mjs`, the mutation tier — some unconditionally, some
gated on a diff shape (CSS/layout, stack data). None is an instance. The
canonical cadence expressly allows "any tier this repo's overlay names as
critical for the surface that changed", so a named tier is the *mechanism* the
cadence wants, not a violation of it. The test I used: **does obeying this
sentence cost the long suite?** A tier is 30–90 seconds; the full pytest run is
~45s here, but the browser and mutation tiers are minutes to tens of minutes. If
you widen "instance" to include tier orders you delete the overlay's most
valuable content.

The unconditional one ("you re-run it yourself as `node apps/viewer/run_tests.cjs
--repo …`") deserves its own note: in a worktree that tier is not optional at
all, because `tests/test_viewer_js_suite.py` **fails on every branch** without
it. It is not distrust of the author — it is the only way to get any signal.

## No exception taken at item 3, and this is the argument

The handoff allowed me to conclude the semantic-conflict check needs a full
suite and leave it, with reasons. I did not, because the check's own recorded
sightings undercut that:

> a semantic conflict is a collision between **two file sets you can both
> enumerate**.

Every sighting in that entry is two named handoffs touching two named files
(`hardware_entries.json` + `test_tolerance_stack.py`; `ARCHITECTURE.md` twice;
`apps/viewer/README.md`'s live-node pairing). `git log --oneline --name-only
HEAD..master` hands you the incoming file set for free, so the subset for the
*union* of the two diffs covers exactly the collision surface. What a full suite
buys over that union is coverage of files **neither** diff touched — which by
construction cannot hold a conflict between them. That is why the cheap half of
the check (merge master) is the load-bearing half and is kept verbatim: a
worktree green genuinely cannot see the merged tree. The expensive half was
buying nothing the union misses.

## How I chose the mapping, and whether it generalises

Three other repos (drawing-checker, wiki, bugsnap) have this contradiction and
drawing-checker's handoff was written in parallel, so: **mapping by diff shape
generalises, but only as far as the repo's seams are legible, and that varies a
lot.**

What made it work here is that tolstack's test files are named after the thing
they guard (`test_topology_projection.py`, `test_app_type_scale.py`,
`test_rebuild_projections_script.py`), so `grep -rl <changed path> tests/`
almost always lands the row. That is the transferable *method* — derive rows by
grepping the tree for the changed path, not by reasoning about architecture —
and it is cheap enough that the last row of the mapping tells the next reviewer
to do exactly that and then add the row.

Two rows I could **not** derive that way and had to measure:

- **`apps/annotate/run_tests.cjs` takes no `--repo` flag.** Unlike the viewer's,
  its `[real]` checks try the repo-relative projection path and then fall back
  to a hardcoded main-checkout path, so they run from a worktree with no flag —
  measured, `154/154` here including every `[real]` check. They print
  `SKIP  [real] …` and leave the total green if neither path resolves, so the
  mapping says read the SKIP lines. **An agent who assumes the two runners share
  a seam gets this backwards in both directions.**
- **Where the post-merge full suite runs.** The canonical cadence explicitly
  leaves this to the overlay and flags the entry at `:682-691` ("re-run in the
  main checkout after you merge") as pre-dating the integration-branch model. I
  did not edit that entry (out of scope, and it is correct about *data*), and
  instead resolved the question in a new subsection: the worktree is the merged
  code, the main checkout is trunk, so the verdict run is the worktree's and the
  main-checkout run is the additional, more-restrictive data check. **This is the
  one place the mapping states something the canonical prompt asked a question
  about rather than something the repo already knew** — flagged here because a
  later cadence edit upstream could invalidate it.

## Something a docs-only handoff here proves by accident

My own diff is one tracked document plus one issue file, and the risky subset
for it — `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py`,
170 passed — is a real check, not a formality: `docs/` is a live corpus for the
doc-scan, claim-shape and byte-identity guards. A reviewer who reads "docs-only"
as "no tests needed" is wrong in this repo specifically, which is why that row
is in the mapping and names this file's own kind of diff.

## Left undone

`ISSUE_20260921_review_overlay_spells_the_viewer_runner_path_with_backslashes.md`
— the overlay's own viewer-tier command is spelled with backslashes in the
script path, inside the entry that explains why backslashes break under the Bash
tool. Fails loudly, not silently, which is why it survived. Its sibling (same
shape, in `tests/test_viewer_js_suite.py`'s docstring) is named in the issue and
was out of scope here: the handoff forbade touching tests.
