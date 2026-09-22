---
type: review
handoff: docs/sessions/active/HANDOFF_20260921_policy_free_brief_residues.md
reviewer: review agent (review/policy_free_brief_residues)
date: 2026-09-22
verdict: APPROVE
blockers: 0
---

# REVIEW — policy_free_brief_residues

Three briefs' policy-free halves, on three unrelated files. All three
deliverables are done, and done past the letter of the handoff in two places
(deliverable 1 found and fixed a third command site the brief did not know
about; deliverable 2 moved three sub-checks the brief did not name). Every claim
I could measure, I measured — including four source mutations and one
environment mutation, because the deliverable here *is* a set of guards.

Four findings, none a blocker: two comment defects fixed inline, and three
should-fixes filed as issues (one of them pre-existing and unrelated, found by
running the ratio the checklist asks every report to state).

## What I verified

### Deliverable 1 — the last terminal commands in the viewer's chrome

- Both `missing()` call sites and `views/topology.js`'s empty state now render
  copy only. `VA.CONFIG.rebuild` is gone from `config.js`, `.banner__cmd` is
  gone from `style.css`, and `rebuildKey` is gone from `VA.PROJECTION_LABELS` —
  the handoff asked for the lookup and the class to be *retired* rather than
  orphaned, and they were.
