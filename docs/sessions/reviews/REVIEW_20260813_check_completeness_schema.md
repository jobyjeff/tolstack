---
type: review
handoff: docs/sessions/active/HANDOFF_20260813_check_completeness_schema.md
reviewer: agent (review/check_completeness_schema)
date: 2026-08-13
verdict: APPROVE
blockers: 0
---

# Review — `check_completeness_schema`

`INCOMPLETE` stops being a magic string: `check_result/v0` gains
`complete: bool` + `excluded_terms: [str]` with a bidirectional invariant, a
derived `verdict_scope` of `joint | budget`, and
`build_viewer_projection.is_incomplete`'s prose search is deleted. The
pitch-link stack's two checks are migrated off the shouted label suffix.

**Verdict: APPROVE.** The design is right, the invariant is enforced from both
sides, the prose search is genuinely gone rather than shadowed, and every new
rendering surface has a test that goes red when the production line is deleted.
Six defects were found and **fixed inline on the review branch** (commit
`1f34614`) — four should-fix, two nits. None of them was worth a loopback; all
are described below with what I changed.

## What I verified, and how

| | |
|---|---|
| Python suite, merged tree, worktree | **375 passed / 1 skipped** (374/1 as the author shipped it, +1 from my fix). Baseline on `master` was 357/1, same worktree, same interpreter |
| Python suite, merged tree, **main checkout** | **376 passed / 0 skipped** — the one data-dependent test runs there |
| JS suite | **122/122**, `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack`, **`[real]` tier RAN** (28 `[real]` tests, no `SKIP node-fs` line). 121/121 as shipped, +1 from my fix |
| `HEAD..master` | empty before the merge and again before the push — no sibling handoff landed during the review. `handoff/spec_pile_gap_join` is active but sits at `master~1` and is unmerged |
| viewer projection | rebuilt from the merged review tree into `C:\workspace\tolstack\data`. Gate accepted (this tree contains the author's). Rebuild is **byte-identical to the author's build apart from `provenance` / `built_at`** |
| spec-library projection | rebuilt (I edited `intake_queue.json`); identical apart from `provenance` |
| drawing-checker | snapshot taken at the start of this review and again at the end: **1681 entries → 1681, diff EMPTY**. No cited run, no citation and no element changed in this handoff, so the run-`ts` audit does not apply |
| `grep -ri incomplete` in code | no detection logic anywhere. Remaining hits are comments, test fixtures asserting the *absence* of the behaviour, and two authored notes. DoD met |

### The mandatory stack checks

This handoff is **not a tolerance stack** — it is schema + projection + viewer +
SOP. It changes no element, no value, no citation and no arithmetic. Checks 1–7
are therefore addressed as follows rather than skipped:

1. **Every tolerance traces to a document** — N/A, no element or `source_ref`
   touched. Confirmed by the projection rebuild being identical apart from
   provenance.
2. **Signs on every path term** — N/A, no `terms` array changed. `fold()` is
   untouched and still reads `min`/`max` only (`test_fold_is_still_the_only_...`
   green).
3. **LMC/MMC direction** — N/A, no element carries a changed `lmc`/`mmc`.
4. **RSS actually computed** — unchanged and still present; the pitch-link
   checks still report nominal, worst case and RSS, and no verdict reads RSS.
   Worth noting the design keeps this true: `verdict`'s domain is deliberately
   not extended, so the "no verdict reads RSS" rule needed no revisiting.
5. **Nominal inside its own min/max** — N/A.
6. **Quantised cotter/castellation constraint** — the pitch-link stack has a
   slotted MS9363 nut and a cotter pin, and this handoff rewrote both its check
   labels and one `guidance`. I re-read the worksheet **at the location**, not by
   grep: the caveat blockquotes are at lines 159 and 184, immediately under the
   Checks table at 152–155, and the `cotter_hole_clear_of_sourced_stack`
   guidance still ends *"the constraint is slot-vs-hole ALIGNMENT, which
   quantises acceptable grip"*. **PASS**, and unmoved by the edit.
7. **Traced / inferred / untraced ratio** — recomputed by me with
   `tests\debug_report_tolerance_stacks.py --ratio`:
   > **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across
   > the three seeded stacks; **21 / 7 / 20 out of 48** across all stacks.

   Unchanged by this handoff, as it must be — no element moved. Non-element
   values are likewise untouched.

### The new guards, observed failing

Per the universal check, I broke each one rather than accepting green:

| break | result |
|---|---|
| rename `budget` → `budgetTYPO` in `VA.VERDICT_SCOPES` | `test_the_js_status_table_spells_exactly_what_python_enumerates[VERDICT_SCOPES]` fails, naming the pairing; JS suite fails 8 tests |
| delete `card.appendChild(excluded)` | 2 red, one of them `[real]` |
| delete the `BUDGET` chip line | 1 red |
| drop the `check--budget` stripe class | 4 red, one of them `[real]` |
| flip the pitch-link stack to `complete: true` with terms still named | the **projection build itself** fails, 12 tests red — validation is not viewer-side |
| delete `complete`/`excluded_terms` from the live stack | 4 red, including the gap list and the dedup test |

Every rendering surface has at least one DOM test (`render(...)` + `all(...)`)
rather than a view-model assertion, which is the standing requirement here.
The `[real]` `VALUE_GUARDS` row for `checks[].verdict_scope` uses the
self-syncing `known: function (v) { return !!VA.VERDICT_SCOPES[v]; }` form — the
preferred one — and the generic companion test covers it automatically.

## Findings

### Should-fix — all fixed inline in `1f34614`

**1. `tuple()` explodes a bare string into one excluded term per character.**
`tolerance_stack/stack.py`, `CheckResult.__post_init__`.
`self.excluded_terms = tuple(self.excluded_terms or ())` runs *before* the
per-term validation, and `tuple("abc")` is `('a','b','c')` — every member a
non-empty string, so the validator waves it through. A stack file writing
`"excluded_terms": "link-eye-width--no-document"` instead of `[...]` — the
likeliest way to mis-author a field the SOP describes as *"one free string per
term"* — is accepted as **27 excluded terms**, printed on the card and expanded
into 27 rows of the gap list. Verified by construction, not by reading.
The near miss that hides it: a string *containing a space* does raise, on the
`' '`, with a message about the wrong thing — so probing with the exemplar text
reports "validated". **Fix:** refuse a bare `str` by name, plus
`test_a_bare_string_is_not_a_list_of_one_excluded_term` covering both forms.

**2. An SOP authoring step was deleted by being described as automatic.**
`docs/SOP_TOLERANCE_STACK.md` Step 5c. The bullet became:

> add the omitted element to `gaps` as item 1 — the viewer's gap list is built
> from `excluded_terms`, so this happens by writing the field;

Two different artifacts are called *gaps*. The one Step 5c meant is the
worksheet's **ranked Source gaps** table (Step 6, item 7) — it carries the rank,
the document that would close the gap, and it is the stated input to
`docs/spec_library/intake_queue.json`. The viewer's derived list carries none of
that. A future author following the new bullet writes `excluded_terms` and skips
the ranked entry, which is what the review checklist's check 7 exists to catch.
**Fix:** restored the instruction, named the artifact explicitly, and kept the
derived list as an aside that is *not* a substitute.

**3. A silent fallback on an unknown `verdict_scope`.**
`apps/viewer/views/stack.js`, `checkCard`:
`var scope = VA.VERDICT_SCOPES[check.verdict_scope] || {};` — an unrecognised
scope raises no stripe, no chip and no excluded line, i.e. an incomplete check
renders as an ordinary one. That is precisely the misreading the field was added
to prevent, and it is the repo's own named architectural error (the four days
`VA.CROP_RULES` sat unlabelled). The three sibling tables — `CROP_RULES`,
`EXPORT_STATUSES`, `VALUES_STATUSES` — each have a loud `VA.unlabelled*Text`;
this one had none.

