---
type: review
handoff: HANDOFF_20260813_spec_citation_identity_rendering.md
reviewer: review agent (dispatch)
date: 2026-08-17
verdict: APPROVE
blockers: 0
---

# Review — spec_citation_identity_rendering

Branch `handoff/spec_citation_identity_rendering` (`bb125f9`, `abbcc34`), reviewed
on `review/spec_citation_identity_rendering` cut from `master` (`5e6d9a5`).
`git log --oneline HEAD..master` was empty before and after the merge — nothing
landed in parallel.

**The work is a viewer rendering change, not a tolerance stack.** No stack file,
no `hardware_entries.json`, no `materials.json`, nothing under `data/` and nothing
in `tolerance_stack/` was touched (`git diff --stat master -- tolerance_stack/`
is empty). The seven mandatory checks are addressed below anyway — most of them
exit, and check 1 has a real analogue here, because the deliverable is a
**sentence about provenance rendered on screen**.

## What I ran

| suite | where | result |
|---|---|---|
| `pytest -q` | review worktree | **433 passed, 1 skipped** (420/1 at `master`; 431/1 before my inline fixes, +2 params) |
| `pytest -q` | `C:\workspace\tolstack` after merge | see "Integration" below |
| `node apps\viewer\run_tests.cjs` | review worktree, no `--repo` | 102/102, **`[real]` tier SKIPPED** |
| `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack` | review worktree | **131/131, `[real]` tier RAN** (121/122 at `master` — see below) |
| `npm run test:browser` | review worktree | **4/4 checks — 102/102 suite ×2, 23/23 app sub-checks ×2** |
| `build_viewer_projection.py --data-root C:\workspace\tolstack\data` | review worktree | exit 0, rebuilt |
| `tests\debug_report_tolerance_stacks.py --ratio` | review worktree | unchanged (below) |

The lesson's counts re-derive exactly: Python 431/1 (I measured 431/1 on the
un-fixed branch and 420/1 at `master`), JS 131/131 with the tier stated as run,
browser 4/4 / 102 / 23. It says which worktree and which `--repo` each came from.

**`master` is currently 121/122 on the JS suite against the shared projection**,
and that is the guard working, not a defect: `[real] every fixture shape still
matches the builder's` fails naming `identity_rule` as a key the projection writes
and `master`'s `fixtures.js` does not. It clears on merge.

## The seven mandatory checks

1. **Every tolerance traces to a specification or drawing callout** — *no
   tolerance was authored or changed*, so the audit target is the claim the work
   puts on screen instead. The rendered sentence is *"Spec-pile document:
   identity by filename (append-only pile)"*, and I checked it end to end: the
   marker lands on exactly four citations, they are exactly the four the DoD
   names, all four are `confidence: traced` / `kind: spec` / no `export`, and the
   set is byte-for-byte the set of crops with `resolved_by: "spec_pile"`
   (computed from the rebuilt `results.json` and the live `crops.json` — they
   agree, 4 = 4). The rule itself — `data/inbox/specs/` is append-only, so the
   filename identifies the bytes — is this repo's 2026-08-06 position, restated
   in `SourceRef.export`'s own comment, `tolerance_stack/stack.py`'s tests and
   SOP Step 4; strategy explicitly chose the option that leaves it standing.
   Noted, not filed: **nothing mechanises append-only-ness** — it is a convention
   held by this checklist and by review. That was true before this handoff and
   the handoff does not weaken it, but the sentence is now rendered to a reader
   as a reason to accept `traced`, so the convention is carrying more weight than
   it did yesterday.
2. **Signs on every path term** — N/A. No `path`, `check` or `Term` was touched;
   the projection change adds one derived key beside `zero_width` and touches no
   arithmetic. Confirmed by diff: `project_stack`'s only change is the
   `"identity_rule": ...` line.
3. **LMC/MMC direction** — N/A, no element values.
4. **RSS actually computed** — N/A, unchanged; the check cards and their
   nominal/worst-case/RSS triples are untouched.
5. **Nominal inside its own min/max** — N/A. The one new `nominal` in the repo is
   the `grip` **fixture** element (17.3482 / 17.4752 / 17.6022, invariant holds);
   it is demo data in `fixtures.js`, not a transcription.
6. **Quantised constraints (cotter/castellation)** — N/A to the change, and
   **not regressed**: the four marked rows are NAS6403 grips in
   `tan_link_to_pitch_plate` / `_take2` / `vpa_output_to_pitch_plate`, and those
   worksheets' MS9363 caveats are untouched by this diff (no `docs/` worksheet
   file appears in it). I checked the new legend does not overstate: it speaks
   only about the sourcing column and claims nothing about grip.