- **The `!state.crops` distinction survives, quoted in full** (`viewer.js`,
  `VA.MISSING_CROPS_NOTICE`):
  > No crop projection — hovers will say a crop is "not built" rather than
  > "unresolvable", which are different facts.
  The rewrite drops only what the reader could not act on (PyMuPDF,
  drawing-checker's venv), and `apps/viewer/tests.js` asserts the absence of
  "PyMuPDF" by name so the explanation cannot drift back in without the command
  it explained.
- **The guard is real, and it is broader than the handoff asked for.** The
  banner was in *no* reader-facing walk at all — which is why three of these
  sites had been removed one at a time, each leaving the others. It is now
  enrolled in `surfaceIsClean` across six states, plus the topology pane; the
  shared ban list traded its single literal for a script-filename shape; and a
  second, static check refuses `CONFIG.rebuild` in any of seven view sources
  (comment lines stripped first, so the files may keep recording *why* the
  table went).
- **Mutation-measured, three ways** (fast tier, `--repo C:/workspace/tolstack`):

  | mutation | result |
  |---|---|
  | `missing(labels.missing + " Build it: venv-win/… build_viewer_projection.py")` | 477/480 — three guards red, the walk naming `"python.exe"` and the exact surface |
  | `rebuild: { results: "x" }` back in `config.js` | 479/480 — `this app holds no terminal command…` red |
  | `VA.CONFIG.rebuild.topologies` read from `views/topology.js` with no table | 479/480 — the static half red, so both halves of that guard bite |

- **The fifth site was filed, not fixed, and its "unreachable" claim checks
  out** — which is what makes the DoD's "no rendered viewer surface contains a
  terminal command" true rather than nearly true.
  `ISSUE_20260922_the_stack_pages_no_loader_warning_is_the_fifth_terminal_command_in_the_viewer`
  says `views/stack.js`'s arm needs `checks_generated_not_rendered: true` plus
  an empty `checks` list, reachable only for an archetype with no loader:
  `build_viewer_projection.ARCHETYPE_LOADERS` holds exactly
  `{"thermal_fit": …}`, the only archetype in `docs/tolerance_stacks/` is
  `thermal_fit`, and all seven live stacks project
  `checks_generated_not_rendered: False` with non-empty `checks`. So no reader
  can reach that string today, and it is correctly out of a handoff whose file
  scope was `views/banner.js`.
- Two banner states (`DISCONNECTED`, `NEEDS_REGRANT`) are excluded from the
  walk; the exclusion is named in the test and owned by
  `ISSUE_20260922_the_disconnected_banners_folder_path_is_unscannable`. That is
  the right call — the path there is a picker affordance, not leaked internals —
  and it is filed rather than decided.

### Deliverable 2 — a browser assertion that passes in only one of the two states

- Neither site accepts a disjunction any more. Both read the capability **once**,
  off the surface under test (the flyout off the iframe's `contentWindow`), with
  the same predicate as `AA.FsaAdapter.isSupported()` — verified:
  `apps/annotate/storage/fsa.js:32` is `typeof window.showDirectoryPicker ===
  "function"`.
- Each arm now asserts what it is in: has-FSA asserts `/Connect folder/` **and**
  the absence of `File System Access`; no-FSA is an explicit named skip that
  points at `BRIEF_20260915_origin_posture_and_absent_feature_rule`. Nothing
  here decides what the no-FSA surface should say.
- **The half the handoff did not ask for is the half that mattered.** The three
  sub-checks *below* the disjunction (full bind workspace, real canvas, wired
  dev console) were asserting unconditionally — exactly what the brief measured
  as the defect on a no-FSA browser — so splitting only the banner check would
  have left the guard as pinned as before. All three moved into the has-FSA arm.
- **Mutation-measured, both directions** (`--only "annotate hosted posture"`):
  - break the has-FSA assertion → **17/18**, failing on
    `a loopback page in a browser WITH File System Access asks for the folder,
    and says nothing about the API`. So the arm executes and the assertion is
    live.
  - `page.addInitScript(() => { delete window.showDirectoryPicker; })` before
    the loopback `goto` → **16/16 PASS**, skip arm taken, and the banner reads
    *"This browser has no File System Access API -- the annotate surface needs
    Chrome or Edge, served over http(s) (not file://). Try ?mock=1 for a demo
    with no folder grant."* **The retired disjunction would have passed on that
    string** while the three workspace checks below it went on asserting. The
    lesson's claim is confirmed, and so is its reading that today's no-FSA copy
    cannot be asserted without pinning three house-rule violations (it names an
    API, tells the reader to change browser, and offers a query parameter).

### Deliverable 3 — the endstop topology's safe retrace rows

- **No band numeric moved, proven mechanically rather than by eye.** Comparing
  every `dimension` field of all 24 edges between `integration` and the branch:
  `nominal / min / max / plus_minus / lmc / mmc / unit / kind` are **identical
  on every edge**; exactly one `source_ref` changed
  (`tan_link_mount_height`: `untraced`/`workbook` `B42` → `traced`/`drawing`
  `215198-A`); one `provenance` key was added and no existing provenance string
  was altered; no part, node or edge `name`/`note` changed.
- **The traced citation is verified three independent ways**, which is the only
  check that matters in this repo:
  1. worksheet §11b's disposition says `79.00 ±0.10`, sheet 1, exact band match
     to workbook cell B42 (0.20 total ⇒ ±0.10 — the stored band, unchanged);
  2. the drawing itself — `215198-A.pdf` page 1's text layer carries
     `79.00 ±0.10` (read with drawing-checker's PyMuPDF; sheet 1 also carries
     `SECTION C-C`, `DETAIL D/E`, while `SECTION A-A` and `DETAIL B` are on
     sheet 2, consistent with the cited view being A-A's **parent**);
  3. `export.sha256` `7b35fde1…3b6e80` is a byte-match to
     `C:/workspace/drawing-checker/data/inbox/drawings/215198-A.pdf`
     (`certutil -hashfile`).
  The one feature-identification assumption is stated in the note rather than
  buried, and the `export` block matches the shape every other drawing ref in
  this document uses (`revision: null` where the rev is in the document number,
  `runs: []`, `status: "established"`).
- Row 62's "hypothesis weakened" and row 59's recorded reason both reproduce
  §11e and §11d faithfully, including what they decline to claim: row 62 stays
  `untraced`/`still blocked` with its owner reopened, and row 59 is recorded in
  `provenance` precisely because it is **not** an edge here.
- The three guards that bit were all updated honestly, and the two that are one
  fact from opposite sides (croppable 6→7, uncroppable 18→17) are now documented
  as a pair with the reason — a drop on one side and no gain on the other is a
  citation lost, not upgraded.

### Projections and the traced ratio

- All three viewer projections rebuilt and stamped, quoted from the files
  themselves: `branch: handoff/policy_free_brief_residues`,
  `head_sha: 26049c8ff30800b0df00dbee02c1709c8acf516a`, `dirty: false`,
  `trunk: master`, `behind_trunk: 0`, built `2026-09-22T07:43:4x`.
  `crops.json`'s `summary_topology` confirms the lesson's numbers:
  `citations: 24, resolved: 7, unresolvable: 17, by_resolved_by:
  {source_ref_export: 7}, sha256_verified: {true: 7}` — and
  `tan_link_mount_height`'s own entry is `resolved`, page 1,
  `located_by: "sheet_full"`, `sha256_verified: true`.
- The lesson's §4 consequence is real and worth carrying forward: the shared
  projection is now stamped with a branch trunk does not contain, so a rebuild
  from the main checkout (on `master`) is refused with exit 3 until the
  operator's batch merge. That is the provenance gate working.
- **Traced ratio** (overlay mandatory check 7). No stack was touched, so the
  published figure does not move: `5 of 26` element instances across the three
  seeded stacks are `traced`. The topology's own census moves by exactly one:
  `pitch_system` goes `3 traced / 1 inferred / 20 untraced` →
  `4 traced / 1 inferred / 19 untraced` over 24 dimensioned edges, and its
  `source_ref` kinds `drawing 6 → 7`, `workbook 9 → 8`.
  While recomputing that I found `ARCHITECTURE.md` publishing a stale split —
  filed, see findings.

### Other mandatory checks, including the ones that pass

- **Signs on path terms / RSS / coherent material corners:** no path, study or
  fold changed; no numeric changed at all. `fold()` untouched, no second
  combiner.
- **LMC/MMC direction:** the new `source_ref` carries neither, and the
  dimension's fields are byte-identical to before. Nothing derives `max` from
  `mmc`.
- **Nominal inside its own min/max:** `0.0 ∈ [-0.10, +0.10]`, unchanged (this
  document is variation-only by design, and the note says so).
- **Quantised constraints:** no cotter/castellation hardware in this edit.
- **Vocabularies:** no new field vocabulary; the widened ban entry is a
  module-level constant in the shared list, not an inline literal.
- **`docs/reference/` and `data/inbox/`:** untouched.
- **Design/visual hierarchy:** `.banner__missing-where` is muted rather than
  smaller-and-bolder (the house rule for secondary information), `4px` is on the
  2px/multiple-of-4 spacing step, and it adds no third type size.
  `tests/test_app_type_scale.py` green. Nothing to file.
- **Nothing was written into drawing-checker.** Checked by writes, not by
  `git status` over there: exactly one file under
  `C:/workspace/drawing-checker/data/` has been touched today —
  `data/logs/eager/eager_pass_20260922.log`, written 00:12 by drawing-checker's
  own eager pass (`repo=C:\workspace\drawing-checker` in its first line), not by
  this session. `215198-A.pdf` still carries its 2026-09-10 mtime and its
  recorded sha256. The one crop this handoff resolved took the
  `source_ref_export` route with `runs: []`, so no drawing-checker run was
  involved at all.
- **Tests don't pollute production data:** the worktree's `data/` still holds
  only its tracked `.gitkeep`/README skeleton after the full suite; nothing was
  written to `C:/workspace/tolstack/data/` except the deliberate projection
  rebuild.

## Findings

### Fixed inline (both in `apps/viewer/config.js`, both stale comments)

1. **`config.js:11` still said the projection files were "one per `rebuild` key
   below"** — three lines above the note explaining that the `rebuild` table has
   been deleted. Rewritten to say what it is now and what it used to say. The
   handoff explicitly asked for the lookup to be retired rather than left
   dangling; this was the one dangling reference to it.
2. **"three interpreter paths and eight backslashes" — the count is twelve.**
   The retired block rendered 3 + 3 + 6 backslashes across its three command
   strings (24 `\` characters in source, 12 escaped pairs). No reading of the
   deleted block gives eight. Corrected to "twelve". This is the class
   `CLAUDE.md` calls a defect outright — a quantity in prose that no test reads
   — and it is wrong in the comment that exists to justify a deletion.

### Should-fix, filed (APPROVE ends the handoff's ownership, so each has an owner)

3. **`ISSUE_20260922_the_missing_projection_box_says_not_from_this_page_while_the_rebuild_endpoint_is_live`**
   — `VA.PROJECTION_BUILT_ELSEWHERE` ("It is built in the tolerance-stack
   repository, not from this page") is rendered with **no capability gate**,
   while the same banner already gates a Rebuild button on
   `state.capabilities.rebuild`. On a served page whose sibling mount has the
   endpoint live the sentence is false: `drawing-checker/webui/main.py` serves
   `POST /tolstack/rebuild` and `webui/tolstack_rebuild.py` runs the whole
   `rebuild_projections.ps1` recipe, so it services a *missing* projection as
   readily as a stale one. The comment beside the constant asserts the
   opposite — *"nothing can service a projection that does not exist yet"* —
   and this repo's own
   `ISSUE_20260910_other_viewer_surfaces_still_print_terminal_commands` says in
   as many words that the endpoint's single action "**also covers**" the
   nothing-built-yet state. The sentence shape was borrowed from
   `apps/annotate/`'s `AA.NO_PROJECTION_NOTICE`, where it is honest for a
   *stated* reason annotate has and the viewer does not ("no transport that
   could ask anything to rebuild anything"). Filed rather than fixed because
   whether every missing-projection message gets a button is the design call
   already routed to strategy in that 2026-09-10 issue — but the wrong
   justification is mechanical and checkable, and nothing pins the
   missing + capability combination (the browser tier's rebuild suite covers
   stale + capability and stale + no-capability only).
   *Also recorded there:* all four bullets of
   `ISSUE_20260910_other_viewer_surfaces_still_print_terminal_commands` are now
   done, so triage may want to re-disposition it rather than leave it reading as
   four live command sites.
4. **`ISSUE_20260922_four_comments_count_the_viewers_terminal_command_sites_and_no_two_agree`**
   — `views/banner.js` (twice), `views/topology.js`, `tests.js` and `viewer.js`
   each state a count of command sites, and the memberships conflict: the
   `missing()` comment's "four" *excludes* the topology pane that the same
   commit removed, `views/topology.js` calls itself "the third of the four", and
   `tests.js` makes the banner's two #3 and #4. The lesson's own reading is
   sites four, five and six. Nothing reads any of these numbers.
5. **`ISSUE_20260922_architecture_mds_traced_ratio_parenthetical_is_seven_days_stale`**
   — **pre-existing and unrelated to this handoff**, found only because the
   overlay asks every review to state the ratio. `ARCHITECTURE.md` publishes
   "5 of 26 … `traced` (3 `inferred`, 18 `untraced`)"; the live figure is
   `5 traced / 12 inferred / 9 untraced`. `tests/test_tolerance_stack.py:2168`
   records the move (`stack_fable_audit`, 2026-09-15) in its own comment, so the
   test note was updated and the published document was not. The doc scan pins
   only `<traced> of <instances>` — deliberately, and its docstring says why —
   so this is the hole that narrowing knowingly left.

### Nits (measured, grouped, no issue)

6. **Half the new exemption is dead, and the state it would cover is not in the
   walk.** `OPENED_BY_THE_READER = ["div.banner__source__body",
   "div.banner__stale-detail"]`: emptying it entirely reddens the walk on
   `C:/workspace/tolstack/docs/tolerance_stacks` inside the Data-source fold, so
   the first selector is load-bearing and correctly argued. Dropping only
   `div.banner__stale-detail` leaves **480/480** — none of the six scanned
   states renders the stale-pair alarm, so that entry exempts nothing today and
   pre-authorizes its detail body for whoever adds a stale state to the list
   later. The stale-pair box itself is not unguarded (an older test at
   `tests.js:~3383` runs `noCommandsOrPaths` over its whole text), but that
   check is the local three-string helper, not the shared ban list — so the
   surface that started this whole rule on 2026-09-10 is the one banner state
   the widened list never sees. A seventh entry in `surfaces` —
   `{connection: READY, results: FIXTURE.results, crops: mismatchedCrops()}` —
   closes both halves. **Recorded in
   `ISSUE_20260922_the_disconnected_banners_folder_path_is_unscannable`**, which
   already owns "which banner states are in the walk", rather than left as a
   nit with no owner.
7. **The twin guard in `apps/annotate/` did not get `codeOnly()`.**
   `apps/annotate/run_tests.cjs:570` still greps `appSource.includes(
   "CONFIG.rebuild")` over raw source, which the lesson itself notices "gets
   away with a raw `includes` only because its comment happens to say
   '`rebuild` entry'" — so the next agent who writes the words `CONFIG.rebuild`
   into an annotate comment, exactly as this handoff wrote them into five viewer
   comments, reddens annotate for documenting a decision. Aligning it is one
   call to the same one-line helper. Confirmed live: `apps/annotate/config.js`'s
   note says "`rebuild`", not "`CONFIG.rebuild`", so it passes today by
   coincidence of wording. Named here rather than filed because the author
   recorded it and the viewer's side is now the good shape to copy from.
8. **The command-ban vocabulary now exists in three places**: the shared
   `ReaderFacingBans.BANNED`, `tests.js`'s local `noCommandsOrPaths` (`.py`,
   `venv-win`, `\`) and `run_viewer_browser_tests.mjs:352`'s inline
   `!/\.py|venv-win|C:\\/`. Only the first got the widening. All pre-existing,
   already covered by the overlay's "re-spells a fast-tier helper as an inline
   regex" entry, and mentioned here because this diff widened one of the three.

### Correction made to one of the handoff's own issues

`ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_entry`
proposed, as a cheap extra witness row, "reverting the shape back to that
literal … should redden the banner walk". **It does not — measured.** With the
shape entry replaced by the old single literal, `node apps/viewer/run_tests.cjs
--repo C:/workspace/tolstack` is `480/480` and `node
apps/annotate/run_tests.cjs` is `154/154`. Once every live command site is gone,
no walked surface prints a script filename at all, so no guard can tell the
literal from the shape: the widening's value is prospective and is witnessed
only by a mutation that *plants* an unspelled filename on a walked surface. I
appended a dated correction blockquote to that issue in place, so the row is not
transcribed as written into `scripts/mutation_witnesses.json`. Its first row
(re-adding a command to `missing()`) I re-measured and it is accurate — it fails
on the shared shape ban naming `"python.exe"`, though the literal `venv-win`
entry would have caught that mutation too.

### Lesson audit (canonical check: re-derive every count and every causal claim)

Every number in `LESSONS_20260921_policy_free_brief_residues.md` re-derives:
crops 6→7 resolved and 18→17 unresolvable (`summary_topology`), the three
projection stamps, the `FsaAdapter.isSupported()` predicate
(`apps/annotate/storage/fsa.js:32`), and the already-corrected monotone-lane
comment at `apps/viewer/topology.js:1947` (confirmed present, not re-derived).
Its two causal claims — that the disjunction was not the only thing pinning the
defect, and that the no-FSA arm has no assertable copy — I reproduced by
mutation above. The only quantity I could not verify is §4's account of the
main-checkout stamps *before* the rebuild (`master @ 1946330`, built 05:06),
which the rebuild overwrote; everything around it is consistent.

## Tests

Pre-merge risky subset, chosen from the overlay's diff-shape map (`apps/viewer/`
+ CSS + topology data + a guard — all four rows apply, unioned):

| what | where | result |
|---|---|---|
| `pytest -q tests/test_topology.py tests/test_topology_projection.py tests/test_topology_prose_for_a_reader.py tests/test_title_style.py` | review worktree | **458 passed** |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | review worktree, real tier armed | **480/480**, 87 of them `[real]` (total moved well past the 302 a mangled `--repo` gives) |
| `node apps/annotate/run_tests.cjs` | review worktree | **154/154** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | review worktree, `node_modules` junctioned in from the main checkout | **25/25 suites**, including `annotate hosted posture 18/18` and `annotate flyout 45/45` — the two the FSA split touched |

Post-merge full suite (fast-forward merge of `handoff/policy_free_brief_residues`
into `review/policy_free_brief_residues`; `integration` had not moved, so there
was no conflict to resolve):

| what | where | result |
|---|---|---|
| `venv-win/Scripts/python.exe -m pytest -q` | review worktree (the merged tree) | **1 failed, 1208 passed** |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | review worktree (all 73 entries) | **70/73 witnessed** — and the three misses are *exactly* the known baseline |

The one red is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
and it is the documented worktree environment failure: `data/projections/` is
gitignored and main-checkout-only, so the runner reports its node-fs tier
SKIPPED and that test fails by design rather than skipping. **Nothing was left
unexercised by it** — I ran that same tier through the `--repo` seam with the
real tier live (480/480, 87 `[real]`), which is the arming the cadence asks for.
The main checkout sits on `master` and a `pytest` typed there would measure
trunk, not this merge, so it was not used as a verdict on the merged tree.

**The mutation tier, post-merge, is the answer to the overlay's "a review merge
is the one place the mutation tier is …" entry — and it is clean.** All three
misses reproduce `ISSUE_20260921_three_declared_mutations_are_unwitnessed_on_trunk_after_the_batch_merge`
name for name *and diagnosis for diagnosis*:

```
70/73 declared mutations witnessed
NOT WITNESSED:
  leader-style-survives-a-topology-switch — another check reddened, but not the declared one
  worst-verdict-ranks-worst-last — the tier never reached the witness
  arriving-at-an-element-shows-its-part-in-3d — the witness cannot see the difference
```

None of the three touches a file or a surface in this diff (`topology_app.js`
leader style, `worstVerdict`'s key order, the annotate 3D scene call), the clean
runs of every affected suite were green, and the count matches trunk's
2026-09-21 baseline exactly. **So this handoff neither introduced a witness
regression nor lost coverage in the merge**, and that issue keeps its three
entries — it is not made worse and needs no re-filing. That issue also notes no
full-tier baseline had been written down anywhere since `54/54`; this run is one:
**70/73 on `review/policy_free_brief_residues` @ `d21a74d`, 2026-09-22.**

**Tactical full-suite record.** I have no tactical report file to read; the
lesson records the projection rebuild in detail but states no suite counts.
Under the cadence that voids the benefit of the doubt, so the full suite above
was run before the integration merge rather than only after it, and the
mutation-witness tier was run as well.

## Note for the next reviewer

- The mutation-witness registry still has no rows for this handoff's four
  guards, by a deliberate and correctly-reasoned deferral (a sibling worktree
  held `mutation_witness_enrollment_backlog` all session), and the shapes are
  filed with `find`/`replace` measured in-session — minus the one row corrected
  above. Whoever enrolls them should read that correction first.
- The overlay gained two entries: a literal→shape ban widening that no mutation
  of the list can witness, and copy borrowed between the two near-twin apps
  carrying a justification only one of them has.

**Verdict: APPROVE** (0 blockers). Merged to `integration`.
