---
type: review
handoff: docs/sessions/active/HANDOFF_20260918_real_tier_red_and_the_skipping_tier.md
reviewer: agent
date: 2026-09-18
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-18 — real_tier_red_and_the_skipping_tier

Branch `handoff/real_tier_red_and_the_skipping_tier` (`a26d13a`, `9500c76`),
merged into `review/real_tier_red_and_the_skipping_tier` as a fast-forward from
`integration` at `3d2e301` — no conflict.

## What I verified, and how

**The pre-work red, reproduced first.** From the review worktree before
merging, `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` gives
**451/453** with exactly the two named failures (`not equal: 1 !== 2`, and the
`sha256` surface leak on `pitch_link_to_pitch_plate`). So the fix had a real
red to clear, and my post-merge green is a measured delta rather than an
assertion.

**Deliverable 1 — the code-vs-data verdict, independently re-derived.** The
lesson says *the data moved*, on three readings. I re-ran two of them:
`git diff --stat 861f6e6 2dd457f -- apps/viewer/` is **empty** (the merge
touched `PROVENANCE.md`, `docs/issues/`, `docs/prompts/`, `docs/sessions/` and
exactly three Python test files — `test_provenance.py`,
`test_thermal_exception_list.py`, `test_tolerance_stack.py`, as the lesson
says), and the live projection confirms both attributions:
`rotor_fastener_length.zero_width_count` is **1** with the single flagged
element `washer_ms21299c3`, and `stack_pitch_link_to_pitch_plate`'s
`joint.assembly_export_ref` exists and carries the offending sub-block. Verdict
holds.

**Deliverable 2 — the `sha256` decision.** The chosen fix is structural, not a
keyword exemption: `jointBlock` lifts `VA.JOINT_EXPORT_KEY` out and renders it
through `VA.exportBlockNode`, the one builder the element pane, topology edge
pane and citation card already share. Both rejected alternatives are written
into the code comment as the handoff asked. I confirmed the fix is not
cosmetic — the live `assembly_export_ref` really did carry all four banned
classes, and `dd.kv__value`'s membership in `VERBATIM_PROSE_CLASSES` really did
hide three of them (see the finding below).

**Mutation-tested, not taken on green.** I reverted the lift-out in place
(`box.appendChild(kvList(joint))` again) and re-ran: **452/455**, red on both
new fixture-tier checks *and* on `[real] no rendered stack surface …`. The new
guards bite, and they name the right thing. Restored afterwards.

**Deliverable 3 — the skipping tier, demonstrated both ways.**

| where | JS runner | pytest |
| --- | --- | --- |
| this branch, projection present | `455/455 passed` | `1204 passed` |
| this branch, fresh worktree (no `data/`) | `369/369 passed, 1 TIER SKIPPED -- NOT RUN, NOT PASSED` | `1 failed, 1203 passed` |

Every cell measured in this review. The failure message resolves the main
checkout correctly (`--repo C:\workspace\tolstack`) via
`git rev-parse --git-common-dir`, and it names the tier and the reason rather
than only the count. I also checked the five `skip()` call sites in
`apps/viewer/tests.js`: under `run_tests.cjs` all of `NODE_FS`, `VIEWER_SRC`
and `HTTP_FIXTURE` are injected unconditionally, so the only skips reachable
from pytest are the two "no projection" ones — the new assert has no
false-positive path, and its message is accurate for both.

**Deliverable 4 — `CLAUDE.md`.** One bullet, stating which two tiers cannot run
in a fresh worktree and what to run in the main checkout. It states the fact
and does not re-specify dispatch's batch-merge procedure, as asked.

**The tier the author could not run — I ran it.** This is the one verification
gap the session declared: it declined to add the joint export to
`apps/viewer/fixtures.js` because the browser tier's `.el-export--established`
locator is page-wide and Playwright's `textContent()` is strict, and it could
not run that tier from a worktree. `node_modules` is only 14 MB, so I copied it
into the review worktree and ran
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
**22/22 browser checks passed**, including `[real render path (non-mock)]`
(28 rows clicked, 26 reading) and the export-block suite. The rendering change
breaks nothing in the truth tier, and the author's reasoning about the locator
is correct — that check is scoped to the demo fixture page, whose joint
deliberately still carries no export ref.

