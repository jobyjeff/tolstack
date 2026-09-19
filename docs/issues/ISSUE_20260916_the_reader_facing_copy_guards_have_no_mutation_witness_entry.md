---
type: chore
priority: med
status: resolved
area: scripts/mutation-witnesses
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
found_by: docs/sessions/HANDOFF_20260916_reader_facing_copy_and_vocabulary.md
resolution: handoff completed 2026-09-18 -- closed automatically by dispatch when handoff `mutation_witness_enrollment_gaps` moved to completed/; not independently verified.
---

# The two surface guards `reader_facing_copy_and_vocabulary` added have no `mutation_witnesses.json` entry — both are paste-ready

That handoff's "Do NOT touch" list fenced `scripts/mutation_witnesses.json` and
said: *"Do not enroll your new guard in the witness tier yourself; name it in
your lesson so that handoff can."* The handoff it pointed at —
`HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md` — is in
`docs/sessions/completed/`, so there is no session left to do the enrolling.
This is that work, with an owner.

Same shape and same argument as
`ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry.md`, filed a day
earlier for the same reason: a guard watched reddening by hand in one session's
lesson is a hand check that no runner repeats, which is precisely the gap the
witness table exists to close.

## Why these two are worth a standing entry rather than the usual "it has a test"

The guards are *scans*. A scan that finds nothing and a tree with nothing to
find look identical from the outside, and this handoff proved that is not
hypothetical: the field-name half of the guard shipped for an hour with
`new RegExp("\b" + name + "\b")` — one backslash, which JS reads as U+0008
BACKSPACE — so every pattern was `<backspace>name<backspace>`, the scan matched
nothing ever, and the whole suite was green. Nothing in the repo could have told
that from a correct tree. What told it was a planted mutation failing to redden
the guard. A standing witness entry is that plant, repeated.

## Two entries

Both mutations below are the ones actually planted and watched reddening
(2026-09-16), then reverted. Both `find` strings resolve to exactly **one**
place in their file and both `expect_red` strings to exactly one place in
`apps/viewer/tests.js`, checked directly; whoever lands these should still
replay `tests/test_mutation_witnesses.py`'s own `source_of()` / `joined_source()`
helpers rather than trusting this paragraph.

```json
{
  "id": "rendered-text-guard-sees-a-run-id-shape",
  "contract": "BANNED_IN_RENDERED_TEXT carries SHAPES as well as literals, and the surface walk reaches the stack-side element pane. A drawing-checker run id printed as reader-facing text reddens.",
  "issue": "docs/issues/ISSUE_20260916_the_element_pane_still_prints_bare_drawing_checker_run_ids_as_link_text.md",
  "note": "This is the exact defect the eight-literal ban could not see for as long as it existed: no literal in it spells a run id and none could, and no walk reached views/detail.js. The mutation restores the shipped-until-2026-09-16 line, so a live element pane prints `20260723_163810` and three more.",
  "file": "apps/viewer/views/detail.js",
  "find": "    var summary = VA.el(\"span\", \"muted\", VA.exportRunsText(exportBlock));",
  "replace": "    var summary = VA.el(\"span\", \"muted\", \"drawing-checker runs: \" + VA.exportRunIds(exportBlock).join(\", \"));",
  "tier": "fast",
  "suite": null,
  "expect_red": "[real] no rendered stack surface of any live stack prints an "
}
```

```json
{
  "id": "rendered-text-guard-sees-a-schema-field-name",
  "contract": "The schema's own field names, read out of the projection rather than listed, must not appear as reader-facing text. A free-form block's raw key printed as its label reddens.",
  "issue": "docs/issues/ISSUE_20260916_the_reader_facing_copy_guards_have_no_mutation_witness_entry.md",
  "note": "The half that silently matched nothing for an hour on 2026-09-16 (a lost backslash in a word-boundary escape). It is spelled as an explicit wholeWordIn() now, with no escape left to lose -- and this entry is what would have caught the escape had it existed. The mutation restores the shipped-until-2026-09-16 label, so `assembly_drawing` and `temperature_c` print as definition-list terms.",
  "file": "apps/viewer/views/stack.js",
  "find": "      dl.appendChild(VA.el(\"dt\", null, VA.fieldLabel(key)));",
  "replace": "      dl.appendChild(VA.el(\"dt\", null, key));",
  "tier": "fast",
  "suite": null,
  "expect_red": "no rendered stack surface prints an internal id, a field name, "
}
```

Both `expect_red` strings above are deliberately cut short of the full check
name: the names are built from two adjacent string literals in `tests.js`, and
these prefixes each sit wholly inside the first literal, so they resolve under
plain `source_of()` without needing `joined_source()`'s seam-closing. Lengthen
them only if you replay them through `joined_source()` first.

## The third guard cannot be enrolled, and it is not this issue's to fix

The same handoff added `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain`
(`tests/test_js_python_vocabulary.py`) — a Python scan over `apps/viewer/*.js`,
watched reddening on `VA.needsAnnotation` reverted to
`confidence === "untraced" || confidence === "no_source_ref"`. The witness table
has **no tier for a pytest guard**
(`ISSUE_20260916_the_mutation_witness_table_has_no_tier_for_a_pytest_guard.md`,
open), so there is nothing to append it to. Land these two; leave the third
until that issue is resolved, and enroll it then.

## Repro / verification for whoever lands this

```
venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py
node scripts/run_mutation_witness_tests.mjs
```

Note that both entries' `expect_red` checks read the **live** projections at
`C:\workspace\tolstack\data\projections\viewer\`, so the runner needs whatever
`--repo` argument the fast tier takes to see them; a run where those checks are
skipped for want of data proves nothing about either mutation.
