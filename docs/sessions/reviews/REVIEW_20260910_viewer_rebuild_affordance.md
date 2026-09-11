---
type: review
handoff: HANDOFF_20260910_viewer_rebuild_affordance.md
reviewer: agent (review/viewer_rebuild_affordance)
date: 2026-09-10
verdict: APPROVE
blockers: 0
---

# Review — viewer_rebuild_affordance

One commit (`353f5b1`) on `handoff/viewer_rebuild_affordance`, cut from the
same `integration` tip (`4604ab4`) as this review branch — merged here as a
fast-forward, no conflict. The tactical worktree was clean (the deliverable
was fully committed by the author). `HEAD..integration` was empty at merge
time; `HEAD..master` held only docs/board commits (verified docs-only with
`git diff --name-only HEAD...master`).

## The seven mandatory stack checks

**Not applicable — the work is viewer UI + transport plumbing, not a
tolerance stack.** No element, `source_ref`, term list, or worksheet is
touched; no number any check consumes is added or moved. Stated explicitly
per the checklist's "not mentioned is not checked": checks 1–7 exit as N/A.
The no-second-combiner rule for JS (architectural list) was checked instead:
the diff adds no arithmetic on any projection field (`REBUILD_POLL_MS` is a
timing constant; the only comparisons are on the stub endpoint's `busy`/
`state`, not tolerances).

## What was verified

- **Deliverable 1 (banner never shows commands).** `provenance()` no longer
  renders `VA.CONFIG.rebuild[...]`; the affordance is capability-gated:
  `capabilities().rebuild === true` → a Rebuild button (click → POST → poll
  `GET .../status` → reload on success, fixed plain-words sentence on
  failure); anything else (FSA/file://, plain static server, mount without
  the endpoint) → the one sentence "The data is older than the code and
  needs a rebuild." The capability is **probed** (`_probeRebuild`: ok + JSON
  content-type, same two-part check as the data-candidate probe), never
  inferred from the candidate matching. `topology_app.js` is the sole
  production caller of `renderBanner` (`index.html` is a redirect stub since
  `viewer_consolidation`), and it passes both `onRebuild` and `capabilities`.
- **Deliverable 2 (the underlying string bug).** The lesson's root cause is
  correct and I reproduced it: the two config.js strings are individually
  correct, and concatenating `CONFIG.rebuild.topologies` +
  `CONFIG.rebuild.crops` with no separator yields character-for-character
  the line Jeff pasted (two adjacent inline `<code>` elements copy with no
  break). The lesson also correctly *narrows the handoff's own description* —
  there was no "lost interpreter prefix" bug; the second interpreter was
  present in the text and merely never invoked by PowerShell. Nothing else
  feeds that concatenation: the four remaining command-printing surfaces
  (see the filed issue) each render a **single** command, so the adjacency
  bug does not recur there.
- **Deliverable 3 (staleness detection untouched).** `provenanceAlarms` and
  the exit-3 projection gates are unchanged; the diff touches only what is
  rendered and what the reader can do.
- **DoD, all three states, in a real browser.** New browser-tier scenario
  `rebuild affordance (stub sibling mount)`: stale+capability → button, real
  click driven through busy→done against a stub endpoint; stale+no-capability
  → the one-sentence state, no button; fresh (matching provenance) → no stale
  banner. 7/7 sub-checks, plus `noCommandsOrPaths` asserted on rendered text
  in both stale cases.
- **Guards observed failing (three scratch breaks, all reverted):**
  1. Re-adding a command `<code>` to the stale detail → fast tier fails 4
     tests, each naming the leaked string ("must not name a script: …").
  2. `_probeRebuild` forced to assume `true` → exactly the two probed-not-
     assumed tests fail.
  3. Moving the affordance inside the `<details>` → fast tier stays
     **185/185 green** (the DOM shim has no `<details>` visibility) while the
     browser tier's rebuild scenario times out on `waitForSelector` — which
     independently confirms the lesson's claim that only the browser tier
     caught the placement bug, and the design argument for the button being
     a sibling of the box. Promoted to a Recurring-bugs overlay entry.
- **Cross-repo contract claims.** The lesson's probe-shape section checked
  against drawing-checker's staged
  `HANDOFF_20260910_tolstack_mount_rebuild_endpoint.md` (routes match:
  `POST /tolstack/rebuild`, `GET /tolstack/rebuild/status`) and against
  `webui/deploy_runner.py` itself: `DeployStatus.as_dict()` really does
  carry `state` and `busy` (`busy = state in (QUEUED, RUNNING)`), and
  `failed` is a real terminal state, so `pollRebuild`'s two reads are the
  right two fields. Nothing was written into drawing-checker: before/after
  snapshots via `scripts/snapshot_drawing_checker.py` (5988 → 5986 entries);
  the one non-empty diff window was two transient `page_*_full.png` files in
  run `20260819_163414_217755…` created seconds *before* my first snapshot
  and removed by a concurrent process minutes later (a third snapshot 36 s
  after the second was EMPTY — quiescent; direction was REMOVED, and this
  session ran no drawing-checker tooling at all).
- **The filed issue.** All four surviving command-printing surfaces verified
  by grep, line numbers exact (`views/banner.js` `missing()` ×2 states,
  `views/crop.js:26`, `views/topology.js:124`, `apps/annotate/app.js:586`).
  Frontmatter conforms (`type: chore`, `priority: med`, `status: open`,
  `audience: strategy`). New files carry no harness artifacts (tail + grep
  for `</invoke>`/`</content>`/`<parameter`).
- **Suites, run by me.**
  - pytest, review worktree, merged tree: **754 passed, 1 skipped**.
  - JS suite `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack`:
    **229/229, `[real]` tier ran** (real-data PASS lines observed).
  - Browser truth tier
    `node scripts\run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
    **13/13 checks** (Chrome 152), including the new rebuild scenario.

## Findings

No blockers, no should-fixes. Two nits, recorded here, no code change made:

- **nit** — `apps/viewer/topology_app.js` `pollRebuild()`: a terminal status
  of `idle` (reachable only if the server restarts mid-poll) is treated as
  success and triggers a reload. Harmless and self-correcting — the reload
  recomputes staleness and the banner re-appears — but worth knowing the
  branch exists when the real endpoint ships.
- **nit** — the two `noCommandsOrPaths` helpers are slightly asymmetric: the
  fast tier rejects any backslash, the browser tier's regex only `C:\`. Both
  catch every string that has actually leaked; if a relative backslash path
  ever leaks only in a browser-rendered state, the browser copy is the
  weaker net.

## Note for the next reviewer

The stale box's expanded `<details>` still names branches, shas, and the two
projection file names (`results.json`/`crops.json`) — that is the contract
`viewer_error_surface_and_layout` set (plain collapsed line, detail behind an
expand) and this handoff's tests now additionally hold the *expanded* text to
no-commands/no-paths. The FSA/DISCONNECTED connect banner still names
`C:\workspace\tolstack` (which folder to pick) — a path but not a command,
pre-existing, and out of this handoff's scope; if Jeff's rule is ever read to
cover folder names, that line is where to look.