**Lesson audit** (canonical universal check). Every number in the lesson's
table reproduces exactly, including the `369` / `455` / `86` arithmetic and the
`368/368`-before claim (368 pre-change results including the skip marker, plus
the two new fixture-tier checks, gives today's 369 that ran). The two causal
attributions (`5ce16f3`, `c08d705`) check out against the projection. The
"`git archive` not `git clone`" note is accurate: I reproduced the guard block
myself (see Housekeeping).

## Findings

### should-fix — filed, not blocking

1. **`VA.JOINT_EXPORT_KEY` is an unpaired twelfth hand-copy of a Python
   constant.** `apps/viewer/views/stack.js:67` vs
   `tolerance_stack/stack.py:305` — identical string, nothing pairing them.
   It is correctly a module-level constant (the comment even cites the rule),
   but it is a **bare scalar string**, which is the one shape
   `tests/test_js_python_vocabulary.py`'s two extractors (`js_object_keys`,
   `js_array_strings`) cannot see, so enrolling it needs a third extractor
   rather than a new row. Not a blocker because it fails **closed** and
   loudly — rename either side and `jointBlock` falls back to `kvList`, which
   reddens the `[real]` surface scan on the `sha256` label, which is exactly
   how this red was found — but only in the main checkout, and on the symptom
   rather than the cause. Filed as
   `ISSUE_20260918_va_joint_export_key_is_a_twelfth_hand_copy_of_a_python_constant_that_the_pairing_module_cannot_see.md`
   (`chore`, `med`). Also added to this repo's overlay as a new recurring-bug
   entry, since the extractor gap generalises past this one constant.

2. **The `dd.kv__value` exemption is unchanged, and this session proved what it
   costs.** The right fix was made at the instance (the key is no longer a
   free-form value at all), and touching the exemption was correctly out of
   scope. But the session's own measurement is the strongest evidence anyone
   has produced for the open
   `ISSUE_20260916_the_free_form_block_value_exemption_hides_the_values_from_every_scan.md`
   — a workstation path, a 64-character checksum and two run ids sat on a live
   trunk page for two days and **not one of the three shape guards fired**,
   because only the `<dt>` label is scanned. Rather than file a duplicate, I
   appended a dated "Second sighting" section with the measurement to that
   existing issue. The next authored free-form value carrying a path or a hash
   is still invisible in the same way.

### nits

3. `tests/test_viewer_js_suite.py`'s new docstring says the `[real]` tier is
   *"86 of 455 checks"* inside a sentence narrating the 2026-09-18 batch merge,
   where the suite was 453 checks (86 of 453); 455 is today's total, after this
   branch added two. Harmless, and the derived reading (`455 − 86 = 369`) is
   right — but it is a hand-restated count in a repo whose top defect class is
   hand-restated counts. Left as written; flagging rather than fixing, because
   any digit I substitute goes stale on the next test added.

4. `apps/viewer/README.md`'s Tests block lists `pytest -q` with no hint that it
   is now deliberately red in every worktree. **Fixed inline** (three comment
   lines in the command block, pointing at `CLAUDE.md`) — a doc pointer, no
   behaviour, no new test. Said here rather than silently.

5. The runner still **exits 0** on a skipped tier. This is deliberate and the
   comment says why (the mutation-witness harness and browser runner depend on
   the exit code meaning "failures only"), and `test_viewer_js_suite.py` is the
   gate that turns it red. Worth knowing that a caller testing `$LASTEXITCODE`
   instead of reading the total line still sees success; recorded in the
   overlay entry rather than filed.

### Design

The session filed its own design finding before I got here
(`ISSUE_20260918_a_joint_that_was_never_opened_now_reads_as_a_loud_file_not_identified.md`
— the two thermal stacks' joint blocks now shout a sentence written for a
citation, in the register this repo reserves for unpinnable bytes). That is the
right call and the right frontmatter (`audience: strategy`), and I found
nothing to add to it.

## Housekeeping for the operator

`C:\tmp\ts` — a 368 MB scratch clone the tactical session left behind, and
flagged honestly in its own lesson. I attempted to remove it and **reproduced
the block**: dispatch's `main_checkout_edit_guard.py` classifies the clone as a
main checkout and refuses the delete from an agent session. It needs an
operator. (I confirmed first that it contains no reparse points, so a plain
recursive delete is safe.)

## Note for the next reviewer

Two things this review learned that are now in the overlay: the viewer-JS-suite
entry has been corrected (the skip is no longer silent, but the runner's exit
code still is), and there is a new entry on running the browser truth tier
yourself — it costs one 14 MB `cp -r` of `node_modules` and three minutes, and
it is the only way anyone ever gets evidence about the tier a tactical worktree
structurally cannot run.

## Verdict

**APPROVE**, 0 blockers. All four deliverables met, the definition-of-done
numbers reproduce, both new guards were watched failing under mutation, and the
browser tier the author could not reach is green on this branch.