The reachable case is not a new vocabulary word, it is **a stale projection**:
nothing rebuilds `data/projections/viewer/`, and a projection built before
2026-08-13 has no `verdict_scope` key at all. The handoff's own lesson records
hitting exactly this (`118/121` until it rebuilt). The `[real]` guard does catch
it — but only when someone runs the JS suite against fresh data, whereas a
reader opening a stale viewer gets the misreading in silence.
**Fix:** `VA.unlabelledVerdictScopeText`, a `SCOPE UNKNOWN` chip carrying it, and
`a scope the viewer has no branch for is named, not swallowed` covering both
`undefined` and an unknown string. Verified red when the fallback is removed.

**4. A harness artifact committed at the end of the lesson.**
`docs/sessions/lessons/LESSONS_20260813_check_completeness_schema.md` shipped
with a literal `</content>` and `</invoke>` as its last two lines — a tool-call
fragment that leaked through a `Write`. Invisible in a rendered markdown preview
and below the fold of every excerpt. **Fix:** trimmed.

### Nits — also fixed inline

- `docs/prompts/REVIEW_AGENT.md` check 2 still read *"an `INCOMPLETE`-labelled
  check, per the SOP's Step 5c"*. The author correctly rewrote the recurring-bugs
  entry 740 lines below and missed this earlier copy — the overlay's own
  "grep the repo for the other copies" class, sighted on the overlay itself.
