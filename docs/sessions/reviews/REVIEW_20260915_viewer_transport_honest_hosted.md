---
type: review
handoff: viewer_transport_honest_hosted
reviewer: agent (review/viewer_transport_honest_hosted)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — viewer_transport_honest_hosted

Branch `handoff/viewer_transport_honest_hosted` (2 commits, `20636a6` code +
`2d6c02e` lesson) merged into `review/viewer_transport_honest_hosted` on top of
`integration` `4a46516`. **No conflicts** — `integration` had moved three
commits ahead of my branch point, all of them board bookkeeping (three
`docs/sessions/{ => active}/` renames, zero content), so the "resolve your own
merge conflict" carve-out did not come up.

The work is a viewer transport/UI change and not a tolerance stack, so mandatory
checks 1–7 (provenance, signs, LMC/MMC, RSS, nominal, quantised constraints,
the traced ratio) do not apply: the diff adds no element, no `source_ref`, no
check and no number. Checks 2b/3's `fold()` fence and the JS no-second-combiner
rule DO apply and are addressed below.

## What I verified

### Deliverable 1 — FSA on `file://` only

`VA.chooseTransport` (`apps/viewer/storage/adapter.js`) is the whole decision,
and the served-probe-fails branch turns on `opts.protocol !== "file:"`. The
call site passes `window.location.protocol` and `HttpAdapter.isSupported()`
is already false on `file://`, so the `http` candidate is correctly `null`
there rather than probed-and-failed. **PASS.**

Observed failing, not accepted on green — removing the protocol guard
(`adapter.js`, 7 lines):

| tier | shipped | guard removed |
|---|---|---|
| fast (node) | 260/260 | **258/260** — `…never boots FSA`, `…latches NOTHING` |
| browser | 17/17 | **16/17** — `[hosted origin with nothing published]` times out on `.banner--unpublished` |

Disabling `views/banner.js`'s UNPUBLISHED branch (`if (false)`):
fast **259/260**, browser **14/17**. Both directions bite.

**And the wiring, not just the pure function** (the `viewer_dag_spine_layout`
lesson): dropping `protocol: window.location.protocol` from `chooseAdapter`'s
call — the one-line edit that silently reverts the seam and sends `file://`
pages to UNPUBLISHED — leaves the fast tier 260/260 and is caught by the
browser tier's existing `[real] render path (non-mock)`. So the seam is pinned
from both sides.

### Deliverable 2 — the probe's content-type discipline

`storage/http.js` is **comment-only** in this diff (`git diff` confirms: the
`CANDIDATES` list, the `ok` + JSON-content-type test and the DISCONNECTED
return are untouched). The catch-all-HTML server fixture still drives it in
both tiers, and the new hosted browser fixture reproduces the measured host
exactly — app files under `/tolstack/viewer/`, 200 + site-index HTML for every
other path. **PASS.**

### Deliverable 3 — a later-fixed server is one reload away

Nothing is stored: no flag, no `localStorage`, no module-level memory. Verified
by mutation, and **this is the finding worth carrying forward** — the two tiers
are each blind to one latch kind and neither is evidence alone:

| latch introduced | fast tier | browser tier |
|---|---|---|
| in-memory (`var LATCHED` in `chooseTransport`) | **257/260** | 17/17 green — `page.reload()` wipes the JS context |
| persistent (`localStorage`) | 260/260 green — node has no `localStorage` | **16/17** — the reload never reaches `tr.tvrow` |

Both guards exist and each bites on the kind the other cannot see. Added to the
overlay as a Recurring-bugs entry.

### Definition of done

- **Fast tier** — the new case is there and it is four tests, not one, driven
  against real local servers: both hosted failure shapes (404-everything and the
  200+HTML catch-all), the `file://` FSA case, the `file://`-with-no-FSA dead
  end, and the publish-mid-session recovery (`startPublishableServer`). The FSA
  side is a **spy** that records whether it was initialised, which is the right
  instrument for "never reached". `file://`-shaped tests unchanged and green.
- **Truth tier** — `17/17` on the merged tree with
  `--repo C:/workspace/tolstack`, including the pre-existing served-mode boot
  proof at 11/11 and the new `[hosted origin with nothing published]` at 6/6
  (its `[real]` reload half ran, it did not self-skip).
- **Lesson** — present, names the exact sentence, and confirms the
  reload-recovery against a dataless-then-published server in both tiers.

### Suites, and where I ran them

| suite | worktree | main checkout `--repo` |
|---|---|---|
| `pytest -q` | **815 passed, 1 skipped** | 815 passed, 1 skipped (post-merge, below) |
| `apps/viewer/run_tests.cjs` | **260/260** (node-fs tier SKIPPED) | **312/314** |
| `scripts/run_viewer_browser_tests.mjs` | — | **17/17** |

