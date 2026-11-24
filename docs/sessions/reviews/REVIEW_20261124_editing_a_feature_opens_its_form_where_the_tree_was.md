---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md
reviewer: agent
date: 2026-11-24
verdict: APPROVE
blockers: 0
---

# Review — editing_a_feature_opens_its_form_where_the_tree_was

Branch `handoff/editing_a_feature_opens_its_form_where_the_tree_was` (tip `95cc7096`, 20
commits). It was cut from `integration` at `23d8b0f3`, which had not moved, so the merge into
`review/…` was a fast-forward. The trees before and after the merge are the same
(`a9f6e1d7`), and the subset and the full suite below ran on that one tree.

## What I verified

- **Deliverables 1–10, against the code.**
  - The form replaces the tree (`navColumn` is the one place either is shown).
  - Opening: double-click (each click's own `timeStamp`, plus a delegated `dblclick`), the
    pencil, or Enter on the selected row.
  - The set is a list of lines: surfaces with segment counts, patterns with hole counts.
  - A click toggles a whole surface (`AA.editToggle`). `#an-offer` and `offerGroup` are deleted.
  - Hover goes both ways (`formHover` → `hover face`).
  - Every suggestion is a line. "Where it came from" is said only on suggestion lines, and
    history sits behind a `<details>`.
  - Only the tick writes (`AA.planEditCommit`). An unchanged set writes nothing.
  - Next opens `VA.nextUnboundFeature`.
  - Leaving restores the saved anchor.
  - Correct, Add a face, Remove, the bind bar (`buildBindForm`) and the body marks are deleted.
  - Joint rows already count "n of m" in the tree.
  - No schema change.
- **The tick's events fold in Python.** I planned a tick in node with `AA.planEditCommit`: a
  noted binding, four open proposals, one of them dismissed. I folded the result with
  `feature_identity.build_projection(events, load_models())`. It loads, one binding stands,
  and no proposal is left open. The JS fold takes an answered proposal out of the end record
  it lives in (`identity_fold.js`), so the tick's proposal list holds only open ones. A
  proposal answered twice, which would be a load error, is not reachable this way.
- **Jeff's log is unchanged.** `C:\workspace\tolstack\data\inbox\feature-identity\` holds 116
  files, as the lesson says. The main checkout's `git status` is clean.
- **Lesson audit.**
  - The "(44)" witnesses are 44 *mutations* across 34 added or modified spec files (27 A,
    7 M). The count is right; the lesson's word "spec" means entry.
  - Census pins: fast 631→617, annotate 335→339, browser 805/776→767/740. These match the
    retired and added guards.
  - The annotate fast tier passes 339/339, as recorded.
  - The default pytest counts (2 red, then the pins written back) are consistent with my
    1 red.

## Tests

The tactical report records a default pytest run, the fast tiers, `--only` browser runs and
the witness `--only` runs, with counts. I gave that record the benefit of the doubt.

- **Subset (the `apps/annotate/` + `apps/viewer/` + CSS + guard rows), same tree:**
  - `node apps/annotate/run_tests.cjs`: **339/339**.
  - `node apps/viewer/run_tests.cjs --repo <scratch root>`: **617/617**, `[real]` armed and
    paired ("the projection this tier reads was built from this tree").
  - Against the main checkout instead, the same tier refuses as designed (516/517, tier
    skipped).
- **Scratch root.** `data/scratch/rv_form_1124` was copied from the main checkout and rebuilt
  with all eight builders from this worktree (`--data-root … --allow-older-tree`). I set my
  own edits aside during the build, so every stamp is of a clean tree.
- **Default pytest** (worktree, serial): `1 failed, 2619 passed, 3 skipped, 4 deselected in
  501.44s`. The red is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, which
  is red in every worktree by design. Its tier ran green above through `--repo`. This repo's
  conftest prints no contention header lines. Recorded at 503 s, inside budget.
- **Whole browser tier:** `node scripts/run_viewer_browser_tests.mjs --repo <scratch root>`:
  **45/45 suites, 953 checks**, 1994 s. That is **over the 1800 s budget**. The ledger row
  self-recorded (`over: true`), and I appended the measurement to the open
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.
  It was 2206 s at the previous review. The new "a feature's form" suite is 172 s.
- **Witness gate:** `--changed-since 23d8b0f3 --budget-min 10`: **15/15 witnessed**, 15 of
  115 reached, 100 left to the sweep by budget, exit 0. The tactical session's own `--only`
  runs witnessed all 44 of its entries.
- **Not exercised:** the annotate `run_browser_check.mjs` mock pass. It is known-red since
  11-15 (`ISSUE_20261115_…correction_pass_throws…`), and this diff does not touch the scene
  placement wiring.

## Findings

### Should-fix (filed, not blocking)

1. **A tick that answers two or more proposals drops the binding's carried-over fields.**
   - Where: `AA.planEditCommit`, `apps/annotate/binding_state.js`.
   - The first event goes through `buildFeatureSetEvent`, which carries the note, modifier,
     owner and regime over. Each further ratification is a bare `buildBoundEvent` that
     supersedes the one before it, and the last of these is the binding that stands.
   - Measured: with `note` and `gdt_modifier: "M"` on `b1`, the standing `tick-ratifies-3`
     has neither after the Python fold.
   - Latent: no binding in Jeff's log carries these fields.
   - Filed: `ISSUE_20261124_a_tick_answering_two_proposals_leaves_a_binding_without_its_note_and_modifier.md`.
     I also added a Recurring-bugs entry to the overlay ("One gesture written as a CHAIN of
     events").
2. **The lesson's "could not carry into the form" list misses the bind bar's five optional
   fields.** Composition note, owner part, GD&T modifier, regime and note now have no writer.
   The handoff asked for that list. Nobody has used these fields.
   Filed: `ISSUE_20261124_no_surface_writes_a_bindings_note_modifier_or_owner_part_since_the_bind_bar_retired.md`
   (`audience: strategy`).

### Nits

- `apps/annotate/binding_state.js` changed from LF to CRLF line endings: 952 lines changed,
  224 real ones. `git diff --ignore-cr-at-eol` shows the real change. Blame on that file now
  points at this branch.
- `editSuggestions` takes a mate row's hole count from its display text (`holesIn(r.text)`,
  `/holes/.test`). If that wording changes, the row quietly reads as a surface.
- The `dblclick` fallback in `wireFormKeys` opens the last-clicked feature for a double-click
  on any tree row within 1.35 s, including a part or body row.
- If the pane's `arm` fails, the form stays in its waiting state (✓ disabled) with no reason
  shown. The pane's banner is the only sign.
- The toast reads "Saved · 0 faces" on a tick that empties the set (the let-go).
- On a dismissal-only tick, `lastBound` marks the end "just bound".

### Design

Read against the shots (`a1`, `c1`). There is one accent (the green held lines), the
suggestion lines are muted with their reason under them, and clipped text keeps a hover.
Nothing to file.

## Also

- `ISSUE_20260921_the_annotators_help_button_discards_a_half_filled_bind_form.md` (deferred)
  is about the deleted bind form. I added an addendum saying so, for triage.
- The handoff's three filed issues (Flip, the hidden rail, the shoulders' words) have valid
  frontmatter. The four resolved addenda match the code.

## Verdict

**APPROVE.** No blockers. Both should-fixes are filed. The work lands on `integration`.
