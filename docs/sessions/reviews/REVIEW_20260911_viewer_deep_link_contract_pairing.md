---
type: review
handoff: docs/sessions/active/HANDOFF_20260911_viewer_deep_link_contract_pairing.md
reviewer: review agent (opus)
date: 2026-09-11
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-11 — viewer_deep_link_contract_pairing

Work reviewed: `handoff/viewer_deep_link_contract_pairing`, two commits
(`e5c207b` tests, `267d7e0` lessons), 483 insertions across two new files —
`tests/test_viewer_deep_link_contract.py` (9 tests) and
`docs/sessions/lessons/LESSONS_20260911_viewer_deep_link_contract_pairing.md`.
No other file changed. Merged into this review branch as a fast-forward
(`fbd9993..267d7e0`); no conflict, so there is no resolution to report.

The seven mandatory checks in `docs/prompts/REVIEW_AGENT.md` are **not
applicable**: this work is not a tolerance stack and adds no element, no
`source_ref` and no number. Nothing here asserts a physical quantity, so the
provenance audit those checks exist for has no subject. What follows is the
universal checks plus the doc-scan-specific entries in this repo's overlay,
which are the ones this deliverable lives or dies by.

## What I verified

### The handoff's own scope fence — held

`apps/viewer/viewer.js` and `apps/viewer/tests.js` are untouched
(`git diff --stat integration...handoff` names two files, neither of them
these). `apps/viewer/README.md` is also untouched, which the handoff permitted
only "if a mismatch already exists" — I confirmed no mismatch existed: the six
rows and the "answers six selection params" sentence were already correct
against `VA.DEEP_LINK_PARAMS`, so no edit was the right answer, not an omission.

### The guard has been observed failing — four replays on the real tracked files

The canonical universal check ("a new guard has been observed failing") is the
whole review here, and the in-module replays are not enough on their own since
they mutate strings in memory. I mutated the **real files on disk**, ran the
live suite, and restored (`git status --porcelain` clean afterwards, verified).

**Pre-work baseline, to prove the guard is not redundant.** On `integration`
before the merge: `759 passed, 1 skipped`. With the `` `element=<id>` `` row cut
out of the real `apps/viewer/README.md`, **still `759 passed, 1 skipped`** — the
repo had no check that could see this, which is exactly the issue's claim and it
is now measured rather than asserted.

1. **Row cut** (real README, `element` row deleted) — red, and the message names
   the right file and the right constant:
   *"apps/viewer/README.md's deep-link contract disagrees with
   VA.DEEP_LINK_PARAMS: VA.DEEP_LINK_PARAMS carries 'element', and the
   `## Deep links in` section of apps/viewer/README.md has no `element=<id>` row
   for it"*.
2. **Phantom row** (`` `revision=<id>` `` added to the real table) — red on the
   reverse direction: *"documents a `revision=<id>` row and VA.DEEP_LINK_PARAMS
   has no such param — the page ignores that query key"*.
3. **The issue's actual scenario, forwards** — a seventh param (`"revision"`)
   added to the real `VA.DEEP_LINK_PARAMS` in `viewer.js`, README untouched. Red
   with both the missing-row problem and the stale-count problem. This is the
   one that matters: it is the failure the handoff exists to make impossible,
   and it now fires from the constant's side without anyone touching the README.
4. **Section deleted** (heading through next `## ` cut from the real README) —
   `LookupError: expected exactly one ## Deep links in ... heading in
   apps/viewer/README.md, found 0`, and 9 tests red. This is the narrow slice of
   the overlay's "a doc-scan guard cannot fail on a deleted section" that is
   genuinely closed here, because the heading lookup **is** the extraction rather
   than a filter applied after one.

### The section scoping is load-bearing, not decorative

The module's central claim — that this repo's existing name-anywhere guard
(`_ENUMERATED_STATE_VOCABULARIES`, `tests/test_tolerance_stack.py`) would be
*vacuous* here — is the design's whole justification, so I measured it rather
than reading it. With the deep-link section removed from the README entirely,
the remaining text still contains: `topology` 64×, `study` 21×, `edge` 52×,
`node` 28×, `stack` 54×, `element` 18×. A name-anywhere scan over this README
can never fail for **any** of the six. The claim is exact.

I also confirmed `_state_mention_pattern` / `_surface_readme_text` really are
name-anywhere over the whole surface README, so the comparison is honest about
what it is rejecting.

### The claim shape, and the `mock` exemption

`_PARAM_CLAIM` matching `` `<param>=<id>` `` rather than the bare name is the
second scoping, and it is needed *after* section scoping: the section's own
prose writes `` `topology` `` and `` `stack` `` in the give-one-not-both rule, so
a bare-name match inside the section would be satisfied for two of six by prose
documenting no row. `?mock=1` staying out of the reverse direction because the
document spells it `mock=1` and never `mock=<id>` is a shape consequence rather
than a maintained exemption list, and it is pinned by its own test. Good.

Worth recording because it is stronger than the module claims for itself:
`_cut_row`'s regex is anchored on `^\|`, so
`test_every_one_of_the_constants_params_is_individually_load_bearing` fails with
*"expected exactly one `<param>=<id>` table row to cut, cut 0"* if a param is
documented in prose but has no **table row**. The pairing is therefore row-shaped
in practice, not just section-and-backtick shaped.

### The count claim — a deliberate scope addition, and I agree with it

The handoff asked for the param pairing; the author also paired *"answers six
selection params"* against `len(VA.DEEP_LINK_PARAMS)`. That is one step past the
brief, argued in the lesson, and it is the right call: replay 3 shows the param
scan alone would have read a seventh param as a document that merely *omits* a
row, while the sentence one line above the table went silently false. CLAUDE.md's
"a quantity written in prose that no test reads from the tree is a defect" points
the same way.

