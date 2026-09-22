# LESSONS — policy_free_brief_residues (worked 2026-09-22)

Three briefs' policy-free halves, done in one session. The handoff asked for one
specific record: **how far a brief's own account of its policy-free half can
drift from the tree**, because the 2026-09-21 sweep found one advertised
no-regrets item already done. Answer per item below, then the two things that
cost real time.

## 1. Was each brief's description accurate?

| brief | its claim | what the tree actually held |
|---|---|---|
| `BRIEF_20260911_served_surface_capability_gaps` item 4 | "three-quarters done; the fourth site is `views/banner.js`, two call sites" | **Undercounted.** The two banner call sites were real, but `VA.CONFIG.rebuild` had a **third live reader** the brief does not mention — `apps/viewer/views/topology.js`'s no-projection empty state — and a **fourth, unrelated site** hardcodes the same command in `views/stack.js`'s no-loader warning. So "the fourth site" was sites four, five and six. |
| `BRIEF_20260915_origin_posture_and_absent_feature_rule` | "splitting the wait ... has no policy content and can be staged before any of this is decided" | **Accurate, and its own 2026-09-21 filing note is accurate too.** The split needed no policy call. But see §2: the brief understated its own scope by three checks. |
| `BRIEF_20260911_endstop_topology_retrace_and_f12` | "item 2 is a Jeff/CAD question that gates part of item 1" | **Accurate at filing, stale by twelve days.** The handoff was right that `stack_fable_audit` closed the gate on 2026-09-15 and that the answer is recorded in `pitch_link_length`'s own `source_ref.note`. The brief itself was never updated. |
| `BRIEF_20260914_dag_layout_geometry_tradeoffs` | advertises a no-regrets monotone-lane proof comment | Already done, as the handoff said. Confirmed at `apps/viewer/topology.js:1947`, not re-derived. |

