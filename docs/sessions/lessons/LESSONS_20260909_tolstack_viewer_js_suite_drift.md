# LESSONS 2026-09-09 — tolstack_viewer_js_suite_drift

## What actually needed fixing

Both target assertions are now green (`node apps/viewer/run_tests.cjs --repo
C:\workspace\tolstack`: 211/211; `pytest -q` from the worktree: 750 passed, 1
skipped — the node-fs skip is the documented worktree behavior, not a
failure).

### 1. The drift wasn't where the handoff said it was

The handoff and `ISSUE_20260909_topology_fixtures_js_drifted_from_builder.md`
both describe `apps/viewer/topology_fixtures.js` missing
`joint`/`worksheet_file`/`worksheet_source`/`configuration`. That fixture
already carries all four (patched in by commit `15fc611`,
`viewer_v2_single_nav`, 2026-09-08) — the corresponding test
(`[real] the topology fixture's shapes still match the builder's`) was
already green before I touched anything.

The suite's actual failing test was the sibling assertion,
`[real] every fixture shape still matches the builder's`, which pins
**`apps/viewer/fixtures.js`** (the *stack/crops* fixture, a different file)
against the live `crops.json`. `scripts/build_viewer_crops.py` grew a new,
separate `by_topology`/`unresolved_topology`/`summary_topology` index in the
`inline_edge_crops` handoff (2026-09-08, same day as the topology_fixtures.js
fix) — `fixtures.js` never got the matching update. Same class of defect
(hand-maintained fixture vs. builder output drift) as the issue described,
different file and different keys. I fixed the one actually red rather than
re-verifying a description that no longer matched the tree — worth flagging
because a handoff/issue pair can go stale between filing and pickup even
within the same day, and the fix is to trust the test output over the prose
description of it.

**Fix**: added `by_topology`/`unresolved_topology`/`summary_topology` to
`apps/viewer/fixtures.js`'s `CROPS` fixture (one resolved + one unresolvable
demo entry under a `demo_mechanism` key, field-for-field matching the real
`by_stack`-entry shape). Unlike `topology_fixtures.js`, `fixtures.js` carries
no "regenerate from the builder, paste the output" header — the drift test
(`SHAPES` in `tests.js`) only diffs **key sets**, not values, for this
fixture, and nothing in the viewer reads these three fields yet (`grep` for
`by_topology`/`summary_topology`/`unresolved_topology` across `apps/viewer/`
turns up only the fixture and the Python builder) — so the values are
hand-authored and internally consistent, same convention this file already
uses for its `by_stack`/`unresolved` entries, not builder output pasted in.

### 2. The stale "four forks" pin — why it survived

Root cause of the branch-count assertion being wrong isn't interesting (a
5th branch point, `gas_spring_mount_flange`, entered the graph on or before
2026-09-06 and the test never got updated). What's durable is *why a wrong
assertion survived three-plus review cycles*:

- `LESSONS_20260908_viewer_v2_single_nav.md` §7 first hit the mismatch and
  diagnosed it as a **concurrent-rebuild race**, citing the projection's
  `built_at` timestamp post-dating its own session start as evidence of a
  clobbered shared projection (`ISSUE_20260806_concurrent_worktrees_clobber_
  the_shared_viewer_projection`'s known failure mode). That diagnosis was
  never re-checked against a rebuild from a tree containing everything — it
  was just re-asserted.
- Every review since (that same handoff's own loopback review, and this
  handoff's issue's account of "every review since") repeated the
  "pre-existing branch-count race" label rather than re-running the cheap,
  independent check that had *already been done*: `REVIEW_20260906_
  mechanical_stroke_stack.md` had derived `len(t.branch_nodes()) == 5`
  directly in Python from the loaded topology, independently agreeing with
  `docs/DAG_TOPOLOGY.md`'s stated L2 count — both predating the "race"
  diagnosis and both never consulted by it.
- The framing that let this hide: a review summary line like "204/205
  passed, one pre-existing unrelated failure" reads as *already triaged,
  nothing to see* — a stable ratio looks like background noise, not a
  standing lead. Confirmed today with a projection rebuilt from a tree that
  fully contains `integration`, `dirty=False`, `behind_trunk=0`: still 5,
  stably — never a race, at any point checked.

**Should the "quantity written in prose that no test reads from the tree is
a defect" anti-pattern extend to hardcoded structural counts like this
one?** Yes — filed as
`ISSUE_20260909_hardcoded_structural_counts_in_js_tests_should_derive_not_pin.md`
(`audience: strategy`, not fixed here: designing the derivation shape is a
bigger decision than this handoff's scope). The prose case already has
teeth (a named test compares the doc against the tree); this JS case had
none — a wrong `=== 4` doesn't fail loudly on its own terms, it just adds
one more line to a "pre-existing failures" tally that every reviewer since
has been trained to skip past.

## Notes for the next agent

- `node apps/viewer/run_tests.cjs --repo <path>` needs **forward slashes** if
  invoked through a POSIX-style shell (Git Bash) — a backslash Windows path
  argument got mangled into a concatenated garbage path
  (`...tolstack_viewer_js_suite_drift/workspacetolstack/data/...`) and the
  node-fs tier silently reported itself skipped instead of erroring. Use
  `--repo "C:/workspace/tolstack"`, or run from PowerShell with the
  backslash form.
- `powershell -File` on this machine needs `-ExecutionPolicy Bypass`
  (`scripts/rebuild_projections.ps1` otherwise refuses with
  `UnauthorizedAccess`/script execution disabled) — CLAUDE.md's documented
  invocation didn't mention this; worth a follow-up doc fix if it recurs.