- `docs/spec_library/intake_queue.json` rank-12 note still said *"both of that
  stack's INCOMPLETE checks"*. Retired vocabulary; the claim itself is still
  true. Rebuilt `library.json` afterwards — the note text is not projected, so
  the rebuild is identical apart from `provenance`.

### Observations, no change requested

- **`test_a_generated_thermal_check_can_declare_incompleteness` mutates the
  loader's output** rather than having `thermal.build_checks` emit the keys.
  That is a fair test of the claim it makes ("the same code path, no
  special-casing") and I would not change it — but it does not show the
  archetype *choosing* to declare incompleteness, and no thermal stack does. The
  handoff's DoD is met; noting it so the next reader does not over-read it.
- **`test_the_prose_search_is_gone_not_merely_bypassed`** asserts
  `"INCOMPLETE" not in source` for `build_viewer_projection.py`. That pins the
  upper-case string in one file; a lower-case prose search, or one grown in a
  different module, is outside it. The `hasattr` half is the load-bearing one.
- **`complete` is not type-checked** — `bool(spec.get("complete", True))` makes
  `"complete": "false"` (a JSON string) read as `True`. Harmless in practice,
  because the bidirectional invariant means a check with no `excluded_terms` is
  complete anyway, and the paired case raises. Left alone.
- **The overlay was edited by the tactical agent**, which is normally the
  reviewer's file. The edit was correct and necessary — the old entry was a live
  instruction to inspect a deleted function — and the lesson discloses it. No
  objection; recorded so the ownership rule does not quietly erode.
- **PROVENANCE.md's three amended rows are true.** I recounted the one number
  they assert: `tests/test_tolerance_stack.py` collects **121 tests**, exactly as
  the row claims. The `__init__.py` row's generalisation ("a new public dataclass
  … and the same is true of a new module **constant**") is a good catch by the
  author.

## For the next reviewer

Four entries added to this repo's overlay (`docs/prompts/REVIEW_AGENT.md`):
three new recurring-bug classes (the `tuple()`-a-bare-string validation hole; the
doc edit that deletes a step by calling it automatic; the harness artifact at
EOF) and a second sighting on the *"branch over a value the data owns must be a
total function"* architectural entry — with the wrinkle that for a **newly added**
projection field the reachable unknown value is `undefined` from a stale
projection, not a drifted vocabulary word, so the "did a producer change?"
trigger never fires. The one-line check it leaves behind: **count the
`VA.unlabelled*Text` functions against the tables — they should pair one-to-one.**