Checked for the false-positive failure mode the overlay warns about
("a doc-scan guard's *false positive* — feed it the shapes this repo actually
writes"): `_COUNT_CLAIM` allows **at most one** word between the number and
`params`, which is narrow by the standard of `_retired_ratio_pattern`'s 40-char
wildcard that caused that entry. Against the live section it matches exactly
once; the section's other numbers ("in **one** constant", "pinned by tests in
**both** repos") are not followed by `params` and do not match. And
`test_neither_side_of_the_pairing_is_empty` asserts a count claim still exists,
so deleting the sentence to dodge the check is itself red.

### Both extractions asserted non-empty

`test_neither_side_of_the_pairing_is_empty` asserts the constant, the documented
params and the count claims are all non-empty, plus `len(section) < len(readme)`
so a scoping regression that swallowed the file would be caught. `js_array_strings`
raises on a renamed/missing constant, `contract_section` raises on a missing or
duplicated heading. There is no path on which this scan quietly compares two
empty sets.

### Universal checks

- **No data pollution.** `data/` in this worktree is unchanged (two tracked-README
  dirs, nothing new), and nothing under `C:\workspace\tolstack\data` was written in
  the session window. The new module reads two tracked files and writes nothing.
- **Nothing written into drawing-checker.** I read that repo only
  (`docs/sessions/`, `webui/analyses.py`) to verify the cross-repo claim.
- **A restated count with nothing pairing it** — this deliverable *is* the fix for
  one instance of that pattern; it introduces none of its own. The module never
  restates the six params, and names `DEEP_LINK_PARAMS` exactly once in a constant.
- **Test module inventory.** `ARCHITECTURE.md`'s `## Package layout` block
  inventories the `tolerance_stack` package, not `tests/`, so a new test module
  needs no row — confirmed against `tests/test_architecture_inventory.py`, and the
  suite agrees.

### Numbers in the lesson — all re-run, all correct

Every quantity the lesson states, re-derived rather than read:

- `768 passed, 1 skipped` — confirmed (759 + 1 baseline, + 9 from this module).
- Viewer JS fast tier with the main checkout's data,
  `node apps/viewer/run_tests.cjs --repo "C:/workspace/tolstack"` — **283/283**,
  confirmed.
- The same runner from this worktree without `--repo` — **234/234** with
  `SKIP node-fs tier`, confirmed, and it is the gitignored-`data/` rule rather
  than a regression, as the lesson says.
- The cross-repo consumer it cites is real: drawing-checker's
  `analyses_viewer_deep_link`, code live in `webui/analyses.py`.

The lesson's closing table (does section scoping generalize to the README's other
four contract tables?) answers the handoff's explicit ask, names the four without
building scans for them, and its three observations — especially that the value
came from the *cross-repo consumer* rather than from the table being a hand-copy —
are the right brief for a future handoff. The `## Hover crops` status table having
no constant to pair against at all is the useful one.

## Findings

No blockers. No should-fix findings **against this work**.

### Nit — replay assertions cascade when the guard fires for real

`test_the_scan_goes_red_when_a_table_row_is_cut`,
`test_the_scan_goes_red_on_a_phantom_row` and
`test_the_scan_goes_red_when_the_stated_count_drifts` each assert
`len(problems) == 1` against a mutation of the **live** README. When the live
pairing is genuinely broken, their mutation stacks on top of the real defect and
they fail too — replay 1 above produced 6 red tests, of which 3 report mutation
bookkeeping (*"expected exactly one `revision=<id>` table row to cut, cut 0"*)
rather than the defect. The primary assertion is still first and still names the
file and the param, so diagnosis is not lost, only diluted. Not worth changing
now: asserting `len(problems) == 1` is what proves the mutation caused *exactly*
the expected problem, and loosening it to `any(...)` would trade a real property
for tidier output on a day that should be rare. Recorded so the next reader knows
the noise is expected and reads the first failure.

### Out of scope — filed, not fixed

`ISSUE_20260911_viewer_readme_calls_the_drawing_checker_consumer_staged.md`
(`chore`/`low`). The contract section's opening sentence says
`analyses_viewer_deep_link` is "staged in that repo". It shipped: completed
handoff, review and lesson in drawing-checker, code live in `webui/analyses.py`.
That adjective is what tells a tolstack reader how much a change to this section
costs, and it currently understates it — which is the argument for the
"treat a rename as breaking" rule one line below. Outside this handoff's fence
(`tests/`, plus the README only on a *param* mismatch, and there was none), so
filed per file-don't-fix.

## Overlay updated

Added one **Recurring bugs** entry: *a section-scoped doc scan's "not vacuous"
replay written inside the section by mistake.* The author hit this and fixed it —
text sitting above the next `## ` is still inside a heading-to-next-heading
section, so the natural insertion point for the negative case lands in scope and
the replay fails for a right-looking wrong reason. It is a new failure class,
it will recur the moment anyone writes the second section-scoped scan (the
lesson's own table proposes four candidates), and the shipped
`test_the_section_scoping_is_not_vacuous` is the correct shape to copy. No
entries pruned; no existing entry got a second sighting in this review.

## Note for the next reviewer

This is the third viewer-doc guard in a row (`enumerated_state_doc_guard`,
`hardware_counts_doc_guard`, now this). They have different scopes and the
overlay's "Two doc-scan families, two different scopes" entry already says to
check which one you mean — after this handoff there are **three**, and only this
one is section-scoped. If a future handoff builds a fourth from the lesson's
table, the first question is not "does the regex work" but "what does its
*section extraction* do when the heading is gone" — which is where the other two
families are still blind.

## Verdict

**APPROVE.** Merging to `integration`.
