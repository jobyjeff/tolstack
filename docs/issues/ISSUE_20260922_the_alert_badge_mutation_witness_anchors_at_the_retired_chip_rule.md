---
type: bug
priority: med
status: resolved
area: scripts/mutation_witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md
---

# `alert-badge-is-not-filled` anchors at the retired `.chip--alert` rule, and its three anchor guards are red on this branch

## What happened

`stack_page_alert_marks_and_drawn_glyph` (2026-09-22) replaced the elements
table's alert badge with a drawn, unframed mark: the `.chip--alert` CSS rule is
deleted, the badge's class is `.rowalert`, and the browser tier's sub-check
that pinned "not filled" was reworded to pin *"not filled and wears no box"* --
because the frame went with the character and a CSS claim that describes a
shape the app no longer has is worse than no claim.

The mutation-witness entry `alert-badge-is-not-filled` still points at both of
the old strings, so **three guards in `tests/test_mutation_witnesses.py` are
red**:

```
test_every_anchor_resolves_to_exactly_one_place     find matches 0 places in apps/viewer/style.css
test_every_expect_red_resolves_to_exactly_one_place expect_red matches 0 places in scripts/run_viewer_browser_tests.mjs
test_no_expect_red_is_a_truncated_check_name        ValueError: substring not found
```

They are red for exactly the reason they exist -- the anchor rotted and said so
loudly, which is the design. **Nothing else in the suite is affected** (the only
other red in that run is `tests/test_viewer_js_suite.py`, the documented
worktree skip).

## Why it was filed rather than fixed

That handoff's scope says, in as many words, **"Do NOT touch
`scripts/mutation_witnesses.json`"** -- `HANDOFF_20260922_mutation_witness_repair_and_enrollment`
owns that file, is staged, and is already told to *"enroll what [another
handoff] added"* if one merges first. A one-entry edit from a different session
is the merge conflict that fence exists to prevent.

## The repair, verified against the guards' own helpers

Replace the whole `alert-badge-is-not-filled` object with this. Every string
below was checked by calling `tests/test_mutation_witnesses.py`'s own
`source_of` / `joined_source` / `expect_red_hits` / `suite_registry_keys` on
this branch -- `find` resolves to 1, `expect_red` to 1, the character after the
name in the joined source is `"` (so the truncation guard passes), and the
suite key still dispatches:

```json
{
      "id": "alert-badge-is-not-filled",
      "contract": "The row's consolidated alert mark is quiet -- not filled, and not framed. It is the only alert marker on the row, so it competes with nothing and does not need to shout.",
      "issue": "docs/sessions/lessons/LESSONS_20260916_flyout_resize_annotator_filter_and_deselect.md",
      "note": "Jeff, 2026-09-16: \"Left side menu is now impressively 'loud'... Styling for the alert text themselves can then be a bit less obnoxious/overwhelming, especially the ones in the source column that are always visible.\" The mutation gives the mark the filled treatment `.chip--export-unestablished` wore, which is the loudness being removed -- and 'quieter' is a computed-style claim, so a class-name check would pass straight through it. The paired sub-check ('...but it is still findable') is what stops the fix being 'delete the colour too'. RE-POINTED 2026-09-22 (stack_page_alert_marks_and_drawn_glyph): the badge was `.chip--alert`, a character in a rounded border, and is `.rowalert`, a drawn path with no box -- so the old anchor (the `.chip--alert` declaration) no longer exists and the old sub-check name was reworded to cover the frame as well as the fill. The mutation only touches `color`, which keeps it narrow enough that the 'DRAWN and legible' sub-check above it stays green and the declared one is the only red.",
      "file": "apps/viewer/style.css",
      "find": "  display: inline-flex; align-self: center; flex: none; line-height: 0;\n  color: var(--inferred);",
      "replace": "  display: inline-flex; align-self: center; flex: none; line-height: 0;\n  color: #fff; background: var(--nocite);",
      "tier": "browser",
      "suite": "app file://",
      "expect_red": "the row's alert mark is NOT filled and wears no box — the loudness Jeff named is gone, and so is the border that was a second mark"
}
```

The mutation is deliberately narrower than the old one: it changes `color`
only, so the `DRAWN and legible` sub-check printed *before* the declared one
stays green and the declared check is the only red -- the failure mode
`ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_earlier_check_so_it_is_never_witnessed.md`
names. **It has not been replayed through the browser tier**, which is what
"witnessed" means here, so treat it as paste-ready-and-unverified in the one
sense that matters and run
`node scripts/run_mutation_witness_tests.mjs --only alert-badge-is-not-filled`.

## A second, smaller finding in the guard itself

`test_no_expect_red_is_a_truncated_check_name` fails with a bare
`ValueError: substring not found` rather than an assertion message, because it
does `joined_source(...).index(entry["expect_red"])` on a name that is not
there. The zero-match case is already reported by the test above it, so this
one has nothing to add -- but it currently reports it as a crash with no entry
id in the message, which is the least useful of the three reds. Guarding the
`index` (skip when the count is 0, and let the pairing test own that failure)
would make the triple read as one finding rather than one finding and a
traceback.

## 2026-09-22 (review) — RESOLVED: re-pointed in the integration merge, and witnessed

`REVIEW_20260922_stack_page_alert_marks_and_drawn_glyph` applied the repair
above in the review branch's own commit, under the overlay's standing rule that
**the anchor check fires at merge time and the reviewer is the one holding it**
(`docs/prompts/REVIEW_AGENT.md`). The handoff's fence was right and the filing
was right: a red `integration` was the alternative, and nothing else would have
reached this entry before the work landed -- `handoff/mutation_witness_repair_
and_enrollment` is in flight from an older `integration`, does not contain this
work, and its diff of `scripts/mutation_witnesses.json` does not touch this
entry, so it would not have picked it up.

What the reviewer changed against the paste above: the `note` records the
re-point, the commit that moved the code (`1c33359`) and the old anchor text, as
that rule requires. Everything else is the issue's own text.

Verified, in the merged review worktree:

* `venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py`
  -> **14 passed** (was 3 failed, 11 passed);
* `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack
  --only alert-badge-is-not-filled` -> **WITNESSED**, `1/1 declared mutations
  witnessed`, clean run green and the declared sub-check the red:
  `the row's alert mark is NOT filled and wears no box - the loudness Jeff named
  is gone, and so is the border that was a second mark`. So the narrower
  `color`-only mutation does keep the `DRAWN and legible` sub-check above it
  green, which is what the paste predicted and nothing had yet measured.

The second, smaller finding below -- `test_no_expect_red_is_a_truncated_check_
name` crashing with a bare `ValueError` instead of an assertion naming the entry
-- was **not** fixed here (it is a change to a guard's behaviour, outside the
inline-fix boundary) and is re-filed so it keeps an owner after this issue
closes: `ISSUE_20260922_the_truncated_check_name_guard_crashes_instead_of_
reporting_when_the_name_is_absent.md`.
