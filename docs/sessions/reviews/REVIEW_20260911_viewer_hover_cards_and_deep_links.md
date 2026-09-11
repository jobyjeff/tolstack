---
type: review
handoff: viewer_hover_cards_and_deep_links
reviewer: agent (review/viewer_hover_cards_and_deep_links)
date: 2026-09-11
verdict: APPROVE
blockers: 0
---

# Review — viewer_hover_cards_and_deep_links

Two commits (`5caafa1`, `c67bd2b`) on `handoff/viewer_hover_cards_and_deep_links`,
fast-forwarded onto this review branch from `e1baed9`. Tactical worktree was
clean (nothing committed on the author's behalf). `HEAD..master` at review time
held only board bookkeeping commits (staged→active→completed moves) — the
ordinary trunk lag, no code; `HEAD..integration` was empty.

## The seven mandatory checks

This handoff is viewer chrome and a URL contract — it authors no stack, no
element value, no `source_ref`, no topology document, and no spec-parse event
(diff touches `apps/viewer/`, `scripts/run_viewer_browser_tests.mjs`, docs and
issues only). Checks 1–7 therefore have no subject in this diff, stated
per-check so "not mentioned" is never "skipped":

1. **Provenance of every value — N/A, with one live consequence checked.** No
   citation was created or edited; the cards *render* existing `source_ref`s
   through the existing view-models (`VA.exportProvenance`,
   `VA.cropProvenanceLine`, `VA.exportBlockNode` — the last newly factored so
   the card and the right pane cannot read an export state differently, which
   I verified is a factor-out, not a fork: `views/topology.js`'s old
   `exportBlock` body deleted and delegated).
2. **Signs — N/A.** No term list touched; no arithmetic added in JS (see
   "no second combiner" below).
3. **LMC/MMC — N/A.** 4. **RSS — N/A.** 5. **Nominal inside min/max — N/A.**
6. **Quantised constraints — N/A** (no worksheet, no verdict surface changed).
7. **Traced ratio — N/A** (no stack set changed; nothing in the diff quotes a
   ratio).

## What I verified

- **Suites, re-run myself (review worktree, merged tree):**
  `node apps/viewer/run_tests.cjs` **234/234** (tier skipped);
  `--repo C:/workspace/tolstack` **283/283** (real tier ran);
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  **16/16 suites** (incl. the two new deep-links suites and the served-mode
  DoD demonstrations over real pitch_system data);
  `pytest -q` **759 passed, 1 skipped** (the standing worktree skip). All
  match the lesson's counts.
- **DoD demonstrations happened for real:** the served-mode suite boots
  `topology.html?topology=pitch_system&study=pitch_system_gas_spring_branch`
  over a real static server and asserts the study lands selected; a real
  pitch_system edge hover renders the real crop PNG with the topology-space
  claim; a citation card renders from the real NAS6403 spec citation with the
  spec-pile crop. I watched these pass, and watched them **fail** when the
  deep-link boot application was neutered in a scratch copy (both deep-links
  suites + served mode went red) — the deep-link guard bites.
- **Counts recomputed from the live projections** (main checkout, by script):
  33 sha-verified `by_stack` crops ✓; 6 resolved `by_topology` crops ✓;
  pitch_system has exactly 6 crop-keyed edges, every one `{topology, edge}`,
  and the 6 resolved by_topology entries are exactly those edges ✓; 4
  spec-pile-resolved crops ✓ ("the four spec-pile crops"). Two prose
  miscounts found, both fixed inline (below).
- **The two-key-space dispatch** (`VA.cropForKey`): total over both shapes
  plus a loud unknown-shape fallback; `{stack, element}` delegates to the
  unchanged `VA.cropFor`; every previous `VA.cropFor(crops, key.stack,
  key.element)` call site now routes through it (grepped — none left behind).
  The live misreading it retires (all six real pitch_system crops rendering
  as "stale index") is pinned by a `[real]` test that resolves them out of
  `by_topology`.
- **No second combiner in JS:** the new files' only arithmetic is pixel
  geometry (`position()` clamps, the declared popover-clamp class) and UI
  counts (`thumbs.length - 1` in a caption). No projection tolerance field is
  added, compared, or formatted anywhere in the diff.
- **Contract vs. its consumer:** drawing-checker's staged
  `analyses_viewer_deep_link` reads the contract from `apps/viewer/README.md`
  + the lesson; both document `stack=<id>`/`element=<id>` with ids from
  `results.json` (not filenames), degradation semantics, and mount stability.
  `VA.parseDeepLink`/`VA.viewerLink` both read `VA.DEEP_LINK_PARAMS`, so the
  two carriers are structurally paired (the study_3d_flyout overlay entry's
  question, asked and answered). The README table itself is a hand-copy —
  filed, see findings.
- **index.html carries the query through** (pre-existing
  `location.replace("./topology.html" + location.search)`) — the README's
  redirect claim is true as shipped.
- **drawing-checker read-only:** fresh snapshot taken at review start (5989
  entries) and diffed against the previous review session's `dc_after2.json`
  (2026-09-11T00:30Z): 3 added files, all `page_N_full.png` inside two
  existing run dirs — drawing-checker's **own webui lazy cache**
  (`webui/main.py::run_page_full_png` writes it on serving a run page), with
  mtimes (03:33/04:12 UTC) predating this tactical session's window (commits
  06:44–06:48 UTC), and drawing-checker's reciprocal `analyses_viewer_deep_link`
  session active in that repo to explain the browsing. No new run dirs,
  nothing written by tolstack. Explained entry by entry; invariant holds.