**The two `[real]` failures are not this branch's**, and I attributed them
rather than accepting "pre-existing":

- `data/projections/viewer/` is stamped by three different trees right now —
  `results.json` = `handoff/stack_title_style_pass`, `crops.json` =
  `handoff/spec_crop_region_registry`, `topologies.json` =
  `review/annotate_affordances_flyout_and_mesh_gating`. The two failures name
  `region_label` / `region_match` / `declared_region`, which is the *crops*
  builder — i.e. `spec_crop_region_registry`'s tree, not this one.
- Re-derived by running the **pre-work** tree's own runner (`git archive
  integration`) against the same `--repo`: **307/309, the identical two
  failures.** This branch adds 5 tests and 0 failures.
- The lesson's own claim that clean `master` fails **four** reproduces exactly
  (`git archive master` → 279/283, the same two plus
  `every fixture shape still matches the builder's` and
  `the topology fixture's shapes still match the builder's`).

This is `ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red`,
already open.

**On "re-run the suite in BOTH checkouts" — the honest answer.** The main
checkout is sitting on `master`, not `integration`, so a `pytest -q` there does
not exercise the merged tree; it exercises `master`. I ran it anyway and it is
**1 failed, 768 passed** — `test_viewer_js_suite_is_green`, wrapping exactly the
four `[real]` failures above, on a tree that does not contain this merge and did
not contain it before either. Switching that checkout's branch is not mine to
do (other agents are live in it). What *does* cover the merged tree against real
`data/` is the `--repo C:/workspace/tolstack` column: the JS runner resolves
projections through `--repo` and app source from its own directory, so those
312/314 and 17/17 runs are the merged app source against the main checkout's
data, which is the thing this checklist item is protecting against.

### drawing-checker read-only invariant

Snapshotted at review time with `scripts/snapshot_drawing_checker.py` (5994
entries) and diffed against the snapshot the `annotate_affordances_flyout_and_
mesh_gating` review left on disk at 2026-09-14T23:54Z — which brackets the
tactical session *and* mine. **0 added, 0 removed, 3 modified**, all explained
and none this handoff's:

- two `*_p01.json` under runs from 2026-09-02 and 2026-09-04, mtime
  2026-09-15T02:50:56Z — five minutes after drawing-checker's own
  `stored_item_crossref_backfill` handoff went active there (`f097dce`,
  2026-09-14T19:45 PDT), which is a backfill into existing runs by name;
- one run *directory* mtime, `20260910_154303_215198-A`.

No run was created or deleted, and this handoff's diff is `apps/viewer/**` +
`scripts/run_viewer_browser_tests.mjs` + docs — it contains no code that can
reach that repo, cites no run, and opens no PDF.

### Other checklist items

- **No second combiner in JS.** The diff adds no arithmetic on a projection
  field anywhere — `chooseTransport` compares strings, the banner appends a
  sentence. **PASS.**
- **Vocabulary as a module-level constant, not literals.** `VA.TRANSPORT` is
  `Object.freeze`d in `storage/adapter.js` and the pre-existing `"http"`
  literal in `banner.js` was folded into it. There is no Python producer of
  this word (it is decided client-side, never projected), so
  `tests/test_js_python_vocabulary.py`'s pairing does not apply; and
  `js_table_mutations` reads `viewer.js` only, so the table sits outside that
  scan — but `Object.freeze` refuses `VA.TRANSPORT.x = …` at runtime, which is
  the stronger guard. No action.
- **New-value guard rows.** `transport` is not a projection field, so
  `VALUE_GUARDS`/`TOPO_VALUE_GUARDS` have nothing to gain a row for.
- **Browser-tier wait predicates** (the 2026-09-11/09-14 entries). The new case
  waits on `.banner--unpublished` — a render product, set by the same
  synchronous `renderBanner` call that fills the text, and reachable only after
  `chooseTransport` settles, so it cannot resolve on the early DISCONNECTED
  paint the way `testServedModeBoot` once could. Its two absence checks
  (`#banner button`, `.banner--disconnected`) both sit **after** that positive
  anchor. No new sleeps. **PASS.**
- **Docs.** `apps/viewer/README.md`'s transport section, its test-tier
  paragraph and its Layout block all moved with the code; no new file, so
  `ARCHITECTURE.md`'s inventory needed no row (and its guard is green). I
  grepped the tree for surviving "falls back to FSA" prose — the only live
  copies are the corrected ones.
- **Lesson leftovers.** The one "still to do" (the hosted bake) genuinely has
  an owner: `HANDOFF_20260914_hosted_tolstack_bake.md` exists and is **active**
  in drawing-checker (`db88c0e`). No issue needed for it.