7. **Traced / inferred / untraced ratio** — computed by me, not copied:

   > **5 of 26** element instances across the three seeded stacks are `traced`;
   > 3 are `inferred` and 18 are `untraced`.
   > All six stacks: **21 traced / 7 inferred / 20 untraced, out of 48**.

   Unchanged by this handoff, as it must be — the marker is derived and reads no
   `confidence`. Non-element values: unchanged, none added.

## Also verified

- **Deliverable 1** — `results.json` carries the derived marker on the four
  citations named in the DoD, and only those. Value-level tests assert present
  for spec-pile and absent for `workbook` / `assumed` / `drawing` **and** for a
  `spec` citation that names its export (3 live ones do; an export block wins,
  which is `resolve_pdf`'s own precedence).
- **Deliverable 2** — the 21 `workbook` + 1 `assumed` no-export citations are
  untouched. I recomputed every count the new prose states, against the rebuilt
  projection: 48 live citations, 26 with no `export` key (21 workbook / 1 assumed
  / 4 spec), 22 with one (15 drawing / 4 parts_list / 3 spec), all 22
  `established`. So "22 of the 26 live no-export citations" (viewer.js), "22 of
  the 48" and "48 of the 48 get no chip" (stack.js), "null on 44 of the 48"
  (build_viewer_projection.py) and the README's "22 of the 48 … 21 workbook, 1
  assumed" are each true **of their own sentence's noun**. One stale sibling
  found and fixed — see findings.
- **Deliverable 3** — the legend exists, is on the page above the elements table,
  and **quotes `VA.IDENTITY_RULES` rather than re-typing the sentence**, with a
  test on that. It states the rule the exception excepts, which is the half that
  makes it readable.
- **DoD: no enum moved.** `git diff master -- tolerance_stack/` is empty; the
  `VA.EXPORT_STATUSES` literal is untouched (the only diff hit is a comment
  mentioning it by name). Verified independently of the lesson's transcript.
- **A new guard has been observed failing** (universal check) — I broke each
  piece and watched the right thing go red, and re-ran the full suite each time:
  - `"identity_rule": None` in `project_stack` → 2 projection tests fail naming
    the four missing citations.
  - `IDENTITY_RULE_SPEC_PILE = "spec_pile_name"` → the new JS↔Python pairing
    fails with `Python: ['spec_pile_name'] / viewer: ['spec_pile_filename']`.
  - delete the `identity_rule` branch in `VA.exportProvenance` → 5 JS tests fail,
    **including the `[real]` one** — so the `[real]` test is not a view-model
    tautology; deleting production code turns it red.
  - delete `box.appendChild(... "el-export__detail" ...)` → 1 DOM test fails.
  - delete `section.appendChild(sourcingLegend())` → the legend test fails.
- **The `[real]` tier's teeth.** The new `VALUE_GUARDS` row uses the self-syncing
  `known: function (v) { ... VA.IDENTITY_RULES[v] }` form the overlay prefers,
  and the companion `[real] each value guard bites when fed a value nothing can
  explain` covers it (it iterates all rows). It accepts `undefined` on purpose —
  a projection built before the field existed has no key, which is the pre-work
  rendering rather than a misreading — and that is stated in the row's comment.
- **Tables pair one-to-one with loud fallbacks.** Five enumerated tables
  (`VERDICT_SCOPES`, `EXPORT_STATUSES`, `IDENTITY_RULES`, `VALUES_STATUSES`,
  `CROP_RULES`), five `VA.unlabelled*Text` functions. The new one gets its own
  chip wording (`IDENTITY RULE UNKNOWN`) instead of reusing `EXPORT STATUS
  UNKNOWN`, via a small table rather than a third ternary arm.
- **No second combiner in JS.** The diff adds no arithmetic operator, `toFixed`
  or comparison on a projection field anywhere under `apps/viewer/`.
- **Projections rebuilt and diffed key by key** from this review worktree (the
  newest tree). The build printed the exit-3 gate's *note* rather than refusing —
  the previous build was the handoff worktree at `7a239a5`, dirty, which this
  tree contains. Old vs new differ **only** in `built_at` and the `provenance`
  block; every stack, element, check and count is identical. `crops.json` was not
  rebuilt: no `source_ref` moved, so nothing it derives can have.
- **Whole-file-diff / encoding checks.** `git diff -w --stat` is identical to the
  plain diffstat (no hidden reformat), zero NUL bytes in the four touched JS
  files, all blobs `i/lf`. No `</invoke>` / `</content>` / `<parameter` / `{{`
  anywhere in the diff, and the new lesson's last lines are prose.
- **Documents / data untouched.** No path under `data/` is in the diff;
  `data/inbox/specs/` is unrenamed and unreorganised; `docs/reference/` untouched.
- **drawing-checker read-only.** Nothing in the diff writes there and the work
  reads nothing there. One new run appeared in `data/runs/` during my review
  window (50 → 51): `20260817_151224_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER`,
  `ts` 22:15:00Z, `purpose: "user"`, clean (non-`+dirty`) `pipeline_commit`, on a
  propulsion assembly drawing this handoff never mentions — and it postdates both
  handoff commits (14:52, 15:02 local) and the tactical session. Attributed to
  Jeff running the pipeline in parallel; not this handoff's and not mine. No
  snapshot diff was taken by the tactical session, which is correct here — SOP
  Step 0/8 snapshots are a stack-authoring requirement and this handoff opens no
  drawing.
- **Tests do not pollute `data/`.** After a full pytest run, a full JS `[real]`
  run and the browser tier, the only file under `C:\workspace\tolstack\data`
  modified today is `results.json` — from my own deliberate rebuild. No run
  folders, no fixtures moved.
- **The issue closes correctly.** `ISSUE_20260812_four_traced_spec_citations_...`
  → `status: resolved` (a status this repo already uses, 10 files), with a
  Resolution section that states the option chosen, the condition, the scope and
  which tests pin it.

## Findings

All three were one- or two-line defects and are **fixed inline on the review
branch**; none blocks.

### should-fix (fixed inline)

1. **`scripts/build_viewer_projection.py:identity_rule_of_ref` — the "one place
   it deliberately diverges" claim was incomplete, and the missing divergence is
   reachable.** The docstring argues the helper applies *"the same condition
   `build_viewer_crops.resolve_pdf` applies, in the same order"* with exactly one
   named divergence (the on-disk check). There is a second: `resolve_pdf` raises
   `Unresolvable("source_ref names no document")` **before** any kind branch, and
   the marker did not check `document` at all. `SourceRef.document` defaults to
   `None` and nothing requires it for `spec`, so a `{"kind": "spec"}` authoring
   slip renders *"the filename above IS the identity of the bytes"* above a blank
   — a provenance claim with nothing behind it, which is this repo's worst defect
   class in miniature. The `[real]` agreement test would catch it, but only after
   the bad data is live and only when someone runs the JS suite with `--repo`.
   **Fix:** added `and source_ref.document` to the condition, corrected the
   docstring to say the divergence is deliberate in one direction only, and added
   `spec-no-document` / `spec-blank-document` cases to the existing parametrized
   test. Marker set on live data is unchanged (still exactly the four).

2. **`ARCHITECTURE.md:295` — "One derived flag worth knowing, because it has no
   schema field" is now two.** `identity_rule` is precisely a derived flag with
   no schema field; the projection's own docstring calls it a sibling of
   `zero_width`, and `zero_width` is what that sentence enumerates. This is the
   overlay's *"a quantifier word ages exactly like a digit"* entry, second
   sighting in `ARCHITECTURE.md` in six days. **Fix:** "Two derived flags", with
   a bullet for `identity_rule` naming the test that pins it as derived. (My
   first wording tripped
   `test_every_byte_identity_claim_in_a_live_file_names_its_verification` — the
   guard working; reworded to name the test instead of claiming byte-identity.)

### nit (fixed inline)

3. **`apps/viewer/tests.js:674` — a stale sibling count.** The handoff correctly
   moved the parallel comments in `viewer.js` (26 → "22 of the 26") and
   `views/stack.js` (26 → 22), and left this one reading *"No `export` key at
   all: 26 of the 48 live citations"* directly above `eq(...state, "none")`. The
   digit is true of "no `export` key" and false of the `none` **state**, which is
   what the line it annotates asserts — the overlay's *one number, two nouns*
   class. **Fix:** reworded to 22 (21 workbook, 1 assumed) and it now says where
   the other four went.

### Observations, filed nowhere (no action)

- **The browser tier still has no automatic runner.** The handoff found it red
  from a prior handoff's class rename (`check--incomplete` → `check--budget`) and
  fixed the selector inline, which was the right call; the underlying gap —
  nothing runs `npm run test:browser` except an agent by hand — is recorded in
  the lesson's "Left for the next agent" and I confirmed it is real. Not filed as
  an issue because the lesson already carries it and it is a board-level
  sequencing question, not a bug.
- **`python_identity_rules()` mutates `sys.path` on every call** (`sys.path.insert`
  inside the function, so a parametrized run accumulates duplicates). Harmless,
  the module is `scripts/`-resident and there is no other way to reach it, and the
  neighbouring `python_crop_rules` reads by AST alone. Left as written.

## Note for the next reviewer

The overlay gained one entry: **a second copy of a producer's condition, with its
divergences written out as a list** — the shape of finding 1. Two scripts here are
deliberately independently re-runnable, so re-deriving a rule instead of importing
the answer is correct and the handoff paired the two with a `[real]` test; what
needs a reviewer is the *docstring sentence* that enumerates how the copy differs,
because that is a completeness claim and it is exactly as checkable as a count.
Read the producer top to bottom against the copy — every early return, not only
the branch the author had in mind.