- **Hygiene:** no NUL bytes in any touched JS; no whitespace re-emit; no
  harness artifacts at any created file's tail; `data/inbox/specs/` and
  `docs/reference/` untouched; the three filed issues carry exact-spelling
  frontmatter (`feature`/`low|med`/`open`/`agent`, `audience: strategy`);
  `views/cards.js` got its README Layout row (no ARCHITECTURE.md row needed —
  no Python module added, and deliverable 4's generator was conditional and
  correctly not built, with the no-generator reasoning in the lesson).
- **Deliverable 2's `/container/<id>` deviation is justified**: container ids
  are opaque and nothing in the projections carries one — inventing one from
  a drawing number is the exact class of guess this repo bans. `/run/` links
  shipped, gap filed with two candidate fixes
  (`ISSUE_20260910_dc_container_links_not_derivable_from_viewer_data.md`).

## Findings

### Should-fix, filed as issues (APPROVE ends this handoff's ownership)

- **The card layout guard cannot fail on the defect it certifies.**
  Measured: reverting the *full* original popover state in a scratch copy
  (`position: absolute` + scroll-offset coords in `position()` + no
  `max-height`) leaves the browser tier at **16/16** — including "an open
  card moves the DAG pane by nothing at all" and the leader-correspondence
  re-check — while the lesson credits that measurement with catching exactly
  that state. The measured card (mock `base_thickness`, default viewport)
  never crosses the fold, so the document never lengthens. The shipped
  `position: fixed` is structurally correct (out of flow), so this blocks
  nothing today; the tripwire just won't trip on the canonical regression.
  `ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover.md`, and
  an overlay entry so the next reviewer replays layout guards at a
  configuration where the defect is geometrically reachable.
- **The README contract table is a hand-copy of `VA.DEEP_LINK_PARAMS` with
  nothing pairing them** — and it is the one section a sibling repo consumes
  without reading the code. The fast tier pins the constant, nothing forces
  the README's table to move with it. Not closed inline because the existing
  states-in-README guard matches names anywhere in the file (vacuous for
  `stack`/`edge`/`node`/`element`, which appear throughout) — a properly
  scoped section scan deserves its own design and can-fail replay.
  `ISSUE_20260911_deep_link_contract_readme_table_unpaired.md`.

### Fixed inline (prose/comment only, no behavior)

- **Lesson's thumbnail-parts list read as exhaustive at 2 of 5.** "Real data:
  `hub` and `pitch_plate_215177_001` get real thumbnails this way" — five
  parts do (`hub`, `vpa_piston`, `pitch_plate_215177_001`, `gas_spring`,
  `gas_spring_mount_213668_002`), one per resolved part-bearing pitch_system
  crop. Second sighting of the `viewer_leader_line_grid` "example list reads
  as exhaustive" overlay entry; no overlay edit needed.
- **tests.js comment miscounted live spec citations** ("three spec citations
  do [carry an export block]" — 12 instances do, all citing
  `NAS6403-NAS6420 Rev 4.pdf`; the "four spec-pile citations carry no export"
  half was right). Reworded to drop the ageing count; the test's own
  assertion was shape-based and unaffected.

### Nits (no change made)

- `VA.resolveDeepLink`'s unresolvable-topology notice says "showing the
  default instead" even when a `stack` param in the same link resolves and IS
  shown (`?topology=nope&stack=demo_joint` → stack mode). The fallback is
  safe and said out loud either way; only the tail of the sentence is
  imprecise in that one combination.

## Checkout-specific suite note

The main checkout (`master` + shared `data/`) reports **750 passed, 1 failed**
at review time — `test_viewer_js_suite_is_green`, whose inner JS run is
208/211: (1) `fixtures.js` missing the `by_topology`/`summary_topology`/
`unresolved_topology` crop keys (master predates `inline_edge_crops`; the
merged tree's fixtures pair them and its real-tier run is green), (2) the
stale four-forks pin (`expected 4, got 5` —
`ISSUE_20260908_pitch_system_four_forks_test_is_stale_not_a_race.md`, fixed on
`integration`, not yet on master), (3) `topology_fixtures.js` missing
`studies[].checks` (the documented `tolstack_viewer_js_suite_drift` shape,
fixed on `integration`). All three are master-lag against the shared
projection, the same state the 2026-09-10 review recorded (`3031405`); none is
introduced by this handoff, whose merge goes to `integration`. The merged
tree's own numbers are the worktree counts above.

## For the next reviewer

The deep-link browser suites (`deep links file://` / `deep links http`) and
the served-mode DoD block are the teeth on deliverable 3 — verified they fail
when boot stops applying the parsed link. The layout zero-pixel measurement is
NOT currently teeth (see the issue above); don't count its green as evidence
until that issue closes.