**The shape, and it is the useful record:** a brief's account of its policy-free
half decays in one direction — it **undercounts**. Two of the four were wrong,
and both were wrong by naming *the sites someone had already looked at* rather
than the class. The brief that named a class (`origin_posture`, "assert which of
the two states it is in") was the one that held up. So: when a brief points at a
site, grep for the shape before believing the count. `grep -rn "CONFIG.rebuild"`
took ten seconds and found a third of the work the brief did not know about.

## 2. Could deliverable 2 be split without the brief's decision? — YES, and here is the input the strategy session wanted

Cleanly, and the split is smaller than the brief implies. The discriminator is
one predicate that **already exists in app code**:
`AA.FsaAdapter.isSupported()` (`apps/annotate/storage/fsa.js`) is
`typeof window.showDirectoryPicker === "function"`, and the test can read the
same thing off the surface under test in one `page.evaluate`. No new API, no
policy.

What the split needed that the brief did not name:

- **The disjunction was not the only thing pinning the defect.** In
  `testAnnotateHostedPosture`, the three checks *below* it — the full bind
  workspace renders, a real canvas exists, the dev console is wired — are the
  ones the brief itself measured as **the defect** on a no-FSA browser.
  Asserting the banner correctly and then asserting the workspace
  unconditionally leaves the guard exactly as pinned as before. All three moved
  into the has-FSA arm.
- **The no-FSA arm has no assertable copy, and it is not close.** Today's
  sentence names an API (`File System Access`), tells the reader to change
  browser, and offers `?mock=1` — a query parameter, i.e. a backend id a user
  cannot know without reading code. Every one of those is against a standing
  house rule, so asserting today's copy would pin three defects to un-pin one.
  Both sites' no-FSA arms are therefore **explicit named skips** naming the
  brief.
- **The brief's own question, sharpened by doing this:** the two arms are not
  symmetric in cost. The has-FSA arm is fully assertable today. The no-FSA arm
  cannot be asserted *at all* until the policy call, because there is no
  sentence a guard could hold that is not itself a violation. So the strategy
  session is not choosing between two writable expectations — it is deciding
  whether that state has copy at all, or is withheld entirely.

One mechanical note for whoever writes the decided arm: the test browser has FSA
and always will, so **the no-FSA arm never executes in CI.** It is reachable only
by `page.addInitScript(() => { delete window.showDirectoryPicker; })`, which is
how both arms were verified this session. A decided expectation that is not
wired to that init script is a check that runs on nobody's machine.

## 3. Things that cost time

- **`reader_facing_bans.js`'s literal list was reading as coverage of a class it
  covered a fifth of.** It carried `build_viewer_crops.py` — one filename — while
  four other build commands were live on viewer surfaces. Replacing the literal
  with a shape found nothing new by itself, because *the banner was in no walk at
  all*. Three of the four command sites had been removed one at a time, by hand,
  each time leaving the others, for exactly that reason. **The lesson is not
  "widen the list"; it is that a ban list's value is bounded by which surfaces
  are walked, and nobody had ever checked which those were.**
- **Enrolling the banner immediately found two things I had to decide about.**
  (a) The READY banner's `<details>` body legitimately prints
  `C:/workspace/tolstack/docs/tolerance_stacks` — the resolved stacks-dir — and
  that is what the fold was created *for*. `viewerAuthoredText` grew an
  `extraSkip` parameter so the enrolling surface can name its own exemption,
  kept separate from `VERBATIM_PROSE_CLASSES` because the argument is different
  ("the reader clicked to open this" vs "the record is speaking"). (b) The
  DISCONNECTED banner prints `C:\workspace\tolstack` as a real affordance — the
  folder to pick in the picker — and is the one banned string on a viewer
  surface that is arguably correct. Two of six banner states are therefore
  excluded, named in the test and owned by
  `ISSUE_20260922_the_disconnected_banners_folder_path_is_unscannable`.
- **A static `includes("CONFIG.rebuild")` check fails on its own documentation.**
  Every file that retired the table names it in a comment, on purpose. The
  annotate precedent gets away with a raw `includes` only because its comment
  happens to say "`rebuild` entry" instead. Added `codeOnly(src)`, a line-based
  comment strip — deliberately line-based, because stripping `//` anywhere cuts
  `"http://127.0.0.1:8000"` in half.
- **Three guards bit on the topology edit, and none of them was wrong.**
  `_RETRACED_CONFIDENCES` (allowlist, `test_topology.py`), the croppable set
  (6 to 7) and the uncroppable count (18 to 17, `test_topology_projection.py`).
  The last two are the same fact from opposite sides and were *not* documented
  as a pair; they are now, because a drop on one side with no gain on the other
  is a citation **lost**, not upgraded, and two independent numbers can both be
  edited to green.

## 4. The projection rebuild — the handoff's instruction could not be followed literally

The handoff says to re-run `scripts/rebuild_projections.ps1` **from the main
checkout**. That script builds from its own `-RepoRoot`'s tree, and the main
checkout is on `master` — so running it there rebuilds *trunk's* topology and
cannot contain this branch's edit. The main checkout's three projections were
already stamped `master @ 1946330`, `behind_trunk: 0`, built 05:06 the same day,
so the literal instruction was a no-op refresh.

What was actually run, from this worktree, using the main checkout's
interpreters and `--data-root C:/workspace/tolstack/data` (the seam `CLAUDE.md`
names for exactly this): the three builders by hand, in the script's own order.
Stamps after: all three `handoff/policy_free_brief_residues @ 26049c8f`,
`dirty: false`, `behind_trunk: 0`.

**Consequence the next agent must know:** the shared projection is now stamped
with a branch that trunk does not contain, so **the next rebuild from a tree
without this branch will be refused with exit 3** by the provenance gate. That
is the gate working, not a breakage; `--allow-older-tree` is the documented
override, or merge this branch first. A no-op refresh from trunk would have
avoided it and also silently dropped this session's only data-visible change —
`tan_link_mount_height`'s crop now resolves (`source_ref_export`,
`sha256_verified: true`, whole-sheet), 7 topology inline citations resolved
where there were 6, and 17 unresolvable where there were 18.

**One honest limit on that crop:** it is `located_by: "sheet_full"`, note
*"whole sheet — no zone cited and the callout text matches zero or many
places"*. Worksheet §11b names the view (sheet 1's side view, SECTION A-A's
parent) but no zone, and inventing one to narrow the crop is exactly what this
repo forbids. `scripts/record_spec_crop_region.py` is the seam if someone later
wants to declare the region properly.

## 5. Left undone, all filed

- `ISSUE_20260922_the_stack_pages_no_loader_warning_is_the_fifth_terminal_command_in_the_viewer`
  — `views/stack.js`, outside this handoff's stated file scope. The new shape ban
  *would* catch it, except no fixture or live projection reaches the branch.
- `ISSUE_20260922_the_disconnected_banners_folder_path_is_unscannable` — the two
  unenrolled banner states, `audience: strategy`.
- `ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_entry`
  — four new guards, with the `find`/`replace` shapes measured in-session.
  `mutation_witness_enrollment_backlog` was active in a sibling worktree all
  session, so that table was deliberately not touched.