- **Harness residue / whitespace.** `git diff -w --stat` agrees with the plain
  stat; no `</invoke>`-class fragment at the tail of either new file; no NUL
  bytes; `git ls-files --eol` unchanged.

## Findings

### Fixed inline (both typo/stale-comment class — no behavior change, no new test)

1. **`scripts/run_viewer_browser_tests.mjs`:2051 — a sub-check that could not
   see what it says it checks.** "no path, script or command leaks into the
   sentence" read `!/\.py|venv-win|C:\|\//.test(banner)`. The third alternative
   is neither `C:\` nor `/`: `\|` and `\/` are escaped literals, so it matches
   the four characters `C:|/` and nothing else. Measured before the fix — a
   bare slash, `/tolstack/data/topologies.json` and `C:\workspace\tolstack` all
   returned **false**. Repaired to `C:\\|\/` and re-probed: all five defect
   shapes now true, the shipped banner sentence still false. The contract
   itself was never unguarded — `tests.js`'s `noCommandsOrPaths` plus its
   `indexOf("/") === -1` assertion cover it correctly in the fast tier — so
   this was a duplicate guard rotting quietly, not an escaped defect.
2. **`apps/viewer/topology_app.js`:96 — the `transportKind` comment was false
   in both halves.** It spelled the vocabulary as inline literals
   (`"mock" | "http" | "fsa"`, now missing `"unpublished"`) — the shape
   `CLAUDE.md` bans by name — and asserted the variable is "not read anywhere
   else", nine lines above the new `if (transportKind !== VA.TRANSPORT.
   UNPUBLISHED)` that reads it. Rewritten to point at `VA.TRANSPORT` and to
   name both readers.

Both re-verified after the fix: pytest 815/1, fast tier 312/314 (`--repo`),
browser 17/17.

### Should-fix (left unfixed, filed)

3. **Nothing pins the "and nothing else" half of deliverable 1.**
   `ISSUE_20260915_unpublished_banner_has_nothing_pinning_and_nothing_else.md`.
   `views/banner.js`'s UNPUBLISHED branch renders `state.error` when set, and
   `topology_app.js`'s `if (transportKind !== VA.TRANSPORT.UNPUBLISHED)` is the
   only thing keeping it unset. Flipping that condition to `if (true)` puts the
   old browser-upgrade sentence back on a hosted visitor's bar and ships
   **100% green on all three tiers** (fast 260/260 and 314 with `--repo`,
   browser 17/17 with the hosted case itself at 6/6). One fast-tier banner test,
   or one child-count sub-check in `testHostedUnpublished`, closes it — and
   deciding it forces the better question, which is whether `state.error` should
   render on an UNPUBLISHED bar at all (it is unreachable today, so that
   `if (state.error)` line exists only to let this regression through).

4. **The sibling app still has the defect this handoff names.**
   `ISSUE_20260915_annotate_still_offers_connect_folder_on_a_hosted_origin.md`.
   Out of scope — the handoff fences to `apps/viewer/` explicitly, correctly —
   but `apps/annotate/` boots to **Connect folder** on the same hosted mount,
   and the already-triaged `ISSUE_20260910_annotate_has_no_http_read_transport`
   proposes "fall back to FSA", which implemented literally reproduces exactly
   what was just removed. Filed so the *posture* half has an owner separate from
   the *transport* half.

### Nits

5. `apps/viewer/tests.js` — the new block's comment says it "Runs BEFORE the
   mid-session-stop test below … that test permanently closes `dataOrigin`".
   None of the four new tests touch `dataOrigin` (they use `emptyOrigin`,
   `htmlOrigin`, `publishableOrigin`), so the stated reason does not hold. The
   placement is harmless; the justification is a fact that is not true.
6. The `[real]` reload sub-check pushes a self-passing `true` with a "skipped"
   label when `--repo` is absent. That is the file's established idiom and the
   label is honest, but it means the headline `6/6` reads the same whether the
   recovery half ran or not — worth knowing when reading a pasted count. It
   ran, with `--repo`, in this review.

## Verdict

**APPROVE**, 0 blockers.

The deliverable is small, the seam it opens is the right one (the decision moved
out of a page's private IIFE and into the adapter contract, which is what made
it testable at all), the copy follows the standing UI rules, and every guard it
adds was observed failing in this review rather than accepted on green. The
two inline fixes were a dead regex clause and a stale comment. The two
should-fixes are filed and neither is in the path of the merge.

Merged to `integration` and pushed; `master` untouched.

## Note for the next reviewer

Two entries went into the overlay from this review: the two-latch-kinds rule
(each tier is blind to one, so a "nothing is remembered" claim needs both
mutations), and the inline-regex-rot one. The second generalises past regexes:
this branch's browser tier re-spelled a fast-tier helper by hand, and the copy
is what rotted — when both tiers assert the same rule about the same text, ask
why there are two spellings of it.
